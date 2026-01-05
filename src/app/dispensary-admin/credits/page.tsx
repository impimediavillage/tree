
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CreditCard, History, Loader2, Sparkles, WandSparkles, DollarSign, Gift, Heart, Palette } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { AIInteractionLog, User, CreditPackage } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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
    const { currentUser, setCurrentUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [logs, setLogs] = useState<AIInteractionLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
    const [isLoadingPackages, setIsLoadingPackages] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);

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

    const fetchCreditPackages = useCallback(async () => {
        setIsLoadingPackages(true);
        try {
            const packagesCollectionRef = collection(db, 'creditPackages');
            const q = query(packagesCollectionRef, where('isActive', '==', true), orderBy('price'));
            const querySnapshot = await getDocs(q);
            const fetchedPackages: CreditPackage[] = [];
            querySnapshot.forEach((doc) => {
                fetchedPackages.push({ id: doc.id, ...doc.data() } as CreditPackage);
            });
            setCreditPackages(fetchedPackages);
        } catch (error) {
            console.error("Error fetching credit packages:", error);
            toast({ title: "Error", description: "Could not load credit packages.", variant: "destructive" });
        } finally {
            setIsLoadingPackages(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchCreditPackages();
    }, [fetchCreditPackages]);

    const handlePurchase = (pkg: CreditPackage) => {
        if (!currentUser) return;

        setIsPurchasing(true);
        toast({
            title: `Simulating Purchase of ${pkg.name}`,
            description: "Processing... In a real app, this would redirect to a payment gateway.",
        });

        setTimeout(() => {
            const totalCreditsToAdd = pkg.credits + (pkg.bonusCredits || 0);
            
            const updatedUser = { 
                ...currentUser, 
                credits: (currentUser.credits || 0) + totalCreditsToAdd 
            };
            setCurrentUser(updatedUser);
            localStorage.setItem('currentUserHolisticAI', JSON.stringify(updatedUser));
            toast({
                title: "Purchase Simulated Successfully!",
                description: `You've "added" ${totalCreditsToAdd} credits. Your balance has been updated locally.`,
                variant: "default",
                duration: 7000,
            });
            setIsPurchasing(false);
        }, 2500);
    };
    
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

            {/* Top Up Credits Section */}
            <Card className="bg-gradient-to-br from-[#006B3E]/10 to-[#3D2E17]/10 border-[#006B3E]/30">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-[#3D2E17] flex items-center gap-2">
                        <DollarSign className="h-7 w-7 text-[#006B3E]" />
                        Top Up Your Credits
                    </CardTitle>
                    <CardDescription className="text-base">
                        Purchase credit packages to power your AI tools, designer services, and marketing campaigns.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingPackages ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Card key={i} className="flex flex-col">
                                    <CardHeader><Skeleton className="h-8 w-32 mx-auto" /><Skeleton className="h-12 w-full mt-2" /></CardHeader>
                                    <CardContent><Skeleton className="h-32 w-full" /></CardContent>
                                    <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : creditPackages.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-center text-muted-foreground">
                                <DollarSign className="mx-auto h-12 w-12 mb-3 text-[#006B3E]/40" />
                                <h3 className="text-xl font-semibold">No Credit Packages Available</h3>
                                <p>There are currently no credit packages available for purchase. Please check back later.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {creditPackages.map((pkg) => {
                                const packageFeatures = [
                                    { text: "Access to AI Advisors", icon: Sparkles },
                                    { text: "Creator Lab Design Tools", icon: Palette },
                                    { text: "Promo Asset Generator", icon: WandSparkles },
                                    ...(pkg.bonusCredits && pkg.bonusCredits > 0
                                        ? [{ text: `Includes ${pkg.bonusCredits} bonus credits`, icon: Gift }]
                                        : []),
                                    { text: "Grow Your Wellness Business", icon: Heart },
                                ];

                                return (
                                    <Card 
                                        key={pkg.id} 
                                        className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 bg-muted/50 border-[#006B3E]/30 hover:border-[#006B3E]"
                                    >
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-2xl font-black text-center text-[#3D2E17]">{pkg.name}</CardTitle>
                                            <p className="text-4xl font-black text-center text-[#006B3E] my-2">
                                                {pkg.price.toFixed(2)} <span className="text-xl font-bold text-muted-foreground">{pkg.currency}</span>
                                            </p>
                                            <div className="text-xl text-center font-bold">
                                                <span className="text-3xl font-black text-[#006B3E]">{pkg.credits}</span>
                                                <span className="text-muted-foreground font-bold"> Credits</span>
                                                {pkg.bonusCredits && pkg.bonusCredits > 0 && (
                                                    <Badge variant="default" className="ml-2 bg-[#B8651B] hover:bg-[#B8651B]/90 text-white font-bold">+{pkg.bonusCredits} Bonus</Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-grow flex flex-col">
                                            {pkg.description && <p className="text-sm font-semibold text-muted-foreground mb-4 text-center">{pkg.description}</p>}
                                            <ul className="space-y-2 mb-6 text-sm font-semibold">
                                                {packageFeatures.map((feature, index) => (
                                                    <li key={index} className="flex items-center gap-2">
                                                        <feature.icon className="h-5 w-5 text-[#006B3E] flex-shrink-0" />
                                                        <span>{feature.text}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <Button 
                                                className="mt-auto w-full bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] text-white text-lg font-bold py-6 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                                                onClick={() => handlePurchase(pkg)}
                                                disabled={isPurchasing}
                                            >
                                                {isPurchasing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : `Purchase ${pkg.name}`}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center mt-6">
                        Payments are processed securely. Credit purchases are non-refundable. This is a simulated purchase environment.
                    </p>
                </CardContent>
            </Card>

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
