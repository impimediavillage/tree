'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, ArrowLeft, CheckCircle, TrendingUp, Users, DollarSign, 
  Share2, Award, Zap, Target, Lightbulb, Sparkles, Trophy, 
  Rocket, Star, Gift, MessageCircle, Heart, Video, Instagram,
  Twitter, Facebook, Mail, Link2, Copy, PartyPopper, Crown
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { cn } from '@/lib/utils';

interface InfluencerOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

// Sample data for charts
const earningsPotentialData = [
  { name: 'Base Commission', value: 35, color: '#3D2E17' },
  { name: 'Video Bonus', value: 25, color: '#006B3E' },
  { name: 'Tribe Bonus', value: 20, color: '#8B7355' },
  { name: 'Seasonal Bonus', value: 20, color: '#FFB84D' },
];

// Commission rates are % of platform commission (25% of order)
// Actual earnings = commission% × 25% × order
const tierProgressData = [
  { tier: 'Seed', sales: 5, commission: 5 },     // 5% of platform = 1.25% of order
  { tier: 'Sprout', sales: 15, commission: 10 }, // 10% of platform = 2.5% of order
  { tier: 'Growth', sales: 30, commission: 15 }, // 15% of platform = 3.75% of order
  { tier: 'Bloom', sales: 50, commission: 18 },  // 18% of platform = 4.5% of order
  { tier: 'Forest', sales: 100, commission: 20 }, // 20% of platform = 5% of order (MAX)
];

const monthlyGrowthData = [
  { month: 'Week 1', earnings: 120 },
  { month: 'Week 2', earnings: 280 },
  { month: 'Week 3', earnings: 450 },
  { month: 'Week 4', earnings: 680 },
  { month: 'Month 2', earnings: 1200 },
  { month: 'Month 3', earnings: 2100 },
];

const steps = [
  {
    title: "Welcome to the Influencer Program! 🌳",
    icon: PartyPopper,
    color: "text-[#006B3E]",
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#006B3E] to-[#3D2E17] mb-4">
            <Crown className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-black text-[#3D2E17] mb-2">
            You're About to Join the Cool Kids! 😎
          </h3>
          <p className="text-muted-foreground text-lg">
            Get ready to turn your social media game into actual cash money. 
            No, seriously. Real money. In your bank account. 💰
          </p>
        </div>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-[#006B3E]">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white/80 rounded-lg">
                <Trophy className="h-8 w-8 text-[#006B3E] mx-auto mb-2" />
                <div className="text-2xl font-black text-[#3D2E17]">1.25-5%</div>
                <div className="text-sm text-muted-foreground">Commission Rate</div>
              </div>
              <div className="text-center p-4 bg-white/80 rounded-lg">
                <Zap className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                <div className="text-2xl font-black text-[#3D2E17]">+60%</div>
                <div className="text-sm text-muted-foreground">Bonus Potential</div>
              </div>
              <div className="text-center p-4 bg-white/80 rounded-lg">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-black text-[#3D2E17]">Unlimited</div>
                <div className="text-sm text-muted-foreground">Referrals</div>
              </div>
              <div className="text-center p-4 bg-white/80 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-black text-[#3D2E17]">R500</div>
                <div className="text-sm text-muted-foreground">Min Payout</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-gradient-to-r from-[#006B3E] to-[#3D2E17] text-white p-4 rounded-lg">
          <p className="text-center text-sm font-bold">
            💡 Pro Tip: The average influencer earns R2,500+ per month after 3 months. 
            The top performers? Let's just say they're buying fancy coffee every day. ☕
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "How Your Earnings Stack Up 📊",
    icon: TrendingUp,
    color: "text-amber-600",
    content: (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h3 className="text-xl font-black text-[#3D2E17] mb-2">
            The Secret Sauce to Maximum Earnings 🍯
          </h3>
          <p className="text-muted-foreground">
            Your commission isn't just a flat rate. Oh no, we're fancy here! 
            Let's break down how you can stack those bonuses.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-bold text-[#3D2E17] mb-3 flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#006B3E]" />
              Your Earning Breakdown
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={earningsPotentialData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {earningsPotentialData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <Card className="border-[#3D2E17]">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#3D2E17]/10 rounded">
                    <DollarSign className="h-5 w-5 text-[#3D2E17]" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-sm">Base Commission (35%)</h5>
                    <p className="text-xs text-muted-foreground">
                      Your reliable bread and butter. 8-18% on every sale.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#006B3E]">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#006B3E]/10 rounded">
                    <Video className="h-5 w-5 text-[#006B3E]" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-sm">Video Content Bonus (+25%)</h5>
                    <p className="text-xs text-muted-foreground">
                      TikTok it, Insta Reel it, YouTube Short it = 💰
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-600">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-600/10 rounded">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-sm">Tribe Engagement (+20%)</h5>
                    <p className="text-xs text-muted-foreground">
                      5+ monthly sales? You're basically a celebrity.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-600">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-600/10 rounded">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-sm">Seasonal Bonus (+20%)</h5>
                    <p className="text-xs text-muted-foreground">
                      Black Friday? Christmas? We multiply your bag!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
          <p className="text-sm text-center font-bold text-amber-900">
            🤑 Example: A R400 sale can earn you R72+ with all bonuses active! 
            That's 18%+ commission, baby!
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Level Up Your Game 🎮",
    icon: Rocket,
    color: "text-purple-600",
    content: (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h3 className="text-xl font-black text-[#3D2E17] mb-2">
            From Zero to Hero: The Tier System 🏆
          </h3>
          <p className="text-muted-foreground">
            Think of it like a video game, but instead of collecting coins, 
            you're collecting REAL MONEY. Much better, right?
          </p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tierProgressData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tier" />
            <YAxis yAxisId="left" label={{ value: 'Sales Required', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Commission %', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="sales" fill="#3D2E17" name="Monthly Sales" animationBegin={0} animationDuration={800} />
            <Bar yAxisId="right" dataKey="commission" fill="#006B3E" name="Commission %" animationBegin={200} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sprout className="h-4 w-4" />
                Seedling (Start)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-[#3D2E17]">8%</div>
              <p className="text-xs text-muted-foreground">Commission</p>
              <Badge className="mt-2 bg-green-600">0-5 sales/month</Badge>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Sapling (Mid)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-[#3D2E17]">12%</div>
              <p className="text-xs text-muted-foreground">Commission</p>
              <Badge className="mt-2 bg-blue-600">20-30 sales/month</Badge>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Forest (Legend)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-[#3D2E17]">18%</div>
              <p className="text-xs text-muted-foreground">Commission</p>
              <Badge className="mt-2 bg-purple-600">100+ sales/month</Badge>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg">
          <p className="text-center text-sm font-bold">
            🌟 Real Talk: Most people hit "Sapling" (12% commission) within 2-3 months. 
            That's when things get juicy! 💎
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Your Growth Trajectory 📈",
    icon: Target,
    color: "text-blue-600",
    content: (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h3 className="text-xl font-black text-[#3D2E17] mb-2">
            What Success Looks Like 🚀
          </h3>
          <p className="text-muted-foreground">
            Based on our top performers (aka the ones who actually followed this guide 😏)
          </p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyGrowthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis label={{ value: 'Earnings (R)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => `R${value}`} />
            <Line 
              type="monotone" 
              dataKey="earnings" 
              stroke="#006B3E" 
              strokeWidth={3}
              dot={{ fill: '#3D2E17', r: 6 }}
              animationBegin={0}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-[#006B3E]">
            <CardHeader>
              <CardTitle className="text-sm">Month 1: The Hustle Begins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#006B3E]" />
                  <span className="text-sm">Get your unique link</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#006B3E]" />
                  <span className="text-sm">Share everywhere</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#006B3E]" />
                  <span className="text-sm">Make first R500-800</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-600">
            <CardHeader>
              <CardTitle className="text-sm">Month 3: You're Rolling Now</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Hit Sapling tier (12%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Video bonuses active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Earning R2,000+ monthly</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-[#006B3E] to-[#3D2E17] text-white p-4 rounded-lg">
          <p className="text-center text-sm font-bold">
            💪 The secret? Consistency beats intensity. Share daily, even if it's just one story!
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Master Strategies That Work 🎯",
    icon: Lightbulb,
    color: "text-amber-500",
    content: (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h3 className="text-xl font-black text-[#3D2E17] mb-2">
            The "Not-So-Secret" Playbook 📚
          </h3>
          <p className="text-muted-foreground">
            These tactics have been proven by influencers making bank. Copy them shamelessly.
          </p>
        </div>

        <div className="grid gap-4">
          <Card className="border-l-4 border-l-[#006B3E]">
            <CardContent className="pt-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#006B3E]/10 flex items-center justify-center">
                    <Video className="h-6 w-6 text-[#006B3E]" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#3D2E17] mb-1">The Video Magic Formula ✨</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Post product reviews, unboxings, or "day in the life" content featuring wellness products. 
                    Video content gets +25% bonus commission!
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-pink-600">TikTok</Badge>
                    <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">Instagram Reels</Badge>
                    <Badge className="bg-red-600">YouTube Shorts</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-600">
            <CardContent className="pt-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center">
                    <Share2 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#3D2E17] mb-1">The Social Media Blitz 💥</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Share your unique link in your bio, stories, posts, and tweets. Pin it to your profile. 
                    Make it impossible to miss!
                  </p>
                  <div className="bg-blue-50 p-3 rounded text-xs">
                    <strong>Pro tip:</strong> Use a link-in-bio tool like Linktree to track where your clicks come from!
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600">
            <CardContent className="pt-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-purple-600/10 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#3D2E17] mb-1">The Community Builder 🏘️</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create a WhatsApp group, Telegram channel, or Facebook group for wellness enthusiasts. 
                    Share exclusive deals and build your tribe!
                  </p>
                  <div className="bg-purple-50 p-3 rounded text-xs">
                    <strong>Reality check:</strong> 5+ monthly referrals = +20% tribe bonus. That's real money!
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-600">
            <CardContent className="pt-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-amber-600/10 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#3D2E17] mb-1">The DM Strategy 💬</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Reach out to friends personally. "Hey, I found this cool wellness marketplace..." 
                    Personal recommendations convert 5x better!
                  </p>
                  <div className="bg-amber-50 p-3 rounded text-xs">
                    <strong>Script idea:</strong> "Just found amazing CBD products at great prices. Check it out: [your link]"
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 rounded-lg">
          <div className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-3" />
            <h4 className="font-black text-lg mb-2">The Million Rand Question</h4>
            <p className="text-sm">
              "Where should I share my link?" 
            </p>
            <p className="text-lg font-bold mt-3">
              EVERYWHERE. We're talking Instagram, TikTok, Twitter, Facebook, WhatsApp Status, 
              Telegram, Discord, Reddit, your dating profile bio... EVERYWHERE! 🚀
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Let's Get You Started! 🎉",
    icon: Rocket,
    color: "text-[#006B3E]",
    content: (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#006B3E] to-[#3D2E17] mb-4">
            <Rocket className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-black text-[#3D2E17] mb-2">
            Ready to Make That Money? 💰
          </h3>
          <p className="text-muted-foreground text-lg">
            Your action plan for the next 24 hours
          </p>
        </div>

        <div className="space-y-3">
          <Card className="border-2 border-[#006B3E]">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#006B3E] text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#3D2E17]">Get Your Unique Link</h4>
                  <p className="text-sm text-muted-foreground">
                    Apply to become an influencer (if you haven't already). 
                    You'll get a unique referral code like: <code className="bg-muted px-1 rounded">WLT-YOURNAME</code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-600">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#3D2E17]">Update Your Bio</h4>
                  <p className="text-sm text-muted-foreground">
                    Add your link to your Instagram, TikTok, and Twitter bios. 
                    Use text like: "🌿 Shop wellness products: [link]"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-600">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#3D2E17]">Create Your First Post</h4>
                  <p className="text-sm text-muted-foreground">
                    Film a quick 30-second video about your favorite product or why you love wellness. 
                    Post it as a Reel/TikTok with your link in the caption!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-600">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#3D2E17]">Message 10 Friends</h4>
                  <p className="text-sm text-muted-foreground">
                    Send your link to 10 people who might be interested. 
                    Be genuine, be helpful, and watch the magic happen! ✨
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-green-50 border-green-600">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                What Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-600"></div>
                <span>Posting consistently (daily is ideal)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-600"></div>
                <span>Video content Static images</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-600"></div>
                <span>Authentic, personal stories</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-600"></div>
                <span>Following up with people</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-600">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <X className="h-5 w-5 text-red-600" />
                What Doesn't Work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                <span>Spamming the same link everywhere</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                <span>Only posting once and giving up</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                <span>Being pushy or salesy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                <span>Not tracking your analytics</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-[#006B3E] via-[#3D2E17] to-[#006B3E] text-white p-6 rounded-lg text-center">
          <PartyPopper className="h-12 w-12 mx-auto mb-3" />
          <h4 className="font-black text-xl mb-2">You've Got This! 🌟</h4>
          <p className="text-sm mb-4">
            Remember: Every successful influencer started exactly where you are now. 
            The only difference? They started and didn't quit.
          </p>
          <div className="bg-white/20 backdrop-blur-sm rounded p-3 text-sm font-bold">
            💪 Aim for 5 referrals in your first month. You'll be surprised how achievable that is!
          </div>
        </div>
      </div>
    ),
  },
];

export function InfluencerOnboarding({ open, onOpenChange, onComplete }: InfluencerOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete();
    onOpenChange(false);
  };

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b bg-gradient-to-r from-[#006B3E] to-[#3D2E17] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <currentStepData.icon className={cn("h-8 w-8", currentStepData.color, "text-white")} />
              <div>
                <DialogTitle className="text-2xl font-black text-white">
                  {currentStepData.title}
                </DialogTitle>
                <DialogDescription className="text-white/80">
                  Step {currentStep + 1} of {steps.length}
                </DialogDescription>
              </div>
            </div>
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index === currentStep ? "w-8 bg-white" : "w-2 bg-white/30"
                  )}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentStepData.content}
        </div>

        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground font-semibold">
            {currentStep + 1} / {steps.length}
          </div>

          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleComplete}
              className="gap-2 bg-[#006B3E] hover:bg-[#005230]"
            >
              Let's Do This! 🚀
              <CheckCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="gap-2 bg-[#006B3E] hover:bg-[#005230]"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for X icon (since it's not exported from lucide-react)
function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

function Sprout({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 20h10"></path>
      <path d="M10 20c5.5-2.5.8-6.4 3-10"></path>
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"></path>
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"></path>
    </svg>
  );
}
