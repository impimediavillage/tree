'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dispensarySignupSchema, type DispensarySignupFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TimePicker } from '@/components/ui/time-picker';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Building, X, FileText, Scale, ShoppingCart, CreditCard, Shield, Package, AlertCircle, User, Eye, Copyright, MapPin, Mail, Phone, Globe, Truck, Store, Brain } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { db, functions, auth } from '@/lib/firebase';
import { collection, getDocs, query as firestoreQuery, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import type { DispensaryType } from '@/types';
import { Loader } from '@googlemaps/js-api-loader';
import countryDialCodes from '@/../docs/country-dial-codes.json';
import { getTaxRateByCountry, getTaxDataByCountry } from '@/lib/taxRates';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const currencyOptions = [
  { value: "ZAR", label: "🇿🇦 ZAR (South African Rand)" }, { value: "USD", label: "💵 USD (US Dollar)" },
  { value: "EUR", label: "💶 EUR (Euro)" }, { value: "GBP", label: "💷 GBP (British Pound)" },
];
const deliveryRadiusOptions = [
  { value: "none", label: "No same-day delivery" }, { value: "5", label: "5 km" },
  { value: "10", label: "10 km" }, { value: "20", label: "20 km" }, { value: "50", label: "50 km" },
];

interface Country {
    name: string;
    iso: string;
    flag: string;
    dialCode: string;
}

export default function WellnessSignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [wellnessTypes, setWellnessTypes] = useState<DispensaryType[]>([]);
  const [showTerms, setShowTerms] = useState(false);
  
  const locationInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitialized = useRef(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countryDialCodes.find(c => c.iso === 'ZA'));
  const [nationalPhoneNumber, setNationalPhoneNumber] = useState('');
  const [detectedTaxRate, setDetectedTaxRate] = useState<number | null>(null);

  const form = useForm<DispensarySignupFormData>({
    resolver: zodResolver(dispensarySignupSchema),
    mode: "onChange",
    defaultValues: {
      fullName: '',
      phone: '',
      ownerEmail: '',
      dispensaryName: '',
      dispensaryType: undefined,
      currency: 'ZAR',
      operatingDays: [],
      streetAddress: '',
      suburb: '',
      city: '',
      postalCode: '',
      province: '',
      country: '',
      latitude: undefined,
      longitude: undefined,
      showLocation: true,
      deliveryRadius: 'none',
      message: '',
      acceptTerms: false,
      openTime: '',
      closeTime: '',
    },
  });

  useEffect(() => {
    const fetchWellnessTypes = async () => {
      try {
        const querySnapshot = await getDocs(firestoreQuery(collection(db, 'dispensaryTypes')));
        const fetchedTypes = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as DispensaryType))
          .filter(type => type.isActive === true); // Only show active types
        setWellnessTypes(fetchedTypes.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching dispensary types:", error);
        toast({ title: "Error", description: "Could not load required data. Please try again later.", variant: "destructive" });
      }
    };
    fetchWellnessTypes();
  }, [toast]);

  const initializeMap = useCallback(() => {
    if (mapInitialized.current || !mapContainerRef.current) return;
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      toast({ title: "Map Error", description: "Google Maps API key is not configured.", variant: "destructive"});
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
            const countryShortName = getAddressComponent(components, 'country', true);
            
            form.setValue('streetAddress', `${streetNumber} ${route}`.trim(), { shouldValidate: true, shouldDirty: true });
            form.setValue('suburb', getAddressComponent(components, 'locality'), { shouldValidate: true, shouldDirty: true });
            form.setValue('city', getAddressComponent(components, 'administrative_area_level_2') || getAddressComponent(components, 'administrative_area_level_1'), { shouldValidate: true, shouldDirty: true });
            form.setValue('province', getAddressComponent(components, 'administrative_area_level_1'), { shouldValidate: true, shouldDirty: true });
            form.setValue('postalCode', getAddressComponent(components, 'postal_code'), { shouldValidate: true, shouldDirty: true });
            
            const countryName = getAddressComponent(components, 'country');
            form.setValue('country', countryName, { shouldValidate: true, shouldDirty: true });
            
            // Auto-populate tax rate based on country
            if (countryName) {
              const taxRate = getTaxRateByCountry(countryName);
              if (taxRate > 0) {
                setDetectedTaxRate(taxRate);
                const taxData = getTaxDataByCountry(countryName);
                toast({
                  title: "Tax Rate Detected",
                  description: `${taxData?.tax_type || 'Tax'} for ${countryName}: ${taxRate}%`,
                  duration: 4000,
                });
              } else {
                setDetectedTaxRate(0);
              }
            }

            const matchedCountry = countryDialCodes.find(c => c.iso.toLowerCase() === countryShortName.toLowerCase());
            if (matchedCountry) {
                setSelectedCountry(matchedCountry);
            }
        };

        const map = new google.maps.Map(mapContainerRef.current!, { center: { lat: -29.8587, lng: 31.0218 }, zoom: 6, mapId: 'b39f3f8b7139051d' });
        const marker = new google.maps.Marker({ map, draggable: true, position: { lat: -29.8587, lng: 31.0218 } });

        if (locationInputRef.current) {
            const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current, { fields: ["address_components", "geometry", "formatted_address"], types: ["address"] });
            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                if (place.geometry?.location) {
                    const loc = place.geometry.location;
                    map.setCenter(loc); map.setZoom(17); marker.setPosition(loc);
                    form.setValue('latitude', loc.lat(), { shouldValidate: true });
                    form.setValue('longitude', loc.lng(), { shouldValidate: true });
                    setAddressFields(place);
                }
            });
        }

        const geocoder = new google.maps.Geocoder();
        const handleMapInteraction = (pos: google.maps.LatLng) => {
            marker.setPosition(pos); map.panTo(pos);
            form.setValue('latitude', pos.lat(), { shouldValidate: true });
            form.setValue('longitude', pos.lng(), { shouldValidate: true });
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
        toast({ title: 'Map Error', description: 'Could not load Google Maps.', variant: 'destructive' });
    });
  }, [form, toast]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !mapInitialized.current) {
        initializeMap();
    }
  }, [initializeMap]);
  
  useEffect(() => {
    if (selectedCountry) {
        const combinedPhoneNumber = `${selectedCountry.dialCode}${nationalPhoneNumber}`.replace(/\D/g, '');
        form.setValue('phone', combinedPhoneNumber, { shouldValidate: true, shouldDirty: false });
    }
  }, [selectedCountry, nationalPhoneNumber, form]);

  const submitApplication = httpsCallable(functions, 'submitDispensaryApplication');

  async function onSubmit(data: DispensarySignupFormData) {
    setIsLoading(true);

    try {
      // TESTING MODE: Auto-approve for friend testing (R100 payment will be added later)
      // Include detected tax rate in submission
      const submissionData = { 
        ...data, 
        autoApprove: true,
        taxRate: detectedTaxRate ?? 0
      };
      
      const result: any = await submitApplication(submissionData);
      
      console.log('Submission result:', result.data);

      if (result.data.success) {
        // Check if auto-approved with auth token
        if (result.data.autoApproved && result.data.customToken) {
          console.log('Auto-approved! Token received, signing in...');
          
          toast({ 
            title: "Store Activated! 🎉", 
            description: "Logging you in to your dispensary dashboard..." 
          });
          
          try {
            // Sign in with custom token
            await signInWithCustomToken(auth, result.data.customToken);
            console.log('Sign in successful!');
            
            // Show password if it was created
            if (result.data.temporaryPassword) {
              console.log('Showing temporary password toast');
              toast({
                title: "Important: Save Your Password",
                description: `Temporary Password: ${result.data.temporaryPassword}`,
                duration: 10000,
              });
            }
            
            // Redirect to dispensary admin dashboard with welcome dialog
            console.log('Redirecting to dashboard with firstLogin=true');
            setTimeout(() => {
              router.push('/dispensary-admin/dashboard?firstLogin=true');
            }, 1500);
            
          } catch (authError) {
            console.error('Auto-login failed:', authError);
            toast({
              title: "Store Created!",
              description: "Please sign in with your email.",
            });
            setTimeout(() => {
              router.push('/login');
            }, 2000);
          }
        } else {
          // Regular submission (not auto-approved)
          setIsSuccess(true);
          toast({ 
            title: "Application Submitted!", 
            description: "We've received your application and will review it shortly." 
          });
        }
      } else {
        throw new Error(result.data.message || 'An unknown server error occurred.');
      }
    } catch (error: any) {
      console.error("Error submitting dispensary application:", error);
      const errorMessage = error.message || "An unexpected error occurred. Please try again.";
      toast({ 
          title: "Submission Failed", 
          description: errorMessage, 
          variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isSuccess) {
    return (
        <div className="container mx-auto flex h-screen items-center justify-center">
            <Card className="max-w-lg text-center shadow-xl">
                <CardHeader>
                    <CardTitle className="text-3xl text-[#3D2E17] font-extrabold">Thank You!</CardTitle>
                    <CardDescription className="text-[#3D2E17] font-bold">Your application has been successfully submitted.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-[#3D2E17] font-semibold">Our team will review your information and get back to you shortly. You can now safely close this page.</p>
                    <Button asChild className="mt-6">
                        <Link href="/">Back to Homepage</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  // Terms slide-in page
  if (showTerms) {
    const termsSection = [
      { icon: FileText, title: "1. DEFINITIONS", content: `Carrier means any person or business contracted by us to transport Goods.\n\nCustomer means any person who visits, accesses, or uses the Platform.\n\nContent means any text, image, video, data, or material published on the Platform.\n\nGoods means any physical or digital goods, including print-on-demand items.\n\nOrder means an offer by a Customer to purchase Goods.\n\nPlatform means https://thewellnesstree.co.za and any related applications.` },
      { icon: Scale, title: "2. INTERPRETATION", content: `These Terms apply to all Goods and services supplied by us and override any terms proposed by you.\n\nHeadings are for convenience only. Singular includes plural.\n\nSouth African law applies, including the Electronic Communications and Transactions Act 2002 and the Consumer Protection Act 2008.` },
      { icon: FileText, title: "3. OUR CONTRACT WITH YOU", content: `By using the Platform, you agree to be bound by this Agreement.\n\nThis Agreement constitutes the entire agreement between the Parties.\n\nWe may amend these Terms at any time without prior notice.` },
      { icon: ShoppingCart, title: "4. ACCEPTANCE OF ORDERS", content: `An Order is accepted only once Goods are dispatched or services activated.\n\nWe may refuse any Order prior to acceptance.\n\nOrders are limited to delivery addresses within South Africa unless agreed otherwise.` },
      { icon: CreditCard, title: "5. PRICING AND PAYMENT", content: `All prices are displayed in South African Rand (ZAR) and include VAT where applicable.\n\nPayment must be made using approved payment methods.\n\nPrices may change at any time.` },
      { icon: Shield, title: "6. SECURITY OF PAYMENTS", content: `Payments are processed via third-party payment gateways.\n\nWe do not store card details and accept no liability for gateway failures.\n\nRefunds are processed only to the original payment method.` },
      { icon: Package, title: "7. CANCELLATION AND RETURNS", content: `Customers may cancel Orders in accordance with the Consumer Protection Act.\n\nReturned Goods must be unused and in original condition.\n\nRefunds exclude delivery costs unless legally required.` },
      { icon: Package, title: "8. DELIVERY AND COLLECTION", content: `Delivery is performed by contracted Carriers.\n\nDelivery times are estimates and not guaranteed.\n\nRisk passes to you upon delivery or collection.` },
      { icon: Truck, title: "9. NO LIABILITY FOR DELIVERY DELAYS", content: `The Wellness Tree does not accept any responsibility or liability for late, delayed, or non-delivery of Goods.\n\nDelivery is performed by third-party Carriers who are independent contractors.\n\nWe are not liable for any losses, damages, or inconvenience arising from delivery delays, regardless of cause.` },
      { icon: Globe, title: "10. FOREIGN TAXES AND DUTIES", content: `We deliver only within South Africa.\n\nAny export is at your own risk and expense.` },
      { icon: Store, title: "11. MARKETPLACE FACILITATION", content: `The Wellness Tree operates as a marketplace platform. We do not manufacture, inspect, or guarantee products.\n\nAll Goods are sold by independent Sellers. The contract is directly between Seller and Buyer.\n\nThe Wellness Tree accepts no liability for product defects, quality issues, or non-conformity.` },
      { icon: Brain, title: "12. AI ADVISORS DISCLAIMER", content: `AI Advisors provide information for educational purposes only.\n\nCRITICAL WARNING: AI Advisors DO NOT provide medical, health, or professional advice.\n\nConsult qualified professionals before making health decisions.\n\nThe Wellness Tree accepts NO LIABILITY for AI-generated advice.` },
      { icon: AlertCircle, title: "13. LIMITATION OF LIABILITY", content: `Our liability is limited to the value of Goods purchased.\n\nWe are not liable for indirect or consequential loss.` },
      { icon: Shield, title: "14. DISCLAIMERS", content: `Goods and services are provided \"as is\".\n\nWe make no warranty of fitness for a particular purpose.` },
      { icon: User, title: "15. USER ACCOUNTS", content: `You are responsible for maintaining account confidentiality.\n\nYou may not use the Platform for unauthorised commercial purposes.` },
      { icon: Scale, title: "16-23. ADDITIONAL TERMS", content: `Content restrictions, licensing, security, indemnity, intellectual property, privacy (POPIA), and South African governing law apply.` },
    ];

    return (
      <div className="min-h-screen bg-background p-4 animate-in slide-in-from-right duration-300 overflow-y-auto">
        <div className="max-w-5xl mx-auto pb-8">
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#3D2E17]">Terms of Service</h1>
            <Button onClick={() => setShowTerms(false)} className="bg-[#3D2E17] hover:bg-[#006B3E] text-white">
              <X className="mr-2 h-5 w-5" /> Close
            </Button>
          </div>

          <div className="bg-muted/50 border-border/50 rounded-xl shadow-lg p-6 mb-6">
            <div className="text-center mb-4">
              <FileText className="h-16 w-16 text-[#006B3E] mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-[#3D2E17] mb-2">THE WELLNESS TREE (PTY) LTD</h2>
              <p className="text-[#3D2E17] font-bold">Registration Number: 2025/934950/07</p>
            </div>
            
            <div className="bg-muted/50 border-l-4 border-[#006B3E] p-4 rounded-r-lg mt-4">
              <p className="text-[#3D2E17] font-bold text-sm sm:text-base">
                This Agreement is the contract between The Wellness Tree (Pty) Ltd and any person who accesses or uses the Platform.
              </p>
              <p className="text-red-700 font-bold mt-2 text-sm sm:text-base">
                PLEASE READ CAREFULLY. If you do not agree with these Terms, you must immediately leave the Platform.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[#006B3E] mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#3D2E17]">Address</p>
                  <p className="text-[#3D2E17]">63 Oxley Road, Salmon Bay, Port Edward, KZN, 4295, South Africa</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#006B3E]" />
                  <span className="text-[#3D2E17] font-semibold">+27 633 873 052</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#006B3E]" />
                  <span className="text-[#3D2E17] font-semibold">info@thewellnesstree.co.za</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {termsSection.map((section, index) => (
              <div key={index} className="bg-muted/50 border-border/50 rounded-xl shadow-lg p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="bg-[#006B3E] p-2 rounded-lg flex-shrink-0">
                    <section.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-[#3D2E17] mb-2">{section.title}</h3>
                    <div className="text-[#3D2E17] font-semibold text-sm sm:text-base whitespace-pre-line leading-relaxed">
                      {section.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-[#006B3E] text-white rounded-xl shadow-xl p-6 text-center">
            <h3 className="text-xl font-bold mb-3">CONTACT DETAILS</h3>
            <div className="space-y-1 text-sm">
              <p className="font-bold">The Wellness Tree (Pty) Ltd</p>
              <p>63 Oxley Road, Salmon Bay, Port Edward, KwaZulu-Natal, 4295</p>
              <p>Registration No: 2025/934950/07</p>
              <p>Email: info@thewellnesstree.co.za | Tel: +27 633 873 052</p>
            </div>
            <p className="mt-4 text-sm font-semibold">Last Updated: 14 December 2025</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto my-8 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl flex items-center text-[#3D2E17] font-extrabold">
                <Building className="mr-3 h-12 w-12 text-[#006B3E]" /> Store / Club Signup
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
              </Button>
            </div>
            <CardDescription className="text-[#3D2E17] font-bold">Join our network by filling in the details below.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                
                <section>
                  <h2 className="text-xl font-extrabold border-b pb-2 text-[#3D2E17]">Owner & Store Information</h2>
                  <div className="grid md:grid-cols-2 gap-6 mt-4">
                    <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Full Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="ownerEmail" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Email Address</FormLabel><FormControl><Input type="email" placeholder="e.g., owner@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="dispensaryName" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Store Name</FormLabel><FormControl><Input placeholder="e.g., The Green Leaf" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="dispensaryType" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Store Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{wellnessTypes.map(type => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                  </div>
                </section>
                
                <section>
                  <h2 className="text-xl font-extrabold border-b pb-2 mt-6 text-[#3D2E17]">Location & Contact</h2>
                  <div className="mt-4 space-y-6">
                      <FormField control={form.control} name="showLocation" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Show Full Address Publicly</FormLabel><Select onValueChange={(value) => field.onChange(value === 'true')} value={String(field.value)}><FormControl><SelectTrigger><SelectValue placeholder="Select an option..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="true">Yes, show full address</SelectItem><SelectItem value="false">No, hide full address</SelectItem></SelectContent></Select><FormDescription className="text-[#3D2E17] font-semibold">Controls if the street address is visible on the public profile.</FormDescription><FormMessage /></FormItem>)} />
                      <FormItem>
                          <FormLabel className="text-[#3D2E17] font-bold">Location Search</FormLabel>
                          <FormControl><Input ref={locationInputRef} placeholder="Start typing an address to search..." /></FormControl>
                          <FormDescription className="text-[#3D2E17] font-semibold">Select an address to auto-fill the fields below. You can also click the map or drag the pin.</FormDescription>
                      </FormItem>

                      <div className="grid md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="streetAddress" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Street Address</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="suburb" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Suburb</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">City</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="province" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Province</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Postal Code</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Country</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                      </div>

                      <div ref={mapContainerRef} className="h-96 w-full rounded-md border shadow-sm bg-muted" />

                      <FormField control={form.control} name="phone" render={() => (
                          <FormItem><FormLabel className="text-[#3D2E17] font-bold">Phone Number</FormLabel>
                              <div className="flex items-center gap-2">
                                  <div className="w-[80px] shrink-0 border rounded-md h-10 flex items-center justify-center bg-muted">
                                    {selectedCountry && <span className='text-sm'>{selectedCountry.flag} {selectedCountry.dialCode}</span>}
                                  </div>
                                  <Input type="tel" placeholder="National number" value={nationalPhoneNumber} onChange={(e) => setNationalPhoneNumber(e.target.value.replace(/\D/g, ''))} />
                              </div>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="currency" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Default Currency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a currency" /></SelectTrigger></FormControl><SelectContent>{currencyOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                      
                      {/* Tax Rate Display */}
                      {detectedTaxRate !== null && (
                        <FormItem>
                          <FormLabel className="text-[#3D2E17] font-bold">Tax Rate (VAT/GST)</FormLabel>
                          <div className="flex items-center h-10 px-3 py-2 rounded-md border border-input bg-muted/50">
                            <span className="text-sm font-semibold text-[#3D2E17]">
                              {detectedTaxRate}% {detectedTaxRate === 0 && '(No tax data available for this country)'}
                            </span>
                          </div>
                          <FormDescription className="text-[#3D2E17] font-semibold">
                            This tax rate was automatically detected based on your country and will be applied to all product sales for tax compliance.
                          </FormDescription>
                        </FormItem>
                      )}
                  </div>
                </section>
                
                <section>
                  <h2 className="text-xl font-extrabold border-b pb-2 mb-6 text-[#3D2E17]">Operations & Services</h2>
                  <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="openTime" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Opening Time</FormLabel><FormControl><TimePicker value={field.value || undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="closeTime" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Closing Time</FormLabel><FormControl><TimePicker value={field.value || undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      <FormField control={form.control} name="operatingDays" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Operating Days</FormLabel><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 rounded-lg border p-4"><FormMessage />{weekDays.map((day) => (<FormItem key={day} className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value?.includes(day)} onCheckedChange={(checked) => {const currentDays = field.value || []; return checked ? field.onChange([...currentDays, day]) : field.onChange(currentDays.filter((value) => value !== day));}} /></FormControl><FormLabel className="font-bold text-sm text-[#3D2E17]">{day}</FormLabel></FormItem>))}</div></FormItem>)} />
                      <FormField control={form.control} name="deliveryRadius" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Same-day Delivery Radius</FormLabel><Select onValueChange={field.onChange} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder="Select a delivery radius" /></SelectTrigger></FormControl><SelectContent>{deliveryRadiusOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent></Select><FormDescription className="text-[#3D2E17] font-semibold">Requires an in-house delivery fleet.</FormDescription><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormLabel className="text-[#3D2E17] font-bold">Public Bio / Message</FormLabel><FormControl><Textarea placeholder="Tell customers a little bit about your store..." className="resize-vertical" {...field} value={field.value || ''} /></FormControl><FormDescription className="text-[#3D2E17] font-semibold">This is optional and will be displayed on your public store page.</FormDescription><FormMessage /></FormItem>)} />
                  </div>
                </section>

                <div className="pt-4">
                  <FormField control={form.control} name="acceptTerms" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel className="text-[#3D2E17] font-bold">I accept the <button type="button" onClick={() => setShowTerms(true)} className="underline text-[#006B3E] hover:text-[#005230] font-bold text-base">Terms of Usage Agreement</button>.</FormLabel></div>
                      </FormItem>
                  )}/>
                  <FormMessage className="mt-2 ml-1 text-sm text-red-500">{form.formState.errors.acceptTerms?.message}</FormMessage>
                </div>

                <Button type="submit" className="w-full text-lg py-6" disabled={isLoading || (form.formState.isSubmitted && !form.formState.isValid)}>
                  {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />} Submit Application
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
