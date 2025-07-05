
'use server';
/**
 * @fileOverview A Genkit flow for generating promotional THC strain designs.
 * - generateThcPromoDesigns - A function that takes a strain name and generates design images.
 * - GenerateThcDesignsInput - The input type for the function.
 * - GenerateThcDesignsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateThcDesignsInputSchema = z.object({
  strain: z.string().describe('The name of the THC strain for which to generate designs.'),
});
type GenerateThcDesignsInput = z.infer<typeof GenerateThcDesignsInputSchema>;

const GenerateThcDesignsOutputSchema = z.object({
  designMontageUrl: z.string().url().describe('URL of the full branding package montage.'),
  tShirtDesignUrl: z.string().url().describe('URL of the isolated 27cm circular t-shirt/hoodie design.'),
  stickerSheetUrl: z.string().url().describe('URL of the downloadable sticker sheet.'),
});
type GenerateThcDesignsOutput = z.infer<typeof GenerateThcDesignsOutputSchema>;

// Helper function for a single image generation call
async function generateImage(prompt: string): Promise<string> {
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: prompt,
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    });
    if (!media || !media.url) {
        throw new Error('Image generation failed to produce a URL.');
    }
    return media.url;
}

const generateThcPromoDesignsFlow = ai.defineFlow(
  {
    name: 'generateThcPromoDesignsFlow',
    inputSchema: GenerateThcDesignsInputSchema,
    outputSchema: GenerateThcDesignsOutputSchema,
  },
  async ({ strain }) => {
    // Define detailed prompts for each of the three required images
    const designMontagePrompt = `
      You are the world's best graphic designer, a master of modern cannabis branding.
      Create a single, large, high-resolution promotional montage image on a clean white background for the cannabis strain "${strain}".
      This montage must showcase a cohesive brand identity with a retro, modern, badge-style aesthetic and Rastafarian 420 culture influences. All elements must share this consistent look and feel.
      The montage must clearly and attractively display these five items:
      1. A round, badge-style sticker (license disc size). The design must feature a stunning, vibrantly animated 3D isometric image of a "${strain}" cannabis bud.
      2. A long rectangular standalone sticker with the same matching animated design theme.
      3. A black baseball cap with the circular badge design on the front.
      4. A black t-shirt with the circular badge design large on the chest.
      5. A black hoodie with the circular badge design large on the chest.
      For all circular designs, the text "The Wellness Tree" and "${strain}" must elegantly curve around the border. The strain name "${strain}" should be the more prominent text, with "The Wellness Tree" smaller but clearly readable. Overlay the entire montage with a subtle, spiritual, or humorous 420-style quote as promotional text.
    `;

    const tShirtDesignPrompt = `
      As a master graphic designer, generate a single, high-resolution 27cm x 27cm image on a solid white background.
      The image must be a retro, modern, badge-style circular graphic for the cannabis strain "${strain}".
      The design must feature a central, vibrantly animated 3D isometric image of the "${strain}" cannabis bud. The entire design must be cohesive and professional.
      The text "The Wellness Tree" and "${strain}" must curve perfectly inside the circular border. Ensure "${strain}" is the larger, more dominant text, and "The Wellness Tree" is smaller but perfectly legible.
      The style must be a sophisticated fusion of retro, modern, and Rastafarian 420 culture themes.
      Below the main circular graphic, add two separate lines of text:
      1. Promotional text: "Embrace the 420 Lifestyle".
      2. A small, humorous or spiritual 420-style quote.
    `;

    const stickerSheetPrompt = `
      As a top-tier brand designer, create a downloadable, high-resolution sticker sheet on a solid white background for the cannabis strain "${strain}".
      All stickers on this sheet must have a consistent, matching look and feel, characterized by a retro, modern, badge-style aesthetic with Rastafarian 420 culture influences.
      The sheet must be well-spaced and composed as follows:
      - Top row: Two identical round, badge-style, license-disc sized stickers. Each sticker must feature a vibrantly animated 3D isometric image of the "${strain}" bud. The text "The Wellness Tree" and "${strain}" must curve along the border, with "${strain}" being the more prominent text.
      - Below the top row: The marketing text "Promoting the 420 Lifestyle".
      - Bottom row: Two identical long rectangular stickers, matching the overall animated and retro theme.
      - Below the bottom row: The marketing text "The Wellness Tree".
    `;
    
    // Generate images in parallel
    const [designMontageUrl, tShirtDesignUrl, stickerSheetUrl] = await Promise.all([
      generateImage(designMontagePrompt),
      generateImage(tShirtDesignPrompt),
      generateImage(stickerSheetPrompt),
    ]);

    return {
      designMontageUrl,
      tShirtDesignUrl,
      stickerSheetUrl,
    };
  }
);

export async function generateThcPromoDesigns(input: GenerateThcDesignsInput): Promise<GenerateThcDesignsOutput> {
  return generateThcPromoDesignsFlow(input);
}
