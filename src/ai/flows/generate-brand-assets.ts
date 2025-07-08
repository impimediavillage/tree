
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
        ? 'a 3D isometric, stylized, energetic representation of a hyper-detailed wellness plant'
        : `a 3D isometric, stylized, energetic representation of the '${subjectName}' wellness plant strain`;
    
    const styleDetails = {
        'clay': {
            styleDescription: 'hyper-realistic 3D badge sculpted from modelling clay',
            artworkStyle: `The artwork features a hyper-realistic, 3D clay sculpture of ${artworkSubject}, seamlessly merging into a vibrant, retro, 420-themed background, also rendered in a realistic clay style.`,
            fontAndBorderStyle: 'The text and border must also be rendered in a 3D modelling clay style. The entire badge is framed by a distinct, sculpted clay-style external border.',
        },
        'comic': {
            styleDescription: 'hyper-vibrant 2D vector comic badge',
            artworkStyle: `A hyper-vibrant and creative 2D vector comic-style drawing of ${artworkSubject}. The style should be dynamic and energetic, with exaggerated perspectives and action lines. The background is a pop-art explosion of retro 420-themed patterns and Ben-Day dots, rendered in the same dynamic comic style. Use bold, expressive black outlines and a palette of oversaturated, high-contrast colors.`,
            fontAndBorderStyle: 'The text must be in a bold, 2D comic book font with a strong black outline. The entire badge is framed by a distinct, bold black vector line.',
        },
        'rasta': {
            styleDescription: 'vibrant, 2D vector Rasta-Reggae badge',
            artworkStyle: `A vibrant, retro 420 cartoon character that is a mashup of Sonic the Hedgehog's energy and Bob Marley's rasta style. The character is dynamically posed, like a superhero, either smoking a giant stylized joint or triumphantly holding up ${artworkSubject}. The background is a psychedelic explosion of Rasta colors and patterns.`,
            fontAndBorderStyle: `The text must be in a bold, groovy, slightly rounded font reminiscent of vintage 70s reggae posters. The badge is framed by a clean vector border, possibly a tri-color stripe of red, gold, and green.`,
        },
        'farmstyle': {
            styleDescription: 'vibrant, hand-painted, retro farmstand sign badge',
            artworkStyle: `A vibrant and richly detailed, hand-painted illustration of ${artworkSubject}, in a style reminiscent of a classic, high-quality botanical drawing from a vintage seed packet, but with a modern, artisanal flair. The background is a creative composition suggesting a sun-drenched, bountiful farm with elements like rustic wood grain, faded burlap, and perhaps a subtle, retro sunburst pattern.`,
            fontAndBorderStyle: `The text must be in a classic, slightly distressed serif or script font. The entire badge is framed by a simple, painted ring or a border that looks like rustic rope.`,
        },
        'imaginative': {
            styleDescription: 'cosmic 420 rasta alien shaman badge',
            artworkStyle: `A surreal, rasta alien-like version of ${artworkSubject}, possibly glowing or with cosmic energy, merged into a mystical, shamanic background with stars, nebulae, galaxies, and subtle reggae/rasta patterns.`,
            fontAndBorderStyle: `The text must be in a futuristic or mystical font that is still highly readable. The border should complement the cosmic shamanic rasta alien style.`,
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


const getRectangularStickerPrompt = (style: 'clay' | 'comic' | 'rasta' | 'farmstyle' | 'imaginative', subjectName: string, isStore: boolean) => {
    const artworkSubject = isStore
        ? 'a 3D isometric, stylized, energetic representation of a hyper-detailed wellness plant'
        : `a 3D isometric, stylized, energetic representation of the '${subjectName}' wellness plant strain`;
    
    const styleDetails = {
        'clay': { styleDescription: 'hyper-realistic 3D sculpted from modelling clay' },
        'comic': { styleDescription: 'vibrant 2D vector comic' },
        'rasta': { styleDescription: 'vibrant, 2D vector Rasta-Reggae' },
        'farmstyle': { styleDescription: 'hand-painted, retro farmstand sign' },
        'imaginative': { styleDescription: 'cosmic 420 rasta alien shaman' }
    };
    const details = styleDetails[style];

    return `Create a single, high-resolution, **long rectangular sticker** in a **${details.styleDescription} style** on a solid white background.
    
    **Artwork:** The design must incorporate the same subject matter (${artworkSubject}) and visual style as its circular counterpart. Create a compelling rectangular composition; do NOT just place a circle on a rectangle.
    
    **Text:** The sticker must clearly and legibly incorporate the text **"${subjectName.toUpperCase()}"** and **"THE WELLNESS TREE"**. The font should be bold, readable, and match the overall design style.
    
    **Final Check:** The output is a single, rectangular, ${style}-style sticker on a white background, with integrated artwork and text.`;
};

const getApparelPrompt = (circularStickerUrl: string, apparelType: 'cap' | 't-shirt' | 'hoodie') => {
    const placement = apparelType === 't-shirt'
        ? 'placed prominently and realistically on the chest, approximately 30cm wide.'
        : 'placed prominently and realistically on the chest (for hoodie) or front panel (for cap).';
    
    return [
        { media: { url: circularStickerUrl } },
        { text: `You are a professional apparel mock-up designer. Your task is to create a clean, minimalist, studio-quality product mockup on a solid white background. Use the provided circular logo image exactly as it is. DO NOT CHANGE, ALTER, OR RECREATE THE LOGO DESIGN. Apply this PRE-EXISTING logo design onto a plain, black ${apparelType}. The logo should be ${placement} The final image should contain ONLY the single apparel item on a solid white background.` }
    ];
};

const getTrippyStickerPrompt = (circularStickerUrl: string, subjectName: string) => [
    { media: { url: circularStickerUrl } },
    { text: `Analyze the provided circular sticker. Create a new, unique circular sticker that is a **wacky, fun, and trippy reinterpretation** of the original. It must maintain the same core style (e.g., if the original is 3D clay, this must also be 3D clay) but introduce surreal, psychedelic, or humorous elements.
    
    **Text and Border:** The design must be enclosed in a circular border.
    - On the **top curve** of the border, incorporate the name **"${subjectName.toUpperCase()}"**.
    - On the **bottom curve** of the border, incorporate the words **"THE WELLNESS TREE"**.
    - The font and border style must be **DIFFERENT** from the original sticker but still complementary and wacky. Be creative with the text and border to match the trippy theme.
    
    The output should be a single, wacky circular sticker on a solid white background.` }
];

const getCircularStickerSheetPrompt = (circularStickerUrl: string) => [
    { media: { url: circularStickerUrl } },
    { text: `You are a professional print designer. Use the provided circular sticker design **exactly as it is**. Create a print-ready sticker sheet on a clean, **A4-proportioned white background (portrait orientation)**.
    
    **Layout Instructions:**
    - Arrange multiple duplicates of the provided circular sticker. Each sticker should be **90mm in diameter**.
    - The layout must be clean, well-spaced, and optimized for printing and cutting. 
    - Each individual sticker on the sheet must have a subtle die-cut outline.
    
    **Final Check:** The output is a single image containing ONLY duplicates of the provided circular sticker, neatly arranged on an A4 sheet with die-cut lines.` }
];

const getRectangularStickerSheetPrompt = (rectangularStickerUrl: string) => [
    { media: { url: rectangularStickerUrl } },
    { text: `You are a professional print designer. Use the provided rectangular sticker design **exactly as it is**. Create a print-ready sticker sheet on a clean, **A4-proportioned white background (portrait orientation)**.
    
    **Layout Instructions:**
    - Arrange multiple duplicates of the provided rectangular sticker.
    - The layout must be clean, well-spaced, and optimized for printing and cutting. 
    - Each individual sticker on the sheet must have a subtle die-cut outline.
    
    **Final Check:** The output is a single image containing ONLY duplicates of the provided rectangular sticker, neatly arranged on an A4 sheet with die-cut lines.` }
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
  async ({ style, circularStickerUrl, subjectName, isStore }) => {
    // Generate all assets that only depend on the initial inputs in parallel
    const [
        rectangularStickerUrl, 
        trippySticker1Url, 
        trippySticker2Url,
        capUrl,
        tShirtUrl,
        hoodieUrl
    ] = await Promise.all([
        generateImage(getRectangularStickerPrompt(style, subjectName, isStore)),
        generateImage(getTrippyStickerPrompt(circularStickerUrl, subjectName)),
        generateImage(getTrippyStickerPrompt(circularStickerUrl, subjectName)),
        generateImage(getApparelPrompt(circularStickerUrl, 'cap')),
        generateImage(getApparelPrompt(circularStickerUrl, 't-shirt')),
        generateImage(getApparelPrompt(circularStickerUrl, 'hoodie')),
    ]);

    // Once the circular and rectangular stickers are ready, generate the A4 sheets in parallel
    const [circularStickerSheetUrl, rectangularStickerSheetUrl] = await Promise.all([
        generateImage(getCircularStickerSheetPrompt(circularStickerUrl)),
        generateImage(getRectangularStickerSheetPrompt(rectangularStickerUrl))
    ]);

    return { 
        circularStickerUrl, 
        rectangularStickerUrl, 
        capUrl, 
        tShirtUrl, 
        hoodieUrl, 
        circularStickerSheetUrl,
        rectangularStickerSheetUrl,
        trippySticker1Url,
        trippySticker2Url
    };
  }
);
export async function generateApparelForTheme(input: GenerateApparelInput): Promise<ThemeAssetSet> {
    return generateApparelForThemeFlow(input);
}
