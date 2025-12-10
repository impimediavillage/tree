import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: iconPath } = await params;
    const fullPath = path.join(process.cwd(), 'public', 'icons', ...iconPath);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Icon not found' }, { status: 404 });
    }

    const icon = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.ico': 'image/x-icon',
      '.svg': 'image/svg+xml',
    };
    
    return new NextResponse(icon, {
      headers: {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error reading icon:', error);
    return NextResponse.json({ error: 'Icon not found' }, { status: 404 });
  }
}
