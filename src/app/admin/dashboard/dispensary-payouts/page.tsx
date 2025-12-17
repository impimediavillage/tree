'use client';

import { DollarSign } from 'lucide-react';
import DispensaryPayoutsTab from '@/components/admin/dispensary/DispensaryPayoutsTab';

export default function AdminDispensaryPayoutsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 p-6 bg-muted/50 border border-border/50 rounded-lg shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="h-14 w-14 text-[#006B3E]" />
          <h1 className="text-4xl font-extrabold text-[#3D2E17]">Dispensary Payouts</h1>
        </div>
        <p className="text-lg text-[#5D4E37] font-semibold">
          Review and process payout requests from dispensaries
        </p>
      </div>

      {/* Payouts Management Component */}
      <div className="bg-muted/50 border border-border/50 rounded-lg shadow-lg p-6">
        <DispensaryPayoutsTab />
      </div>
    </div>
  );
}
