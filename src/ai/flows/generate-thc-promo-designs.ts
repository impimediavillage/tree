
'use server';
/**
 * @fileOverview A Genkit flow for generating promotional THC strain designs on-demand.
 * - generateSingleThemedLogo: Creates a single logo for a specific theme.
 * - generateThemeAssets: Creates the full asset pack (montage, stickers) for a given theme.
 * - findStrainImage: A utility to find/generate a photorealistic image for a strain.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the inputs/outputs for the flows.
const GenerateThemedLogoInputSchema = z.object({
  strain: z.string().describe('The name of the THC strain.'),
  theme: z.enum(['clay', 'comic', 'rasta', 'farmstyle', 'imaginative']),
});
const GenerateThemedLogoOutputSchema = z.object({
  logoUrl: z.string().url(),
});

const GenerateThemeAssetsInputSchema = z.object({
  strain: z.string(),
  theme: z.enum(['clay', 'comic', 'rasta', 'farmstyle', 'imaginative']),
  logoUrl: z.string().url(),
});
const GenerateThemeAssetsOutputSchema = z.object({
  logoUrl: z.string().url(),
  productMontageUrl: z.string().url(),
  stickerSheetUrl: z.string().url(),
});

// Helper function for a single image generation call
async function generateImage(prompt: string | ({ media: { url: string; }; } | { text: string; })[]): Promise<string> {
    const { media } = await ai.generate({
        model: 'googleai/gemini-pro-vision',
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
        throw new Error('Image generation failed to produce a URL.');
    }
    return media.url;
}


// --- DYNAMIC PROMPT BUILDERS USING THE UNIFIED TEMPLATE ---

const getUnifiedStickerPrompt = (style: 'clay' | 'comic' | 'rasta' | 'farmstyle' | 'imaginative', strainName: string) => {
    const artworkSubject = `a hyper-detailed, 3D clay sculpture of a cannabis bud for the "${strainName}" strain`;
    
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
    const subjectName_UPPERCASE = strainName.toUpperCase();

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


const getProductMontagePrompt = (logoUrl: string) => [
    { media: { url: logoUrl } },
    { text: `You are a professional product photographer. Create a clean, minimalist, studio-quality product montage on a solid white background. Use the provided circular logo image exactly as it is. DO NOT CHANGE OR RECREATE THE LOGO. Apply this logo to a black baseball cap, a black t-shirt, and a black hoodie. Arrange the three items in a visually appealing composition. The final image should contain ONLY the three apparel items on a white background.` }
];

const getStickerSheetPrompt = (logoUrl: string) => [
    { media: { url: logoUrl } },
    { text: `You are a graphic designer. Use the provided circular logo image exactly as it is. Arrange four identical copies of this logo in a clean 2x2 grid on a single, high-resolution image with a solid white background. Each sticker must have a subtle die-cut outline.` }
];


// --- REFACTORED & NEW FLOWS ---

const generateSingleThemedLogoFlow = ai.defineFlow(
  {
    name: 'generateSingleThemedLogoFlow',
    inputSchema: GenerateThemedLogoInputSchema,
    outputSchema: GenerateThemedLogoOutputSchema,
  },
  async ({ strain, theme }) => {
    const logoPrompt = getUnifiedStickerPrompt(theme, strain);
    const logoUrl = await generateImage(logoPrompt);
    return { logoUrl };
  }
);


const generateThemeAssetsFlow = ai.defineFlow(
  {
    name: 'generateThemeAssetsFlow',
    inputSchema: GenerateThemeAssetsInputSchema,
    outputSchema: GenerateThemeAssetsOutputSchema,
  },
  async ({ strain, theme, logoUrl }) => {
    // This flow assumes the logo is already created and passed in.
    const [productMontageUrl, stickerSheetUrl] = await Promise.all([
      generateImage(getProductMontagePrompt(logoUrl)),
      generateImage(getStickerSheetPrompt(logoUrl)),
    ]);
    return { logoUrl, productMontageUrl, stickerSheetUrl };
  }
);


// --- EXPORTED WRAPPER FUNCTIONS ---

export async function generateSingleThemedLogo(input: z.infer<typeof GenerateThemedLogoInputSchema>): Promise<z.infer<typeof GenerateThemedLogoOutputSchema>> {
  return generateSingleThemedLogoFlow(input);
}

export async function generateThemeAssets(input: z.infer<typeof GenerateThemeAssetsInputSchema>): Promise<z.infer<typeof GenerateThemeAssetsOutputSchema>> {
  return generateThemeAssetsFlow(input);
}


// --- Existing Flow for finding a strain image (unchanged) ---
const FindStrainImageInputSchema = z.object({
  strainName: z.string().describe('The name of the cannabis strain to find an image for.'),
});

const FindStrainImageOutputSchema = z.object({
  imageUrl: z.string().url().describe('URL of the generated strain image.'),
});

const findStrainImageFlow = ai.defineFlow(
  {
    name: 'findStrainImageFlow',
    inputSchema: FindStrainImageInputSchema,
    outputSchema: FindStrainImageOutputSchema,
  },
  async ({ strainName }) => {
    const prompt = `a professional, high-quality, photorealistic macro photograph of a cannabis bud for the strain '${strainName}' on a clean, plain, dark background.`;
    const imageUrl = await generateImage(prompt);
    return { imageUrl };
  }
);

export async function findStrainImage(input: z.infer<typeof FindStrainImageInputSchema>): Promise<z.infer<typeof FindStrainImageOutputSchema>> {
  return findStrainImageFlow(input);
}
