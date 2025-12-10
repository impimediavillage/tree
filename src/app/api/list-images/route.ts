import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), 'public', 'images', '2025-triple-s-400');
    
    if (!fs.existsSync(imagesDir)) {
      return NextResponse.json({ error: 'Images directory not found' }, { status: 404 });
    }

    const files = fs.readdirSync(imagesDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    return NextResponse.json(imageFiles);
  } catch (error) {
    console.error('Error listing images:', error);
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}
