
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, Save, Building } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db, functions } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { editDispensarySchema, type EditDispensaryFormData } from '@/lib/schemas';
import type { Dispensary, DispensaryType } from '@/types';
import { Loader } from '@googlemaps/js-api-loader';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

const hourOptions = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: (i + 1).toString().padStart(2, '0') }));
const minuteOptions = [ { value: "00", label: "00" }, { value: "15", label: "15" }, { value: "30", label: "30" }, { value: "45", label: "45" }];
const amPmOptions = [ { value: "AM", label: "AM" }, { value: "PM", label: "PM" }];

const wellnessStatusOptions: EditDispensaryFormData['status'][] = ['Pending Approval', 'Approved', 'Rejected', 'Suspended'];

const countryCodes = [
  { value: "+27", flag: "🇿🇦", shortName: "ZA", code: "+27" },
  { value: "+1",  flag: "🇺🇸", shortName: "US", code: "+1" },
  { value: "+44", flag: "🇬🇧", shortName: "GB", code: "+44" },
  { value: "+61", flag: "🇦🇺", shortName: "AU", code: "+61" },
  { value: "+49", flag: "🇩🇪", shortName: "DE", code: "+49" },
  { value: "+33", flag: "🇫🇷", shortName: "FR", code: "+33" },
];

function parseTimeToComponents(time24?: string): { hour?: string, minute?: string, amPm?: string } {
  if (!time24 || !time24.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) return {};
  const [hourStr, minuteStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const amPm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return { hour: hour.toString(), minute: minuteStr, amPm };
}

interface EditDispensaryDialogProps {
    dispensary: Dispensary;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onDispensaryUpdate: () => void;
    allDispensaryTypes: DispensaryType[];
    isSuperAdmin: boolean;
}

const createDispensaryUserCallable = httpsCallable(functions, 'createDispensaryUser');


export function EditDispensaryDialog({ dispensary, isOpen, onOpenChange, onDispensaryUpdate, allDispensaryTypes, isSuperAdmin }: EditDispensaryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [openHour, setOpenHour] = useState<string | undefined>();
  const [openMinute, setOpenMinute] = useState<string | undefined>();
  const [openAmPm, setOpenAmPm] = useState<string | undefined>();
  const [isOpentimePopoverOpen, setIsOpenTimePopoverOpen] = useState(false);

  const [closeHour, setCloseHour] = useState<string | undefined>();
  const [closeMinute, setCloseMinute] = useState<string | undefined>();
  const [closeAmPm, setCloseAmPm] = useState<string | undefined>();
  const [isCloseTimePopoverOpen, setIsCloseTimePopoverOpen] = useState(false);

  const [selectedCountryCode, setSelectedCountryCode] = useState(countryCodes[0].value);
  const [nationalPhoneNumber, setNationalPhoneNumber] = useState('');

  const form = useForm<EditDispensaryFormData>({
    resolver: zodResolver(editDispensarySchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (dispensary && isOpen) {
      form.reset({
        ...dispensary,
        latitude: dispensary.latitude === null ? undefined : dispensary.latitude,
        longitude: dispensary.longitude === null ? undefined : dispensary.longitude,
        operatingDays: dispensary.operatingDays || [],
      });
      const openTimeComps = parseTimeToComponents(dispensary.openTime);
      setOpenHour(openTimeComps.hour); setOpenMinute(openTimeComps.minute); setOpenAmPm(openTimeComps.amPm);
      const closeTimeComps = parseTimeToComponents(dispensary.closeTime);
      setCloseHour(closeTimeComps.hour); setCloseMinute(closeTimeComps.minute); setCloseAmPm(closeTimeComps.amPm);
      if (dispensary.phone) {
        const foundCountry = countryCodes.find(cc => dispensary.phone!.startsWith(cc.value));
        if (foundCountry) {
          setSelectedCountryCode(foundCountry.value);
          setNationalPhoneNumber(dispensary.phone!.substring(foundCountry.value.length));
        } else {
          setNationalPhoneNumber(dispensary.phone);
        }
      } else {
        setSelectedCountryCode(countryCodes[0].value);
        setNationalPhoneNumber('');
      }
    }
  }, [dispensary, isOpen, form]);
  
  const formatTo24Hour = (hourStr?: string, minuteStr?: string, amPmStr?: string): string => {
    if (!hourStr || !minuteStr || !amPmStr) return '';
    let hour = parseInt(hourStr, 10);
    if (amPmStr === 'PM' && hour !== 12) hour += 12;
    else if (amPmStr === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${minuteStr}`;
  };
  
  useEffect(() => { form.setValue('openTime', formatTo24Hour(openHour, openMinute, openAmPm), { shouldValidate: true, shouldDirty: true }); }, [openHour, openMinute, openAmPm, form]);
  useEffect(() => { form.setValue('closeTime', formatTo24Hour(closeHour, closeMinute, closeAmPm), { shouldValidate: true, shouldDirty: true }); }, [closeHour, closeMinute, closeAmPm, form]);

  useEffect(() => {
    const combinedPhoneNumber = `${selectedCountryCode}${nationalPhoneNumber}`;
    form.setValue('phone', combinedPhoneNumber, { shouldValidate: true, shouldDirty: !!nationalPhoneNumber });
  }, [selectedCountryCode, nationalPhoneNumber, form]);

  async function onSubmit(data: EditDispensaryFormData) {
    if (!dispensary.id || !isSuperAdmin) return;
    setIsSubmitting(true);
    try {
        const wasPending = dispensary.status === 'Pending Approval';
        const isNowApproved = data.status === 'Approved';

        if (wasPending && isNowApproved) {
            // Call the Cloud Function to create the user
            toast({ title: "Approving application...", description: "Attempting to create owner account." });
            try {
                const result = await createDispensaryUserCallable({
                    email: data.ownerEmail,
                    displayName: data.fullName,
                    dispensaryId: dispensary.id,
                });

                const { message, temporaryPassword } = result.data as { message: string, temporaryPassword?: string };
                toast({
                    title: "Approval Success",
                    description: `${message} ${temporaryPassword ? `Temporary Password: ${temporaryPassword}` : ''}`,
                    duration: 15000,
                });
            } catch (error: any) {
                 if (error instanceof FunctionsError) {
                    toast({ title: "User Creation Warning", description: error.message, variant: "destructive", duration: 10000 });
                 } else {
                    toast({ title: "User Creation Error", description: "A server error occurred while creating the user.", variant: "destructive", duration: 10000 });
                 }
            }
        }
        
        // Update the dispensary document regardless of user creation outcome
        const wellnessDocRef = doc(db, 'dispensaries', dispensary.id);
        const updateData = { ...data, lastActivityDate: serverTimestamp() };
        if (isNowApproved) {
          (updateData as any).approvedDate = serverTimestamp();
        }
        delete (updateData as any).applicationDate;

        await updateDoc(wellnessDocRef, updateData as any);
        toast({ title: "Wellness Profile Updated", description: `${data.dispensaryName} has been successfully updated.` });
        
        onOpenChange(false);
        onDispensaryUpdate();

    } catch (error: any) {
        console.error("Error updating wellness profile:", error);
        const errorMessage = error.details?.errorMessage || "Could not update wellness profile details.";
        toast({ title: "Update Failed", description: errorMessage, variant: "destructive" });
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
    if (hour12 === 0) hour12 = 12;
    return `${hour12.toString().padStart(2, '0')}:${minuteStr} ${amPm}`;
  };

  const selectedCountryDisplay = countryCodes.find(cc => cc.value === selectedCountryCode);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
            <DialogTitle
                className="text-3xl flex items-center text-foreground"
            >
                <Building className="mr-3 h-8 w-8 text-primary" /> Edit Wellness Profile
            </DialogTitle>
            <DialogDescription
                className="text-foreground"
            >
                Modify the details for &quot;{dispensary?.dispensaryName}&quot;.
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto p-4">
                <h2 className="text-xl font-semibold border-b pb-2 text-foreground">Owner Information</h2>
                <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel>Owner's Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ownerEmail" render={({ field }) => (
                    <FormItem><FormLabel>Owner's Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                </div>

                <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground">Wellness Information</h2>
                <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="dispensaryName" render={({ field }) => (
                    <FormItem><FormLabel>Wellness Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dispensaryType" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Wellness Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>{allDispensaryTypes.map(type => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage/>
                    </FormItem>
                    )} />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>{wellnessStatusOptions.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
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

                <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground">Location & Contact</h2>
                <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem><FormLabel>Wellness Location / Address</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormDescription>Start typing address or drag marker on map.</FormDescription><FormMessage />
                </FormItem>
                )} />
                
                <FormItem>
                    <FormLabel>Owner's Phone</FormLabel>
                    <div className="flex items-center gap-2">
                    <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}>
                        <SelectTrigger className="w-[120px] shrink-0">{selectedCountryDisplay ? <div className="flex items-center gap-1.5"><span>{selectedCountryDisplay.flag}</span><span>{selectedCountryDisplay.code}</span></div> : <SelectValue placeholder="Code" />}</SelectTrigger>
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
                    <Input type="tel" placeholder="National number" value={nationalPhoneNumber} onChange={(e) => setNationalPhoneNumber(e.target.value.replace(/\D/g, ''))} />
                    </div>
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem className="mt-0 pt-0"><FormControl><input type="hidden" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </FormItem>

                <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground">Operating Hours</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="openTime" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Open Time</FormLabel>
                        <Popover open={isOpentimePopoverOpen} onOpenChange={setIsOpenTimePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className="w-full justify-start font-normal"><Clock className="mr-2 h-4 w-4 opacity-50" />{field.value ? formatTo12HourDisplay(field.value) : 'Select Time'}</Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><div className="p-4 space-y-3"><div className="grid grid-cols-3 gap-2">
                            <Select value={openHour} onValueChange={setOpenHour}><SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger><SelectContent>{hourOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                            <Select value={openMinute} onValueChange={setOpenMinute}><SelectTrigger><SelectValue placeholder="Min" /></SelectTrigger><SelectContent>{minuteOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                            <Select value={openAmPm} onValueChange={setOpenAmPm}><SelectTrigger><SelectValue placeholder="AM/PM" /></SelectTrigger><SelectContent>{amPmOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                        </div><Button type="button" onClick={() => setIsOpenTimePopoverOpen(false)} className="w-full">Set Time</Button></div></PopoverContent>
                        </Popover><FormMessage />
                    </FormItem>)} />
                    <FormField control={form.control} name="closeTime" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Close Time</FormLabel>
                        <Popover open={isCloseTimePopoverOpen} onOpenChange={setIsCloseTimePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className="w-full justify-start font-normal"><Clock className="mr-2 h-4 w-4 opacity-50" />{field.value ? formatTo12HourDisplay(field.value) : 'Select Time'}</Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><div className="p-4 space-y-3"><div className="grid grid-cols-3 gap-2">
                            <Select value={closeHour} onValueChange={setCloseHour}><SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger><SelectContent>{hourOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                            <Select value={closeMinute} onValueChange={setCloseMinute}><SelectTrigger><SelectValue placeholder="Min" /></SelectTrigger><SelectContent>{minuteOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                            <Select value={closeAmPm} onValueChange={setCloseAmPm}><SelectTrigger><SelectValue placeholder="AM/PM" /></SelectTrigger><SelectContent>{amPmOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                        </div><Button type="button" onClick={() => setIsCloseTimePopoverOpen(false)} className="w-full">Set Time</Button></div></PopoverContent>
                        </Popover><FormMessage />
                    </FormItem>)} />
                </div>

                <FormField control={form.control} name="operatingDays" render={() => (<FormItem><FormLabel>Days of Operation</FormLabel><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {weekDays.map((day) => (<FormField key={day} control={form.control} name="operatingDays" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(day)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), day]) : field.onChange(field.value?.filter((value) => value !== day)); }}/></FormControl><FormLabel className="font-normal">{day}</FormLabel></FormItem>)}/>))}
                </div><FormMessage /></FormItem>
                )}/>

                <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground">Operations & Delivery</h2>
                <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="deliveryRadius" render={({ field }) => (<FormItem><FormLabel>Same-day Delivery Radius</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select radius" /></SelectTrigger></FormControl><SelectContent>{deliveryRadiusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                
                <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormLabel>Additional Information (Optional)</FormLabel><FormControl><Textarea placeholder="Notes..." {...field} value={field.value || ''} rows={4} /></FormControl><FormMessage /></FormItem>)} />
                
            </form>
            </Form>
            <DialogFooter className="mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting || (form.formState.isSubmitted && !form.formState.isValid)}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
