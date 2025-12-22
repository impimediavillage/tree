import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getCommissionRateForTier } from '@/lib/influencer-utils';

// This route follows the same pattern as your existing admin pages
// Auth is handled by Firestore security rules and client-side context

export async function POST(req: NextRequest) {
  try {
    const { influencerId, action, notes, newTier } = await req.json();

    if (!influencerId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const influencerRef = doc(db, 'influencers', influencerId);
    const influencerDoc = await getDoc(influencerRef);

    if (!influencerDoc.exists()) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: serverTimestamp()
    };

    switch (action) {
      case 'approve':
        updateData.status = 'approved';
        updateData.approvedAt = serverTimestamp();
        break;
      case 'reject':
        updateData.status = 'rejected';
        updateData.rejectedAt = serverTimestamp();
        if (notes) updateData.rejectionReason = notes;
        break;
      case 'suspend':
        updateData.status = 'suspended';
        updateData.suspendedAt = serverTimestamp();
        if (notes) updateData.suspensionReason = notes;
        break;
      case 'reactivate':
        updateData.status = 'approved';
        updateData.reactivatedAt = serverTimestamp();
        break;
      case 'updateTier':
        if (!newTier) {
          return NextResponse.json({ error: 'New tier required' }, { status: 400 });
        }
        updateData.tier = newTier;
        updateData.commissionRate = getCommissionRateForTier(newTier);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await updateDoc(influencerRef, updateData);

    return NextResponse.json({ 
      success: true, 
      message: `Influencer ${action}d successfully` 
    });
  } catch (error: any) {
    console.error('Error updating influencer:', error);
    return NextResponse.json(
      { error: 'Failed to update influencer', details: error.message },
      { status: 500 }
    );
  }
}
