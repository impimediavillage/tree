'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Upload, AlertTriangle, X, Car, Phone, FileText, IdCard, Camera, MapPin, Navigation } from 'lucide-react';
import { dispensaryOwnerAddStaffSchema, type DispensaryOwnerAddStaffFormData } from '@/lib/schemas';
import type { User } from '@/types';
import type { CrewMemberType, VehicleType } from '@/types/driver';
import { auth as firebaseAuthInstance, db, storage, functions } from '@/lib/firebase'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DispensaryCommissionSlider } from './DispensaryCommissionSlider';

interface DispensaryAddStaffDialogProps {
  onUserAdded: () => void;
  dispensaryId: string; 
}

// Country dial codes for driver phone numbers
const DIAL_CODES = [
  { code: '+27', country: 'South Africa' },
  { code: '+1', country: 'United States' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+61', country: 'Australia' },
  { code: '+91', country: 'India' },
  { code: '+86', country: 'China' },
  { code: '+81', country: 'Japan' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+55', country: 'Brazil' },
];

// Vehicle types
const VEHICLE_TYPES: VehicleType[] = [
  'Really fast dude',
  'bicycle',
  'e-bike',
  'motorcycle',
  'car',
  'bakkie',
  'truck',
  'drone',
  'throwing arm',
  'spaceship'
];

// Silly vehicle types that need validation
const SILLY_VEHICLES: VehicleType[] = ['Really fast dude', 'drone', 'throwing arm', 'spaceship'];

export function DispensaryAddStaffDialog({ onUserAdded, dispensaryId }: DispensaryAddStaffDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [crewType, setCrewType] = useState<CrewMemberType>('In-house Staff');
  const [showSillyWarning, setShowSillyWarning] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | ''>('');
  
  // File uploads for driver documents
  const [driverLicenseFile, setDriverLicenseFile] = useState<File | null>(null);
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null);
  
  // Preview URLs
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [vehiclePreview, setVehiclePreview] = useState<string | null>(null);
  
  // Driver-specific form fields (not in schema)
  const [driverPhone, setDriverPhone] = useState('');
  const [driverDialCode, setDriverDialCode] = useState('+27');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleDescription, setVehicleDescription] = useState('');
  
  // Location fields for drivers
  const [driverCity, setDriverCity] = useState('');
  const [driverProvince, setDriverProvince] = useState('');
  const [driverCountry, setDriverCountry] = useState('South Africa');
  
  // Delivery settings
  const [deliveryRadius, setDeliveryRadius] = useState(10); // Default 10km
  const [driverType, setDriverType] = useState<'private' | 'public' | null>('private'); // Default private
  
  // Vendor commission settings
  const [vendorCommissionRate, setVendorCommissionRate] = useState(10); // Default 10%
  
  // Get current dispensary name from context
  const [dispensaryName, setDispensaryName] = useState('Your Dispensary');
  
  const { toast } = useToast();
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const vehicleInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<DispensaryOwnerAddStaffFormData>({
    resolver: zodResolver(dispensaryOwnerAddStaffSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      status: 'PendingApproval', 
    },
  });

  // Handle file selection with preview
  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'license' | 'id' | 'vehicle'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    // Set file and create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'license') {
        setDriverLicenseFile(file);
        setLicensePreview(preview);
      } else if (type === 'id') {
        setIdDocumentFile(file);
        setIdPreview(preview);
      } else {
        setVehiclePhotoFile(file);
        setVehiclePreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove file
  const removeFile = (type: 'license' | 'id' | 'vehicle') => {
    if (type === 'license') {
      setDriverLicenseFile(null);
      setLicensePreview(null);
      if (licenseInputRef.current) licenseInputRef.current.value = '';
    } else if (type === 'id') {
      setIdDocumentFile(null);
      setIdPreview(null);
      if (idInputRef.current) idInputRef.current.value = '';
    } else {
      setVehiclePhotoFile(null);
      setVehiclePreview(null);
      if (vehicleInputRef.current) vehicleInputRef.current.value = '';
    }
  };

  // Fetch dispensary name when dialog opens
  useEffect(() => {
    const fetchDispensaryName = async () => {
      if (!isOpen) return;
      
      try {
        const dispensaryDoc = await getDoc(doc(db, 'dispensaries', dispensaryId));
        if (dispensaryDoc.exists()) {
          setDispensaryName(dispensaryDoc.data().dispensaryName || 'Your Dispensary');
        }
      } catch (error) {
        console.error('Failed to fetch dispensary name:', error);
      }
    };
    
    fetchDispensaryName();
  }, [isOpen, dispensaryId]);

  // Upload file to Firebase Storage
  const uploadFile = async (file: File, userId: string, fileType: string): Promise<string> => {
    const fileName = `drivers/${dispensaryId}/${userId}/${fileType}_${Date.now()}.${file.name.split('.').pop()}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  // Handle vehicle type change with silly vehicle validation
  const handleVehicleTypeChange = (value: VehicleType) => {
    setSelectedVehicleType(value);
    setShowSillyWarning(SILLY_VEHICLES.includes(value));
  };

  const onSubmit = async (data: DispensaryOwnerAddStaffFormData) => {
    // Validate driver-specific fields
    if (crewType === 'Driver') {
      if (!driverPhone || driverPhone.length < 9) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid phone number for the driver',
          variant: 'destructive'
        });
        return;
      }

      if (!selectedVehicleType) {
        toast({
          title: 'Validation Error',
          description: 'Please select a vehicle type',
          variant: 'destructive'
        });
        return;
      }

      if (SILLY_VEHICLES.includes(selectedVehicleType)) {
        toast({
          title: 'Nice try! 😄',
          description: 'Please choose a real vehicle type for deliveries',
          variant: 'destructive'
        });
        return;
      }

      if (!driverLicenseFile) {
        toast({
          title: 'Missing Document',
          description: 'Please upload the driver\'s license',
          variant: 'destructive'
        });
        return;
      }

      if (!idDocumentFile) {
        toast({
          title: 'Missing Document',
          description: 'Please upload the driver\'s ID document',
          variant: 'destructive'
        });
        return;
      }

      if (!vehiclePhotoFile) {
        toast({
          title: 'Missing Document',
          description: 'Please upload a photo of the vehicle',
          variant: 'destructive'
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuthInstance,
        data.email,
        data.password
      );
      const firebaseUser = userCredential.user;

      // Determine role based on driver type selection
      let userRole: 'DispensaryStaff' | 'Driver' = 'DispensaryStaff';
      let userDispensaryId: string | null = dispensaryId;
      
      if (crewType === 'Driver' && driverType === 'public') {
        // Public drivers get standalone 'Driver' role with no dispensary association
        userRole = 'Driver';
        userDispensaryId = null;
      } else if (crewType === 'Driver' && driverType === 'private') {
        // Private drivers are DispensaryStaff with crewMemberType: 'Driver'
        userRole = 'DispensaryStaff';
        userDispensaryId = dispensaryId;
      }

      // Base user data
      const newStaffUserData: User = {
        uid: firebaseUser.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: null,
        role: userRole, 
        dispensaryId: userDispensaryId,
        credits: 0, 
        status: data.status, 
        createdAt: serverTimestamp() as any,
        lastLoginAt: null,
        welcomeCreditsAwarded: false,
        signupSource: 'dispensary_panel',
        crewMemberType: crewType,
        isDriver: crewType === 'Driver',
        // Add commission rate for Vendors
        dispensaryCommissionRate: crewType === 'Vendor' ? vendorCommissionRate : undefined,
        // Add location fields for all crew members (especially drivers)
        phone: crewType === 'Driver' ? driverPhone : undefined,
        dialCode: crewType === 'Driver' ? driverDialCode : undefined,
        city: crewType === 'Driver' ? driverCity : undefined,
        province: crewType === 'Driver' ? driverProvince : undefined,
        country: crewType === 'Driver' ? driverCountry : undefined,
      };

      // If driver, upload documents and add driver-specific fields
      if (crewType === 'Driver' && driverLicenseFile && idDocumentFile && vehiclePhotoFile) {
        toast({ title: 'Uploading Documents...', description: 'Please wait while we upload driver documents' });

        const [licenseUrl, idUrl, vehicleUrl] = await Promise.all([
          uploadFile(driverLicenseFile, firebaseUser.uid, 'license'),
          uploadFile(idDocumentFile, firebaseUser.uid, 'id'),
          uploadFile(vehiclePhotoFile, firebaseUser.uid, 'vehicle')
        ]);

        newStaffUserData.driverProfile = {
          phoneNumber: driverPhone,
          dialCode: driverDialCode,
          vehicle: {
            type: selectedVehicleType as string,
            registrationNumber: vehicleRegistration,
            color: vehicleColor,
            description: vehicleDescription,
            imageUrl: vehicleUrl,
            verified: false
          },
          documents: {
            driverLicense: licenseUrl,
            idDocument: idUrl,
            vehiclePhoto: vehicleUrl
          },
          documentsVerified: false,
          driverStatus: 'offline'
        };

        // Create driver profile in separate collection for easy querying
        const driverProfileData = {
          userId: firebaseUser.uid,
          dispensaryId: driverType === 'private' ? dispensaryId : null, // Only set for private drivers
          ownershipType: driverType || 'private', // 'public' or 'private'
          isIndependent: driverType === 'public', // True for public drivers
          crewMemberType: 'Driver',
          displayName: data.displayName, // Driver's display name
          phoneNumber: driverPhone,
          dialCode: driverDialCode,
          // Location information
          city: driverCity,
          province: driverProvince,
          country: driverCountry,
          // Delivery settings
          deliveryRadius: deliveryRadius, // km from dispensary
          isPublicDriver: driverType === 'public', // Available to other dispensaries
          vehicle: {
            type: selectedVehicleType,
            registrationNumber: vehicleRegistration,
            color: vehicleColor,
            description: vehicleDescription,
            imageUrl: vehicleUrl,
            verified: false
          },
          documents: {
            driverLicense: {
              url: licenseUrl,
              uploadedAt: serverTimestamp(),
              verified: false
            },
            idDocument: {
              url: idUrl,
              uploadedAt: serverTimestamp(),
              verified: false
            },
            vehiclePhoto: {
              url: vehicleUrl,
              uploadedAt: serverTimestamp(),
              verified: false
            }
          },
          status: 'offline' as const,
          isActive: false,
          lastActiveAt: serverTimestamp(),
          stats: {
            totalDeliveries: 0,
            completedDeliveries: 0,
            cancelledDeliveries: 0,
            failedDeliveries: 0, // Track failed deliveries
            averageRating: 0,
            totalRatings: 0,
            totalEarnings: 0,
            onTimeDeliveryRate: 0,
            acceptanceRate: 0,
            currentStreak: 0,
            longestStreak: 0
          },
          achievements: [],
          availableEarnings: 0,
          pendingPayouts: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, 'driver_profiles', firebaseUser.uid), driverProfileData);
      }

      // Save user document
      await setDoc(doc(db, 'users', firebaseUser.uid), newStaffUserData);

      // Send welcome email via Cloud Function
      try {
        const sendCrewEmail = httpsCallable(functions, 'sendCrewMemberEmail');
        
        let vehicleInfo = '';
        if (crewType === 'Driver' && selectedVehicleType) {
          vehicleInfo = `${selectedVehicleType}${vehicleRegistration ? ` (${vehicleRegistration})` : ''}${vehicleColor ? ` - ${vehicleColor}` : ''}`;
        }
        
        await sendCrewEmail({
          dispensaryName: dispensaryName,
          memberName: data.displayName,
          memberEmail: data.email,
          memberRole: crewType,
          temporaryPassword: data.password,
          phoneNumber: crewType === 'Driver' ? `${driverDialCode}${driverPhone}` : undefined,
          vehicleInfo: vehicleInfo || undefined,
        });
        
        console.log('✅ Welcome email sent successfully');
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the entire operation if email fails
        toast({ 
          title: "Note", 
          description: "Crew member added but welcome email failed to send. They can still log in with their credentials.",
          variant: "default"
        });
      }

      const successMessage = crewType === 'Driver' 
        ? `${data.displayName} has been added as a driver. Documents uploaded successfully.`
        : `${data.displayName} has been added successfully.`;

      toast({ 
        title: crewType === 'Driver' ? "Driver Added! 🚗" : "Crew Member Added", 
        description: successMessage
      });

      onUserAdded();
      setIsOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error adding staff member:", error);
      let errorMessage = "Could not add crew member.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use by another account.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak. Please choose a stronger password.";
      }
      toast({ title: "Creation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    form.reset({
      displayName: '',
      email: '',
      password: '',
      status: 'PendingApproval'
    });
    setCrewType('In-house Staff');
    setSelectedVehicleType('');
    setShowSillyWarning(false);
    setDriverPhone('');
    setDriverDialCode('+27');
    setVehicleRegistration('');
    setVehicleColor('');
    setVehicleDescription('');
    setDriverLicenseFile(null);
    setIdDocumentFile(null);
    setVehiclePhotoFile(null);
    setLicensePreview(null);
    setIdPreview(null);
    setVehiclePreview(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { 
      setIsOpen(open); 
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" /> Add Crew Member</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scroll-smooth">
        <DialogHeader>
          <DialogTitle>Add New Crew Member</DialogTitle>
          <DialogDescription>
            Create an account for a new {crewType === 'Driver' ? 'driver' : 'crew member'} at your dispensary.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            
            {/* Crew Member Type Selector */}
            <div className="space-y-2">
              <FormLabel>Crew Member Type *</FormLabel>
              <Select value={crewType} onValueChange={(value: CrewMemberType) => setCrewType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                  <SelectItem value="In-house Staff">In-house Staff</SelectItem>
                  <SelectItem value="Driver">Driver</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {crewType === 'Driver' && '🚗 Drivers can claim and deliver in-house orders'}
                {crewType === 'Vendor' && '📦 Vendors supply products to your dispensary'}
                {crewType === 'In-house Staff' && '👥 Staff members who work at your dispensary'}
              </FormDescription>
            </div>

            {/* Basic Information */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold text-sm">Basic Information</h3>
              <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name *</FormLabel>
                  <FormControl><Input {...field} placeholder="Staff Member Name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl><Input type="email" {...field} placeholder="staff@example.com" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password *</FormLabel>
                  <FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="PendingApproval">Pending Approval</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Vendor Commission Settings */}
            {crewType === 'Vendor' && (
              <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 text-purple-600">💰</div>
                  <h3 className="font-semibold text-sm">Vendor Commission Settings</h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Set the commission percentage your dispensary keeps from this vendor's sales.
                  The vendor receives the remainder when they request a payout.
                </p>
                <DispensaryCommissionSlider
                  value={vendorCommissionRate}
                  onChange={setVendorCommissionRate}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Driver-Specific Fields */}
            {crewType === 'Driver' && (
              <>
                {/* Phone Number */}
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-sm">Driver Contact Information</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <FormLabel>Country Code *</FormLabel>
                      <Select value={driverDialCode} onValueChange={setDriverDialCode}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIAL_CODES.map((dc) => (
                            <SelectItem key={dc.code} value={dc.code}>
                              {dc.code} ({dc.country})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <FormLabel>Phone Number *</FormLabel>
                      <Input
                        type="tel"
                        placeholder="812345678"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, ''))}
                      />
                      <FormDescription className="text-xs mt-1">
                        Enter without country code
                      </FormDescription>
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div className="space-y-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-sm">Location Information</h3>
                  </div>
                  <FormDescription className="text-xs">
                    This helps determine which orders the driver can accept based on location.
                  </FormDescription>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <FormLabel>City *</FormLabel>
                      <Input
                        placeholder="e.g., Cape Town"
                        value={driverCity}
                        onChange={(e) => setDriverCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <FormLabel>Province/State *</FormLabel>
                      <Input
                        placeholder="e.g., Western Cape"
                        value={driverProvince}
                        onChange={(e) => setDriverProvince(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <FormLabel>Country *</FormLabel>
                    <Input
                      placeholder="e.g., South Africa"
                      value={driverCountry}
                      onChange={(e) => setDriverCountry(e.target.value)}
                    />
                  </div>
                </div>

                {/* Delivery Settings */}
                <div className="space-y-4 p-4 border rounded-lg bg-indigo-50 dark:bg-indigo-950/20">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-sm">Delivery Settings</h3>
                  </div>
                  
                  {/* Delivery Radius Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <FormLabel>Delivery Radius</FormLabel>
                      <span className="text-sm font-semibold text-primary">{deliveryRadius} km</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={deliveryRadius}
                      onChange={(e) => setDeliveryRadius(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <FormDescription className="text-xs">
                      Maximum distance from the dispensary the driver is willing to travel.
                    </FormDescription>
                  </div>

                  {/* Driver Type Selection - Two Exclusive Colorful Sections */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm mb-2">Driver Type *</h3>
                    
                    {/* Private Dispensary Driver Section */}
                    <div 
                      className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        driverType === 'private' 
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40' 
                          : 'border-gray-200 bg-gray-50 dark:bg-gray-900/20 hover:border-blue-300'
                      }`}
                      onClick={() => setDriverType('private')}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="text-2xl">🏠</div>
                            <div>
                              <h4 className="font-bold text-base text-blue-700 dark:text-blue-400">
                                Private Dispensary Driver
                              </h4>
                              <p className="text-xs text-blue-600 dark:text-blue-500 font-medium">
                                Exclusive to Your Dispensary
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                            <p className="flex items-start gap-2">
                              <span className="text-blue-500 font-bold">✓</span>
                              <span>Driver only visible to your dispensary</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="text-blue-500 font-bold">✓</span>
                              <span>You handle all driver disputes and payouts</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="text-blue-500 font-bold">✓</span>
                              <span>Full control over driver management</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="text-blue-500 font-bold">✓</span>
                              <span className="font-semibold">Saved as: DispensaryStaff role</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDriverType(driverType === 'private' ? null : 'private');
                            }}
                            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${
                              driverType === 'private' ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                driverType === 'private' ? 'translate-x-6' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {driverType === 'private' ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Public Marketplace Driver Section */}
                    <div 
                      className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        driverType === 'public' 
                          ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/40 dark:to-emerald-900/40' 
                          : 'border-gray-200 bg-gray-50 dark:bg-gray-900/20 hover:border-green-300'
                      }`}
                      onClick={() => setDriverType('public')}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="text-2xl">🌍</div>
                            <div>
                              <h4 className="font-bold text-base text-green-700 dark:text-green-400">
                                Public Marketplace Driver
                              </h4>
                              <p className="text-xs text-green-600 dark:text-green-500 font-medium">
                                Share on The Wellness Tree Platform
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                            <p className="flex items-start gap-2">
                              <span className="text-green-500 font-bold">✓</span>
                              <span>Driver available to ALL dispensaries on platform</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="text-green-500 font-bold">✓</span>
                              <span>Platform handles driver payouts automatically</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="text-green-500 font-bold">✓</span>
                              <span>Expand driver's earning potential</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="text-green-500 font-bold">✓</span>
                              <span className="font-semibold">Saved as: Driver role (independent)</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDriverType(driverType === 'public' ? null : 'public');
                            }}
                            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${
                              driverType === 'public' ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                driverType === 'public' ? 'translate-x-6' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {driverType === 'public' ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {driverType === null && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          Please select a driver type above (Private or Public)
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="space-y-4 p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-sm">Vehicle Information</h3>
                  </div>

                  <div>
                    <FormLabel>Vehicle Type *</FormLabel>
                    <Select value={selectedVehicleType} onValueChange={handleVehicleTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map((vt) => (
                          <SelectItem key={vt} value={vt}>
                            {vt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showSillyWarning && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          You might struggle with deliveries using a {selectedVehicleType}. Please choose a real vehicle! 😄
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FormLabel>Registration Number</FormLabel>
                      <Input
                        placeholder="ABC 123 GP"
                        value={vehicleRegistration}
                        onChange={(e) => setVehicleRegistration(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div>
                      <FormLabel>Color</FormLabel>
                      <Input
                        placeholder="White"
                        value={vehicleColor}
                        onChange={(e) => setVehicleColor(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <FormLabel>Vehicle Description (Optional)</FormLabel>
                    <Textarea
                      placeholder="e.g., White Toyota Corolla, 2020 model"
                      value={vehicleDescription}
                      onChange={(e) => setVehicleDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                {/* Document Uploads */}
                <div className="space-y-4 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-sm">Required Documents</h3>
                  </div>

                  {/* Driver License */}
                  <div className="space-y-2">
                    <FormLabel>Driver's License * {licensePreview && '✅'}</FormLabel>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => licenseInputRef.current?.click()}
                        className="flex-1"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {licensePreview ? 'Change License' : 'Upload License'}
                      </Button>
                      {licensePreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile('license')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <input
                      ref={licenseInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, 'license')}
                    />
                    {licensePreview && (
                      <img src={licensePreview} alt="License preview" className="w-full h-40 object-cover rounded-lg" />
                    )}
                  </div>

                  {/* ID Document */}
                  <div className="space-y-2">
                    <FormLabel>ID Document * {idPreview && '✅'}</FormLabel>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => idInputRef.current?.click()}
                        className="flex-1"
                      >
                        <IdCard className="mr-2 h-4 w-4" />
                        {idPreview ? 'Change ID' : 'Upload ID'}
                      </Button>
                      {idPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile('id')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <input
                      ref={idInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, 'id')}
                    />
                    {idPreview && (
                      <img src={idPreview} alt="ID preview" className="w-full h-40 object-cover rounded-lg" />
                    )}
                  </div>

                  {/* Vehicle Photo */}
                  <div className="space-y-2">
                    <FormLabel>Vehicle Photo * {vehiclePreview && '✅'}</FormLabel>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => vehicleInputRef.current?.click()}
                        className="flex-1"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        {vehiclePreview ? 'Change Photo' : 'Upload Vehicle Photo'}
                      </Button>
                      {vehiclePreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile('vehicle')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <input
                      ref={vehicleInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, 'vehicle')}
                    />
                    {vehiclePreview && (
                      <img src={vehiclePreview} alt="Vehicle preview" className="w-full h-40 object-cover rounded-lg" />
                    )}
                  </div>
                </div>
              </>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setIsOpen(false);
                resetForm();
              }} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {crewType === 'Driver' ? 'Add Driver 🚗' : 'Add Crew Member'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
