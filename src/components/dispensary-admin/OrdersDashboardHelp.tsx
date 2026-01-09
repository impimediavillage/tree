'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  Package2, 
  Search, 
  Filter,
  Calendar,
  CheckSquare,
  Truck,
  Printer,
  FileDown,
  RefreshCw,
  AlertCircle,
  Clock,
  BarChart3,
  Sparkles,
  Zap,
  Target,
  Trophy,
  Rocket,
  Star,
  TrendingUp,
  Eye,
  ShoppingBag,
  PackageCheck,
  MapPin,
  Bell,
  Shield,
  Award
} from "lucide-react";

const tutorialSections = [
  {
    title: "🎮 Getting Started with Orders",
    icon: Rocket,
    gradient: "from-purple-500 to-pink-500",
    bgColor: "from-purple-50 to-pink-50",
    content: [
      {
        subtitle: "📊 Understanding Your Dashboard",
        icon: Eye,
        items: [
          { text: "Orders appear as beautiful cards with order numbers and customer info", emoji: "📦" },
          { text: "Real-time status updates show shipping progress instantly", emoji: "🔄" },
          { text: "Click any order to see comprehensive details and shipping options", emoji: "💫" }
        ]
      },
      {
        subtitle: "✨ Key Features at a Glance",
        icon: Star,
        items: [
          { text: "Color-coded status badges for instant order progress visibility", emoji: "🏷️" },
          { text: "Dates and times displayed clearly for perfect tracking", emoji: "📅" },
          { text: "Customer details accessible with one click", emoji: "👤" },
          { text: "Order totals and payment status prominently highlighted", emoji: "💰" }
        ]
      }
    ]
  },
  {
    title: "🔍 Smart Order Management",
    icon: Search,
    gradient: "from-blue-500 to-cyan-500",
    bgColor: "from-blue-50 to-cyan-50",
    content: [
      {
        subtitle: "🎯 Powerful Search & Filters",
        icon: Target,
        items: [
          { text: "Lightning-fast search by order number, name, or email", emoji: "⚡" },
          { text: "Date range picker to find orders from specific periods", emoji: "📅" },
          { text: "Multi-status filtering for precise order selection", emoji: "🏷️" },
          { text: "Track shipments by delivery status effortlessly", emoji: "🚚" }
        ]
      },
      {
        subtitle: "📈 Advanced Sorting Magic",
        icon: TrendingUp,
        items: [
          { text: "Sort by newest or oldest orders instantly", emoji: "⬆️" },
          { text: "Organize by priority status for efficient processing", emoji: "📊" },
          { text: "Arrange by order value to focus on high-priority items", emoji: "💰" },
          { text: "Group by location for optimal delivery planning", emoji: "📍" }
        ]
      }
    ]
  },
  {
    title: "⚡ Efficient Bulk Processing",
    icon: Zap,
    gradient: "from-yellow-500 to-orange-500",
    bgColor: "from-yellow-50 to-orange-50",
    content: [
      {
        subtitle: "🚀 Bulk Actions Made Easy",
        icon: CheckSquare,
        items: [
          { text: "Select multiple orders with a single click", emoji: "✅" },
          { text: "Update status for all selected orders simultaneously", emoji: "🔄" },
          { text: "Generate shipping labels in massive batches", emoji: "🖨️" },
          { text: "Export orders to CSV for powerful reporting", emoji: "📥" }
        ]
      },
      {
        subtitle: "💪 Time-Saving Superpowers",
        icon: Trophy,
        items: [
          { text: "Quick-select tools for common filter combinations", emoji: "⚡" },
          { text: "Batch update shipping info across multiple orders", emoji: "📝" },
          { text: "Select all orders matching your current filters", emoji: "🎯" },
          { text: "Save favorite filter combos for instant reuse", emoji: "💾" }
        ]
      }
    ]
  },
  {
    title: "🚚 Professional Shipping Tools",
    icon: Truck,
    gradient: "from-green-500 to-emerald-500",
    bgColor: "from-green-50 to-emerald-50",
    content: [
      {
        subtitle: "🏷️ Shipping Label Generation",
        icon: PackageCheck,
        items: [
          { text: "One-click shipping label creation magic", emoji: "✨" },
          { text: "Support for multiple shipping carriers built-in", emoji: "📦" },
          { text: "Automatic shipping rate calculations", emoji: "🔄" },
          { text: "Custom packaging options for every shipment", emoji: "🎁" }
        ]
      },
      {
        subtitle: "📍 Delivery Management Pro",
        icon: MapPin,
        items: [
          { text: "Real-time shipment tracking with live updates", emoji: "🚚" },
          { text: "PUDO lockers and door-to-door delivery options", emoji: "🏠" },
          { text: "SMS and email tracking notifications", emoji: "📱" },
          { text: "Instant label reprint with one click", emoji: "⚡" }
        ]
      }
    ]
  },
  {
    title: "🎯 Order Status Workflow",
    icon: Clock,
    gradient: "from-indigo-500 to-purple-500",
    bgColor: "from-indigo-50 to-purple-50",
    content: [
      {
        subtitle: "🔔 Status Management System",
        icon: Bell,
        items: [
          { text: "Clear workflow with visual status progression", emoji: "⏳" },
          { text: "Automatic customer notifications at every step", emoji: "📧" },
          { text: "Add processing notes and updates in real-time", emoji: "📝" },
          { text: "View complete order timeline and history", emoji: "📊" }
        ]
      },
      {
        subtitle: "🛡️ Quality Control Center",
        icon: Shield,
        items: [
          { text: "Pre-shipping checklist to ensure accuracy", emoji: "✅" },
          { text: "Automated error detection and alerts", emoji: "⚠️" },
          { text: "Attach photos directly to order records", emoji: "📸" },
          { text: "Quality assurance checks before dispatch", emoji: "🔍" }
        ]
      }
    ]
  },
  {
    title: "📊 Performance Analytics",
    icon: BarChart3,
    gradient: "from-pink-500 to-rose-500",
    bgColor: "from-pink-50 to-rose-50",
    content: [
      {
        subtitle: "📈 Real-Time Metrics Dashboard",
        icon: TrendingUp,
        items: [
          { text: "Live order volume tracking with instant updates", emoji: "📊" },
          { text: "Processing speed analytics for optimization", emoji: "⚡" },
          { text: "Delivery success rates and performance scores", emoji: "✅" },
          { text: "Revenue tracking and growth trend analysis", emoji: "💰" }
        ]
      },
      {
        subtitle: "💡 Business Intelligence Hub",
        icon: Award,
        items: [
          { text: "Custom report generation tools", emoji: "📋" },
          { text: "Performance benchmarks and goal tracking", emoji: "🎯" },
          { text: "Historical data comparison and insights", emoji: "📅" },
          { text: "Actionable insights dashboard for growth", emoji: "💡" }
        ]
      }
    ]
  }
];

export function OrdersDashboardHelp() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100 transition-all"
        >
          <HelpCircle className="mr-2 h-4 w-4 text-purple-600" />
          <span className="font-bold text-purple-700">Help Guide</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
          <DialogTitle className="flex items-center gap-3 text-3xl text-white font-black">
            <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-8 w-8 text-white animate-pulse" />
            </div>
            Orders Dashboard Guide
          </DialogTitle>
          <DialogDescription className="text-white/90 font-semibold text-base">
            Master your orders with our game-style interactive guide! 🎮✨
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(85vh-140px)] px-6">
          <div className="space-y-6 py-6">
            {tutorialSections.map((section, index) => {
              const SectionIcon = section.icon;
              return (
                <div 
                  key={index} 
                  className={`rounded-2xl border-2 bg-gradient-to-br ${section.bgColor} p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]`}
                >
                  {/* Section Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${section.gradient} shadow-lg`}>
                      <SectionIcon className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-[#3D2E17]">
                        {section.title}
                      </h3>
                      <Badge 
                        className={`mt-1 bg-gradient-to-r ${section.gradient} text-white border-0`}
                      >
                        Level {index + 1} Feature
                      </Badge>
                    </div>
                  </div>

                  {/* Subsections */}
                  <div className="space-y-5">
                    {section.content.map((subsection, subIndex) => {
                      const SubIcon = subsection.icon;
                      return (
                        <div key={subIndex} className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md border border-gray-100">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200">
                              <SubIcon className="h-5 w-5 text-[#006B3E]" />
                            </div>
                            <h4 className="text-lg font-black text-[#3D2E17]">
                              {subsection.subtitle}
                            </h4>
                          </div>
                          <div className="grid gap-3">
                            {subsection.items.map((item, itemIndex) => (
                              <div 
                                key={itemIndex} 
                                className="flex items-start gap-3 bg-gradient-to-r from-white to-gray-50 p-4 rounded-lg border border-gray-200 hover:border-[#006B3E] transition-all group hover:shadow-md"
                              >
                                <span className="text-2xl flex-shrink-0 group-hover:scale-125 transition-transform">
                                  {item.emoji}
                                </span>
                                <span className="text-sm font-semibold text-[#3D2E17] leading-relaxed">
                                  {item.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Pro Tips Section - Game Style */}
            <div className="rounded-2xl border-4 border-yellow-400 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-6 shadow-2xl relative overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-400/20 rounded-full blur-3xl"></div>
              
              <div className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg animate-pulse">
                    <Trophy className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-yellow-900 flex items-center gap-2">
                      🏆 Pro Tips for Success
                      <Sparkles className="h-6 w-6 text-yellow-600" />
                    </h3>
                    <p className="text-sm text-yellow-800 font-bold mt-1">Level up your order management game!</p>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  {[
                    { 
                      icon: Clock, 
                      title: "⏱️ Master Time Management", 
                      tip: "Process orders chronologically to maintain smooth, efficient workflow",
                      gradient: "from-blue-500 to-cyan-500"
                    },
                    { 
                      icon: Shield, 
                      title: "✅ Quality Assurance Pro", 
                      tip: "Double-check shipping details before generating labels - accuracy is key!",
                      gradient: "from-green-500 to-emerald-500"
                    },
                    { 
                      icon: Zap, 
                      title: "⚡ Efficiency Supercharge", 
                      tip: "Use bulk actions whenever possible to save precious time and boost productivity",
                      gradient: "from-yellow-500 to-orange-500"
                    },
                    { 
                      icon: BarChart3, 
                      title: "📊 Stay Data-Informed", 
                      tip: "Monitor analytics dashboard regularly for performance optimization insights",
                      gradient: "from-purple-500 to-pink-500"
                    },
                    { 
                      icon: RefreshCw, 
                      title: "🔄 Real-Time Updates", 
                      tip: "Maintain current order status updates for accurate tracking and customer satisfaction",
                      gradient: "from-indigo-500 to-purple-500"
                    }
                  ].map((tip, idx) => {
                    const TipIcon = tip.icon;
                    return (
                      <div 
                        key={idx} 
                        className="bg-white rounded-xl p-4 shadow-md border-2 border-yellow-200 hover:border-yellow-400 transition-all group hover:shadow-xl"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${tip.gradient} shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                            <TipIcon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <span className="font-black text-yellow-900 text-base block mb-1">
                              {tip.title}
                            </span>
                            <p className="text-sm text-yellow-800 font-semibold leading-relaxed">
                              {tip.tip}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Achievement Badge */}
                <div className="mt-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-4 text-center shadow-lg">
                  <div className="flex items-center justify-center gap-2 text-white font-black text-lg">
                    <Award className="h-6 w-6" />
                    Complete Achievement: Orders Management Master! 🎉
                    <Star className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-gradient-to-r from-gray-50 to-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
            <Sparkles className="h-4 w-4 text-purple-500" />
            You're all set to master orders! 🚀
          </div>
          <Button 
            onClick={() => setOpen(false)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-lg"
          >
            Let's Go! 🎮
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}