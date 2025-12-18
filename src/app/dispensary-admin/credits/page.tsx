
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CreditCard, History, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { AIInteractionLog, User } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  isLoading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description, isLoading }) => (
  <Card className="bg-muted/50 border-border/50">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-bold text-[#3D2E17]">{title}</CardTitle>
      <Icon className="h-6 w-6 text-[#006B3E]" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
         <Skeleton className="h-8 w-24" />
      ) : (
        <div className="text-3xl font-extrabold text-[#3D2E17]">{value}</div>
      )}
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </CardContent>
  </Card>
);

const CHART_COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const formatAdvisorSlug = (slug: string) => {
    if (slug.startsWith('promo-asset-generator')) {
        return 'Asset Generator';
    }
    return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
};

export default function DispensaryCreditsPage() {
    const { currentUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [logs, setLogs] = useState<AIInteractionLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!currentUser?.dispensaryId) {
            if (!authLoading) setIsLoading(false);
            return;
        }

        const fetchLogs = async () => {
            setIsLoading(true);
            try {
                const logsQuery = query(
                    collection(db, "aiInteractionsLog"),
                    where("dispensaryId", "==", currentUser.dispensaryId),
                    orderBy("timestamp", "desc")
                );
                const logsSnapshot = await getDocs(logsQuery);
                const fetchedLogs: AIInteractionLog[] = logsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        timestamp: (data.timestamp as Timestamp).toDate(),
                    } as AIInteractionLog;
                });
                setLogs(fetchedLogs);
            } catch (error) {
                console.error("Error fetching credit logs:", error);
                toast({ title: "Error", description: "Could not fetch credit usage history.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchLogs();
    }, [currentUser, authLoading, toast]);
    
    const { totalCreditsUsed, assetGenCredits, advisorUsageData } = useMemo(() => {
        const total = logs.reduce((sum, log) => sum + log.creditsUsed, 0);
        
        const assetGenTotal = logs
            .filter(log => log.advisorSlug.startsWith('promo-asset-generator'))
            .reduce((sum, log) => sum + log.creditsUsed, 0);

        const usageMap = new Map<string, number>();
        logs.forEach(log => {
            const formattedSlug = formatAdvisorSlug(log.advisorSlug);
            usageMap.set(formattedSlug, (usageMap.get(formattedSlug) || 0) + log.creditsUsed);
        });

        const usageData = Array.from(usageMap.entries())
            .map(([name, credits]) => ({ name, credits }))
            .sort((a,b) => b.credits - a.credits);

        return { totalCreditsUsed: total, assetGenCredits: assetGenTotal, advisorUsageData: usageData };
    }, [logs]);

    return (
        <div className="space-y-8 p-8">
            {/* Header */}
            <div className="p-6 bg-muted/50 border border-border/50 rounded-lg shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-extrabold text-[#3D2E17]">Credit Analytics</h1>
                        <p className="text-muted-foreground mt-1">Track your store&apos;s credit balance and usage across all services</p>
                    </div>
                    <CreditCard className="h-14 w-14 text-[#006B3E]" />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <StatCard 
                    title="Current Balance"
                    value={currentUser?.credits ?? 0}
                    icon={CreditCard}
                    description="Your current available credits."
                    isLoading={authLoading}
                />
                <StatCard 
                    title="Total Credits Spent"
                    value={totalCreditsUsed}
                    icon={History}
                    description="Total credits used by your store."
                    isLoading={isLoading}
                />
                 <StatCard 
                    title="Asset Generation"
                    value={assetGenCredits}
                    icon={Sparkles}
                    description="Credits used for promo assets."
                    isLoading={isLoading}
                />
            </div>

             <Card className="bg-muted/50 border-border/50">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#3D2E17]">
                        Usage by Advisor
                    </CardTitle>
                    <CardDescription>
                        Breakdown of credits spent on each AI service.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-80 w-full" />
                    ) : advisorUsageData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={advisorUsageData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ 
                                        backgroundColor: 'hsl(var(--card))', 
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: 'var(--radius)',
                                    }}
                                    itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                                />
                                <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}/>
                                <Bar dataKey="credits" name="Credits Used" radius={[4, 4, 0, 0]}>
                                    {advisorUsageData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-80 w-full bg-muted rounded-md flex flex-col items-center justify-center">
                            <WandSparkles className="h-16 w-16 text-muted-foreground/50" />
                            <p className="mt-4 text-muted-foreground">No credit usage data to display.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-muted/50 border-border/50">
                 <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#3D2E17]">
                        Recent Transactions
                    </CardTitle>
                    <CardDescription>
                        A log of the most recent credit deductions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Service Used</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead className="text-right">Credits</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && Array.from({length: 5}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40"/></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto"/></TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && logs.slice(0, 10).map(log => (
                                <TableRow key={log.id}>
                                    <TableCell>{format(log.timestamp instanceof Date ? log.timestamp : (log.timestamp as any)?.toDate?.() || new Date(log.timestamp as any), 'PPpp')}</TableCell>
                                    <TableCell><Badge variant="secondary">{formatAdvisorSlug(log.advisorSlug)}</Badge></TableCell>
                                    <TableCell>{/* Need to fetch user displayName from log.userId if needed, for now just UID */ log.userId.substring(0,10)}...</TableCell>
                                    <TableCell className="text-right font-semibold text-destructive">-{log.creditsUsed}</TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">No transaction history found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
