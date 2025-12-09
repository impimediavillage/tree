import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const imagesDirectory = path.join(process.cwd(), 'public', 'images', 'ai-club-low-res');
    
    // Check if directory exists
    if (!fs.existsSync(imagesDirectory)) {
      return NextResponse.json({ images: [], error: 'Directory not found' }, { status: 404 });
    }

    // Read all files in the directory
    const files = fs.readdirSync(imagesDirectory);
    
    // Filter for JPG files and create full paths, excluding 5.jpg
    const imageFiles = files
      .filter(file => file.toLowerCase().endsWith('.jpg') && !file.startsWith('5.'))
      .map(file => `/images/ai-club-low-res/${file}`)
      .sort((a, b) => {
        // Extract numbers from filenames for proper sorting
        const numA = parseInt(a.match(/\/(\d+)\.jpg$/)?.[1] || '0');
        const numB = parseInt(b.match(/\/(\d+)\.jpg$/)?.[1] || '0');
        return numA - numB;
      });

    return NextResponse.json({ images: imageFiles, count: imageFiles.length });
  } catch (error) {
    console.error('Error reading AI club images directory:', error);
    return NextResponse.json({ images: [], error: 'Failed to read directory' }, { status: 500 });
  }
}
