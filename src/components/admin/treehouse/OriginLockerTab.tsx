"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from '@googlemaps/js-api-loader';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Package,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Search,
  Building2,
  Truck,
  Mail,
} from "lucide-react";

const allShippingMethods = [
  { id: "dtd", label: "DTD - Door to Door (The Courier Guy)" },
  { id: "dtl", label: "DTL - Door to Locker (Pudo)" },
  { id: "ltd", label: "LTD - Locker to Door (Pudo)" },
  { id: "ltl", label: "LTL - Locker to Locker (Pudo)" },
  { id: "collection", label: "Collection from location" },
  { id: "in_house", label: "In-house delivery service" },
];


interface PudoLocker {
  LockerID: string;
  LockerCode: string;
  LockerName: string;
  Address: string;
  SuburbName: string;
  CityName: string;
  ProvinceName: string;
  PostalCode: string;
  Latitude: number;
  Longitude: number;
}

interface OriginLockerConfig {
  lockerId?: string;
  lockerCode?: string;
  lockerName?: string;
  address: string;
  streetAddress: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  email?: string;
  shippingMethods?: string[];
  updatedAt: Timestamp | Date;
  updatedBy?: string;
  isPudoLocker?: boolean;
}

export default function OriginLockerTab() {
  const [config, setConfig] = useState<OriginLockerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingLockers, setLoadingLockers] = useState(false);
  const [lockers, setLockers] = useState<PudoLocker[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLockers, setFilteredLockers] = useState<PudoLocker[]>([]);
  const [selectedLocker, setSelectedLocker] = useState<PudoLocker | null>(null);
  const { toast } = useToast();
  
  // Address autocomplete refs
  const locationInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitialized = useRef(false);
  
  // Address state
  const [manualAddress, setManualAddress] = useState({
    streetAddress: '',
    suburb: '',
    city: '',
    province: '',
    postalCode: '',
    country: '',
    latitude: null as number | null,
    longitude: null as number | null,
    email: '',
    shippingMethods: [] as string[],
  });

  useEffect(() => {
    fetchOriginLocker();
  }, []);

  useEffect(() => {
    filterLockers();
  }, [lockers, searchTerm]);

  const initializeMap = useCallback(() => {
    if (mapInitialized.current || !mapContainerRef.current) return;
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      toast({ 
        title: "Map Error", 
        description: "Google Maps API key is not configured.", 
        variant: "destructive" 
      });
      return;
    }

    mapInitialized.current = true;
    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['places', 'geocoding'] });

    loader.load().then(google => {
      const getAddressComponent = (components: google.maps.GeocoderAddressComponent[], type: string, useShortName = false): string =>
        components.find(c => c.types.includes(type))?.[useShortName ? 'short_name' : 'long_name'] || '';

      const setAddressFields = (place: google.maps.places.PlaceResult | google.maps.GeocoderResult) => {
        const components = place.address_components;
        if (!components) return;

        const streetNumber = getAddressComponent(components, 'street_number');
        const route = getAddressComponent(components, 'route');
        
        setManualAddress(prev => ({
          ...prev,
          streetAddress: `${streetNumber} ${route}`.trim(),
          suburb: getAddressComponent(components, 'locality'),
          city: getAddressComponent(components, 'administrative_area_level_2') || getAddressComponent(components, 'administrative_area_level_1'),
          province: getAddressComponent(components, 'administrative_area_level_1'),
          postalCode: getAddressComponent(components, 'postal_code'),
          country: getAddressComponent(components, 'country'),
        }));
      };

      const initialLatLng = manualAddress.latitude && manualAddress.longitude
        ? { lat: manualAddress.latitude, lng: manualAddress.longitude }
        : { lat: -29.8587, lng: 31.0218 }; // Default to South Africa

      const map = new google.maps.Map(mapContainerRef.current!, { 
        center: initialLatLng, 
        zoom: manualAddress.latitude ? 15 : 6, 
        mapId: 'b39f3f8b7139051d' 
      });
      
      const marker = new google.maps.Marker({ 
        map, 
        draggable: true, 
        position: initialLatLng 
      });

      if (locationInputRef.current) {
        const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current, { 
          fields: ["address_components", "geometry", "formatted_address"], 
          types: ["address"] 
        });
        
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.geometry?.location) {
            const loc = place.geometry.location;
            map.setCenter(loc); 
            map.setZoom(17); 
            marker.setPosition(loc);
            
            setManualAddress(prev => ({
              ...prev,
              latitude: loc.lat(),
              longitude: loc.lng(),
            }));
            
            setAddressFields(place);
          }
        });
      }

      const geocoder = new google.maps.Geocoder();
      const handleMapInteraction = (pos: google.maps.LatLng) => {
        marker.setPosition(pos); 
        map.panTo(pos);
        
        setManualAddress(prev => ({
          ...prev,
          latitude: pos.lat(),
          longitude: pos.lng(),
        }));
        
        geocoder.geocode({ location: pos }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            setAddressFields(results[0]);
            if (locationInputRef.current) {
              locationInputRef.current.value = results[0].formatted_address;
            }
          }
        });
      };

      map.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && handleMapInteraction(e.latLng));
      marker.addListener('dragend', () => marker.getPosition() && handleMapInteraction(marker.getPosition()!));

    }).catch(e => {
      console.error("Error loading Google Maps:", e);
      toast({ 
        title: 'Map Error', 
        description: 'Could not load Google Maps.', 
        variant: 'destructive' 
      });
    });
  }, [toast]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && !mapInitialized.current) {
      const timer = setTimeout(() => {
        initializeMap();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initializeMap]);

  const fetchOriginLocker = async () => {
    try {
      setLoading(true);
      const configRef = doc(db, "treehouse_config", "origin_locker");
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        const data = configSnap.data() as OriginLockerConfig;
        setConfig(data);
        
        // Populate manualAddress state with existing config data
        setManualAddress({
          streetAddress: data.streetAddress || '',
          suburb: data.suburb || '',
          city: data.city || '',
          province: data.province || '',
          postalCode: data.postalCode || '',
          country: data.country || '',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          email: data.email || '',
          shippingMethods: data.shippingMethods || [],
        });
        
        // Update the location input if it exists
        if (locationInputRef.current && data.address) {
          locationInputRef.current.value = data.address;
        }
      }
    } catch (error) {
      console.error("Error fetching origin locker:", error);
      toast({
        title: "Error",
        description: "Failed to load origin locker configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPudoLockers = async () => {
    try {
      setLoadingLockers(true);
      
      // Call the getPudoLockers Cloud Function
      const response = await fetch('/api/get-pudo-lockers');
      
      if (!response.ok) {
        throw new Error('Failed to fetch Pudo lockers');
      }

      const data = await response.json();
      
      if (data.lockers && Array.isArray(data.lockers)) {
        setLockers(data.lockers);
        toast({
          title: "Success",
          description: `Loaded ${data.lockers.length} Pudo lockers`,
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error("Error fetching Pudo lockers:", error);
      toast({
        title: "Error",
        description: "Failed to load Pudo lockers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingLockers(false);
    }
  };

  const filterLockers = () => {
    if (!searchTerm) {
      setFilteredLockers(lockers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = lockers.filter(
      (locker) =>
        locker.LockerCode?.toLowerCase().includes(term) ||
        locker.LockerName?.toLowerCase().includes(term) ||
        locker.Address?.toLowerCase().includes(term) ||
        locker.SuburbName?.toLowerCase().includes(term) ||
        locker.CityName?.toLowerCase().includes(term) ||
        locker.ProvinceName?.toLowerCase().includes(term)
    );
    setFilteredLockers(filtered);
  };

  const handleSelectLocker = (locker: PudoLocker) => {
    setSelectedLocker(locker);
  };

  const handleSaveOriginLocker = async () => {
    if (!selectedLocker) {
      toast({
        title: "No Locker Selected",
        description: "Please select a Pudo locker to set as origin",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const originConfig: OriginLockerConfig = {
        lockerId: selectedLocker.LockerID,
        lockerCode: selectedLocker.LockerCode,
        lockerName: selectedLocker.LockerName,
        address: selectedLocker.Address,
        streetAddress: selectedLocker.Address,
        suburb: selectedLocker.SuburbName,
        city: selectedLocker.CityName,
        province: selectedLocker.ProvinceName,
        postalCode: selectedLocker.PostalCode,
        country: 'South Africa',
        latitude: selectedLocker.Latitude,
        longitude: selectedLocker.Longitude,
        updatedAt: Timestamp.now(),
        isPudoLocker: true,
      };

      const configRef = doc(db, "treehouse_config", "origin_locker");
      await setDoc(configRef, originConfig, { merge: true });

      setConfig(originConfig);
      
      toast({
        title: "Success",
        description: "Origin locker set successfully",
      });
    } catch (error) {
      console.error("Error saving origin locker:", error);
      toast({
        title: "Error",
        description: "Failed to save origin locker",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveManualAddress = async () => {
    // Validate manual address
    if (!manualAddress.streetAddress || !manualAddress.city || !manualAddress.latitude || !manualAddress.longitude) {
      toast({
        title: "Incomplete Address",
        description: "Please select a complete address from the map",
        variant: "destructive",
      });
      return;
    }

    if (!manualAddress.email) {
      toast({
        title: "Email Required",
        description: "Please enter an email address for the Treehouse",
        variant: "destructive",
      });
      return;
    }

    if (!manualAddress.shippingMethods || manualAddress.shippingMethods.length === 0) {
      toast({
        title: "Shipping Methods Required",
        description: "Please select at least one shipping method",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const fullAddress = `${manualAddress.streetAddress}, ${manualAddress.suburb}, ${manualAddress.city}`;

      const originConfig: OriginLockerConfig = {
        address: fullAddress,
        streetAddress: manualAddress.streetAddress,
        suburb: manualAddress.suburb,
        city: manualAddress.city,
        province: manualAddress.province,
        postalCode: manualAddress.postalCode,
        country: manualAddress.country,
        latitude: manualAddress.latitude,
        longitude: manualAddress.longitude,
        email: manualAddress.email,
        shippingMethods: manualAddress.shippingMethods,
        updatedAt: Timestamp.now(),
        isPudoLocker: false,
      };

      const configRef = doc(db, "treehouse_config", "origin_locker");
      await setDoc(configRef, originConfig, { merge: true });

      setConfig(originConfig);
      
      toast({
        title: "Success",
        description: "Origin address and shipping configuration set successfully",
      });
    } catch (error) {
      console.error("Error saving origin address:", error);
      toast({
        title: "Error",
        description: "Failed to save origin address",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading origin locker configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Configuration Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-extrabold text-[#3D2E17] flex items-center gap-2">
              <MapPin className="h-6 w-6 text-[#006B3E]" />
              Current Origin Locker
            </h3>
            <p className="text-sm text-[#3D2E17] font-semibold">
              This locker is used as the origin point for all Treehouse product shipments
            </p>
          </div>
          {config && (
            <Badge className="bg-[#006B3E]">
              <CheckCircle className="h-3 w-3 mr-1" />
              Configured
            </Badge>
          )}
        </div>

        {config ? (
          <div className="space-y-4">
            {config.isPudoLocker && config.lockerCode && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Locker Code</Label>
                  <p className="font-mono font-bold text-[#006B3E] text-lg">{config.lockerCode}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Locker Name</Label>
                  <p className="font-medium text-[#3D2E17]">{config.lockerName}</p>
                </div>
              </div>
            )}
            
            {!config.isPudoLocker && (
              <div className="mb-3">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20">
                  Custom Address
                </Badge>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              <p className="text-sm">{config.address}</p>
              <p className="text-sm text-muted-foreground">
                {config.suburb}, {config.city}, {config.province} {config.postalCode}
              </p>
            </div>

            <div className="flex items-center gap-4 text-sm p-3 bg-white/50 dark:bg-black/10 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-muted-foreground">Coordinates:</span>
                <span className="font-mono">{config.latitude}, {config.longitude}</span>
              </div>
            </div>

            {config.email && (
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground">Contact Email</Label>
                <p className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#006B3E]" />
                  {config.email}
                </p>
              </div>
            )}

            {config.shippingMethods && config.shippingMethods.length > 0 && (
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground mb-2 block">Shipping Methods</Label>
                <div className="flex flex-wrap gap-2">
                  {config.shippingMethods.map((methodId) => {
                    const method = allShippingMethods.find(m => m.id === methodId);
                    return method ? (
                      <Badge key={methodId} variant="secondary" className="bg-[#006B3E]/10 text-[#006B3E]">
                        <Truck className="h-3 w-3 mr-1" />
                        {method.label.split(' - ')[0]}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {config.updatedAt && (
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(config.updatedAt as any).toLocaleString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No origin locker configured</p>
            <p className="text-sm text-muted-foreground">
              Please load Pudo lockers and select one to set as origin
            </p>
          </div>
        )}
      </Card>

      {/* Google Address Section */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-extrabold text-[#3D2E17] flex items-center gap-2 mb-1">
            <MapPin className="h-6 w-6 text-[#006B3E]" />
            Set Custom Origin Address
          </h3>
          <p className="text-sm text-[#3D2E17] font-semibold">
            Use Google Maps to select a custom address as the shipping origin point
          </p>
        </div>

        <div className="space-y-4">
          {/* Address Search */}
          <div>
            <Label className="text-[#3D2E17] font-bold mb-2">Address Search</Label>
            <Input 
              ref={locationInputRef}
              placeholder="Start typing an address to search..."
              className="w-full"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Select an address to auto-fill the fields below. You can also click the map or drag the pin.
            </p>
          </div>

          {/* Google Map */}
          <div ref={mapContainerRef} className="h-96 w-full rounded-md border shadow-sm bg-muted" />

          {/* Address Fields */}
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Street Address</Label>
              <Input 
                value={manualAddress.streetAddress} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, streetAddress: e.target.value }))}
                placeholder="Auto-filled from map"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Suburb</Label>
              <Input 
                value={manualAddress.suburb} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, suburb: e.target.value }))}
                placeholder="Auto-filled from map"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input 
                value={manualAddress.city} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Auto-filled from map"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Province</Label>
              <Input 
                value={manualAddress.province} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, province: e.target.value }))}
                placeholder="Auto-filled from map"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Postal Code</Label>
              <Input 
                value={manualAddress.postalCode} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                placeholder="Auto-filled from map"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Country</Label>
              <Input 
                value={manualAddress.country} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, country: e.target.value }))}
                placeholder="Auto-filled from map"
              />
            </div>
          </div>

          {/* Email and Shipping Methods Section */}
          <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
            <h4 className="font-extrabold text-[#3D2E17] flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#006B3E]" />
              Contact & Shipping Configuration
            </h4>
            
            {/* Email Field */}
            <div>
              <Label className="text-[#3D2E17] font-bold">Email Address</Label>
              <Input 
                type="email"
                value={manualAddress.email} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, email: e.target.value }))}
                placeholder="treehouse@example.com"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This email will be used for shipping notifications and order confirmations
              </p>
            </div>

            {/* Shipping Methods */}
            <div>
              <Label className="text-[#3D2E17] font-bold mb-3 flex items-center gap-2">
                <Truck className="h-5 w-5 text-[#006B3E]" />
                Available Shipping Methods
              </Label>
              <div className="space-y-3 mt-2">
                {allShippingMethods.map((method) => (
                  <div key={method.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`shipping-${method.id}`}
                      checked={manualAddress.shippingMethods.includes(method.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setManualAddress(prev => ({
                            ...prev,
                            shippingMethods: [...prev.shippingMethods, method.id]
                          }));
                        } else {
                          setManualAddress(prev => ({
                            ...prev,
                            shippingMethods: prev.shippingMethods.filter(m => m !== method.id)
                          }));
                        }
                      }}
                    />
                    <label
                      htmlFor={`shipping-${method.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {method.label}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Select the shipping methods available for Treehouse orders
              </p>
            </div>
          </div>

          {/* Coordinates Display */}
          {manualAddress.latitude && manualAddress.longitude && (
            <div className="flex items-center gap-4 text-sm p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <MapPin className="h-4 w-4 text-[#006B3E]" />
              <span className="text-muted-foreground">Coordinates:</span>
              <span className="font-mono text-[#006B3E]">
                {manualAddress.latitude.toFixed(6)}, {manualAddress.longitude.toFixed(6)}
              </span>
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSaveManualAddress}
            disabled={saving || !manualAddress.latitude || !manualAddress.streetAddress || !manualAddress.email || manualAddress.shippingMethods.length === 0}
            className="w-full bg-[#006B3E] hover:bg-[#005a33]"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Set Custom Address as Origin
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Load Pudo Lockers Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-extrabold text-[#3D2E17] flex items-center gap-2">
              <Building2 className="h-6 w-6 text-[#006B3E]" />
              Or Select Pudo Locker
            </h3>
            <p className="text-sm text-[#3D2E17] font-semibold">
              Load Pudo lockers and choose one as the shipping origin point
            </p>
          </div>
          <Button
            onClick={fetchPudoLockers}
            disabled={loadingLockers}
            variant="outline"
          >
            {loadingLockers ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Pudo Lockers
              </>
            )}
          </Button>
        </div>

        {lockers.length > 0 && (
          <>
            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#006B3E]" />
              <Input
                placeholder="Search by code, name, address, city, province..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected Locker Preview */}
            {selectedLocker && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-[#006B3E]">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-[#3D2E17]">Selected Locker</p>
                    <p className="font-mono text-[#006B3E] font-bold">{selectedLocker.LockerCode}</p>
                  </div>
                  <Button
                    onClick={handleSaveOriginLocker}
                    disabled={saving}
                    className="bg-[#006B3E] hover:bg-[#005a33]"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Set as Origin
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm font-medium">{selectedLocker.LockerName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedLocker.Address}, {selectedLocker.SuburbName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedLocker.CityName}, {selectedLocker.ProvinceName} {selectedLocker.PostalCode}
                </p>
              </div>
            )}

            {/* Lockers List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLockers.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No lockers found matching your search</p>
                </div>
              ) : (
                filteredLockers.map((locker) => (
                  <Card
                    key={locker.LockerID}
                    className={`p-4 cursor-pointer transition-all hover:border-[#006B3E] ${
                      selectedLocker?.LockerID === locker.LockerID
                        ? "border-2 border-[#006B3E] bg-green-50 dark:bg-green-950/20"
                        : ""
                    } ${
                      config?.lockerId === locker.LockerID
                        ? "border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/20"
                        : ""
                    }`}
                    onClick={() => handleSelectLocker(locker)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono">
                            {locker.LockerCode}
                          </Badge>
                          {config?.lockerId === locker.LockerID && (
                            <Badge className="bg-blue-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Current Origin
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-[#3D2E17]">{locker.LockerName}</p>
                        <p className="text-sm text-muted-foreground">{locker.Address}</p>
                        <p className="text-sm text-muted-foreground">
                          {locker.SuburbName}, {locker.CityName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {locker.ProvinceName} {locker.PostalCode}
                        </p>
                      </div>
                      <div className="text-right">
                        <MapPin className="h-5 w-5 text-[#006B3E] ml-auto" />
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {locker.Latitude.toFixed(4)}, {locker.Longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {lockers.length === 0 && !loadingLockers && (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No Pudo lockers loaded</p>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Load Pudo Lockers" to fetch available lockers
            </p>
          </div>
        )}
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-amber-50 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-[#3D2E17] mb-1">Important Information</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• The origin locker is used to calculate shipping rates for all Treehouse orders</li>
              <li>• All POD products will be shipped from this locker location</li>
              <li>• Make sure the locker is accessible and has sufficient capacity</li>
              <li>• Changes take effect immediately for new orders</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
