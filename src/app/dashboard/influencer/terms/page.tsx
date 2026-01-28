'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, DollarSign, TrendingUp, Users, Shield, AlertTriangle, Star, Gift, Target } from 'lucide-react';

export default function InfluencerTermsPage() {
  return (
    <div className="min-h-screen relative py-12 px-4">
      {/* Animated Tree Video Background */}
      <div className="fixed inset-0 -z-10">
        <video
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/images/treevid.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="container max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 bg-white/95 backdrop-blur-md rounded-lg p-6 shadow-lg relative">
          <Link 
            href="/dashboard/influencer/apply" 
            className="absolute left-4 top-6 flex items-center gap-2 text-[#3D2E17] hover:text-[#006B3E] transition-colors font-bold"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Back to Application</span>
          </Link>
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/images/tree.png"
              alt="The Wellness Tree"
              width={80}
              height={80}
              className="mx-auto"
            />
          </Link>
          <h1 className="text-4xl font-black text-[#3D2E17] mb-2 flex items-center justify-center gap-3">
            <Shield className="h-10 w-10 text-[#006B3E]" />
            Influencer Program Terms & Conditions
          </h1>
          <p className="text-lg font-bold text-[#3D2E17]/80">
            Understand how our influencer program works
          </p>
        </div>

        <Card className="shadow-xl border-2 border-[#006B3E]/30 bg-white/95 backdrop-blur-md">
          <CardContent className="p-8 space-y-8">
            
            {/* Commission Structure */}
            <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-2xl p-6 border-2 border-green-300">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="h-8 w-8 text-green-700" />
                <h2 className="text-2xl font-black text-green-900">Commission Structure & Earnings</h2>
              </div>
              <div className="space-y-4 text-green-900">
                <div>
                  <h3 className="text-lg font-black mb-2">💰 Tiered Commission Rates</h3>
                  <p className="font-semibold leading-relaxed mb-3">
                    Earn competitive commissions on every sale made through your unique referral link. Your commission tier is based on your total lifetime sales:
                  </p>
                  <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside ml-4">
                    <li><strong className="text-green-800">Bronze Tier (R0 - R10,000):</strong> Earn <strong>1.25% commission</strong> on all referred sales</li>
                    <li><strong className="text-green-800">Silver Tier (R10,001 - R50,000):</strong> Earn <strong>2.5% commission</strong> on all referred sales</li>
                    <li><strong className="text-green-800">Gold Tier (R50,001 - R150,000):</strong> Earn <strong>3.75% commission</strong> on all referred sales</li>
                    <li><strong className="text-green-800">Platinum Tier (R150,001+):</strong> Earn <strong>5% commission</strong> on all referred sales</li>
                  </ul>
                  <p className="font-semibold leading-relaxed mt-3 text-green-800">
                    <strong>Example:</strong> If you refer a customer who purchases R1,000 worth of products and you're at Silver Tier, you earn R25 (2.5%). At Platinum Tier, you'd earn R50 (5%)!
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">📅 Weekly Payout Schedule</h3>
                  <p className="font-semibold leading-relaxed">
                    <strong>Payout Day:</strong> Every <strong className="text-green-800">Friday</strong> at 12:00 PM SAST<br/>
                    <strong>Minimum Threshold:</strong> <strong className="text-green-800">R500</strong> available balance<br/>
                    <strong>Processing Time:</strong> 2-3 business days to your South African bank account<br/>
                    <strong>Carry-Over:</strong> If you don't reach R500, your earnings automatically roll over to the next week
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">🏦 How to Request Payout</h3>
                  <ol className="space-y-2 font-semibold leading-relaxed list-decimal list-inside">
                    <li>Log into your Influencer Dashboard</li>
                    <li>Navigate to "Payouts" section</li>
                    <li>Verify your available balance is R500 or more</li>
                    <li>Click "Request Payout" and enter your bank details</li>
                    <li>Confirm and submit your payout request</li>
                    <li>Funds will be transferred within 2-3 business days</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Bonuses & Incentives */}
            <div className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl p-6 border-2 border-amber-300">
              <div className="flex items-center gap-3 mb-4">
                <Gift className="h-8 w-8 text-amber-700" />
                <h2 className="text-2xl font-black text-amber-900">Bonuses & Special Incentives</h2>
              </div>
              <div className="space-y-4 text-amber-900">
                <div>
                  <h3 className="text-lg font-black mb-2">🎁 Performance Bonuses</h3>
                  <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                    <li><strong>First Sale Bonus:</strong> Earn an extra <strong className="text-amber-800">R100</strong> when you make your first referral sale!</li>
                    <li><strong>Monthly Top Performer:</strong> The influencer with the highest sales each month wins a <strong className="text-amber-800">R2,000 cash bonus</strong></li>
                    <li><strong>Milestone Bonuses:</strong> Earn special bonuses when you reach R25,000, R75,000, and R200,000 in lifetime sales</li>
                    <li><strong>Tier Upgrade Bonus:</strong> Get a <strong className="text-amber-800">R500 bonus</strong> when you level up to Gold or Platinum tier</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">🌟 Exclusive Perks</h3>
                  <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                    <li>Early access to new product launches</li>
                    <li>Free product samples for review and promotion</li>
                    <li>Featured placement on The Wellness Tree homepage</li>
                    <li>Exclusive influencer-only events and workshops</li>
                    <li>Priority customer support</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Influencer Workflow */}
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-6 border-2 border-blue-300">
              <div className="flex items-center gap-3 mb-4">
                <Target className="h-8 w-8 text-blue-700" />
                <h2 className="text-2xl font-black text-blue-900">How the Influencer Program Works</h2>
              </div>
              <div className="space-y-4 text-blue-900">
                <div>
                  <h3 className="text-lg font-black mb-2">📝 Step-by-Step Workflow</h3>
                  <ol className="space-y-3 font-semibold leading-relaxed list-decimal list-inside">
                    <li><strong>Apply & Get Approved:</strong> Submit your application and get approved within 24-48 hours. You'll receive your unique referral code (e.g., <code className="bg-blue-200 px-2 py-1 rounded">WELLNESS123</code>)</li>
                    <li><strong>Share Your Link:</strong> Promote your unique referral link on social media, blogs, YouTube, TikTok, Instagram, etc. Your link looks like: <code className="bg-blue-200 px-2 py-1 rounded">thewellnesstree.co.za?ref=YOURCODE</code></li>
                    <li><strong>Customer Shops:</strong> When someone clicks your link and makes a purchase, the sale is tracked to your account automatically</li>
                    <li><strong>Earn Commission:</strong> You earn commission based on the total order value (excluding shipping) according to your tier level</li>
                    <li><strong>Track Performance:</strong> Monitor your earnings, referrals, and conversion rates in real-time through your Influencer Dashboard</li>
                    <li><strong>Request Payout:</strong> Once you reach R500, request your payout every Friday and receive funds within 2-3 days</li>
                  </ol>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">🛠️ Tools & Resources You Get</h3>
                  <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                    <li><strong>Creator Lab:</strong> Design custom apparel with AI and sell in your mini-store</li>
                    <li><strong>Tribe System:</strong> Build your own wellness community with exclusive content</li>
                    <li><strong>Bundle Creator:</strong> Curate product bundles with your own discounts</li>
                    <li><strong>Event Hosting:</strong> Host live wellness events and product launches</li>
                    <li><strong>Analytics Dashboard:</strong> Track clicks, conversions, earnings, and audience demographics</li>
                    <li><strong>Marketing Materials:</strong> Access branded graphics, banners, and promotional content</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Best Practices & Content Guidelines */}
            <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl p-6 border-2 border-purple-300">
              <div className="flex items-center gap-3 mb-4">
                <Star className="h-8 w-8 text-purple-700" />
                <h2 className="text-2xl font-black text-purple-900">Content Guidelines & Best Practices</h2>
              </div>
              <div className="space-y-4 text-purple-900">
                <div>
                  <h3 className="text-lg font-black mb-2">✅ What You SHOULD Do</h3>
                  <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                    <li><strong>Be Authentic:</strong> Share genuine experiences and honest reviews of products you use</li>
                    <li><strong>Disclose Partnerships:</strong> Always mention you're an affiliate/influencer (e.g., "I earn commission from purchases through my link")</li>
                    <li><strong>Create Quality Content:</strong> Post high-quality photos, videos, and engaging captions</li>
                    <li><strong>Educate Your Audience:</strong> Share wellness knowledge, tips, and personal stories</li>
                    <li><strong>Engage Authentically:</strong> Respond to comments, answer questions, and build real relationships</li>
                    <li><strong>Follow Platform Rules:</strong> Comply with TikTok, Instagram, YouTube, and Facebook community guidelines</li>
                    <li><strong>Use Proper Hashtags:</strong> Tag posts with #TheWellnessTree, #WellnessInfluencer, and relevant niche tags</li>
                    <li><strong>Respect Privacy:</strong> Never share customer information or order details</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">❌ What You MUST NOT Do</h3>
                  <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                    <li><strong>False Claims:</strong> Never make medical claims, promises of cures, or exaggerated health benefits</li>
                    <li><strong>Spam or Bot Behavior:</strong> No automated posting, fake engagement, or purchased followers</li>
                    <li><strong>Self-Clicking:</strong> Never click your own referral links to generate fake sales</li>
                    <li><strong>Trademark Abuse:</strong> Don't use "The Wellness Tree" in your social media handles without permission</li>
                    <li><strong>Competitor Bashing:</strong> Don't negatively compare us to other brands or platforms</li>
                    <li><strong>Offensive Content:</strong> No hate speech, discrimination, explicit content, or illegal activities</li>
                    <li><strong>Misleading Pricing:</strong> Don't advertise incorrect prices or fake discounts</li>
                    <li><strong>Impersonation:</strong> Never impersonate The Wellness Tree staff or official accounts</li>
                  </ul>
                </div>
                <div className="bg-purple-200 rounded-lg p-4 border-2 border-purple-400">
                  <p className="font-black text-purple-900 mb-2">📱 TikTok-Inspired Best Practices:</p>
                  <ul className="space-y-2 font-semibold text-sm">
                    <li>✓ Create short, engaging videos (15-60 seconds)</li>
                    <li>✓ Use trending sounds and effects</li>
                    <li>✓ Post consistently (3-5 times per week minimum)</li>
                    <li>✓ Add clear call-to-action: "Link in bio!" or "Shop with my code: YOURCODE"</li>
                    <li>✓ Show products in action, unboxing, or personal testimonials</li>
                    <li>✓ Collaborate with other wellness influencers</li>
                    <li>✓ Engage with comments within the first hour of posting</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Violations & Consequences */}
            <div className="bg-gradient-to-br from-red-100 to-red-50 rounded-2xl p-6 border-2 border-red-300">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-700" />
                <h2 className="text-2xl font-black text-red-900">Violations & Account Termination</h2>
              </div>
              <div className="space-y-4 text-red-900">
                <div>
                  <h3 className="text-lg font-black mb-2">🚨 Immediate Termination Offenses</h3>
                  <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                    <li><strong className="text-red-800">Fraudulent Activity:</strong> Self-referrals, fake sales, or manipulating commission tracking</li>
                    <li><strong className="text-red-800">Illegal Promotion:</strong> Promoting illegal substances or making false medical claims</li>
                    <li><strong className="text-red-800">Breach of Trust:</strong> Sharing customer data, order details, or proprietary information</li>
                    <li><strong className="text-red-800">Brand Damage:</strong> Posting offensive content while representing The Wellness Tree</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">⚠️ Warning & Suspension Policy</h3>
                  <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                    <li><strong>First Violation:</strong> Written warning and 7-day educational period</li>
                    <li><strong>Second Violation:</strong> 30-day suspension with loss of commission for that period</li>
                    <li><strong>Third Violation:</strong> Permanent account termination with forfeiture of pending earnings</li>
                    <li><strong>Inactivity:</strong> Accounts with zero sales for 6+ months may be deactivated (can be reactivated)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">💬 Appeals Process</h3>
                  <p className="font-semibold leading-relaxed">
                    If you believe your account was terminated unfairly, you have <strong className="text-red-800">14 days</strong> to submit a written appeal to <strong>influencers@thewellnesstree.co.za</strong>. Include your referral code, explanation, and any supporting evidence. Appeals are reviewed within 7 business days.
                  </p>
                </div>
              </div>
            </div>

            {/* Legal & Privacy */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl p-6 border-2 border-gray-300">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-8 w-8 text-gray-700" />
                <h2 className="text-2xl font-black text-gray-900">Legal Terms & Data Privacy</h2>
              </div>
              <div className="space-y-4 text-gray-900">
                <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                  <li><strong>Independent Contractor:</strong> You are an independent contractor, not an employee of The Wellness Tree</li>
                  <li><strong>Tax Responsibility:</strong> You are responsible for all applicable taxes on your earnings</li>
                  <li><strong>Commission Changes:</strong> We reserve the right to adjust commission rates with 30 days' notice</li>
                  <li><strong>Data Privacy:</strong> We collect analytics on your referral performance but never share personal customer data</li>
                  <li><strong>Intellectual Property:</strong> You retain rights to your content, but grant us permission to share/promote it</li>
                  <li><strong>Termination Rights:</strong> Either party can terminate the agreement with 14 days' written notice</li>
                </ul>
                <p className="font-semibold leading-relaxed mt-4">
                  <strong>Last Updated:</strong> January 28, 2026
                </p>
              </div>
            </div>

            {/* Acceptance */}
            <div className="bg-gradient-to-br from-teal-100 to-teal-50 rounded-2xl p-6 border-2 border-teal-300">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-8 w-8 text-teal-700" />
                <h2 className="text-2xl font-black text-teal-900">Acceptance of Terms</h2>
              </div>
              <div className="text-teal-900">
                <p className="font-semibold leading-relaxed">
                  By checking the "I agree to the Influencer Program Terms & Conditions" box and submitting your influencer application, you acknowledge that you have read, understood, and agree to comply with all terms outlined in this document. You understand that violation of these terms may result in suspension or permanent termination from the platform with forfeiture of pending earnings.
                </p>
              </div>
            </div>

            {/* Back Button */}
            <div className="pt-4">
              <Button 
                asChild 
                size="lg" 
                className="w-full bg-[#006B3E] hover:bg-[#3D2E17] text-white font-black text-lg py-6"
              >
                <Link href="/dashboard/influencer/apply">
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back to Application Form
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
