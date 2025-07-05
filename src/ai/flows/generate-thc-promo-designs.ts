
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
  logoUrl: z.string().url().describe('URL of the primary circular logo design.'),
  productMontageUrl: z.string().url().describe('URL of the product montage (cap, shirt, hoodie, etc.).'),
  stickerSheetUrl: z.string().url().describe('URL of the downloadable sticker sheet.'),
});
type GenerateThcDesignsOutput = z.infer<typeof GenerateThcDesignsOutputSchema>;

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
    // --- Step 1: Generate the primary logo with very specific instructions ---
    const logoPrompt = `
      You are a master graphic designer creating a single, high-resolution circular logo for the cannabis strain "${strain}".

      **Core Concept: An Animated, Embroidered Vector Badge**
      The final output must be a single circular logo that looks like a **high-quality embroidered material badge**. The style is a vibrant fusion of **retro, Rastafarian, reggae, and 420 culture** with a modern, **animated vector** feel. The entire logo must be presented on a clean, solid white background.

      **Visual Structure (from inside out):**
      1.  **Central Artwork:** In the center of the badge, create an **animated vector-style image of a cannabis bud** representing the "${strain}" strain. This artwork should seamlessly **merge with a creative, themed background** that reflects the retro, 420, and reggae style. This central area is the main artistic focus.
      2.  **Text Band:** Surrounding the central artwork, there must be a **plain, solid-colored ring** that serves as a clean background for the text. This separates the text from the complex background of the artwork.
      3.  **Text (on the plain band):**
          - The text must follow the circular curve of the band perfectly.
          - The strain name, **"${strain}"**, must be at the top, rendered in a **bold, readable, modern font**. It should be the most prominent text.
          - Directly below the strain name (also following the curve), the brand name **"The Wellness Tree"** must appear in a smaller, but still bold and clear, rounded font.
          - Both text elements must be clearly readable against their plain background.
      4.  **Outer Border:** The entire badge must be enclosed by a distinct, **embroidered-style external border** that gives the badge a tactile, 3D effect.

      **Final Quality Check:**
      - The logo is a single, circular, embroidered-style badge.
      - The central artwork is an animated vector of the strain, merging with a creative, themed background.
      - The text is placed on a separate, plain-colored circular band.
      - The text includes "${strain}" and "The Wellness Tree", is perfectly curved, and follows the specified size hierarchy.
      - The entire logo is on a solid white background.
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
