'use client';

import { motion } from 'framer-motion';
import { 
  Shield, 
  Eye, 
  Lock, 
  Database, 
  Users, 
  AlertCircle, 
  FileText,
  MapPin,
  Mail,
  Phone,
  Globe,
  Cookie,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  const sections = [
    {
      icon: Eye,
      title: "1. INFORMATION WE COLLECT",
      content: `We collect information that you provide directly to us, including:

• Personal identification information (name, email address, phone number)
• Shipping and billing addresses
• Payment information (processed securely through third-party gateways)
• Account credentials
• Purchase history and preferences
• Communications with us`
    },
    {
      icon: Database,
      title: "2. HOW WE USE YOUR INFORMATION",
      content: `We use the information we collect to:

• Process and fulfill your orders
• Communicate with you about your orders and account
• Provide customer support
• Send you marketing communications (with your consent)
• Improve our Platform and services
• Comply with legal obligations
• Detect and prevent fraud`
    },
    {
      icon: Users,
      title: "3. INFORMATION SHARING",
      content: `We may share your information with:

• Service providers who assist in operating our Platform
• Payment processors
• Shipping carriers
• Legal authorities when required by law
• Business partners with your consent

We do not sell your personal information to third parties.`
    },
    {
      icon: Cookie,
      title: "4. COOKIES AND TRACKING",
      content: `We use cookies and similar tracking technologies to:

• Remember your preferences
• Analyze Platform usage
• Improve user experience
• Provide personalized content

You can control cookies through your browser settings.`
    },
    {
      icon: Lock,
      title: "5. DATA SECURITY",
      content: `We implement appropriate technical and organizational measures to protect your personal information, including:

• Secure socket layer (SSL) encryption
• Regular security assessments
• Access controls and authentication
• Secure data storage

However, no method of transmission over the internet is 100% secure.`
    },
    {
      icon: UserCheck,
      title: "6. YOUR RIGHTS",
      content: `Under POPIA (Protection of Personal Information Act), you have the right to:

• Access your personal information
• Correct inaccurate information
• Request deletion of your information
• Object to processing
• Withdraw consent
• Lodge a complaint with the Information Regulator

Contact us to exercise these rights.`
    },
    {
      icon: Database,
      title: "7. DATA RETENTION",
      content: `We retain your personal information for as long as necessary to:

• Fulfill the purposes outlined in this policy
• Comply with legal obligations
• Resolve disputes
• Enforce our agreements

Account information is retained while your account is active and for a reasonable period thereafter.`
    },
    {
      icon: Users,
      title: "8. CHILDREN'S PRIVACY",
      content: `Our Platform is not intended for children under 18 years of age.

We do not knowingly collect personal information from children.

If you believe we have collected information from a child, please contact us immediately.`
    },
    {
      icon: Globe,
      title: "9. INTERNATIONAL TRANSFERS",
      content: `Your information may be transferred to and processed in countries other than South Africa.

We ensure appropriate safeguards are in place for such transfers.

We operate primarily within South Africa and comply with South African data protection laws.`
    },
    {
      icon: FileText,
      title: "10. CHANGES TO THIS POLICY",
      content: `We may update this Privacy Policy from time to time.

Changes will be posted on this page with an updated revision date.

Continued use of the Platform after changes constitutes acceptance of the updated policy.`
    },
    {
      icon: Shield,
      title: "11. POPIA COMPLIANCE",
      content: `We are committed to complying with the Protection of Personal Information Act (POPIA).

We process personal information lawfully, fairly, and transparently.

We collect only necessary information and use it for specified purposes.

We maintain the quality and security of personal information.`
    },
    {
      icon: AlertCircle,
      title: "12. MARKETING COMMUNICATIONS",
      content: `We may send you marketing communications about our products and services.

You can opt out of marketing emails by:
• Clicking the unsubscribe link in our emails
• Contacting us directly
• Updating your account preferences

We will process opt-out requests promptly.`
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="container mx-auto px-4 py-12 max-w-5xl"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block mb-6"
          >
            <Shield className="h-20 w-20 text-[#006B3E] mx-auto" />
          </motion.div>
          
          <h1 className="text-5xl font-bold text-[#3D2E17] mb-4">
            PRIVACY POLICY
          </h1>
          
          <div className="text-[#3D2E17] font-bold text-lg space-y-2 mb-6">
            <p>THE WELLNESS TREE (PTY) LTD</p>
            <p className="text-base">Registration Number: 2025/934950/07</p>
          </div>

          {/* Contact Information Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 max-w-2xl mx-auto mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-[#3D2E17]">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#006B3E] mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Address</p>
                  <p className="text-sm">63 Oxley Road, Salmon Bay</p>
                  <p className="text-sm">Port Edward, KwaZulu-Natal, 4295</p>
                  <p className="text-sm">South Africa</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-[#006B3E] flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Phone</p>
                    <p className="text-sm">+27 633 873 052</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-[#006B3E] flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-sm">info@thewellnesstree.co.za</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-[#006B3E] flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Website</p>
                    <p className="text-sm">thewellnesstree.co.za</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 border-l-4 border-[#006B3E] p-6 mb-12 rounded-r-lg shadow-md"
        >
          <p className="text-[#3D2E17] font-bold mb-2">
            At The Wellness Tree, we are committed to protecting your privacy and personal information.
          </p>
          <p className="text-[#3D2E17] font-bold">
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform.
          </p>
          <p className="text-[#3D2E17] font-bold mt-4">
            By using the Platform, you consent to the data practices described in this policy.
          </p>
        </motion.div>

        {/* Privacy Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (index * 0.05) }}
              className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="bg-[#006B3E] p-3 rounded-lg flex-shrink-0">
                  <section.icon className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[#3D2E17] mb-4">
                    {section.title}
                  </h2>
                  <div className="text-[#3D2E17] font-semibold whitespace-pre-line leading-relaxed">
                    {section.content}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contact Details Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-12 bg-[#006B3E] text-white rounded-xl shadow-xl p-8"
        >
          <h3 className="text-2xl font-bold mb-4 text-center">CONTACT US ABOUT PRIVACY</h3>
          <div className="space-y-2 text-center">
            <p className="font-bold">The Wellness Tree (Pty) Ltd</p>
            <p>Privacy Officer</p>
            <p>63 Oxley Road, Salmon Bay, Port Edward</p>
            <p>KwaZulu-Natal, 4295</p>
            <p>Registration No: 2025/934950/07</p>
            <p>Email: info@thewellnesstree.co.za</p>
            <p>Tel: +27 633 873 052</p>
          </div>
        </motion.div>

        {/* Last Updated */}
        <div className="text-center mt-8 text-[#3D2E17] font-semibold">
          Last Updated: 14 December 2025
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => router.back()}
            className="bg-[#3D2E17] hover:bg-[#006B3E] text-white font-bold px-8 py-3"
          >
            Back
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
