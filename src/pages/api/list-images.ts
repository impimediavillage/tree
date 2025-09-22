
import { type NextApiRequest, type NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const imageDirectory = path.join(process.cwd(), 'public', 'images', '2025-triple-s-400');
    
    // Check if directory exists
    if (!fs.existsSync(imageDirectory)) {
        console.error("API Error: Directory not found at", imageDirectory);
        return res.status(404).json({ error: 'Image directory not found.' });
    }

    const filenames = fs.readdirSync(imageDirectory);
    
    if (filenames.length === 0) {
        console.warn("API Warning: Image directory is empty at", imageDirectory);
        return res.status(200).json([]);
    }

    const imageFiles = filenames.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
    
    res.status(200).json(imageFiles);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('API Error: Failed to read image directory:', errorMessage);
    res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
  }
}
