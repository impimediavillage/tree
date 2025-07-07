
'use server';
/**
 * @fileOverview A Genkit flow for generating a themed brand asset pack (stickers, apparel).
 * - generateBrandAssets - A function that takes a subject name and generates design images in multiple styles.
 * - GenerateBrandAssetsInput - The input type for the function.
 * - GenerateBrandAssetsOutput - The return type for the function, containing URLs for all generated designs.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateBrandAssetsInputSchema = z.object({
  name: z.string().describe('The name of the store or strain for which to generate assets.'),
});
export type GenerateBrandAssetsInput = z.infer<typeof GenerateBrandAssetsInputSchema>;

const ThemeAssetSchema = z.object({
    circularStickerUrl: z.string().url(),
    rectangularStickerUrl: z.string().url(),
    capUrl: z.string().url(),
    tShirtUrl: z.string().url(),
    hoodieUrl: z.string().url(),
});

const GenerateBrandAssetsOutputSchema = z.object({
  hyperRealistic: ThemeAssetSchema,
  vectorToon: ThemeAssetSchema,
  retroFarmstyle: ThemeAssetSchema,
});
export type GenerateBrandAssetsOutput = z.infer<typeof GenerateBrandAssetsOutputSchema>;

// Helper function for a single image generation call
async function generateImage(prompt: string | ({ media: { url: string; }; } | { text: string; })[]): Promise<string> {
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: prompt,
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
            safetySettings: [ // Relaxed safety settings for creative content
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' }
            ]
        },
    });
    if (!media || !media.url) {
        throw new Error('Image generation failed to produce a valid URL.');
    }
    return media.url;
}

// Reusable function to get prompts for secondary assets
const getSecondaryAssetPrompts = (circularStickerUrl: string) => {
    const rectangularStickerPrompt = [
        { media: { url: circularStickerUrl } },
        { text: `You are a professional graphic designer. Your task is to create a rectangular sticker that perfectly complements the provided circular sticker design.

      **Instructions:**
      1.  Analyze the style, theme, and colors of the circular sticker.
      2.  Create a new **rectangular** sticker design that feels like it belongs to the same brand family. It should NOT just be the circular design on a rectangular background.
      3.  The new design must incorporate the same subject matter and visual style (e.g., if the original is a 3D clay cannabis bud, the new one should also be a 3D clay design).
      4.  Ensure the final image is on a solid white background, suitable for printing.

      **Final Check:** The output is a new, creative rectangular sticker that matches the style of the input image.`
        }
    ];

    const apparelPrompt = (apparelType: 'cap' | 't-shirt' | 'hoodie') => [
        { media: { url: circularStickerUrl } },
        { text: `You are a professional apparel mock-up designer. Your task is to create a clean, minimalist, studio-quality product mockup on a single, solid white background.

        **Instructions:**
        1.  **Use the provided circular logo image exactly as it is.** DO NOT CHANGE, ALTER, OR RECREATE THE LOGO DESIGN.
        2.  Apply this PRE-EXISTING logo design onto a plain, black ${apparelType}.
        3.  The logo should be placed prominently and realistically on the chest (for t-shirt/hoodie) or front panel (for cap).
        4.  The final image should contain ONLY the single apparel item on a solid white background. No other text, items, or distractions.

        **Final Check:** The final output is a single image of a black ${apparelType} with the provided logo, on a clean white background.`
        }
    ];

    return { rectangularStickerPrompt, apparelPrompt };
};

// --- Theme Generation Pipelines ---

const generateHyperRealisticTheme = async (name: string) => {
    const circularStickerPrompt = `Create a single, **hyper-realistic 3D rendered circular sticker** on a solid white background.
    
    **Subject:** The central theme is **"${name}"**. If it's a strain name, feature a photorealistic cannabis bud. If it's a store name, create an abstract, beautiful representation of a thriving, magical tree.
    
    **Style:** The entire design must look like a high-end 3D render with realistic textures, lighting, and depth. It should have a clean, premium, and modern feel.
    
    **Branding:** The design must be enclosed in a simple, clean circular border. Within this border, elegantly incorporate the words **"The Wellness Tree"** in a bold, readable, rounded font that follows the curve of the sticker.
    
    **Final Check:** The output is a single, circular, hyper-realistic 3D sticker on a white background, featuring the theme "${name}" and the text "The Wellness Tree".`;
    
    const circularStickerUrl = await generateImage(circularStickerPrompt);
    const { rectangularStickerPrompt, apparelPrompt } = getSecondaryAssetPrompts(circularStickerUrl);
    
    const [rectangularStickerUrl, capUrl, tShirtUrl, hoodieUrl] = await Promise.all([
        generateImage(rectangularStickerPrompt),
        generateImage(apparelPrompt('cap')),
        generateImage(apparelPrompt('t-shirt')),
        generateImage(apparelPrompt('hoodie')),
    ]);

    return { circularStickerUrl, rectangularStickerUrl, capUrl, tShirtUrl, hoodieUrl };
};

const generateVectorToonTheme = async (name: string) => {
    const circularStickerPrompt = `Create a single, **vibrant 2D vector cartoon circular sticker** on a solid white background.
    
    **Subject:** The central theme is **"${name}"**. If it's a strain name, feature a fun, personified, cartoon cannabis bud character. If it's a store name, draw a stylized, friendly, and magical tree character.
    
    **Style:** Use a bright, saturated color palette with bold black outlines. The style should be fun, animated, and clean, like a modern vector illustration.
    
    **Branding:** The design must be enclosed in a simple, bold circular border. Within this border, incorporate the words **"The Wellness Tree"** in a fun, bold, rounded, and highly readable font that follows the curve.
    
    **Final Check:** The output is a single, circular, 2D vector sticker on a white background, featuring the theme "${name}" and the text "The Wellness Tree".`;

    const circularStickerUrl = await generateImage(circularStickerPrompt);
    const { rectangularStickerPrompt, apparelPrompt } = getSecondaryAssetPrompts(circularStickerUrl);

    const [rectangularStickerUrl, capUrl, tShirtUrl, hoodieUrl] = await Promise.all([
        generateImage(rectangularStickerPrompt),
        generateImage(apparelPrompt('cap')),
        generateImage(apparelPrompt('t-shirt')),
        generateImage(apparelPrompt('hoodie')),
    ]);

    return { circularStickerUrl, rectangularStickerUrl, capUrl, tShirtUrl, hoodieUrl };
};

const generateRetroFarmstyleTheme = async (name: string) => {
    const circularStickerPrompt = `Create a single, **retro, farm-style circular sticker** on a solid white background.
    
    **Subject:** The central theme is **"${name}"**. The artwork should be a detailed, hand-drawn or woodcut-style illustration, reminiscent of vintage seed packets or rustic farm signs.
    
    **Style:** Use a muted, earthy color palette (browns, greens, creams). The texture should feel slightly distressed or printed on old paper.
    
    **Branding:** The design must be enclosed in a simple, rustic border (like a rope or a simple painted ring). Within this border, incorporate the words **"The Wellness Tree"** in a classic, slightly distressed serif or script font that fits the vintage aesthetic.
    
    **Final Check:** The output is a single, circular, retro-style sticker on a white background, featuring the theme "${name}" and the text "The Wellness Tree".`;
    
    const circularStickerUrl = await generateImage(circularStickerPrompt);
    const { rectangularStickerPrompt, apparelPrompt } = getSecondaryAssetPrompts(circularStickerUrl);

    const [rectangularStickerUrl, capUrl, tShirtUrl, hoodieUrl] = await Promise.all([
        generateImage(rectangularStickerPrompt),
        generateImage(apparelPrompt('cap')),
        generateImage(apparelPrompt('t-shirt')),
        generateImage(apparelPrompt('hoodie')),
    ]);

    return { circularStickerUrl, rectangularStickerUrl, capUrl, tShirtUrl, hoodieUrl };
};


// Main Flow
const generateBrandAssetsFlow = ai.defineFlow(
  {
    name: 'generateBrandAssetsFlow',
    inputSchema: GenerateBrandAssetsInputSchema,
    outputSchema: GenerateBrandAssetsOutputSchema,
  },
  async ({ name }) => {
    const [hyperRealistic, vectorToon, retroFarmstyle] = await Promise.all([
        generateHyperRealisticTheme(name),
        generateVectorToonTheme(name),
        generateRetroFarmstyleTheme(name),
    ]);

    return { hyperRealistic, vectorToon, retroFarmstyle };
  }
);

export async function generateBrandAssets(input: GenerateBrandAssetsInput): Promise<GenerateBrandAssetsOutput> {
  return generateBrandAssetsFlow(input);
}
