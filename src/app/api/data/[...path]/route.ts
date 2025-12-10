import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: dataPath } = await params;
    const fullPath = path.join(process.cwd(), 'public', 'data', ...dataPath);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Data file not found' }, { status: 404 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    
    if (ext === '.json') {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      return NextResponse.json(data);
    }
    
    // For other file types
    const content = fs.readFileSync(fullPath);
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.xml': 'application/xml',
    };
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error reading data file:', error);
    return NextResponse.json({ error: 'Data file not found' }, { status: 404 });
  }
}
