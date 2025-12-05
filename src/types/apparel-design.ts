/**
 * Apparel Design Configuration Types
 */

export type BadgeShape = 'circular' | 'rectangular';
export type AspectRatio = '1:1' | '2:3' | '3:2';

export interface DesignSpecification {
  apparelType: string;
  surface?: 'front' | 'back';
  shape: BadgeShape;
  dimensions: string; // e.g., "20cm diameter" or "25cm x 45cm"
  aspectRatio?: AspectRatio;
}

// Aspect ratio options with visual representations
export const ASPECT_RATIO_OPTIONS = [
  { value: '1:1' as AspectRatio, label: 'Square', icon: '■', description: '1:1 - Perfect for balanced logos' },
  { value: '2:3' as AspectRatio, label: 'Portrait', icon: '▯', description: '2:3 - Vertical orientation' },
  { value: '3:2' as AspectRatio, label: 'Landscape', icon: '▬', description: '3:2 - Horizontal orientation' },
];

// Design size options based on apparel type
// All generate: Studio quality square image of black [apparel] on white background
export const DESIGN_OPTIONS = {
  'Cap': [
    { shape: 'circular' as BadgeShape, dimensions: '20cm diameter', label: 'Circular Badge (20cm)', description: 'Round badge on front or peak' },
    { shape: 'rectangular' as BadgeShape, dimensions: '15cm x 20cm', label: 'Rectangular Badge (15cm × 20cm)', description: 'Rectangle badge on front or peak' },
  ],
  'Beanie': [
    { shape: 'circular' as BadgeShape, dimensions: '20cm diameter', label: 'Circular Badge (20cm)', description: 'Round badge on fold area' },
    { shape: 'rectangular' as BadgeShape, dimensions: '15cm x 20cm', label: 'Rectangular Badge (15cm × 20cm)', description: 'Rectangle badge on fold area' },
  ],
  'T-Shirt': [
    { shape: 'circular' as BadgeShape, dimensions: '25cm diameter', label: 'Circular Logo (25cm)', description: 'Round logo front or back' },
    { shape: 'rectangular' as BadgeShape, dimensions: '25cm x 45cm', label: 'Rectangular Logo (25cm × 45cm)', description: 'Vertical rectangle front or back' },
  ],
  'Long T-Shirt': [
    { shape: 'circular' as BadgeShape, dimensions: '25cm diameter', label: 'Circular Logo (25cm)', description: 'Round logo front or back' },
    { shape: 'rectangular' as BadgeShape, dimensions: '25cm x 45cm', label: 'Rectangular Logo (25cm × 45cm)', description: 'Vertical rectangle front or back' },
  ],
  'Hoodie': [
    { shape: 'circular' as BadgeShape, dimensions: '25cm diameter', label: 'Circular Logo (25cm)', description: 'Round logo front or back' },
    { shape: 'rectangular' as BadgeShape, dimensions: '25cm x 45cm', label: 'Rectangular Logo (25cm × 45cm)', description: 'Vertical rectangle front or back' },
  ],
  'Backpack': [
    { shape: 'circular' as BadgeShape, dimensions: '25cm diameter', label: 'Circular Logo (25cm)', description: 'Round logo on front panel' },
    { shape: 'rectangular' as BadgeShape, dimensions: '12cm x 25cm', label: 'Rectangular Logo (12cm × 25cm)', description: 'Vertical rectangle on front panel' },
  ],
};

/**
 * Generate the DALL-E prompt for apparel mockup
 * ALWAYS generates: Studio quality square image of black apparel on white background
 */
export function buildApparelPrompt(
  apparelType: string,
  surface: string,
  shape: BadgeShape,
  dimensions: string,
  userDesign: string
): string {
  const shapeDescription = shape === 'circular' ? 'circular' : 'rectangular';
  const surfaceText = surface === 'back' ? 'back' : 'front';
  
  return `A realistic studio quality square photograph of a black ${apparelType.toLowerCase()} on a clean white background, professional product photography, 1:1 aspect ratio, centered composition. The ${apparelType.toLowerCase()} has a ${shapeDescription} logo badge (${dimensions}) on the ${surfaceText}. Inside the ${shapeDescription} badge is: ${userDesign}. Sharp focus, high resolution, vibrant colors in the design.`;
}

/**
 * Generate the DALL-E prompt for model showcase
 * Takes the first apparel image and places it on a person
 */
export function buildModelPrompt(
  apparelType: string,
  modelDescription: string,
  apparelImageUrl: string
): string {
  return `${modelDescription}, wearing the black ${apparelType.toLowerCase()} with the custom design shown in the reference image. Professional photography, natural lighting, lifestyle setting. The ${apparelType.toLowerCase()} and design should be clearly visible and accurately represented.`;
}
