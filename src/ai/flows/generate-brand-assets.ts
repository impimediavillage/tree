
'use server';
/**
 * @fileOverview A Genkit flow for generating a themed brand asset pack (stickers, apparel).
 * This file is structured for a two-stage generation process:
 * 1. `generateInitialLogos`: Creates five themed circular logo designs.
 * 2. `generateApparelForTheme`: Takes a chosen logo and generates the full apparel/sticker set for that theme.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
    GenerateInitialLogosInputSchema,
    GenerateInitialLogosOutputSchema,
    GenerateApparelInputSchema,
    ThemeAssetSetSchema
} from '@/lib/schemas';
import type {
    GenerateInitialLogosInput,
    GenerateInitialLogosOutput,
    GenerateApparelInput,
    ThemeAssetSet
} from '@/types';


// --- SHARED HELPERS ---

async function generateImage(prompt: string | ({ media: { url: string; }; } | { text: string; })[]): Promise<string> {
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: prompt,
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

// --- PROMPT GENERATION HELPERS ---

const getCircularStickerPrompt = (style: 'clay' | 'comic' | 'rasta' | 'farmstyle' | 'imaginative', subjectName: string, isStore: boolean) => {
    const artworkSubject = isStore
        ? 'an artistic, high-concept representation of a vibrant green wellness plant'
        : `a 3D isometric, stylized, energetic representation of the '${subjectName}' wellness plant strain`;
    
    const styleDetails = {
        'clay': {
            styleDescription: 'hyper-realistic 3D badge sculpted from modelling clay',
            artworkStyle: `The artwork features a hyper-realistic, 3D clay sculpture of ${artworkSubject}, seamlessly merging into a vibrant, retro, 420-themed background, also rendered in a realistic clay style.`,
            fontAndBorderStyle: 'The text and border must also be rendered in a 3D modelling clay style. The entire badge is framed by a distinct, sculpted clay-style external border.',
        },
        'comic': {
            styleDescription: 'vibrant 2D vector comic badge',
            artworkStyle: `The artwork features a bold, 2D vector comic-style drawing of ${artworkSubject}, merging into a vibrant, retro, 420-themed background in the same comic vector style. Use bold black outlines and flat, saturated colors.`,
            fontAndBorderStyle: 'The text must be in a bold, 2D comic book font with a strong black outline. The entire badge is framed by a distinct, bold black vector line.',
        },
        'rasta': {
            styleDescription: 'vibrant, 2D vector Rasta-Reggae badge',
            artworkStyle: `A stylized, 2D vector illustration of ${artworkSubject}, merged into a background that evokes a Rasta-Reggae theme (e.g., a sunburst pattern with red, gold, green).`,
            fontAndBorderStyle: `The text must be in a bold, friendly, slightly rounded font reminiscent of vintage reggae posters. The badge is framed by a clean vector border, possibly a tri-color stripe of red, gold, and green.`,
        },
        'farmstyle': {
            styleDescription: 'hand-painted, retro farmstand sign badge',
            artworkStyle: `A detailed, hand-painted style illustration of ${artworkSubject}, looking natural and artisanal, on a background suggesting rustic wood grain or faded burlap.`,
            fontAndBorderStyle: `The text must be in a classic, slightly distressed serif or script font. The entire badge is framed by a simple, painted ring or a border that looks like rustic rope.`,
        },
        'imaginative': {
            styleDescription: 'cosmic 420 shaman alien badge',
            artworkStyle: `A surreal, alien-like version of ${artworkSubject}, possibly glowing or with cosmic energy, merged into a mystical, shamanic background with stars, nebulae, or galaxies.`,
            fontAndBorderStyle: `The text must be in a futuristic or mystical font that is still highly readable. The border should complement the cosmic shamanic alien style.`,
        }
    };
    const details = styleDetails[style];

    return `Create a single, high-resolution, **${details.styleDescription} circular sticker** on a solid white background.
    
    **Central Artwork:** ${details.artworkStyle}
    
    **Text and Border:** The design must be enclosed in a circular border.
    - On the **top curve** of the border, incorporate the name **"${subjectName.toUpperCase()}"**.
    - On the **bottom curve** of the border, incorporate the words **"THE WELLNESS TREE"**.
    - Both text elements must use the same bold, readable, rounded font that follows the curve and complements the design style. ${details.fontAndBorderStyle}
    
    **Final Check:** The output is a single, circular, ${style}-style sticker on a white background, featuring the specified subject and text.`;
};


const getRectangularStickerPrompt = (circularStickerUrl: string) => [
    { media: { url: circularStickerUrl } },
    { text: `You are a professional graphic designer. Your task is to create a rectangular sticker that perfectly complements the provided circular sticker design. Analyze the style, theme, and colors of the circular sticker. Create a new **rectangular** sticker design that feels like it belongs to the same brand family. It should NOT just be the circular design on a rectangular background. The new design must incorporate the same subject matter and visual style (e.g., if the original is hyper-realistic, the new one should also be hyper-realistic). Ensure the final image is on a solid white background.` }
];

const getApparelPrompt = (circularStickerUrl: string, apparelType: 'cap' | 't-shirt' | 'hoodie') => [
    { media: { url: circularStickerUrl } },
    { text: `You are a professional apparel mock-up designer. Your task is to create a clean, minimalist, studio-quality product mockup on a solid white background. Use the provided circular logo image exactly as it is. DO NOT CHANGE, ALTER, OR RECREATE THE LOGO DESIGN. Apply this PRE-EXISTING logo design onto a plain, black ${apparelType}. The logo should be placed prominently and realistically on the chest (for t-shirt/hoodie) or front panel (for cap). The final image should contain ONLY the single apparel item on a solid white background.` }
];

const getPrintableStickerSheetPrompt = (circularStickerUrl: string, rectangularStickerUrl: string) => [
    { media: { url: circularStickerUrl } },
    { media: { url: rectangularStickerUrl } },
    { text: `You are a professional print designer. Create a print-ready sticker sheet on a clean, A4-proportioned white background. You are provided with two sticker designs: one circular (90mm), one rectangular (90mm high, proportionate width). Arrange multiple copies of both stickers onto the A4 background. The layout should be clean, well-spaced, and optimized for printing and cutting. Each sticker must have a subtle die-cut outline.` }
];


// --- FLOW DEFINITIONS ---

// Stage 1 Flow
const generateInitialLogosFlow = ai.defineFlow(
  {
    name: 'generateInitialLogosFlow',
    inputSchema: GenerateInitialLogosInputSchema,
    outputSchema: GenerateInitialLogosOutputSchema,
  },
  async ({ name, isStore }) => {
    const [clayLogoUrl, comicLogoUrl, rastaLogoUrl, farmstyleLogoUrl, imaginativeLogoUrl] = await Promise.all([
      generateImage(getCircularStickerPrompt('clay', name, isStore)),
      generateImage(getCircularStickerPrompt('comic', name, isStore)),
      generateImage(getCircularStickerPrompt('rasta', name, isStore)),
      generateImage(getCircularStickerPrompt('farmstyle', name, isStore)),
      generateImage(getCircularStickerPrompt('imaginative', name, isStore)),
    ]);
    return { clayLogoUrl, comicLogoUrl, rastaLogoUrl, farmstyleLogoUrl, imaginativeLogoUrl };
  }
);
export async function generateInitialLogos(input: GenerateInitialLogosInput): Promise<GenerateInitialLogosOutput> {
  return generateInitialLogosFlow(input);
}


// Stage 2 Flow
const generateApparelForThemeFlow = ai.defineFlow(
  {
    name: 'generateApparelForThemeFlow',
    inputSchema: GenerateApparelInputSchema,
    outputSchema: ThemeAssetSetSchema,
  },
  async ({ style, circularStickerUrl, subjectName }) => {
    // Generate the rectangular sticker first, as it's needed for the sheet
    const rectangularStickerUrl = await generateImage(getRectangularStickerPrompt(circularStickerUrl));

    // Generate the rest in parallel
    const [capUrl, tShirtUrl, hoodieUrl, stickerSheetUrl] = await Promise.all([
        generateImage(getApparelPrompt(circularStickerUrl, 'cap')),
        generateImage(getApparelPrompt(circularStickerUrl, 't-shirt')),
        generateImage(getApparelPrompt(circularStickerUrl, 'hoodie')),
        generateImage(getPrintableStickerSheetPrompt(circularStickerUrl, rectangularStickerUrl)),
    ]);

    return { circularStickerUrl, rectangularStickerUrl, capUrl, tShirtUrl, hoodieUrl, stickerSheetUrl };
  }
);
export async function generateApparelForTheme(input: GenerateApparelInput): Promise<ThemeAssetSet> {
    return generateApparelForThemeFlow(input);
}
