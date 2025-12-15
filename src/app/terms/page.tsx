'use client';

import { motion } from 'framer-motion';
import { 
  FileText, 
  Scale, 
  ShoppingCart, 
  CreditCard, 
  Shield, 
  Package, 
  AlertCircle, 
  User, 
  Eye, 
  Copyright, 
  MapPin,
  Mail,
  Phone,
  Globe,
  Truck,
  Store,
  Brain,
  Stethoscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function TermsOfServicePage() {
  const router = useRouter();

  const sections = [
    {
      icon: FileText,
      title: "1. DEFINITIONS",
      content: `Carrier means any person or business contracted by us to transport Goods.

Customer means any person who visits, accesses, or uses the Platform.

Content means any text, image, video, data, or material published on the Platform.

Goods means any physical or digital goods, including print-on-demand items.

Order means an offer by a Customer to purchase Goods.

Platform means https://thewellnesstree.co.za and any related applications.`
    },
    {
      icon: Scale,
      title: "2. INTERPRETATION",
      content: `These Terms apply to all Goods and services supplied by us and override any terms proposed by you.

Headings are for convenience only. Singular includes plural.

South African law applies, including the Electronic Communications and Transactions Act 2002 and the Consumer Protection Act 2008.`
    },
    {
      icon: FileText,
      title: "3. OUR CONTRACT WITH YOU",
      content: `By using the Platform, you agree to be bound by this Agreement.

This Agreement constitutes the entire agreement between the Parties.

We may amend these Terms at any time without prior notice.`
    },
    {
      icon: ShoppingCart,
      title: "4. ACCEPTANCE OF ORDERS",
      content: `An Order is accepted only once Goods are dispatched or services activated.

We may refuse any Order prior to acceptance.

Orders are limited to delivery addresses within South Africa unless agreed otherwise.`
    },
    {
      icon: CreditCard,
      title: "5. PRICING AND PAYMENT",
      content: `All prices are displayed in South African Rand (ZAR) and include VAT where applicable.

Payment must be made using approved payment methods.

Prices may change at any time.`
    },
    {
      icon: Shield,
      title: "6. SECURITY OF PAYMENTS",
      content: `Payments are processed via third-party payment gateways.

We do not store card details and accept no liability for gateway failures.

Refunds are processed only to the original payment method.`
    },
    {
      icon: Package,
      title: "7. CANCELLATION AND RETURNS",
      content: `Customers may cancel Orders in accordance with the Consumer Protection Act.

Returned Goods must be unused and in original condition.

Refunds exclude delivery costs unless legally required.`
    },
    {
      icon: Package,
      title: "8. DELIVERY AND COLLECTION",
      content: `Delivery is performed by contracted Carriers.

Delivery times are estimates and not guaranteed.

Risk passes to you upon delivery or collection.`
    },
    {
      icon: Truck,
      title: "9. NO LIABILITY FOR DELIVERY DELAYS",
      content: `The Wellness Tree does not accept any responsibility or liability for late, delayed, or non-delivery of Goods.

Delivery is performed by third-party Carriers who are independent contractors.

We are not liable for any losses, damages, or inconvenience arising from delivery delays, regardless of cause.

Estimated delivery times are provided for guidance only and do not constitute a binding commitment.

Claims regarding delivery delays must be directed to the Carrier or Seller, not to The Wellness Tree.`
    },
    {
      icon: Globe,
      title: "10. FOREIGN TAXES AND DUTIES",
      content: `We deliver only within South Africa.

Any export is at your own risk and expense.`
    },
    {
      icon: Store,
      title: "11. MARKETPLACE FACILITATION AND PRODUCT QUALITY",
      content: `The Wellness Tree operates as a marketplace platform that facilitates connections between independent Sellers and Buyers.

We do not manufacture, inspect, or guarantee the quality, safety, legality, or authenticity of any Goods listed on the Platform.

The Wellness Tree makes NO WARRANTIES OR GUARANTEES regarding product quality, fitness for purpose, or merchantability.

All Goods are sold by independent third-party Sellers. The contract of sale is directly between the Seller and the Buyer.

The Wellness Tree is not a party to the transaction and accepts no liability for:
• Product defects, quality issues, or non-conformity
• Misrepresentation of products by Sellers
• Health effects or adverse reactions from using products
• Compliance of products with applicable laws and regulations

Buyers assume all risks associated with purchasing and using Goods from the Platform.

All disputes regarding product quality must be resolved directly between Buyer and Seller.`
    },
    {
      icon: Brain,
      title: "12. AI ADVISORS - MEDICAL AND HEALTH DISCLAIMER",
      content: `The Wellness Tree provides AI-powered advisory services ("AI Advisors") for informational and educational purposes only.

CRITICAL WARNING: AI Advisors DO NOT provide medical, health, therapeutic, or professional advice.

The Wellness Tree accepts NO RESPONSIBILITY OR LIABILITY for any advice, recommendations, or information provided by AI Advisors.

AI-generated content may contain errors, inaccuracies, or outdated information and should NOT be relied upon for health decisions.

YOU ARE STRONGLY RECOMMENDED TO:
• Consult qualified, licensed practitioners in your chosen holistic or medical field
• Seek professional medical advice before using any products or treatments
• Verify all information with appropriate healthcare professionals
• Never disregard professional medical advice based on AI-generated content

AI Advisors are NOT a substitute for professional healthcare consultation.

By using AI Advisors, you acknowledge and accept that:
• You use AI-generated information entirely at your own risk
• You will not rely solely on AI advice for health or medical decisions
• The Wellness Tree is not liable for any consequences arising from following AI recommendations
• The Wellness Tree makes no representation regarding the accuracy, completeness, or reliability of AI-generated content

If you experience a medical emergency, contact emergency services immediately. Do not rely on AI Advisors for urgent medical matters.`
    },
    {
      icon: AlertCircle,
      title: "13. LIMITATION OF LIABILITY",
      content: `Our liability is limited to the value of the Goods purchased.

We are not liable for indirect or consequential loss.

The Wellness Tree's total liability to you for any claims arising from the Platform shall not exceed the amount you paid for Goods in the relevant transaction.`
    },
    {
      icon: Shield,
      title: "14. DISCLAIMERS",
      content: `Goods and services are provided "as is".

We make no warranty of fitness for a particular purpose.

Use of the Platform is at your own risk.`
    },
    {
      icon: User,
      title: "15. USER ACCOUNTS",
      content: `You are responsible for maintaining the confidentiality of your account.

You may not use the Platform for unauthorised commercial purposes.`
    },
    {
      icon: AlertCircle,
      title: "16. CONTENT RESTRICTIONS",
      content: `You may not post unlawful, misleading, offensive, or infringing content.`
    },
    {
      icon: FileText,
      title: "17. CONTENT LICENCE",
      content: `You grant us a licence to use content you post for Platform operations.`
    },
    {
      icon: Eye,
      title: "18. REMOVAL OF CONTENT",
      content: `We may remove content at our discretion.

Frivolous complaints may incur investigation costs.`
    },
    {
      icon: Shield,
      title: "19. PLATFORM SECURITY",
      content: `Unauthorised access or misuse will result in legal action.`
    },
    {
      icon: Scale,
      title: "20. INDEMNITY",
      content: `You indemnify us against all claims arising from your breach of these Terms.

You further indemnify The Wellness Tree against any claims arising from:
• Your use of AI Advisors or reliance on AI-generated content
• Your purchase or use of Goods from Sellers on the Platform
• Delivery delays or issues
• Product quality, safety, or defects`
    },
    {
      icon: Copyright,
      title: "21. INTELLECTUAL PROPERTY",
      content: `All Platform intellectual property remains our exclusive property.

Limited personal-use licences are granted.`
    },
    {
      icon: Eye,
      title: "22. PRIVACY",
      content: `Personal information is processed in accordance with POPIA and our Privacy Policy.`
    },
    {
      icon: Scale,
      title: "23. GOVERNING LAW",
      content: `This Agreement is governed by the laws of the Republic of South Africa.`
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-amber-50">
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
            <FileText className="h-20 w-20 text-[#006B3E] mx-auto" />
          </motion.div>
          
          <h1 className="text-5xl font-bold text-[#3D2E17] mb-4">
            TERMS OF SERVICE
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

          <p className="text-lg text-[#3D2E17] font-semibold">
            TERMS OF SERVICE THE WELLNESS TREE PLATFORM
          </p>
        </div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-amber-50 border-l-4 border-[#006B3E] p-6 mb-12 rounded-r-lg shadow-md"
        >
          <p className="text-[#3D2E17] font-bold mb-2">
            This Agreement is the contract between The Wellness Tree (Pty) Ltd ("we", "us", "our") and any person who accesses or uses the Platform ("you", "your").
          </p>
          <p className="text-[#3D2E17] font-bold">
            Any Customer is deemed to be a party to this Agreement.
          </p>
          <p className="text-[#3D2E17] font-bold mt-4 text-red-700">
            PLEASE READ THIS AGREEMENT CAREFULLY AND SAVE IT. If you do not agree with these Terms, you must immediately leave the Platform.
          </p>
        </motion.div>

        {/* Terms Sections */}
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
          <h3 className="text-2xl font-bold mb-4 text-center">CONTACT DETAILS</h3>
          <div className="space-y-2 text-center">
            <p className="font-bold">The Wellness Tree (Pty) Ltd</p>
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
