import { NextResponse } from 'next/server';

// This API route calls the getPudoLockers Cloud Function
export async function GET() {
  try {
    // In production, this would call your Firebase Cloud Function
    // For now, returning a mock response structure
    // Replace with actual Cloud Function URL when deployed
    
    const functionUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL;
    
    if (!functionUrl) {
      throw new Error('Firebase Functions URL not configured');
    }

    const response = await fetch(`${functionUrl}/getPudoLockers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from Cloud Function');
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Pudo lockers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Pudo lockers' },
      { status: 500 }
    );
  }
}
