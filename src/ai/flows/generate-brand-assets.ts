
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
  isStore: z.boolean().describe('Whether the name provided is a store name or a strain name.'),
});
export type GenerateBrandAssetsInput = z.infer<typeof GenerateBrandAssetsInputSchema>;

const ThemeAssetSchema = z.object({
    circularStickerUrl: z.string().url(),
    rectangularStickerUrl: z.string().url(),
    capUrl: z.string().url(),
    tShirtUrl: z.string().url(),
    hoodieUrl: z.string().url(),
    stickerSheetUrl: z.string().url(),
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
const getSecondaryAssetPrompts = (circularStickerUrl: string, rectangularStickerUrl: string) => {
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

    const getPrintableStickerSheetPrompt = [
        { media: { url: circularStickerUrl } },
        { media: { url: rectangularStickerUrl } },
        { text: `You are a professional print designer. Your task is to create a print-ready sticker sheet on a clean, A4-proportioned white background.

      **Instructions:**
      1.  You are provided with two sticker designs: one circular, one rectangular.
      2.  Arrange multiple copies of both the circular and rectangular stickers onto the A4 background.
      3.  The layout should be clean, well-spaced, and optimized for printing, as if to be printed and cut out.
      4.  Ensure the stickers are rendered at a high resolution suitable for print.
      5.  Each sticker should have a subtle die-cut outline to indicate where it would be cut.

      **Final Check:** The final output is a single, A4-proportioned image that looks like a professional sticker sheet ready for printing, featuring multiple copies of both provided sticker designs.` }
    ];

    return { apparelPrompt, getPrintableStickerSheetPrompt };
};


const getCircularStickerPrompt = (style: 'hyper-realistic' | 'vector-toon' | 'retro-farmstyle', subjectName: string, isStore: boolean) => {

    const styleDetails = {
        'hyper-realistic': {
            styleDescription: 'hyper-realistic 3D rendered',
            artworkSubject: isStore 
                ? 'a vibrant, artistic representation of a premium wellness plant, featuring shimmering crystals and lush, healthy green leaves'
                : `a photorealistic wellness plant bud representing the '${subjectName}' strain`,
            fontAndBorderStyle: 'The entire design must look like a high-end 3D render with realistic textures, lighting, and depth. It should have a clean, premium, and modern feel.',
        },
        'vector-toon': {
            styleDescription: 'vibrant 2D vector cartoon',
            artworkSubject: isStore
                ? 'a fun, stylized drawing of a wellness plant or a friendly plant-themed character'
                : `a fun, personified, cartoon wellness plant bud character for the '${subjectName}' strain`,
            fontAndBorderStyle: 'Use a bright, saturated color palette with bold black outlines. The style should be fun, animated, and clean, like a modern vector illustration.',
        },
        'retro-farmstyle': {
            styleDescription: 'retro, farm-style',
            artworkSubject: isStore
                ? 'a detailed, hand-drawn or woodcut-style illustration of a wellness plant, reminiscent of vintage botanical drawings'
                : `a detailed, hand-drawn or woodcut-style illustration of the '${subjectName}' strain, reminiscent of vintage seed packets`,
            fontAndBorderStyle: 'Use a muted, earthy color palette (browns, greens, creams). The texture should feel slightly distressed or printed on old paper. The font should be a classic, slightly distressed serif or script font that fits the vintage aesthetic.',
        },
    };

    const details = styleDetails[style];

    return `Create a single, **${details.styleDescription} circular sticker** on a solid white background.
    
    **Subject:** ${details.artworkSubject}.
    
    **Style:** ${details.fontAndBorderStyle}
    
    **Branding:** The design must be enclosed in a simple, clean circular border that matches the overall style.
    - On the **top curve** of the border, elegantly incorporate the name **"${subjectName}"**.
    - On the **bottom curve** of the border, elegantly incorporate the words **"The Wellness Tree"**.
    - Both text elements must use the same bold, readable, rounded font that follows the curve of the sticker and complements the design style.
    
    **Final Check:** The output is a single, circular, ${style}-style sticker on a white background, featuring the specified subject and text.`;
};

const getRectangularStickerPrompt = (circularStickerUrl: string) => {
    return [
        { media: { url: circularStickerUrl } },
        { text: `You are a professional graphic designer. Your task is to create a rectangular sticker that perfectly complements the provided circular sticker design.

      **Instructions:**
      1.  Analyze the style, theme, and colors of the circular sticker.
      2.  Create a new **rectangular** sticker design that feels like it belongs to the same brand family. It should NOT just be the circular design on a rectangular background.
      3.  The new design must incorporate the same subject matter and visual style (e.g., if the original is hyper-realistic, the new one should also be hyper-realistic).
      4.  Ensure the final image is on a solid white background, suitable for printing.

      **Final Check:** The output is a new, creative rectangular sticker that matches the style of the input image.`
        }
    ];
};

// --- Theme Generation Pipeline ---

const generateThemeAssets = async (style: 'hyper-realistic' | 'vector-toon' | 'retro-farmstyle', name: string, isStore: boolean) => {
    const circularStickerPrompt = getCircularStickerPrompt(style, name, isStore);
    const circularStickerUrl = await generateImage(circularStickerPrompt);

    const rectangularStickerPrompt = getRectangularStickerPrompt(circularStickerUrl);
    const rectangularStickerUrl = await generateImage(rectangularStickerPrompt);

    const { apparelPrompt, getPrintableStickerSheetPrompt } = getSecondaryAssetPrompts(circularStickerUrl, rectangularStickerUrl);
    
    const [capUrl, tShirtUrl, hoodieUrl, stickerSheetUrl] = await Promise.all([
        generateImage(apparelPrompt('cap')),
        generateImage(apparelPrompt('t-shirt')),
        generateImage(apparelPrompt('hoodie')),
        generateImage(getPrintableStickerSheetPrompt),
    ]);

    return { circularStickerUrl, rectangularStickerUrl, capUrl, tShirtUrl, hoodieUrl, stickerSheetUrl };
};


// Main Flow
const generateBrandAssetsFlow = ai.defineFlow(
  {
    name: 'generateBrandAssetsFlow',
    inputSchema: GenerateBrandAssetsInputSchema,
    outputSchema: GenerateBrandAssetsOutputSchema,
  },
  async ({ name, isStore }) => {
    const [hyperRealistic, vectorToon, retroFarmstyle] = await Promise.all([
        generateThemeAssets('hyper-realistic', name, isStore),
        generateThemeAssets('vector-toon', name, isStore),
        generateThemeAssets('retro-farmstyle', name, isStore),
    ]);

    return { hyperRealistic, vectorToon, retroFarmstyle };
  }
);

export async function generateBrandAssets(input: GenerateBrandAssetsInput): Promise<GenerateBrandAssetsOutput> {
  return generateBrandAssetsFlow(input);
}
