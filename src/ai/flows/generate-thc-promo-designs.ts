
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
  logoUrl: z.string().url().describe('URL of the primary circular logo design.'),
  productMontageUrl: z.string().url().describe('URL of the product montage (cap, shirt, hoodie, etc.).'),
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
    const logoPrompt = `
      As a world-class graphic designer, create a single, high-resolution circular logo for the cannabis strain "${strain}".
      The design must have a modern, retro, Rastafarian, 420-style, *embroidered* look.
      The central element must be a vibrantly animated, 3D isometric cannabis bud of the "${strain}" strain.
      The text "The Wellness Tree" and "${strain}" must curve elegantly around the inside of the circular border.
      The strain name "${strain}" must be the more prominent text, with "The Wellness Tree" smaller but clearly readable.
      The final image should be just the logo on a clean, solid white background.
    `;

    const productMontagePrompt = `
      You are a master brand designer. You have just created a circular, embroidered-style logo for the cannabis strain "${strain}".
      Now, create a promotional product montage on a single, clean white background.
      This image must showcase that *exact* logo design applied to the following items:
      1. A black baseball cap (logo on the front).
      2. A black t-shirt (logo large on the chest).
      3. A black hoodie (logo large on the chest).
      Also, include a long, standalone rectangular sticker that perfectly matches the embroidered, retro-modern style of the circular logo.
      All items should be well-spaced and presented attractively.
    `;

    const stickerSheetPrompt = `
      You are a master brand designer. You have just created a circular, embroidered-style logo and a matching rectangular sticker for the cannabis strain "${strain}".
      Now, create a high-resolution sticker sheet on a solid white background, ready for download and printing.
      The sheet must contain two instances of the circular logo (license-disc size) arranged side-by-side at the top.
      Below them, include two instances of the matching rectangular sticker, also side-by-side.
      Ensure all four stickers are well-spaced.
    `;
    
    // Generate images in parallel
    const [logoUrl, productMontageUrl, stickerSheetUrl] = await Promise.all([
      generateImage(logoPrompt),
      generateImage(productMontagePrompt),
      generateImage(stickerSheetPrompt),
    ]);

    return {
      logoUrl,
      productMontageUrl,
      stickerSheetUrl,
    };
  }
);

export async function generateThcPromoDesigns(input: GenerateThcDesignsInput): Promise<GenerateThcDesignsOutput> {
  return generateThcPromoDesignsFlow(input);
}
