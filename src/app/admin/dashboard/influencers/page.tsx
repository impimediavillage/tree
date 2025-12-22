'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { 
  collection, getDocs, doc, updateDoc, query, orderBy, where, 
  deleteDoc, serverTimestamp, addDoc, getDoc, setDoc 
} from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  TreePine, Users, DollarSign, TrendingUp, Settings, 
  CheckCircle, XCircle, Pause, Play, Edit, Trash2,
  Award, Calendar, Gift, Search, Filter
} from 'lucide-react';
import type { InfluencerProfile, InfluencerSettings, SeasonalCampaign } from '@/types/influencer';
import { getCommissionRateForTier } from '@/lib/influencer-utils';
import { useRouter } from 'next/navigation';

export default function AdminInfluencersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [influencers, setInfluencers] = useState<(InfluencerProfile & { id: string })[]>([]);
  const [settings, setSettings] = useState<InfluencerSettings | null>(null);
  const [campaigns, setCampaigns] = useState<(SeasonalCampaign & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [editingSettings, setEditingSettings] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);

  // Check super admin
  useEffect(() => {
    if (user && user.email !== 'admin@wellnesstree.com') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load influencers
      const influencersRef = collection(db, 'influencerProfiles');
      const influencersSnapshot = await getDocs(query(influencersRef, orderBy('createdAt', 'desc')));
      setInfluencers(
        influencersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InfluencerProfile & { id: string }))
      );

      // Load settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'influencer'));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as InfluencerSettings);
      } else {
        // Create default settings
        const defaultSettings: InfluencerSettings = {
          isSystemEnabled: true,
          defaultCommissionRates: {
            seed: 5,
            sprout: 8,
            growth: 12,
            bloom: 15,
            forest: 20
          },
          minimumPayout: 500,
          payoutSchedule: 'monthly',
          approvalRequired: true,
          updatedAt: new Date(),
          updatedBy: 'system'
        };
        await setDoc(doc(db, 'settings', 'influencer'), defaultSettings);
        setSettings(defaultSettings);
      }

      // Load campaigns
      const campaignsRef = collection(db, 'seasonalCampaigns');
      const campaignsSnapshot = await getDocs(query(campaignsRef, orderBy('startDate', 'desc')));
      setCampaigns(
        campaignsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SeasonalCampaign & { id: string }))
      );
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateInfluencerStatus = async (influencerId: string, status: 'pending' | 'active' | 'suspended') => {
    try {
      await updateDoc(doc(db, 'influencerProfiles', influencerId), {
        status,
        updatedAt: serverTimestamp()
      });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteInfluencer = async (influencerId: string) => {
    if (!confirm('Are you sure you want to delete this influencer? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'influencerProfiles', influencerId));
      loadData();
    } catch (error) {
      console.error('Error deleting influencer:', error);
    }
  };

  const updateCommissionRate = async (influencerId: string, newRate: number) => {
    try {
      await updateDoc(doc(db, 'influencerProfiles', influencerId), {
        commissionRate: newRate,
        updatedAt: serverTimestamp()
      });
      loadData();
    } catch (error) {
      console.error('Error updating commission rate:', error);
    }
  };

  const toggleSystemEnabled = async () => {
    if (!settings) return;
    
    try {
      await updateDoc(doc(db, 'settings', 'influencer'), {
        isSystemEnabled: !settings.isSystemEnabled,
        updatedAt: serverTimestamp()
      });
      setSettings({ ...settings, isSystemEnabled: !settings.isSystemEnabled });
    } catch (error) {
      console.error('Error toggling system:', error);
    }
  };

  const filteredInfluencers = influencers.filter(inf => {
    const matchesSearch = inf.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inf.referralCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || inf.status === filterStatus;
    const matchesTier = filterTier === 'all' || inf.tier === filterTier;
    return matchesSearch && matchesStatus && matchesTier;
  });

  const getTierBadgeColor = (tier: string) => {
    const colors = {
      seed: 'bg-amber-100 text-amber-800',
      sprout: 'bg-green-100 text-green-800',
      growth: 'bg-emerald-100 text-emerald-800',
      bloom: 'bg-teal-100 text-teal-800',
      forest: 'bg-[#006B3E] text-white'
    };
    return colors[tier as keyof typeof colors] || colors.seed;
  };

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center">
        <div className="text-center">
          <TreePine className="w-16 h-16 text-[#006B3E] animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading influencer data...</p>
        </div>
      </div>
    );
  }

  const totalEarnings = influencers.reduce((sum, inf) => sum + inf.stats.totalEarnings, 0);
  const totalSales = influencers.reduce((sum, inf) => sum + inf.stats.totalSales, 0);
  const activeInfluencers = influencers.filter(inf => inf.status === 'active').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <div className="bg-muted/50 rounded-lg p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#3D2E17] flex items-center gap-2">
                <TreePine className="w-8 h-8 text-[#006B3E]" />
                Influencer Management
              </h1>
              <p className="text-muted-foreground mt-1">Manage influencers, settings, and campaigns</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={settings?.isSystemEnabled ? 'bg-green-500' : 'bg-red-500'}>
                {settings?.isSystemEnabled ? 'System Enabled' : 'System Disabled'}
              </Badge>
              <Button 
                variant="outline" 
                onClick={toggleSystemEnabled}
                className="border-[#006B3E] text-[#006B3E]"
              >
                {settings?.isSystemEnabled ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {settings?.isSystemEnabled ? 'Disable System' : 'Enable System'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Active Influencers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#006B3E]">
                {activeInfluencers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {influencers.filter(inf => inf.status === 'pending').length} pending approval
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Total Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">
                {totalSales}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Generated by influencers
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Commissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">
                R{totalEarnings.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Paid to influencers
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="influencers" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="influencers">Influencers</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Influencers Tab */}
          <TabsContent value="influencers" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#3D2E17]">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Name or referral code..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tier</Label>
                    <Select value={filterTier} onValueChange={setFilterTier}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tiers</SelectItem>
                        <SelectItem value="seed">Seed</SelectItem>
                        <SelectItem value="sprout">Sprout</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="bloom">Bloom</SelectItem>
                        <SelectItem value="forest">Forest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Influencers Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#3D2E17]">All Influencers ({filteredInfluencers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Earnings</TableHead>
                      <TableHead className="text-right">Commission %</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInfluencers.map((influencer) => (
                      <TableRow key={influencer.id}>
                        <TableCell className="font-medium">{influencer.displayName}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-xs">{influencer.referralCode}</code>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTierBadgeColor(influencer.tier)}>
                            {influencer.tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(influencer.status)}>
                            {influencer.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{influencer.stats.totalSales}</TableCell>
                        <TableCell className="text-right">R{influencer.stats.totalEarnings.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{influencer.commissionRate}%</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {influencer.status === 'pending' && (
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => updateInfluencerStatus(influencer.id, 'active')}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            {influencer.status === 'active' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateInfluencerStatus(influencer.id, 'suspended')}
                              >
                                <Pause className="w-4 h-4 mr-1" />
                                Suspend
                              </Button>
                            )}
                            {influencer.status === 'suspended' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateInfluencerStatus(influencer.id, 'active')}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Activate
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteInfluencer(influencer.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[#3D2E17]">Seasonal Campaigns</CardTitle>
                    <CardDescription>Create time-limited bonus commission events</CardDescription>
                  </div>
                  <Button className="bg-[#006B3E] hover:bg-[#005530]">
                    <Gift className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No campaigns yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-[#3D2E17]">{campaign.name}</h3>
                            <p className="text-sm text-muted-foreground">{campaign.theme}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Bonus: +{campaign.bonusCommission}%</span>
                              <span>Target: {campaign.targetSales} sales</span>
                              <span>{new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Badge className="bg-[#006B3E]">Active</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#3D2E17]">System Settings</CardTitle>
                <CardDescription>Configure commission rates, payout schedule, and more</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {settings && (
                  <>
                    <div>
                      <Label className="text-base font-semibold">Default Commission Rates by Tier</Label>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                        {Object.entries(settings.defaultCommissionRates).map(([tier, rate]) => (
                          <div key={tier}>
                            <Label className="capitalize">{tier}</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Input 
                                type="number" 
                                value={rate}
                                disabled={!editingSettings}
                                className="text-right"
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Minimum Payout (ZAR)</Label>
                        <Input 
                          type="number" 
                          value={settings.minimumPayout}
                          disabled={!editingSettings}
                        />
                      </div>
                      <div>
                        <Label>Payout Schedule</Label>
                        <Select value={settings.payoutSchedule} disabled={!editingSettings}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingSettings ? (
                        <>
                          <Button className="bg-[#006B3E] hover:bg-[#005530]" onClick={() => setEditingSettings(false)}>
                            Save Changes
                          </Button>
                          <Button variant="outline" onClick={() => setEditingSettings(false)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" onClick={() => setEditingSettings(true)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Settings
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
