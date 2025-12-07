
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo } from 'react';
import type { AIInteractionLog, AIAdvisor } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { format, startOfDay, subDays, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Sparkles, Coins, Calendar, Award, ChevronDown, ChevronUp, Download } from 'lucide-react';

export default function LeafHistoryPage() {
  const [interactions, setInteractions] = useState<AIInteractionLog[]>([]);
  const [advisors, setAdvisors] = useState<AIAdvisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser?.uid) {
        setIsLoading(false);
        return;
    }

    const fetchHistoryAndAdvisors = async () => {
    setIsLoading(true);
    try {
        const advisorsCollectionRef = collection(db, 'aiAdvisors');
        const advisorsQuery = query(advisorsCollectionRef, orderBy('order', 'asc'));
        const advisorsSnapshot = await getDocs(advisorsQuery);
        const advisorsData: AIAdvisor[] = advisorsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as AIAdvisor));
        setAdvisors(advisorsData);

        const logsCollectionRef = collection(db, 'aiInteractionsLog');
        const q = query(
        logsCollectionRef, 
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedLogs: AIInteractionLog[] = [];
        querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedLogs.push({
            id: doc.id,
            ...data,
            timestamp: (data.timestamp as Timestamp).toDate(),
        } as AIInteractionLog);
        });
        setInteractions(fetchedLogs);
    } catch (error) {
        console.error("Error fetching interaction history and advisors:", error);
    } finally {
        setIsLoading(false);
    }
    };
    fetchHistoryAndAdvisors();
  }, [currentUser, authLoading]);

  const getAdvisorName = (advisorSlug: string) => {
    if (!advisorSlug) return 'Unknown Advisor';
    const advisor = advisors.find(a => a.slug === advisorSlug);
    return advisor ? advisor.name : advisorSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAdvisorDescription = (advisorSlug: string) => {
    const advisor = advisors.find(a => a.slug === advisorSlug);
    return advisor ? advisor.shortDescription : '';
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    if (interactions.length === 0) return null;

    const totalInteractions = interactions.length;
    const totalCredits = interactions.reduce((sum, log) => sum + (log.creditsUsed || 0), 0);
    const freeInteractions = interactions.filter(log => log.wasFreeInteraction).length;
    const paidInteractions = totalInteractions - freeInteractions;
    const avgCreditsPerInteraction = totalCredits / totalInteractions;

    // Most used advisor
    const advisorCounts: { [key: string]: number } = {};
    interactions.forEach(log => {
      if (log.advisorSlug) {
        advisorCounts[log.advisorSlug] = (advisorCounts[log.advisorSlug] || 0) + 1;
      }
    });
    const mostUsedAdvisorSlug = Object.keys(advisorCounts).length > 0 
      ? Object.keys(advisorCounts).reduce((a, b) => 
          advisorCounts[a] > advisorCounts[b] ? a : b
        )
      : null;

    // Credits over time (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), 6 - i));
      return {
        date: format(date, 'MMM dd'),
        credits: 0,
        interactions: 0,
      };
    });

    interactions.forEach(log => {
      let timestamp: Date;
      if (log.timestamp instanceof Date) {
        timestamp = log.timestamp;
      } else if (typeof log.timestamp === 'string') {
        timestamp = new Date(log.timestamp);
      } else {
        timestamp = (log.timestamp as any)?.toDate?.() || new Date();
      }
      const logDate = format(startOfDay(timestamp), 'MMM dd');
      const dayData = last7Days.find(d => d.date === logDate);
      if (dayData) {
        dayData.credits += log.creditsUsed || 0;
        dayData.interactions += 1;
      }
    });

    // Advisor usage distribution
    const advisorUsage = Object.entries(advisorCounts).map(([slug, count]) => ({
      name: getAdvisorName(slug),
      value: count,
      credits: interactions
        .filter(log => log.advisorSlug === slug)
        .reduce((sum, log) => sum + (log.creditsUsed || 0), 0),
    })).sort((a, b) => b.value - a.value);

    return {
      totalInteractions,
      totalCredits,
      freeInteractions,
      paidInteractions,
      avgCreditsPerInteraction,
      mostUsedAdvisor: mostUsedAdvisorSlug ? getAdvisorName(mostUsedAdvisorSlug) : 'N/A',
      creditsOverTime: last7Days,
      advisorUsage,
    };
  }, [interactions, advisors]);

  const COLORS = ['#006B3E', '#5D4E37', '#8B7355', '#A0826D', '#B8956A', '#D4AF6A'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="shadow-md">
          <CardContent className="p-20 text-center">
            <p className="text-muted-foreground">Loading analytics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics || interactions.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="shadow-md bg-gradient-to-br from-green-50 to-amber-50 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-[#5D4E37]">AI Interaction History</CardTitle>
            <CardDescription className="text-[#5D4E37]/70">
              Start consulting with AI advisors to see your analytics here!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center py-10 text-muted-foreground">No interaction history yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#5D4E37]/70">Total Interactions</p>
                <p className="text-3xl font-black text-[#006B3E] mt-2">{analytics.totalInteractions}</p>
              </div>
              <Sparkles className="h-10 w-10 text-[#006B3E]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#5D4E37]/70">Credits Spent</p>
                <p className="text-3xl font-black text-[#5D4E37] mt-2">{analytics.totalCredits}</p>
              </div>
              <Coins className="h-10 w-10 text-[#5D4E37]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#5D4E37]/70">Avg per Chat</p>
                <p className="text-3xl font-black text-purple-700 mt-2">{analytics.avgCreditsPerInteraction.toFixed(1)}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-700/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#5D4E37]/70">Top Advisor</p>
                <p className="text-lg font-black text-blue-700 mt-2 line-clamp-2">{analytics.mostUsedAdvisor}</p>
              </div>
              <Award className="h-10 w-10 text-blue-700/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credits Over Time Chart */}
        <Card className="shadow-lg bg-white/80 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl font-black text-[#5D4E37] flex items-center gap-2">
              <Calendar className="h-6 w-6 text-[#006B3E]" />
              Credits Spent (Last 7 Days)
            </CardTitle>
            <CardDescription className="text-[#5D4E37]/70 font-semibold">
              Track your daily AI usage and spending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics.creditsOverTime}>
                <defs>
                  <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006B3E" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#006B3E" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#5D4E37" opacity={0.1} />
                <XAxis dataKey="date" stroke="#5D4E37" fontSize={12} />
                <YAxis stroke="#5D4E37" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '2px solid #006B3E',
                    borderRadius: '8px',
                    fontWeight: 'bold'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="credits" 
                  stroke="#006B3E" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCredits)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Advisor Usage Distribution */}
        <Card className="shadow-lg bg-white/80 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl font-black text-[#5D4E37] flex items-center gap-2">
              <Award className="h-6 w-6 text-[#006B3E]" />
              Advisor Usage
            </CardTitle>
            <CardDescription className="text-[#5D4E37]/70 font-semibold">
              Your most consulted advisors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.advisorUsage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.advisorUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '2px solid #006B3E',
                    borderRadius: '8px',
                    fontWeight: 'bold'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights Card */}
      <Card className="shadow-lg bg-gradient-to-br from-green-50 via-amber-50 to-green-50 border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl font-black text-[#5D4E37]">💡 Your AI Usage Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/60 rounded-lg border border-green-200">
              <p className="text-sm font-bold text-[#5D4E37]/70 mb-1">Free Interactions</p>
              <p className="text-2xl font-black text-[#006B3E]">{analytics.freeInteractions}</p>
              <p className="text-xs text-[#5D4E37]/60 mt-1">
                {((analytics.freeInteractions / analytics.totalInteractions) * 100).toFixed(0)}% of total
              </p>
            </div>
            <div className="p-4 bg-white/60 rounded-lg border border-amber-200">
              <p className="text-sm font-bold text-[#5D4E37]/70 mb-1">Paid Interactions</p>
              <p className="text-2xl font-black text-[#5D4E37]">{analytics.paidInteractions}</p>
              <p className="text-xs text-[#5D4E37]/60 mt-1">
                {analytics.totalCredits} credits used
              </p>
            </div>
            <div className="p-4 bg-white/60 rounded-lg border border-purple-200">
              <p className="text-sm font-bold text-[#5D4E37]/70 mb-1">Efficiency Score</p>
              <p className="text-2xl font-black text-purple-700">
                {analytics.avgCreditsPerInteraction < 10 ? '⭐⭐⭐' : analytics.avgCreditsPerInteraction < 20 ? '⭐⭐' : '⭐'}
              </p>
              <p className="text-xs text-[#5D4E37]/60 mt-1">
                Based on avg credits/chat
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card className="shadow-lg bg-white/80 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black text-[#5D4E37]">Interaction History</CardTitle>
              <CardDescription className="text-[#5D4E37]/70 font-semibold">
                Detailed log of all your AI conversations
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllHistory(!showAllHistory)}
              className="hover:bg-[#006B3E] hover:text-white transition-colors"
            >
              {showAllHistory ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
              {showAllHistory ? 'Show Less' : 'Show All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(showAllHistory ? interactions : interactions.slice(0, 5)).map((log) => (
              <Card key={log.id} className="bg-gradient-to-r from-white/60 to-green-50/40 border-primary/20 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-black text-lg text-[#5D4E37]">
                          {getAdvisorName(log.advisorSlug)}
                        </h3>
                        <Badge variant={log.wasFreeInteraction ? "secondary" : "default"} className="text-xs bg-[#006B3E] text-white">
                          {log.wasFreeInteraction ? 'Free' : 'Paid'}
                        </Badge>
                      </div>
                      {getAdvisorDescription(log.advisorSlug) && (
                        <p className="text-sm text-[#5D4E37]/70 font-semibold mb-2">
                          {getAdvisorDescription(log.advisorSlug)}
                        </p>
                      )}
                      <p className="text-xs text-[#5D4E37]/60 font-medium">
                        {log.timestamp ? format(new Date(log.timestamp.toString()), 'PPPp') : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-[#006B3E]">
                        {log.creditsUsed || 0}
                      </div>
                      <div className="text-xs text-[#5D4E37]/60 font-bold">
                        credits used
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
