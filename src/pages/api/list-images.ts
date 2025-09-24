
import { type NextApiRequest, type NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const imageDirectory = path.join(process.cwd(), 'public', 'images', '2025-triple-s-400');
    
    if (!fs.existsSync(imageDirectory)) {
        return res.status(404).json({ error: 'Image directory not found.' });
    }

    const filenames = fs.readdirSync(imageDirectory);

    const imageFiles = filenames.filter(file => file.toLowerCase().endsWith('.png'));
    
    res.status(200).json(imageFiles);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('API Error: Failed to read image directory:', errorMessage);
    res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
  }
}
