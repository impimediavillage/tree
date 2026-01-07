import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET(
  request: NextRequest,
  { params }: { params: { dispensaryId: string } }
) {
  try {
    const { dispensaryId } = params;

    if (!dispensaryId) {
      return NextResponse.json(
        { error: 'Dispensary ID is required' },
        { status: 400 }
      );
    }

    // Fetch dispensary data from Firestore
    const { doc, getDoc } = await import('firebase/firestore');
    const dispensaryRef = doc(db, 'dispensaries', dispensaryId);
    const dispensaryDoc = await getDoc(dispensaryRef);

    if (!dispensaryDoc.exists()) {
      return NextResponse.json(
        { error: 'Dispensary not found' },
        { status: 404 }
      );
    }

    const dispensary = dispensaryDoc.data();

    // Generate dynamic manifest with dispensary branding
    const manifest = {
      name: dispensary?.dispensaryName || 'Wellness Store',
      short_name: dispensary?.dispensaryName?.substring(0, 12) || 'Store',
      description: `${dispensary?.dispensaryName} - Your trusted wellness destination`,
      start_url: `/store/${dispensaryId}`,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#006B3E',
      orientation: 'portrait-primary',
      icons: [
        // Use custom storeIcon if available, otherwise fallback to default
        ...(dispensary?.storeIcon
          ? [
              {
                src: dispensary.storeIcon,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable',
              },
              {
                src: dispensary.storeIcon,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
            ]
          : [
              {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable',
              },
              {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
            ]),
      ],
      categories: ['health', 'wellness', 'shopping'],
      screenshots: dispensary?.storeImage
        ? [
            {
              src: dispensary.storeImage,
              sizes: '1280x720',
              type: 'image/png',
            },
          ]
        : [],
    };

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating dynamic manifest:', error);
    return NextResponse.json(
      { error: 'Failed to generate manifest' },
      { status: 500 }
    );
  }
}
