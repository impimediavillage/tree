
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Sparkles, Leaf, Heart, Flower, Sun, Moon, Star, Zap, Wind, Droplet, Flame, TreePine, Sprout, Activity, Atom, Dna, Microscope, Beaker, Pill, Stethoscope, Eye, Smile, Users, UserCheck, Waves, Mountain, Globe, Compass, ShieldCheck, HandHelping, ArrowRight, Coins } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { AIAdvisor } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { AdvisorCard } from '@/components/advisors/AdvisorCard';

const AdvisorsPage = () => {
  const [advisors, setAdvisors] = useState<AIAdvisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchAdvisors = async () => {
      setIsLoading(true);
      try {
        const advisorsQuery = query(
          collection(db, 'aiAdvisors'),
          where('isActive', '==', true),
          orderBy('order', 'asc')
        );
        const querySnapshot = await getDocs(advisorsQuery);
        const advisorsData: AIAdvisor[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as AIAdvisor));
        setAdvisors(advisorsData);
      } catch (error) {
        console.error('Error fetching advisors:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdvisors();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4" data-tour="ai-advisors-nav">
      <div className="mb-8 bg-muted/50 border border-border/50 rounded-lg p-8 shadow-lg">
        <h1 className="text-4xl font-extrabold mb-2 flex items-center gap-2 text-[#3D2E17]">
          <Brain className="h-14 w-14 text-[#006B3E]" />
          AI Advisors
        </h1>
        <p className="text-[#3D2E17] text-lg font-extrabold">
          Consult with our specialized AI advisors for personalized wellness guidance.
          {currentUser && (
            <span className="ml-2" data-tour="credits-balance">
              Your credits: <span className="text-2xl font-black text-green-800">{currentUser.credits ?? 0}</span>
            </span>
          )}
        </p>
      </div>

      {advisors.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No advisors available at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-tour="advisor-gallery">
          {advisors.map((advisor, index) => (
            <AdvisorCard key={advisor.id} advisor={advisor} data-tour={index === 0 ? "advisor-card" : undefined} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvisorsPage;