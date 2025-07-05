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
export type GenerateThcDesignsInput = z.infer<typeof GenerateThcDesignsInputSchema>;

const GenerateThcDesignsOutputSchema = z.object({
  designMontageUrl: z.string().url().describe('URL of the full branding package montage.'),
  tShirtDesignUrl: z.string().url().describe('URL of the isolated 27cm circular t-shirt/hoodie design.'),
  stickerSheetUrl: z.string().url().describe('URL of the downloadable sticker sheet.'),
});
export type GenerateThcDesignsOutput = z.infer<typeof GenerateThcDesignsOutputSchema>;

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
      You are the world's best graphic designer with deep knowledge of designing for the modern cannabis market.
      Create a single, large, high-resolution promotional montage image on a clean white background for the cannabis strain "${strain}".
      The montage must clearly and attractively display these five items, well-spaced:
      1. A round sticker (license disc size). The design must feature a stunning, animated-style 3D isometric image of a "${strain}" cannabis bud.
      2. A long rectangular standalone sticker with a similar design theme.
      3. A black baseball cap with the circular sticker design on the front.
      4. A black t-shirt with the circular sticker design large on the chest.
      5. A black hoodie with the circular sticker design large on the chest.
      The text "The Wellness Tree" and "${strain}" must elegantly curve around the border of the circular sticker. The strain name "${strain}" should be the more prominent text, with "The Wellness Tree" slightly smaller but clearly readable.
      The overall style is a fusion of retro, modern, and Rastafarian 420 culture.
    `;

    const tShirtDesignPrompt = `
      As a master graphic designer, generate a single, high-resolution 27cm x 27cm image on a solid white background.
      The image should contain a large circular graphic for the cannabis strain "${strain}".
      This design must feature a central, animated-style 3D isometric image of the "${strain}" cannabis bud.
      The text "The Wellness Tree" and "${strain}" must curve perfectly inside the circular border. Ensure "${strain}" is the larger, more dominant text, and "The Wellness Tree" is smaller but perfectly legible.
      The style must be a sophisticated mix of retro and modern 420 culture themes.
      Below the main circular graphic, add two separate lines of text:
      1. Promotional text: "Embrace the 420 Lifestyle".
      2. A small, humorous or spiritual 420-style quote.
    `;

    const stickerSheetPrompt = `
      As a top-tier brand designer, create a downloadable, high-resolution sticker sheet on a solid white background for the cannabis strain "${strain}".
      The sheet must be well-spaced and composed as follows:
      - Top row: Two identical round, license-disc sized stickers, side-by-side. Each sticker must feature a unique, clean, animated-style 3D isometric image of the "${strain}" bud and incorporate retro and modern 420 culture design elements. The text "The Wellness Tree" and "${strain}" must curve along the border of each sticker, with "${strain}" being the more prominent text.
      - Below the top row of circular stickers: Add the marketing text "Promoting the 420 Lifestyle".
      - Bottom row: Two identical long rectangular stickers, side-by-side, matching the overall theme.
      - Below the bottom row of rectangular stickers: Add the marketing text "The Wellness Tree".
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
