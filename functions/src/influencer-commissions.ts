// Cloud Functions for calculating and processing influencer commissions
// Handles commission tracking, payouts, and tier upgrades

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const db = admin.firestore();

export const processInfluencerCommission = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;

    try {
      // Check if order has referral code
      if (!order.referralCode) {
        console.log(`Order ${orderId} has no referral code`);
        return null;
      }

      // Find influencer by referral code
      const influencersRef = db.collection('influencerProfiles');
      const influencerQuery = await influencersRef
        .where('referralCode', '==', order.referralCode.toUpperCase())
        .where('status', '==', 'active')
        .get();

      if (influencerQuery.empty) {
        console.log(`No active influencer found with code: ${order.referralCode}`);
        return null;
      }

      const influencerDoc = influencerQuery.docs[0];
      const influencerId = influencerDoc.id;
      const influencer = influencerDoc.data();

      // Calculate commission
      const orderTotal = order.total || 0;
      const baseCommissionRate = influencer.commissionRate || 5;

      // Get bonus multipliers
      const bonusMultipliers = {
        videoContent: influencer.bonusMultipliers?.videoContent || 0,
        tribeEngagement: influencer.bonusMultipliers?.tribeEngagement || 0,
        seasonal: 0
      };

      // Check for active seasonal campaigns
      const campaignsRef = db.collection('seasonalCampaigns');
      const now = new Date();
      const activeCampaigns = await campaignsRef
        .where('startDate', '<=', now)
        .where('endDate', '>=', now)
        .get();

      if (!activeCampaigns.empty) {
        const campaign = activeCampaigns.docs[0].data();
        bonusMultipliers.seasonal = campaign.bonusCommission || 0;
      }

      // Calculate total commission
      let commissionAmount = orderTotal * (baseCommissionRate / 100);
      
      const totalBonus = bonusMultipliers.videoContent + 
                        bonusMultipliers.tribeEngagement + 
                        bonusMultipliers.seasonal;
      
      if (totalBonus > 0) {
        commissionAmount += orderTotal * (totalBonus / 100);
      }

      commissionAmount = Math.round(commissionAmount * 100) / 100;

      // Create transaction record
      const transaction = {
        influencerId,
        type: 'product-sale',
        orderId,
        amount: commissionAmount,
        commissionRate: baseCommissionRate,
        bonusMultiplier: totalBonus,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('influencerTransactions').add(transaction);

      // Update influencer stats
      const updateData: any = {
        'stats.totalSales': admin.firestore.FieldValue.increment(1),
        'stats.monthSales': admin.firestore.FieldValue.increment(1),
        'stats.totalEarnings': admin.firestore.FieldValue.increment(commissionAmount),
        'stats.totalConversions': admin.firestore.FieldValue.increment(1),
        'stats.xp': admin.firestore.FieldValue.increment(100), // 100 XP per sale
        'payoutInfo.pendingBalance': admin.firestore.FieldValue.increment(commissionAmount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Check for level up (every 1000 XP)
      const currentXP = influencer.stats?.xp || 0;
      const newXP = currentXP + 100;
      const currentLevel = influencer.stats?.level || 1;
      const newLevel = Math.floor(newXP / 1000) + 1;

      if (newLevel > currentLevel) {
        updateData['stats.level'] = newLevel;
        
        // Award level up badge
        const badgeId = await awardBadge(influencerId, 'level-up', newLevel);
        console.log(`Influencer ${influencerId} leveled up to ${newLevel}, badge: ${badgeId}`);
      }

      await db.collection('influencerProfiles').doc(influencerId).update(updateData);

      // Update referral click record
      const clicksRef = db.collection('referralClicks');
      const clickQuery = await clicksRef
        .where('influencerId', '==', influencerId)
        .where('orderId', '==', null)
        .where('converted', '==', false)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (!clickQuery.empty) {
        await clickQuery.docs[0].ref.update({
          converted: true,
          conversionAt: admin.firestore.FieldValue.serverTimestamp(),
          orderId
        });
      }

      // Check tier progression
      await checkTierProgression(influencerId, influencer);

      console.log(`Commission processed: ${commissionAmount} ZAR for influencer ${influencerId} on order ${orderId}`);

      return {
        success: true,
        influencerId,
        commission: commissionAmount
      };

    } catch (error) {
      console.error('Error processing influencer commission:', error);
      return null;
    }
  });

// Helper function to check and update tier
async function checkTierProgression(influencerId: string, influencer: any) {
  const monthSales = influencer.stats?.monthSales || 0;
  let newTier = influencer.tier;

  if (monthSales >= 251) newTier = 'forest';
  else if (monthSales >= 101) newTier = 'bloom';
  else if (monthSales >= 51) newTier = 'growth';
  else if (monthSales >= 11) newTier = 'sprout';
  else newTier = 'seed';

  if (newTier !== influencer.tier) {
    const commissionRates: any = {
      seed: 5,
      sprout: 8,
      growth: 12,
      bloom: 15,
      forest: 20
    };

    await db.collection('influencerProfiles').doc(influencerId).update({
      tier: newTier,
      commissionRate: commissionRates[newTier],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Award tier badge
    await awardBadge(influencerId, 'tier-achievement', newTier);

    console.log(`Influencer ${influencerId} promoted to ${newTier} tier`);
  }
}

// Helper function to award badges
async function awardBadge(influencerId: string, badgeType: string, value: any): Promise<string> {
  const badge = {
    influencerId,
    badgeType,
    value,
    awardedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const badgeRef = await db.collection('influencerBadges').add(badge);

  // Update influencer badges array
  await db.collection('influencerProfiles').doc(influencerId).update({
    'stats.badges': admin.firestore.FieldValue.arrayUnion(badgeRef.id)
  });

  return badgeRef.id;
}

// Scheduled function to reset monthly sales (runs on 1st of each month)
export const resetMonthlySales = functions.pubsub
  .schedule('0 0 1 * *')
  .timeZone('Africa/Johannesburg')
  .onRun(async (context) => {
    try {
      const influencersSnapshot = await db.collection('influencerProfiles').get();
      
      const batch = db.batch();
      influencersSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          'stats.monthSales': 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      console.log(`Reset monthly sales for ${influencersSnapshot.size} influencers`);

      return { success: true, count: influencersSnapshot.size };
    } catch (error) {
      console.error('Error resetting monthly sales:', error);
      throw error;
    }
  });

// Process payouts (runs weekly on Fridays)
export const processPayouts = functions.pubsub
  .schedule('0 0 * * 5')
  .timeZone('Africa/Johannesburg')
  .onRun(async (context) => {
    try {
      const settingsDoc = await db.collection('settings').doc('influencer').get();
      const settings = settingsDoc.data();
      const minimumPayout = settings?.minimumPayout || 500;

      const influencersSnapshot = await db.collection('influencerProfiles')
        .where('payoutInfo.pendingBalance', '>=', minimumPayout)
        .get();

      const payouts: any[] = [];

      for (const doc of influencersSnapshot.docs) {
        const influencer = doc.data();
        const pendingBalance = influencer.payoutInfo?.pendingBalance || 0;

        if (pendingBalance >= minimumPayout) {
          // Get all pending transactions
          const transactionsSnapshot = await db.collection('influencerTransactions')
            .where('influencerId', '==', doc.id)
            .where('status', '==', 'pending')
            .get();

          const transactionIds = transactionsSnapshot.docs.map(t => t.id);

          // Create payout record
          const payout = {
            influencerId: doc.id,
            amount: pendingBalance,
            method: influencer.payoutInfo?.method || 'bank-transfer',
            status: 'processing',
            transactionIds,
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
            processedAt: null,
            paymentReference: null
          };

          const payoutRef = await db.collection('influencerPayouts').add(payout);
          payouts.push({ id: payoutRef.id, ...payout });

          // Update transactions to confirmed status
          const batch = db.batch();
          transactionsSnapshot.docs.forEach(transDoc => {
            batch.update(transDoc.ref, { status: 'confirmed' });
          });
          await batch.commit();

          // Move balance from pending to available
          await db.collection('influencerProfiles').doc(doc.id).update({
            'payoutInfo.pendingBalance': 0,
            'payoutInfo.availableBalance': admin.firestore.FieldValue.increment(pendingBalance)
          });
        }
      }

      console.log(`Processed ${payouts.length} payouts`);
      return { success: true, payouts };

    } catch (error) {
      console.error('Error processing payouts:', error);
      throw error;
    }
  });

// Callable function to get influencer statistics
export const getInfluencerStats = onCall(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    // Find influencer profile
    const influencerQuery = await db.collection('influencers')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (influencerQuery.empty) {
      throw new HttpsError('not-found', 'Influencer profile not found');
    }

    const influencerDoc = influencerQuery.docs[0];
    const influencerId = influencerDoc.id;
    const influencer = influencerDoc.data();

    // Get recent commissions
    const commissionsSnapshot = await db.collection('influencerCommissions')
      .where('influencerId', '==', influencerId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const commissions = commissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get this month's stats
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyCommissionsSnapshot = await db.collection('influencerCommissions')
      .where('influencerId', '==', influencerId)
      .where('createdAt', '>=', firstDayOfMonth)
      .get();

    const monthlyEarnings = monthlyCommissionsSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().totalEarnings || 0);
    }, 0);

    return {
      profile: { id: influencerDoc.id, ...influencer },
      commissions,
      monthlyEarnings,
      monthlySales: monthlyCommissionsSnapshot.size
    };
  } catch (error: any) {
    console.error('Error getting influencer stats:', error);
    throw new HttpsError('internal', error.message);
  }
});

// Callable function to calculate commission for completed order
export const calculateCommissionOnOrderDelivered = onCall(async (request) => {
  const { orderId } = request.data;

  if (!orderId) {
    throw new HttpsError('invalid-argument', 'Order ID is required');
  }

  try {
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new HttpsError('not-found', 'Order not found');
    }

    const order = orderDoc.data();
    
    // Check if order has referral code
    if (!order?.referralCode) {
      return { success: false, message: 'No referral code on order' };
    }

    // Check if commission already exists
    const existingCommission = await db.collection('influencerCommissions')
      .where('orderId', '==', orderId)
      .limit(1)
      .get();

    if (!existingCommission.empty) {
      return { success: false, message: 'Commission already calculated' };
    }

    // Find influencer
    const influencerQuery = await db.collection('influencers')
      .where('referralCode', '==', order.referralCode.toUpperCase())
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (influencerQuery.empty) {
      return { success: false, message: 'Influencer not found or inactive' };
    }

    const influencerDoc = influencerQuery.docs[0];
    const influencerId = influencerDoc.id;
    const influencer = influencerDoc.data();

    // Calculate commission
    const orderSubtotal = order.subtotal || 0;
    const baseCommissionRate = influencer.commissionRate || 5;
    
    // Calculate bonus amount
    let bonusAmount = 0;
    if (influencer.bonusMultipliers) {
      const videoBonus = influencer.bonusMultipliers.videoContent ? 2 : 0;
      const tribeBonus = influencer.bonusMultipliers.tribeEngagement ? 3 : 0;
      const seasonalBonus = influencer.bonusMultipliers.seasonalBonus || 0;
      const totalBonusRate = videoBonus + tribeBonus + seasonalBonus;
      bonusAmount = orderSubtotal * (totalBonusRate / 100);
    }

    const commissionAmount = orderSubtotal * (baseCommissionRate / 100);
    const totalEarnings = commissionAmount + bonusAmount;

    // Create commission record
    const commission = {
      influencerId,
      orderId,
      orderNumber: order.orderNumber || orderId,
      customerId: order.userId,
      customerName: order.customerName || 'Customer',
      orderTotal: order.total || 0,
      orderSubtotal,
      dispensaryId: order.dispensaryId || 'multiple',
      dispensaryName: order.dispensaryName || 'Multiple Dispensaries',
      commissionRate: baseCommissionRate,
      commissionAmount,
      bonusAmount,
      totalEarnings,
      status: 'pending',
      orderDate: order.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('influencerCommissions').add(commission);

    // Update influencer stats
    await db.collection('influencers').doc(influencerId).update({
      'stats.totalConversions': admin.firestore.FieldValue.increment(1),
      'stats.totalSales': admin.firestore.FieldValue.increment(1),
      'stats.currentMonthSales': admin.firestore.FieldValue.increment(1),
      'stats.currentMonthEarnings': admin.firestore.FieldValue.increment(totalEarnings),
      'stats.totalEarnings': admin.firestore.FieldValue.increment(totalEarnings),
      'stats.pendingEarnings': admin.firestore.FieldValue.increment(totalEarnings),
      'stats.xp': admin.firestore.FieldValue.increment(100),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update referral click as converted
    const clicksSnapshot = await db.collection('referralClicks')
      .where('influencerId', '==', influencerId)
      .where('converted', '==', false)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (!clicksSnapshot.empty) {
      await clicksSnapshot.docs[0].ref.update({
        converted: true,
        conversionOrderId: orderId
      });
    }

    return {
      success: true,
      commission,
      message: `Commission of R${totalEarnings.toFixed(2)} calculated successfully`
    };
  } catch (error: any) {
    console.error('Error calculating commission:', error);
    throw new HttpsError('internal', error.message);
  }
});
