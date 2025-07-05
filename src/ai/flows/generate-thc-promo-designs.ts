'use server';
/**
 * @fileOverview A Genkit flow for generating promotional THC strain designs.
 * - generateThcPromoDesigns - A function that takes a strain name and generates design images.
 * - GenerateThcDesignsInput - The input type for the function.
 * - GenerateThcDesignsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const GenerateThcDesignsInputSchema = z.object({
  strain: z.string().describe('The name of the THC strain for which to generate designs.'),
});
export type GenerateThcDesignsInput = z.infer<typeof GenerateThcDesignsInputSchema>;

export const GenerateThcDesignsOutputSchema = z.object({
  promoImageUrl: z.string().url().describe('URL of the general promotional image.'),
  singleStickerImageUrl: z.string().url().describe('URL of the single large sticker image.'),
  fourStickerImageUrl: z.string().url().describe('URL of the four-sticker collage image.'),
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
    if (!media.url) {
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
    // Define prompts for each image
    const promoImagePrompt = `Create a vibrant, high-energy promotional graphic for a cannabis strain called "${strain}". The style should be modern, psychedelic, and suitable for streetwear like t-shirts and caps. Include abstract cannabis leaf motifs and dynamic, colorful patterns. The design should be eye-catching and artistic, avoiding any direct depiction of consumption. Text should be minimal, focusing on the strain name "${strain}" in a stylized font.`;

    const singleStickerPrompt = `Design a single, large, high-detail sticker for the cannabis strain "${strain}". The sticker should be circular (die-cut style) on a 2000x2000 transparent PNG background. The design must be bold, graphic, and suitable for a laptop or water bottle. It should creatively interpret the name "${strain}" with artistic elements. It must be professional, high quality, and visually stunning.`;

    const fourStickerPrompt = `Create a 2x2 grid of four unique, smaller sticker designs for the cannabis strain "${strain}" on a single 2000x2000 transparent PNG background. Each of the four stickers should be a different circular design, offering variations on the theme of "${strain}". The style should be consistent but distinct for each sticker, perfect for a sticker sheet. The designs should be fun, modern, and collectible.`;
    
    // Generate images in parallel
    const [promoImageUrl, singleStickerImageUrl, fourStickerImageUrl] = await Promise.all([
      generateImage(promoImagePrompt),
      generateImage(singleStickerPrompt),
      generateImage(fourStickerPrompt),
    ]);

    return {
      promoImageUrl,
      singleStickerImageUrl,
      fourStickerImageUrl,
    };
  }
);

// Export an async wrapper function that can be used as a server action.
export async function generateThcPromoDesigns(input: GenerateThcDesignsInput): Promise<GenerateThcDesignsOutput> {
  return generateThcPromoDesignsFlow(input);
}
