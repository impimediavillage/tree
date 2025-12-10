import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    const sw = fs.readFileSync(swPath, 'utf-8');
    
    return new NextResponse(sw, {
      headers: {
        'Content-Type': 'application/javascript',
        'Service-Worker-Allowed': '/',
      },
    });
  } catch (error) {
    console.error('Error reading service worker:', error);
    return NextResponse.json({ error: 'Service worker not found' }, { status: 404 });
  }
}
