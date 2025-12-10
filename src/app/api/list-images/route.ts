import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function GET() {
  try {
    const imageDirectory = path.join(process.cwd(), 'public', 'images', '2025-triple-s-400');
    
    if (!fs.existsSync(imageDirectory)) {
      return NextResponse.json({ error: 'Image directory not found.' }, { status: 404 });
    }

    const filenames = fs.readdirSync(imageDirectory);
    
    // Filter for PNG files only (strain stickers are PNG)
    const imageFiles = filenames.filter(file => file.toLowerCase().endsWith('.png'));
    
    // Randomly select 33 stickers server-side for bandwidth efficiency
    const shuffled = shuffleArray(imageFiles);
    const randomSelection = shuffled.slice(0, 33);
    
    return NextResponse.json(randomSelection);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('API Error: Failed to read image directory:', errorMessage);
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}
