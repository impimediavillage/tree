
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
    // --- Step 1: Generate the primary logo ---
    const logoPrompt = `
      As a world-class graphic designer, create a single, high-resolution circular logo for the cannabis strain "${strain}".

      **Core Elements & Style:**
      - **Overall Style:** The final image must be a single, circular logo that looks like a modern, magical, animated badge. It must have a retro, Rastafarian, 420-style, and a detailed **embroidered** texture.
      - **Central Image:** The main feature is a vibrantly animated, 3D isometric cannabis bud of the "${strain}" strain.
      - **Background:** The logo must be on a clean, solid white background.

      **Text Instructions (Crucial):**
      - **Placement:** Both text elements must curve elegantly around the *inside* of the circular border, located at the **top** of the badge.
      - **Content & Hierarchy:**
          1. The strain name, **"${strain}"**, must be the most prominent text.
          2. The brand name, **"The Wellness Tree"**, must appear directly *below* the strain name (still following the curve at the top). It should be in a smaller, but still bold and clearly readable, rounded font.

      **Final Check:** Ensure the text is perfectly curved, the strain name is larger, and the "The Wellness Tree" text is smaller but readable. The entire design must have a cohesive embroidered, retro-modern, and magical look.
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
