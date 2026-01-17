/**
 * Script to add Apothecary dispensary type to Firestore
 * Run this from the browser console on the super admin dashboard
 * or integrate as a button action
 */

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function addApothecaryType() {
  try {
    const apothecaryData = {
      name: 'Apothecary',
      description: 'Traditional herbal pharmacy offering natural remedies, tinctures, salves, and holistic health products',
      iconPath: 'https://firebasestorage.googleapis.com/v0/b/dispensary-tree.firebasestorage.app/o/dispensary-type-assets%2Ficons%2Fapothecary-icon.png?alt=media',
      image: 'https://firebasestorage.googleapis.com/v0/b/dispensary-tree.firebasestorage.app/o/dispensary-type-assets%2Fimages%2Fapothecary-image.png?alt=media',
      isActive: true,
      useGenericWorkflow: true, // IMPORTANT: Enables generic product workflow
      advisorFocusPrompt: 'You are a knowledgeable apothecary advisor specializing in herbal remedies, natural medicine, and holistic wellness. Guide users on selecting traditional remedies, understanding herb properties, and safe usage.',
      recommendedAdvisorIds: [], // Add AI advisor IDs here if available
      storeCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'dispensaryTypes'), apothecaryData);
    
    console.log('✅ Apothecary type added successfully with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('❌ Error adding Apothecary type:', error);
    return { success: false, error };
  }
}

// For direct execution in browser console:
// Copy this entire function and run it
export const runDirectly = `
(async function() {
  const { db } = await import('/src/lib/firebase');
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  
  const apothecaryData = {
    name: 'Apothecary',
    description: 'Traditional herbal pharmacy offering natural remedies, tinctures, salves, and holistic health products',
    iconPath: 'https://firebasestorage.googleapis.com/v0/b/dispensary-tree.firebasestorage.app/o/dispensary-type-assets%2Ficons%2Fapothecary-icon.png?alt=media',
    image: 'https://firebasestorage.googleapis.com/v0/b/dispensary-tree.firebasestorage.app/o/dispensary-type-assets%2Fimages%2Fapothecary-image.png?alt=media',
    isActive: true,
    useGenericWorkflow: true,
    advisorFocusPrompt: 'You are a knowledgeable apothecary advisor specializing in herbal remedies, natural medicine, and holistic wellness. Guide users on selecting traditional remedies, understanding herb properties, and safe usage.',
    recommendedAdvisorIds: [],
    storeCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, 'dispensaryTypes'), apothecaryData);
    console.log('✅ Apothecary type added with ID:', docRef.id);
    alert('Success! Apothecary type added. Check console for ID.');
    return docRef.id;
  } catch (error) {
    console.error('❌ Error:', error);
    alert('Error adding type. Check console for details.');
    throw error;
  }
})();
`;
