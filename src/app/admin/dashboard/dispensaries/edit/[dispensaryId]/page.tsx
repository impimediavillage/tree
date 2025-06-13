
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
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, updateDoc, Timestamp, getDocs, query as firestoreQuery, addDoc } from 'firebase/firestore';
import { editDispensarySchema, type EditDispensaryFormData } from '@/lib/schemas';
import type { Dispensary, DispensaryType, User as AppUser } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

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

// This hardcoded map serves as a fallback if Firestore data for iconPath is missing
const dispensaryTypeIcons: Record<string, string> = {
  "THC - CBD - Mushrooms dispensary": "/icons/thc-cbd-mushroom.png",
  "Homeopathic dispensary": "/icons/homeopathy.png",
  "African Traditional Medicine dispensary": "/icons/traditional-medicine.png",
  "Flower Store": "/icons/default-pin.png", 
  "Permaculture & gardening store": "/icons/permaculture.png",
  "Traditional Medicine": "/icons/traditional-medicine.png", // Fallback for older name
  "Homeopathy": "/icons/homeopathy.png", // Fallback for older name
  "THC / CBD / Mushroom Products": "/icons/thc-cbd-mushroom.png", // Fallback for older name
  "Permaculture Products": "/icons/permaculture.png", // Fallback for older name
  "default": "/icons/default-pin.png"
};

const dispensaryStatusOptions: EditDispensaryFormData['status'][] = ['Pending Approval', 'Approved', 'Rejected', 'Suspended'];

const countryCodes = [
  { value: "+27", label: "🇿🇦 +27", flag: "🇿🇦", code: "+27" },
  { value: "+1", label: "🇺🇸 +1", flag: "🇺🇸", code: "+1" },
  { value: "+44", label: "🇬🇧 +44", flag: "🇬🇧", code: "+44" },
];

function parseTimeToComponents(time24?: string): { hour?: string, minute?: string, amPm?: string } {
  if (!time24 || !time24.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) return {};
  const [hourStr, minuteStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const amPm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12; // 12 AM or 12 PM
  return { hour: hour.toString(), minute: minuteStr, amPm };
}

export default function AdminEditDispensaryPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const dispensaryId = params.dispensaryId as string;

  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispensary, setDispensary] = useState<Dispensary | null>(null);
  
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // Default to false until verified

  const [selectedCountryCode, setSelectedCountryCode] = useState(countryCodes[0].value);
  const [nationalPhoneNumber, setNationalPhoneNumber] = useState('');

  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerInstanceRef = useRef<google.maps.Marker | null>(null);
  
  const [currentLat, setCurrentLat] = useState<number | undefined>(undefined);
  const [currentLng, setCurrentLng] = useState<number | undefined>(undefined);


  const form = useForm<EditDispensaryFormData>({
    resolver: zodResolver(editDispensarySchema),
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
             if (storedUser.role === 'Super Admin') { // Corrected permission check
                setIsSuperAdmin(true);
            } else {
                toast({ title: "Access Denied", description: "Only Super Admins can edit dispensaries.", variant: "destructive"});
                router.push('/admin/dashboard'); // Or another appropriate redirect
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
      const q = firestoreQuery(typesCollectionRef); // No ordering needed here as it's for selection
      const querySnapshot = await getDocs(q);
      const fetchedTypes: DispensaryType[] = [];
      querySnapshot.forEach((docSnap) => {
         fetchedTypes.push({ 
            id: docSnap.id, 
            name: docSnap.data().name,
            iconPath: docSnap.data().iconPath,
            image: docSnap.data().image // Ensure image is also fetched
        } as DispensaryType);
      });
      setDispensaryTypes(fetchedTypes.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching dispensary types for admin edit:", error);
      toast({ title: "Error", description: "Failed to fetch dispensary types.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchDispensaryTypes();
  }, [fetchDispensaryTypes]);

  const handleAddNewDispensaryType = async () => {
     if (!isSuperAdmin) { // Re-check, though page access should already gate this
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
    // Auto-generate paths if not provided
    const defaultIcon = `/icons/${newDispensaryTypeName.trim().toLowerCase().replace(/\s+/g, '-')}.png`;
    const defaultImage = `https://placehold.co/600x400.png?text=${encodeURIComponent(newDispensaryTypeName.trim())}`; // Use placeholder.co
    const newTypeData = { 
      name: newDispensaryTypeName.trim(),
      iconPath: newDispensaryTypeIconPath.trim() || defaultIcon,
      image: newDispensaryTypeImage.trim() || defaultImage
    };
    try {
      const newTypeRef = await addDoc(collection(db, 'dispensaryTypes'), newTypeData);
      toast({ title: "Success", description: `Dispensary type "${newDispensaryTypeName.trim()}" added.` });
      // Add new type to local state and select it
      const newType = { id: newTypeRef.id, ...newTypeData };
      const updatedTypes = [...dispensaryTypes, newType].sort((a,b) => a.name.localeCompare(b.name));
      setDispensaryTypes(updatedTypes);
      form.setValue('dispensaryType', newType.name, {shouldValidate: true}); // Select newly added type
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
    if (!window.google || !window.google.maps || !window.google.maps.places || !dispensary) {
      console.warn("Google Maps API, dispensary data, or refs not ready for edit page map initialization.");
      return;
    }

    // Use currentLat/Lng from state if available (updated by map interaction or fetched data)
    // Fallback to dispensary data, then to a default (e.g., Durban)
    const lat = currentLat ?? dispensary.latitude ?? -29.8587;
    const lng = currentLng ?? dispensary.longitude ?? 31.0218;
    const zoom = (currentLat && currentLng) || (dispensary.latitude && dispensary.longitude) ? 17 : 6;
    
    const currentTypeName = form.getValues('dispensaryType');
    let initialIconUrl = dispensaryTypeIcons.default; // Fallback to hardcoded default
    if (currentTypeName) {
        const selectedTypeObject = dispensaryTypes.find(dt => dt.name === currentTypeName);
        if (selectedTypeObject?.iconPath) {
            initialIconUrl = selectedTypeObject.iconPath;
        } else if (dispensaryTypeIcons[currentTypeName]) { // Fallback to hardcoded map
            initialIconUrl = dispensaryTypeIcons[currentTypeName];
        }
    }
    
    if (!mapInstanceRef.current && mapContainerRef.current) {
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat, lng }, zoom,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      });
      mapInstanceRef.current = map;
      const marker = new window.google.maps.Marker({
        position: { lat, lng }, map, draggable: true,
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
            setCurrentLat(pos.lat()); setCurrentLng(pos.lng()); // Update state for map re-centering
            geocoder.geocode({ location: pos }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    form.setValue('location', results[0].formatted_address, { shouldValidate: true, shouldDirty: true });
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
        { fields: ["formatted_address", "geometry", "name"], types: ["address"], componentRestrictions: { country: "za" } }
      );
      autocompleteRef.current = autocomplete;
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) form.setValue('location', place.formatted_address, { shouldValidate: true, shouldDirty: true });
        if (place.geometry?.location) {
          const loc = place.geometry.location;
          form.setValue('latitude', loc.lat(), { shouldValidate: true, shouldDirty: true });
          form.setValue('longitude', loc.lng(), { shouldValidate: true, shouldDirty: true });
          setCurrentLat(loc.lat()); setCurrentLng(loc.lng()); // Update state for map recentering
          if (mapInstanceRef.current && markerInstanceRef.current) {
            mapInstanceRef.current.setCenter(loc);
            mapInstanceRef.current.setZoom(17);
            markerInstanceRef.current.setPosition(loc);
          }
        }
      });
    }
  }, [dispensary, form, currentLat, currentLng, dispensaryTypes]); // Added dispensaryTypes as dependency

  // Fetch dispensary data
  useEffect(() => {
    if (dispensaryId && isSuperAdmin) { // Ensure super admin before fetching
      const fetchDispensary = async () => {
        setIsFetching(true);
        try {
          const dispensaryDocRef = doc(db, 'dispensaries', dispensaryId);
          const docSnap = await getDoc(dispensaryDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Dispensary;
            setDispensary(data);

            let appDateString = '';
            if (data.applicationDate) {
              if ((data.applicationDate as Timestamp).toDate) { // Firestore Timestamp
                appDateString = (data.applicationDate as Timestamp).toDate().toISOString().split('T')[0];
              } else if (data.applicationDate instanceof Date) { // JS Date
                appDateString = (data.applicationDate as Date).toISOString().split('T')[0];
              } else if (typeof data.applicationDate === 'string') { // String date
                try {
                  appDateString = new Date(data.applicationDate).toISOString().split('T')[0];
                } catch (e) {
                  console.warn("Could not parse applicationDate string:", data.applicationDate);
                  appDateString = ''; 
                }
              }
            }

            form.reset({
              ...data,
              applicationDate: appDateString, // Use formatted string if available
              operatingDays: data.operatingDays || [], // Ensure it's an array
              latitude: data.latitude === null ? undefined : data.latitude, // Handle null from Firestore
              longitude: data.longitude === null ? undefined : data.longitude, // Handle null from Firestore
            });
            setCurrentLat(data.latitude === null ? undefined : data.latitude);
            setCurrentLng(data.longitude === null ? undefined : data.longitude);
            
            const openTimeComps = parseTimeToComponents(data.openTime);
            setOpenHour(openTimeComps.hour); setOpenMinute(openTimeComps.minute); setOpenAmPm(openTimeComps.amPm);
            const closeTimeComps = parseTimeToComponents(data.closeTime);
            setCloseHour(closeTimeComps.hour); setCloseMinute(closeTimeComps.minute); setCloseAmPm(closeTimeComps.amPm);

            // Parse existing phone number
            if (data.phone) {
                const foundCountry = countryCodes.find(cc => data.phone!.startsWith(cc.value));
                if (foundCountry) {
                    setSelectedCountryCode(foundCountry.value);
                    setNationalPhoneNumber(data.phone!.substring(foundCountry.value.length));
                } else {
                    // If no known prefix, assume it's a national number for the default country
                    setNationalPhoneNumber(data.phone); // Could be improved if other default countries are added
                    setSelectedCountryCode(countryCodes[0].value); // Default to SA if no prefix match
                }
            }

          } else {
            toast({ title: "Not Found", description: "Dispensary not found.", variant: "destructive" });
            router.push('/admin/dashboard/dispensaries');
          }
        } catch (error) {
          console.error("Error fetching dispensary:", error);
          toast({ title: "Error", description: "Failed to fetch dispensary details.", variant: "destructive" });
        } finally {
          setIsFetching(false);
        }
      };
      fetchDispensary();
    } else if (!isSuperAdmin && typeof window !== 'undefined' && !authLoading) { // If not super admin and auth check done
        // Handled by page-level auth check, but an extra guard
        router.push('/admin/dashboard');
    }
  }, [dispensaryId, form, router, toast, isSuperAdmin, authLoading]);

  // Initialize Google Maps once data is fetched and API is ready
  useEffect(() => {
    if (isFetching || !dispensary || !isSuperAdmin) return; // Only init map once data is fetched and user is admin

    let checkGoogleInterval: NodeJS.Timeout;
    if (typeof window.google === 'undefined' || !window.google.maps || !window.google.maps.places) {
        console.log("Google Maps API not loaded yet, setting up interval check.");
        checkGoogleInterval = setInterval(() => {
            if (typeof window.google !== 'undefined' && window.google.maps && window.google.maps.places) {
                clearInterval(checkGoogleInterval);
                console.log("Google Maps API loaded via interval, initializing.");
                initializeMapAndAutocomplete();
            }
        }, 500); // Check every 500ms
        return () => clearInterval(checkGoogleInterval); // Cleanup on unmount
    } else {
        console.log("Google Maps API already loaded, initializing.");
        initializeMapAndAutocomplete();
    }
  }, [isFetching, dispensary, initializeMapAndAutocomplete, isSuperAdmin]); // Added isSuperAdmin

  // Update marker icon when dispensary type changes
  useEffect(() => {
    if (markerInstanceRef.current && window.google && window.google.maps) {
      let iconUrl = dispensaryTypeIcons.default; // Fallback to hardcoded default
      if (watchDispensaryType) {
          const selectedTypeObject = dispensaryTypes.find(dt => dt.name === watchDispensaryType);
          if (selectedTypeObject?.iconPath) {
              iconUrl = selectedTypeObject.iconPath;
          } else if (dispensaryTypeIcons[watchDispensaryType]) { // Fallback to hardcoded map
              iconUrl = dispensaryTypeIcons[watchDispensaryType];
          }
      }
      markerInstanceRef.current.setIcon({ url: iconUrl, scaledSize: new window.google.maps.Size(40, 40), anchor: new window.google.maps.Point(20, 40) });
    }
  }, [watchDispensaryType, dispensaryTypes]); // Ensure dispensaryTypes is a dependency
  
  const formatTo24Hour = (hourStr?: string, minuteStr?: string, amPmStr?: string): string => {
    if (!hourStr || !minuteStr || !amPmStr) return '';
    let hour = parseInt(hourStr, 10);
    if (amPmStr === 'PM' && hour !== 12) hour += 12;
    else if (amPmStr === 'AM' && hour === 12) hour = 0; // Midnight case
    return `${hour.toString().padStart(2, '0')}:${minuteStr}`;
  };

  useEffect(() => {
    const formattedOpenTime = formatTo24Hour(openHour, openMinute, openAmPm);
    if(formattedOpenTime) form.setValue('openTime', formattedOpenTime, { shouldValidate: true, shouldDirty: true });
    else if (form.getValues('openTime') !== '') form.setValue('openTime', '', { shouldValidate: true, shouldDirty: true }); // Clear if components are cleared
  }, [openHour, openMinute, openAmPm, form]);

  useEffect(() => {
    const formattedCloseTime = formatTo24Hour(closeHour, closeMinute, closeAmPm);
    if(formattedCloseTime) form.setValue('closeTime', formattedCloseTime, { shouldValidate: true, shouldDirty: true });
    else if (form.getValues('closeTime') !== '') form.setValue('closeTime', '', { shouldValidate: true, shouldDirty: true }); // Clear
  }, [closeHour, closeMinute, closeAmPm, form]);

  async function onSubmit(data: EditDispensaryFormData) {
    if (!dispensaryId || !isSuperAdmin) return; // Guard against submission if not admin
    setIsSubmitting(true);
    try {
      const dispensaryDocRef = doc(db, 'dispensaries', dispensaryId);
      // Prepare data for update, ensuring timestamps are handled correctly
      const updateData = {
        ...data,
        latitude: data.latitude === undefined ? null : data.latitude, // Ensure undefined becomes null for Firestore
        longitude: data.longitude === undefined ? null : data.longitude,
        // applicationDate is read-only in this form, so no need to convert it back to Timestamp
        // approvedDate would be set by the cloud function if status changes to Approved
        lastActivityDate: serverTimestamp(), // Always update last activity
      };
      
      // Remove applicationDate from updateData as it's not meant to be edited here by admin
      // And it was converted to string for display.
      delete (updateData as any).applicationDate;


      await updateDoc(dispensaryDocRef, updateData);
      toast({ title: "Dispensary Updated", description: `${data.dispensaryName} has been successfully updated.` });
      router.push('/admin/dashboard/dispensaries');
    } catch (error) {
      console.error("Error updating dispensary:", error);
      toast({ title: "Update Failed", description: "Could not update dispensary details.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }
  const formatTo12HourDisplay = (time24?: string): string => {
    if (!time24 || !time24.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) return "Select Time";
    const [hour24Str, minuteStr] = time24.split(':');
    let hour24 = parseInt(hour24Str, 10);
    const amPm = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12; // For 12 AM or 12 PM
    return `${hour12.toString().padStart(2, '0')}:${minuteStr} ${amPm}`;
  };

  if (isFetching) {
    return (
      <div className="max-w-3xl mx-auto my-8 p-6 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!dispensary || !isSuperAdmin) { // Final check after loading and auth
    // This path should ideally be caught by the useEffect redirects,
    // but it's a good fallback to prevent rendering the form without data or permission.
    return <div className="text-center py-10">Dispensary not found, failed to load, or access denied.</div>;
  }
  
  return (
    <Card className="max-w-3xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-3xl flex items-center">
            <Building className="mr-3 h-8 w-8 text-primary" /> Edit Dispensary
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/dashboard/dispensaries"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Link>
          </Button>
        </div>
        <CardDescription>Modify the details for &quot;{dispensary?.dispensaryName}&quot;.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-semibold border-b pb-2">Owner Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem><FormLabel>Owner's Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormItem>
                <FormLabel>Owner's Phone</FormLabel>
                <div className="flex items-center gap-2">
                  <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}>
                    <SelectTrigger className="w-[120px] shrink-0">
                      <SelectValue placeholder="Code" />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map(cc => (
                        <SelectItem key={cc.value} value={cc.value}>
                          {cc.flag} {cc.code}
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
                    // This hidden input receives the combined phone number for validation
                    <FormItem className="mt-0 pt-0"><FormControl><input type="hidden" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
              </FormItem>
            </div>
            <FormField control={form.control} name="ownerEmail" render={({ field }) => (
              <FormItem><FormLabel>Owner's Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <h2 className="text-xl font-semibold border-b pb-2 mt-6">Dispensary Information</h2>
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
                        {isSuperAdmin && ( // Only super admin can add types from here
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

            <h2 className="text-xl font-semibold border-b pb-2 mt-6">Location & Hours</h2>
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem><FormLabel>Dispensary Location / Address</FormLabel>
                <FormControl><Input {...field} ref={locationInputRef} /></FormControl>
                <FormDescription>Start typing address or drag marker on map.</FormDescription><FormMessage />
              </FormItem>
            )} />
            <div ref={mapContainerRef} className="h-96 w-full mt-1 rounded-md border shadow-sm" />
            <FormField control={form.control} name="latitude" render={({ field }) => (<FormItem style={{ display: 'none' }}><FormControl><Input type="hidden" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem>)} />
            <FormField control={form.control} name="longitude" render={({ field }) => (<FormItem style={{ display: 'none' }}><FormControl><Input type="hidden" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem>)} />

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

            <h2 className="text-xl font-semibold border-b pb-2 mt-6">Operations & Delivery</h2>
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
                  disabled={isSubmitting || isFetching || (form.formState.isSubmitted && !form.formState.isValid)}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Save Changes
                </Button>
                <Link href="/admin/dashboard/dispensaries" passHref legacyBehavior>
                  <Button type="button" variant="outline" size="lg" className="flex-1 text-lg" disabled={isSubmitting || isFetching}>Cancel</Button>
                </Link>
              </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    
