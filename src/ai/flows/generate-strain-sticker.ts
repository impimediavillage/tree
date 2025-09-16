
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
        ? `The background environment of the artwork must be a dynamic, artistic representation of its flavors: ${flavors.join(', ')}.`
        : 'The background environment of the artwork should be a clean, studio-quality environment with subtle, colorful influences.';

    const dispensaryNameUpper = dispensaryName.toUpperCase();
    const wellnessTreeText = "The Wellness Tree".toUpperCase();

    return `
    Generate a single, high-resolution (1024x1024 pixels), HD, studio-quality circular sticker design on a solid white background.

    **Central Artwork:**
    - Create a **hyper-animated, 3D isometric, modeling clay presentation** of a cannabis bud (flower) for the strain "${strainName}".
    - The clay style must be exaggerated, colorful, and vibrant, featuring intricate details like **visibly oozing THC resin** and exaggerated trichomes.
    - **Crucially, the artwork and its background environment must fill the entire circular sticker area, edge to edge.** There should be no separate internal background; the text will overlay this artwork.
    - ${flavorPrompt}

    **Text and Border Rules:**
    - The entire design must be enclosed in a precise, clean, circular border that matches the modeling clay style.
    - **Top Arc Text:** Include "${dispensaryNameUpper}" following the **inside top curve** of the circle.
    - **Bottom Arc Text:** Include "${wellnessTreeText}" following the **inside bottom curve** of the circle.
    - The text must be **overlaid directly on top of the central artwork**.
    - The font should be a clean, modern, sans-serif style that complements the 3D clay aesthetic.
    - **The text must have a subtle but clear white stroke or outline** to ensure it is perfectly readable against the colorful image behind it.
    - Ensure text is perfectly spaced and follows the circular path flawlessly.

    **Final Output Guidelines:**
    - The sticker must be perfectly circular on a solid white background.
    - No external shadows, noise, or watermarks.
    - High contrast, rich texture, and clean layering to emphasize depth and the 'hype' animated effect.
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
