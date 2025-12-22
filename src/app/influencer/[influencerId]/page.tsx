'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TreePine, Users, Award, Heart, TrendingUp, Package, 
  Instagram, Twitter, Youtube, Facebook, Calendar, Video,
  Sparkles, Gift, ExternalLink
} from 'lucide-react';
import type { InfluencerProfile, HealingJourney, HealingBundle, WellnessTribe } from '@/types/influencer';
import { createReferralLink } from '@/lib/influencer-utils';
import Image from 'next/image';
import Link from 'next/link';

export default function InfluencerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const influencerId = params.influencerId as string;

  const [profile, setProfile] = useState<(InfluencerProfile & { id: string }) | null>(null);
  const [journey, setJourney] = useState<(HealingJourney & { id: string }) | null>(null);
  const [bundles, setBundles] = useState<(HealingBundle & { id: string })[]>([]);
  const [tribe, setTribe] = useState<(WellnessTribe & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, [influencerId]);

  const loadProfileData = async () => {
    try {
      // Load profile
      const profileDoc = await getDoc(doc(db, 'influencerProfiles', influencerId));
      if (!profileDoc.exists()) {
        router.push('/404');
        return;
      }

      const profileData = { id: profileDoc.id, ...profileDoc.data() } as InfluencerProfile & { id: string };
      setProfile(profileData);

      // Load public healing journey
      const journeyQuery = query(
        collection(db, 'healingJourneys'),
        where('influencerId', '==', influencerId),
        where('isPublic', '==', true),
        limit(1)
      );
      const journeySnapshot = await getDocs(journeyQuery);
      if (!journeySnapshot.empty) {
        setJourney({ id: journeySnapshot.docs[0].id, ...journeySnapshot.docs[0].data() } as HealingJourney & { id: string });
      }

      // Load active bundles
      const bundlesQuery = query(
        collection(db, 'healingBundles'),
        where('influencerId', '==', influencerId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const bundlesSnapshot = await getDocs(bundlesQuery);
      setBundles(bundlesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as HealingBundle & { id: string })));

      // Load tribe
      const tribeQuery = query(
        collection(db, 'wellnessTribes'),
        where('influencerId', '==', influencerId),
        limit(1)
      );
      const tribeSnapshot = await getDocs(tribeQuery);
      if (!tribeSnapshot.empty) {
        setTribe({ id: tribeSnapshot.docs[0].id, ...tribeSnapshot.docs[0].data() } as WellnessTribe & { id: string });
      }

    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center">
        <div className="text-center">
          <TreePine className="w-16 h-16 text-[#006B3E] animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const getTierColor = (tier: string) => {
    const colors = {
      seed: 'bg-amber-100 text-amber-800 border-amber-300',
      sprout: 'bg-green-100 text-green-800 border-green-300',
      growth: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      bloom: 'bg-teal-100 text-teal-800 border-teal-300',
      forest: 'bg-[#006B3E] text-white border-[#006B3E]'
    };
    return colors[tier as keyof typeof colors] || colors.seed;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-[#006B3E]/20 to-[#3D2E17]/20 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[url('/images/treehouse/tree-pattern.svg')] opacity-5" />
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[#006B3E] to-[#00AB5E] flex items-center justify-center text-white text-4xl md:text-5xl font-bold shadow-lg">
                {profile.displayName.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-start gap-3 flex-wrap mb-3">
                  <h1 className="text-3xl md:text-4xl font-bold text-[#3D2E17]">
                    {profile.displayName}
                  </h1>
                  <Badge className={`${getTierColor(profile.tier)} text-base px-3 py-1 border-2`}>
                    <Award className="w-4 h-4 mr-1" />
                    {profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1)}
                  </Badge>
                </div>
                <p className="text-lg text-muted-foreground mb-4">{profile.bio}</p>

                {/* Social Links */}
                <div className="flex items-center gap-3 mb-6">
                  {profile.socialLinks?.instagram && (
                    <a 
                      href={profile.socialLinks.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-background/50 rounded-full hover:bg-background transition-colors"
                    >
                      <Instagram className="w-5 h-5 text-pink-600" />
                    </a>
                  )}
                  {profile.socialLinks?.tiktok && (
                    <a 
                      href={profile.socialLinks.tiktok} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-background/50 rounded-full hover:bg-background transition-colors"
                    >
                      <Video className="w-5 h-5" />
                    </a>
                  )}
                  {profile.socialLinks?.youtube && (
                    <a 
                      href={profile.socialLinks.youtube} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-background/50 rounded-full hover:bg-background transition-colors"
                    >
                      <Youtube className="w-5 h-5 text-red-600" />
                    </a>
                  )}
                  {profile.socialLinks?.facebook && (
                    <a 
                      href={profile.socialLinks.facebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-background/50 rounded-full hover:bg-background transition-colors"
                    >
                      <Facebook className="w-5 h-5 text-blue-600" />
                    </a>
                  )}
                  {profile.socialLinks?.twitter && (
                    <a 
                      href={profile.socialLinks.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-background/50 rounded-full hover:bg-background transition-colors"
                    >
                      <Twitter className="w-5 h-5 text-sky-500" />
                    </a>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 flex-wrap text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#006B3E]" />
                    <span className="font-semibold">{profile.stats.totalSales}</span>
                    <span className="text-muted-foreground">Sales Helped</span>
                  </div>
                  {tribe && (
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#006B3E]" />
                      <span className="font-semibold">{profile.stats.tribeMembers}</span>
                      <span className="text-muted-foreground">Tribe Members</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#006B3E]" />
                    <span className="font-semibold">{profile.stats.badges?.length || 0}</span>
                    <span className="text-muted-foreground">Badges Earned</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3 mt-6">
              <Button 
                className="bg-[#006B3E] hover:bg-[#005530]"
                asChild
              >
                <Link href={`/?ref=${profile.referralCode}`}>
                  <Gift className="w-4 h-4 mr-2" />
                  Shop with {profile.displayName}
                </Link>
              </Button>
              {tribe && !tribe.isPrivate && (
                <Button variant="outline" className="border-[#006B3E] text-[#006B3E]" asChild>
                  <Link href={`/tribes/${tribe.id}`}>
                    <Users className="w-4 h-4 mr-2" />
                    Join Tribe
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Healing Story */}
        {profile.healingStory && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-[#3D2E17] flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#006B3E]" />
                My Healing Story
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {profile.healingStory}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Healing Journey */}
        {journey && journey.milestones && journey.milestones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-[#3D2E17] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#006B3E]" />
                Healing Journey
              </CardTitle>
              <CardDescription>{journey.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#006B3E]/20" />
                
                <div className="space-y-8">
                  {journey.milestones.map((milestone, index) => (
                    <div key={index} className="relative pl-16">
                      {/* Timeline Dot */}
                      <div className="absolute left-6 top-2 w-5 h-5 rounded-full bg-[#006B3E] border-4 border-background shadow-lg" />
                      
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-semibold text-[#3D2E17]">{milestone.title}</h3>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {milestone.date?.toDate?.().toLocaleDateString() || 'N/A'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{milestone.description}</p>
                        
                        {milestone.images && milestone.images.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                            {milestone.images.slice(0, 3).map((img, i) => (
                              <div key={i} className="relative aspect-square rounded overflow-hidden">
                                <Image 
                                  src={img} 
                                  alt={`Milestone ${index + 1} image ${i + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {milestone.emotions && milestone.emotions.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {milestone.emotions.map((emotion, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {emotion}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Curated Bundles */}
        {bundles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-[#3D2E17] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#006B3E]" />
                Curated Bundles
              </CardTitle>
              <CardDescription>
                Hand-picked product collections for your wellness journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bundles.map((bundle) => (
                  <div key={bundle.id} className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 border border-border hover:border-[#006B3E] transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-[#3D2E17]">{bundle.name}</h3>
                      <Badge className="bg-green-500 text-white">
                        {bundle.discountPercent}% OFF
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{bundle.description}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg font-bold text-[#006B3E]">
                        R{bundle.discountedPrice.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        R{bundle.totalPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {bundle.products.length} products included
                    </div>
                    <Button className="w-full bg-[#006B3E] hover:bg-[#005530]" asChild>
                      <Link href={`/bundles/${bundle.id}?ref=${profile.referralCode}`}>
                        View Bundle
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wellness Tribe */}
        {tribe && (
          <Card className="bg-gradient-to-br from-[#006B3E]/10 to-muted/50">
            <CardHeader>
              <CardTitle className="text-[#3D2E17] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#006B3E]" />
                {tribe.name}
              </CardTitle>
              <CardDescription>{tribe.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#006B3E]">{tribe.memberCount}</div>
                    <div className="text-sm text-muted-foreground">Members</div>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-[#3D2E17] mb-2">Member Perks:</h4>
                    <ul className="space-y-1">
                      {tribe.perks?.slice(0, 3).map((perk, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <Sparkles className="w-3 h-3 text-[#006B3E]" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {!tribe.isPrivate && (
                  <Button className="w-full bg-[#006B3E] hover:bg-[#005530]" asChild>
                    <Link href={`/tribes/${tribe.id}/join`}>
                      Join the Tribe
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
