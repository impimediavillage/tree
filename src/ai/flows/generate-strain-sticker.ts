
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
        ? `The background should be a subtle, artistic representation of its flavors: ${flavors.join(', ')}.`
        : 'The background should be a clean, studio-quality environment with subtle, colorful influences.';

    const dispensaryNameUpper = dispensaryName.toUpperCase();
    const wellnessTreeText = "The Wellness Tree".toUpperCase();

    return `
    Generate a single, high-resolution (1000x1000 pixels), HD, studio-quality circular logo on a solid white background.
    
    **Central Artwork:**
    Create a hyper-realistic, 3D, isometric, modeling clay presentation of a cannabis bud (flower) for the strain "${strainName}". The design must be colorful and vibrant.
    ${flavorPrompt}

    **Text and Border Rules:**
    The design must be enclosed in a precise circular border.

    - **Top Arc Text:** Include "${dispensaryNameUpper}" following the **inside top curve** of the circle. The text must be perfectly spaced, starting from the left-center and arcing across the top to the right-center.

    - **Bottom Arc Text:** Include "${wellnessTreeText}" following the **inside bottom curve** of the circle. The text must be perfectly spaced, starting from the left-center (just below the top text's start) and arcing down and around to the right-center.
    
    The font for both texts should be a clean, modern, sans-serif style that complements the 3D clay aesthetic. Ensure text is readable and follows the circular path flawlessly.

    **Final Output Guidelines:**
    - The sticker must be perfectly circular on a solid white background.
    - No external shadows, noise, or watermarks.
    - High contrast, rich texture, and clean layering to emphasize depth.
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
