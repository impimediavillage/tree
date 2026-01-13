import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: soundPath } = await params;
    const fullPath = path.join(process.cwd(), 'public', 'sounds', ...soundPath);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Sound not found' }, { status: 404 });
    }

    const sound = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
    };
    
    return new NextResponse(sound, {
      headers: {
        'Content-Type': mimeTypes[ext] || 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error reading sound:', error);
    return NextResponse.json({ error: 'Sound not found' }, { status: 404 });
  }
}
