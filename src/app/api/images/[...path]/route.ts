import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: imagePath } = await params;
    const fullPath = path.join(process.cwd(), 'public', 'images', ...imagePath);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const image = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };
    
    return new NextResponse(image, {
      headers: {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error reading image:', error);
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }
}
