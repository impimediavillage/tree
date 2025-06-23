"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedLargeCollection = exports.copyHomeopathicDispensaryCategoriesData = exports.copyMushroomDispensaryCategoriesData = exports.copyDispensaryTypeCategoriesData = exports.seedSampleUsers = exports.seedSampleDispensary = exports.deductCreditsAndLogInteraction = exports.onPoolIssueCreated = exports.onProductRequestUpdated = exports.onProductRequestCreated = exports.onDispensaryUpdate = exports.onDispensaryCreated = exports.onLeafUserCreated = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Custom error class for HTTP functions to propagate status codes.
 */
class HttpError extends Error {
    constructor(httpStatus, message, code) {
        super(message);
        this.httpStatus = httpStatus;
        this.message = message;
        this.code = code;
        this.name = 'HttpError';
    }
}
// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
// Configure SendGrid - IMPORTANT: Set these environment variables in your Firebase Functions config
mail_1.default.setApiKey(process.env.SENDGRID_API_KEY || "YOUR_SENDGRID_API_KEY_PLACEHOLDER");
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@example.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:9002"; // For generating public URLs
/**
 * Sends a notification email using SendGrid.
 */
async function sendDispensaryNotificationEmail(toEmail, subject, htmlBody, dispensaryName // This can be undefined
) {
    if (!process.env.SENDGRID_API_KEY ||
        process.env.SENDGRID_API_KEY === "YOUR_SENDGRID_API_KEY_PLACEHOLDER" ||
        !SENDGRID_FROM_EMAIL ||
        SENDGRID_FROM_EMAIL === "noreply@example.com" ||
        SENDGRID_FROM_EMAIL.trim() === "") {
        logger.warn("SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not fully configured. Email simulation will occur via logs only.");
        logger.info(`Simulating Sending Email (HTML) to: ${toEmail}`);
        logger.info(`Subject: ${subject}`);
        logger.info(`HTML Body:\n${htmlBody}`);
        logger.info(`(Related Entity: ${dispensaryName || 'The Dispensary Tree Platform'})`); // Generic log message
        return;
    }
    const msg = {
        to: toEmail,
        from: {
            email: SENDGRID_FROM_EMAIL,
            name: "The Dispensary Tree" // Sender name
        },
        subject: subject,
        html: htmlBody,
    };
    try {
        await mail_1.default.send(msg);
        logger.info(`Email successfully sent to ${toEmail} (Subject: ${subject}) via SendGrid.`);
    }
    catch (error) {
        logger.error(`Error sending email to ${toEmail} (Subject: ${subject}) via SendGrid:`, error);
        if (error.response) {
            logger.error("SendGrid Response Error Body:", error.response.body);
        }
    }
}
/**
 * Generates a basic HTML email template.
 */
function generateHtmlEmail(title, contentLines, greeting, closing, actionButton) {
    const formattedContent = contentLines.map(line => `<p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">${line}</p>`).join('');
    const actionButtonHtml = actionButton
        ? `<a href="${actionButton.url}" target="_blank" style="background-color: #10B981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block; margin-top: 20px;">${actionButton.text}</a>`
        : '';
    return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <header style="background-color: hsl(var(--primary)); /* Tailwind primary green */ color: hsl(var(--primary-foreground)); padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">The Dispensary Tree</h1>
      </header>
      <main style="padding: 25px;">
        ${greeting ? `<p style="font-size: 18px; font-weight: bold; margin-bottom: 20px;">${greeting}</p>` : ''}
        ${formattedContent}
        ${actionButtonHtml}
        ${closing ? `<p style="font-size: 16px; margin-top: 30px;">${closing}</p>` : ''}
        <p style="font-size: 16px; margin-top: 15px;">Sincerely,<br>The Dispensary Tree Team</p>
      </main>
      <footer style="background-color: #f7f7f7; color: #777; padding: 15px; text-align: center; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} The Dispensary Tree. All rights reserved.</p>
        <p>This is an automated message. Please do not reply directly to this email.</p>
      </footer>
    </div>
  `;
}
/**
 * Cloud Function triggered when a new Leaf User document is created.
 * Sends a "Welcome" email to the new Leaf User, unless they signed up publicly.
 */
exports.onLeafUserCreated = (0, firestore_1.onDocumentCreated)("users/{userId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.error("No data associated with the user creation event.");
        return null;
    }
    const userData = snapshot.data();
    const userId = event.params.userId;
    // Only send email if role is LeafUser AND signupSource is NOT 'public' (or signupSource is undefined)
    if (userData.role === 'LeafUser' && userData.email && userData.signupSource !== 'public') {
        logger.log(`New Leaf User created (ID: ${userId}, Email: ${userData.email}, Source: ${userData.signupSource || 'N/A'}). Sending welcome email.`);
        const userDisplayName = userData.displayName || userData.email.split('@')[0];
        const subject = "Welcome to The Dispensary Tree!";
        const greeting = `Dear ${userDisplayName},`;
        const content = [
            `Thank you for joining The Dispensary Tree! We're excited to have you as part of our community.`,
            `You can now explore dispensaries, get AI-powered advice, and manage your wellness journey with us.`,
            `You've received 10 free credits to get started with our AI advisors.`,
            `If you have any questions, feel free to explore our platform or reach out to our support team (if available).`,
        ];
        const actionButton = { text: "Go to Your Dashboard", url: `${BASE_URL}/dashboard/leaf` };
        const htmlBody = generateHtmlEmail("Welcome to The Dispensary Tree!", content, greeting, undefined, actionButton);
        await sendDispensaryNotificationEmail(userData.email, subject, htmlBody, "The Dispensary Tree Platform");
    }
    else if (userData.role === 'LeafUser' && userData.signupSource === 'public') {
        logger.log(`New Leaf User created via public signup (ID: ${userId}). Welcome email skipped.`);
    }
    else {
        logger.log(`New user created (ID: ${userId}), but not a LeafUser eligible for this welcome email. Role: ${userData.role || 'N/A'}, Source: ${userData.signupSource || 'N/A'}`);
    }
    return null;
});
/**
 * Cloud Function triggered when a new dispensary document is created.
 * Sends an "Application Received" email to the owner.
 */
exports.onDispensaryCreated = (0, firestore_1.onDocumentCreated)("dispensaries/{dispensaryId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.error("No data associated with the document creation event.");
        return null;
    }
    const dispensary = snapshot.data();
    const dispensaryId = event.params.dispensaryId;
    logger.log(`New dispensary application received: ${dispensaryId} - ${dispensary?.dispensaryName || 'Unnamed Dispensary'}`);
    if (!dispensary?.ownerEmail) {
        logger.error(`Dispensary ${dispensaryId} created without an ownerEmail. Cannot send notification.`);
        return null;
    }
    const ownerDisplayName = dispensary.fullName || dispensary.ownerEmail.split('@')[0];
    const dispensaryNameForEmailContent = dispensary.dispensaryName || 'Your Dispensary';
    const subject = "Your Dispensary Application to The Dispensary Tree is Received!";
    const greeting = `Dear ${ownerDisplayName},`;
    const content = [
        `Thank you for applying to join The Dispensary Tree with your dispensary: "<strong>${dispensaryNameForEmailContent}</strong>".`,
        `We have received your application and our team will review it shortly. You will be notified of any status updates.`,
        `We are excited about the possibility of partnering with you to bring quality organic, authentic, original wellness products to customers.`,
    ];
    const htmlBody = generateHtmlEmail("Application Received", content, greeting);
    await sendDispensaryNotificationEmail(dispensary.ownerEmail, subject, htmlBody, dispensary.dispensaryName || undefined);
    return null;
});
/**
 * Cloud Function triggered when a dispensary document is updated.
 * Handles setting custom claims for approved owners, and sending various notification emails.
 */
exports.onDispensaryUpdate = (0, firestore_1.onDocumentUpdated)("dispensaries/{dispensaryId}", async (event) => {
    const change = event.data;
    if (!change || !change.after) {
        logger.error("No change or after data associated with the document update event.");
        return null;
    }
    const newValue = change.after.data();
    const previousValue = change.before?.data();
    const dispensaryId = event.params.dispensaryId;
    if (!newValue) {
        logger.log(`Dispensary ${dispensaryId} was deleted or no data in 'after'. Exiting update trigger.`);
        return null;
    }
    const ownerEmail = newValue.ownerEmail;
    const ownerDisplayName = newValue.fullName || (ownerEmail ? ownerEmail.split('@')[0] : 'Dispensary Owner');
    const dispensaryName = newValue.dispensaryName || 'Unnamed Dispensary';
    if (!ownerEmail) {
        logger.error(`Dispensary ${dispensaryId} (update) is missing ownerEmail. Cannot proceed with notifications or user setup.`);
        return null;
    }
    let subject = "";
    let contentLines = [];
    let greeting = `Dear ${ownerDisplayName},`;
    let sendEmail = false;
    let actionButton;
    if (newValue.status === "Approved" && previousValue?.status !== "Approved") {
        sendEmail = true;
        logger.log(`Dispensary ${dispensaryId} was approved.`);
        let defaultPasswordUsed = undefined;
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(ownerEmail);
            logger.log(`Found existing auth user ${userRecord.uid} for email ${ownerEmail}.`);
        }
        catch (error) {
            if (error.code === 'auth/user-not-found') {
                logger.log(`Auth user not found for email ${ownerEmail}. Attempting to create new auth user.`);
                try {
                    defaultPasswordUsed = 'Wonder1234'; // Default password
                    userRecord = await admin.auth().createUser({
                        email: ownerEmail,
                        emailVerified: false,
                        password: defaultPasswordUsed,
                        displayName: ownerDisplayName,
                        disabled: false,
                    });
                    logger.info(`Successfully created new auth user ${userRecord.uid} for email ${ownerEmail}.`);
                }
                catch (createUserError) {
                    logger.error(`Error creating new auth user for ${ownerEmail} (Dispensary ${dispensaryId}):`, createUserError);
                    return null;
                }
            }
            else {
                logger.error(`Error fetching user by email ${ownerEmail} (Dispensary ${dispensaryId}):`, error);
                return null;
            }
        }
        const userId = userRecord.uid;
        try {
            await admin.auth().setCustomUserClaims(userId, {
                role: "DispensaryOwner",
                dispensaryId: dispensaryId,
            });
            logger.info(`Custom claims set for user ${userId}: role=DispensaryOwner, dispensaryId=${dispensaryId}`);
            const userDocRef = db.collection("users").doc(userId);
            const firestoreUserDataUpdate = {
                uid: userId, email: ownerEmail, displayName: ownerDisplayName,
                role: "DispensaryOwner", dispensaryId: dispensaryId, status: "Active",
                photoURL: userRecord.photoURL || null,
                lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            const userDocSnap = await userDocRef.get();
            if (!userDocSnap.exists) {
                firestoreUserDataUpdate.createdAt = admin.firestore.FieldValue.serverTimestamp();
                firestoreUserDataUpdate.credits = 100; // Default credits for new owner
            }
            await userDocRef.set(firestoreUserDataUpdate, { merge: true });
            logger.info(`User document ${userId} in Firestore updated/created for dispensary owner.`);
            const publicStoreUrl = `${BASE_URL}/store/${dispensaryId}`;
            await change.after.ref.update({ publicStoreUrl: publicStoreUrl, approvedDate: admin.firestore.FieldValue.serverTimestamp() });
            logger.info(`Public store URL ${publicStoreUrl} set for dispensary ${dispensaryId}.`);
            subject = `Congratulations! Your Dispensary "${dispensaryName}" is Approved!`;
            contentLines = [
                `Great news! Your dispensary, "<strong>${dispensaryName}</strong>", has been approved and is now live on The Dispensary Tree.`,
                `We are thrilled to have you join our community. You are now part of a platform dedicated to quality organic, authentic, original wellness products.`,
                `Your public e-store is now available at: <a href="${publicStoreUrl}" target="_blank">${publicStoreUrl}</a>`,
            ];
            if (defaultPasswordUsed) {
                contentLines.push(`You can log in to your Dispensary Admin Dashboard using your email (${ownerEmail}) and the default password: <strong>${defaultPasswordUsed}</strong>`);
                contentLines.push(`Please change your password immediately upon your first login for security.`);
            }
            else {
                contentLines.push(`You can log in to your Dispensary Admin Dashboard using your email (${ownerEmail}) and your existing password.`);
            }
            contentLines.push(`If you have any questions, please don't hesitate to contact our support team.`);
            actionButton = { text: "Go to Your Dashboard", url: `${BASE_URL}/dispensary-admin/dashboard` };
        }
        catch (claimOrFirestoreError) {
            logger.error(`Error setting claims, updating Firestore user doc, or preparing email for ${userId} (Dispensary ${dispensaryId}):`, claimOrFirestoreError);
            return null;
        }
    }
    else if (newValue.status !== previousValue?.status) {
        sendEmail = true;
        subject = `Update on Your Dispensary: ${dispensaryName}`;
        contentLines = [
            `There has been an update regarding your dispensary, "<strong>${dispensaryName}</strong>", on The Dispensary Tree.`,
            `New Status: <strong>${newValue.status}</strong>`,
        ];
        let userStatusToSet = 'PendingApproval';
        if (newValue.status === 'Approved')
            userStatusToSet = 'Active';
        else if (newValue.status === 'Suspended')
            userStatusToSet = 'Suspended';
        else if (newValue.status === 'Rejected')
            userStatusToSet = 'Rejected';
        if (newValue.status === "Rejected") {
            subject = `Update on Your Dispensary Application: ${dispensaryName}`;
            contentLines.push(`We regret to inform you that after careful review, your application for "<strong>${dispensaryName}</strong>" has been rejected at this time. `);
            contentLines.push(`If you have questions or would like to discuss this further, please contact our support team.`);
        }
        else if (newValue.status === "Suspended") {
            subject = `Action Required: Your Dispensary Account "${dispensaryName}" Has Been Suspended`;
            contentLines.push(`Your dispensary account has been temporarily suspended. This may be due to a violation of our terms of service or other pending issues. `);
            contentLines.push(`Please contact our support team as soon as possible to address this matter.`);
        }
        else if (newValue.status === "Pending Approval" && previousValue?.status === "Suspended") {
            subject = `Your Dispensary Account "${dispensaryName}" is Pending Re-Approval`;
            contentLines.push(`Your dispensary account status has been changed from Suspended to Pending Approval. Our team will review it shortly.`);
        }
        const usersToUpdateQuery = db.collection("users").where("dispensaryId", "==", dispensaryId).where("role", "!=", "SuperAdmin");
        try {
            const usersSnapshot = await usersToUpdateQuery.get();
            if (!usersSnapshot.empty) {
                const batch = db.batch();
                usersSnapshot.forEach(doc => {
                    batch.update(doc.ref, { status: userStatusToSet });
                });
                await batch.commit();
                logger.info(`Updated status to '${userStatusToSet}' for users associated with dispensary ${dispensaryId}.`);
            }
        }
        catch (error) {
            logger.error(`Error updating status for users associated with dispensary ${dispensaryId}:`, error);
        }
    }
    else if (previousValue && newValue.status === previousValue.status) {
        const beforeDataForCompare = { ...previousValue };
        const afterDataForCompare = { ...newValue };
        const fieldsToIgnore = ['lastActivityDate', 'approvedDate', 'publicStoreUrl', 'productCount', 'incomingRequestCount', 'outgoingRequestCount', 'averageRating', 'reviewCount'];
        fieldsToIgnore.forEach(field => {
            delete beforeDataForCompare[field];
            delete afterDataForCompare[field];
        });
        if (JSON.stringify(beforeDataForCompare) !== JSON.stringify(afterDataForCompare)) {
            sendEmail = true;
            logger.log(`Dispensary ${dispensaryId} details were updated without status change.`);
            subject = `Your Dispensary Details for "${dispensaryName}" Have Been Updated`;
            contentLines = [
                `The details for your dispensary, "<strong>${dispensaryName}</strong>", have been updated on The Dispensary Tree.`,
                `If you did not make these changes or have any concerns, please contact our support team immediately.`,
                `You can review your current dispensary profile in your admin dashboard.`,
            ];
        }
        else {
            logger.log(`Dispensary ${dispensaryId} was updated, but no significant data change detected for notification (excluding timestamps and counters).`);
        }
    }
    if (sendEmail && ownerEmail && contentLines.length > 0) {
        const htmlBody = generateHtmlEmail(subject, contentLines, greeting, undefined, actionButton);
        await sendDispensaryNotificationEmail(ownerEmail, subject, htmlBody, dispensaryName);
    }
    return null;
});
/**
 * Cloud Function to create a notification when a new product request is made.
 */
exports.onProductRequestCreated = (0, firestore_1.onDocumentCreated)("productRequests/{requestId}", async (event) => {
    const snapshot = event.data;
    const requestId = event.params.requestId;
    if (!snapshot) {
        logger.error(`No data associated with the product request creation event for ${requestId}.`);
        return null;
    }
    const request = snapshot.data();
    logger.log(`New product request ${requestId} created by ${request?.requesterDispensaryName || 'Unknown Requester'} for product ${request?.productName || 'Unknown Product'}`);
    if (!request.productOwnerEmail) {
        logger.error(`Product request ${requestId} is missing productOwnerEmail. Cannot send notification.`);
        return null;
    }
    try {
        const productOwnerUser = await admin
            .auth()
            .getUserByEmail(request.productOwnerEmail);
        if (productOwnerUser) {
            const notification = {
                recipientUid: productOwnerUser.uid,
                message: `You have a new product request for "${request.productName || 'a product'}" from ${request.requesterDispensaryName || 'a dispensary'}.`,
                link: `/dispensary-admin/pool?tab=incoming-requests&requestId=${requestId}`,
                read: false,
                createdAt: admin.firestore.Timestamp.now(),
            };
            await db.collection("notifications").add(notification);
            logger.info(`Notification created for product owner ${productOwnerUser.uid} regarding request ${requestId}`);
        }
        else {
            logger.warn(`Could not find user for product owner email: ${request.productOwnerEmail} for request ${requestId}`);
        }
    }
    catch (error) {
        if (error.code === "auth/user-not-found") {
            logger.error(`User not found for productOwnerEmail: ${request.productOwnerEmail} in request ${requestId}.`);
        }
        else {
            logger.error(`Error creating notification for new product request ${requestId}:`, error);
        }
    }
    return null;
});
/**
 * Cloud Function to create a notification when a product request status is updated or a new note is added.
 */
exports.onProductRequestUpdated = (0, firestore_1.onDocumentUpdated)("productRequests/{requestId}", async (event) => {
    const change = event.data;
    const requestId = event.params.requestId;
    if (!change || !change.after) {
        logger.error(`No change or after data associated with the product request update event for ${requestId}.`);
        return null;
    }
    const before = change.before?.data();
    const after = change.after.data();
    let notificationRecipientEmail = null;
    let notificationMessage = null;
    let notificationLink = `/dispensary-admin/pool?requestId=${requestId}`;
    if (before?.requestStatus !== after?.requestStatus) {
        logger.log(`Product request ${requestId} status changed from ${before?.requestStatus || 'N/A'} to ${after?.requestStatus || 'N/A'}`);
        notificationMessage = `Your request for "${after?.productName || 'a product'}" has been updated to: ${after?.requestStatus
            ?.replace(/_/g, " ")
            .toUpperCase()}.`;
        notificationRecipientEmail = after?.requesterEmail || null;
        notificationLink = `/dispensary-admin/pool?tab=outgoing-requests&requestId=${requestId}`;
        if (after?.requestStatus === "fulfilled_by_sender" && after?.requesterEmail) {
            notificationRecipientEmail = after.requesterEmail;
            notificationMessage = `${after?.productOwnerEmail?.split("@")[0] || 'The product owner'} has marked your requested product "${after?.productName || 'a product'}" as sent/fulfilled.`;
        }
        else if (after?.requestStatus === "received_by_requester" && after?.productOwnerEmail) {
            notificationRecipientEmail = after.productOwnerEmail;
            notificationMessage = `${after?.requesterDispensaryName || 'A requester'} has confirmed receipt of "${after?.productName || 'a product'}".`;
            notificationLink = `/dispensary-admin/pool?tab=incoming-requests&requestId=${requestId}`;
        }
        else if ((after?.requestStatus === "accepted" ||
            after?.requestStatus === "rejected" ||
            after?.requestStatus === "cancelled") && after?.requesterEmail) {
            notificationRecipientEmail = after.requesterEmail;
            notificationMessage = `Your request for "${after?.productName || 'a product'}" has been ${after?.requestStatus.replace(/_/g, " ")}.`;
        }
    }
    const beforeNotesCount = before?.notes?.length || 0;
    const afterNotesCount = after?.notes?.length || 0;
    if (afterNotesCount > beforeNotesCount && after?.notes && after.notes.length > 0) {
        const newNote = after.notes[afterNotesCount - 1];
        logger.log(`New note added to product request ${requestId} by ${newNote.byName} (Role: ${newNote.senderRole})`);
        if (newNote.senderRole === "requester" && after?.productOwnerEmail) {
            notificationRecipientEmail = after.productOwnerEmail;
            notificationMessage = `${newNote.byName} added a note to the request for "${after?.productName}".`;
            notificationLink = `/dispensary-admin/pool?tab=incoming-requests&requestId=${requestId}`;
        }
        else if (newNote.senderRole === "owner" && after?.requesterEmail) {
            notificationRecipientEmail = after.requesterEmail;
            notificationMessage = `${newNote.byName} added a note to your request for "${after?.productName}".`;
            notificationLink = `/dispensary-admin/pool?tab=outgoing-requests&requestId=${requestId}`;
        }
    }
    if (!notificationRecipientEmail || !notificationMessage) {
        logger.log(`Product request ${requestId} updated, but no specific condition for notification met or recipient/message is null.`);
        return null;
    }
    if (typeof notificationRecipientEmail !== "string" || !notificationRecipientEmail.trim()) {
        logger.error(`Invalid or missing notificationRecipientEmail for request ${requestId}. Cannot send notification. Email was: "${notificationRecipientEmail}"`);
        return null;
    }
    try {
        const recipientUser = await admin
            .auth()
            .getUserByEmail(notificationRecipientEmail);
        if (recipientUser) {
            const notification = {
                recipientUid: recipientUser.uid,
                message: notificationMessage,
                link: notificationLink,
                read: false,
                createdAt: admin.firestore.Timestamp.now(),
            };
            await db.collection("notifications").add(notification);
            logger.info(`Notification created for ${recipientUser.uid} for request ${requestId} update.`);
        }
        else {
            logger.warn(`Could not find user for email: ${notificationRecipientEmail} during request ${requestId} update.`);
        }
    }
    catch (error) {
        if (error.code === "auth/user-not-found") {
            logger.error(`User not found for notificationRecipientEmail: ${notificationRecipientEmail} in request ${requestId} update.`);
        }
        else {
            logger.error(`Error creating notification for product request ${requestId} update:`, error);
        }
    }
    return null;
});
/**
 * Cloud Function to create a notification for Super Admin when a new PoolIssue is created.
 */
exports.onPoolIssueCreated = (0, firestore_1.onDocumentCreated)("poolIssues/{issueId}", async (event) => {
    const snapshot = event.data;
    const issueId = event.params.issueId;
    if (!snapshot) {
        logger.error(`No data associated with the pool issue creation event for ${issueId}.`);
        return null;
    }
    const issue = snapshot.data();
    logger.log(`New pool issue ${issueId} reported by ${issue?.reporterDispensaryName || 'Unknown Reporter'} against ${issue?.reportedDispensaryName || 'Unknown Reported Party'}.`);
    const superAdminEmail = "impimediavillage@gmail.com";
    if (!superAdminEmail) {
        logger.error("Super Admin email is not configured. Cannot send notification for pool issue.");
        return null;
    }
    try {
        const superAdminUser = await admin.auth().getUserByEmail(superAdminEmail);
        if (superAdminUser) {
            const notification = {
                recipientUid: superAdminUser.uid,
                message: `New pool issue reported by ${issue?.reporterDispensaryName || 'a dispensary'} for product "${issue?.productName || 'a product'}".`,
                link: `/admin/dashboard/pool-issues?issueId=${issueId}`,
                read: false,
                createdAt: admin.firestore.Timestamp.now(),
            };
            await db.collection("notifications").add(notification);
            logger.info(`Notification created for Super Admin ${superAdminUser.uid} regarding pool issue ${issueId}`);
        }
        else {
            logger.warn(`Could not find Super Admin user for email: ${superAdminEmail}`);
        }
    }
    catch (error) {
        if (error.code === "auth/user-not-found") {
            logger.error(`Super Admin user with email ${superAdminEmail} not found. Cannot send notification for pool issue ${issueId}.`);
        }
        else {
            logger.error(`Error creating Super Admin notification for new pool issue ${issueId}:`, error);
        }
    }
    return null;
});
/**
 * HTTP-callable function to deduct credits and log AI interaction.
 */
exports.deductCreditsAndLogInteraction = (0, https_1.onRequest)({ cors: true }, // Gen 2 CORS configuration
async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send({ error: "Method Not Allowed" });
        return;
    }
    const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction, } = req.body;
    if (!userId ||
        !advisorSlug ||
        creditsToDeduct === undefined ||
        wasFreeInteraction === undefined) {
        res.status(400).send({
            error: "Missing required fields: userId, advisorSlug, creditsToDeduct, wasFreeInteraction",
        });
        return;
    }
    const userRef = db.collection("users").doc(userId);
    try {
        let newCreditBalance = 0;
        if (!wasFreeInteraction) {
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) {
                    throw new HttpError(404, "User not found.", "not-found");
                }
                const currentCredits = userDoc.data()?.credits || 0;
                if (currentCredits < creditsToDeduct) {
                    throw new HttpError(400, "Insufficient credits.", "failed-precondition");
                }
                newCreditBalance = currentCredits - creditsToDeduct;
                transaction.update(userRef, { credits: newCreditBalance });
            });
            logger.info(`Successfully deducted ${creditsToDeduct} credits for user ${userId}. New balance: ${newCreditBalance}`);
        }
        else {
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                throw new HttpError(404, "User not found for free interaction logging.", "not-found");
            }
            newCreditBalance = userDoc.data()?.credits || 0;
            logger.info(`Logging free interaction for user ${userId}. Current balance: ${newCreditBalance}`);
        }
        const logEntry = {
            userId,
            advisorSlug,
            creditsUsed: wasFreeInteraction ? 0 : creditsToDeduct,
            timestamp: admin.firestore.Timestamp.now(),
            wasFreeInteraction,
        };
        await db.collection("aiInteractionsLog").add(logEntry);
        logger.info(`Logged AI interaction for user ${userId}, advisor ${advisorSlug}.`);
        res.status(200).send({
            success: true,
            message: "Credits updated and interaction logged successfully.",
            newCredits: newCreditBalance,
        });
    }
    catch (error) {
        logger.error("Error in deductCreditsAndLogInteraction:", error);
        if (error instanceof HttpError) {
            res.status(error.httpStatus).send({ error: error.message, code: error.code });
        }
        else {
            res.status(500).send({ error: "Internal server error." });
        }
    }
});
/**
 * HTTP-callable function to seed a sample dispensary.
 * Also creates an auth user for the dispensary owner if one doesn't exist.
 */
exports.seedSampleDispensary = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    const dispensaryRef = db.collection('dispensaries').doc("sample-dispensary-01");
    const authAdmin = admin.auth();
    const sampleDispensaryData = {
        fullName: "The Original Seed Store",
        phone: "+27833334444",
        ownerEmail: "owner.seedstore@example.com",
        dispensaryName: "The Original Seed Store & Hub",
        dispensaryType: "Permaculture & gardening store",
        currency: "ZAR",
        openTime: "08:30",
        closeTime: "17:00",
        operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        location: "Main Road, Port Edward, South Africa",
        latitude: -31.0512,
        longitude: 30.2200,
        deliveryRadius: "10",
        bulkDeliveryRadius: "national",
        collectionOnly: false,
        orderType: "both",
        participateSharing: "yes",
        leadTime: "3-7",
        message: "Quality seeds and gardening supplies. Organic and permaculture focused.",
        status: "Approved",
        applicationDate: admin.firestore.Timestamp.fromDate(new Date("2023-09-01T09:00:00Z")),
        approvedDate: admin.firestore.Timestamp.fromDate(new Date("2023-09-05T14:00:00Z")),
        lastActivityDate: admin.firestore.Timestamp.now(),
        publicStoreUrl: `${BASE_URL}/store/sample-dispensary-01`,
        productCount: 0,
        incomingRequestCount: 0,
        outgoingRequestCount: 0,
        averageRating: 4.8,
        reviewCount: 50,
    };
    try {
        await dispensaryRef.set(sampleDispensaryData, { merge: true });
        logger.info(`Successfully seeded/updated dispensary: ${sampleDispensaryData.dispensaryName || 'Unnamed'} with ID: ${dispensaryRef.id}`);
        const ownerUserEmail = sampleDispensaryData.ownerEmail;
        const ownerPassword = "SeedStorePass123!";
        let ownerUserRecord;
        try {
            ownerUserRecord = await authAdmin.createUser({
                email: ownerUserEmail,
                password: ownerPassword,
                displayName: sampleDispensaryData.fullName,
                emailVerified: true,
                disabled: false,
            });
            logger.info(`Successfully created new auth user for dispensary owner: ${ownerUserRecord.uid} (${ownerUserEmail})`);
        }
        catch (authError) {
            if (authError.code === 'auth/email-already-exists') {
                logger.warn(`Auth user ${ownerUserEmail} already exists. Fetching existing user.`);
                ownerUserRecord = await authAdmin.getUserByEmail(ownerUserEmail);
            }
            else {
                throw authError;
            }
        }
        const ownerUserDocRef = db.collection('users').doc(ownerUserRecord.uid);
        const ownerFirestoreUserData = {
            uid: ownerUserRecord.uid,
            email: ownerUserEmail,
            displayName: sampleDispensaryData.fullName,
            photoURL: null,
            role: 'DispensaryOwner',
            credits: 100,
            createdAt: admin.firestore.Timestamp.now(),
            lastLoginAt: admin.firestore.Timestamp.now(),
            status: 'Active',
            dispensaryId: dispensaryRef.id,
            signupSource: 'seeded_sample', // Indicate source
        };
        await ownerUserDocRef.set(ownerFirestoreUserData, { merge: true });
        logger.info(`Successfully created/updated Firestore document for dispensary owner: ${ownerUserRecord.uid}`);
        res.status(200).send({
            success: true,
            message: `Dispensary '${sampleDispensaryData.dispensaryName || 'Unnamed'}' seeded/updated successfully. Auth user for owner ${ownerUserEmail} created/verified.`
        });
    }
    catch (error) {
        logger.error("Error seeding dispensary and owner auth user:", error);
        res.status(500).send({
            success: false,
            message: "Error seeding dispensary and/or owner auth user.",
            errorDetails: error.message
        });
    }
});
/**
 * HTTP-callable function to seed sample users.
 */
exports.seedSampleUsers = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    const authAdmin = admin.auth();
    const usersToCreate = [
        { email: "leafuser1@example.com", password: "LeafPass123!", displayName: "Leaf User One" },
        { email: "leafuser2@example.com", password: "LeafPass456!", displayName: "Leaf User Two" },
        { email: "leafuser3@example.com", password: "LeafPass789!", displayName: "Leaf User Three" },
    ];
    const results = [];
    for (const user of usersToCreate) {
        try {
            let userRecord;
            try {
                userRecord = await authAdmin.createUser({
                    email: user.email,
                    password: user.password,
                    displayName: user.displayName,
                    emailVerified: true,
                    disabled: false,
                });
                logger.info(`Successfully created new auth user: ${userRecord.uid} (${user.email})`);
            }
            catch (authError) {
                if (authError.code === 'auth/email-already-exists') {
                    logger.warn(`Auth user ${user.email} already exists. Fetching existing user.`);
                    userRecord = await authAdmin.getUserByEmail(user.email);
                }
                else {
                    throw authError;
                }
            }
            const userDocRef = db.collection('users').doc(userRecord.uid);
            const firestoreUserData = {
                uid: userRecord.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: null,
                role: 'LeafUser',
                credits: 100, // Sample users get more credits for testing
                createdAt: admin.firestore.Timestamp.now(),
                lastLoginAt: admin.firestore.Timestamp.now(),
                status: 'Active',
                dispensaryId: null,
                welcomeCreditsAwarded: true, // Assume sample users have received this
                signupSource: 'seeded_sample', // Indicate source
            };
            await userDocRef.set(firestoreUserData, { merge: true });
            logger.info(`Successfully created/updated Firestore document for user: ${userRecord.uid}`);
            results.push({ email: user.email, success: true, uid: userRecord.uid });
        }
        catch (error) {
            logger.error(`Error creating/updating user ${user.email}:`, error.message);
            results.push({ email: user.email, success: false, error: error.message });
        }
    }
    const allSuccessful = results.every(r => r.success);
    res.status(allSuccessful ? 200 : 207).send({
        message: allSuccessful ? "All sample users seeded successfully." : "Some sample users may not have been seeded correctly. Check logs.",
        results,
    });
});
/**
 * Generic HTTP-callable Firebase Function to copy data from one document to another within the same collection.
 */
async function copyDocumentContent(req, res, collectionName, sourceDocId, targetDocId) {
    try {
        logger.info(`Starting copy from '${collectionName}/${sourceDocId}' to '${collectionName}/${targetDocId}'.`);
        const sourceDocRef = db.collection(collectionName).doc(sourceDocId);
        const targetDocRef = db.collection(collectionName).doc(targetDocId);
        const sourceDoc = await sourceDocRef.get();
        if (!sourceDoc.exists) {
            logger.error(`Source document '${collectionName}/${sourceDocId}' does not exist.`);
            res.status(404).send({ success: false, message: `Source document '${sourceDocId}' not found in '${collectionName}'. Ensure the source document ID is correct and case-sensitive.` });
            return;
        }
        const sourceData = sourceDoc.data();
        if (!sourceData) {
            logger.error(`Source document '${collectionName}/${sourceDocId}' has no data.`);
            res.status(404).send({ success: false, message: `Source document '${sourceDocId}' has no data.` });
            return;
        }
        const dataToCopy = {
            ...sourceData,
            copiedAt: admin.firestore.FieldValue.serverTimestamp(),
            originalSourceId: sourceDocId,
        };
        await targetDocRef.set(dataToCopy, { merge: true });
        logger.info(`Successfully copied data from '${collectionName}/${sourceDocId}' to '${collectionName}/${targetDocId}'.`);
        res.status(200).send({
            success: true,
            message: `Data successfully copied from '${sourceDocId}' to '${targetDocId}' in '${collectionName}'. Target document now contains the source data and a 'copiedAt' timestamp.`,
            sourceDataCopied: sourceData
        });
    }
    catch (error) {
        logger.error(`Error copying document in ${collectionName} from ${sourceDocId} to ${targetDocId}:`, error);
        res.status(500).send({
            success: false,
            message: "An error occurred while copying the document.",
            errorDetails: (error instanceof Error) ? error.message : "Unknown error"
        });
    }
}
/**
 * HTTP-callable Firebase Function to copy data from 'THC - CBD - Mushrooms dispensary' to 'Cannibinoid Store'.
 */
exports.copyDispensaryTypeCategoriesData = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    await copyDocumentContent(req, res, "dispensaryTypeProductCategories", "THC - CBD - Mushrooms dispensary", "Cannibinoid Store");
});
/**
 * HTTP-callable Firebase Function to copy data from 'Mushroom dispensary' to 'Mushroom store'.
 */
exports.copyMushroomDispensaryCategoriesData = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    await copyDocumentContent(req, res, "dispensaryTypeProductCategories", "Mushroom dispensary", "Mushroom store");
});
/**
 * HTTP-callable Firebase Function to copy data from 'Homeopathic dispensary' to 'Homeopathic store'.
 */
exports.copyHomeopathicDispensaryCategoriesData = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    await copyDocumentContent(req, res, "dispensaryTypeProductCategories", "Homeopathic dispensary", "Homeopathic store");
});
/**
 * HTTP-callable function to seed a Firestore collection from a large JSON file.
 * Place your JSON file at `functions/src/data/seed-data.json`.
 * The JSON file should be an array of objects.
 */
exports.seedLargeCollection = (0, https_1.onRequest)({
    timeoutSeconds: 540,
    memory: '1GiB', // Corrected memory format
    cors: true,
}, async (req, res) => {
    const COLLECTION_NAME = "my-seeded-collection"; // You can change this
    const BATCH_SIZE = 400; // Firestore batch limit is 500, using 400 for safety.
    try {
        logger.info(`Starting Firestore seed for collection: ${COLLECTION_NAME}`);
        // The path is relative to the compiled 'lib' directory in the deployed function
        const dataPath = path.join(__dirname, 'data/seed-data.json');
        if (!fs.existsSync(dataPath)) {
            const errorMsg = "Seed file not found at 'functions/lib/data/seed-data.json'. Please ensure 'functions/src/data/seed-data.json' exists and was deployed.";
            logger.error(errorMsg);
            res.status(500).send({ success: false, message: errorMsg });
            return;
        }
        const jsonData = fs.readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(jsonData);
        if (!Array.isArray(data)) {
            throw new Error("JSON data is not an array of objects.");
        }
        logger.info(`Found ${data.length} documents to seed.`);
        const collectionRef = db.collection(COLLECTION_NAME);
        let batch = db.batch();
        let writeCount = 0;
        for (let i = 0; i < data.length; i++) {
            const docData = data[i];
            const docRef = collectionRef.doc(); // Auto-generate document ID
            batch.set(docRef, docData);
            if ((i + 1) % BATCH_SIZE === 0 || i === data.length - 1) {
                await batch.commit();
                const currentBatchSize = (i % BATCH_SIZE) + 1;
                writeCount += currentBatchSize;
                logger.info(`Committed batch of ${currentBatchSize}, total documents written: ${writeCount}`);
                batch = db.batch(); // Start a new batch
            }
        }
        const successMsg = `Successfully seeded ${data.length} documents into the '${COLLECTION_NAME}' collection.`;
        logger.info(successMsg);
        res.status(200).send({ success: true, message: successMsg, documentsSeeded: data.length });
    }
    catch (error) {
        logger.error(`Error seeding Firestore collection '${COLLECTION_NAME}':`, error);
        res.status(500).send({
            success: false,
            message: "An error occurred during the seeding process.",
            errorDetails: (error instanceof Error) ? error.message : "Unknown error"
        });
    }
});
//# sourceMappingURL=index.js.map