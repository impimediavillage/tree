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
      You are the world's best graphic designer with deep knowledge of designing stickers, caps, logos, and clothing for the modern cannabis market.
      Create a single, large promotional montage image showcasing a complete branding package for the cannabis strain "${strain}".
      The montage must clearly display these five items:
      1. A round sticker (license disc size).
      2. A long rectangular sticker.
      3. A black baseball cap with a frontal design.
      4. A black t-shirt with a 30cm circular design on the chest.
      5. A black hoodie with the same 30cm circular design on the back.
      Each design must incorporate a stunning 3D isometric image of a "${strain}" cannabis bud.
      The overall style is a fusion of retro, modern, and Rastafarian 420 culture.
      The text "The Wellness Tree" and "${strain}" must elegantly curve around the borders of the stickers and the circular clothing designs. Make "${strain}" the more prominent text, with "The Wellness Tree" slightly smaller but clearly readable. Use a modern, stylish font.
      Finally, overlay the entire montage with a humorous or spiritual 420-style quote in a stylish, semi-transparent font.
    `;

    const tShirtDesignPrompt = `
      As a master graphic designer, generate a single, high-resolution 2000x2000px PNG image of a 27cm circular graphic for the cannabis strain "${strain}".
      This design is intended for t-shirts and hoodies.
      The design must feature a central, detailed 3D isometric image of the "${strain}" cannabis bud.
      The style must be a sophisticated mix of retro, modern, and Rastafarian 420 culture themes.
      The text "The Wellness Tree" and "${strain}" must curve perfectly inside the circular border. Ensure "${strain}" is the larger, more dominant text, and "The Wellness Tree" is smaller but perfectly legible.
      The background must be fully transparent.
    `;

    const stickerSheetPrompt = `
      As a top-tier brand designer, create a downloadable, high-resolution 2000x2000px PNG sticker sheet on a solid white background for the cannabis strain "${strain}".
      The sheet must be well-spaced and composed as follows:
      - A top row with two identical round, license-disc sized stickers, side-by-side.
      - A bottom row with two identical long rectangular stickers, side-by-side.
      Each sticker must feature a unique, clean 3D isometric image of the "${strain}" bud and incorporate retro, modern, Rastafarian 420 culture design elements.
      The text "The Wellness Tree" and "${strain}" must curve along the border of each sticker, with "${strain}" being the more prominent text.
      Below each row of stickers, add marketing text promoting "420", "The Wellness Tree", and "${strain}".
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
