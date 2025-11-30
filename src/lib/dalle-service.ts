/**
 * DALL-E 3 Image Generation Service
 * Powers The Treehouse Creator Lab
 * Credit costs: 10 (generate) | 5 (variation)
 */

import { DesignGenerationRequest, DesignOperationType } from '@/types/creator-lab';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations';

export interface GenerateDesignParams {
  prompt: string;
  userId: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

export interface GenerateDesignResult {
  imageUrl: string;
  revisedPrompt: string;
  creditsUsed: number;
  width: number;
  height: number;
}

export interface GenerateVariationParams {
  originalImageUrl: string;
  userId: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
}

/**
 * Generate a new design using DALL-E 3
 * Optimized for black apparel printing
 */
export async function generateDesign(
  params: GenerateDesignParams
): Promise<GenerateDesignResult> {
  const { prompt, size = '1024x1024', quality = 'hd', style = 'vivid' } = params;

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Enhance prompt for black apparel suitability
  const enhancedPrompt = `Create a vibrant, high-contrast design perfect for printing on black apparel: ${prompt}. 
Style requirements: Bold colors, clear lines, professional quality, suitable for t-shirts, hoodies, caps, and beanies. 
Design should pop against a black background. Modern, trendy aesthetic.`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size,
        quality,
        style,
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API Error:', errorData);
      throw new Error(`DALL-E API error: ${response.statusText}`);
    }

    const data = await response.json();
    const imageUrl = data.data[0]?.url;
    const revisedPrompt = data.data[0]?.revised_prompt || prompt;

    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E');
    }

    // Parse size from format like "1024x1024"
    const [width, height] = size.split('x').map(Number);

    return {
      imageUrl,
      revisedPrompt,
      creditsUsed: 10,
      width,
      height,
    };
  } catch (error: any) {
    console.error('Error generating design:', error);
    throw new Error(`Design generation failed: ${error.message}`);
  }
}

/**
 * Generate a variation of an existing design using DALL-E 2
 * More cost-effective for variations (5 credits vs 10)
 */
export async function generateVariation(
  params: GenerateVariationParams
): Promise<GenerateDesignResult> {
  const { originalImageUrl, size = '1024x1024' } = params;

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Download the original image
    const imageBlob = await fetchImageAsBlob(originalImageUrl);

    // Create FormData for DALL-E 2 variations endpoint
    const formData = new FormData();
    formData.append('image', imageBlob, 'original.png');
    formData.append('n', '1');
    formData.append('size', size);
    formData.append('response_format', 'url');

    const response = await fetch('https://api.openai.com/v1/images/variations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI Variation API Error:', errorData);
      throw new Error(`DALL-E Variation API error: ${response.statusText}`);
    }

    const data = await response.json();
    const imageUrl = data.data[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E variations');
    }

    const [width, height] = size.split('x').map(Number);

    return {
      imageUrl,
      revisedPrompt: 'Variation',
      creditsUsed: 5,
      width,
      height,
    };
  } catch (error: any) {
    console.error('Error generating variation:', error);
    throw new Error(`Variation generation failed: ${error.message}`);
  }
}

/**
 * Fetch image from URL and convert to Blob for API upload
 */
async function fetchImageAsBlob(url: string): Promise<Blob> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return await response.blob();
  } catch (error: any) {
    throw new Error(`Image download failed: ${error.message}`);
  }
}

/**
 * Upload generated image to Firebase Storage
 * Returns permanent storage URL
 */
export async function uploadToStorage(
  imageUrl: string,
  userId: string,
  designId: string
): Promise<string> {
  try {
    // Download image from OpenAI temporary URL
    const imageBlob = await fetchImageAsBlob(imageUrl);

    // Create storage path
    const fileName = `designs/${userId}/${designId}.png`;

    // Upload to Firebase Storage via API route
    const formData = new FormData();
    formData.append('file', imageBlob, 'design.png');
    formData.append('path', fileName);

    const uploadResponse = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error('Storage upload failed');
    }

    const { url } = await uploadResponse.json();
    return url;
  } catch (error: any) {
    console.error('Error uploading to storage:', error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }
}

/**
 * Validate prompt for content policy
 * Basic filtering before sending to OpenAI
 */
export function validatePrompt(prompt: string): { valid: boolean; message?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, message: 'Prompt cannot be empty' };
  }

  if (prompt.length < 10) {
    return { valid: false, message: 'Prompt too short. Please describe your design in more detail.' };
  }

  if (prompt.length > 1000) {
    return { valid: false, message: 'Prompt too long. Maximum 1000 characters.' };
  }

  // Basic profanity/inappropriate content check (expand as needed)
  const blockedWords = ['explicit', 'nsfw', 'nude', 'naked', 'sexual'];
  const lowerPrompt = prompt.toLowerCase();
  
  for (const word of blockedWords) {
    if (lowerPrompt.includes(word)) {
      return { 
        valid: false, 
        message: 'Prompt contains inappropriate content. Please keep designs family-friendly.' 
      };
    }
  }

  return { valid: true };
}

/**
 * Estimate token usage for billing calculations
 * Rough approximation: 1 token ≈ 4 characters
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Get operation-specific credit cost
 */
export function getOperationCost(operation: DesignOperationType): number {
  const costs = {
    generate: 10,
    variation: 5,
    upscale: 3,
  };
  return costs[operation] || 10;
}
