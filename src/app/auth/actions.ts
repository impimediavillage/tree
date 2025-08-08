
'use server';

import { auth } from '@/lib/firebase-admin'; // Use server-side admin SDK
import { db } from '@/lib/firebase-admin';
import type { User, Dispensary } from '@/types';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';

const toISODateString = (date: any): string | null => {
  if (!date) return null;
  if (date.toDate) { // Handle Firestore Timestamps
    return date.toDate().toISOString();
  }
  if (date instanceof Date) {
    return date.toISOString();
  }
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }
  return null;
};

export async function fetchUserProfile(): Promise<(User & { dispensary?: Dispensary | null }) | null> {
  noStore(); // Mark this action as dynamic
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('__session')?.value;

  if (!sessionCookie) {
    console.log("No session cookie found.");
    return null;
  }

  try {
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    const uid = decodedToken.uid;
    
    const userDocRef = db.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      console.error(`User document not found for UID: ${uid}`);
      return null;
    }

    const userData = userDocSnap.data() as User;
    let dispensaryData: Dispensary | null = null;
    let dispensaryStatus: Dispensary['status'] | null = null;

    if (userData.role === 'DispensaryOwner' && userData.dispensaryId) {
      try {
        const dispensaryDocRef = db.collection('dispensaries').doc(userData.dispensaryId);
        const dispensaryDocSnap = await dispensaryDocRef.get();
        if (dispensaryDocSnap.exists) {
          dispensaryData = { id: dispensaryDocSnap.id, ...dispensaryDocSnap.data() } as Dispensary;
          dispensaryStatus = dispensaryData.status || null;
        }
      } catch (dispensaryError) {
        console.error(`Error fetching dispensary ${userData.dispensaryId} for user ${uid}`, dispensaryError);
        // Do not crash, proceed without dispensary data
      }
    }

    const userProfile: User & { dispensary?: Dispensary | null } = {
      ...userData,
      uid: uid,
      createdAt: toISODateString(userData.createdAt),
      lastLoginAt: toISODateString(userData.lastLoginAt),
      dispensaryStatus: dispensaryStatus,
      dispensary: dispensaryData, // Embed dispensary data directly
    };

    return userProfile;

  } catch (error) {
    console.error('Error in fetchUserProfile Server Action:', error);
    // If the cookie is invalid or expired, this will fail.
    // The client-side onAuthStateChanged should handle this by signing the user out.
    return null;
  }
}
