
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
      As a world-class graphic designer specializing in modern branding, create a single, high-resolution circular logo for the cannabis strain "${strain}". The final image must be a **hyper-animated, modern badge** with a vibrant, retro, Rastafarian, and 420-friendly style.

      **Core Elements & Style:**
      - **Central Image:** At the center, there must be a **3D isometric, animated cartoon-style** cannabis bud representing the "${strain}" strain. It should be colorful and engaging.
      - **Background:** The background inside the badge must be a creative and **animated cartoon scene that thematically matches the strain's name, "${strain}"**. For example, if the strain is "Blue Dream," the background might be a dreamy, blue sky with cartoon clouds. The entire logo must be presented on a final solid white background for easy use.
      - **Overall Look:** The badge must look polished, modern, and magical, like a collectible item from a high-end animated series.

      **Text Instructions (Crucial):**
      - **Placement & Style:** The text must be placed at the top of the badge, following the curve of the circular border perfectly.
      - **Content & Hierarchy:**
          1. The strain name, **"${strain}"**, must be the most prominent text, using a bold, stylish, and easily readable modern font.
          2. The brand name, **"The Wellness Tree"**, must appear directly below the strain name, also curved. This text must be in a smaller, but still bold and clear, rounded font.

      **Final Check:** The output is a single circular logo. Text is perfectly curved and readable. The hierarchy between the strain name and brand name is clear. The style is a consistent fusion of retro, Rasta, 420 culture, and modern animation.
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
