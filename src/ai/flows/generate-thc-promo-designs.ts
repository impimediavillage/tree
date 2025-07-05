
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
async function generateImage(prompt: string | ({ media: { url: string; }; } | { text: string; })[]): Promise<string> {
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
    // Shared core design brief to ensure consistency
    const coreDesignBrief = `
      The design style is a modern, magical, animated badge with a retro, Rastafarian, 420-style, *embroidered* look.
      The central element is a vibrantly animated, 3D isometric cannabis bud of the "${strain}" strain.
      The text "The Wellness Tree" and "${strain}" must curve elegantly around the inside of a circular border.
      The strain name "${strain}" must be the more prominent text, with "The Wellness Tree" smaller but still clearly readable in a bold, rounded font.
    `;

    // --- Step 1: Generate the primary logo ---
    const logoPrompt = `
      As a world-class graphic designer, create a single, high-resolution circular logo for the cannabis strain "${strain}".
      ${coreDesignBrief}
      The final image must be just the logo on a clean, solid white background. It must look like a magical, modern, retro badge with an embroidered texture.
    `;
    const logoUrl = await generateImage(logoPrompt);


    // --- Step 2: Generate the product montage USING the logo from step 1 ---
    const productMontagePrompt = [
        { media: { url: logoUrl } },
        { text: `You are a master brand designer. Your task is to create a promotional product montage on a single, clean white background.
      Use the provided circular logo image exactly as it is. DO NOT CHANGE IT.
      Apply this PRE-EXISTING logo design to the following items:
      1. A black baseball cap (logo on the front).
      2. A black t-shirt (logo large on the chest).
      3. A black hoodie (logo large on the chest).
      Also, create a long, standalone rectangular sticker that perfectly and exactly MATCHES the style of the provided logo.
      Do not invent a new logo style. Replicate the specified design precisely. All items should be well-spaced and presented attractively.`
        }
    ];
    const productMontageUrl = await generateImage(productMontagePrompt);

    // --- Step 3: Generate the sticker sheet USING the logo from step 1 ---
    const stickerSheetPrompt = [
        { media: { url: logoUrl } },
        { text: `You are a master brand designer. Your task is to create a high-resolution sticker sheet on a solid white background, ready for download and printing.
      You are given a pre-existing circular logo. Your job is to arrange this PRE-EXISTING logo design, without making any changes to it, as follows:
      - Two instances of the circular logo (license-disc size) arranged side-by-side at the top.
      - Two instances of a matching rectangular sticker, also side-by-side, below the circular logos. The rectangular sticker must match the style of the provided circular logo exactly.
      Do not invent new designs. Replicate the provided design precisely. Ensure all four stickers are well-spaced.`
        }
    ];
    const stickerSheetUrl = await generateImage(stickerSheetPrompt);

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
