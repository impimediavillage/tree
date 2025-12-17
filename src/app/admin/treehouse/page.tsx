'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, Package, DollarSign, TrendingUp, Shirt, MapPin } from 'lucide-react';
import TreehouseStoresTab from '@/components/admin/treehouse/TreehouseStoresTab';
import TreehouseOrdersTab from '@/components/admin/treehouse/TreehouseOrdersTab';
import { TreehousePayoutsTab } from '@/components/admin/treehouse/TreehousePayoutsTab';
import TreehouseEarningsTab from '@/components/admin/treehouse/TreehouseEarningsTab';
import ApparelItemsTab from '@/components/admin/treehouse/ApparelItemsTab';
import OriginLockerTab from '@/components/admin/treehouse/OriginLockerTab';

export default function AdminTreehousePage() {
  const [activeTab, setActiveTab] = useState('stores');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Store className="h-10 w-10 text-[#006B3E]" />
          <h1 className="text-4xl font-extrabold text-[#3D2E17]">Treehouse Management</h1>
        </div>
        <p className="text-lg text-[#5D4E37] font-semibold">
          Manage creator stores, orders, earnings, payouts, apparel, and shipping
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="stores" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Stores</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Payouts</span>
          </TabsTrigger>
          <TabsTrigger value="earnings" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Earnings</span>
          </TabsTrigger>
          <TabsTrigger value="apparel" className="flex items-center gap-2">
            <Shirt className="h-4 w-4" />
            <span className="hidden sm:inline">Apparel</span>
          </TabsTrigger>
          <TabsTrigger value="origin" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Origin</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stores" className="space-y-4">
          <TreehouseStoresTab />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <TreehouseOrdersTab />
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <TreehousePayoutsTab />
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <TreehouseEarningsTab />
        </TabsContent>

        <TabsContent value="apparel" className="space-y-4">
          <ApparelItemsTab />
        </TabsContent>

        <TabsContent value="origin" className="space-y-4">
          <OriginLockerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
