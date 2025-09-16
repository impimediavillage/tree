
'use server';
/**
 * @fileOverview A Genkit flow for generating a single, themed sticker for a cannabis strain.
 */

import { ai } from '@/ai/genkit';
import type { GenerateStrainStickerInput, GenerateStrainStickerOutput } from '@/types';
import { GenerateStrainStickerInputSchema, GenerateStrainStickerOutputSchema } from '@/lib/schemas';


async function generateImage(prompt: string): Promise<string> {
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt,
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
            safetySettings: [
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

const getStickerPrompt = (input: GenerateStrainStickerInput): string => {
    const { strainName, dispensaryName, flavors } = input;
    
    const flavorPrompt = (flavors && flavors.length > 0) 
        ? `The flavors of **${flavors.join(', ')}** must be visualized as colorful, hyper-animated elements **oozing and swirling directly out from the bud**, blending into the dynamic background.`
        : 'The background should be a dynamic and colorful abstract environment.';

    return `
    Generate a single, high-resolution (1024x1024 pixels), HD, studio-quality circular sticker design on a solid white background.

    **Core Concept:** A hyper-animated, 3D isometric, modeling clay world contained within a sticker.

    **Central Artwork (Focal Point):**
    - **Subject:** At the absolute center, create a **characterful, cartoonish cannabis bud** for the strain "${strainName}". It should have a playful and humorous personality, as if it's a character in a 3D animation.
    - **Style:** It must be a **hyper-animated, 3D isometric, modeling clay creation, like a frame from a high-end 3D animation**. The style should be exaggerated, colorful, and vibrant.
    - **Details:** The bud must feature intricate details like **extra thick, visibly oozing and dripping THC resin and honey**. It must have **rainbows bursting out from within it**, and the trichomes must be exaggerated and colorful.

    **Background:**
    - **Full Bleed & Flavor Integration:** The background must be a **full-bleed, hyper-detailed environment that covers the entire circular area**. ${flavorPrompt} The background itself must appear to be **oozing with extra colorful honey and THC resin, featuring rainbows bursting towards and around the central bud**, and have **rays of light bursting outward from the center**.

    **Text and Border Rules (CRITICAL ACCURACY):**
    - **Border:** The entire design must be enclosed in a precise, clean, circular border that matches the modeling clay style.
    - **Text Elements & Placement:** There are three text elements with specific placements. They must be perfectly curved along the border.
        1.  **Top-Left Arc:** Place **"${dispensaryName}"** along the top-left curve.
        2.  **Top-Right Arc:** Place **"${strainName}"** along the top-right curve.
        3.  **Bottom Arc:** Place **"The Wellness Tree"** centered along the bottom curve.
    - **IMPORTANT:** The text above must be spelled **EXACTLY** as written. Pay special attention to ensure perfect accuracy.
    - **Font & Style:**
        - The font must be a **bold, clean, modern, sans-serif style** that is easy to read.
        - **Crucially, all text must have a subtle but clear white stroke or outline** to ensure it is perfectly readable and stands out against the colorful image behind it.
    - **Positioning:** Text must be perfectly curved to follow the circular path flawlessly, with proper letter spacing to ensure it spans its designated arc gracefully.

    **Final Output Checklist:**
    1.  **Single Object:** The output is one single, perfectly circular sticker.
    2.  **Background:** The sticker is on a solid, plain white background.
    3.  **Composition:** The cannabis bud is centered, and the background fills the entire sticker.
    4.  **Style:** The entire design (bud, background, border, text) is a cohesive, hyper-animated, 3D modeling clay style.
    5.  **Text Readability:** All three text elements are bold, have a white outline, and are clearly legible over the artwork.
    6.  **Text Accuracy & Placement:** The three text elements are spelled exactly as specified and placed in their designated positions (top-left, top-right, bottom).
    `;
};


const generateStrainStickerFlow = ai.defineFlow(
  {
    name: 'generateStrainStickerFlow',
    inputSchema: GenerateStrainStickerInputSchema,
    outputSchema: GenerateStrainStickerOutputSchema,
  },
  async (input) => {
    const prompt = getStickerPrompt(input);
    const imageUrl = await generateImage(prompt);
    return { imageUrl };
  }
);


export async function generateStrainSticker(input: GenerateStrainStickerInput): Promise<GenerateStrainStickerOutput> {
  return generateStrainStickerFlow(input);
}
