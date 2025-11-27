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
  BarChart3
} from "lucide-react";

const tutorialSections = [
  {
    title: "Getting Started with Orders",
    icon: Package2,
    content: [
      {
        subtitle: "Understanding Your Dashboard",
        items: [
          "📦 Orders are displayed as cards with order numbers and customer information",
          "🔄 Each order shows real-time status updates and shipping progress",
          "💫 Click any order card to view comprehensive details and shipping options"
        ]
      },
      {
        subtitle: "Key Features at a Glance",
        items: [
          "🏷️ Color-coded status badges show order progress instantly",
          "📅 Order dates and times are clearly displayed",
          "👤 Customer details are easily accessible",
          "💰 Order totals and payment status are highlighted"
        ]
      }
    ]
  },
  {
    title: "Smart Order Management",
    icon: Search,
    content: [
      {
        subtitle: "Powerful Search & Filters",
        items: [
          "🔍 Quick search by order number, customer name, or email",
          "📅 Date range picker for specific time periods",
          "🏷️ Filter by multiple order statuses",
          "🚚 Track orders by shipping status"
        ]
      },
      {
        subtitle: "Advanced Sorting Options",
        items: [
          "⬆️ Sort by newest or oldest orders",
          "📊 Organize by status priority",
          "💰 Sort by order value",
          "📍 Group by shipping location"
        ]
      }
    ]
  },
  {
    title: "Efficient Bulk Processing",
    icon: CheckSquare,
    content: [
      {
        subtitle: "Bulk Actions Made Easy",
        items: [
          "✅ Select multiple orders with one click",
          "🔄 Update status for all selected orders",
          "🖨️ Generate shipping labels in bulk",
          "📥 Export orders to CSV for reporting"
        ]
      },
      {
        subtitle: "Time-Saving Features",
        items: [
          "⚡ Quick-select tools for common filters",
          "📝 Batch update shipping information",
          "🎯 Select all orders matching current filters",
          "💾 Save common filter combinations"
        ]
      }
    ]
  },
  {
    title: "Professional Shipping Tools",
    icon: Truck,
    content: [
      {
        subtitle: "Shipping Label Generation",
        items: [
          "🏷️ One-click shipping label creation",
          "📦 Support for multiple shipping carriers",
          "🔄 Automatic rate calculations",
          "✨ Custom packaging options"
        ]
      },
      {
        subtitle: "Delivery Management",
        items: [
          "🚚 Real-time shipment tracking",
          "📍 PUDO and door-to-door options",
          "📱 SMS and email tracking updates",
          "⚡ Quick label reprint option"
        ]
      }
    ]
  },
  {
    title: "Order Status Workflow",
    icon: Clock,
    content: [
      {
        subtitle: "Status Management",
        items: [
          "⏳ Clear status progression workflow",
          "🔔 Automatic customer notifications",
          "📝 Add processing notes and updates",
          "📊 View complete order timeline"
        ]
      },
      {
        subtitle: "Quality Control",
        items: [
          "✅ Pre-shipping checklist",
          "⚠️ Automated error detection",
          "📸 Attach photos to order records",
          "🔍 Quality assurance checks"
        ]
      }
    ]
  },
  {
    title: "Performance Analytics",
    icon: BarChart3,
    content: [
      {
        subtitle: "Real-Time Metrics",
        items: [
          "📈 Live order volume tracking",
          "⚡ Processing speed analytics",
          "✅ Delivery success rates",
          "💰 Revenue and growth trends"
        ]
      },
      {
        subtitle: "Business Insights",
        items: [
          "📊 Custom report generation",
          "🎯 Performance benchmarks",
          "📅 Historical data comparison",
          "💡 Actionable insights dashboard"
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
        <Button variant="outline" size="sm">
          <HelpCircle className="mr-2 h-4 w-4" />
          Help Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <HelpCircle className="h-6 w-6" />
            Orders Dashboard Guide
          </DialogTitle>
          <DialogDescription>
            Learn how to effectively manage your orders and shipments
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-8 py-4">
            {tutorialSections.map((section, index) => (
              <div key={index} className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-xl font-semibold mb-4">
                  <section.icon className="h-6 w-6 text-primary" />
                  {section.title}
                </h3>
                <div className="space-y-6">
                  {section.content.map((subsection, subIndex) => (
                    <div key={subIndex} className="space-y-3">
                      <h4 className="text-lg font-medium text-muted-foreground">
                        {subsection.subtitle}
                      </h4>
                      <ul className="grid gap-2 text-sm">
                        {subsection.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-2 bg-accent/50 p-3 rounded-md">
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-xl font-semibold text-amber-900 mb-4">
                <AlertCircle className="h-6 w-6" />
                Pro Tips for Success
              </h3>
              <div className="grid gap-4">
                <div className="bg-white/50 rounded-md p-3 text-amber-900">
                  <span className="font-medium">⏱️ Time Management</span>
                  <p className="mt-1 text-sm">Process orders chronologically to maintain efficient workflow</p>
                </div>
                <div className="bg-white/50 rounded-md p-3 text-amber-900">
                  <span className="font-medium">✅ Quality Assurance</span>
                  <p className="mt-1 text-sm">Double-check shipping details before generating any labels</p>
                </div>
                <div className="bg-white/50 rounded-md p-3 text-amber-900">
                  <span className="font-medium">⚡ Efficiency Boost</span>
                  <p className="mt-1 text-sm">Use bulk actions whenever possible to save time</p>
                </div>
                <div className="bg-white/50 rounded-md p-3 text-amber-900">
                  <span className="font-medium">📊 Stay Informed</span>
                  <p className="mt-1 text-sm">Monitor your analytics dashboard for performance optimization</p>
                </div>
                <div className="bg-white/50 rounded-md p-3 text-amber-900">
                  <span className="font-medium">🔄 Keep Updated</span>
                  <p className="mt-1 text-sm">Maintain real-time order status updates for accurate tracking</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close Guide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}