'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, MapPin, Car, FileText, CreditCard, CheckCircle, 
  Upload, X, Loader2, DollarSign, Radius
} from 'lucide-react';
import type { VehicleType, DriverApplication } from '@/types/driver';

const VEHICLE_TYPES: VehicleType[] = [
  'bicycle',
  'e-bike',
  'motorcycle',
  'car',
  'bakkie',
  'truck'
];

const DIAL_CODES = [
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
];

const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape'
];

const applicationSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(9, 'Phone number must be at least 9 digits'),
  dialCode: z.string(),
  address: z.string().min(10, 'Please enter your complete address'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
  country: z.string().min(2, 'Country is required'),
  serviceRadius: z.number().min(5).max(100),
  pricePerKm: z.number().min(1).max(50),
  baseDeliveryFee: z.number().min(0).max(200).optional(),
  vehicleType: z.string(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.number().optional(),
  vehicleColor: z.string().min(2, 'Vehicle color is required'),
  vehicleRegistration: z.string().min(3, 'Registration number is required'),
  vehicleDescription: z.string().optional(),
  bankName: z.string().min(2, 'Bank name is required'),
  accountNumber: z.string().min(5, 'Account number is required'),
  accountHolderName: z.string().min(2, 'Account holder name is required'),
  branchCode: z.string().min(4, 'Branch code is required'),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms'),
  backgroundCheckConsent: z.boolean().refine(val => val === true, 'Background check consent is required'),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface DriverApplicationFormProps {
  onSubmit: (applicationId: string) => void;
}

export function DriverApplicationForm({ onSubmit }: DriverApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Document uploads
  const [driverLicenseFront, setDriverLicenseFront] = useState<File | null>(null);
  const [driverLicenseBack, setDriverLicenseBack] = useState<File | null>(null);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);
  const [proofOfAddress, setProofOfAddress] = useState<File | null>(null);
  
  // Preview URLs
  const [licenseFrontPreview, setLicenseFrontPreview] = useState<string | null>(null);
  const [licenseBackPreview, setLicenseBackPreview] = useState<string | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [vehiclePreview, setVehiclePreview] = useState<string | null>(null);
  const [addressPreview, setAddressPreview] = useState<string | null>(null);
  
  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      dialCode: '+27',
      country: 'South Africa',
      serviceRadius: 15,
      pricePerKm: 8,
      baseDeliveryFee: 30,
      termsAccepted: false,
      backgroundCheckConsent: false,
    },
  });

  const handleFileSelect = (
    file: File | null,
    setFile: (file: File | null) => void,
    setPreview: (url: string | null) => void
  ) => {
    if (!file) {
      setFile(null);
      setPreview(null);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    setFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (data: ApplicationFormData) => {
    // Validate documents
    if (!driverLicenseFront || !driverLicenseBack || !idDocument || !vehiclePhoto) {
      toast({
        title: 'Missing Documents',
        description: 'Please upload all required documents',
        variant: 'destructive',
      });
      setCurrentStep(4); // Go to documents step
      return;
    }

    setIsSubmitting(true);

    try {
      const timestamp = Date.now();
      const tempId = `driver_app_${timestamp}`;

      // Upload all documents
      toast({ title: 'Uploading Documents...', description: 'Please wait' });
      
      const [
        licenseFrontUrl,
        licenseBackUrl,
        idUrl,
        vehicleUrl,
        addressUrl
      ] = await Promise.all([
        uploadFile(driverLicenseFront, `driver_applications/${tempId}/license_front.jpg`),
        uploadFile(driverLicenseBack, `driver_applications/${tempId}/license_back.jpg`),
        uploadFile(idDocument, `driver_applications/${tempId}/id_document.jpg`),
        uploadFile(vehiclePhoto, `driver_applications/${tempId}/vehicle_photo.jpg`),
        proofOfAddress ? uploadFile(proofOfAddress, `driver_applications/${tempId}/proof_of_address.jpg`) : Promise.resolve(undefined)
      ]);

      // Create application document
      const applicationData: Omit<DriverApplication, 'id'> = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        dialCode: data.dialCode,
        homeLocation: {
          address: data.address,
          latitude: 0, // TODO: Geocode address
          longitude: 0,
          city: data.city,
          province: data.province,
          country: data.country,
        },
        serviceRadius: data.serviceRadius,
        pricePerKm: data.pricePerKm,
        baseDeliveryFee: data.baseDeliveryFee,
        vehicle: {
          type: data.vehicleType as VehicleType,
          make: data.vehicleMake,
          model: data.vehicleModel,
          year: data.vehicleYear,
          color: data.vehicleColor,
          registrationNumber: data.vehicleRegistration,
          description: data.vehicleDescription,
        },
        documents: {
          driverLicenseFront: licenseFrontUrl,
          driverLicenseBack: licenseBackUrl,
          idDocument: idUrl,
          vehiclePhoto: vehicleUrl,
          proofOfAddress: addressUrl,
        },
        banking: {
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          accountHolderName: data.accountHolderName,
          branchCode: data.branchCode,
        },
        applicationStatus: 'pending',
        submittedAt: serverTimestamp() as any,
        termsAccepted: data.termsAccepted,
        backgroundCheckConsent: data.backgroundCheckConsent,
      };

      const docRef = await addDoc(collection(db, 'driver_applications'), applicationData);

      toast({
        title: 'Application Submitted! 🎉',
        description: 'Your application has been received and is under review',
      });

      onSubmit(docRef.id);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Submission Failed',
        description: 'Please try again or contact support',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Personal Info', icon: User },
    { num: 2, title: 'Location & Pricing', icon: MapPin },
    { num: 3, title: 'Vehicle Details', icon: Car },
    { num: 4, title: 'Documents', icon: FileText },
    { num: 5, title: 'Banking Info', icon: CreditCard },
    { num: 6, title: 'Review & Submit', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;
              
              return (
                <div key={step.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-purple-600 text-white scale-110 shadow-lg'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${isActive ? 'text-purple-600' : 'text-gray-500'}`}>
                      {step.title}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 rounded-full transition-all ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Form Steps */}
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...form.register('firstName')}
                    placeholder="John"
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-sm text-red-500">{form.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...form.register('lastName')}
                    placeholder="Doe"
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-sm text-red-500">{form.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="john.doe@example.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.watch('dialCode')}
                    onValueChange={(value) => form.setValue('dialCode', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAL_CODES.map((dc) => (
                        <SelectItem key={dc.code} value={dc.code}>
                          {dc.flag} {dc.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    {...form.register('phoneNumber')}
                    placeholder="812345678"
                    className="flex-1"
                  />
                </div>
                {form.formState.errors.phoneNumber && (
                  <p className="text-sm text-red-500">{form.formState.errors.phoneNumber.message}</p>
                )}
              </div>

              <Button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full"
              >
                Next Step
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Location & Pricing */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Location & Service Area</CardTitle>
              <CardDescription>Where will you be delivering from?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Home Address *</Label>
                <Input
                  id="address"
                  {...form.register('address')}
                  placeholder="123 Main Street, Suburb"
                />
                {form.formState.errors.address && (
                  <p className="text-sm text-red-500">{form.formState.errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    {...form.register('city')}
                    placeholder="Johannesburg"
                  />
                  {form.formState.errors.city && (
                    <p className="text-sm text-red-500">{form.formState.errors.city.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province *</Label>
                  <Select
                    value={form.watch('province')}
                    onValueChange={(value) => form.setValue('province', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {SA_PROVINCES.map((prov) => (
                        <SelectItem key={prov} value={prov}>
                          {prov}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.province && (
                    <p className="text-sm text-red-500">{form.formState.errors.province.message}</p>
                  )}
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Radius className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">Service Area & Pricing</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceRadius">Delivery Radius (km) *</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="serviceRadius"
                      type="number"
                      {...form.register('serviceRadius', { valueAsNumber: true })}
                      min={5}
                      max={100}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      How far are you willing to travel? ({form.watch('serviceRadius')} km)
                    </span>
                  </div>
                  {form.formState.errors.serviceRadius && (
                    <p className="text-sm text-red-500">{form.formState.errors.serviceRadius.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerKm">Your Rate (R/km) *</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="pricePerKm"
                        type="number"
                        {...form.register('pricePerKm', { valueAsNumber: true })}
                        min={1}
                        max={50}
                        step={0.5}
                        className="pl-10"
                        placeholder="8.00"
                      />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">per kilometer</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Recommended: R6-R12 per km. You'll earn R{(form.watch('pricePerKm') * 10).toFixed(2)} for a 10km delivery.
                  </p>
                  {form.formState.errors.pricePerKm && (
                    <p className="text-sm text-red-500">{form.formState.errors.pricePerKm.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseDeliveryFee">Minimum Delivery Fee (Optional)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      id="baseDeliveryFee"
                      type="number"
                      {...form.register('baseDeliveryFee', { valueAsNumber: true })}
                      min={0}
                      max={200}
                      step={5}
                      className="pl-10"
                      placeholder="30.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Minimum amount you'll earn per delivery, regardless of distance
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1"
                >
                  Next Step
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Vehicle Details */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
              <CardDescription>Tell us about your delivery vehicle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type *</Label>
                <Select
                  value={form.watch('vehicleType')}
                  onValueChange={(value) => form.setValue('vehicleType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.vehicleType && (
                  <p className="text-sm text-red-500">{form.formState.errors.vehicleType.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleMake">Make (Optional)</Label>
                  <Input
                    id="vehicleMake"
                    {...form.register('vehicleMake')}
                    placeholder="Toyota, Honda, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleModel">Model (Optional)</Label>
                  <Input
                    id="vehicleModel"
                    {...form.register('vehicleModel')}
                    placeholder="Corolla, Civic, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleYear">Year (Optional)</Label>
                  <Input
                    id="vehicleYear"
                    type="number"
                    {...form.register('vehicleYear', { valueAsNumber: true })}
                    placeholder="2020"
                    min={1990}
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleColor">Color *</Label>
                  <Input
                    id="vehicleColor"
                    {...form.register('vehicleColor')}
                    placeholder="White, Black, etc."
                  />
                  {form.formState.errors.vehicleColor && (
                    <p className="text-sm text-red-500">{form.formState.errors.vehicleColor.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleRegistration">Registration Number *</Label>
                <Input
                  id="vehicleRegistration"
                  {...form.register('vehicleRegistration')}
                  placeholder="ABC 123 GP"
                  className="uppercase"
                />
                {form.formState.errors.vehicleRegistration && (
                  <p className="text-sm text-red-500">{form.formState.errors.vehicleRegistration.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleDescription">Additional Details (Optional)</Label>
                <Textarea
                  id="vehicleDescription"
                  {...form.register('vehicleDescription')}
                  placeholder="Any additional information about your vehicle..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="flex-1"
                >
                  Next Step
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Documents Upload */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
              <CardDescription>Upload clear photos of your documents (max 5MB each)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Driver License Front */}
              <div className="space-y-3">
                <Label>Driver's License (Front) *</Label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                  {licenseFrontPreview ? (
                    <div className="relative">
                      <img
                        src={licenseFrontPreview}
                        alt="License Front"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => handleFileSelect(null, setDriverLicenseFront, setLicenseFrontPreview)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-gray-400" />
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('license-front')?.click()}
                        >
                          Choose File
                        </Button>
                        <input
                          id="license-front"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setDriverLicenseFront, setLicenseFrontPreview)}
                        />
                      </div>
                      <p className="text-sm text-gray-500">JPG, PNG or WEBP (max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver License Back */}
              <div className="space-y-3">
                <Label>Driver's License (Back) *</Label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                  {licenseBackPreview ? (
                    <div className="relative">
                      <img
                        src={licenseBackPreview}
                        alt="License Back"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => handleFileSelect(null, setDriverLicenseBack, setLicenseBackPreview)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-gray-400" />
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('license-back')?.click()}
                        >
                          Choose File
                        </Button>
                        <input
                          id="license-back"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setDriverLicenseBack, setLicenseBackPreview)}
                        />
                      </div>
                      <p className="text-sm text-gray-500">JPG, PNG or WEBP (max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ID Document */}
              <div className="space-y-3">
                <Label>ID Document / Passport *</Label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                  {idPreview ? (
                    <div className="relative">
                      <img
                        src={idPreview}
                        alt="ID Document"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => handleFileSelect(null, setIdDocument, setIdPreview)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-gray-400" />
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('id-doc')?.click()}
                        >
                          Choose File
                        </Button>
                        <input
                          id="id-doc"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setIdDocument, setIdPreview)}
                        />
                      </div>
                      <p className="text-sm text-gray-500">JPG, PNG or WEBP (max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Photo */}
              <div className="space-y-3">
                <Label>Vehicle Photo *</Label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                  {vehiclePreview ? (
                    <div className="relative">
                      <img
                        src={vehiclePreview}
                        alt="Vehicle"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => handleFileSelect(null, setVehiclePhoto, setVehiclePreview)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-gray-400" />
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('vehicle-photo')?.click()}
                        >
                          Choose File
                        </Button>
                        <input
                          id="vehicle-photo"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setVehiclePhoto, setVehiclePreview)}
                        />
                      </div>
                      <p className="text-sm text-gray-500">Clear photo showing license plate</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Proof of Address (Optional) */}
              <div className="space-y-3">
                <Label>Proof of Address (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                  {addressPreview ? (
                    <div className="relative">
                      <img
                        src={addressPreview}
                        alt="Proof of Address"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => handleFileSelect(null, setProofOfAddress, setAddressPreview)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-gray-400" />
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('proof-address')?.click()}
                        >
                          Choose File
                        </Button>
                        <input
                          id="proof-address"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setProofOfAddress, setAddressPreview)}
                        />
                      </div>
                      <p className="text-sm text-gray-500">Utility bill less than 3 months old</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!driverLicenseFront || !driverLicenseBack || !idDocument || !vehiclePhoto) {
                      toast({
                        title: 'Missing Documents',
                        description: 'Please upload all required documents',
                        variant: 'destructive',
                      });
                      return;
                    }
                    setCurrentStep(5);
                  }}
                  className="flex-1"
                >
                  Next Step
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Banking Information */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Banking Information</CardTitle>
              <CardDescription>Where should we send your earnings?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Weekly Payouts</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Request payouts every Wednesday. Funds typically arrive within 1-2 business days.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input
                  id="bankName"
                  {...form.register('bankName')}
                  placeholder="Standard Bank, FNB, ABSA, etc."
                />
                {form.formState.errors.bankName && (
                  <p className="text-sm text-red-500">{form.formState.errors.bankName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                <Input
                  id="accountHolderName"
                  {...form.register('accountHolderName')}
                  placeholder="Full name as it appears on your account"
                />
                {form.formState.errors.accountHolderName && (
                  <p className="text-sm text-red-500">{form.formState.errors.accountHolderName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    {...form.register('accountNumber')}
                    placeholder="1234567890"
                  />
                  {form.formState.errors.accountNumber && (
                    <p className="text-sm text-red-500">{form.formState.errors.accountNumber.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchCode">Branch Code *</Label>
                  <Input
                    id="branchCode"
                    {...form.register('branchCode')}
                    placeholder="123456"
                  />
                  {form.formState.errors.branchCode && (
                    <p className="text-sm text-red-500">{form.formState.errors.branchCode.message}</p>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Please double-check your banking details. Incorrect information may delay your payouts.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(4)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(6)}
                  className="flex-1"
                >
                  Review Application
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Review & Submit */}
        {currentStep === 6 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Your Application</CardTitle>
              <CardDescription>Please review all information before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Personal Info Summary */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Personal Information
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500">Name:</span>{' '}
                      <span className="font-medium">{form.watch('firstName')} {form.watch('lastName')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>{' '}
                      <span className="font-medium">{form.watch('email')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>{' '}
                      <span className="font-medium">{form.watch('dialCode')} {form.watch('phoneNumber')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Pricing Summary */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  Service Area & Pricing
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Address:</span>{' '}
                    <span className="font-medium">{form.watch('address')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500">City:</span>{' '}
                      <span className="font-medium">{form.watch('city')}, {form.watch('province')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Service Radius:</span>{' '}
                      <span className="font-medium">{form.watch('serviceRadius')} km</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Rate:</span>{' '}
                      <span className="font-medium">R{form.watch('pricePerKm')}/km</span>
                    </div>
                    {form.watch('baseDeliveryFee') && (
                      <div>
                        <span className="text-gray-500">Min Fee:</span>{' '}
                        <span className="font-medium">R{form.watch('baseDeliveryFee')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehicle Summary */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Car className="w-5 h-5 text-purple-600" />
                  Vehicle Details
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500">Type:</span>{' '}
                      <span className="font-medium capitalize">{form.watch('vehicleType')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Color:</span>{' '}
                      <span className="font-medium">{form.watch('vehicleColor')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Registration:</span>{' '}
                      <span className="font-medium">{form.watch('vehicleRegistration')}</span>
                    </div>
                    {form.watch('vehicleMake') && (
                      <div>
                        <span className="text-gray-500">Make/Model:</span>{' '}
                        <span className="font-medium">{form.watch('vehicleMake')} {form.watch('vehicleModel')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents Summary */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Documents
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'Driver License (Front)', file: driverLicenseFront },
                      { name: 'Driver License (Back)', file: driverLicenseBack },
                      { name: 'ID Document', file: idDocument },
                      { name: 'Vehicle Photo', file: vehiclePhoto },
                      { name: 'Proof of Address', file: proofOfAddress },
                    ].map((doc) => (
                      <div key={doc.name} className="flex items-center gap-2">
                        {doc.file ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={doc.file ? 'text-green-600' : 'text-gray-400'}>
                          {doc.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Banking Summary */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  Banking Information
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500">Bank:</span>{' '}
                      <span className="font-medium">{form.watch('bankName')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Account Holder:</span>{' '}
                      <span className="font-medium">{form.watch('accountHolderName')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Account:</span>{' '}
                      <span className="font-medium">****{form.watch('accountNumber')?.slice(-4)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Branch Code:</span>{' '}
                      <span className="font-medium">{form.watch('branchCode')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={form.watch('termsAccepted')}
                    onCheckedChange={(checked) => form.setValue('termsAccepted', checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm cursor-pointer">
                    I accept the <a href="/terms" className="text-purple-600 hover:underline">Terms & Conditions</a> and <a href="/privacy" className="text-purple-600 hover:underline">Privacy Policy</a> *
                  </Label>
                </div>
                {form.formState.errors.termsAccepted && (
                  <p className="text-sm text-red-500 ml-7">{form.formState.errors.termsAccepted.message}</p>
                )}

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="background"
                    checked={form.watch('backgroundCheckConsent')}
                    onCheckedChange={(checked) => form.setValue('backgroundCheckConsent', checked as boolean)}
                  />
                  <Label htmlFor="background" className="text-sm cursor-pointer">
                    I consent to a background check and verification of my documents *
                  </Label>
                </div>
                {form.formState.errors.backgroundCheckConsent && (
                  <p className="text-sm text-red-500 ml-7">{form.formState.errors.backgroundCheckConsent.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(5)}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700"
                  disabled={isSubmitting || !form.watch('termsAccepted') || !form.watch('backgroundCheckConsent')}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
