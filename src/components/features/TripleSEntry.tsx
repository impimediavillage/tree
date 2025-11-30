'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function TripleSEntry() {
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow bg-muted/50">
      <div className="relative aspect-video w-full">
        <Image
          src="/images/ai-club-low-res/5.jpg"
          alt="Triple S Canna Club"
          fill
          className="object-cover"
          priority
        />
      </div>
      <div className="p-6 text-center">
        <h3 className="text-2xl font-black text-[#3D2E17] mb-3">
          Triple S Canna Club
        </h3>
        <p className="text-[#3D2E17] font-bold mb-4">
          Join our AI stoners club! A safe space for cannabis enthusiasts and home growers.
        </p>
        <Button
          asChild
          className="w-full bg-[#006B3E] hover:bg-[#3D2E17] text-white transition-all duration-200 active:scale-95 text-lg py-6"
        >
          <Link href="/triple-s-club">Enter Triple S Canna Club</Link>
        </Button>
      </div>
    </Card>
  );
}
