"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
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
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initializeMap]);
  
  // Re-center map when config loads with coordinates
  useEffect(() => {
    if (config && config.latitude && config.longitude && mapInitialized.current) {
      // The map is already initialized, try to re-center it
      const timer = setTimeout(() => {
        initializeMap();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [config, initializeMap]);

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
      
      // Check if manual address has coordinates
      if (!manualAddress.latitude || !manualAddress.longitude) {
        toast({
          title: "Location Required",
          description: "Please set your origin address on the map first before loading Pudo lockers.",
          variant: "destructive",
        });
        setLoadingLockers(false);
        return;
      }
      
      // Call the getPudoLockers Cloud Function with coordinates (same as checkout workflow)
      const getPudoLockersFn = httpsCallable(functions, 'getPudoLockers');
      const result = await getPudoLockersFn({
        latitude: manualAddress.latitude,
        longitude: manualAddress.longitude,
        city: manualAddress.city,
        radius: 100 // 100km radius
      });
      
      const data = result.data as any;
      const lockerData = data?.data as any[];
      
      if (lockerData && Array.isArray(lockerData) && lockerData.length > 0) {
        // Transform the data to match the PudoLocker interface used in this component
        const transformedLockers: PudoLocker[] = lockerData.map((locker: any) => ({
          LockerID: locker.id || '',
          LockerCode: locker.id || '',
          LockerName: locker.name || '',
          Address: locker.address || locker.street_address || '',
          SuburbName: locker.suburb || '',
          CityName: locker.city || '',
          ProvinceName: locker.province || '',
          PostalCode: locker.postalCode || '',
          Latitude: locker.location?.lat || 0,
          Longitude: locker.location?.lng || 0,
        }));
        
        setLockers(transformedLockers);
        toast({
          title: "Success",
          description: `Loaded ${transformedLockers.length} Pudo lockers within 100km`,
        });
      } else {
        toast({
          title: "No Lockers Found",
          description: "No Pudo lockers found within 100km of your origin address.",
          variant: "destructive",
        });
        setLockers([]);
      }
    } catch (error: any) {
      console.error("Error fetching Pudo lockers:", error);
      const errorMessage = error.message || "Failed to load Pudo lockers. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setLockers([]);
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

      // Merge locker data with existing config (keeps address, email, shipping methods)
      const lockerUpdate = {
        lockerId: selectedLocker.LockerID,
        lockerCode: selectedLocker.LockerCode,
        lockerName: selectedLocker.LockerName,
        updatedAt: Timestamp.now(),
      };

      const configRef = doc(db, "treehouse_config", "origin_locker");
      await setDoc(configRef, lockerUpdate, { merge: true });

      // Re-fetch config to get the merged data
      const updatedDoc = await getDoc(configRef);
      if (updatedDoc.exists()) {
        setConfig(updatedDoc.data() as OriginLockerConfig);
      }
      
      toast({
        title: "Success",
        description: "Pudo origin locker set successfully. Address and shipping configuration preserved.",
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

    // Check if LTD or LTL is selected and require Pudo locker
    const requiresLocker = manualAddress.shippingMethods.some(m => m === 'ltd' || m === 'ltl');
    if (requiresLocker && !config?.lockerCode) {
      toast({
        title: "Pudo Locker Required",
        description: "LTD and LTL shipping methods require a Pudo locker to be selected. Please select a locker below.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const fullAddress = `${manualAddress.streetAddress}, ${manualAddress.suburb}, ${manualAddress.city}`;

      // Preserve existing locker data if it exists
      const originConfig: any = {
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
      };

      // Preserve locker fields if they exist in current config
      if (config?.lockerCode) {
        originConfig.lockerId = config.lockerId;
        originConfig.lockerCode = config.lockerCode;
        originConfig.lockerName = config.lockerName;
      }

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
      <Card className="p-6 bg-muted/50 border-2 border-border/50 shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-black text-[#3D2E17] flex items-center gap-3">
              <Package className="h-8 w-8 text-[#006B3E]" />
              Treehouse Shipping Configuration
            </h3>
            <p className="text-base text-[#3D2E17] font-bold mt-1">
              Configure origin address and Pudo locker for all Treehouse product shipments
            </p>
          </div>
          {config && (
            <Badge className="bg-[#006B3E] text-white">
              <CheckCircle className="h-4 w-4 mr-1" />
              Configured
            </Badge>
          )}
        </div>

        {config ? (
          <div className="space-y-4">
            {/* Origin Address Section */}
            <div className="p-4 bg-white/60 dark:bg-gray-800/50 rounded-xl border-2 border-[#006B3E]/20">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-6 w-6 text-[#006B3E]" />
                <h4 className="text-lg font-black text-[#3D2E17]">Origin Address</h4>
              </div>
              <p className="text-base font-bold text-[#3D2E17]">{config.address}</p>
              <p className="text-sm font-bold text-[#5D4E37] mt-1">
                {config.suburb}, {config.city}, {config.province} {config.postalCode}
              </p>
              <div className="flex items-center gap-4 text-sm p-3 bg-[#006B3E]/5 rounded-lg mt-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#006B3E]" />
                  <span className="font-bold text-[#3D2E17]">Coordinates:</span>
                  <span className="font-mono font-bold text-[#006B3E]">{config.latitude}, {config.longitude}</span>
                </div>
              </div>
            </div>

            {/* Origin Locker Section */}
            {config.lockerCode ? (
              <div className="p-4 bg-green-50/80 dark:bg-green-950/20 rounded-xl border-2 border-[#006B3E]/30">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-6 w-6 text-[#006B3E]" />
                  <h4 className="text-lg font-black text-[#3D2E17]">Pudo Origin Locker</h4>
                  <Badge variant="secondary" className="bg-[#006B3E] text-white ml-auto">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-[#5D4E37]">Locker Code</Label>
                    <p className="font-mono font-black text-[#006B3E] text-xl">{config.lockerCode}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-[#5D4E37]">Locker Name</Label>
                    <p className="font-bold text-[#3D2E17] text-base">{config.lockerName}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50/80 dark:bg-amber-950/20 rounded-xl border-2 border-amber-300 dark:border-amber-700">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                  <p className="font-bold text-[#3D2E17]">No Pudo locker configured</p>
                </div>
                <p className="text-sm font-bold text-[#5D4E37] mt-2">
                  Locker-based shipping methods (LTD, LTL) will not be available until a Pudo locker is selected.
                </p>
              </div>
            )}

            {/* Email Section */}
            {config.email && (
              <div className="p-4 bg-blue-50/80 dark:bg-blue-950/20 rounded-xl border-2 border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-6 w-6 text-[#006B3E]" />
                  <h4 className="text-lg font-black text-[#3D2E17]">Contact Email</h4>
                </div>
                <p className="text-base font-bold text-[#3D2E17]">{config.email}</p>
              </div>
            )}

            {/* Shipping Methods Section */}
            {config.shippingMethods && config.shippingMethods.length > 0 && (
              <div className="p-4 bg-purple-50/80 dark:bg-purple-950/20 rounded-xl border-2 border-purple-200 dark:border-purple-700">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-6 w-6 text-[#006B3E]" />
                  <h4 className="text-lg font-black text-[#3D2E17]">Shipping Methods</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.shippingMethods.map((methodId) => {
                    const method = allShippingMethods.find(m => m.id === methodId);
                    return method ? (
                      <Badge key={methodId} variant="secondary" className="bg-[#006B3E] text-white font-bold">
                        <Truck className="h-4 w-4 mr-1" />
                        {method.label.split(' - ')[0]}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {config.updatedAt && (
              <div className="text-sm font-bold text-[#5D4E37] text-center pt-2">
                Last updated: {new Date(config.updatedAt as any).toLocaleString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-white/60 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-[#006B3E]/30">
            <AlertCircle className="h-16 w-16 text-amber-600 mx-auto mb-4" />
            <p className="text-lg font-black text-[#3D2E17] mb-2">No Configuration Found</p>
            <p className="text-base font-bold text-[#5D4E37]">
              Please configure origin address and Pudo locker below
            </p>
          </div>
        )}
      </Card>

      {/* Google Address Section */}
      <Card className="p-6 bg-muted/50 border-2 border-border/50 shadow-lg">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-[#3D2E17] flex items-center gap-3 mb-2">
            <MapPin className="h-8 w-8 text-[#006B3E]" />
            Set Origin Address (Required)
          </h3>
          <p className="text-base text-[#3D2E17] font-bold">
            Use Google Maps to select the physical address for your Treehouse shipping origin
          </p>
        </div>

        <div className="space-y-6">
          {/* Address Search */}
          <div>
            <Label className="text-[#3D2E17] font-black text-base mb-2 flex items-center gap-2">
              <Search className="h-5 w-5 text-[#006B3E]" />
              Address Search
            </Label>
            <Input 
              ref={locationInputRef}
              placeholder="Start typing an address to search..."
              className="w-full border-2 border-[#006B3E]/30 focus:border-[#006B3E]"
            />
            <p className="text-sm font-bold text-[#5D4E37] mt-2">
              Select an address to auto-fill the fields below. You can also click the map or drag the pin.
            </p>
          </div>

          {/* Google Map */}
          <div ref={mapContainerRef} className="h-96 w-full rounded-xl border-2 border-[#006B3E]/30 shadow-lg bg-muted" />

          {/* Address Fields */}
          <div className="grid md:grid-cols-2 gap-4 p-6 bg-white/60 dark:bg-gray-800/50 rounded-xl border-2 border-[#006B3E]/20">
            <div>
              <Label className="text-xs text-muted-foreground">Street Address</Label>
              <Input 
                value={manualAddress.streetAddress} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, streetAddress: e.target.value }))}
                placeholder="Auto-filled from map"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-[#3D2E17]">Suburb</Label>
              <Input 
                value={manualAddress.suburb} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, suburb: e.target.value }))}
                placeholder="Auto-filled from map"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-[#3D2E17]">City</Label>
              <Input 
                value={manualAddress.city} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Auto-filled from map"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-[#3D2E17]">Province</Label>
              <Input 
                value={manualAddress.province} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, province: e.target.value }))}
                placeholder="Auto-filled from map"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-[#3D2E17]">Postal Code</Label>
              <Input 
                value={manualAddress.postalCode} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                placeholder="Auto-filled from map"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-[#3D2E17]">Country</Label>
              <Input 
                value={manualAddress.country} 
                onChange={(e) => setManualAddress(prev => ({ ...prev, country: e.target.value }))}
                placeholder="Auto-filled from map"
              />
            </div>
          </div>

          {/* Email and Shipping Methods Section */}
          <div className="space-y-6 p-6 bg-white/60 dark:bg-gray-800/50 rounded-xl border-2 border-[#006B3E]/20">
            <h4 className="text-xl font-black text-[#3D2E17] flex items-center gap-3">
              <Mail className="h-7 w-7 text-[#006B3E]" />
              Contact & Shipping Configuration
            </h4>
            
            {/* Email Field */}
            <div>
              <Label className="text-[#3D2E17] font-black text-base">Email Address</Label>
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
              <Label className="text-[#3D2E17] font-black text-base mb-4 flex items-center gap-2">
                <Truck className="h-7 w-7 text-[#006B3E]" />
                Available Shipping Methods
              </Label>
              <div className="space-y-3 mt-2">
                {allShippingMethods.map((method) => (
                  <div key={method.id} className="flex items-center space-x-3 p-3 bg-white/80 dark:bg-gray-700/50 rounded-lg hover:bg-[#006B3E]/5 transition-colors">
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
                      className="text-base font-bold text-[#3D2E17] leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
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
                Save Origin Address & Configuration
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Load Pudo Lockers Section - Only show if LTD or LTL are selected */}
      {(manualAddress.shippingMethods.includes('ltd') || manualAddress.shippingMethods.includes('ltl')) && (
      <Card className="p-6 bg-muted/50 border-2 border-border/50 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-black text-[#3D2E17] flex items-center gap-3 mb-2">
              <Building2 className="h-8 w-8 text-[#006B3E]" />
              Select Pudo Origin Locker (Required)
            </h3>
            <p className="text-base text-[#3D2E17] font-bold">
              Choose a Pudo locker as the shipping origin point for Locker-to-Door and Locker-to-Locker shipments
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
                        Save Pudo Locker
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
      )}
      
      {/* Warning when LTD/LTL selected but no Pudo locker section shown */}
      {!(manualAddress.shippingMethods.includes('ltd') || manualAddress.shippingMethods.includes('ltl')) && (manualAddress.shippingMethods.length > 0) && (
        <Card className="p-6 bg-muted/50 border-2 border-blue-300 dark:border-blue-700 shadow-lg">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-8 w-8 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-black text-[#3D2E17] mb-2 text-lg">Pudo Locker Selection</p>
              <p className="font-bold text-[#5D4E37] text-base">
                The Pudo locker selection will appear if you enable <strong>LTD - Locker to Door</strong> or <strong>LTL - Locker to Locker</strong> shipping methods above.
              </p>
            </div>
          </div>
        </Card>
      )}

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
