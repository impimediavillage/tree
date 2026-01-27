'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Truck, Upload, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { VehicleType } from '@/types/driver';

const VEHICLE_TYPES: VehicleType[] = [
  'Car',
  'SUV',
  'Bakkie',
  'Motorcycle',
  'Scooter',
  'Bicycle',
  'Van',
  'Truck',
];

const SA_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'Eastern Cape',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Free State',
];

export default function DriverSignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dialCode, setDialCode] = useState('+27');
  
  // Vehicle information
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleDescription, setVehicleDescription] = useState('');
  
  // Location
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState(10);
  
  // Document uploads
  const [driverLicenseFile, setDriverLicenseFile] = useState<File | null>(null);
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null);
  
  // Preview URLs
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [vehiclePreview, setVehiclePreview] = useState<string | null>(null);
  
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const vehicleInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'license' | 'id' | 'vehicle'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'license') {
        setDriverLicenseFile(file);
        setLicensePreview(preview);
      } else if (type === 'id') {
        setIdDocumentFile(file);
        setIdPreview(preview);
      } else if (type === 'vehicle') {
        setVehiclePhotoFile(file);
        setVehiclePreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (type: 'license' | 'id' | 'vehicle') => {
    if (type === 'license') {
      setDriverLicenseFile(null);
      setLicensePreview(null);
      if (licenseInputRef.current) licenseInputRef.current.value = '';
    } else if (type === 'id') {
      setIdDocumentFile(null);
      setIdPreview(null);
      if (idInputRef.current) idInputRef.current.value = '';
    } else if (type === 'vehicle') {
      setVehiclePhotoFile(null);
      setVehiclePreview(null);
      if (vehicleInputRef.current) vehicleInputRef.current.value = '';
    }
  };

  const uploadDocument = async (file: File, userId: string, docType: string): Promise<string> => {
    const storageRef = ref(storage, `publicDrivers/${userId}/${docType}_${Date.now()}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!displayName || !email || !password || !phoneNumber) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (!vehicleType) {
      toast({
        title: 'Vehicle Type Required',
        description: 'Please select your vehicle type',
        variant: 'destructive'
      });
      return;
    }

    if (!driverLicenseFile || !idDocumentFile) {
      toast({
        title: 'Documents Required',
        description: 'Please upload your driver\'s license and ID document',
        variant: 'destructive'
      });
      return;
    }

    if (!city || !province) {
      toast({
        title: 'Location Required',
        description: 'Please enter your city and province',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Upload documents
      const [licenseUrl, idUrl, vehicleUrl] = await Promise.all([
        uploadDocument(driverLicenseFile, userId, 'driverLicense'),
        uploadDocument(idDocumentFile, userId, 'idDocument'),
        vehiclePhotoFile ? uploadDocument(vehiclePhotoFile, userId, 'vehiclePhoto') : Promise.resolve(null),
      ]);

      // Create public driver profile in publicDrivers collection
      await setDoc(doc(db, 'publicDrivers', userId), {
        userId,
        displayName,
        email,
        phoneNumber: `${dialCode}${phoneNumber}`,
        role: 'Driver', // Public driver role
        isDriver: true,
        driverType: 'public', // Public driver (not affiliated with any dispensary)
        status: 'PendingApproval', // Requires admin approval
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Vehicle information
        vehicle: {
          type: vehicleType,
          registration: vehicleRegistration || '',
          color: vehicleColor || '',
          description: vehicleDescription || '',
          photoUrl: vehicleUrl || null,
        },
        
        // Documents
        documents: {
          driverLicense: licenseUrl,
          idDocument: idUrl,
        },
        
        // Location and delivery settings
        location: {
          city,
          province,
          country: 'South Africa',
        },
        deliveryRadius, // in km
        
        // Availability and stats
        isAvailable: false, // Must be approved first
        isOnline: false,
        totalDeliveries: 0,
        rating: 0,
        earnings: {
          total: 0,
          pending: 0,
          paid: 0,
        },
      });

      // Create user profile in users collection
      await setDoc(doc(db, 'users', userId), {
        displayName,
        email,
        phoneNumber: `${dialCode}${phoneNumber}`,
        role: 'Driver',
        isDriver: true,
        driverType: 'public',
        status: 'PendingApproval',
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Application Submitted! 🎉',
        description: 'Your driver application has been submitted for review. You\'ll receive an email once approved.',
      });

      // Redirect to success page or login
      setTimeout(() => {
        router.push('/driver-application-pending');
      }, 2000);

    } catch (error: any) {
      console.error('Driver signup error:', error);
      toast({
        title: 'Signup Failed',
        description: error.message || 'Failed to create driver account. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/images/tree.png"
              alt="The Wellness Tree"
              width={80}
              height={80}
              className="mx-auto"
            />
          </Link>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Truck className="h-10 w-10 text-[#006B3E]" />
            Become a Driver
          </h1>
          <p className="text-lg text-gray-600">
            Join our delivery network and start earning today!
          </p>
        </div>

        <Card className="shadow-xl border-2 border-[#006B3E]/20">
          <CardHeader className="bg-gradient-to-r from-[#006B3E] to-[#3D2E17] text-white rounded-t-lg">
            <CardTitle className="text-2xl">Driver Application Form</CardTitle>
            <CardDescription className="text-white/90">
              Fill in your details and upload required documents
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Personal Information</h3>
                
                <div>
                  <Label htmlFor="displayName">Full Name *</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <div className="flex gap-2">
                    <Select value={dialCode} onValueChange={setDialCode}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+27">🇿🇦 +27</SelectItem>
                        <SelectItem value="+1">🇺🇸 +1</SelectItem>
                        <SelectItem value="+44">🇬🇧 +44</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="823456789"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Vehicle Information</h3>
                
                <div>
                  <Label htmlFor="vehicleType">Vehicle Type *</Label>
                  <Select value={vehicleType} onValueChange={(value) => setVehicleType(value as VehicleType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vehicleRegistration">Registration Number</Label>
                    <Input
                      id="vehicleRegistration"
                      value={vehicleRegistration}
                      onChange={(e) => setVehicleRegistration(e.target.value.toUpperCase())}
                      placeholder="CA 123-456"
                    />
                  </div>

                  <div>
                    <Label htmlFor="vehicleColor">Vehicle Color</Label>
                    <Input
                      id="vehicleColor"
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      placeholder="White"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="vehicleDescription">Vehicle Description (Optional)</Label>
                  <Textarea
                    id="vehicleDescription"
                    value={vehicleDescription}
                    onChange={(e) => setVehicleDescription(e.target.value)}
                    placeholder="e.g., 2020 Toyota Corolla, 4-door sedan"
                    rows={2}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Service Area</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Johannesburg"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="province">Province *</Label>
                    <Select value={province} onValueChange={setProvince}>
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
                  </div>
                </div>

                <div>
                  <Label htmlFor="deliveryRadius">Delivery Radius (km)</Label>
                  <Input
                    id="deliveryRadius"
                    type="number"
                    value={deliveryRadius}
                    onChange={(e) => setDeliveryRadius(Number(e.target.value))}
                    min={1}
                    max={100}
                  />
                  <p className="text-sm text-gray-500 mt-1">Maximum distance you're willing to deliver (1-100 km)</p>
                </div>
              </div>

              {/* Document Uploads */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Required Documents</h3>
                
                {/* Driver's License */}
                <div>
                  <Label>Driver's License *</Label>
                  <div className="mt-2">
                    {licensePreview ? (
                      <div className="relative">
                        <img src={licensePreview} alt="License preview" className="w-full h-48 object-cover rounded-lg border-2" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveFile('license')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => licenseInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#006B3E] transition-colors"
                      >
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload driver's license</p>
                        <p className="text-xs text-gray-400 mt-1">Max 5MB, image files only</p>
                      </div>
                    )}
                    <input
                      ref={licenseInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'license')}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* ID Document */}
                <div>
                  <Label>ID Document *</Label>
                  <div className="mt-2">
                    {idPreview ? (
                      <div className="relative">
                        <img src={idPreview} alt="ID preview" className="w-full h-48 object-cover rounded-lg border-2" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveFile('id')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => idInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#006B3E] transition-colors"
                      >
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload ID document</p>
                        <p className="text-xs text-gray-400 mt-1">Max 5MB, image files only</p>
                      </div>
                    )}
                    <input
                      ref={idInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'id')}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Vehicle Photo (Optional) */}
                <div>
                  <Label>Vehicle Photo (Optional)</Label>
                  <div className="mt-2">
                    {vehiclePreview ? (
                      <div className="relative">
                        <img src={vehiclePreview} alt="Vehicle preview" className="w-full h-48 object-cover rounded-lg border-2" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveFile('vehicle')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => vehicleInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#006B3E] transition-colors"
                      >
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload vehicle photo</p>
                        <p className="text-xs text-gray-400 mt-1">Max 5MB, image files only</p>
                      </div>
                    )}
                    <input
                      ref={vehicleInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'vehicle')}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#006B3E] hover:bg-[#3D2E17] text-white text-lg py-6 font-bold shadow-lg hover:scale-105 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Submit Driver Application
                    </>
                  )}
                </Button>
                <p className="text-sm text-gray-500 text-center mt-4">
                  Already have an account? <Link href="/auth/login" className="text-[#006B3E] font-semibold hover:underline">Login here</Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
