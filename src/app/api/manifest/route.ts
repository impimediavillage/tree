import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    return NextResponse.json(manifest);
  } catch (error) {
    console.error('Error reading manifest:', error);
    return NextResponse.json({ error: 'Manifest not found' }, { status: 404 });
  }
}
