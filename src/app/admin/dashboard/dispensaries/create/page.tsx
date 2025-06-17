
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, Save, PlusCircle, ArrowLeft, Building } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, getDocs, query as firestoreQuery } from 'firebase/firestore';
import { adminCreateDispensarySchema, type AdminCreateDispensaryFormData } from '@/lib/schemas';
import type { DispensaryType, User as AppUser } from '@/types';

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const currencyOptions = [
  { value: "ZAR", label: "🇿🇦 ZAR (South African Rand)" }, { value: "USD", label: "💵 USD (US Dollar)" },
  { value: "EUR", label: "💶 EUR (Euro)" }, { value: "GBP", label: "💷 GBP (British Pound)" },
  { value: "AUD", label: "🇦🇺 AUD (Australian Dollar)" },
];

const deliveryRadiusOptions = [
  { value: "none", label: "No same-day delivery" }, { value: "5", label: "5 km" },
  { value: "10", label: "10 km" }, { value: "20", label: "20 km" }, { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
];

const bulkDeliveryRadiusOptions = [
  { value: "none", label: "None" }, { value: "national", label: "Nationwide" },
  { value: "global", label: "Global" }, { value: "off-planet", label: "Off Planet (My products are strong!)" },
];

const leadTimeOptions = [
  { value: "same-day", label: "Same day" }, { value: "1-3", label: "1–3 days" },
  { value: "3-7", label: "3–7 days" }, { value: "7-21", label: "7–21 days" }, { value: "21-36", label: "21–36 days" },
];

const hourOptions = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: (i + 1).toString().padStart(2, '0') }));
const minuteOptions = [ { value: "00", label: "00" }, { value: "15", label: "15" }, { value: "30", label: "30" }, { value: "45", label: "45" }];
const amPmOptions = [ { value: "AM", label: "AM" }, { value: "PM", label: "PM" }];

const dispensaryTypeIcons: Record<string, string> = {
  "THC - CBD - Mushrooms dispensary": "/icons/thc-cbd-mushroom.png",
  "Homeopathic dispensary": "/icons/homeopathy.png",
  "African Traditional Medicine dispensary": "/icons/traditional-medicine.png",
  "Flower Store": "/icons/default-pin.png",
  "Permaculture & gardening store": "/icons/permaculture.png",
  "Traditional Medicine": "/icons/traditional-medicine.png",
  "Homeopathy": "/icons/homeopathy.png",
  "THC / CBD / Mushroom Products": "/icons/thc-cbd-mushroom.png",
  "Permaculture Products": "/icons/permaculture.png",
  "default": "/icons/default-pin.png"
};

const dispensaryStatusOptions: AdminCreateDispensaryFormData['status'][] = ['Pending Approval', 'Approved', 'Rejected', 'Suspended'];

const countryCodes = [
  { value: "+27", flag: "🇿🇦", shortName: "ZA", code: "+27" },
  { value: "+1",  flag: "🇺🇸", shortName: "US", code: "+1" },
  { value: "+44", flag: "🇬🇧", shortName: "GB", code: "+44" },
  { value: "+61", flag: "🇦🇺", shortName: "AU", code: "+61" },
  { value: "+49", flag: "🇩🇪", shortName: "DE", code: "+49" },
  { value: "+33", flag: "🇫🇷", shortName: "FR", code: "+33" },
];

export default function AdminCreateDispensaryPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [openHour, setOpenHour] = useState<string | undefined>();
  const [openMinute, setOpenMinute] = useState<string | undefined>();
  const [openAmPm, setOpenAmPm] = useState<string | undefined>();
  const [isOpentimePopoverOpen, setIsOpenTimePopoverOpen] = useState(false);
  const [closeHour, setCloseHour] = useState<string | undefined>();
  const [closeMinute, setCloseMinute] = useState<string | undefined>();
  const [closeAmPm, setCloseAmPm] = useState<string | undefined>();
  const [isCloseTimePopoverOpen, setIsCloseTimePopoverOpen] = useState(false);

  const [dispensaryTypes, setDispensaryTypes] = useState<DispensaryType[]>([]);
  const [newDispensaryTypeName, setNewDispensaryTypeName] = useState('');
  const [newDispensaryTypeIconPath, setNewDispensaryTypeIconPath] = useState('');
  const [newDispensaryTypeImage, setNewDispensaryTypeImage] = useState('');
  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [selectedCountryCode, setSelectedCountryCode] = useState(countryCodes[0].value);
  const [nationalPhoneNumber, setNationalPhoneNumber] = useState('');

  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerInstanceRef = useRef<google.maps.Marker | null>(null);

  const form = useForm<AdminCreateDispensaryFormData>({
    resolver: zodResolver(adminCreateDispensarySchema),
    mode: "onChange",
    defaultValues: {
      fullName: '', phone: '', ownerEmail: '', dispensaryName: '',
      dispensaryType: undefined, currency: undefined, openTime: '', closeTime: '',
      operatingDays: [], location: '', latitude: undefined, longitude: undefined,
      deliveryRadius: undefined, bulkDeliveryRadius: undefined, collectionOnly: false,
      orderType: undefined, participateSharing: undefined, leadTime: undefined,
      message: '', status: 'Pending Approval',
    },
  });

  useEffect(() => {
    const combinedPhoneNumber = `${selectedCountryCode}${nationalPhoneNumber}`;
    form.setValue('phone', combinedPhoneNumber, { shouldValidate: true, shouldDirty: !!nationalPhoneNumber });
  }, [selectedCountryCode, nationalPhoneNumber, form]);

  useEffect(() => {
    const storedUserString = localStorage.getItem('currentUserHolisticAI');
    if (storedUserString) {
        try {
            const storedUser: AppUser = JSON.parse(storedUserString);
            if (storedUser.role === 'Super Admin') {
                setIsSuperAdmin(true);
            } else {
                toast({ title: "Access Denied", description: "Only Super Admins can create dispensaries.", variant: "destructive"});
                router.push('/admin/dashboard');
            }
        } catch (e) {
            console.error("Error parsing current user from localStorage", e);
            router.push('/auth/signin');
        }
    } else {
         toast({ title: "Not Authenticated", description: "Please sign in.", variant: "destructive"});
         router.push('/auth/signin');
    }
  }, [toast, router]);

  const fetchDispensaryTypes = useCallback(async () => {
    try {
      const typesCollectionRef = collection(db, 'dispensaryTypes');
      const q = firestoreQuery(typesCollectionRef);
      const querySnapshot = await getDocs(q);
      const fetchedTypes: DispensaryType[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedTypes.push({
            id: docSnap.id,
            name: docSnap.data().name,
            iconPath: docSnap.data().iconPath,
            image: docSnap.data().image
        } as DispensaryType);
      });
      setDispensaryTypes(fetchedTypes.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching dispensary types:", error);
      toast({ title: "Error", description: "Failed to fetch dispensary types.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchDispensaryTypes();
  }, [fetchDispensaryTypes]);

  const handleAddNewDispensaryType = async () => {
    if (!isSuperAdmin) {
        toast({ title: "Permission Denied", description: "Only Super Admins can add new dispensary types.", variant: "destructive"});
        return;
    }
    if (!newDispensaryTypeName.trim()) {
      toast({ title: "Validation Error", description: "New dispensary type name cannot be empty.", variant: "destructive" });
      return;
    }
    if (dispensaryTypes.some(type => type.name.toLowerCase() === newDispensaryTypeName.trim().toLowerCase())) {
      toast({ title: "Duplicate Error", description: "This dispensary type already exists.", variant: "destructive" });
      return;
    }

    const defaultIcon = `/icons/${newDispensaryTypeName.trim().toLowerCase().replace(/\s+/g, '-')}.png`;
    const defaultImage = `https://placehold.co/600x400.png?text=${encodeURIComponent(newDispensaryTypeName.trim())}`;

    const newTypeData = {
      name: newDispensaryTypeName.trim(),
      iconPath: newDispensaryTypeIconPath.trim() || defaultIcon,
      image: newDispensaryTypeImage.trim() || defaultImage
    };

    try {
      const newTypeRef = await addDoc(collection(db, 'dispensaryTypes'), newTypeData);
      toast({ title: "Success", description: `Dispensary type "${newDispensaryTypeName.trim()}" added.` });

      const newType = { id: newTypeRef.id, ...newTypeData };
      const updatedTypes = [...dispensaryTypes, newType].sort((a,b) => a.name.localeCompare(b.name));
      setDispensaryTypes(updatedTypes);
      form.setValue('dispensaryType', newType.name, {shouldValidate: true});
      setNewDispensaryTypeName('');
      setNewDispensaryTypeIconPath('');
      setNewDispensaryTypeImage('');
      setIsAddTypeDialogOpen(false);
    } catch (error) {
      console.error("Error adding new dispensary type:", error);
      toast({ title: "Error", description: "Failed to add new dispensary type.", variant: "destructive" });
    }
  };

  const watchDispensaryType = form.watch("dispensaryType");

  const initializeMapAndAutocomplete = useCallback(() => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.warn("Google Maps API or refs not ready for create page map initialization.");
      return;
    }

    const initialLat = form.getValues('latitude') ?? -29.8587;
    const initialLng = form.getValues('longitude') ?? 31.0218;
    const initialZoom = (form.getValues('latitude') && form.getValues('longitude')) ? 17 : 6;

    const currentTypeName = form.getValues('dispensaryType');
    let initialIconUrl = dispensaryTypeIcons.default;
    if (currentTypeName) {
        const selectedTypeObject = dispensaryTypes.find(dt => dt.name === currentTypeName);
        if (selectedTypeObject?.iconPath) {
            initialIconUrl = selectedTypeObject.iconPath;
        } else if (dispensaryTypeIcons[currentTypeName]) {
            initialIconUrl = dispensaryTypeIcons[currentTypeName];
        }
    }

    if (!mapInstanceRef.current && mapContainerRef.current) {
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: initialLat, lng: initialLng }, zoom: initialZoom,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      });
      mapInstanceRef.current = map;
      const marker = new window.google.maps.Marker({
        position: { lat: initialLat, lng: initialLng }, map, draggable: true,
        icon: { url: initialIconUrl, scaledSize: new window.google.maps.Size(40, 40), anchor: new window.google.maps.Point(20, 40) }
      });
      markerInstanceRef.current = marker;

      const geocoder = new window.google.maps.Geocoder();
      const handleMapInteraction = (pos: google.maps.LatLng) => {
        if (markerInstanceRef.current && mapInstanceRef.current) {
            markerInstanceRef.current.setPosition(pos);
            mapInstanceRef.current.panTo(pos);
            form.setValue('latitude', pos.lat(), { shouldValidate: true, shouldDirty: true });
            form.setValue('longitude', pos.lng(), { shouldValidate: true, shouldDirty: true });
            geocoder.geocode({ location: pos }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    form.setValue('location', results[0].formatted_address, { shouldValidate: true, shouldDirty: true });
                    if (results[0].address_components) {
                      const countryComponent = results[0].address_components.find(component =>
                        component.types.includes("country")
                      );
                      if (countryComponent) {
                        const countryShortName = countryComponent.short_name;
                        const matchedCountry = countryCodes.find(cc => cc.shortName === countryShortName);
                        if (matchedCountry) {
                          setSelectedCountryCode(matchedCountry.value);
                        }
                      }
                    }
                } else { console.warn('Reverse geocoder failed:', status); }
            });
        }
      };
      map.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && handleMapInteraction(e.latLng));
      marker.addListener('dragend', () => markerInstanceRef.current?.getPosition() && handleMapInteraction(markerInstanceRef.current.getPosition()!));
    }

    if (!autocompleteRef.current && locationInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        locationInputRef.current,
        { fields: ["formatted_address", "geometry", "name", "address_components"], types: ["address"], componentRestrictions: { country: "za" } }
      );
      autocompleteRef.current = autocomplete;
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) form.setValue('location', place.formatted_address, { shouldValidate: true, shouldDirty: true });
        if (place.geometry?.location) {
          const loc = place.geometry.location;
          form.setValue('latitude', loc.lat(), { shouldValidate: true, shouldDirty: true });
          form.setValue('longitude', loc.lng(), { shouldValidate: true, shouldDirty: true });
          if (mapInstanceRef.current && markerInstanceRef.current) {
            mapInstanceRef.current.setCenter(loc);
            mapInstanceRef.current.setZoom(17);
            markerInstanceRef.current.setPosition(loc);
          }
        }
        if (place.address_components) {
          const countryComponent = place.address_components.find(component =>
            component.types.includes("country")
          );
          if (countryComponent) {
            const countryShortName = countryComponent.short_name;
            const matchedCountry = countryCodes.find(cc => cc.shortName === countryShortName);
            if (matchedCountry) {
              setSelectedCountryCode(matchedCountry.value);
            }
          }
        }
      });
    }
  }, [form, dispensaryTypes]);

  useEffect(() => {
    let checkGoogleInterval: NodeJS.Timeout;
    if (typeof window.google === 'undefined' || !window.google.maps || !window.google.maps.places) {
        checkGoogleInterval = setInterval(() => {
            if (typeof window.google !== 'undefined' && window.google.maps && window.google.maps.places) {
                clearInterval(checkGoogleInterval);
                initializeMapAndAutocomplete();
            }
        }, 500);
        return () => clearInterval(checkGoogleInterval);
    } else {
        initializeMapAndAutocomplete();
    }
  }, [initializeMapAndAutocomplete]);

  useEffect(() => {
    if (markerInstanceRef.current && window.google && window.google.maps) {
      let iconUrl = dispensaryTypeIcons.default;
      if (watchDispensaryType) {
          const selectedTypeObject = dispensaryTypes.find(dt => dt.name === watchDispensaryType);
          if (selectedTypeObject?.iconPath) {
              iconUrl = selectedTypeObject.iconPath;
          } else if (dispensaryTypeIcons[watchDispensaryType]) {
              iconUrl = dispensaryTypeIcons[watchDispensaryType];
          }
      }
      markerInstanceRef.current.setIcon({ url: iconUrl, scaledSize: new window.google.maps.Size(40, 40), anchor: new window.google.maps.Point(20, 40) });
    }
  }, [watchDispensaryType, dispensaryTypes]);

  const formatTo24Hour = (hourStr?: string, minuteStr?: string, amPmStr?: string): string => {
    if (!hourStr || !minuteStr || !amPmStr) return '';
    let hour = parseInt(hourStr, 10);
    if (amPmStr === 'PM' && hour !== 12) hour += 12;
    else if (amPmStr === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${minuteStr}`;
  };

  useEffect(() => {
    const formattedOpenTime = formatTo24Hour(openHour, openMinute, openAmPm);
    if(formattedOpenTime) form.setValue('openTime', formattedOpenTime, { shouldValidate: true, shouldDirty: true });
    else if (form.getValues('openTime') !== '') form.setValue('openTime', '', { shouldValidate: true, shouldDirty: true });
  }, [openHour, openMinute, openAmPm, form]);

  useEffect(() => {
    const formattedCloseTime = formatTo24Hour(closeHour, closeMinute, closeAmPm);
    if(formattedCloseTime) form.setValue('closeTime', formattedCloseTime, { shouldValidate: true, shouldDirty: true });
    else if (form.getValues('closeTime') !== '') form.setValue('closeTime', '', { shouldValidate: true, shouldDirty: true });
  }, [closeHour, closeMinute, closeAmPm, form]);

  async function onSubmit(data: AdminCreateDispensaryFormData) {
    setIsLoading(true);
    try {
      const dispensaryData = {
        ...data,
        applicationDate: Timestamp.fromDate(new Date()),
        latitude: data.latitude === undefined ? null : data.latitude,
        longitude: data.longitude === undefined ? null : data.longitude,
      };
      await addDoc(collection(db, 'dispensaries'), dispensaryData);
      toast({
        title: "Dispensary Created!",
        description: `${data.dispensaryName} has been successfully created. If 'Approved', the owner role process will initiate.`,
      });
      form.reset();
      setOpenHour(undefined); setOpenMinute(undefined); setOpenAmPm(undefined);
      setCloseHour(undefined); setCloseMinute(undefined); setCloseAmPm(undefined);
      setSelectedCountryCode(countryCodes[0].value);
      setNationalPhoneNumber('');
      router.push('/admin/dashboard/dispensaries');
    } catch (error) {
      console.error("Error creating dispensary:", error);
      toast({ title: "Creation Failed", description: "Could not create dispensary.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const formatTo12HourDisplay = (time24?: string): string => {
    if (!time24 || !time24.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) return "Select Time";
    const [hour24Str, minuteStr] = time24.split(':');
    let hour24 = parseInt(hour24Str, 10);
    const amPm = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12.toString().padStart(2, '0')}:${minuteStr} ${amPm}`;
  };

  if (!isSuperAdmin && typeof window !== 'undefined') {
    return <div className="flex items-center justify-center h-screen"><p>Loading permissions...</p></div>;
  }
  if (!isSuperAdmin && isSuperAdmin !== undefined) {
     return <div className="flex items-center justify-center h-screen"><p>Access Denied. Only Super Admins can create dispensaries.</p></div>;
  }

  const selectedCountryDisplay = countryCodes.find(cc => cc.value === selectedCountryCode);

  return (
    <Card className="max-w-3xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle
            className="text-3xl flex items-center text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            <Building className="mr-3 h-8 w-8 text-primary" /> Create New Dispensary
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/dashboard/dispensaries"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Link>
          </Button>
        </div>
        <CardDescription
            className="text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
        >
            Fill in the details to create a new dispensary profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Owner Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem><FormLabel>Owner's Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ownerEmail" render={({ field }) => (
                <FormItem><FormLabel>Owner's Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Dispensary Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <FormField control={form.control} name="dispensaryName" render={({ field }) => (
                <FormItem><FormLabel>Dispensary Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dispensaryType" render={({ field }) => (
                 <FormItem>
                    <FormLabel>Dispensary Type</FormLabel>
                    <div className="flex items-center gap-2">
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {dispensaryTypes.map(type => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}
                        </SelectContent>
                        </Select>
                        {isSuperAdmin && (
                            <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline" size="icon" className="shrink-0"><PlusCircle className="h-4 w-4" /></Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Add New Dispensary Type</DialogTitle>
                                    <DialogDescription>Enter the name and optionally icon/image paths for the new type.</DialogDescription></DialogHeader>
                                    <div className="space-y-3 py-2">
                                        <Input value={newDispensaryTypeName} onChange={(e) => setNewDispensaryTypeName(e.target.value)} placeholder="New type name (e.g., Wellness Center)" />
                                        <Input value={newDispensaryTypeIconPath} onChange={(e) => setNewDispensaryTypeIconPath(e.target.value)} placeholder="Icon path (e.g., /icons/wellness.png)" />
                                        <Input value={newDispensaryTypeImage} onChange={(e) => setNewDispensaryTypeImage(e.target.value)} placeholder="Image URL (e.g., https://.../wellness-banner.jpg)" />
                                        <p className="text-xs text-muted-foreground">If icon/image paths are left blank, defaults will be generated.</p>
                                    </div>
                                    <DialogFooter><Button type="button" onClick={handleAddNewDispensaryType}>Save Type</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                    <FormMessage/>
                 </FormItem>
                )} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
             <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {dispensaryStatusOptions.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem><FormLabel>Preferred Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                    <SelectContent>{currencyOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            </div>

            <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Location & Contact</h2>
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem><FormLabel>Dispensary Location / Address</FormLabel>
                <FormControl><Input {...field} ref={locationInputRef} /></FormControl>
                <FormDescription>Start typing address or drag marker on map.</FormDescription><FormMessage />
              </FormItem>
            )} />
            <div ref={mapContainerRef} className="h-96 w-full mt-1 rounded-md border shadow-sm" />
            <FormField control={form.control} name="latitude" render={({ field }) => (<FormItem style={{ display: 'none' }}><FormControl><Input type="hidden" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem>)} />
            <FormField control={form.control} name="longitude" render={({ field }) => (<FormItem style={{ display: 'none' }}><FormControl><Input type="hidden" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem>)} />
            
            <FormItem>
                <FormLabel>Owner's Phone</FormLabel>
                <div className="flex items-center gap-2">
                  <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}>
                    <SelectTrigger className="w-[120px] shrink-0">
                        {selectedCountryDisplay ? (
                            <div className="flex items-center gap-1.5">
                                <span>{selectedCountryDisplay.flag}</span>
                                <span>{selectedCountryDisplay.code}</span>
                            </div>
                        ) : (
                            <SelectValue placeholder="Code" />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map(cc => (
                        <SelectItem key={cc.value} value={cc.value}>
                          <div className="flex items-center gap-2">
                            <span>{cc.flag}</span>
                            <span>{cc.shortName}</span>
                            <span>({cc.code})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    placeholder="National number"
                    value={nationalPhoneNumber}
                    onChange={(e) => setNationalPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                 <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem className="mt-0 pt-0"><FormControl><input type="hidden" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
            </FormItem>
            
            <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Operating Hours</h2>
            <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="openTime" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Open Time</FormLabel>
                    <Popover open={isOpentimePopoverOpen} onOpenChange={setIsOpenTimePopoverOpen}>
                    <PopoverTrigger asChild><FormControl>
                        <Button variant="outline" role="combobox" className="w-full justify-start font-normal">
                            <Clock className="mr-2 h-4 w-4 opacity-50" />
                            {field.value ? formatTo12HourDisplay(field.value) : <span>Select Open Time</span>}
                        </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><div className="p-4 space-y-3"><div className="grid grid-cols-3 gap-2">
                        <Select value={openHour} onValueChange={setOpenHour}><SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger><SelectContent>{hourOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                        <Select value={openMinute} onValueChange={setOpenMinute}><SelectTrigger><SelectValue placeholder="Min" /></SelectTrigger><SelectContent>{minuteOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                        <Select value={openAmPm} onValueChange={setOpenAmPm}><SelectTrigger><SelectValue placeholder="AM/PM" /></SelectTrigger><SelectContent>{amPmOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                    </div><Button type="button" onClick={() => setIsOpenTimePopoverOpen(false)} className="w-full">Set Time</Button></div></PopoverContent>
                    </Popover><FormMessage />
                </FormItem>)} />
                <FormField control={form.control} name="closeTime" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Close Time</FormLabel>
                    <Popover open={isCloseTimePopoverOpen} onOpenChange={setIsCloseTimePopoverOpen}>
                    <PopoverTrigger asChild><FormControl>
                        <Button variant="outline" role="combobox" className="w-full justify-start font-normal">
                            <Clock className="mr-2 h-4 w-4 opacity-50" />
                            {field.value ? formatTo12HourDisplay(field.value) : <span>Select Close Time</span>}
                        </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><div className="p-4 space-y-3"><div className="grid grid-cols-3 gap-2">
                        <Select value={closeHour} onValueChange={setCloseHour}><SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger><SelectContent>{hourOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                        <Select value={closeMinute} onValueChange={setCloseMinute}><SelectTrigger><SelectValue placeholder="Min" /></SelectTrigger><SelectContent>{minuteOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                        <Select value={closeAmPm} onValueChange={setCloseAmPm}><SelectTrigger><SelectValue placeholder="AM/PM" /></SelectTrigger><SelectContent>{amPmOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                    </div><Button type="button" onClick={() => setIsCloseTimePopoverOpen(false)} className="w-full">Set Time</Button></div></PopoverContent>
                    </Popover><FormMessage />
                </FormItem>)} />
            </div>

            <FormField control={form.control} name="operatingDays" render={() => (
              <FormItem>
                <FormLabel>Days of Operation</FormLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {weekDays.map((day) => (
                    <FormField key={day} control={form.control} name="operatingDays" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl><Checkbox checked={field.value?.includes(day)} onCheckedChange={(checked) => {
                                return checked ? field.onChange([...(field.value || []), day]) : field.onChange(field.value?.filter((value) => value !== day));
                              }}/></FormControl>
                          <FormLabel className="font-normal">{day}</FormLabel>
                        </FormItem>
                      )}/>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}/>

            <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Operations & Delivery</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <FormField control={form.control} name="deliveryRadius" render={({ field }) => (
                <FormItem><FormLabel>Same-day Delivery Radius</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select radius" /></SelectTrigger></FormControl>
                    <SelectContent>{deliveryRadiusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="bulkDeliveryRadius" render={({ field }) => (
                <FormItem><FormLabel>Bulk Order Delivery Radius</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select radius" /></SelectTrigger></FormControl>
                    <SelectContent>{bulkDeliveryRadiusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>

            <FormField control={form.control} name="collectionOnly" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div className="space-y-1 leading-none"><FormLabel>Collection Only</FormLabel><FormDescription>Check if dispensary only offers order collection.</FormDescription></div>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="orderType" render={({ field }) => (
              <FormItem><FormLabel>Order Types Fulfilled</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select order type" /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="small">Small orders</SelectItem><SelectItem value="bulk">Bulk orders</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />

            <FormField control={form.control} name="participateSharing" render={({ field }) => (
              <FormItem><FormLabel>Participate in Product Sharing Pool?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select participation" /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select>
                <FormDescription>Allows sharing products with same-type dispensaries.</FormDescription><FormMessage /></FormItem>)} />

            {form.watch("participateSharing") === "yes" && (
              <FormField control={form.control} name="leadTime" render={({ field }) => (
                <FormItem><FormLabel>Lead Time for Product Transfers</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select lead time" /></SelectTrigger></FormControl>
                    <SelectContent>{leadTimeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                  <FormDescription>Time needed to get products to other dispensaries.</FormDescription><FormMessage /></FormItem>)} />)}

            <FormField control={form.control} name="message" render={({ field }) => (
              <FormItem><FormLabel>Additional Information (Optional)</FormLabel><FormControl><Textarea placeholder="Notes..." {...field} value={field.value || ''} rows={4} /></FormControl><FormMessage /></FormItem>)} />

              <div className="flex gap-4 pt-4">
                <Button type="submit" size="lg" className="flex-1 text-lg"
                  disabled={isLoading || (form.formState.isSubmitted && !form.formState.isValid)}
                >
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Create Dispensary
                </Button>
                <Link href="/admin/dashboard/dispensaries" passHref legacyBehavior>
                  <Button type="button" variant="outline" size="lg" className="flex-1 text-lg" disabled={isLoading}>Cancel</Button>
                </Link>
              </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

