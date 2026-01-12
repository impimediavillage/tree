import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import type { Dispensary, User as AppUser, UserDocData, AllowedUserRole, DeductCreditsRequestBody, CartItem, OwnerUpdateDispensaryPayload, AIAdvisor } from './types';

// ============== FIREBASE ADMIN SDK INITIALIZATION ==============//
// MUST be initialized BEFORE importing any modules that use admin.firestore()
if (admin.apps.length === 0) {
    try {
        admin.initializeApp();
        logger.info("Firebase Admin SDK initialized successfully.");
    } catch (e: any) {
        logger.error("CRITICAL: Firebase Admin SDK initialization failed:", e);
    }
}

// Export Creator Lab functions
export { generateCreatorDesign, finalizeDesignComposite, generateModelShowcase, publishCreatorProduct, updateTreehouseProduct, toggleProductStatus, deleteTreehouseProduct } from './creator-lab';

// Export Treehouse Earnings functions
export { recordTreehouseEarning, createPayoutRequest } from './treehouse-earnings';

// Export Dispensary Earnings functions
export { recordDispensaryEarning, createDispensaryPayoutRequest } from './dispensary-earnings';

// Import email service
import { sendDispensaryApprovalEmail } from './email-service';

// Export Dispensary Review functions
export { processDispensaryReview, recalculateDispensaryReviewStats } from './dispensary-reviews';

// Export Shipping Label Generation functions
export { createShiplogicShipment, createPudoShipment } from './shipping-label-generation';

// Export Influencer Commission functions
export { 
  processInfluencerCommission,
  getInfluencerStats,
  calculateCommissionOnOrderDelivered
} from './influencer-commissions';

// Export Notification functions
export {
  onOrderCreated,
  onPaymentCompleted,
  onShippingStatusChange,
  sendAchievementNotification
} from './notifications';

// Export Driver Management functions
export {
  onInHouseDeliveryCreated,
  onDeliveryStatusUpdate,
  onDriverStatsUpdate,
  onPayoutRequestUpdate
} from './driver-functions';

// Export Advertising functions
export {
  trackAdImpression,
  trackAdClick,
  trackAdConversion,
  aggregateDailyAdAnalytics,
  cleanupExpiredAds,
  activateScheduledAds
} from './advertising';

// Upload Apparel Templates to Storage
export const uploadApparelTemplates = onCall(async (request: CallableRequest) => {
    // Check authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    // Check if user is super admin
    if (request.auth?.token.role !== 'Super Admin') {
        throw new HttpsError('permission-denied', 'Only Super Admins can upload apparel templates.');
    }

    const bucket = admin.storage().bucket();
    
    const templates = [
        'black-cap.jpg',
        'black-beannie.jpg',
        'black-tshirt-front.jpg',
        'black-tshirt-back.jpg',
        'black-long-sleeve-sweatshirt-front.jpg',
        'black-long-sleeve-sweatshirt-black.jpg',
        'black-hoodie-front.jpg',
        'black-hoodie-back.jpg',
    ];

    try {
        let uploadedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (const template of templates) {
            try {
                const storagePath = `apparel-templates/${template}`;
                const file = bucket.file(storagePath);
                
                // Check if file already exists
                const [exists] = await file.exists();
                if (exists) {
                    logger.info(`Template ${template} already exists, skipping...`);
                    skippedCount++;
                    continue;
                }

                // Note: In production, you'd download from public folder or another source
                // For now, we'll log that manual upload is required
                logger.warn(`Template ${template} needs manual upload to Storage`);
                errors.push(`${template} - requires manual upload from public/images/apparel/`);
                
            } catch (error: any) {
                logger.error(`Error processing template ${template}:`, error);
                errors.push(`${template} - ${error.message}`);
            }
        }

        const message = errors.length > 0 
            ? `Upload status: ${uploadedCount} uploaded, ${skippedCount} skipped. ${errors.length} require manual upload.`
            : `Successfully processed: ${uploadedCount} uploaded, ${skippedCount} already existed.`;

        logger.info(message);

        return {
            success: true,
            message,
            uploaded: uploadedCount,
            skipped: skippedCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    } catch (error: any) {
        logger.error('Error in uploadApparelTemplates:', error);
        throw new HttpsError('internal', `Failed to upload templates: ${error.message}`);
    }
});

// Define OpenAI API Key as a secret
const openaiApiKey = defineSecret('OPENAI_API_KEY');

const db = admin.firestore();
// ============== END INITIALIZATION =============


// ============== AUTH TRIGGER FOR CUSTOM CLAIMS (CRITICAL FOR SECURITY) - V2 SYNTAX =============
export const onUserWriteSetClaims = onDocumentWritten("users/{userId}", async (event) => {
    const userId = event.params.userId;
    const afterData = event.data?.after.data() as UserDocData | undefined;

    if (!afterData) {
        logger.info(`User document ${userId} deleted. Revoking custom claims.`);
        try {
            await admin.auth().setCustomUserClaims(userId, null);
            logger.info(`Successfully revoked custom claims for deleted user ${userId}.`);
        } catch (error) {
            logger.error(`Error revoking custom claims for deleted user ${userId}:`, error);
        }
        return;
    }

    const validRoles: AllowedUserRole[] = ['User', 'LeafUser', 'DispensaryOwner', 'Super Admin', 'DispensaryStaff'];
    const role: AllowedUserRole = afterData.role && validRoles.includes(afterData.role as AllowedUserRole)
        ? afterData.role as AllowedUserRole
        : 'User';
        
    const dispensaryId = afterData.dispensaryId || null;
    let dispensaryType: string | null = null;

    if (dispensaryId) {
        try {
            const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
            if (dispensaryDoc.exists) {
                dispensaryType = dispensaryDoc.data()?.dispensaryType || null;
            }
        } catch (error) {
            logger.error(`Failed to fetch dispensary type for dispensaryId ${dispensaryId}:`, error);
        }
    }
    
    const claims: { [key: string]: any } = { 
        role, 
        dispensaryId, 
        dispensaryType 
    };

    try {
        await admin.auth().setCustomUserClaims(userId, claims);
        logger.info(`Successfully set custom claims for user ${userId}:`, claims);
    } catch (error) {
        logger.error(`Error setting custom claims for user ${userId}:`, error);
    }
});


// ============== ROBUST HELPER FUNCTION for Date Conversion ==============
const safeToISOString = (date: any): string | null => {
    if (!date) return null;
    if (date.toDate && typeof date.toDate === 'function') {
        try {
            return date.toDate().toISOString();
        } catch (e) {
            logger.warn(`Could not convert Firestore Timestamp to Date:`, e);
            return null;
        }
    }
    if (date instanceof Date) {
        if (!isNaN(date.getTime())) return date.toISOString();
        return null;
    }
    if (typeof date === 'string') {
         try {
             const parsedDate = new Date(date);
             if (!isNaN(parsedDate.getTime())) return parsedDate.toISOString();
         } catch (e) { 
            logger.warn(`Could not parse date string: ${date}`);
         }
    }
    logger.warn(`Unsupported date type encountered for conversion: ${typeof date}`);
    return null;
};

// ============== Callable Functions (v2) ==============

export const getUserProfile = onCall(async (request: CallableRequest): Promise<AppUser> => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { uid, token } = request.auth; 

    try {
        const userDocRef = db.collection('users').doc(uid);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists) {
            logger.warn(`User document not found for uid: ${uid}.`);
            throw new HttpsError('not-found', 'Your user profile data could not be found.');
        }
        
        const userData = userDocSnap.data() as UserDocData;
        
        let dispensaryData: Dispensary | null = null;
        if (userData.dispensaryId) {
            const dispensaryDocRef = db.collection('dispensaries').doc(userData.dispensaryId);
            const dispensaryDocSnap = await dispensaryDocRef.get();
            
            if (dispensaryDocSnap.exists) {
                const rawDispensaryData = dispensaryDocSnap.data();
                if (rawDispensaryData) {
                    dispensaryData = {
                        ...rawDispensaryData,
                        id: dispensaryDocSnap.id,
                        applicationDate: safeToISOString(rawDispensaryData.applicationDate),
                        approvedDate: safeToISOString(rawDispensaryData.approvedDate),
                        lastActivityDate: safeToISOString(rawDispensaryData.lastActivityDate),
                    } as Dispensary;
                }
            }
        }
        
        const profileResponse: AppUser = {
            uid: uid,
            email: userData.email || token.email || '',
            displayName: userData.displayName || token.name || '',
            photoURL: userData.photoURL || token.picture || null,
            role: (token.role as AllowedUserRole || 'User'),
            dispensaryId: (token.dispensaryId as string || null),
            credits: userData.credits || 0,
            status: userData.status || 'Active',
            createdAt: safeToISOString(userData.createdAt),
            lastLoginAt: safeToISOString(userData.lastLoginAt),
            dispensaryStatus: dispensaryData?.status || null,
            dispensary: dispensaryData,
            preferredDispensaryTypes: userData.preferredDispensaryTypes || [],
            welcomeCreditsAwarded: userData.welcomeCreditsAwarded || false,
            signupSource: userData.signupSource || 'public',
        };

        return profileResponse;
    } catch (error: any) {
        logger.error(`CRITICAL ERROR in getUserProfile for ${uid}:`, error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', 'An unexpected server error occurred while fetching your profile.');
    }
});

export const deductCreditsAndLogInteraction = onCall(async (request: CallableRequest<DeductCreditsRequestBody>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    
    const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction } = request.data;
    const dispensaryId = request.auth.token.dispensaryId || null;
    
    if (userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'You can only deduct your own credits.');
    }
    
    if (!userId || !advisorSlug || creditsToDeduct === undefined || wasFreeInteraction === undefined) {
        throw new HttpsError('invalid-argument', 'Missing or invalid arguments provided.');
    }

    const userRef = db.collection("users").doc(userId);
    let newCreditBalance = 0;

    try {
        await db.runTransaction(async (transaction: any) => {
            const freshUserDoc = await transaction.get(userRef);
            if (!freshUserDoc.exists) {
                throw new HttpsError('not-found', 'User not found during transaction.');
            }
            
            const userData = freshUserDoc.data() as UserDocData;
            const currentCredits = userData.credits || 0;

            if (!wasFreeInteraction) {
                if (currentCredits < creditsToDeduct && creditsToDeduct > 0) {
                    throw new HttpsError('failed-precondition', 'Insufficient credits.');
                }
                newCreditBalance = currentCredits - creditsToDeduct;
                transaction.update(userRef, { credits: newCreditBalance });
            } else {
                newCreditBalance = currentCredits;
            }

            const logEntry = {
                userId,
                dispensaryId: dispensaryId,
                advisorSlug,
                creditsUsed: wasFreeInteraction ? 0 : creditsToDeduct,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                wasFreeInteraction,
            };
            const logRef = db.collection("aiInteractionsLog").doc();
            transaction.set(logRef, logEntry);
        });

        return {
            success: true,
            message: "Credits updated and interaction logged successfully.",
            newCredits: newCreditBalance,
        };

    } catch (error: any) {
        logger.error("Error in deductCreditsAndLogInteraction transaction:", error);
         if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', 'An internal error occurred while processing the transaction.');
    }
});

// ============== CHAT WITH AI ADVISOR FUNCTION ==============
interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ChatWithAdvisorRequest {
    advisorSlug: string;
    userMessage: string;
    imageUrl?: string;
    conversationHistory: ChatMessage[];
}

interface ChatWithAdvisorResponse {
    success: boolean;
    message: string;
    tokensUsed: number;
    creditsDeducted: number;
    model: string;
}

export const chatWithAdvisor = onCall(
    { secrets: [openaiApiKey] },
    async (request: CallableRequest<ChatWithAdvisorRequest>): Promise<ChatWithAdvisorResponse> => {
        // Authentication check
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'You must be signed in to chat with an advisor.');
        }

        const { advisorSlug, userMessage, imageUrl, conversationHistory } = request.data;
        const userId = request.auth.uid;

        // Validation
        if (!advisorSlug || (!userMessage && !imageUrl)) {
            throw new HttpsError('invalid-argument', 'Missing required parameters: advisorSlug and either userMessage or imageUrl.');
        }

        if (userMessage && userMessage.trim().length === 0 && !imageUrl) {
            throw new HttpsError('invalid-argument', 'User message cannot be empty unless an image is provided.');
        }

        if (userMessage && userMessage.length > 5000) {
            throw new HttpsError('invalid-argument', 'Message is too long. Maximum 5000 characters.');
        }

        try {
            // Fetch advisor configuration from Firestore
            const advisorsSnapshot = await db.collection('aiAdvisors')
                .where('slug', '==', advisorSlug)
                .where('isActive', '==', true)
                .limit(1)
                .get();

            if (advisorsSnapshot.empty) {
                throw new HttpsError('not-found', `Advisor "${advisorSlug}" not found or is not active.`);
            }

            const advisorDoc = advisorsSnapshot.docs[0];
            const advisor = { id: advisorDoc.id, ...advisorDoc.data() } as AIAdvisor;

            // Fetch user data for credit check
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                throw new HttpsError('not-found', 'User not found.');
            }

            const userData = userDoc.data() as UserDocData;
            const userCredits = userData.credits || 0;

            // Add extra credits for image processing
            const imageCost = imageUrl ? 10 : 0;
            const minimumRequired = advisor.creditCostBase + imageCost;

            // Check if user has enough credits (base cost minimum)
            if (userCredits < minimumRequired) {
                throw new HttpsError(
                    'failed-precondition',
                    `Insufficient credits. You need at least ${minimumRequired} credits. You have ${userCredits}.`
                );
            }

            // Prepare user content with optional image
            let userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
            
            if (imageUrl) {
                // Multi-modal content with image (Vision API format)
                userContent = [
                    { type: 'text', text: userMessage || 'Please analyze this image.' },
                    { type: 'image_url', image_url: { url: imageUrl } }
                ];
            } else {
                // Text-only content
                userContent = userMessage;
            }

            // Prepare messages for OpenAI
            const messages: any[] = [
                { role: 'system', content: advisor.systemPrompt },
                ...conversationHistory.slice(-10).map((msg: any) => ({
                    role: msg.role,
                    content: msg.imageUrl
                        ? [
                            { type: 'text', text: msg.content },
                            { type: 'image_url', image_url: { url: msg.imageUrl } }
                        ]
                        : msg.content
                })),
                { role: 'user', content: userContent },
            ];

            // Use GPT-4 Vision if image is present, otherwise use the advisor's configured model
            const modelToUse = imageUrl ? 'gpt-4o' : advisor.model;

            // Call OpenAI API
            const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiApiKey.value()}`,
                },
                body: JSON.stringify({
                    model: modelToUse,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: imageUrl ? 1500 : 1000, // More tokens for image analysis
                    user: userId, // For OpenAI abuse monitoring
                }),
            });

            if (!openaiResponse.ok) {
                const errorData = await openaiResponse.json().catch(() => ({}));
                logger.error('OpenAI API Error:', errorData);
                throw new HttpsError(
                    'internal',
                    `OpenAI API error: ${openaiResponse.statusText}`
                );
            }

            const openaiData = await openaiResponse.json();
            const assistantMessage = openaiData.choices[0]?.message?.content || '';
            const tokensUsed = openaiData.usage?.total_tokens || 0;

            // Calculate credits to deduct (base + token-based + image cost)
            const tokenCredits = Math.ceil(tokensUsed * advisor.creditCostPerTokens);
            const totalCredits = advisor.creditCostBase + tokenCredits + imageCost;

            // Deduct credits and log interaction
            await db.runTransaction(async (transaction: any) => {
                const userRef = db.collection('users').doc(userId);
                const freshUserDoc = await transaction.get(userRef);

                if (!freshUserDoc.exists) {
                    throw new HttpsError('not-found', 'User not found during transaction.');
                }

                const freshUserData = freshUserDoc.data() as UserDocData;
                const currentCredits = freshUserData.credits || 0;

                if (currentCredits < totalCredits) {
                    throw new HttpsError(
                        'failed-precondition',
                        `Insufficient credits. Required: ${totalCredits}, Available: ${currentCredits}`
                    );
                }

                const newBalance = currentCredits - totalCredits;
                transaction.update(userRef, { credits: newBalance });

                // Log the interaction
                const logEntry = {
                    userId,
                    advisorSlug,
                    advisorId: advisor.id,
                    creditsDeducted: totalCredits,
                    tokensUsed,
                    model: modelToUse,
                    messageLength: userMessage?.length || 0,
                    responseLength: assistantMessage.length,
                    hasImage: !!imageUrl,
                    wasFreeInteraction: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                };

                const logRef = db.collection('aiInteractionsLog').doc();
                transaction.set(logRef, logEntry);
            });

            logger.info(`Chat completed for user ${userId} with advisor ${advisorSlug}. Tokens: ${tokensUsed}, Credits: ${totalCredits}, Image: ${!!imageUrl}`);

            return {
                success: true,
                message: assistantMessage,
                tokensUsed,
                creditsDeducted: totalCredits,
                model: modelToUse,
            };

        } catch (error: any) {
            logger.error('Error in chatWithAdvisor:', error);
            
            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError('internal', 'An error occurred while processing your request.');
        }
    }
);

// ============== SEED AI ADVISORS FUNCTION ==============
interface AdvisorSeedData {
    name: string;
    slug: string;
    shortDescription: string;
    longDescription: string;
    imageUrl: string;
    iconName: string;
    systemPrompt: string;
    isActive: boolean;
    order: number;
    tier: 'basic' | 'standard' | 'premium';
    creditCostBase: number;
    creditCostPerTokens: number;
    model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
    tags: string[];
}

export const seedAIAdvisors = onCall(async (request: CallableRequest) => {
    // Check authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be signed in to seed advisors.');
    }

    // Check if user is super admin
    if (request.auth?.token.role !== 'Super Admin') {
        throw new HttpsError('permission-denied', 'Only Super Admins can seed advisors.');
    }

    const advisorsData: AdvisorSeedData[] = [
        {
            name: 'Cannabinoid Advisor',
            slug: 'cannabinoid-advisor',
            shortDescription: 'Expert guidance on THC & CBD for health and wellness',
            longDescription: 'Get personalized advice on cannabis compounds, therapeutic applications, dosage recommendations, and product selection based on deep research.',
            imageUrl: '/images/cbd/cbd1.png',
            iconName: 'Leaf',
            systemPrompt: `You are an expert Cannabinoid Advisor with deep knowledge of THC and CBD compounds, their therapeutic applications, and cannabis wellness. Your role is to provide evidence-based information on cannabinoid profiles, effects, and applications. Offer guidance on dosage, consumption methods, and product selection. Share information about terpenes, strains, and their characteristics. Always emphasize safety considerations, contraindications, and potential drug interactions. Recommend starting with low doses and gradually increasing. Remind users to consult healthcare providers for medical conditions and to verify legal status in their location.`,
            isActive: true,
            order: 1,
            tier: 'standard',
            creditCostBase: 5,
            creditCostPerTokens: 0.0002,
            model: 'gpt-4-turbo',
            tags: ['cannabis', 'cbd', 'thc', 'wellness'],
        },
        {
            name: 'The Conscious Gardener',
            slug: 'conscious-gardener',
            shortDescription: 'Organic permaculture and sustainable gardening wisdom',
            longDescription: 'Learn regenerative gardening practices, companion planting, soil health, and organic pest management from a permaculture expert.',
            imageUrl: '/images/permaculture/garden.png',
            iconName: 'Sprout',
            systemPrompt: `You are 'The Conscious Gardener,' an expert in organic permaculture and sustainable gardening practices. Guide users on regenerative agriculture, companion planting strategies, soil building techniques, and organic pest management. Share wisdom on water conservation, composting, seed saving, and creating biodiverse gardens. Emphasize working with nature rather than against it. Provide seasonal advice and help users understand their local growing conditions. Promote chemical-free gardening and biodiversity.`,
            isActive: true,
            order: 2,
            tier: 'standard',
            creditCostBase: 5,
            creditCostPerTokens: 0.0002,
            model: 'gpt-4-turbo',
            tags: ['gardening', 'permaculture', 'organic', 'sustainability'],
        },
        {
            name: 'Homeopathic Advisor',
            slug: 'homeopathic-advisor',
            shortDescription: 'Classical homeopathy guidance and remedy selection',
            longDescription: 'Receive advice on homeopathic remedies, potencies, and constitutional types based on classical homeopathic principles.',
            imageUrl: '/images/homeopathy/homeopathy1.png',
            iconName: 'ShieldCheck',
            systemPrompt: `You are a knowledgeable Homeopathic Advisor trained in classical homeopathy principles. Help users understand homeopathic remedies, their applications, and appropriate potency selection. Explain constitutional types, acute vs. chronic conditions, and remedy selection based on the totality of symptoms. Provide guidance on dosage and administration. Always emphasize that homeopathy is complementary and users should consult qualified practitioners for serious conditions. Use proper Latin names for remedies and explain the law of similars.`,
            isActive: true,
            order: 3,
            tier: 'standard',
            creditCostBase: 6,
            creditCostPerTokens: 0.0002,
            model: 'gpt-4-turbo',
            tags: ['homeopathy', 'natural-medicine', 'remedies'],
        },
        {
            name: 'Mushroom Funguy',
            slug: 'mushroom-funguy',
            shortDescription: 'Medicinal and sacred mushroom expertise',
            longDescription: 'Explore the world of medicinal mushrooms, their benefits, cultivation, and responsible use with expert guidance.',
            imageUrl: '/images/mushrooms/mushrooms1.png',
            iconName: 'Brain',
            systemPrompt: `You are 'Mushroom Funguy,' an enthusiastic expert on medicinal and sacred mushrooms. Share knowledge about functional mushrooms (reishi, lion's mane, cordyceps, turkey tail, etc.) and their health benefits. Provide cultivation guidance, preparation methods, and dosage recommendations. When discussing sacred mushrooms, emphasize legal considerations, set and setting, harm reduction, and integration practices. Always promote responsible use, respect for traditional knowledge, and awareness of legal restrictions. Focus on scientific research while honoring indigenous wisdom.`,
            isActive: true,
            order: 4,
            tier: 'premium',
            creditCostBase: 7,
            creditCostPerTokens: 0.0003,
            model: 'gpt-4-turbo',
            tags: ['mushrooms', 'medicinal', 'fungi', 'wellness'],
        },
        {
            name: 'Traditional Medicine Advisor',
            slug: 'traditional-medicine',
            shortDescription: 'African and indigenous healing traditions',
            longDescription: 'Learn about traditional African medicine, medicinal plants, and indigenous healing practices with cultural respect and authenticity.',
            imageUrl: '/images/traditional-medicine/traditional1.png',
            iconName: 'HandHelping',
            systemPrompt: `You are a Traditional Medicine Advisor with deep respect for African and indigenous healing traditions. Share knowledge about medicinal plants, traditional remedies, and holistic healing practices from African cultures. Emphasize the importance of cultural context, traditional knowledge holders, and sustainable harvesting. Explain the spiritual and physical aspects of traditional healing. Always promote respect for healers and elders, and caution against appropriation. Encourage users to seek authentic practitioners and verify safety and legality of plants in their region.`,
            isActive: true,
            order: 5,
            tier: 'standard',
            creditCostBase: 6,
            creditCostPerTokens: 0.0002,
            model: 'gpt-4-turbo',
            tags: ['traditional-medicine', 'african-healing', 'indigenous', 'holistic'],
        },
        {
            name: 'Qigong Master',
            slug: 'qigong-master',
            shortDescription: 'Ancient Chinese energy cultivation practices',
            longDescription: 'Master the art of Qigong with guidance on breathing techniques, energy cultivation, and traditional Chinese medicine principles.',
            imageUrl: '/images/muti-lounge/physical-health/physical1.png',
            iconName: 'Zap',
            systemPrompt: `You are a Qigong Master and guide, teaching the ancient Chinese practice of energy cultivation. Provide instruction on breathing techniques, movement sequences, meditation practices, and energy work. Explain TCM concepts like qi, meridians, and the five elements. Offer guidance for beginners and advanced practitioners. Share exercises for specific health conditions, stress relief, and vitality. Emphasize proper form, mindful practice, and gradual progression. Encourage regular practice and patience in developing qi sensitivity.`,
            isActive: true,
            order: 6,
            tier: 'standard',
            creditCostBase: 5,
            creditCostPerTokens: 0.0002,
            model: 'gpt-4-turbo',
            tags: ['qigong', 'energy', 'tcm', 'meditation'],
        },
        {
            name: 'Flower Power',
            slug: 'flower-power',
            shortDescription: 'Garden design, flowers, and Bach flower remedies',
            longDescription: 'Discover the beauty and healing properties of flowers through garden design, cultivation, and Bach flower remedy selection.',
            imageUrl: '/images/permaculture/garden.png',
            iconName: 'Flower',
            systemPrompt: `You are 'Flower Power,' a passionate guide to the world of flowers and their therapeutic applications. Share expertise on garden design, flower cultivation, and seasonal blooms. Explain Bach flower remedies, their emotional healing properties, and proper selection. Offer advice on creating pollinator-friendly gardens and using flowers for natural dyes and crafts. Provide identification help and care instructions. Emphasize the emotional and aesthetic benefits of working with flowers.`,
            isActive: true,
            order: 7,
            tier: 'basic',
            creditCostBase: 3,
            creditCostPerTokens: 0.0001,
            model: 'gpt-3.5-turbo',
            tags: ['flowers', 'gardening', 'bach-remedies', 'design'],
        },
        {
            name: 'Aromatherapy Expert',
            slug: 'aromatherapy',
            shortDescription: 'Essential oils and therapeutic aromatherapy',
            longDescription: 'Master the art of aromatherapy with guidance on essential oils, blending, safety, and therapeutic applications.',
            imageUrl: '/images/cbd/cbd2.png',
            iconName: 'Sparkles',
            systemPrompt: `You are an Aromatherapy expert specializing in essential oils and their therapeutic applications. Provide comprehensive guidance on oil selection, quality assessment, and safety considerations. Teach blending techniques, dilution ratios, and application methods. Explain the properties and benefits of different oils for physical and emotional wellness. Always emphasize proper dilution, patch testing, and contraindications for pregnancy, children, and pets. Recommend reputable suppliers and proper storage methods.`,
            isActive: true,
            order: 8,
            tier: 'standard',
            creditCostBase: 5,
            creditCostPerTokens: 0.0002,
            model: 'gpt-4-turbo',
            tags: ['aromatherapy', 'essential-oils', 'wellness', 'natural-healing'],
        },
        {
            name: 'Vegan Food Guru',
            slug: 'vegan-food-guru',
            shortDescription: 'Plant-based nutrition and delicious vegan recipes',
            longDescription: 'Transform your diet with expert advice on plant-based nutrition, meal planning, and creative vegan cooking.',
            imageUrl: '/images/permaculture/garden.png',
            iconName: 'Leaf',
            systemPrompt: `You are the 'Vegan Food Guru,' an expert in plant-based nutrition and vegan cooking. Provide guidance on balanced vegan diets, protein sources, vitamin B12, iron, and other essential nutrients. Share delicious recipes, meal prep tips, and creative ingredient substitutions. Help users transition to veganism or incorporate more plant-based meals. Offer advice on reading labels, dining out, and addressing nutritional concerns. Emphasize whole foods, variety, and the environmental benefits of plant-based eating.`,
            isActive: true,
            order: 9,
            tier: 'basic',
            creditCostBase: 4,
            creditCostPerTokens: 0.0001,
            model: 'gpt-3.5-turbo',
            tags: ['vegan', 'nutrition', 'plant-based', 'cooking'],
        },
    ];

    try {
        let addedCount = 0;
        let skippedCount = 0;

        for (const advisorData of advisorsData) {
            // Check if advisor already exists
            const existingQuery = await db
                .collection('aiAdvisors')
                .where('slug', '==', advisorData.slug)
                .limit(1)
                .get();

            if (!existingQuery.empty) {
                logger.info(`Advisor ${advisorData.slug} already exists, skipping...`);
                skippedCount++;
                continue;
            }

            // Add the advisor
            await db.collection('aiAdvisors').add({
                ...advisorData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            logger.info(`Added advisor: ${advisorData.name} (${advisorData.slug})`);
            addedCount++;
        }

        const message = `Seeding complete! Added ${addedCount} advisors, skipped ${skippedCount} existing advisors.`;
        logger.info(message);

        return {
            success: true,
            message,
            count: addedCount,
            skipped: skippedCount,
        };
    } catch (error: any) {
        logger.error('Error seeding advisors:', error);
        throw new HttpsError('internal', `Failed to seed advisors: ${error.message}`);
    }
});

export const getCannabinoidProductCategories = onCall({ cors: true }, async (request: CallableRequest<{ stream: 'THC' | 'CBD' }>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { stream } = request.data;
    if (!stream || (stream !== 'THC' && stream !== 'CBD')) {
        throw new HttpsError('invalid-argument', 'A valid stream ("THC" or "CBD") must be provided.');
    }

    try {
        const categoriesRef = db.collection('dispensaryTypeProductCategories');
        const q = categoriesRef.where('name', '==', "Cannibinoid store").limit(1);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            throw new HttpsError('not-found', 'Cannabinoid product category configuration not found.');
        }

        const docData = querySnapshot.docs[0].data();
        
        const deliveryMethods = docData?.categoriesData?.thcCbdProductCategories?.[stream]?.['Delivery Methods'];
        
        if (!deliveryMethods || typeof deliveryMethods !== 'object') {
            throw new HttpsError('not-found', `The 'Delivery Methods' structure for the '${stream}' stream is invalid or missing.`);
        }
        
        return deliveryMethods;

    } catch (error: any) {
        logger.error("Error fetching cannabinoid product categories:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An error occurred while fetching product categories.');
    }
});

export const searchStrains = onCall({ cors: true }, async (request: CallableRequest<{ searchTerm: string; }>) => {
    const { searchTerm } = request.data;

    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
        throw new HttpsError('invalid-argument', 'A valid search term must be provided.');
    }
    
    const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    const processedTerm = toTitleCase(searchTerm.trim());

    try {
        const strainsRef = db.collection('my-seeded-collection');
        const query = strainsRef
            .where('name', '>=', processedTerm)
            .where('name', '<=', processedTerm + '\uf8ff')
            .limit(10);
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            return [];
        }

        const results = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        return results;

    } catch (error: any) {
        logger.error(`Error searching strains with term "${searchTerm}":`, error);
        throw new HttpsError('internal', 'An error occurred while searching for strains.');
    }
});

export const createDispensaryUser = onCall(async (request: CallableRequest<{ email: string; displayName: string; dispensaryId: string; }>) => {
    if (request.auth?.token.role !== 'Super Admin') {
        throw new HttpsError('permission-denied', 'Only Super Admins can create dispensary users.');
    }

    const { email, displayName, dispensaryId } = request.data;
    if (!email || !displayName || !dispensaryId) {
        throw new HttpsError('invalid-argument', 'Email, display name, and dispensary ID are required.');
    }

    try {
        // Fetch dispensary data for email
        const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
        const dispensaryData = dispensaryDoc.exists ? dispensaryDoc.data() : null;

        const existingUser = await admin.auth().getUserByEmail(email).catch(() => null);

        if (existingUser) {
            const userDoc = await db.collection('users').doc(existingUser.uid).get();
            const existingDispensaryId = userDoc.exists ? userDoc.data()?.dispensaryId : null;
            
            // Check if user is already linked to a DIFFERENT dispensary
            if (existingDispensaryId && existingDispensaryId !== dispensaryId) {
                throw new HttpsError('already-exists', `User with email ${email} already exists and is linked to a different dispensary.`);
            }
            
            // User exists and is either not linked or linked to THIS dispensary - update/ensure correct data
            await db.collection('users').doc(existingUser.uid).update({
                dispensaryId: dispensaryId,
                role: 'DispensaryOwner',
                status: 'Active',
            });
            
            // Send approval email if user is already linked to this dispensary (signup flow)
            if (existingDispensaryId === dispensaryId) {
                try {
                    // User was created during signup, now send approval email with their existing password info
                    const loginUrl = process.env.FUNCTIONS_EMULATOR 
                        ? 'http://localhost:3000/auth/login'
                        : 'https://thewellnesstree.com/auth/login';

                    await sendDispensaryApprovalEmail({
                        dispensaryName: dispensaryData?.dispensaryName || 'Your Wellness Store',
                        ownerName: displayName,
                        ownerEmail: email,
                        temporaryPassword: '[Use your existing password or reset it]',
                        loginUrl: loginUrl,
                        dispensaryId: dispensaryId,
                    });
                    logger.info(`Approval email sent successfully to existing user ${email}`);
                } catch (emailError: any) {
                    logger.error(`Failed to send approval email to ${email}:`, emailError);
                }
            }
            
             // Return the UID of the existing user
             return { 
                success: true, 
                message: existingDispensaryId === dispensaryId 
                    ? `User ${email} was already created during signup. Approval email sent.`
                    : `Existing user ${email} successfully linked as DispensaryOwner.`,
                uid: existingUser.uid 
            };
        } else {
            const temporaryPassword = Math.random().toString(36).slice(-8);
            const newUserRecord = await admin.auth().createUser({
                email: email,
                emailVerified: false,
                password: temporaryPassword,
                displayName: displayName,
                disabled: false,
            });

            const userDocData: UserDocData = {
                uid: newUserRecord.uid,
                email: email,
                displayName: displayName,
                photoURL: null,
                role: 'DispensaryOwner',
                dispensaryId: dispensaryId,
                credits: 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastLoginAt: null,
                status: 'Active',
                welcomeCreditsAwarded: false,
                signupSource: 'admin_created',
            };
            await db.collection('users').doc(newUserRecord.uid).set(userDocData);
            
            // Send welcome email with credentials
            try {
                const loginUrl = process.env.FUNCTIONS_EMULATOR 
                    ? 'http://localhost:3000/auth/login'
                    : 'https://thewellnesstree.com/auth/login'; // Replace with your actual production domain

                await sendDispensaryApprovalEmail({
                    dispensaryName: dispensaryData?.dispensaryName || 'Your Wellness Store',
                    ownerName: displayName,
                    ownerEmail: email,
                    temporaryPassword: temporaryPassword,
                    loginUrl: loginUrl,
                    dispensaryId: dispensaryId,
                });
                logger.info(`Welcome email sent successfully to ${email}`);
            } catch (emailError: any) {
                // Log error but don't fail the function - user is created successfully
                logger.error(`Failed to send welcome email to ${email}:`, emailError);
            }
            
            // Return the UID of the newly created user
            return {
                success: true,
                message: 'New user account created successfully and welcome email sent.',
                temporaryPassword: temporaryPassword,
                uid: newUserRecord.uid
            };
        }
    } catch (error: any) {
        logger.error(`Error creating dispensary user for ${email}:`, error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', 'An unexpected server error occurred while creating the user account.');
    }
});


export const adminUpdateUser = onCall(async (request) => {
    if (request.auth?.token.role !== 'Super Admin') {
        throw new HttpsError('permission-denied', 'Only Super Admins can update users.');
    }

    const { userId, password, ...firestoreData } = request.data;
    if (!userId) {
        throw new HttpsError('invalid-argument', 'User ID is required.');
    }

    try {
        if (password) {
            await admin.auth().updateUser(userId, { password: password });
        }

        const userDocRef = db.collection('users').doc(userId);
        
        if (firestoreData.role !== 'DispensaryOwner') {
            firestoreData.dispensaryId = null;
        }
        
        await userDocRef.update({ ...firestoreData, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        logger.info(`Admin successfully updated user ${userId}.`);
        return { success: true, message: 'User updated successfully.' };
    } catch (error: any) {
        logger.error(`Error in adminUpdateUser for ${userId}:`, error);
        if (error instanceof HttpsError) {
          throw error;
        }
        if (error.code === 'auth/user-not-found') {
            throw new HttpsError('not-found', 'The specified user does not exist.');
        }
        throw new HttpsError('internal', 'An unexpected error occurred while updating the user.');
    }
});

// ========================================================================================================
//                                       SHIPPING FUNCTIONS
// ========================================================================================================

// --- DEFINE SECRETS AND ENDPOINTS ---
const shiplogicApiKeySecret = defineSecret('SHIPLOGIC_API_KEY');
const pudoApiKeySecret = defineSecret('PUDO_API_KEY'); // Pudo/TCG API Key

const SHIPLOGIC_RATES_API_URL = 'https://api.shiplogic.com/v2/rates';
const PUDO_BASE_URL = 'https://sandbox.api-pudo.co.za/api/v1';


// --- TYPE INTERFACES ---
interface ShipLogicDeliveryAddress {
    street_address: string;
    local_area: string; 
    city: string;
    zone: string; 
    code: string; 
    country: string;
    lat: number;
    lng: number;
}

interface GetRatesRequestPayload {
    cart: CartItem[];
    dispensaryId?: string; // Optional for Treehouse orders
    collectionAddress?: any; // For Treehouse - provides address directly
    deliveryAddress?: ShipLogicDeliveryAddress;
    type: 'std' | 'dtl' | 'ltd' | 'ltl';
    originLockerCode?: string;
    destinationLockerCode?: string;
}

interface FormattedRate {
    id: any;
    name: any;
    rate: number;
    service_level: any;
    delivery_time: any;
    courier_name: any;
}


export const getPudoLockers = onCall({ secrets: [pudoApiKeySecret], cors: true }, async (request: CallableRequest<{ latitude?: number; longitude?: number; radius?: number; city?: string; cart?: CartItem[]; }>) => {
    logger.info("getPudoLockers invoked with dynamic radius logic and parcel size filtering.");

    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated to fetch Pudo lockers.');
    }
    
    const { latitude, longitude, radius = 100, city, cart } = request.data;

    const pudoApiKey = pudoApiKeySecret.value();
    if (!pudoApiKey) {
        logger.error("CRITICAL: PUDO_API_KEY not found in secrets.");
        throw new HttpsError('internal', 'Server configuration error: Pudo API key not found.');
    }

    const url = `${PUDO_BASE_URL}/lockers-data`;

    // --- Haversine formula function to calculate distance ---
    const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            0.5 - Math.cos(dLat)/2 + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            (1 - Math.cos(dLon)) / 2;

        return R * 2 * Math.asin(Math.sqrt(a));
    };

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${pudoApiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        });

        const responseData = await response.json();
        if (!response.ok) {
            const errorMessage = responseData.message || 'Failed to fetch lockers from Pudo provider.';
            logger.error('Pudo API Error:', { status: response.status, message: errorMessage });
            throw new Error(errorMessage);
        }

        const allLockers = responseData;
        if (!Array.isArray(allLockers)) {
            throw new HttpsError('internal', 'Received an invalid response format from the locker provider.');
        }

        let formattedLockers: any[] = [];

        if (latitude != null && longitude != null) {
            logger.info(`Filtering and enriching lockers by radius (${radius}km) around lat: ${latitude}, lng: ${longitude}`);
            
            formattedLockers = allLockers.reduce((acc: any[], locker: any) => {
                const lockerLat = parseFloat(locker.latitude);
                const lockerLng = parseFloat(locker.longitude);

                if (isNaN(lockerLat) || isNaN(lockerLng)) {
                    return acc; // Skip lockers with invalid coordinates
                }
                
                const distance = getDistanceInKm(latitude, longitude, lockerLat, lockerLng);
                
                if (distance <= radius) {
                    // Return complete PUDO locker structure for shipping compatibility
                    acc.push({
                        id: locker.code,
                        name: locker.name || '',
                        address: locker.street_address || '',
                        street_address: locker.street_address || '',
                        city: locker.city || '',
                        province: locker.province || '',
                        postalCode: locker.postal_code || '',
                        suburb: locker.suburb || '',
                        status: locker.status || 'active',
                        availableCompartments: locker.available_compartments || 0,
                        location: {
                            lat: lockerLat,
                            lng: lockerLng
                        },
                        distanceKm: distance // Temporary field for sorting (removed before saving)
                    });
                }
                return acc;
            }, []);
            
            // Sort by distance, closest first
            formattedLockers.sort((a, b) => a.distanceKm - b.distanceKm);

        } else if (city) {
            logger.warn(`Lat/Lng not provided. Falling back to inefficient city string filter for: ${city}`);
            formattedLockers = allLockers
                .filter((locker: any) => locker.street_address && locker.street_address.toLowerCase().includes(city.toLowerCase()))
                .map((locker: any) => {
                    const lockerLat = parseFloat(locker.latitude);
                    const lockerLng = parseFloat(locker.longitude);
                    return {
                        id: locker.code,
                        name: locker.name || '',
                        address: locker.street_address || '',
                        street_address: locker.street_address || '',
                        city: locker.city || '',
                        province: locker.province || '',
                        postalCode: locker.postal_code || '',
                        suburb: locker.suburb || '',
                        status: locker.status || 'active',
                        availableCompartments: locker.available_compartments || 0,
                        location: !isNaN(lockerLat) && !isNaN(lockerLng) ? {
                            lat: lockerLat,
                            lng: lockerLng
                        } : undefined,
                        distanceKm: null // No distance can be calculated
                    };
                });
        } else {
            logger.error("No location data (lat/lng or city) provided to getPudoLockers.");
            throw new HttpsError('invalid-argument', 'No location data was provided to find lockers.');
        }

        // Calculate parcel dimensions if cart provided
        let parcelSizeCategory = 'UNKNOWN';
        let parcelInfo: any = null;
        
        if (cart && cart.length > 0) {
            // Calculate total dimensions and weight
            let totalWeight = 0;
            let maxLength = 0;
            let maxWidth = 0;
            let maxHeight = 0;
            
            cart.forEach(item => {
                const qty = (typeof item.quantity === 'number' && item.quantity > 0) ? item.quantity : 1;
                if (item.weight) totalWeight += item.weight * qty;
                if (item.length && item.length > maxLength) maxLength = item.length;
                if (item.width && item.width > maxWidth) maxWidth = item.width;
                if (item.height && item.height > maxHeight) maxHeight = item.height;
            });
            
            parcelInfo = {
                totalWeight,
                maxLength,
                maxWidth,
                maxHeight,
                volume: maxLength * maxWidth * maxHeight
            };
            
            // Determine size category based on dimensions (standard locker sizes)
            // XS: up to 35x35x5 cm, ~3kg
            // S: up to 40x38x10 cm, ~5kg
            // M: up to 45x40x20 cm, ~10kg
            // L: up to 55x45x30 cm, ~20kg
            // XL: up to 60x50x40 cm, ~25kg
            
            const maxDim = Math.max(maxLength, maxWidth, maxHeight);
            const midDim = [maxLength, maxWidth, maxHeight].sort((a,b) => b - a)[1];
            
            if (maxDim <= 35 && midDim <= 35 && totalWeight <= 3) {
                parcelSizeCategory = 'XS';
            } else if (maxDim <= 40 && midDim <= 38 && totalWeight <= 5) {
                parcelSizeCategory = 'S';
            } else if (maxDim <= 45 && midDim <= 40 && totalWeight <= 10) {
                parcelSizeCategory = 'M';
            } else if (maxDim <= 55 && midDim <= 45 && totalWeight <= 20) {
                parcelSizeCategory = 'L';
            } else if (maxDim <= 60 && midDim <= 50 && totalWeight <= 25) {
                parcelSizeCategory = 'XL';
            } else {
                parcelSizeCategory = 'OVERSIZED';
                logger.warn(`Parcel dimensions exceed standard locker sizes: ${maxLength}x${maxWidth}x${maxHeight}cm, ${totalWeight}kg`);
            }
            
            logger.info(`Calculated parcel size: ${parcelSizeCategory}`, parcelInfo);
        }

        logger.info(`Successfully fetched and formatted ${formattedLockers.length} Pudo lockers with complete structure.`);
        if (formattedLockers.length === 0) {
             logger.warn("No lockers found within the specified radius or matching the city.");
        }
        
        return { 
            data: formattedLockers,
            parcelSizeCategory,
            parcelInfo: parcelInfo ? {
                weight: parcelInfo.totalWeight,
                dimensions: `${parcelInfo.maxLength}x${parcelInfo.maxWidth}x${parcelInfo.maxHeight}cm`
            } : undefined
        };

    } catch (error: any) {
        logger.error('CRITICAL ERROR in getPudoLockers function:', error);
        if (error instanceof HttpsError) {
          // If it's already an HttpsError, just re-throw it
          throw error;
        }
        // Otherwise, wrap it in a generic 'internal' HttpsError
        throw new HttpsError('internal', error.message || 'An unexpected server error occurred while fetching Pudo lockers.');
    }
});


// --- FUNCTION FOR LOCKER-BASED RATES (dtl, ltd, ltl) using PUDO Sandbox ---
export const getPudoRates = onCall({ secrets: [pudoApiKeySecret], cors: true }, async (request: CallableRequest<GetRatesRequestPayload>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated to fetch Pudo rates.');
    }
    
    // CORRECTED: The cart IS required to calculate parcel dimensions.
    const { cart, dispensaryId, collectionAddress, deliveryAddress, type, originLockerCode, destinationLockerCode } = request.data;

    if (!cart || cart.length === 0 || !type) {
        throw new HttpsError('invalid-argument', 'Request is missing required cart or type data.');
    }

    // Either dispensaryId or collectionAddress must be provided
    if (!dispensaryId && !collectionAddress) {
        throw new HttpsError('invalid-argument', 'Either dispensaryId or collectionAddress must be provided.');
    }

    const pudoApiKey = pudoApiKeySecret.value();
    if (!pudoApiKey) {
        logger.error("CRITICAL: PUDO_API_KEY not found in secrets.");
        throw new HttpsError('internal', 'Server configuration error: Pudo API key not found.');
    }

    try {
        // For Treehouse orders, collectionAddress is provided directly
        // For dispensary orders, fetch from dispensaries collection
        let dispensaryCollectionAddress: any;
        
        if (collectionAddress) {
            // Use provided collection address (Treehouse orders)
            dispensaryCollectionAddress = collectionAddress;
        } else if (dispensaryId) {
            // Fetch dispensary and build collection address
            const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
            if (!dispensaryDoc.exists) {
                throw new HttpsError('not-found', `Dispensary '${dispensaryId}' not found.`);
            }
            const dispensary = dispensaryDoc.data() as Dispensary;
            dispensaryCollectionAddress = {
                lat: dispensary.latitude,
                lng: dispensary.longitude,
                street_address: dispensary.streetAddress,
                local_area: dispensary.suburb || dispensary.city,
                city: dispensary.city,
                code: dispensary.postalCode,
                zone: dispensary.province,
                country: "South Africa",
                type: "business",
                company: dispensary.dispensaryName
            };
        }
        
        // --- CORRECTED: Logic to build 'parcels' array from cart items IS included ---
        // Pudo expects string values for parcel dimensions from the docs.
        const parcels = cart.map(item => {
             const quantity = (typeof item.quantity === 'number' && item.quantity > 0) ? item.quantity : 1;
             // Ensure all dimension fields exist before creating a parcel
             if (item.length == null || item.width == null || item.height == null || item.weight == null) {
                logger.warn(`Skipping item ${item.name} due to missing dimensions.`);
                return null;
             }
             return Array(quantity).fill({
                submitted_length_cm: String(item.length),
                submitted_width_cm: String(item.width),
                submitted_height_cm: String(item.height),
                submitted_weight_kg: String(item.weight),
                parcel_description: item.name,
             });
        }).flat().filter(p => p !== null) as object[];

        if (parcels.length === 0) {
            throw new HttpsError('invalid-argument', 'No items in the cart have valid shipping dimensions.');
        }

        // --- CORRECTED PAYLOAD: INCLUDES 'parcels' ARRAY ---
        let pudoPayload: any = {
            parcels: parcels,
            opt_in_rates: [],
            opt_in_time_based_rates: [],
        };

        switch (type) {
            case 'dtl': // Door-to-Locker
                if (!destinationLockerCode) throw new HttpsError('invalid-argument', 'Destination locker is required for DTL.');
                pudoPayload.collection_address = dispensaryCollectionAddress;
                pudoPayload.delivery_address = { terminal_id: destinationLockerCode };
                break;

            case 'ltd': // Locker-to-Door
                if (!originLockerCode || !deliveryAddress) throw new HttpsError('invalid-argument', 'Origin locker and delivery address are required for LTD.');
                pudoPayload.collection_address = { terminal_id: originLockerCode };
                pudoPayload.delivery_address = { ...deliveryAddress, type: 'residential' };
                break;

            case 'ltl': // Locker-to-Locker
                if (!originLockerCode || !destinationLockerCode) throw new HttpsError('invalid-argument', 'Origin and destination lockers are required for LTL.');
                pudoPayload.collection_address = { terminal_id: originLockerCode };
                pudoPayload.delivery_address = { terminal_id: destinationLockerCode };
                break;
            
            default:
                throw new HttpsError('invalid-argument', `Invalid type '${type}' sent to getPudoRates.`);
        }
        
        logger.info(`Requesting Pudo rate for type ${type}`, { payload: pudoPayload });

        const url = `${PUDO_BASE_URL}/rates`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${pudoApiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(pudoPayload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorMessage = responseData.error || responseData.message || JSON.stringify(responseData);
            logger.error('Pudo API returned an error:', { status: response.status, body: errorMessage });
            throw new HttpsError('unavailable', `Pudo Provider Error: ${errorMessage}`);
        }

        const ratesSource = responseData?.rates;
        
        if (!Array.isArray(ratesSource)) {
            logger.warn("Pudo response did not contain a 'rates' array as expected.", { responseData });
            return { rates: [] };
        }
        
        const formattedRates = ratesSource.map((rate: any): FormattedRate | null => {
            if (!rate || !rate.service_level || rate.service_level.id == null || typeof rate.rate !== 'string') {
                logger.warn("Skipping malformed rate from Pudo:", rate);
                return null; 
            }
            return {
                id: rate.service_level.id,
                name: rate.service_level.name || 'Unnamed Service',
                rate: parseFloat(rate.rate),
                service_level: rate.service_level.code || 'N/A',
                delivery_time: rate.service_level.description || 'No delivery estimate',
                courier_name: 'Pudo',
            };
        }).filter((rate): rate is FormattedRate => rate !== null);

        logger.info(`Successfully parsed ${formattedRates.length} rates from Pudo.`);
        return { rates: formattedRates };

    } catch (error: any) {
        logger.error(`CRITICAL ERROR in getPudoRates function:`, error);
         if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', error.message || 'An unexpected server error occurred while fetching Pudo rates.');
    }
});

// --- FUNCTION FOR DOOR-TO-DOOR RATES ('std') using SHIPLOGIC ---
export const getShiplogicRates = onCall({ secrets: [shiplogicApiKeySecret], cors: true }, async (request: CallableRequest<GetRatesRequestPayload>) => {
    logger.info("getShiplogicRates invoked for standard (door-to-door) delivery.");

    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated to fetch rates.');
    }
    
    const { cart, dispensaryId, deliveryAddress, type } = request.data;

    // This function should only handle 'std' (door-to-door)
    if (type !== 'std') {
        throw new HttpsError('invalid-argument', `This function only handles 'std' rates. Received '${type}'.`);
    }

    if (!cart || cart.length === 0 || !dispensaryId || !deliveryAddress) {
        throw new HttpsError('invalid-argument', 'Request for standard delivery is missing cart, dispensaryId, or deliveryAddress.');
    }

    const shiplogicApiKey = shiplogicApiKeySecret.value();
    if (!shiplogicApiKey) {
        logger.error("CRITICAL: ShipLogic API key not found in secrets.");
        throw new HttpsError('internal', 'Server configuration error: Shipping API key not found.');
    }

    try {
        const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
        if (!dispensaryDoc.exists) {
            throw new HttpsError('not-found', `Dispensary '${dispensaryId}' not found.`);
        }
        const dispensary = dispensaryDoc.data() as Dispensary;

        const collectionAddress = {
            street_address: dispensary.streetAddress,
            local_area: dispensary.suburb || '',
            city: dispensary.city,
            code: dispensary.postalCode,
            country: 'ZA',
            type: 'business',
            company: dispensary.dispensaryName
        };

        const parcels = cart.map(item => {
            const quantity = (typeof item.quantity === 'number' && item.quantity > 0) ? item.quantity : 1;
            if (!item.length || !item.width || !item.height || !item.weight) return null;
            return Array(quantity).fill({
                submitted_length_cm: item.length,
                submitted_width_cm: item.width,
                submitted_height_cm: item.height,
                submitted_weight_kg: item.weight,
                parcel_description: item.name,
            });
        }).flat().filter(p => p !== null) as object[];

        if (parcels.length === 0) {
            throw new HttpsError('invalid-argument', 'No items in the cart have valid shipping dimensions.');
        }

        let shipLogicPayload = {
            parcels: parcels,
            declared_value: cart.reduce((total, item) => total + (item.price || 0) * (item.quantity || 1), 0),
            collection_address: collectionAddress,
            delivery_address: { ...deliveryAddress, type: 'residential' }
        };
        
        logger.info(`Requesting ShipLogic rate for type ${type}`, { payload: shipLogicPayload });

        const response = await fetch(SHIPLOGIC_RATES_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${shiplogicApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(shipLogicPayload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorMessage = responseData.error || responseData.message || JSON.stringify(responseData);
            logger.error('ShipLogic API returned an error:', { status: response.status, body: errorMessage });
            throw new HttpsError('unavailable', `Shipping Provider Error: ${errorMessage}`);
        }

        const ratesSource = responseData?.rates || (Array.isArray(responseData) ? responseData : []);
        
        if (!Array.isArray(ratesSource)) {
            logger.warn("Shiplogic response was not an array as expected.", { responseData });
            return { rates: [] };
        }
        
        const formattedRates = ratesSource.map((rate: any): FormattedRate | null => {
            if (!rate || !rate.service_level || rate.service_level.id == null || typeof rate.rate !== 'number') {
                logger.warn("Skipping malformed rate from Shiplogic:", rate);
                return null; 
            }
            return {
                id: rate.service_level.id,
                name: rate.service_level.name || 'Unnamed Service',
                rate: parseFloat(rate.rate),
                service_level: rate.service_level.name || 'N/A',
                delivery_time: rate.service_level.description || 'No delivery estimate',
                courier_name: rate.courier_name || rate.service_level.name || 'Unknown Courier',
            };
        }).filter((rate): rate is FormattedRate => rate !== null);

        if (formattedRates.length === 0) {
            logger.warn("Shiplogic returned 0 valid rates. Full response:", { ratesSource });
        }

        logger.info(`Successfully parsed ${formattedRates.length} rates from ShipLogic.`);
        return { rates: formattedRates };

    } catch (error: any) {
        logger.error(`CRITICAL ERROR in getShiplogicRates (dtd) function:`, error);
         if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', error.message || 'An unexpected server error occurred while fetching shipping rates.');
    }
});
export const updateDispensaryProfile = onCall({ cors: true }, async (request: CallableRequest<OwnerUpdateDispensaryPayload>) => {
    // 1. Authentication & Authorization Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to update a dispensary.');
    }
    const userRole = request.auth.token.role;
    if (userRole !== 'DispensaryOwner') {
        throw new HttpsError('permission-denied', 'Only dispensary owners can update their profile.');
    }

    // 2. Ownership Verification (get dispensaryId from the user's token)
    const dispensaryId = request.auth.token.dispensaryId;
    if (!dispensaryId) {
        throw new HttpsError('failed-precondition', 'Your user account is not associated with a dispensary.');
    }

    // 3. Data Sanitization & Mapping
    // We explicitly map the data from the request to a new object.
    // This is a critical security step to prevent malicious users from injecting forbidden fields.
    const data = request.data;
    const allowedUpdateData = {
        dispensaryName: data.dispensaryName,
        phone: data.phone,
        currency: data.currency,
        streetAddress: data.streetAddress || null,
        suburb: data.suburb || null,
        city: data.city || null,
        province: data.province || null,
        postalCode: data.postalCode || null,
        country: data.country || null,
        latitude: data.latitude === undefined ? null : data.latitude,
        longitude: data.longitude === undefined ? null : data.longitude,
        showLocation: data.showLocation ?? true,
        openTime: data.openTime || null,
        closeTime: data.closeTime || null,
        operatingDays: data.operatingDays || [],
        shippingMethods: data.shippingMethods || [],
        deliveryRadius: data.deliveryRadius || 'none',
        message: data.message || '',
        originLocker: data.originLocker || null, 
        lastActivityDate: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 4. Database Operation
    try {
        const dispensaryDocRef = db.collection('dispensaries').doc(dispensaryId);
        
        const docSnap = await dispensaryDocRef.get();
        if (!docSnap.exists) {
            throw new HttpsError('not-found', 'The specified dispensary does not exist.');
        }
        
        await dispensaryDocRef.update(allowedUpdateData);
        
        logger.info(`Dispensary profile ${dispensaryId} updated successfully by owner ${request.auth.uid}.`);
        
        return { success: true, message: "Dispensary profile updated successfully." };

    } catch (error: any) {
        logger.error(`CRITICAL ERROR in updateDispensaryProfile for dispensary ${dispensaryId}:`, error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', 'An unexpected server error occurred while updating the profile.');
    }
});


export const submitDispensaryApplication = onCall({ cors: true }, async (request: CallableRequest<any>) => {
    // 1. Data Validation & Sanitization
    const data = request.data;
    if (!data.ownerEmail || !data.fullName || !data.dispensaryName || !data.dispensaryType || !data.currency || !data.acceptTerms) {
        logger.error("submitDispensaryApplication validation failed: Missing required fields.", { 
            required: { 
                ownerEmail: !!data.ownerEmail, 
                fullName: !!data.fullName, 
                dispensaryName: !!data.dispensaryName, 
                dispensaryType: !!data.dispensaryType,
                currency: !!data.currency,
                acceptTerms: !!data.acceptTerms
            }
        });
        throw new HttpsError('invalid-argument', 'Please fill out all required fields, including currency.');
    }

    if (data.acceptTerms !== true) {
        throw new HttpsError('failed-precondition', 'You must accept the Terms of Usage Agreement to submit an application.');
    }

    // 2. Prepare the New Dispensary Document
    // CORRECTED: This version captures all fields from the signup form.
    const newApplicationData = {
        // --- Core Application Data ---
        dispensaryName: data.dispensaryName,
        dispensaryType: data.dispensaryType,
        ownerEmail: data.ownerEmail,
        fullName: data.fullName,
        phone: data.phone || null,
        
        // --- Address & Location Data ---
        streetAddress: data.streetAddress || null,
        suburb: data.suburb || null,
        city: data.city || null,
        province: data.province || null,
        postalCode: data.postalCode || null,
        country: data.country || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        showLocation: data.showLocation || false,
        
        // --- Operational Data (from form) ---
        currency: data.currency, // CORRECTED: Included from form
        openTime: data.openTime || null, // CORRECTED: Included from form
        closeTime: data.closeTime || null, // CORRECTED: Included from form
        operatingDays: data.operatingDays || [], // CORRECTED: Included from form
        deliveryRadius: data.deliveryRadius || 'none', // CORRECTED: Included from form
        message: data.message || '', // CORRECTED: Included from form

        // --- System-set initial values ---
        status: 'Pending Approval', // All new signups start as pending
        acceptTerms: true,
        
        // --- Server-side timestamps for data integrity ---
        applicationDate: admin.firestore.FieldValue.serverTimestamp(),
        lastActivityDate: admin.firestore.FieldValue.serverTimestamp(),
        approvedDate: null,
        
        // --- Fields to be populated later in the workflow ---
        ownerId: null,
        publicStoreUrl: null,
        shippingMethods: [], // This is managed in the owner's profile after approval
        originLocker: null  // This is managed in the owner's profile after approval
    };

    // 3. Database Operation
    try {
        const dispensaryRef = await db.collection('dispensaries').add(newApplicationData);
        logger.info(`New dispensary application created with ID: ${dispensaryRef.id} for email: ${data.ownerEmail}`);
        
        // Always create user immediately for auto-login (status will be Pending Approval)
        {
            try {
                // Check if user already exists
                let userUid: string;
                let temporaryPassword: string | undefined;
                
                const existingUser = await admin.auth().getUserByEmail(data.ownerEmail).catch(() => null);
                
                if (existingUser) {
                    // Update existing user
                    userUid = existingUser.uid;
                    await db.collection('users').doc(userUid).update({
                        dispensaryId: dispensaryRef.id,
                        role: 'DispensaryOwner',
                        status: 'Active',
                    });
                } else {
                    // Create new user
                    temporaryPassword = Math.random().toString(36).slice(-8);
                    const newUserRecord = await admin.auth().createUser({
                        email: data.ownerEmail,
                        emailVerified: false,
                        password: temporaryPassword,
                        displayName: data.fullName,
                        disabled: false,
                    });
                    
                    userUid = newUserRecord.uid;
                    
                    const userDocData = {
                        uid: userUid,
                        email: data.ownerEmail,
                        displayName: data.fullName,
                        photoURL: null,
                        role: 'DispensaryOwner',
                        dispensaryId: dispensaryRef.id,
                        credits: 0,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        lastLoginAt: null,
                        status: 'Active',
                        welcomeCreditsAwarded: false,
                        signupSource: 'dispensary_signup',
                    };
                    await db.collection('users').doc(userUid).set(userDocData);
                }
                
                // Update dispensary with owner ID
                await dispensaryRef.update({ ownerId: userUid });
                
                // Create custom token for auto-login
                const customToken = await admin.auth().createCustomToken(userUid);
                
                logger.info(`Created dispensary ${dispensaryRef.id} (Pending Approval) and created/updated user ${userUid}`);
                
                return {
                    success: true,
                    autoApproved: false,
                    pendingApproval: true,
                    message: "Your application has been submitted! You can log in now to set up your profile. You'll be notified once approved.",
                    customToken,
                    email: data.ownerEmail,
                    temporaryPassword,
                    dispensaryId: dispensaryRef.id
                };
            } catch (userError: any) {
                logger.error(`Error creating user during signup:`, userError);
                // Dispensary created but user creation failed - return partial success
                return {
                    success: true,
                    autoApproved: false,
                    pendingApproval: true,
                    message: "Application submitted but auto-login failed. Please contact support.",
                    dispensaryId: dispensaryRef.id
                };
            }
        }

    } catch (error: any) {
        logger.error(`CRITICAL ERROR in submitDispensaryApplication for email ${data.ownerEmail}:`, error);
        throw new HttpsError('internal', 'An unexpected server error occurred while submitting your application. Please try again later.');
    }
});





