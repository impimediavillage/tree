'use client';

import { useOrderAnalytics } from '@/hooks/use-order-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Package2 } from 'lucide-react';

export function OrderAnalyticsDashboard() {
  const { analytics, isLoading, error } = useOrderAnalytics();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 pb-4 sm:pb-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-2 hover:border-primary/50 transition-colors bg-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-extrabold text-[#3D2E17]">Total Orders</CardTitle>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Package2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1 sm:space-y-2 p-3 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#3D2E17]">{analytics.totalOrders}</div>
            <div className="flex items-center text-xs sm:text-sm">
              {analytics.orderGrowth > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                  <span className="text-green-600 font-extrabold">+{analytics.orderGrowth.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
                  <span className="text-red-600 font-extrabold">{analytics.orderGrowth.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1 font-bold hidden sm:inline">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-colors bg-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-extrabold text-[#3D2E17]">Total Revenue</CardTitle>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1 sm:space-y-2 p-3 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#006B3E]">R {analytics.totalRevenue.toFixed(2)}</div>
            <div className="flex items-center text-xs sm:text-sm">
              {analytics.revenueGrowth > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                  <span className="text-green-600 font-extrabold">+{analytics.revenueGrowth.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
                  <span className="text-red-600 font-extrabold">{analytics.revenueGrowth.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1 font-bold hidden sm:inline">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-colors bg-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-extrabold text-[#3D2E17]">Today's Orders</CardTitle>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Package2 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1 sm:space-y-2 p-3 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#3D2E17]">{analytics.todayOrders}</div>
            <p className="text-xs sm:text-sm text-muted-foreground font-bold">
              R {analytics.todayRevenue.toFixed(2)} <span className="hidden sm:inline">revenue</span> today
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-colors bg-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-extrabold text-[#3D2E17]">Average Order</CardTitle>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1 sm:space-y-2 p-3 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#006B3E]">
              R {analytics.averageOrderValue.toFixed(2)}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-bold">Per order</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-3 sm:space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="revenue" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-2 font-extrabold data-[state=active]:bg-[#006B3E] data-[state=active]:text-white">Revenue</TabsTrigger>
          <TabsTrigger value="products" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-2 font-extrabold data-[state=active]:bg-[#006B3E] data-[state=active]:text-white">Products</TabsTrigger>
          <TabsTrigger value="status" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-2 font-extrabold data-[state=active]:bg-[#006B3E] data-[state=active]:text-white">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-3 sm:space-y-4">
          <Card className="border-2 bg-muted/50">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-extrabold text-[#3D2E17]">Daily Revenue</CardTitle>
              <CardDescription className="text-xs sm:text-sm font-bold">Revenue trends over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[350px] pt-2 sm:pt-4 p-2 sm:p-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-3 sm:space-y-4">
          <Card className="border-2 bg-muted/50">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-extrabold text-[#3D2E17]">Top Products</CardTitle>
              <CardDescription className="text-xs sm:text-sm font-bold">Best performing products by quantity sold</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[350px] pt-2 sm:pt-4 p-2 sm:p-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-3 sm:space-y-4">
          <Card className="border-2 bg-muted/50">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-extrabold text-[#3D2E17]">Order Status</CardTitle>
              <CardDescription className="text-xs sm:text-sm font-bold">Current order status distribution</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[350px] pt-2 sm:pt-4 p-2 sm:p-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={Object.entries(analytics.ordersByStatus).map(([status, count]) => ({
                    status: status.replace('_', ' '),
                    count
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="status" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Orders */}
      <Card className="border-2 bg-muted/50">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg font-extrabold text-[#3D2E17]">Recent Orders</CardTitle>
          <CardDescription className="text-xs sm:text-sm font-bold">Latest {analytics.recentOrders.length} orders from your dispensary</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="space-y-2 sm:space-y-3">
            {analytics.recentOrders.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Package2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-30" />
                <p className="text-xs sm:text-sm font-bold">No recent orders</p>
              </div>
            ) : (
              analytics.recentOrders.map(order => (
                <div key={order.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 sm:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm sm:text-base text-[#3D2E17] truncate">Order #{order.id}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground font-bold">
                        {new Date(order.createdAt.toDate()).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right sm:text-right ml-auto sm:ml-0 flex-shrink-0">
                    <p className="font-extrabold text-base sm:text-lg text-[#006B3E]">R {order.total.toFixed(2)}</p>
                    <p className="text-xs sm:text-sm capitalize">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-extrabold ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}