
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
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: prompt,
        config: {
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
        ? 'a 3D stylized wellness plant with mystical smoke'
        : `a 3D isometric, stylized, energetic representation of the '${subjectName}' wellness plant strain`;
    
    const styleDetails = {
        'clay': {
            styleDescription: 'hyper-realistic 3D badge sculpted from modeling clay',
            artworkStyle: `A hyper-detailed, 3D clay sculpture of **${artworkSubject}**, merged into a vibrant, retro 420-themed clay environment with sculpted texture lighting.`,
            fontAndBorderStyle: `The entire border and text must be sculpted from modeling clay with natural imperfection, casting realistic shadows.`,
        },
        'comic': {
            styleDescription: 'bold, high-contrast 2D vector comic badge',
            artworkStyle: `Bold, flat-color vector art of **${artworkSubject}** in a comic panel style. Use thick outlines, halftone shading, and retro-pop color combinations.`,
            fontAndBorderStyle: `Strong 2D comic book font with black outlines; clean, thick vector ring outline.`,
        },
        'rasta': {
            styleDescription: 'vivid 2D reggae-inspired vector badge',
            artworkStyle: `Reggae-themed stylized illustration of **${artworkSubject}** with red-gold-green sunbursts, psychedelic gradients, or tribal linework in the background.`,
            fontAndBorderStyle: `Friendly, softly rounded reggae-style font. Use a smooth circular vector ring or tri-color border.`,
        },
        'farmstyle': {
            styleDescription: 'rustic, hand-painted retro farmstand badge',
            artworkStyle: `A classic, brush-painted rendering of **${artworkSubject}** on a backdrop that looks like wood, burlap, or faded paint signage.`,
            fontAndBorderStyle: `Slightly worn serif or script font, hand-lettered. Outer ring looks like rope, woodgrain, or paint stroke.`,
        },
        'imaginative': {
            styleDescription: 'cosmic, rasta-alien-shaman badge with psychedelic energy',
            artworkStyle: `Surreal, mystical version of **${artworkSubject}**, glowing or ethereal, surrounded by cosmic effects (nebulae, tribal stars, astral lines).`,
            fontAndBorderStyle: `Futuristic or cosmic rune-like font; circular border made of energy trails, stars, or geometric rasta patterns.`,
        }
    };
    
    const details = styleDetails[style];
    const subjectName_UPPERCASE = subjectName.toUpperCase();

    return `Generate a single, high-resolution **${details.styleDescription}** circular badge-style sticker on a **solid white background**.

🌀 CENTRAL ARTWORK:
- Center the composition with a hyper-clear, modern, vibrant interpretation of **${artworkSubject}**.
- The artwork should use **${details.artworkStyle}** to blend the subject into a cohesive background, using **strong lighting**, **rich textures**, and **vivid, contrasting colors** to create a bold focal point.

🧾 TEXT & BORDER RULES:
- The design must be enclosed in a **precise circular border**.
- **Top Arc Text:** Include "${subjectName_UPPERCASE}" following the top curve of the circle.
- **Bottom Arc Text:** Include "THE WELLNESS TREE" on the bottom curve.
- Both texts must follow the circle perfectly and use the **${details.fontAndBorderStyle}** to match the design language.
- Ensure the text is bold, readable, cleanly curved, and **visually balanced** around the sticker’s circumference.

✅ FINAL OUTPUT GUIDELINES:
- The sticker should appear completely circular, professionally composed, and centered on a plain white background.
- There should be no external shadows, noise, or watermarks.
- Use high contrast, rich texture, and clean layering to emphasize depth and visual pop.
- All elements should be balanced: central image, curved text, and border should work harmoniously.`;
};


const getRectangularStickerPrompt = (style: 'clay' | 'comic' | 'rasta' | 'farmstyle' | 'imaginative', subjectName: string, isStore: boolean) => {
    const artworkSubject = isStore
        ? 'a 3D stylized wellness plant with mystical smoke'
        : `a 3D isometric, stylized, energetic representation of the '${subjectName}' wellness plant strain`;
    
    const styleDetails = {
        'clay': { styleDescription: 'hyper-realistic 3D sculpted from modelling clay' },
        'comic': { styleDescription: 'vibrant 2D vector comic' },
        'rasta': { styleDescription: 'vivid 2D reggae-inspired vector' },
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
