
'use client';

import { useState, useEffect, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, Search } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import type { CartItem, Dispensary, ShippingRate, AddressValues } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

const allShippingMethodsMap: { [key: string]: string } = {
  "dtd": "Door-to-Door Courier (The Courier Guy)",
  "dtl": "Door-to-Locker (Pudo)",
  "ltd": "Locker-to-Door (Pudo)",
  "ltl": "Locker-to-Locker (Pudo)",
  "collection": "Collection from Store",
  "in_house": "In-house Delivery Service",
};

// Add PudoLocker type based on API doc
interface PudoLocker {
    code: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
}

interface DispensaryShippingGroupProps {
  dispensaryId: string;
  dispensaryName: string;
  items: CartItem[];
  addressData: AddressValues;
  onShippingSelectionChange: (dispensaryId: string, rate: ShippingRate | null) => void;
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

  // State for Pudo Locker Selection
  const [pudoLockers, setPudoLockers] = useState<PudoLocker[]>([]);
  const [selectedLocker, setSelectedLocker] = useState<PudoLocker | null>(null);
  const [lockerSearchTerm, setLockerSearchTerm] = useState('');
  const [isLockerModalOpen, setIsLockerModalOpen] = useState(false);

  useEffect(() => {
    const fetchDispensary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'dispensaries', dispensaryId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDispensary({ id: docSnap.id, ...docSnap.data() } as Dispensary);
        } else {
          setError('Dispensary details could not be found.');
        }
      } catch (err) {
        setError('Failed to load dispensary information.');
        console.error(err);
      }
      setIsLoading(false);
    };
    fetchDispensary();
  }, [dispensaryId]);

  const handleTierSelection = async (tier: string) => {
    // Reset everything on new tier selection
    setSelectedTier(tier);
    setSelectedRateId(null);
    onShippingSelectionChange(dispensaryId, null);
    setRates([]);
    setError(null);
    setSelectedLocker(null);
    setPudoLockers([]);

    if (tier === 'dtd') { // Standard Door-to-Door
      setIsLoading(true);
      try {
        const getShiplogicRates = httpsCallable(functions, 'getShiplogicRates');
        const deliveryAddressForApi = {
          street_address: addressData.shippingAddress.streetAddress,
          local_area: addressData.shippingAddress.suburb,
          city: addressData.shippingAddress.city,
          zone: addressData.shippingAddress.province,
          code: addressData.shippingAddress.postalCode,
          country: addressData.shippingAddress.country,
          lat: addressData.shippingAddress.latitude,
          lng: addressData.shippingAddress.longitude,
        };
        const payload = { cart: items, dispensaryId, deliveryAddress: deliveryAddressForApi };
        const result = await getShiplogicRates(payload);
        const data = result.data as { rates?: ShippingRate[] };

        if (data.rates && data.rates.length > 0) {
          setRates(data.rates);
        } else {
          setError("No courier rates were found for this address. This may be due to the location being outside the courier's service area.");
        }
      } catch (err: any) {
        console.error("Error fetching shipping rates:", err);
        setError(err.message || "An unknown error occurred while fetching shipping rates.");
        toast({ title: "Shipping Rate Error", description: err.message || "Could not fetch shipping rates. Please check the address details.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else if (['dtl', 'ltd', 'ltl'].includes(tier)) { // Pudo Methods
      setIsFetchingLockers(true);
      setError(null);
      try {
        const getPudoLockers = httpsCallable(functions, 'getPudoLockers');
        const result = await getPudoLockers();
        // The Pudo API returns lockers in a 'data' object
        const lockerData = (result.data as any)?.data as PudoLocker[];
        if (lockerData && lockerData.length > 0) {
          setPudoLockers(lockerData);
        } else {
          setError('Could not retrieve any Pudo lockers at this time.');
          toast({ title: "Locker Error", description: "Could not retrieve Pudo lockers.", variant: "destructive" });
        }
      } catch (err: any) {
        console.error("Error fetching Pudo lockers:", err);
        setError(err.message || 'Failed to fetch Pudo locker locations.');
        toast({ title: "Locker Error", description: err.message || "Could not fetch Pudo lockers.", variant: "destructive" });
      } finally {
        setIsFetchingLockers(false);
      }
    } else if (tier === 'collection') {
      const collectionRate: ShippingRate = { id: 999, name: 'In-Store Collection', rate: 0, service_level: 'collection', delivery_time: 'N/A', courier_name: dispensaryName };
      setRates([collectionRate]);
      setSelectedRateId(collectionRate.id.toString());
      onShippingSelectionChange(dispensaryId, collectionRate);
    } else if (tier === 'in_house') {
      const inHouseRate: ShippingRate = { id: 998, name: 'Local Delivery', rate: 50.00, service_level: 'local', delivery_time: 'Same-day or next-day', courier_name: dispensaryName };
      setRates([inHouseRate]);
      setSelectedRateId(inHouseRate.id.toString());
      onShippingSelectionChange(dispensaryId, inHouseRate);
    }
  };

  const handleLockerSelectAndFetchRate = async (locker: PudoLocker) => {
    setSelectedLocker(locker);
    setIsLockerModalOpen(false); // Close modal on selection
    setIsLoading(true); // Show main loader for rate fetching
    setError(null);
    setRates([]);

    try {
        const getPudoRates = httpsCallable(functions, 'getPudoRates');
        const payload = { cart, dispensaryId, destinationLockerCode: locker.code };
        const result = await getPudoRates(payload);
        const data = result.data as { rates?: ShippingRate[] };

        if (data.rates && data.rates.length > 0) {
            setRates(data.rates);
            // Automatically select the first (and likely only) rate returned
            handleRateSelection(data.rates[0].id.toString());
        } else {
            setError("No Pudo rate was found for the selected locker.");
        }
    } catch (err: any) {
        console.error("Error fetching Pudo rates:", err);
        setError(err.message || "An unknown error occurred while fetching Pudo rates.");
        toast({ title: "Pudo Rate Error", description: err.message || "Could not fetch Pudo rates.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }

  const handleRateSelection = (rateId: string) => {
    const rate = rates.find(r => r.id.toString() === rateId);
    if (rate) {
      setSelectedRateId(rateId);
      onShippingSelectionChange(dispensaryId, rate);
    }
  }
  
  const filteredLockers = useMemo(() => 
    pudoLockers.filter(locker => 
        locker.name.toLowerCase().includes(lockerSearchTerm.toLowerCase()) ||
        locker.address.toLowerCase().includes(lockerSearchTerm.toLowerCase())
    ), [pudoLockers, lockerSearchTerm]);


  const displayName = dispensary?.name || dispensaryName;

  if (!dispensary) {
      return (
          <Card className='bg-muted/20'>
              <CardHeader><CardTitle>Shipment from {displayName}</CardTitle></CardHeader>
              <CardContent>
                  {isLoading && <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading shipping options...</div>}
                  {error && <p className='text-destructive'>{error}</p>}
              </CardContent>
          </Card>
      )
  }

  const isPudoTier = ['dtl', 'ltd', 'ltl'].includes(selectedTier || '');

  return (
    <Card className="bg-muted/20 shadow-md">
      <CardHeader>
        <CardTitle>Shipment from {displayName}</CardTitle>
        <CardDescription>Select a delivery method for the items from this dispensary.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className='text-sm bg-background/50 rounded-md p-3 space-y-2'>
            <p className='font-semibold'>Items in this shipment:</p>
            <ul className='list-disc list-inside pl-2 text-muted-foreground'>
                {items.map(item => (
                    <li key={item.id}>{item.quantity} x {item.name} ({item.unit})</li>
                ))}
            </ul>
        </div>

        <div>
            <p className="font-medium mb-2">1. Choose Delivery Type</p>
            <RadioGroup onValueChange={handleTierSelection} value={selectedTier || ''} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(dispensary.shippingMethods || []).map(tier => (
                    <Label key={tier} className="flex items-center space-x-3 border rounded-md p-3 hover:bg-accent has-[:checked]:bg-accent has-[:checked]:ring-2 has-[:checked]:ring-primary transition-all cursor-pointer">
                        <RadioGroupItem value={tier} id={`${dispensaryId}-${tier}`} />
                        <span>{allShippingMethodsMap[tier] || tier}</span>
                    </Label>
                ))}
                 {dispensary.shippingMethods?.length === 0 && <p className='text-sm text-muted-foreground col-span-2'>This dispensary has not configured any shipping methods.</p>}
            </RadioGroup>
        </div>

        {isFetchingLockers && (
            <div className="flex items-center justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className='ml-3'>Fetching Pudo Lockers...</p></div>
        )}

        {/* Pudo Locker Selection UI */}
        {isPudoTier && !isFetchingLockers && pudoLockers.length > 0 && (
            <div>
                <p className="font-medium mb-2">2. Choose Pudo Locker</p>
                <Dialog open={isLockerModalOpen} onOpenChange={setIsLockerModalOpen}>
                    <DialogTrigger asChild>
                         <Button variant="outline" className="w-full justify-start text-left font-normal">
                            {selectedLocker ? `${selectedLocker.name} - ${selectedLocker.address}` : 'Click to select a locker'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader>
                            <DialogTitle>Select a Pudo Locker</DialogTitle>
                        </DialogHeader>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or address..."
                                value={lockerSearchTerm}
                                onChange={(e) => setLockerSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="max-h-[400px] overflow-y-auto space-y-2 p-1">
                           {filteredLockers.map(locker => (
                                <Button key={locker.code} variant="ghost" className="w-full justify-start h-auto py-2" onClick={() => handleLockerSelectAndFetchRate(locker)}>
                                    <div>
                                        <p className="font-semibold">{locker.name}</p>
                                        <p className="text-sm text-muted-foreground text-left">{locker.address}</p>
                                    </div>
                                </Button>
                           ))}
                           {filteredLockers.length === 0 && <p className='text-center text-muted-foreground py-4'>No lockers match your search.</p>}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className='ml-3'>Fetching rates...</p></div>
        )}

        {error && <p className="text-destructive text-center p-4 bg-destructive/10 rounded-md">{error}</p>}

        {rates.length > 0 && !isLoading && (
            <div>
                <p className="font-medium mb-2">{isPudoTier ? '3. Finalize Selection' : '2. Finalize Selection'}</p>
                <RadioGroup onValueChange={handleRateSelection} value={selectedRateId || ''} className="space-y-3">
                    {rates.map(rate => (
                        <Label key={rate.id} className="flex justify-between items-center border rounded-md p-4 has-[:checked]:bg-green-100 has-[:checked]:border-green-400 has-[:checked]:ring-2 has-[:checked]:ring-green-400 transition-all cursor-pointer">
                            <div>
                                <p className="font-semibold">{rate.courier_name} ({rate.name})</p>
                                <p className="text-sm text-muted-foreground">Est. Delivery: {rate.delivery_time}</p>
                            </div>
                            <p className="font-bold text-lg">R{rate.rate.toFixed(2)}</p>
                            <RadioGroupItem value={rate.id.toString()} id={`${dispensaryId}-${rate.id}`} className="sr-only" />
                        </Label>
                    ))}
                </RadioGroup>
            </div>
        )}

      </CardContent>
    </Card>
  );
};
