'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { MapPin, ChevronDown, Loader2, Search, CheckCircle, Truck } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CartItem, Dispensary, ShippingRate, AddressValues, PUDOLocker } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { calculateRoadDistance, calculateHaversineDistance } from '@/lib/maps-distance';

const allShippingMethodsMap: { [key: string]: string } = {
  "dtd": "Door-to-Door Courier",
  "dtl": "Door-to-Locker",
  "ltd": "Locker-to-Door",
  "ltl": "Locker-to-Locker",
  "collection": "Collection from Store",
  "in_house": "In-house Delivery Service",
};

interface DispensaryShippingGroupProps {
  dispensaryId: string;
  dispensaryName: string;
  items: CartItem[];
  addressData: AddressValues;
  onShippingSelectionChange: (dispensaryId: string, rate: ShippingRate | null) => void;
}

const isAddressComplete = (address: AddressValues['shippingAddress']) => {
    return address && address.streetAddress && address.city && address.postalCode && address.province;
}

export const DispensaryShippingGroup = ({ 
  dispensaryId, 
  dispensaryName, 
  items, 
  addressData,
  onShippingSelectionChange
}: DispensaryShippingGroupProps) => {
  const { toast } = useToast();
  const [dispensary, setDispensary] = useState<Dispensary | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const [isFetchingLockers, setIsFetchingLockers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  
  const [pickupPoints, setPickupPoints] = useState<PUDOLocker[]>([]);
  const [destinationLocker, setDestinationLocker] = useState<PUDOLocker | null>(null);
  const [parcelSizeCategory, setParcelSizeCategory] = useState<string>('');
  
  const [lockerSearchTerm, setLockerSearchTerm] = useState('');
  const [isLockerModalOpen, setIsLockerModalOpen] = useState(false);

  useEffect(() => {
    const fetchDispensary = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, 'dispensaries', dispensaryId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const dispensaryData = { id: docSnap.id, ...docSnap.data() } as Dispensary;
          setDispensary(dispensaryData);
        } else {
          setError('Dispensary details could not be found.');
        }
      } catch (err) {
        setError('Failed to load dispensary information.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDispensary();
  }, [dispensaryId]);

  const resetSelections = () => {
    setSelectedRateId(null);
    onShippingSelectionChange(dispensaryId, null);
    setRates([]);
    setError(null);
    setDestinationLocker(null);
  };

  const handleRateSelection = useCallback((rateId: string) => {
    const rate = rates.find(r => r.id.toString() === rateId);
    if (rate) {
      setSelectedRateId(rateId);
      // Pass rate with locker data embedded
      const rateWithLockers = {
        ...rate,
        originLocker: dispensary?.originLocker || null,
        destinationLocker: destinationLocker || null
      };
      onShippingSelectionChange(dispensaryId, rateWithLockers);
    }
  }, [rates, dispensaryId, dispensary?.originLocker, destinationLocker, onShippingSelectionChange]);

  const fetchPudoRates = useCallback(async () => {
    if (!selectedTier || !['dtl', 'ltd', 'ltl'].includes(selectedTier)) return;
    
    setIsLoading(true);
    setError(null);
    setRates([]);

    try {
      const getPudoRatesFn = httpsCallable(functions, 'getPudoRates');
      
      const deliveryAddressForApi = {
          street_address: addressData.shippingAddress.streetAddress,
          local_area: addressData.shippingAddress.suburb,
          city: addressData.shippingAddress.city,
          zone: addressData.shippingAddress.province,
          code: addressData.shippingAddress.postalCode,
          country: addressData.shippingAddress.country,
          lat: addressData.shippingAddress.latitude,
          lng: addressData.shippingAddress.longitude
      };

      let payload: any = { cart: items, dispensaryId, type: selectedTier };

      if (selectedTier === 'dtl') {
        if (!destinationLocker) return;
        payload.destinationLockerCode = destinationLocker.id;
      } else if (selectedTier === 'ltd') {
        if (!dispensary?.originLocker) { 
          setError("This dispensary has not configured an origin locker for this shipping method."); 
          setIsLoading(false);
          return; 
        }
        payload.originLockerCode = dispensary.originLocker.id;
        payload.deliveryAddress = deliveryAddressForApi;
      } else if (selectedTier === 'ltl') {
        if (!dispensary?.originLocker) { 
          setError("This dispensary has not configured an origin locker for this shipping method."); 
          setIsLoading(false);
          return; 
        }
        if (!destinationLocker) {
          setIsLoading(false);
          return; // Wait for user to select destination locker
        }
        payload.originLockerCode = dispensary.originLocker.id;
        payload.destinationLockerCode = destinationLocker.id;
      }
      
      const result = await getPudoRatesFn(payload);
      const data = result.data as { rates?: ShippingRate[] };

      if (data.rates && data.rates.length > 0) {
        setRates(data.rates);
      } else {
        setError("No locker-based shipping rates were found for the selected criteria.");
      }
    } catch (e: any) {
        console.error("Error fetching Pudo rates:", e);
        let errorMessage = "An unexpected error occurred while fetching Pudo rates.";
        if (e instanceof FunctionsError) {
            errorMessage = e.message;
        } else if (e.message) {
            errorMessage = e.message;
        }
        setError(errorMessage);
        toast({ title: "Pudo Rate Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedTier, items, dispensaryId, dispensary?.originLocker, destinationLocker, addressData, toast]);

  const fetchShiplogicRates = useCallback(async () => {
    if (!isAddressComplete(addressData.shippingAddress)) {
      setError("Please provide a complete shipping address to get door-to-door rates.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setRates([]);
    try {
      const getShiplogicRatesFn = httpsCallable(functions, 'getShiplogicRates');
      const payload = {
        cart: items,
        dispensaryId,
        type: 'std',
        deliveryAddress: {
          street_address: addressData.shippingAddress.streetAddress,
          local_area: addressData.shippingAddress.suburb,
          city: addressData.shippingAddress.city,
          zone: addressData.shippingAddress.province,
          code: addressData.shippingAddress.postalCode,
          country: addressData.shippingAddress.country,
          lat: addressData.shippingAddress.latitude,
          lng: addressData.shippingAddress.longitude,
        }
      };
      const result = await getShiplogicRatesFn(payload);
      const data = result.data as { rates?: ShippingRate[] };
      if (data.rates && data.rates.length > 0) {
        setRates(data.rates);
      } else {
        setError("No door-to-door shipping rates were found for your address.");
      }
    } catch (e: any) {
      console.error("Error fetching ShipLogic rates:", e);
        let errorMessage = "An unexpected error occurred while fetching shipping rates.";
        if (e instanceof FunctionsError) {
            errorMessage = e.message;
        } else if (e.message) {
            errorMessage = e.message;
        }
        setError(errorMessage);
        toast({ title: "Shipping Rate Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [items, dispensaryId, addressData, toast]);

  useEffect(() => {
    if (!selectedTier || !dispensary) return;
    
    // DTL: Needs destination locker only
    if (selectedTier === 'dtl' && destinationLocker) {
      fetchPudoRates();
    } 
    // LTD: Needs origin locker only (fetches immediately when tier is selected)
    else if (selectedTier === 'ltd' && dispensary.originLocker) {
      fetchPudoRates();
    } 
    // LTL: Needs both origin and destination lockers
    else if (selectedTier === 'ltl' && dispensary.originLocker && destinationLocker) {
      fetchPudoRates();
    }
  }, [selectedTier, dispensary, destinationLocker, fetchPudoRates]);

  useEffect(() => {
    if (rates.length === 1 && !selectedRateId) {
      handleRateSelection(rates[0].id.toString());
    }
  }, [rates, selectedRateId, handleRateSelection]);

  const handleTierSelection = async (tier: string) => {
    setSelectedTier(tier);
    resetSelections();
    
    const addressRequired = ['dtd', 'ltd', 'dtl', 'ltl'];
    if (addressRequired.includes(tier) && !isAddressComplete(addressData.shippingAddress)) {
        setError("Please provide a complete shipping address (including map selection) to get rates.");
        return;
    }
    setError(null);

    if (tier === 'dtd') {
      fetchShiplogicRates();
    } 
    else if (['dtl', 'ltd', 'ltl'].includes(tier)) {
      if ((tier === 'ltd' || tier === 'ltl') && !dispensary?.originLocker) {
        setError("This dispensary has not configured an origin locker for this shipping method. Please select another method.");
        return;
      }

      if (pickupPoints.length === 0) {
        setIsFetchingLockers(true);
        try {
          const getPudoLockersFn = httpsCallable(functions, 'getPudoLockers');
          const result = await getPudoLockersFn({ 
            latitude: addressData.shippingAddress.latitude, 
            longitude: addressData.shippingAddress.longitude,
            city: addressData.shippingAddress.city,
            cart: items // Pass cart items to determine parcel size compatibility
          });
          const lockerData = (result.data as any)?.data as PUDOLocker[];
          const parcelSizeCategory = (result.data as any)?.parcelSizeCategory;
          const parcelInfo = (result.data as any)?.parcelInfo;

          if (lockerData && lockerData.length > 0) {
            setPickupPoints(lockerData);
            setParcelSizeCategory(parcelSizeCategory || '');
            
            // Show size info to user if available
            if (parcelSizeCategory && parcelSizeCategory !== 'UNKNOWN') {
              if (parcelSizeCategory === 'OVERSIZED') {
                toast({ 
                  title: "Large Parcel Warning", 
                  description: `Your parcel (${parcelInfo?.dimensions}, ${parcelInfo?.weight}kg) may be too large for standard lockers. Please verify locker compatibility.`,
                  variant: "destructive",
                  duration: 8000
                });
              } else {
                console.log(`Showing lockers for ${parcelSizeCategory} size parcels:`, parcelInfo);
              }
            }
          } else {
            throw new Error('Could not retrieve any Pudo lockers in your specified city.');
          }
        } catch (e: any) {
            let errorMessage = "An unexpected error occurred while fetching Pudo locker locations.";
            if (e instanceof FunctionsError) {
                errorMessage = e.message;
            } else if (e.message) {
                errorMessage = e.message;
            }
            setError(errorMessage);
            toast({ title: "Locker Error", description: errorMessage, variant: "destructive" });
        } finally {
          setIsFetchingLockers(false);
        }
      }
    } else if (tier === 'collection') {
      const collectionRate = { id: 'collection', name: 'In-Store Collection', rate: 0, service_level: 'collection', delivery_time: 'N/A', courier_name: dispensaryName };
      setRates([collectionRate]);
    } else if (tier === 'in_house') {
      // Get customer and dispensary coordinates
      const customerLat = addressData.shippingAddress.latitude;
      const customerLon = addressData.shippingAddress.longitude;
      const dispensaryLat = dispensary?.latitude;
      const dispensaryLon = dispensary?.longitude;

      let deliveryFee = 0; // Will be calculated or set from dispensary config
      let deliveryTime = 'Same-day or next-day';

      if (customerLat && customerLon && dispensaryLat && dispensaryLon) {
        try {
          // Calculate REAL road distance using Google Maps Distance Matrix API
          const distanceResult = await calculateRoadDistance(
            { lat: dispensaryLat, lng: dispensaryLon },
            { lat: customerLat, lng: customerLon }
          );
          
          const distanceKm = distanceResult.distanceKm;
          const deliveryRadiusKm = dispensary?.deliveryRadius && dispensary.deliveryRadius !== 'none' 
            ? parseFloat(dispensary.deliveryRadius) 
            : null;

          // Scenario 1: Flat fee (if set AND within radius)
          if (dispensary?.inHouseDeliveryPrice && dispensary.inHouseDeliveryPrice > 0 && deliveryRadiusKm && distanceKm <= deliveryRadiusKm) {
            deliveryFee = dispensary.inHouseDeliveryPrice;
            deliveryTime = dispensary?.sameDayDeliveryCutoff 
              ? `Same-day if ordered before ${dispensary.sameDayDeliveryCutoff}` 
              : 'Same-day delivery';
          } 
          // Scenario 2: Per km pricing (if flat fee = 0 OR not set OR outside radius)
          else if (dispensary?.pricePerKm && dispensary.pricePerKm > 0) {
            const roundedDistance = Math.ceil(distanceKm); // Round up
            deliveryFee = dispensary.pricePerKm * roundedDistance; // No rounding to R100, use exact calculation
            
            // Show road distance in delivery time
            const distanceDisplay = distanceResult.status === 'success' 
              ? `${roundedDistance}km by road` 
              : `${roundedDistance}km (estimated)`;
            deliveryTime = `${distanceDisplay} - Estimated ${roundedDistance < 10 ? 'same-day' : '1-2 days'}`;
          }
          // Scenario 3: Fallback to legacy inHouseDeliveryFee if exists
          else if (dispensary?.inHouseDeliveryFee && dispensary.inHouseDeliveryFee > 0) {
            deliveryFee = dispensary.inHouseDeliveryFee;
          }
        } catch (error) {
          console.error('Error calculating road distance:', error);
          // Fallback to Haversine if Distance Matrix fails
          const distanceKm = calculateHaversineDistance(dispensaryLat, dispensaryLon, customerLat, customerLon);
          
          if (dispensary?.pricePerKm) {
            const roundedDistance = Math.ceil(distanceKm);
            const calculatedFee = dispensary.pricePerKm * roundedDistance;
            deliveryFee = Math.ceil(calculatedFee / 100) * 100;
            deliveryTime = `${roundedDistance}km (estimated) - ${roundedDistance < 10 ? 'same-day' : '1-2 days'}`;
          }
        }
      } else {
        // Fallback - still use proper pricing calculation
        // Priority 1: Use flat fee if configured
        if (dispensary?.inHouseDeliveryPrice && dispensary.inHouseDeliveryPrice > 0) {
          deliveryFee = Math.ceil(dispensary.inHouseDeliveryPrice / 100) * 100;
          deliveryTime = dispensary?.sameDayDeliveryCutoff 
            ? `Same-day if ordered before ${dispensary.sameDayDeliveryCutoff}` 
            : 'Same-day delivery';
        }
        // Priority 2: Use per km pricing if configured (even without exact coordinates)
        else if (dispensary?.pricePerKm && dispensary.pricePerKm > 0) {
          // Estimate based on delivery radius or default distance
          const estimatedDistance = dispensary?.deliveryRadius && dispensary.deliveryRadius !== 'none'
            ? Math.ceil(parseFloat(dispensary.deliveryRadius) / 2) // Use half of radius as estimate
            : 5; // Default 5km estimate
          const calculatedFee = dispensary.pricePerKm * estimatedDistance;
          deliveryFee = Math.ceil(calculatedFee / 100) * 100;
          deliveryTime = `Estimated delivery`;
        }
        // Priority 3: Legacy field
        else if (dispensary?.inHouseDeliveryFee) {
          deliveryFee = Math.ceil(dispensary.inHouseDeliveryFee / 100) * 100;
        }
      }

      const inHouseRate = { 
        id: 'in_house', 
        name: 'Local Delivery', 
        rate: deliveryFee, 
        service_level: 'local', 
        delivery_time: deliveryTime, 
        courier_name: dispensaryName 
      };
      setRates([inHouseRate]);
    }
  };

  const handleLockerSelect = (locker: PUDOLocker) => {
    setDestinationLocker(locker);
    setIsLockerModalOpen(false);
  };

  const openLockerModal = () => {
    if (pickupPoints.length > 0) {
        setIsLockerModalOpen(true);
    } else {
        toast({ title: "No Lockers Loaded", description: "Could not find any lockers for the address provided.", variant: "destructive" });
    }
  }
  
  const filteredLockers = useMemo(() => 
    pickupPoints.filter(locker => 
        locker.name.toLowerCase().includes(lockerSearchTerm.toLowerCase()) ||
        (locker.address && locker.address.toLowerCase().includes(lockerSearchTerm.toLowerCase()))
    ), [pickupPoints, lockerSearchTerm]);

  const isLockerTier = ['dtl', 'ltd', 'ltl'].includes(selectedTier || '');
  
  // Filter out LTL and LTD if no origin locker is configured
  const availableShippingMethods = useMemo(() => {
    if (!dispensary?.shippingMethods) return [];
    
    return dispensary.shippingMethods.filter(method => {
      // If method is LTL or LTD, only show if dispensary has an origin locker
      if (method === 'ltl' || method === 'ltd') {
        return !!dispensary.originLocker;
      }
      return true;
    });
  }, [dispensary?.shippingMethods, dispensary?.originLocker]);
  
  if (isLoading && !dispensary && !rates.length) {
    return (
      <Card className='bg-muted/20'><CardContent className='p-6 flex items-center'><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading shipping options...</CardContent></Card>
    );
  }

  const shouldShowError = error && !rates.length;
  const shouldShowNoMethods = availableShippingMethods.length === 0;

  return (
    <Card className="bg-muted/20 shadow-md">
      <CardHeader>
        <CardTitle className="text-[#3D2E17] font-extrabold">Shipment from {dispensary?.dispensaryName || dispensaryName}</CardTitle>
        <CardDescription className="text-[#3D2E17] font-bold">Select a delivery method for the items from this dispensary.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-3 py-4 sm:px-4 sm:py-5">
        
        <div className='text-sm bg-background/50 rounded-md p-3 space-y-2'>
          <p className='font-extrabold text-[#3D2E17]'>Items in this shipment:</p>
          <ul className='list-disc list-inside pl-2 text-muted-foreground'>
            {items.map(item => <li key={item.id}>{item.quantity} x {item.name} ({item.unit})</li>)}
          </ul>
        </div>

        <div>
          <p className="font-extrabold text-[#3D2E17] mb-2">1. Choose Delivery Type</p>
          <RadioGroup onValueChange={handleTierSelection} value={selectedTier || ''} className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availableShippingMethods.map(tier => (
              <Label key={tier} className="flex items-center space-x-3 border rounded-md p-3 hover:bg-accent has-[:checked]:bg-accent has-[:checked]:ring-2 has-[:checked]:ring-primary transition-all cursor-pointer">
                <RadioGroupItem value={tier} id={`${dispensaryId}-${tier}`} />
                <span>{allShippingMethodsMap[tier] || tier}</span>
              </Label>
            ))}
            {shouldShowNoMethods && <p className='text-sm text-muted-foreground col-span-2'>This dispensary has not configured any shipping methods{!dispensary?.originLocker && dispensary?.shippingMethods?.some(m => m === 'ltl' || m === 'ltd') ? ' (Locker-based methods hidden - no origin locker configured)' : ''}.</p>}
          </RadioGroup>
        </div>

        {/* Show origin locker by default if dispensary has LTL or LTD shipping methods configured */}
        {dispensary?.originLocker && dispensary?.shippingMethods?.some(m => m === 'ltl' || m === 'ltd') && (
          <Card className="border-[#006B3E]/30 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#006B3E]" />
                Origin Locker
              </CardTitle>
              <CardDescription className="text-sm">This dispensary ships locker-based orders from:</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className='font-semibold text-[#3D2E17]'>{dispensary.originLocker.name}</p>
                  <p className='text-sm text-muted-foreground'>{dispensary.originLocker.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isFetchingLockers && <div className="flex items-center p-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className='ml-3'>Fetching Pudo Lockers...</p></div>}

        {isLockerTier && !isFetchingLockers && !error && (
          <div className="space-y-4">

            {(selectedTier === 'dtl' || selectedTier === 'ltl') && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-extrabold text-[#3D2E17]">2. Select Destination Locker</p>
                        {parcelSizeCategory && parcelSizeCategory !== 'UNKNOWN' && (
                            <span className={`text-xs px-2 py-1 rounded font-bold ${parcelSizeCategory === 'OVERSIZED' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                                {parcelSizeCategory === 'OVERSIZED' ? '⚠️ Oversized' : `Size: ${parcelSizeCategory}`}
                            </span>
                        )}
                    </div>
                    <Button 
                        className="w-full justify-start text-left font-bold h-auto py-3 bg-[#006B3E] hover:bg-[#005030] text-white border-0" 
                        onClick={openLockerModal} 
                        disabled={!isAddressComplete(addressData.shippingAddress)}
                    >
                        {destinationLocker ? <div><p className='font-semibold'>{destinationLocker.name}</p><p className='text-sm text-green-100'>{destinationLocker.address}</p></div> : 'Select destination locker'}
                    </Button>
                    {!isAddressComplete(addressData.shippingAddress) && <p className='text-xs text-muted-foreground mt-1'>Please complete your address to select a locker.</p>}
                    {!destinationLocker && isAddressComplete(addressData.shippingAddress) && <p className='text-xs text-primary font-semibold mt-1'>⬆️ Please select a destination locker above to see shipping rates</p>}
                </div>
            )}
          </div>
        )}

        <Dialog open={isLockerModalOpen} onOpenChange={setIsLockerModalOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-green-50 dark:from-gray-900 dark:via-amber-950 dark:to-green-950">
                <DialogHeader className="pb-4 border-b-2 border-[#006B3E]/30">
                    <DialogTitle className="text-2xl font-black text-[#3D2E17] flex items-center gap-2">
                        <MapPin className="h-6 w-6 text-[#006B3E]" />
                        Select a Destination Pudo Locker
                    </DialogTitle>
                    <DialogDescription className="text-base font-semibold text-[#5D4E37]">Showing lockers near {addressData.shippingAddress.city}.</DialogDescription>
                </DialogHeader>
                <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#006B3E]" />
                    <Input 
                        placeholder="Search by name or address..." 
                        value={lockerSearchTerm} 
                        onChange={(e) => setLockerSearchTerm(e.target.value)} 
                        className="pl-10 border-2 border-[#006B3E]/30 focus:border-[#006B3E] font-semibold"
                    />
                </div>
                <div className="mt-4 flex-1 overflow-y-auto space-y-3 p-2 pr-3 smooth-scroll" style={{ scrollBehavior: 'smooth' }}>
                    {filteredLockers.length > 0 ? (
                        filteredLockers.map(locker => {
                            const isSelected = destinationLocker?.id === locker.id;
                            return (
                                <button
                                    key={locker.id}
                                    className={cn(
                                        "w-full rounded-xl p-4 text-left transition-all duration-200 border-2",
                                        isSelected 
                                            ? "bg-[#006B3E] border-[#006B3E] shadow-xl scale-[1.02] ring-4 ring-[#006B3E]/30" 
                                            : "bg-white/80 dark:bg-gray-800/50 border-[#006B3E]/20 hover:border-[#006B3E] hover:bg-gradient-to-br hover:from-white hover:to-green-50 dark:hover:from-gray-800 dark:hover:to-green-950/30 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                                    )}
                                    onClick={() => handleLockerSelect(locker)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <MapPin className={cn(
                                                    "h-5 w-5 flex-shrink-0",
                                                    isSelected ? "text-white" : "text-[#006B3E]"
                                                )} />
                                                <p className={cn(
                                                    "font-black text-base truncate",
                                                    isSelected ? "text-white" : "text-[#3D2E17]"
                                                )}>{locker.name}</p>
                                            </div>
                                            <p className={cn(
                                                "text-sm font-semibold line-clamp-2 ml-7",
                                                isSelected ? "text-green-50" : "text-[#5D4E37]"
                                            )}>{locker.address}</p>
                                        </div>
                                        {locker.distanceKm !== null && locker.distanceKm !== undefined && (
                                            <div className="flex-shrink-0">
                                                <div className={cn(
                                                    "px-3 py-1.5 rounded-lg text-center min-w-[70px]",
                                                    isSelected 
                                                        ? "bg-white/20 backdrop-blur-sm" 
                                                        : "bg-[#006B3E]/10"
                                                )}>
                                                    <p className={cn(
                                                        "text-xs font-bold uppercase tracking-wide",
                                                        isSelected ? "text-white" : "text-[#006B3E]"
                                                    )}>Distance</p>
                                                    <p className={cn(
                                                        "text-lg font-black",
                                                        isSelected ? "text-white" : "text-[#006B3E]"
                                                    )}>{locker.distanceKm.toFixed(1)}</p>
                                                    <p className={cn(
                                                        "text-xs font-bold",
                                                        isSelected ? "text-green-100" : "text-[#5D4E37]"
                                                    )}>km</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <div className="mt-3 pt-3 border-t border-white/30 flex items-center justify-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-white" />
                                            <span className="text-sm font-black text-white uppercase tracking-wide">Selected</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 bg-white/60 rounded-xl border-2 border-dashed border-[#006B3E]/30">
                            <MapPin className="h-12 w-12 text-[#006B3E]/30 mx-auto mb-3" />
                            <p className='text-lg font-bold text-[#5D4E37]'>No lockers match your search.</p>
                            <p className='text-sm font-semibold text-muted-foreground mt-1'>Try adjusting your search terms.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>

        {isLoading && (
          <div className="flex items-center justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className='ml-3'>Fetching rates...</p></div>
        )}

        {shouldShowError && <p className="text-destructive text-center p-4 bg-destructive/10 rounded-md">{error}</p>}

        {rates.length > 0 && !isLoading && (
            <div>
                <p className="font-extrabold text-[#3D2E17] mb-4 text-lg">3. Confirm Service Level</p>
                <RadioGroup onValueChange={handleRateSelection} value={selectedRateId || ''} className="space-y-3">
                    {rates.map(rate => {
                        const isSelected = selectedRateId === rate.id.toString();
                        return (
                            <Label 
                                key={rate.id} 
                                className={cn(
                                    "flex justify-between items-center rounded-xl p-4 sm:p-5 transition-all duration-200 cursor-pointer border-2 relative",
                                    isSelected
                                        ? "bg-[#006B3E] border-[#006B3E] shadow-xl ring-2 ring-[#006B3E]/30"
                                        : "bg-white/80 dark:bg-gray-800/50 border-[#006B3E]/20 hover:border-[#006B3E] hover:bg-gradient-to-br hover:from-white hover:to-green-50 dark:hover:from-gray-800 dark:hover:to-green-950/30 hover:shadow-lg active:scale-[0.99]"
                                )}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Truck className={cn(
                                            "h-5 w-5",
                                            isSelected ? "text-white" : "text-[#006B3E]"
                                        )} />
                                        <p className={cn(
                                            "font-black text-base",
                                            isSelected ? "text-white" : "text-[#3D2E17]"
                                        )}>{rate.courier_name}</p>
                                    </div>
                                    <p className={cn(
                                        "text-sm font-semibold ml-7",
                                        isSelected ? "text-green-100" : "text-[#5D4E37]"
                                    )}>{rate.name}</p>
                                    <p className={cn(
                                        "text-sm font-bold mt-1 ml-7",
                                        isSelected ? "text-green-50" : "text-[#006B3E]"
                                    )}>Est. Delivery: {rate.delivery_time}</p>
                                </div>
                                <div className="flex-shrink-0 ml-2 sm:ml-4">
                                    <div className={cn(
                                        "px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg",
                                        isSelected ? "bg-white/20 backdrop-blur-sm" : "bg-[#006B3E]/10"
                                    )}>
                                        <p className={cn(
                                            "text-xl sm:text-2xl font-black",
                                            isSelected ? "text-white" : "text-[#006B3E]"
                                        )}>R{rate.rate.toFixed(2)}</p>
                                    </div>
                                </div>
                                <RadioGroupItem value={rate.id.toString()} id={`${dispensaryId}-${rate.id}`} className="sr-only" />
                                {isSelected && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle className="h-6 w-6 text-white" />
                                    </div>
                                )}
                            </Label>
                        );
                    })}
                </RadioGroup>
            </div>
        )}

      </CardContent>
    </Card>
  );
};