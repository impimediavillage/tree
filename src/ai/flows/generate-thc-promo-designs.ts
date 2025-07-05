
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

      **Core Concept: A Hyper-Realistic 3D Clay Badge**
      The final output must be a single, visually striking circular logo on a solid white background. The style is hyper-realistic, resembling a high-quality **3D badge sculpted from modelling clay**.

      **Visual Structure:**
      1.  **Central Artwork (Dominant Feature):**
          - This is the largest part of the badge, occupying the majority of the space to maximize visual impact.
          - The artwork features a **hyper-realistic, 3D modelling clay sculpture of a cannabis bud** for the "${strain}" strain.
          - This bud should be the centerpiece, seamlessly **merging into a vibrant, retro, 420-themed background, also rendered in a realistic clay style**. The background and the bud should feel like a single, cohesive piece of sculpted art.
      2.  **Readable Text Ring:**
          - Surrounding the central artwork is a **plain, solid-colored ring** for text.
          - There must be a **slight, clean gap** between the text and the inner and outer borders of this ring to ensure readability.
          - The text itself must also be rendered in a **3D modelling clay style**, looking as if it were sculpted.
          - The font must be **BOLD, CLEAR, and HIGHLY READABLE**.
          - The text must follow the circular curve of the ring.
          - The strain name, **"${strain.toUpperCase()}"**, and the brand name **"THE WELLNESS TREE"** must be featured.
          - Both text elements must be in **ALL CAPITAL LETTERS** and use the **SAME FONT**.
      3.  **Sculpted Clay Outer Border:**
          - The entire badge is framed by a distinct, **sculpted clay-style external border** that gives it a tactile, 3D appearance.

      **Final Quality Check:**
      - The logo is a single, circular 3D badge with a modelling clay effect.
      - The central artwork is the dominant feature, with a hyper-realistic clay cannabis bud merging into a retro 420 background made of the same material.
      - The text ring is clear, with the text ("${strain.toUpperCase()}" and "THE WELLNESS TREE") also made of clay, in all caps, with the same readable font, and having a slight gap from its borders.
      - The entire design is on a solid white background.
    `;
    const logoUrl = await generateImage(logoPrompt);


    // --- Step 2: Generate the product montage USING the logo from step 1 ---
    const productMontagePrompt = [
        { media: { url: logoUrl } },
        { text: `You are a professional product photographer and brand designer. Your task is to create a clean, minimalist, studio-quality product montage on a single, solid white background.

      **Instructions:**
      1.  **Use the provided circular logo image exactly as it is.** DO NOT CHANGE, ALTER, OR RECREATE THE LOGO DESIGN.
      2.  Apply this PRE-EXISTING logo design to the following three items:
          - A black baseball cap (logo on the front).
          - A black t-shirt (logo large on the chest).
          - A black hoodie (logo large on the chest).
      3.  Arrange the three items (cap, t-shirt, hoodie) in a visually appealing, well-spaced composition. The final image should look like a professional shot for an e-commerce store.
      4.  There should be NO other text, quotes, or elements in the image. Only the three apparel items on a white background.

      **Final Check:** The final image contains ONLY the cap, t-shirt, and hoodie with the provided logo, expertly arranged on a clean white background.`
        }
    ];
    const productMontageUrl = await generateImage(productMontagePrompt);

    // --- Step 3: Generate the sticker sheet USING the logo from step 1 ---
    const stickerSheetPrompt = [
        { media: { url: logoUrl } },
        { text: `You are a graphic designer creating a print-ready sticker sheet.

      **Instructions:**
      1.  **Use the provided circular logo image exactly as it is.** DO NOT CHANGE, ALTER, OR RECREATE THE LOGO DESIGN.
      2.  Arrange **four (4)** identical instances of this circular logo on a single, high-resolution image with a solid white background.
      3.  The arrangement should be a clean, well-spaced 2x2 grid.
      4.  Each sticker should have a subtle, thin die-cut outline to show it is a sticker.
      5.  There must be NO promotional text, quotes, or any other elements on the sheet. Just the four stickers on a white background.

      **Final Check:** The final output is a single image containing only four identical copies of the provided circular logo, arranged in a 2x2 grid on a white background.`
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
