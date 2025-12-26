'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Package, Truck, Receipt, Sparkles } from 'lucide-react';
import { calculateCheckoutSummary, formatPrice, type CheckoutSummary as CheckoutSummaryType } from '@/lib/pricing';
import { cn } from '@/lib/utils';

interface CheckoutSummaryProps {
  items: Array<{
    productId: string;
    productName: string;
    dispensarySetPrice: number;
    quantity: number;
    isProductPool?: boolean;
    imageUrl?: string;
  }>;
  shippingCost: number;
  taxRate: number;
  currency?: string;
  className?: string;
}

export function CheckoutSummary({ 
  items, 
  shippingCost, 
  taxRate, 
  currency = 'ZAR',
  className 
}: CheckoutSummaryProps) {
  
  const summary: CheckoutSummaryType = calculateCheckoutSummary(items, shippingCost, taxRate);

  return (
    <Card className={cn(
      "border-2 border-[#006B3E]/20 shadow-2xl backdrop-blur-sm bg-white/90",
      "hover:shadow-[0_0_30px_rgba(0,107,62,0.3)] transition-all duration-500",
      className
    )}>
      {/* Header */}
      <CardHeader className="space-y-2 bg-gradient-to-br from-[#006B3E]/10 via-[#3D2E17]/5 to-transparent border-b-2 border-[#006B3E]/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-black text-[#3D2E17] flex items-center gap-3">
            <div className="p-2 bg-[#006B3E] rounded-xl shadow-lg">
              <ShoppingCart className="h-7 w-7 text-white" />
            </div>
            Order Summary
          </CardTitle>
          <Badge variant="secondary" className="bg-[#006B3E]/20 text-[#3D2E17] font-bold px-4 py-1.5 text-sm">
            {items.reduce((sum, item) => sum + item.quantity, 0)} Items
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        
        {/* Items List */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-[#006B3E]" />
            <h3 className="text-sm font-black text-[#3D2E17] uppercase tracking-wide">Your Products</h3>
          </div>
          
          {summary.items.map((item, index) => (
            <div 
              key={item.productId}
              className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-[#006B3E]/5 to-transparent border border-[#006B3E]/10 hover:border-[#006B3E]/30 transition-all duration-300 group"
            >
              <div className="flex items-center gap-3 flex-1">
                {items[index]?.imageUrl && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-[#006B3E]/20 group-hover:border-[#006B3E]/50 transition-all">
                    <img 
                      src={items[index].imageUrl} 
                      alt={item.productName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#3D2E17] group-hover:text-[#006B3E] transition-colors">
                    {item.productName}
                  </p>
                  <p className="text-xs font-semibold text-[#3D2E17]/60">
                    Qty: {item.quantity}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-[#006B3E]">
                  {formatPrice(item.lineTotal, currency)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-[#006B3E]/20" />

        {/* Calculation Breakdown */}
        <div className="space-y-3">
          
          {/* Items Subtotal */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#3D2E17]/5 border border-[#3D2E17]/10">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#3D2E17]/70" />
              <span className="text-sm font-bold text-[#3D2E17]">Items Subtotal</span>
            </div>
            <span className="text-base font-black text-[#3D2E17]">
              {formatPrice(summary.itemsTotal, currency)}
            </span>
          </div>

          {/* Shipping */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#3D2E17]/5 border border-[#3D2E17]/10">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#3D2E17]/70" />
              <span className="text-sm font-bold text-[#3D2E17]">Shipping</span>
            </div>
            <span className="text-base font-black text-[#3D2E17]">
              {shippingCost === 0 ? 'FREE' : formatPrice(summary.shipping, currency)}
            </span>
          </div>

          {/* Tax */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#006B3E]/10 border border-[#006B3E]/20">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#006B3E]" />
              <span className="text-sm font-bold text-[#3D2E17]">
                Tax ({taxRate}%)
              </span>
            </div>
            <span className="text-base font-black text-[#006B3E]">
              {formatPrice(summary.tax, currency)}
            </span>
          </div>
        </div>

        <Separator className="bg-[#006B3E]/30 h-0.5" />

        {/* Total */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#006B3E] via-[#006B3E]/95 to-[#005230] shadow-xl border-2 border-[#006B3E]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">
                Total Amount
              </p>
              <p className="text-3xl font-black text-white drop-shadow-lg">
                {formatPrice(summary.total, currency)}
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <Sparkles className="h-8 w-8 text-white animate-pulse" />
            </div>
          </div>
        </div>

        {/* Tax Compliance Note */}
        <div className="p-3 rounded-lg bg-[#3D2E17]/5 border border-[#3D2E17]/10">
          <p className="text-xs font-semibold text-[#3D2E17]/70 text-center leading-relaxed">
            <span className="inline-flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              Tax-compliant pricing
            </span>
            {' • '}
            All amounts include applicable {taxRate}% tax
          </p>
        </div>

      </CardContent>
    </Card>
  );
}
