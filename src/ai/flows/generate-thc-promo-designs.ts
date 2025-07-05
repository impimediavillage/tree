
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
      - **Overall Style:** The final image must be a single, circular logo that looks like a modern, magical, animated badge. It must have a retro, **reggae**, Rastafarian, 420-style, and a detailed **embroidered** texture.
      - **Central Image:** The main feature is a vibrantly animated, 3D isometric cannabis bud of the "${strain}" strain.
      - **Background:** The logo must be on a clean, solid white background.

      **Text Instructions (Crucial):**
      - **Placement:** Both text elements must curve elegantly around the *inside* of the circular border, located at the **top** of the badge.
      - **Content & Hierarchy:**
          1. The strain name, **"${strain}"**, must be the most prominent text.
          2. The brand name, **"The Wellness Tree"**, must appear directly *below* the strain name (still following the curve at the top). It should be in a smaller, but still bold and clearly readable, rounded font.

      **Final Check:** Ensure the text is perfectly curved, the strain name is larger, and the "The Wellness Tree" text is smaller but readable. The entire design must have a cohesive embroidered, retro-modern, reggae, and magical look.
    `;
    const logoUrl = await generateImage(logoPrompt);


    // --- Step 2: Generate the product montage USING the logo from step 1 ---
    const productMontagePrompt = [
        { media: { url: logoUrl } },
        { text: `You are a master brand designer. Your task is to create an attractive promotional product montage on a single, clean white background.

      **Instructions:**
      1.  **Use the provided circular logo image exactly as it is.** DO NOT CHANGE THE LOGO DESIGN.
      2.  Apply this PRE-EXISTING logo design attractively to the following items, ensuring they are well-spaced:
          - A black baseball cap (logo on the front).
          - A black t-shirt (logo large on the chest).
          - A black hoodie (logo large on the chest).
      3.  Subtly include a humorous, spiritual, 420-style quote somewhere in the image. The quote should be stylishly integrated into the overall composition.

      **Final Check:** The final output should be a single image containing only the cap, t-shirt, hoodie, and the quote, all on a white background.`
        }
    ];
    const productMontageUrl = await generateImage(productMontagePrompt);

    // --- Step 3: Generate the sticker sheet USING the logo from step 1 ---
    const stickerSheetPrompt = [
        { media: { url: logoUrl } },
        { text: `You are a master brand designer. Your task is to create a high-resolution sticker sheet on a solid white background, ready for download and printing.

      **Instructions:**
      1.  **Use the provided circular logo image exactly as it is.** DO NOT CHANGE THE LOGO DESIGN.
      2.  Arrange **four** identical instances of this circular logo on the sheet.
      3.  The arrangement should be a 2x2 grid, well-spaced.
      4.  Below each of the four stickers, add a small, stylish line of promotional text that promotes a 420 lifestyle and "The Wellness Tree". The text can be slightly different for each sticker but should maintain a consistent style.

      **Final Check:** The final output should be a single image containing only the four circular stickers and their respective promotional texts on a clean white background.`
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
