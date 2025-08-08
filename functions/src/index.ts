
'use server';
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";
import {
  onDocumentCreated,
  onDocumentUpdated,
  Change,
  FirestoreEvent,
} from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { runScraper } from './scrapers/justbrand-scraper';

// Import types from the main app source to ensure consistency
import type {
  Dispensary,
  ProductRequestDocData,
  PoolIssueDocData,
  UserDocData,
  NotificationData,
  NoteDataCloud,
  ScrapeLog
} from "../../src/types";


// ============== FIREBASE ADMIN SDK INITIALIZATION ==============
if (admin.apps.length === 0) {
    try {
        admin.initializeApp();
        logger.info("Firebase Admin SDK initialized successfully.");
    } catch (e: any) {
        logger.error("CRITICAL: Firebase Admin SDK initialization failed:", e);
    }
}
const db = admin.firestore();
// ============== END INITIALIZATION ==============


// ============== SENDGRID CONFIGURATION ==============
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "YOUR_SENDGRID_API_KEY_PLACEHOLDER");
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@example.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:9002";
// ============== END SENDGRID =====================


// Helper function to sync a user's role from their Firestore doc to their Auth custom claims
const setClaimsFromDoc = async (userId: string, userData: UserDocData | undefined) => {
  if (!userData) {
    logger.warn(`No user data provided for ${userId}, cannot set claims.`);
    return;
  }
  
  try {
    const currentClaims = (await admin.auth().getUser(userId)).customClaims || {};
    const newClaims: { [key: string]: any } = { 
        role: userData.role || null,
        dispensaryId: userData.dispensaryId || null,
    };
    
    if (currentClaims.role === newClaims.role && currentClaims.dispensaryId === newClaims.dispensaryId) {
      logger.log(`Claims for user ${userId} are already up-to-date.`);
      return;
    }
  
    await admin.auth().setCustomUserClaims(userId, newClaims);
    logger.info(`Successfully set custom claims for user ${userId}:`, newClaims);
  } catch (error) {
    logger.error(`Error setting custom claims for ${userId}:`, error);
  }
};

/**
 * Sends a notification email using SendGrid.
 */
async function sendDispensaryNotificationEmail(
  toEmail: string,
  subject: string,
  htmlBody: string,
  dispensaryName?: string
) {
  if (
    !process.env.SENDGRID_API_KEY ||
    process.env.SENDGRID_API_KEY === "YOUR_SENDGRID_API_KEY_PLACEHOLDER" ||
    !SENDGRID_FROM_EMAIL ||
    SENDGRID_FROM_EMAIL === "noreply@example.com" ||
    SENDGRID_FROM_EMAIL.trim() === ""
  ) {
    logger.warn("SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not fully configured. Email simulation will occur via logs only.");
    logger.info(`Simulating Sending Email (HTML) to: ${toEmail}`);
    logger.info(`Subject: ${subject}`);
    logger.info(`HTML Body:\n${htmlBody}`);
    logger.info(`(Related Entity: ${dispensaryName || 'The Wellness Tree Platform'})`);
    return;
  }

  const msg = {
    to: toEmail,
    from: {
      email: SENDGRID_FROM_EMAIL,
      name: "The Wellness Tree"
    },
    subject: subject,
    html: htmlBody,
  };

  try {
    await sgMail.send(msg);
    logger.info(`Email successfully sent to ${toEmail} (Subject: ${subject}) via SendGrid.`);
  } catch (error: any) {
    logger.error(`Error sending email to ${toEmail} (Subject: ${subject}) via SendGrid:`, error);
    if (error.response) {
      logger.error("SendGrid Response Error Body:", error.response.body);
    }
  }
}

/**
 * Generates a basic HTML email template.
 */
function generateHtmlEmail(title: string, contentLines: string[], greeting?: string, closing?: string, actionButton?: { text: string; url: string }): string {
  const formattedContent = contentLines.map(line => `<p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">${line}</p>`).join('');
  const actionButtonHtml = actionButton
    ? `<a href="${actionButton.url}" target="_blank" style="background-color: #10B981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block; margin-top: 20px;">${actionButton.text}</a>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <header style="background-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">The Wellness Tree</h1>
      </header>
      <main style="padding: 25px;">
        ${greeting ? `<p style="font-size: 18px; font-weight: bold; margin-bottom: 20px;">${greeting}</p>` : ''}
        ${formattedContent}
        ${actionButtonHtml}
        ${closing ? `<p style="font-size: 16px; margin-top: 30px;">${closing}</p>` : ''}
        <p style="font-size: 16px; margin-top: 15px;">Sincerely,<br>The Dispensary Tree Team</p>
      </main>
      <footer style="background-color: #f7f7f7; color: #777; padding: 15px; text-align: center; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} The Wellness Tree. All rights reserved.</p>
        <p>This is an automated message. Please do not reply directly to this email.</p>
      </footer>
    </div>
  `;
}


// ============== FIRESTORE TRIGGERS ==============

export const onUserCreated = onDocumentCreated("users/{userId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.error("No data associated with the user creation event.");
        return;
    }
    const userData = snapshot.data() as UserDocData;
    const userId = event.params.userId;
    
    await setClaimsFromDoc(userId, userData);

    // This handles both public signups and users added by a dispensary owner
    if (userData.role === 'LeafUser' && userData.email) {
        if(userData.signupSource === 'public') {
            logger.log(`New public Leaf User signed up (ID: ${userId}). Sending welcome email.`);
            const userDisplayName = userData.displayName || userData.email.split('@')[0];
            const subject = "Welcome to The Wellness Tree!";
            const content = [
                `Thank you for joining The Wellness Tree! We're excited to have you.`,
                `You can now explore dispensaries, get AI-powered advice, and manage your wellness journey.`,
                `As a welcome gift, you've received 10 free credits to get started with our AI advisors.`,
            ];
            const actionButton = { text: "Go to Your Dashboard", url: `${BASE_URL}/dashboard/leaf` };
            const htmlBody = generateHtmlEmail("Welcome!", content, `Welcome, ${userDisplayName}!`, undefined, actionButton);
            await sendDispensaryNotificationEmail(userData.email, subject, htmlBody, "The Wellness Tree Platform");
        } else if (userData.signupSource === 'dispensary_panel') {
            logger.log(`New Leaf User created via dispensary panel (ID: ${userId}). Sending welcome email.`);
            const userDisplayName = userData.displayName || userData.email.split('@')[0];
            const subject = "Welcome to The Wellness Tree!";
            const content = [
                `An account has been created for you on The Wellness Tree platform!`,
                `You can now explore dispensaries, get AI-powered advice, and manage your wellness journey with us.`,
            ];
            const actionButton = { text: "Go to Your Dashboard", url: `${BASE_URL}/dashboard/leaf` };
            const htmlBody = generateHtmlEmail("Welcome!", content, `Hi ${userDisplayName},`, undefined, actionButton);
            await sendDispensaryNotificationEmail(userData.email, subject, htmlBody, "The Wellness Tree Platform");
        }
    }
});


export const onDispensaryCreated = onDocumentCreated("dispensaries/{dispensaryId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.error("No data for onDispensaryCreated event.");
        return;
    }
    const dispensary = snapshot.data() as DispensaryDocData;
    const dispensaryId = event.params.dispensaryId;
    logger.log(`New dispensary application: ${dispensaryId} - ${dispensary?.dispensaryName}`);

    if (!dispensary?.ownerEmail) {
        logger.error(`Dispensary ${dispensaryId} missing ownerEmail.`);
        return;
    }

    const ownerDisplayName = dispensary.fullName || dispensary.ownerEmail.split('@')[0];
    const subject = "Your Application to The Wellness Tree is Received!";
    const content = [
      `Thank you for applying to join with your dispensary: "<strong>${dispensary.dispensaryName || 'Your Dispensary'}</strong>".`,
      `We have received your application and our team will review it shortly.`,
    ];
    const htmlBody = generateHtmlEmail("Application Received", content, `Dear ${ownerDisplayName},`);
    await sendDispensaryNotificationEmail(dispensary.ownerEmail, subject, htmlBody, dispensary.dispensaryName || undefined);
});


export const onDispensaryUpdate = onDocumentUpdated("dispensaries/{dispensaryId}", async (event) => {
    const change = event.data;
    if (!change || !change.after.exists) {
        logger.error("No data for onDispensaryUpdate event.");
        return;
    }
    const newValue = change.after.data() as DispensaryDocData;
    const previousValue = change.before.data() as DispensaryDocData;
    const dispensaryId = event.params.dispensaryId;

    if (newValue.status === "Approved" && previousValue?.status !== "Approved") {
        logger.log(`Dispensary ${dispensaryId} approved. Setting up owner...`);
        let userRecord: admin.auth.UserRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(newValue.ownerEmail);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                logger.log(`Creating new auth user for ${newValue.ownerEmail}.`);
                userRecord = await admin.auth().createUser({
                    email: newValue.ownerEmail,
                    displayName: newValue.fullName,
                    disabled: false
                });
            } else {
                logger.error("Error fetching owner user:", error);
                return;
            }
        }
        
        const userDocRef = db.collection("users").doc(userRecord.uid);
        const ownerUpdateData: Partial<UserDocData> = {
            role: "DispensaryOwner",
            status: "Active",
            dispensaryId: dispensaryId,
        };
        await userDocRef.set(ownerUpdateData, { merge: true });
        logger.info(`Owner role and dispensary ID set for user ${userRecord.uid}.`);
    }
});


// ============== CALLABLE FUNCTIONS ==============

export const getUserProfile = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to get your profile.');
    }
    const uid = request.auth.uid;
    try {
        const userDocRef = db.collection('users').doc(uid);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists) {
            logger.error(`User document not found for authenticated user: ${uid}`);
            throw new HttpsError('not-found', 'Your user profile could not be found in the database.');
        }
        
        const userData = userDocSnap.data() as UserDocData;
        
        let dispensaryData: Dispensary | null = null;
        if (userData.role === 'DispensaryOwner' && userData.dispensaryId) {
            try {
                const dispensaryDocRef = db.collection('dispensaries').doc(userData.dispensaryId);
                const dispensaryDocSnap = await dispensaryDocRef.get();
                if (dispensaryDocSnap.exists()) {
                    dispensaryData = { id: dispensaryDocSnap.id, ...dispensaryDocSnap.data() } as Dispensary;
                } else {
                    logger.warn(`User ${uid} is linked to a non-existent dispensary document: ${userData.dispensaryId}`);
                }
            } catch (dispensaryError) {
                logger.error(`Error fetching dispensary doc for user ${uid}.`, dispensaryError);
            }
        }
        
        const toISODateString = (date: any): string | null => {
            if (!date) return null;
            if (date instanceof admin.firestore.Timestamp) return date.toDate().toISOString();
            if (date instanceof Date) return date.toISOString();
            if (typeof date === 'string') {
                 try {
                     const parsedDate = new Date(date);
                     if (!isNaN(parsedDate.getTime())) return parsedDate.toISOString();
                 } catch (e) { /* Ignore */ }
            }
            return null;
        };
        
        const dispensaryWithSerializableDates: Dispensary | null = dispensaryData ? {
            ...dispensaryData,
            applicationDate: toISODateString(dispensaryData.applicationDate)!, 
            approvedDate: toISODateString(dispensaryData.approvedDate),
            lastActivityDate: toISODateString(dispensaryData.lastActivityDate),
        } : null;

        return {
            uid: uid,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            role: userData.role,
            dispensaryId: userData.dispensaryId,
            credits: userData.credits,
            status: userData.status,
            createdAt: toISODateString(userData.createdAt),
            lastLoginAt: toISODateString(userData.lastLoginAt),
            dispensaryStatus: dispensaryData?.status || null,
            dispensary: dispensaryWithSerializableDates,
            preferredDispensaryTypes: userData.preferredDispensaryTypes || [],
            welcomeCreditsAwarded: userData.welcomeCreditsAwarded || false,
            signupSource: userData.signupSource || 'public',
        };

    } catch (error) {
        logger.error(`Error fetching user profile for ${uid}:`, error);
        throw new HttpsError('internal', 'An error occurred while fetching your profile.');
    }
});


export const deductCreditsAndLogInteraction = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction } = request.data as { userId: string, advisorSlug: string, creditsToDeduct: number, wasFreeInteraction: boolean };

    if (!userId || !advisorSlug || creditsToDeduct === undefined || wasFreeInteraction === undefined || userId !== request.auth.uid) {
        throw new HttpsError('invalid-argument', 'Missing or invalid arguments provided.');
    }

    const userRef = db.collection("users").doc(userId);
    let newCreditBalance = 0;

    try {
        if (!wasFreeInteraction) {
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) throw new HttpsError("not-found", "User not found.");
                
                const currentCredits = (userDoc.data() as UserDocData)?.credits || 0;
                if (currentCredits < creditsToDeduct) throw new HttpsError("failed-precondition", "Insufficient credits.");
                
                newCreditBalance = currentCredits - creditsToDeduct;
                transaction.update(userRef, { credits: newCreditBalance });
            });
        } else {
            const userDoc = await userRef.get();
            if (!userDoc.exists) throw new HttpsError("not-found", "User not found for free interaction logging.");
            newCreditBalance = (userDoc.data() as UserDocData)?.credits || 0;
        }

        const userDoc = await userRef.get();
        const userData = userDoc.data() as UserDocData;

        const logEntry = {
            userId,
            dispensaryId: userData.dispensaryId || null,
            advisorSlug,
            creditsUsed: wasFreeInteraction ? 0 : creditsToDeduct,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            wasFreeInteraction,
        };
        await db.collection("aiInteractionsLog").add(logEntry);

        return {
            success: true,
            message: "Credits updated and interaction logged successfully.",
            newCredits: newCreditBalance,
        };
    } catch (error: any) {
        logger.error("Error in deductCreditsAndLogInteraction:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "An internal error occurred.");
    }
});


export const scrapeJustBrandCatalog = onCall({ memory: '1GiB', timeoutSeconds: 540, cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const uid = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'Super Admin') {
        throw new HttpsError('permission-denied', 'Permission denied. You must be an admin to run this operation.');
    }
    
    const runId = new Date().toISOString().replace(/[:.]/g, '-');
    const logRef = db.collection('scrapeLogs').doc(runId);
    const historyRef = db.collection('importsHistory').doc(runId);
    
    const logMessages: string[] = [];
    const log = (message: string) => {
        logger.info(`[${runId}] ${message}`);
        logMessages.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    };

    try {
        log('ScrapeJustBrandCatalog function triggered by admin.');
        await logRef.set({
            status: 'started',
            startTime: admin.firestore.FieldValue.serverTimestamp(),
            messages: logMessages, itemCount: 0, successCount: 0, failCount: 0,
        });

        const catalog = await runScraper(log);
        
        let totalProducts = 0;
        const batchSize = 499;
        let batch = db.batch();
        let operationCount = 0;

        for (const category of catalog) {
            totalProducts += category.products.length;
            const categoryRef = db.collection('justbrand_catalog').doc(category.slug);
            const { products, ...categoryData } = category;
            
            batch.set(categoryRef, { ...categoryData, productCount: products.length, lastUpdated: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            operationCount++;

            if (operationCount >= batchSize) {
                await batch.commit(); batch = db.batch(); operationCount = 0;
            }

            for (const product of products) {
                if (product.handle) {
                    const productRef = categoryRef.collection('products').doc(product.handle);
                    batch.set(productRef, product);
                    operationCount++;

                    if (operationCount >= batchSize) {
                        await batch.commit(); batch = db.batch(); operationCount = 0;
                    }
                }
            }
        }
        
        if (operationCount > 0) await batch.commit();

        log(`Successfully wrote ${catalog.length} categories and ${totalProducts} products.`);
        const finalLog: ScrapeLog = {
            status: 'completed', startTime: admin.firestore.FieldValue.serverTimestamp(),
            endTime: admin.firestore.FieldValue.serverTimestamp(), itemCount: totalProducts,
            successCount: totalProducts, failCount: 0, messages: logMessages,
        };
        await logRef.update(finalLog);
        await historyRef.set(finalLog);

        return { success: true, message: `Scraping complete. ${totalProducts} products saved.` };

    } catch (error: any) {
        logger.error(`[${runId}] Scraping failed:`, error);
        log(`FATAL ERROR: ${error.message}`);
        const finalLog: Partial<ScrapeLog> = {
            status: 'failed',
            endTime: admin.firestore.FieldValue.serverTimestamp(),
            error: error.message,
            messages: logMessages,
        };
        await logRef.update(finalLog);
        await historyRef.set(finalLog);
        throw new HttpsError('internal', 'An error occurred during the scraping process. Check logs.', { runId });
    }
});


export const updateStrainImageUrl = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { strainId, imageUrl } = request.data;
    if (!strainId || !imageUrl) {
        throw new HttpsError('invalid-argument', 'Missing "strainId" or "imageUrl".');
    }
    try {
        const strainRef = db.collection('my-seeded-collection').doc(strainId);
        await strainRef.update({ img_url: imageUrl });
        return { success: true };
    } catch (error: any) {
        logger.error(`Error updating strain image URL for ${strainId}:`, error);
        throw new HttpsError('internal', 'Error updating strain image.');
    }
});
