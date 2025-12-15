import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import axios from 'axios';
import sharp from 'sharp';

const openaiApiKey = defineSecret('OPENAI_API_KEY');

// Logo positioning configuration for overlaying on apparel templates
interface LogoPosition {
  x: number; // X coordinate from left
  y: number; // Y coordinate from top
  width: number; // Logo width in pixels
  height: number; // Logo height in pixels
}

// Map: apparelType-surface-badgeShape => position
// Cap & Beanie: Small sticker-sized badge on front/fold
// T-Shirts & Hoodies FRONT: Large centered chest design (25cm width equivalent ~240px at 1024px image width)
// T-Shirts & Hoodies BACK: Large centered upper back design
const LOGO_POSITIONS: Record<string, LogoPosition> = {
  // Cap - Small sticker on front (center of cap front panel)
  'Cap-front-circular': { x: 425, y: 300, width: 150, height: 150 },
  'Cap-front-rectangular': { x: 400, y: 300, width: 200, height: 120 },
  
  // Beanie - Small sticker on fold (center of folded brim)
  'Beanie-front-circular': { x: 425, y: 400, width: 150, height: 150 },
  'Beanie-front-rectangular': { x: 400, y: 400, width: 200, height: 120 },
  
  // T-Shirt FRONT - Large centered chest design (25cm width = ~240px circular or 240x432px rectangular)
  'T-Shirt-front-circular': { x: 392, y: 300, width: 240, height: 240 },
  'T-Shirt-front-rectangular': { x: 392, y: 250, width: 240, height: 432 },
  // T-Shirt BACK - Large centered upper back
  'T-Shirt-back-circular': { x: 392, y: 250, width: 240, height: 240 },
  'T-Shirt-back-rectangular': { x: 392, y: 200, width: 240, height: 432 },
  
  // Long T-Shirt FRONT - Large centered chest design
  'Long T-Shirt-front-circular': { x: 392, y: 300, width: 240, height: 240 },
  'Long T-Shirt-front-rectangular': { x: 392, y: 250, width: 240, height: 432 },
  // Long T-Shirt BACK - Large centered upper back
  'Long T-Shirt-back-circular': { x: 392, y: 250, width: 240, height: 240 },
  'Long T-Shirt-back-rectangular': { x: 392, y: 200, width: 240, height: 432 },
  
  // Hoodie FRONT - Large centered chest design
  'Hoodie-front-circular': { x: 392, y: 350, width: 240, height: 240 },
  'Hoodie-front-rectangular': { x: 392, y: 300, width: 240, height: 432 },
  // Hoodie BACK - Large centered upper back
  'Hoodie-back-circular': { x: 392, y: 300, width: 240, height: 240 },
  'Hoodie-back-rectangular': { x: 392, y: 250, width: 240, height: 432 },
  
  // Backpack FRONT - Large centered panel
  'Backpack-front-circular': { x: 392, y: 300, width: 240, height: 240 },
  'Backpack-front-rectangular': { x: 392, y: 250, width: 240, height: 432 },
};

// Map apparel types to their template filenames
const APPAREL_TEMPLATES: Record<string, string> = {
  'Cap-front': 'black-cap.jpg',
  'Beanie-front': 'black-beannie.jpg',
  'T-Shirt-front': 'black-tshirt-front.jpg',
  'T-Shirt-back': 'black-tshirt-back.jpg',
  'Long T-Shirt-front': 'black-long-sleeve-sweatshirt-front.jpg',
  'Long T-Shirt-back': 'black-long-sleeve-sweatshirt-black.jpg',
  'Hoodie-front': 'black-hoodie-front.jpg',
  'Hoodie-back': 'black-hoodie-back.jpg',
  'Backpack-front': 'black-backpack.jpg',
};

interface GenerateDesignRequest {
  prompt: string;
  category: string;
  apparelType?: string;
  surface?: string;
  badgeShape?: string; // 'circular' or 'rectangular'
  badgeDimensions?: string; // e.g., "20cm diameter" or "25cm x 45cm"
  aspectRatio?: string; // '1:1', '2:3', or '3:2'
}

interface GenerateDesignResponse {
  designId: string;
  logoImageUrl: string;
  designImageUrl: string;
  creditsRemaining: number;
}

interface GenerateModelRequest {
  designId: string;
  modelPrompt: string;
  apparelType: string;
}

interface GenerateModelResponse {
  modelImageUrl: string;
  creditsRemaining: number;
}

interface PublishProductRequest {
  designId: string;
  productName: string;
  productDescription: string;
  category: string;
  apparelType?: string;
  surface?: string;
  modelImageUrl?: string;
  modelPrompt?: string;
}

interface PublishProductResponse {
  productId: string;
  success: boolean;
}

/**
 * Generate a design using DALL-E 3
 */
export const generateCreatorDesign = onCall(
  { secrets: [openaiApiKey] },
  async (request: CallableRequest<GenerateDesignRequest>): Promise<GenerateDesignResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { prompt, category, apparelType, surface, badgeShape, badgeDimensions } = request.data;
    const userId = request.auth.uid;

    if (!prompt || !category) {
      throw new HttpsError('invalid-argument', 'Missing required fields: prompt, category');
    }

    if (prompt.length > 1000) {
      throw new HttpsError('invalid-argument', 'Prompt too long. Maximum 1000 characters.');
    }

    try {
      const db = admin.firestore();

      // Check credits
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      const currentCredits = userData?.credits || 0;

      if (currentCredits < 10) {
        throw new HttpsError('failed-precondition', 'Insufficient credits. Need 10 credits for logo generation.');
      }

      // Build logo prompt - Frontend already includes shape/aspect ratio instructions
      // Add explicit instructions for clean extraction - emphasize white OUTSIDE border only
      const logoPrompt = `${prompt} CRITICAL TECHNICAL REQUIREMENTS FOR BACKGROUND: The image must be on a PURE WHITE (#FFFFFF) background ONLY in the area OUTSIDE the ${badgeShape || 'circular'} border. Inside the border, use ANY vibrant colors you want for the design. The border itself should be SOLID BLACK (4-5px thick, crisp edges, NO blur, NO anti-aliasing with the white background). Outside the black border = pure flat white (#FFFFFF) with NO gradients, NO shadows, NO texture. Inside the border = colorful vibrant design. This is a 2D flat logo for print extraction, NOT clothing or fabric. The design must be perfectly centered on the canvas at exactly 25cm diameter (for circular) or 25cm x 45cm (for rectangular portrait).`;

      const logoResponse = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt: logoPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
          style: 'vivid',
        },
        {
          headers: {
            'Authorization': `Bearer ${openaiApiKey.value()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const logoUrl = logoResponse.data.data[0].url;

      // Download logo
      const logoImageResponse = await axios.get(logoUrl, { responseType: 'arraybuffer' });
      let logoBuffer = Buffer.from(logoImageResponse.data);

      // Remove white background and residual colors OUTSIDE the border
      // Preserve ALL colors INSIDE the border (including white within the logo)
      try {
        const metadata = await sharp(logoBuffer).metadata();
        const width = metadata.width || 1024;
        const height = metadata.height || 1024;
        
        // Convert to raw pixel data for processing
        const { data, info } = await sharp(logoBuffer)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        
        // Image is always 1024x1024 from DALL-E, design should be centered
        // For circular: 25cm diameter = ~950px on 1024px canvas (with border)
        // For rectangular portrait: 25cm x 45cm = ~650x950px (scaled to fit)
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Detect the actual border by finding dark pixels (black border)
        // We'll scan for the outermost dark pixels to define the shape
        let shapeRadius = 475; // Default for circular
        let rectX = 0, rectY = 0, rectWidth = width, rectHeight = height;
        
        if (badgeShape === 'circular') {
          // Find the circular border by detecting the outermost black ring
          // Scan from center outward to find where black border is
          for (let r = 500; r > 100; r -= 5) {
            let blackPixelsFound = 0;
            const testPoints = 36; // Check 36 points around the circle
            
            for (let angle = 0; angle < Math.PI * 2; angle += (Math.PI * 2) / testPoints) {
              const x = Math.round(centerX + Math.cos(angle) * r);
              const y = Math.round(centerY + Math.sin(angle) * r);
              
              if (x >= 0 && x < width && y >= 0 && y < height) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                // Check if pixel is dark (part of black border)
                if (r < 50 && g < 50 && b < 50) {
                  blackPixelsFound++;
                }
              }
            }
            
            // If we found a ring of black pixels, this is our border
            if (blackPixelsFound > testPoints * 0.7) {
              shapeRadius = r + 10; // Add padding inside the border
              console.log(`Detected circular border at radius: ${r}px`);
              break;
            }
          }
        } else {
          // For rectangular, find bounding box of dark pixels
          let minX = width, maxX = 0, minY = height, maxY = 0;
          
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              
              // Check if pixel is dark (part of black border)
              if (r < 50 && g < 50 && b < 50) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
              }
            }
          }
          
          rectX = minX + 5; // Add padding inside the border
          rectY = minY + 5;
          rectWidth = maxX - minX - 10;
          rectHeight = maxY - minY - 10;
          console.log(`Detected rectangular border: ${rectWidth}x${rectHeight}px at (${rectX}, ${rectY})`);
        }
        
        // Create transparency mask: make everything OUTSIDE the border transparent
        // Keep everything INSIDE the border as-is (all colors preserved)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            let isInside = false;
            
            if (badgeShape === 'circular') {
              // Check if pixel is inside the circle
              const dx = x - centerX;
              const dy = y - centerY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              isInside = distance <= shapeRadius;
            } else {
              // Check if pixel is inside the rectangle
              isInside = x >= rectX && x < rectX + rectWidth && 
                        y >= rectY && y < rectY + rectHeight;
            }
            
            // If pixel is OUTSIDE the border, make it fully transparent
            if (!isInside) {
              data[idx + 3] = 0; // Set alpha to 0 (fully transparent)
            }
            // If INSIDE the border, keep the original alpha (preserve all colors)
          }
        }
        
        // Convert back to PNG with transparency
        logoBuffer = await sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        })
        .png({ compressionLevel: 9 })
        .toBuffer();
        
        console.log(`Background removed: Everything outside ${badgeShape} border is now transparent. All colors inside preserved.`);
      } catch (error) {
        console.error('Advanced background removal error:', error);
        // Fallback: Use simple shape-based mask
        try {
          const metadata = await sharp(logoBuffer).metadata();
          const width = metadata.width || 1024;
          const height = metadata.height || 1024;
          
          let maskBuffer: Buffer;
          
          if (badgeShape === 'circular') {
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = 475;
            
            const circleMask = Buffer.from(
              `<svg width="${width}" height="${height}">
                <rect width="${width}" height="${height}" fill="black"/>
                <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="white"/>
              </svg>`
            );
            
            maskBuffer = await sharp(circleMask).png().toBuffer();
          } else {
            const rectWidth = 650;
            const rectHeight = 950;
            const rectX = (width - rectWidth) / 2;
            const rectY = (height - rectHeight) / 2;
            
            const rectMask = Buffer.from(
              `<svg width="${width}" height="${height}">
                <rect width="${width}" height="${height}" fill="black"/>
                <rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="white"/>
              </svg>`
            );
            
            maskBuffer = await sharp(rectMask).png().toBuffer();
          }
          
          logoBuffer = await sharp(logoBuffer)
            .ensureAlpha()
            .composite([{
              input: maskBuffer,
              blend: 'dest-in'
            }])
            .png({ compressionLevel: 9 })
            .toBuffer();
          
          console.log(`Fallback: Applied simple ${badgeShape} mask`);
        } catch (fallbackError) {
          console.error('Fallback masking failed:', fallbackError);
        }
      }

      const bucket = admin.storage().bucket();
      const timestamp = Date.now();
      const logoFileName = `creator-designs/${userId}/${timestamp}-logo.png`;
      const logoFile = bucket.file(logoFileName);

      await logoFile.save(logoBuffer, {
        metadata: { contentType: 'image/png' },
        public: true,
      });

      const logoImageUrl = `https://storage.googleapis.com/${bucket.name}/${logoFileName}`;

      // Store position configuration for later use
      const surfaceText = surface === 'back' ? 'back' : 'front';
      const positionKey = `${apparelType}-${surfaceText}-${badgeShape}`;
      const defaultPosition = LOGO_POSITIONS[positionKey];

      // Save design to Firestore (logo URL + default position data)
      const designRef = await db.collection('creatorDesigns').add({
        userId,
        prompt,
        category,
        apparelType: apparelType || null,
        surface: surface || null,
        badgeShape: badgeShape || null,
        badgeDimensions: badgeDimensions || null,
        logoImageUrl, // Transparent PNG logo
        designImageUrl: '', // Will be created after user positions logo
        logoPosition: defaultPosition || { x: 392, y: 300, width: 240, height: 240, scale: 0.5 }, // Default 50% centered
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isPublished: false,
      });

      // Deduct credits and log interaction
      await db.runTransaction(async (transaction: any) => {
        const userRef = db.collection('users').doc(userId);
        const userSnapshot = await transaction.get(userRef);
        const currentCredits = userSnapshot.data()?.credits || 0;

        transaction.update(userRef, {
          credits: Math.max(0, currentCredits - 10),
        });

        // Log interaction
        const logRef = db.collection('aiInteractionsLog').doc();
        transaction.set(logRef, {
          userId,
          credits: 10,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          category: 'creator-lab',
          action: 'design-generation',
          metadata: {
            designId: designRef.id,
            category,
            apparelType,
            surface,
          },
        });
      });

      return {
        designId: designRef.id,
        logoImageUrl, // Transparent PNG logo only
        designImageUrl: '', // No composite yet
        creditsRemaining: Math.max(0, currentCredits - 10),
      };
    } catch (error: any) {
      console.error('Error generating design:', error);
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error.message || 'Unknown error';
        const errorCode = error.response.data.error.code;
        
        // Check for content policy violation
        if (errorCode === 'content_policy_violation' || errorMessage.toLowerCase().includes('content policy')) {
          throw new HttpsError('failed-precondition', 'Content Policy Violation: Your prompt may contain inappropriate content. Please revise and try again with different wording.');
        }
        
        throw new HttpsError('internal', `OpenAI Error: ${errorMessage}`);
      }
      throw new HttpsError('internal', 'Failed to generate design');
    }
  }
);

/**
 * Finalize design by creating composite with user-positioned logo
 */
export const finalizeDesignComposite = onCall(
  async (request: CallableRequest<{ designId: string; logoPosition: { x: number; y: number; width: number } }>): Promise<{ designImageUrl: string }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { designId, logoPosition } = request.data;
    const userId = request.auth.uid;

    if (!designId || !logoPosition) {
      throw new HttpsError('invalid-argument', 'Missing required fields: designId, logoPosition');
    }

    try {
      const db = admin.firestore();

      // Get design
      const designDoc = await db.collection('creatorDesigns').doc(designId).get();
      if (!designDoc.exists) {
        throw new HttpsError('not-found', 'Design not found');
      }

      const designData = designDoc.data();
      if (designData?.userId !== userId) {
        throw new HttpsError('permission-denied', 'Not your design');
      }

      const { logoImageUrl, apparelType, surface } = designData;
      
      if (!logoImageUrl) {
        throw new HttpsError('failed-precondition', 'Logo image not found');
      }

      // Get apparel template
      const surfaceText = surface === 'back' ? 'back' : 'front';
      const templateKey = `${apparelType}-${surfaceText}`;
      const templateFileName = APPAREL_TEMPLATES[templateKey];

      if (!templateFileName) {
        throw new HttpsError('invalid-argument', `No template configured for ${templateKey}`);
      }

      const bucket = admin.storage().bucket();
      
      // Download logo
      const logoPath = logoImageUrl.split(`${bucket.name}/`)[1];
      const logoFile = bucket.file(logoPath);
      const [logoBuffer] = await logoFile.download();

      // Download apparel template
      const templatePath = `apparel-templates/${templateFileName}`;
      const templateFile = bucket.file(templatePath);
      const [templateBuffer] = await templateFile.download();

      // Get actual template dimensions
      const templateMetadata = await sharp(templateBuffer).metadata();
      const templateWidth = templateMetadata.width || 512;
      const templateHeight = templateMetadata.height || 512;
      
      // Scale factor: Frontend calculates for 1024x1024 reference, scale to actual template size
      const scaleFactor = templateWidth / 1024;
      
      // Scale position and size from 1024x1024 reference to actual template size (512x512)
      const scaledX = Math.round(logoPosition.x * scaleFactor);
      const scaledY = Math.round(logoPosition.y * scaleFactor);
      const scaledWidth = Math.round(logoPosition.width * scaleFactor);
      const scaledHeight = scaledWidth; // Maintain square aspect for now

      console.log('Composite creation:', {
        originalPosition: logoPosition,
        templateSize: { width: templateWidth, height: templateHeight },
        scaleFactor,
        scaledPosition: { x: scaledX, y: scaledY, width: scaledWidth, height: scaledHeight },
        apparelType,
        surface: surfaceText,
      });

      // Create composite with explicit alpha blending
      // This ensures transparent pixels in the logo don't show on the apparel
      const compositeBuffer = await sharp(templateBuffer)
        .composite([{
          input: await sharp(logoBuffer)
            .resize(scaledWidth, scaledHeight, { 
              fit: 'contain', 
              background: { r: 0, g: 0, b: 0, alpha: 0 } // Fully transparent background
            })
            .toBuffer(),
          top: scaledY,
          left: scaledX,
          blend: 'over', // Explicit alpha blending (respects transparency)
        }])
        .jpeg({ quality: 95 }) // Higher quality for print-ready mockups
        .toBuffer();

      // Save composite
      const timestamp = Date.now();
      const mockupFileName = `creator-designs/${userId}/${timestamp}-mockup.jpg`;
      const mockupFile = bucket.file(mockupFileName);
      await mockupFile.save(compositeBuffer, {
        metadata: { contentType: 'image/jpeg' },
        public: true,
      });
      const designImageUrl = `https://storage.googleapis.com/${bucket.name}/${mockupFileName}`;

      // Update design with composite URL and final position
      await db.collection('creatorDesigns').doc(designId).update({
        designImageUrl,
        logoPosition,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { designImageUrl };
    } catch (error: any) {
      console.error('Error finalizing composite:', error);
      throw new HttpsError('internal', 'Failed to create composite');
    }
  }
);

/**
 * Generate a model showcase image using DALL-E 3
 */
export const generateModelShowcase = onCall(
  { secrets: [openaiApiKey] },
  async (request: CallableRequest<GenerateModelRequest>): Promise<GenerateModelResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { designId, modelPrompt, apparelType } = request.data;
    const userId = request.auth.uid;

    if (!designId || !modelPrompt || !apparelType) {
      throw new HttpsError('invalid-argument', 'Missing required fields: designId, modelPrompt, apparelType');
    }

    if (modelPrompt.length > 500) {
      throw new HttpsError('invalid-argument', 'Model prompt too long. Maximum 500 characters.');
    }

    try {
      const db = admin.firestore();

      // Check credits
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      const currentCredits = userData?.credits || 0;

      if (currentCredits < 10) {
        throw new HttpsError('failed-precondition', 'Insufficient credits. Need 10 credits.');
      }

      // Get design details
      const designDoc = await db.collection('creatorDesigns').doc(designId).get();
      if (!designDoc.exists) {
        throw new HttpsError('not-found', 'Design not found');
      }

      const designData = designDoc.data();
      if (designData?.userId !== userId) {
        throw new HttpsError('permission-denied', 'Not your design');
      }

      // Build model-only prompt - NO apparel mentioned, just the human character
      const cleanModelPrompt = `${modelPrompt}. Professional lifestyle photography, natural setting, high quality portrait, realistic lighting, centered composition, full body or upper body shot. IMPORTANT: Do NOT include any clothing designs, logos, or apparel graphics - just the person/model.`;

      // Call OpenAI DALL-E 3 for model image (no apparel design)
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt: cleanModelPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
          style: 'natural',
        },
        {
          headers: {
            'Authorization': `Bearer ${openaiApiKey.value()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const imageUrl = response.data.data[0].url;

      // Download model image from OpenAI
      const modelImageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      let modelImageBuffer = Buffer.from(modelImageResponse.data);

      // Get the transparent logo from design
      const logoImageUrl = designData?.logoImageUrl;
      if (!logoImageUrl) {
        throw new HttpsError('failed-precondition', 'Design must have a logo');
      }

      const bucket = admin.storage().bucket();
      
      // Download transparent logo
      const logoPath = logoImageUrl.split(`${bucket.name}/`)[1];
      const logoFile = bucket.file(logoPath);
      const [logoBuffer] = await logoFile.download();

      // Get model image dimensions
      const modelMetadata = await sharp(modelImageBuffer).metadata();
      const modelWidth = modelMetadata.width || 1024;
      const modelHeight = modelMetadata.height || 1024;

      // Calculate logo position: bottom center with padding
      const logoWidth = Math.round(modelWidth * 0.25); // Logo is 25% of model width
      const logoHeight = logoWidth; // Keep square
      const logoPadding = 40; // 40px padding from bottom
      const logoX = Math.round((modelWidth - logoWidth) / 2); // Center horizontally
      const logoY = modelHeight - logoHeight - logoPadding; // Position at bottom with padding

      console.log('Model showcase composite:', {
        modelSize: { width: modelWidth, height: modelHeight },
        logoSize: { width: logoWidth, height: logoHeight },
        logoPosition: { x: logoX, y: logoY },
        padding: logoPadding,
      });

      // Composite logo onto model image at bottom center
      modelImageBuffer = await sharp(modelImageBuffer)
        .composite([{
          input: await sharp(logoBuffer)
            .resize(logoWidth, logoHeight, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer(),
          top: logoY,
          left: logoX,
          blend: 'over',
        }])
        .png()
        .toBuffer();

      // Upload final composite to Firebase Storage
      const timestamp = Date.now();
      const fileName = `creator-models/${userId}/${timestamp}.png`;
      const file = bucket.file(fileName);

      await file.save(modelImageBuffer, {
        metadata: { contentType: 'image/png' },
        public: true,
      });

      const modelImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      // Update design with model info
      await db.collection('creatorDesigns').doc(designId).update({
        modelImageUrl,
        modelPrompt,
        modelGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Deduct credits and log interaction
      await db.runTransaction(async (transaction: any) => {
        const userRef = db.collection('users').doc(userId);
        const userSnapshot = await transaction.get(userRef);
        const currentCredits = userSnapshot.data()?.credits || 0;

        transaction.update(userRef, {
          credits: Math.max(0, currentCredits - 10),
        });

        // Log interaction
        const logRef = db.collection('aiInteractionsLog').doc();
        transaction.set(logRef, {
          userId,
          credits: 10,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          category: 'creator-lab',
          action: 'model-generation',
          metadata: {
            designId,
            apparelType,
          },
        });
      });

      return {
        modelImageUrl,
        creditsRemaining: Math.max(0, currentCredits - 10),
      };
    } catch (error: any) {
      console.error('Error generating model:', error);
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error.message || 'Unknown error';
        const errorCode = error.response.data.error.code;
        
        // Check for content policy violation
        if (errorCode === 'content_policy_violation' || errorMessage.toLowerCase().includes('content policy')) {
          throw new HttpsError('failed-precondition', 'Content Policy Violation: Your model description may contain inappropriate content. Please use family-friendly language and try again.');
        }
        
        throw new HttpsError('internal', `OpenAI Error: ${errorMessage}`);
      }
      throw new HttpsError('internal', 'Failed to generate model showcase');
    }
  }
);

/**
 * Publish a design as a Treehouse product
 */
export const publishCreatorProduct = onCall(
  async (request: CallableRequest<PublishProductRequest>): Promise<PublishProductResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const {
      designId,
      productName,
      productDescription,
      category,
      apparelType,
      surface,
      modelImageUrl,
      modelPrompt,
    } = request.data;
    const userId = request.auth.uid;

    if (!designId || !productName || !category) {
      throw new HttpsError('invalid-argument', 'Missing required fields: designId, productName, category');
    }

    if (category === 'Apparel' && !apparelType) {
      throw new HttpsError('invalid-argument', 'Apparel products must have an apparelType');
    }

    try {
      const db = admin.firestore();

      // Get design
      const designDoc = await db.collection('creatorDesigns').doc(designId).get();
      if (!designDoc.exists) {
        throw new HttpsError('not-found', 'Design not found');
      }

      const designData = designDoc.data();
      if (designData?.userId !== userId) {
        throw new HttpsError('permission-denied', 'Not your design');
      }

      if (designData?.isPublished) {
        throw new HttpsError('failed-precondition', 'Design already published');
      }

      // Get user info
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      const userRole = userData?.role;

      // Calculate price for apparel products
      const APPAREL_PRICES: Record<string, number> = {
        'T-Shirt': 625,
        'Long T-Shirt': 937.50,
        'Hoodie': 1250,
        'Cap': 437.50,
        'Beanie': 437.50,
        'Backpack': 750,
      };

      const productPrice = category === 'Apparel' && apparelType 
        ? (APPAREL_PRICES[apparelType] || 0)
        : 0;

      // Prepare product data
      const productData: any = {
        creatorId: userId,
        creatorName: userData?.displayName || 'Anonymous Creator',
        creatorEmail: userData?.email || request.auth?.token?.email || '',
        designId,
        productName,
        productDescription: productDescription || '',
        category,
        apparelType: apparelType || null,
        apparelTypes: category === 'Apparel' && apparelType ? [apparelType] : [],
        surface: surface || null,
        logoImageUrl: designData.logoImageUrl || null,
        designImageUrl: designData.designImageUrl,
        designThumbnailUrl: modelImageUrl || designData.designImageUrl,
        modelImageUrl: modelImageUrl || null,
        modelPrompt: modelPrompt || null,
        price: productPrice,
        currency: 'ZAR',
        isActive: true,
        salesCount: 0,
        totalRevenue: 0,
        viewCount: 0,
        addToCartCount: 0,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Add dispensary fields only if user is dispensary owner/staff AND has dispensary data
      if ((userRole === 'DispensaryOwner' || userRole === 'DispensaryStaff') && userData?.dispensaryId) {
        productData.dispensaryId = userData.dispensaryId;
        productData.dispensaryName = userData.dispensaryName || null;
        productData.dispensaryType = userData.dispensaryType || null;
      }

      // Create product
      const productRef = await db.collection('treehouseProducts').add(productData);

      // Mark design as published
      await db.collection('creatorDesigns').doc(designId).update({
        isPublished: true,
        productId: productRef.id,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        productId: productRef.id,
        success: true,
      };
    } catch (error: any) {
      console.error('Error publishing product:', error);
      throw new HttpsError('internal', 'Failed to publish product');
    }
  }
);

/**
 * Update Treehouse product details
 */
export const updateTreehouseProduct = onCall(
  async (request: CallableRequest<{ productId: string; updates: any }>): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { productId, updates } = request.data;
    const userId = request.auth.uid;

    if (!productId || !updates) {
      throw new HttpsError('invalid-argument', 'Missing productId or updates');
    }

    try {
      const db = admin.firestore();
      const productDoc = await db.collection('treehouseProducts').doc(productId).get();

      if (!productDoc.exists) {
        throw new HttpsError('not-found', 'Product not found');
      }

      const productData = productDoc.data();
      if (productData?.creatorId !== userId) {
        throw new HttpsError('permission-denied', 'Not your product');
      }

      // Only allow specific fields to be updated
      const allowedUpdates: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (updates.productName) allowedUpdates.productName = updates.productName;
      if (updates.productDescription !== undefined) allowedUpdates.productDescription = updates.productDescription;
      if (updates.logoImageUrl) allowedUpdates.logoImageUrl = updates.logoImageUrl;
      if (updates.designImageUrl) allowedUpdates.designImageUrl = updates.designImageUrl;
      if (updates.modelImageUrl !== undefined) allowedUpdates.modelImageUrl = updates.modelImageUrl;

      await db.collection('treehouseProducts').doc(productId).update(allowedUpdates);

      return { success: true };
    } catch (error: any) {
      console.error('Error updating product:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to update product');
    }
  }
);

/**
 * Toggle product active status
 */
export const toggleProductStatus = onCall(
  async (request: CallableRequest<{ productId: string }>): Promise<{ success: boolean; isActive: boolean }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { productId } = request.data;
    const userId = request.auth.uid;

    if (!productId) {
      throw new HttpsError('invalid-argument', 'Missing productId');
    }

    try {
      const db = admin.firestore();
      const productDoc = await db.collection('treehouseProducts').doc(productId).get();

      if (!productDoc.exists) {
        throw new HttpsError('not-found', 'Product not found');
      }

      const productData = productDoc.data();
      if (productData?.creatorId !== userId) {
        throw new HttpsError('permission-denied', 'Not your product');
      }

      const newStatus = !productData.isActive;
      
      await db.collection('treehouseProducts').doc(productId).update({
        isActive: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, isActive: newStatus };
    } catch (error: any) {
      console.error('Error toggling product status:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to toggle product status');
    }
  }
);

/**
 * Delete Treehouse product
 */
export const deleteTreehouseProduct = onCall(
  async (request: CallableRequest<{ productId: string }>): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { productId } = request.data;
    const userId = request.auth.uid;

    if (!productId) {
      throw new HttpsError('invalid-argument', 'Missing productId');
    }

    try {
      const db = admin.firestore();
      const productDoc = await db.collection('treehouseProducts').doc(productId).get();

      if (!productDoc.exists) {
        throw new HttpsError('not-found', 'Product not found');
      }

      const productData = productDoc.data();
      if (productData?.creatorId !== userId) {
        throw new HttpsError('permission-denied', 'Not your product');
      }

      // Check if product has sales
      if (productData.salesCount && productData.salesCount > 0) {
        throw new HttpsError('failed-precondition', 'Cannot delete products that have been sold. Set to inactive instead.');
      }

      // Mark design as unpublished
      if (productData.designId) {
        await db.collection('creatorDesigns').doc(productData.designId).update({
          isPublished: false,
          productId: null,
        });
      }

      // Delete product
      await db.collection('treehouseProducts').doc(productId).delete();

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting product:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to delete product');
    }
  }
);
