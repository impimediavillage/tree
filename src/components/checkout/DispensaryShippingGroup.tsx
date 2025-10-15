'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, Search, MapPin } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import type { CartItem, Dispensary, ShippingRate, AddressValues, PUDOLocker } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    return address && address.streetAddress && address.city && address.postalCode && address.province && address.latitude && address.longitude;
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
  const [originLocker, setOriginLocker] = useState<PUDOLocker | null>(null);
  const [destinationLocker, setDestinationLocker] = useState<PUDOLocker | null>(null);
  
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
          if (dispensaryData.originLocker) {
            setOriginLocker(dispensaryData.originLocker);
          }
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
      onShippingSelectionChange(dispensaryId, rate);
    }
  }, [rates, dispensaryId, onShippingSelectionChange]);

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
        if (!originLocker) { setError("This dispensary has not configured an origin locker for this shipping method."); return; }
        payload.originLockerCode = originLocker.id;
        payload.deliveryAddress = deliveryAddressForApi;
      } else if (selectedTier === 'ltl') {
        if (!originLocker || !destinationLocker) return;
        if (!originLocker) { setError("This dispensary has not configured an origin locker for this shipping method."); return; }
        payload.originLockerCode = originLocker.id;
        payload.destinationLockerCode = destinationLocker.id;
      }
      
      const result = await getPudoRatesFn(payload);
      const data = result.data as { rates?: ShippingRate[] };

      if (data.rates && data.rates.length > 0) {
        setRates(data.rates);
      } else {
        setError("No locker-based shipping rates were found for the selected criteria.");
      }
    } catch (err: any) {
      console.error("Error fetching Pudo rates:", err);
      const message = err.message || "An unknown error occurred while fetching Pudo rates.";
      setError(message);
      toast({ title: "Pudo Rate Error", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedTier, items, dispensaryId, originLocker, destinationLocker, addressData, toast]);

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
    } catch (err: any) {
      console.error("Error fetching ShipLogic rates:", err);
      const message = err.message || "An unknown error occurred while fetching shipping rates.";
      setError(message);
      toast({ title: "Shipping Rate Error", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [items, dispensaryId, addressData, toast]);

  useEffect(() => {
    if (!selectedTier) return;
    if (selectedTier === 'dtl' && destinationLocker) {
      fetchPudoRates();
    } else if ((selectedTier === 'ltd' || selectedTier === 'ltl') && originLocker) {
      if (selectedTier === 'ltl') {
        if (destinationLocker) fetchPudoRates();
      } else {
        fetchPudoRates();
      }
    }
  }, [selectedTier, originLocker, destinationLocker, fetchPudoRates]);

  useEffect(() => {
    if (rates.length === 1 && !selectedRateId) {
      handleRateSelection(rates[0].id.toString());
    }
  }, [rates, selectedRateId, handleRateSelection]);

  const handleTierSelection = async (tier: string) => {
    setSelectedTier(tier);
    resetSelections();
    
    const addressRequired = ['dtd', 'ltd', 'dtl'];
    if (addressRequired.includes(tier) && !isAddressComplete(addressData.shippingAddress)) {
        setError("Please provide a complete shipping address (including map selection) to get rates.");
        return;
    }
    setError(null);

    if (tier === 'dtd') {
      fetchShiplogicRates();
    } 
    else if (['dtl', 'ltd', 'ltl'].includes(tier)) {
      if (tier === 'ltd' || tier === 'ltl') {
          if (!originLocker) {
              setError("This dispensary has not configured an origin locker for this shipping method. Please select another method.");
              return;
          }
      }
      if (pickupPoints.length === 0) {
        setIsFetchingLockers(true);
        try {
          const getPudoLockersFn = httpsCallable(functions, 'getPudoLockers');
          const result = await getPudoLockersFn({
            latitude: addressData.shippingAddress.latitude,
            longitude: addressData.shippingAddress.longitude,
            city: addressData.shippingAddress.city
          });
          const lockerData = (result.data as any)?.data as PUDOLocker[];

          if (lockerData && lockerData.length > 0) {
            setPickupPoints(lockerData);
          } else {
            throw new Error('Could not retrieve any Pudo lockers near your location.');
          }
        } catch (err: any) {
          const message = err.message || 'Failed to fetch Pudo locker locations.';
          setError(message);
          toast({ title: "Locker Error", description: message, variant: "destructive" });
        } finally {
          setIsFetchingLockers(false);
        }
      }
    } else if (tier === 'collection') {
      const collectionRate = { id: 'collection', name: 'In-Store Collection', rate: 0, service_level: 'collection', delivery_time: 'N/A', courier_name: dispensaryName };
      setRates([collectionRate]);
    } else if (tier === 'in_house') {
      const inHouseRate = { id: 'in_house', name: 'Local Delivery', rate: dispensary?.inHouseDeliveryFee ?? 50, service_level: 'local', delivery_time: 'Same-day or next-day', courier_name: dispensaryName };
      setRates([inHouseRate]);
    }
  };

  const handleLockerSelect = (locker: PUDOLocker) => {
    // Origin locker is not selectable by the user in this component
    if (destinationLocker) {
      setDestinationLocker(locker);
    }
    setIsLockerModalOpen(false);
  };

  const openLockerModal = () => {
    setIsLockerModalOpen(true);
  }
  
  const filteredLockers = useMemo(() => 
    pickupPoints.filter(locker => 
        locker.name.toLowerCase().includes(lockerSearchTerm.toLowerCase()) ||
        (locker.address && locker.address.toLowerCase().includes(lockerSearchTerm.toLowerCase()))
    ), [pickupPoints, lockerSearchTerm]);

  const isLockerTier = ['dtl', 'ltd', 'ltl'].includes(selectedTier || '');
  
  if (isLoading && !dispensary && !rates.length) {
    return (
      <Card className='bg-muted/20'><CardContent className='p-6 flex items-center'><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading shipping options...</CardContent></Card>
    )
  }

  const shouldShowError = error && !rates.length;
  const shouldShowNoMethods = dispensary?.shippingMethods?.length === 0;

  return (
    <Card className="bg-muted/20 shadow-md">
      <CardHeader>
        <CardTitle>Shipment from {dispensary?.dispensaryName || dispensaryName}</CardTitle>
        <CardDescription>Select a delivery method for the items from this dispensary.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className='text-sm bg-background/50 rounded-md p-3 space-y-2'>
          <p className='font-semibold'>Items in this shipment:</p>
          <ul className='list-disc list-inside pl-2 text-muted-foreground'>
            {items.map(item => <li key={item.id}>{item.quantity} x {item.name} ({item.unit})</li>)}
          </ul>
        </div>

        <div>
          <p className="font-medium mb-2">1. Choose Delivery Type</p>
          <RadioGroup onValueChange={handleTierSelection} value={selectedTier || ''} className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(dispensary?.shippingMethods || []).map(tier => (
              <Label key={tier} className="flex items-center space-x-3 border rounded-md p-3 hover:bg-accent has-[:checked]:bg-accent has-[:checked]:ring-2 has-[:checked]:ring-primary transition-all cursor-pointer">
                <RadioGroupItem value={tier} id={`${dispensaryId}-${tier}`} />
                <span>{allShippingMethodsMap[tier] || tier}</span>
              </Label>
            ))}
            {shouldShowNoMethods && <p className='text-sm text-muted-foreground col-span-2'>This dispensary has not configured any shipping methods.</p>}
          </RadioGroup>
        </div>

        {isFetchingLockers && <div className="flex items-center p-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className='ml-3'>Fetching Pudo Lockers...</p></div>}

        {isLockerTier && !isFetchingLockers && !error && (
          <div className="space-y-4">
            {(selectedTier === 'ltd' || selectedTier === 'ltl') && (
              <div>
                  <p className="font-medium mb-2">Origin Locker (Pre-selected by Dispensary)</p>
                  <div className="flex items-center gap-3 rounded-md border border-dashed p-3 bg-muted/50">
                      <MapPin className="h-6 w-6 text-muted-foreground" />
                      {originLocker ? (
                          <div>
                              <p className='font-semibold'>{originLocker.name}</p>
                              <p className='text-sm text-muted-foreground'>{originLocker.address}</p>
                          </div>
                      ) : (
                          <p className="text-sm text-destructive">Origin locker not configured by the dispensary.</p>
                      )}
                  </div>
              </div>
            )}

            {(selectedTier === 'dtl' || selectedTier === 'ltl') && (
                <div>
                    <p className="font-medium mb-2">{selectedTier === 'ltl' ? 'Destination Locker' : 'Destination Locker'}</p>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-auto py-2" onClick={openLockerModal} disabled={(selectedTier === 'ltl' || selectedTier === 'ltd') && !originLocker}>
                        {destinationLocker ? <div><p className='font-semibold'>{destinationLocker.name}</p><p className='text-sm text-muted-foreground'>{destinationLocker.address}</p></div> : 'Click to select destination locker'}
                    </Button>
                    {((selectedTier === 'ltl' || selectedTier === 'ltd') && !originLocker) && <p className='text-xs text-destructive mt-1'>Cannot select destination until dispensary configures an origin.</p>}
                </div>
            )}
          </div>
        )}

        <Dialog open={isLockerModalOpen} onOpenChange={setIsLockerModalOpen}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader><DialogTitle>Select a Destination Pudo Locker</DialogTitle></DialogHeader>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="Search by name or address..." value={lockerSearchTerm} onChange={(e) => setLockerSearchTerm(e.target.value)} className="pl-10"/>
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2 p-1">
                    {filteredLockers.map(locker => (
                        <Button key={locker.id} variant="ghost" className="w-full justify-start h-auto py-2 text-left" onClick={() => handleLockerSelect(locker)}>
                            <div>
                                <p className="font-semibold">{locker.name}</p>
                                <p className="text-sm text-muted-foreground">{locker.address}</p>
                            </div>
                        </Button>
                    ))}
                    {filteredLockers.length === 0 && <p className='text-center text-muted-foreground py-4'>No lockers match your search.</p>}
                </div>
            </DialogContent>
        </Dialog>

        {isLoading && (
          <div className="flex items-center justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className='ml-3'>Fetching rates...</p></div>
        )}

        {shouldShowError && <p className="text-destructive text-center p-4 bg-destructive/10 rounded-md">{error}</p>}

        {rates.length > 0 && !isLoading && (
            <div>
                <p className="font-medium mb-2">{isLockerTier ? (selectedTier === 'ltl' ? 'Finalize Selection' : 'Finalize Selection') : 'Finalize Selection'}</p>
                <RadioGroup onValueChange={handleRateSelection} value={selectedRateId || ''} className="space-y-3">
                    {rates.map(rate => (
                        <Label key={rate.id} className="flex justify-between items-center border rounded-md p-4 has-[:checked]:bg-green-100 has-[:checked]:border-green-400 has-[:checked]:ring-2 has-[:checked]:ring-green-400 transition-all cursor-pointer">
                            <div>
                                <p className="font-semibold">{rate.courier_name} ({rate.name})</p>
                                <p className="text-sm text-muted-foreground">Est. Delivery: {rate.delivery_time}</p>
                            </div>
                            <p className="font-bold text-lg">R{rate.rate.toFixed(2)}</p>
                            <RadioGroupItem value={rate.id.toString()} id={`${dispensaryId}-${rate.id}`} className="sr-only" />
                        </Label
                    ))}
                </RadioGroup>
            </div>
        )}

      </CardContent>
    </Card>
  );
};