import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const functionUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL;
    
    if (!functionUrl) {
      throw new Error('Firebase Functions URL not configured');
    }

    const response = await fetch(`${functionUrl}/createDispensaryPayoutRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payout request');
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating dispensary payout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payout request' },
      { status: 500 }
    );
  }
}
