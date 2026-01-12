'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Upload, AlertTriangle, X, Car, Phone, FileText, IdCard, Camera } from 'lucide-react';
import { dispensaryOwnerAddStaffSchema, type DispensaryOwnerAddStaffFormData } from '@/lib/schemas';
import type { User } from '@/types';
import type { CrewMemberType, VehicleType } from '@/types/driver';
import { auth as firebaseAuthInstance, db, storage } from '@/lib/firebase'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

      // Base user data
      const newStaffUserData: User = {
        uid: firebaseUser.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: null,
        role: 'DispensaryStaff', 
        dispensaryId: dispensaryId,
        credits: 0, 
        status: data.status, 
        createdAt: serverTimestamp() as any,
        lastLoginAt: null,
        welcomeCreditsAwarded: false,
        signupSource: 'dispensary_panel',
        crewMemberType: crewType,
        isDriver: crewType === 'Driver',
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
          dispensaryId: dispensaryId,
          crewMemberType: 'Driver',
          phoneNumber: driverPhone,
          dialCode: driverDialCode,
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

      // Send welcome email
      try {
        await fetch('/api/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: data.email,
            userName: data.displayName,
            userType: crewType === 'Driver' ? 'driver' : 'crew',
            dispensaryId: dispensaryId,
            temporaryPassword: data.password,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
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
