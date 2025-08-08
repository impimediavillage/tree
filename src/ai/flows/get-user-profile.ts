
'use server';
/**
 * @fileOverview A Genkit flow to securely fetch a user's full profile data.
 *
 * - getUserProfile - A function that fetches user data based on their UID.
 * - GetUserProfileInput - The input type (void, as UID is from auth context).
 * - GetUserProfileOutput - The return type, matching the AppUser type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { onFlow } from 'genkit/flow';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already done
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Define input and output schemas matching the AppUser type for consistency
const UserProfileOutputSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  role: z.enum(['User', 'LeafUser', 'DispensaryOwner', 'Super Admin', 'DispensaryStaff']),
  dispensaryId: z.string().nullable(),
  dispensaryStatus: z.enum(['Pending Approval', 'Approved', 'Rejected', 'Suspended']).nullable(),
  credits: z.number().int(),
  createdAt: z.string().nullable(),
  lastLoginAt: z.string().nullable(),
  preferredDispensaryTypes: z.array(z.string()),
  welcomeCreditsAwarded: z.boolean(),
  signupSource: z.string().optional().nullable(),
});
export type GetUserProfileOutput = z.infer<typeof UserProfileOutputSchema>;

// Helper to convert Firestore Timestamps to ISO strings
const toISO = (date: any): string | null => {
  if (!date) return null;
  if (date instanceof admin.firestore.Timestamp) return date.toDate().toISOString();
  if (date instanceof Date) return date.toISOString();
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }
  return null;
};

// Define the flow
export const getUserProfileFlow = onFlow(
  {
    name: 'getUserProfileFlow',
    inputSchema: z.void(),
    outputSchema: UserProfileOutputSchema,
    auth: {
        // This ensures the flow can only be called by an authenticated user.
        // The user's auth context is passed in the `auth` parameter.
        required: true, 
    },
  },
  async (_, { auth }) => {
    if (!auth) {
      throw new Error('Authentication required.');
    }
    const uid = auth.uid;

    try {
      const userDocRef = db.collection('users').doc(uid);
      const userDocSnap = await userDocRef.get();

      if (!userDocSnap.exists) {
        throw new Error('User profile not found in database.');
      }

      const userData = userDocSnap.data()!;

      let dispensaryStatus: string | null = null;
      if (userData.role === 'DispensaryOwner' && userData.dispensaryId) {
        try {
          const dispensaryDocRef = db.collection('dispensaries').doc(userData.dispensaryId);
          const dispensaryDocSnap = await dispensaryDocRef.get();
          if (dispensaryDocSnap.exists()) {
            dispensaryStatus = dispensaryDocSnap.data()?.status || null;
          }
        } catch (dispensaryError) {
          console.error(`(Non-fatal) Error fetching dispensary for user ${uid}:`, dispensaryError);
        }
      }

      // Construct a validated output object
      const userProfile: GetUserProfileOutput = {
        uid: uid,
        email: userData.email || '',
        displayName: userData.displayName || null,
        photoURL: userData.photoURL || null,
        role: userData.role || 'LeafUser',
        dispensaryId: userData.dispensaryId || null,
        credits: userData.credits || 0,
        status: userData.status || 'Active',
        createdAt: toISO(userData.createdAt),
        lastLoginAt: toISO(userData.lastLoginAt),
        dispensaryStatus: dispensaryStatus as GetUserProfileOutput['dispensaryStatus'],
        preferredDispensaryTypes: userData.preferredDispensaryTypes || [],
        welcomeCreditsAwarded: userData.welcomeCreditsAwarded || false,
        signupSource: userData.signupSource || 'public',
      };
      
      return userProfile;

    } catch (error: any) {
      console.error(`Error fetching user profile for ${uid}:`, error);
      throw new Error(`An error occurred while fetching your profile: ${error.message}`);
    }
  }
);
