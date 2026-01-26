'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Truck, PieChart, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PayoutBreakdownCardProps {
  totalAmount: number;
  salesRevenue?: number;
  driverFees?: number;
  vendorCommissions?: number;
  showPercentages?: boolean;
}

export default function PayoutBreakdownCard({
  totalAmount,
  salesRevenue,
  driverFees,
  vendorCommissions,
  showPercentages = true
}: PayoutBreakdownCardProps) {
  // If no breakdown provided, show total only
  if (!salesRevenue && !driverFees && !vendorCommissions) {
    return (
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="h-6 w-6 text-purple-600" />
            Total Payout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-black text-purple-700">
            R{totalAmount.toFixed(2)}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            No breakdown available
          </p>
        </CardContent>
      </Card>
    );
  }

  const salesPercent = salesRevenue ? (salesRevenue / totalAmount) * 100 : 0;
  const driverPercent = driverFees ? (driverFees / totalAmount) * 100 : 0;
  const vendorPercent = vendorCommissions ? (vendorCommissions / totalAmount) * 100 : 0;

  return (
    <Card className="border-4 border-purple-300/50 bg-gradient-to-br from-white via-purple-50/30 to-white shadow-xl">
      <CardHeader className="border-b-2 border-purple-200">
        <CardTitle className="flex items-center gap-2 text-2xl font-black text-[#3D2E17]">
          <PieChart className="h-7 w-7 text-purple-600" />
          Payout Breakdown
        </CardTitle>
        <CardDescription className="text-base">
          Understanding your total payout composition
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Total Amount - Large Display */}
        <div className="text-center p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl border-2 border-purple-300">
          <p className="text-sm font-semibold text-purple-800 mb-2">TOTAL PAYOUT</p>
          <div className="text-5xl font-black text-purple-700 mb-1">
            R{totalAmount.toFixed(2)}
          </div>
          <p className="text-xs text-purple-600">
            This amount will be transferred to your account
          </p>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
            <span>Breakdown</span>
            <span className="text-xs text-gray-500">Sales • Drivers • Vendors</span>
          </div>
          <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300">
            {/* Sales Revenue Section */}
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center"
              style={{ width: `${salesPercent}%` }}
            >
              {salesPercent > 15 && (
                <span className="text-white text-xs font-bold drop-shadow">
                  {salesPercent.toFixed(0)}%
                </span>
              )}
            </div>
            {/* Driver Fees Section */}
            <div
              className="absolute top-0 h-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center"
              style={{ 
                left: `${salesPercent}%`,
                width: `${driverPercent}%` 
              }}
            >
              {driverPercent > 15 && (
                <span className="text-white text-xs font-bold drop-shadow">
                  {driverPercent.toFixed(0)}%
                </span>
              )}
            </div>
            {/* Vendor Commissions Section */}
            <div
              className="absolute right-0 top-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center"
              style={{ width: `${vendorPercent}%` }}
            >
              {vendorPercent > 15 && (
                <span className="text-white text-xs font-bold drop-shadow">
                  {vendorPercent.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          {/* Sales Revenue */}
          <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 hover:scale-105 transition-transform">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-xs font-semibold text-green-800 uppercase">Your Revenue</p>
              </div>
            </div>
            <div className="text-3xl font-black text-green-700 mb-1">
              R{(salesRevenue || 0).toFixed(2)}
            </div>
            {showPercentages && (
              <p className="text-xs text-green-600 font-semibold">
                {salesPercent.toFixed(1)}% of payout
              </p>
            )}
            <p className="text-xs text-green-700 mt-2 leading-tight">
              ✓ Keep this for your business
            </p>
          </div>

          {/* Driver Fees */}
          <div className="p-5 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-300 hover:scale-105 transition-transform">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Truck className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <p className="text-xs font-semibold text-orange-800 uppercase">Driver Fees</p>
              </div>
            </div>
            <div className="text-3xl font-black text-orange-700 mb-1">
              R{(driverFees || 0).toFixed(2)}
            </div>
            {showPercentages && (
              <p className="text-xs text-orange-600 font-semibold">
                {driverPercent.toFixed(1)}% of payout
              </p>
            )}
            <p className="text-xs text-orange-700 mt-2 leading-tight">
              ⚠️ Pay your private drivers
            </p>
          </div>

          {/* Vendor Commissions */}
          <div className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-300 hover:scale-105 transition-transform">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-800 uppercase">Vendor Commissions</p>
              </div>
            </div>
            <div className="text-3xl font-black text-blue-700 mb-1">
              R{(vendorCommissions || 0).toFixed(2)}
            </div>
            {showPercentages && (
              <p className="text-xs text-blue-600 font-semibold">
                {vendorPercent.toFixed(1)}% of payout
              </p>
            )}
            <p className="text-xs text-blue-700 mt-2 leading-tight">
              ⚠️ Pay your vendor crew
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <p className="text-sm text-blue-900 leading-relaxed">
            <strong className="font-bold">💡 How it works:</strong> The platform sends you R{totalAmount.toFixed(2)} total. 
            From this, R{(driverFees || 0).toFixed(2)} must be paid to your drivers and R{(vendorCommissions || 0).toFixed(2)} to your vendors for their commissions. 
            The remaining R{(salesRevenue || 0).toFixed(2)} is your net revenue from product sales.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
