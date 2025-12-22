import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';

// This route follows the same pattern as your existing admin pages
// Auth is handled by Firestore security rules and client-side context

export async function POST(req: NextRequest) {
  try {
    const { timeRange } = await req.json();

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Fetch all influencers
    const influencersRef = collection(db, 'influencers');
    const influencersSnapshot = await getDocs(influencersRef);
    const influencers = influencersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch commissions within time range
    const commissionsRef = collection(db, 'influencerCommissions');
    let commissionsQuery = query(commissionsRef, orderBy('createdAt', 'desc'));

    if (timeRange !== 'all') {
      commissionsQuery = query(
        commissionsRef,
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc')
      );
    }

    const commissionsSnapshot = await getDocs(commissionsQuery);
    const commissions = commissionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch payouts
    const payoutsRef = collection(db, 'influencerPayouts');
    const payoutsQuery = query(payoutsRef, orderBy('createdAt', 'desc'));
    const payoutsSnapshot = await getDocs(payoutsQuery);
    
    const payouts = payoutsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate clicks
    const clicksRef = collection(db, 'referralClicks');
    const clicksQuery = query(
      clicksRef,
      where('timestamp', '>=', Timestamp.fromDate(startDate))
    );
    const clicksSnapshot = await getDocs(clicksQuery);
    const totalClicks = clicksSnapshot.size;

    // Calculate summary metrics
    const totalRevenue = commissions.reduce((sum: number, c: any) => sum + (c.orderTotal || 0), 0);
    const totalCommissions = commissions.reduce((sum: number, c: any) => sum + (c.commissionAmount || 0), 0);
    const totalOrders = commissions.length;
    const activeInfluencers = influencers.filter((i: any) => i.status === 'approved').length;
    const totalInfluencers = influencers.length;

    const avgConversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

    // Payout summary
    const pendingPayouts = payouts
      .filter((p: any) => p.status === 'pending')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    const completedPayouts = payouts
      .filter((p: any) => p.status === 'completed')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // Next payout amount (pending commissions)
    const nextPayoutAmount = influencers.reduce((sum: number, i: any) => sum + (i.pendingEarnings || 0), 0);

    // Revenue over time (last 30 days)
    const revenueByDate = new Map<string, { revenue: number; commissions: number }>();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      revenueByDate.set(dateStr, { revenue: 0, commissions: 0 });
    }

    commissions.forEach((c: any) => {
      if (!c.createdAt) return;
      const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt.seconds * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      if (revenueByDate.has(dateStr)) {
        const current = revenueByDate.get(dateStr)!;
        revenueByDate.set(dateStr, {
          revenue: current.revenue + (c.orderTotal || 0),
          commissions: current.commissions + (c.commissionAmount || 0)
        });
      }
    });

    const revenueOverTime = Array.from(revenueByDate.entries())
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: parseFloat(data.revenue.toFixed(2)),
        commissions: parseFloat(data.commissions.toFixed(2))
      }));

    // Influencer growth over time
    const influencersByDate = new Map<string, number>();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = influencers.filter((inf: any) => {
        if (!inf.createdAt) return false;
        const createdDate = inf.createdAt.toDate ? inf.createdAt.toDate() : new Date(inf.createdAt.seconds * 1000);
        return createdDate <= new Date(dateStr + 'T23:59:59');
      }).length;
      
      influencersByDate.set(dateStr, count);
    }

    const influencerGrowth = Array.from(influencersByDate.entries())
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count
      }));

    // Status distribution
    const statusCounts = influencers.reduce((acc: any, inf: any) => {
      acc[inf.status] = (acc[inf.status] || 0) + 1;
      return acc;
    }, {});

    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));

    // Tier distribution
    const tierData = new Map<string, { count: number; revenue: number }>();
    
    influencers.forEach((inf: any) => {
      const tier = inf.tier || 'seedling';
      if (!tierData.has(tier)) {
        tierData.set(tier, { count: 0, revenue: 0 });
      }
      
      const current = tierData.get(tier)!;
      const influencerRevenue = commissions
        .filter((c: any) => c.influencerId === inf.id)
        .reduce((sum: number, c: any) => sum + (c.orderTotal || 0), 0);
      
      tierData.set(tier, {
        count: current.count + 1,
        revenue: current.revenue + influencerRevenue
      });
    });

    const tierDistribution = Array.from(tierData.entries())
      .map(([tier, data]) => ({
        tier: tier.charAt(0).toUpperCase() + tier.slice(1),
        count: data.count,
        revenue: parseFloat(data.revenue.toFixed(2))
      }))
      .sort((a, b) => {
        const tierOrder = ['Seedling', 'Sprout', 'Sapling', 'Tree', 'Forest'];
        return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
      });

    // Top performers
    const influencerStats = influencers.map((inf: any) => {
      const influencerCommissions = commissions.filter((c: any) => c.influencerId === inf.id);
      const earnings = influencerCommissions.reduce((sum: number, c: any) => sum + (c.commissionAmount || 0), 0);
      const sales = influencerCommissions.length;
      
      // Get click count
      const clickCount = clicksSnapshot.docs.filter((doc: any) => doc.data().influencerId === inf.id).length;
      const conversionRate = clickCount > 0 ? (sales / clickCount) * 100 : 0;
      
      return {
        id: inf.id,
        displayName: inf.displayName || inf.email || 'Unknown',
        tier: inf.tier || 'seedling',
        earnings,
        sales,
        conversionRate,
        commissionRate: inf.commissionRate || 5
      };
    });

    const topInfluencers = influencerStats
      .filter((s: any) => s.earnings > 0)
      .sort((a: any, b: any) => b.earnings - a.earnings)
      .slice(0, 10);

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalCommissions,
        totalOrders,
        activeInfluencers,
        totalInfluencers,
        avgConversionRate,
        pendingPayouts,
        completedPayouts,
        nextPayoutAmount
      },
      revenueOverTime,
      influencerGrowth,
      statusDistribution,
      tierDistribution,
      topInfluencers
    });
  } catch (error: any) {
    console.error('Error fetching admin influencer analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    );
  }
}
