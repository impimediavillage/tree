'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Target, 
  TrendingUp, 
  Award, 
  Settings, 
  Lock, 
  Globe,
  Trash2,
  Edit,
  Crown,
  Heart
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Tribe {
  id: string;
  influencerId: string;
  name: string;
  description: string;
  tagline: string;
  coverImage?: string;
  isPrivate: boolean;
  perks: string[];
  stats: {
    members: number;
    activeChallenges: number;
    totalEngagement: number;
    totalRewards: number;
  };
  createdAt: any;
}

interface TribeMember {
  id: string;
  tribeId: string;
  userId: string;
  userName: string;
  userEmail: string;
  joinedAt: any;
  engagementScore: number;
  challengesCompleted: number;
  isActive: boolean;
}

export default function WellnessTribesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);
  const [members, setMembers] = useState<TribeMember[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingMembers, setViewingMembers] = useState(false);

  useEffect(() => {
    if (user) {
      loadTribes();
    }
  }, [user]);

  const loadTribes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'wellnessTribes'),
        where('influencerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const tribesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tribe[];

      setTribes(tribesData);
    } catch (error) {
      console.error('Error loading tribes:', error);
      toast.error('Failed to load tribes');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (tribeId: string) => {
    try {
      const q = query(
        collection(db, 'tribeMemberships'),
        where('tribeId', '==', tribeId),
        orderBy('engagementScore', 'desc')
      );

      const snapshot = await getDocs(q);
      const membersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TribeMember[];

      setMembers(membersData);
      setViewingMembers(true);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load tribe members');
    }
  };

  const deleteTribe = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'wellnessTribes', id));
      
      // Delete all memberships
      const membershipsQuery = query(
        collection(db, 'tribeMemberships'),
        where('tribeId', '==', id)
      );
      const membershipsSnapshot = await getDocs(membershipsQuery);
      
      const deletePromises = membershipsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      toast.success('Tribe deleted successfully');
      loadTribes();
      setDeleteId(null);
      setViewingMembers(false);
    } catch (error) {
      console.error('Error deleting tribe:', error);
      toast.error('Failed to delete tribe');
    }
  };

  const togglePrivacy = async (tribe: Tribe) => {
    try {
      await updateDoc(doc(db, 'wellnessTribes', tribe.id), {
        isPrivate: !tribe.isPrivate
      });

      toast.success(`Tribe is now ${!tribe.isPrivate ? 'private' : 'public'}`);
      loadTribes();
    } catch (error) {
      console.error('Error updating privacy:', error);
      toast.error('Failed to update tribe privacy');
    }
  };

  const getTotalStats = () => {
    return tribes.reduce((acc, tribe) => ({
      totalMembers: acc.totalMembers + tribe.stats.members,
      activeChallenges: acc.activeChallenges + tribe.stats.activeChallenges,
      totalEngagement: acc.totalEngagement + tribe.stats.totalEngagement,
      totalRewards: acc.totalRewards + tribe.stats.totalRewards,
    }), {
      totalMembers: 0,
      activeChallenges: 0,
      totalEngagement: 0,
      totalRewards: 0,
    });
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006B3E] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tribes...</p>
        </div>
      </div>
    );
  }

  if (viewingMembers && selectedTribe) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="outline"
              onClick={() => {
                setViewingMembers(false);
                setSelectedTribe(null);
                setMembers([]);
              }}
              className="mb-4"
            >
              ← Back to Tribes
            </Button>
            <h1 className="text-3xl font-bold">{selectedTribe.name} - Members</h1>
            <p className="text-gray-600 mt-2">{members.length} total members</p>
          </div>
        </div>

        {/* Member Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {members.filter(m => m.isActive).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {members.length > 0 
                  ? Math.round(members.reduce((sum, m) => sum + m.engagementScore, 0) / members.length)
                  : 0
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Challenges Done</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {members.reduce((sum, m) => sum + m.challengesCompleted, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Tribe Members</CardTitle>
            <CardDescription>Manage your wellness tribe community</CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No members yet</h3>
                <p className="text-gray-500">Share your tribe invite to get members!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#006B3E] to-[#8B4513] text-white font-bold">
                        {index === 0 && <Crown className="w-5 h-5" />}
                        {index > 0 && member.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{member.userName}</p>
                          {index < 3 && (
                            <Badge variant="secondary" className="text-xs">
                              Top {index + 1}
                            </Badge>
                          )}
                          {!member.isActive && (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{member.userEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">Engagement</p>
                        <p className="text-lg font-bold text-[#006B3E]">
                          {member.engagementScore}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">Challenges</p>
                        <p className="text-lg font-bold text-purple-600">
                          {member.challengesCompleted}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wellness Tribes</h1>
          <p className="text-gray-600 mt-2">Build and manage your wellness community</p>
        </div>
        <Button 
          onClick={() => router.push('/dashboard/influencer/tribe/create')}
          className="bg-[#006B3E] hover:bg-[#005530]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Tribe
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Tribes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tribes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Active Challenges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeChallenges}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Engagement Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalEngagement}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tribes Grid */}
      {tribes.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center">
            <Users className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Create Your First Wellness Tribe</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Build a community of wellness enthusiasts. Share challenges, track progress, and reward engagement.
            </p>
            <Button 
              onClick={() => router.push('/dashboard/influencer/tribe/create')}
              className="bg-[#006B3E] hover:bg-[#005530]"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Tribe
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tribes.map((tribe) => (
            <Card key={tribe.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{tribe.name}</CardTitle>
                      <Badge variant={tribe.isPrivate ? "secondary" : "default"}>
                        {tribe.isPrivate ? (
                          <><Lock className="w-3 h-3 mr-1" /> Private</>
                        ) : (
                          <><Globe className="w-3 h-3 mr-1" /> Public</>
                        )}
                      </Badge>
                    </div>
                    <CardDescription>{tribe.tagline}</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{tribe.description}</p>

                {/* Perks */}
                {tribe.perks && tribe.perks.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Member Perks:</p>
                    <div className="flex flex-wrap gap-2">
                      {tribe.perks.map((perk, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <Award className="w-3 h-3 mr-1" />
                          {perk}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Members</p>
                    <p className="text-lg font-bold text-[#006B3E]">{tribe.stats.members}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Challenges</p>
                    <p className="text-lg font-bold text-blue-600">{tribe.stats.activeChallenges}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Engagement</p>
                    <p className="text-lg font-bold text-purple-600">{tribe.stats.totalEngagement}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rewards</p>
                    <p className="text-lg font-bold text-orange-600">R{tribe.stats.totalRewards}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTribe(tribe);
                      loadMembers(tribe.id);
                    }}
                    className="flex-1"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    View Members
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePrivacy(tribe)}
                  >
                    {tribe.isPrivate ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/influencer/tribe/edit/${tribe.id}`)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(tribe.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tribe?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tribe and remove all members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteTribe(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
