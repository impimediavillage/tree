
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
import { onRequest, Request } from "firebase-functions/v2/https";
import type { Response } from "express";

// Import the JSON data directly.
// Make sure the path is relative to this index.ts file.
import type {
  DispensaryDocData,
  ProductRequestDocData,
  PoolIssueDocData,
  UserDocData,
  DeductCreditsRequestBody,
  NotificationData,
  NoteDataCloud,
} from "./types";

/**
 * Custom error class for HTTP functions to propagate status codes.
 */
class HttpError extends Error {
  constructor(public httpStatus: number, public message: string, public code: string) {
    super(message);
    this.name = 'HttpError';
  }
}

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Configure SendGrid - IMPORTANT: Set these environment variables in your Firebase Functions config
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "YOUR_SENDGRID_API_KEY_PLACEHOLDER");
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@example.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:9002"; // For generating public URLs


/**
 * Sends a notification email using SendGrid.
 */
async function sendDispensaryNotificationEmail(
  toEmail: string,
  subject: string,
  htmlBody: string,
  dispensaryName?: string // This can be undefined
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
export const onLeafUserCreated = onDocumentCreated(
  "users/{userId}",
  async (event: FirestoreEvent<admin.firestore.QueryDocumentSnapshot | undefined, { userId: string }>) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error("No data associated with the user creation event.");
      return null;
    }
    const userData = snapshot.data() as UserDocData;
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
    } else if (userData.role === 'LeafUser' && userData.signupSource === 'public') {
        logger.log(`New Leaf User created via public signup (ID: ${userId}). Welcome email skipped.`);
    } else {
      logger.log(`New user created (ID: ${userId}), but not a LeafUser eligible for this welcome email. Role: ${userData.role || 'N/A'}, Source: ${userData.signupSource || 'N/A'}`);
    }
    return null;
  }
);


/**
 * Cloud Function triggered when a new dispensary document is created.
 * Sends an "Application Received" email to the owner.
 */
export const onDispensaryCreated = onDocumentCreated(
  "dispensaries/{dispensaryId}",
  async (
 event: FirestoreEvent<admin.firestore.QueryDocumentSnapshot | undefined, { dispensaryId: string }>
  ) => {
    const snapshot = event.data;
    if (!snapshot) {
 logger.error("No data associated with the document creation event.");
 return null;
    }
    const dispensary = snapshot.data() as DispensaryDocData;
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
export const onDispensaryUpdate = onDocumentUpdated(
  "dispensaries/{dispensaryId}",
  async (
 event: FirestoreEvent<Change<admin.firestore.QueryDocumentSnapshot> | undefined, { dispensaryId: string }>
  ) => {
    const change = event.data;
    if (!change || !change.after) {
 logger.error("No change or after data associated with the document update event.");
 return null;
    }

    const newValue = change.after.data() as DispensaryDocData | undefined;
    const previousValue = change.before?.data() as DispensaryDocData | undefined;
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
    let contentLines: string[] = [];
    let greeting = `Dear ${ownerDisplayName},`;
    let sendEmail = false;
    let actionButton;

    if (newValue.status === "Approved" && previousValue?.status !== "Approved") {
      sendEmail = true;
      logger.log(`Dispensary ${dispensaryId} was approved.`);
      let defaultPasswordUsed: string | undefined = undefined;
      let userRecord: admin.auth.UserRecord;

      try {
        userRecord = await admin.auth().getUserByEmail(ownerEmail);
        logger.log(`Found existing auth user ${userRecord.uid} for email ${ownerEmail}.`);
      } catch (error: any) {
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
          } catch (createUserError: any) {
            logger.error(`Error creating new auth user for ${ownerEmail} (Dispensary ${dispensaryId}):`, createUserError);
            return null;
          }
        } else {
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
        const firestoreUserDataUpdate: Partial<UserDocData> = {
            uid: userId, email: ownerEmail, displayName: ownerDisplayName,
            role: "DispensaryOwner", dispensaryId: dispensaryId, status: "Active",
            photoURL: userRecord.photoURL || null,
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
        };

        const userDocSnap = await userDocRef.get();
        if (!userDocSnap.exists) {
            (firestoreUserDataUpdate as UserDocData).createdAt = admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp;
            (firestoreUserDataUpdate as UserDocData).credits = 100; // Default credits for new owner
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
        } else {
          contentLines.push(`You can log in to your Dispensary Admin Dashboard using your email (${ownerEmail}) and your existing password.`);
        }
        contentLines.push(`If you have any questions, please don't hesitate to contact our support team.`);
        actionButton = { text: "Go to Your Dashboard", url: `${BASE_URL}/dispensary-admin/dashboard` };

      } catch (claimOrFirestoreError) {
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

      let userStatusToSet: UserDocData['status'] = 'PendingApproval';
      if (newValue.status === 'Approved') userStatusToSet = 'Active';
      else if (newValue.status === 'Suspended') userStatusToSet = 'Suspended';
      else if (newValue.status === 'Rejected') userStatusToSet = 'Rejected';

      if (newValue.status === "Rejected") {
        subject = `Update on Your Dispensary Application: ${dispensaryName}`;
        contentLines.push(`We regret to inform you that after careful review, your application for "<strong>${dispensaryName}</strong>" has been rejected at this time. `);
        contentLines.push(`If you have questions or would like to discuss this further, please contact our support team.`);
      } else if (newValue.status === "Suspended") {
        subject = `Action Required: Your Dispensary Account "${dispensaryName}" Has Been Suspended`;
        contentLines.push(`Your dispensary account has been temporarily suspended. This may be due to a violation of our terms of service or other pending issues. `);
        contentLines.push(`Please contact our support team as soon as possible to address this matter.`);
      } else if (newValue.status === "Pending Approval" && previousValue?.status === "Suspended") {
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
      } catch (error) {
        logger.error(`Error updating status for users associated with dispensary ${dispensaryId}:`, error);
      }
    }
    else if (previousValue && newValue.status === previousValue.status) {
      const beforeDataForCompare = { ...previousValue };
      const afterDataForCompare = { ...newValue };
      const fieldsToIgnore = ['lastActivityDate', 'approvedDate', 'publicStoreUrl', 'productCount', 'incomingRequestCount', 'outgoingRequestCount', 'averageRating', 'reviewCount'];
      fieldsToIgnore.forEach(field => {
        delete (beforeDataForCompare as any)[field];
        delete (afterDataForCompare as any)[field];
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
      } else {
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
export const onProductRequestCreated = onDocumentCreated(
  "productRequests/{requestId}",
  async (
    event: FirestoreEvent<admin.firestore.QueryDocumentSnapshot | undefined, { requestId: string }>
  ) => {
    const snapshot = event.data;
    const requestId = event.params.requestId;

    if (!snapshot) {
      logger.error(`No data associated with the product request creation event for ${requestId}.`);
      return null;
    }
    const request = snapshot.data() as ProductRequestDocData;
    logger.log(
      `New product request ${requestId} created by ${request?.requesterDispensaryName || 'Unknown Requester'} for product ${request?.productName || 'Unknown Product'}`
    );

    if (!request.productOwnerEmail) {
      logger.error(
        `Product request ${requestId} is missing productOwnerEmail. Cannot send notification.`
      );
      return null;
    }

    try {
      const productOwnerUser = await admin
        .auth()
        .getUserByEmail(request.productOwnerEmail);
      if (productOwnerUser) {
        const notification: NotificationData = {
          recipientUid: productOwnerUser.uid,
          message: `You have a new product request for "${request.productName || 'a product'}" from ${request.requesterDispensaryName || 'a dispensary'}.`,
          link: `/dispensary-admin/pool?tab=incoming-requests&requestId=${requestId}`,
          read: false,
          createdAt: admin.firestore.Timestamp.now() as any,
        };
        await db.collection("notifications").add(notification);
        logger.info(
          `Notification created for product owner ${productOwnerUser.uid} regarding request ${requestId}`
        );
      } else {
        logger.warn(
          `Could not find user for product owner email: ${request.productOwnerEmail} for request ${requestId}`
        );
      }
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        logger.error(
          `User not found for productOwnerEmail: ${request.productOwnerEmail} in request ${requestId}.`
        );
      } else {
        logger.error(
          `Error creating notification for new product request ${requestId}:`,
          error
        );
      }
    }
    return null;
  });

/**
 * Cloud Function to create a notification when a product request status is updated or a new note is added.
 */
export const onProductRequestUpdated = onDocumentUpdated(
  "productRequests/{requestId}",
  async (
    event: FirestoreEvent<Change<admin.firestore.QueryDocumentSnapshot> | undefined, { requestId: string }>
  ) => {
    const change = event.data;
    const requestId = event.params.requestId;

    if (!change || !change.after) {
      logger.error(`No change or after data associated with the product request update event for ${requestId}.`);
      return null;
    }
    const before = change.before?.data() as ProductRequestDocData | undefined;
    const after = change.after.data() as ProductRequestDocData | undefined;

    let notificationRecipientEmail: string | null = null; 
    let notificationMessage: string | null = null;
    let notificationLink: string = `/dispensary-admin/pool?requestId=${requestId}`;

    if (before?.requestStatus !== after?.requestStatus) {
      logger.log(
        `Product request ${requestId} status changed from ${before?.requestStatus || 'N/A'} to ${after?.requestStatus || 'N/A'}`
      );
      notificationMessage = `Your request for "${
        after?.productName || 'a product'
      }" has been updated to: ${after?.requestStatus
        ?.replace(/_/g, " ")
        .toUpperCase()}.`;
      
      notificationRecipientEmail = after?.requesterEmail || null;
      notificationLink = `/dispensary-admin/pool?tab=outgoing-requests&requestId=${requestId}`;


      if (after?.requestStatus === "fulfilled_by_sender" && after?.requesterEmail) {
        notificationRecipientEmail = after.requesterEmail;
        notificationMessage = `${
          after?.productOwnerEmail?.split("@")[0] || 'The product owner'
        } has marked your requested product "${
          after?.productName || 'a product'
        }" as sent/fulfilled.`;
      } else if (after?.requestStatus === "received_by_requester" && after?.productOwnerEmail) {
        notificationRecipientEmail = after.productOwnerEmail;
        notificationMessage = `${after?.requesterDispensaryName || 'A requester'} has confirmed receipt of "${after?.productName || 'a product'}".`;
        notificationLink = `/dispensary-admin/pool?tab=incoming-requests&requestId=${requestId}`;
      } else if (
        (after?.requestStatus === "accepted" ||
         after?.requestStatus === "rejected" ||
         after?.requestStatus === "cancelled") && after?.requesterEmail
      ) {
        notificationRecipientEmail = after.requesterEmail;
        notificationMessage = `Your request for "${
          after?.productName || 'a product'
        }" has been ${after?.requestStatus.replace(/_/g, " ")}.`;
      }
    }

    const beforeNotesCount = before?.notes?.length || 0;
    const afterNotesCount = after?.notes?.length || 0;
    if (afterNotesCount > beforeNotesCount && after?.notes && after.notes.length > 0) {
      const newNote = after.notes[afterNotesCount - 1] as NoteDataCloud;
      logger.log(
        `New note added to product request ${requestId} by ${newNote.byName} (Role: ${newNote.senderRole})`
      );

      if (newNote.senderRole === "requester" && after?.productOwnerEmail) {
        notificationRecipientEmail = after.productOwnerEmail;
        notificationMessage = `${newNote.byName} added a note to the request for "${after?.productName}".`;
        notificationLink = `/dispensary-admin/pool?tab=incoming-requests&requestId=${requestId}`;
      } else if (newNote.senderRole === "owner" && after?.requesterEmail) {
        notificationRecipientEmail = after.requesterEmail;
        notificationMessage = `${newNote.byName} added a note to your request for "${after?.productName}".`;
        notificationLink = `/dispensary-admin/pool?tab=outgoing-requests&requestId=${requestId}`;
      }
    }

    if (!notificationRecipientEmail || !notificationMessage) {
      logger.log(
        `Product request ${requestId} updated, but no specific condition for notification met or recipient/message is null.`
      );
      return null;
    }

    if (typeof notificationRecipientEmail !== "string" || !notificationRecipientEmail.trim()) {
      logger.error(
        `Invalid or missing notificationRecipientEmail for request ${requestId}. Cannot send notification. Email was: "${notificationRecipientEmail}"`
      );
      return null;
    }

    try {
      const recipientUser = await admin
        .auth()
        .getUserByEmail(notificationRecipientEmail);
      if (recipientUser) {
        const notification: NotificationData = {
          recipientUid: recipientUser.uid,
          message: notificationMessage,
          link: notificationLink,
          read: false,
          createdAt: admin.firestore.Timestamp.now() as any,
        };
        await db.collection("notifications").add(notification);
        logger.info(
          `Notification created for ${recipientUser.uid} for request ${requestId} update.`
        );
      } else {
        logger.warn(
          `Could not find user for email: ${notificationRecipientEmail} during request ${requestId} update.`
        );
      }
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        logger.error(
          `User not found for notificationRecipientEmail: ${notificationRecipientEmail} in request ${requestId} update.`
        );
      } else {
        logger.error(
          `Error creating notification for product request ${requestId} update:`,
          error
        );
      }
    }
    return null;
  });

/**
 * Cloud Function to create a notification for Super Admin when a new PoolIssue is created.
 */
export const onPoolIssueCreated = onDocumentCreated(
  "poolIssues/{issueId}",
  async (
    event: FirestoreEvent<admin.firestore.QueryDocumentSnapshot | undefined, { issueId: string }>
  ) => {
    const snapshot = event.data;
    const issueId = event.params.issueId; 

    if (!snapshot) {
      logger.error(`No data associated with the pool issue creation event for ${issueId}.`);
      return null;
    }
    const issue = snapshot.data() as PoolIssueDocData;
    logger.log(
      `New pool issue ${issueId} reported by ${issue?.reporterDispensaryName || 'Unknown Reporter'} against ${issue?.reportedDispensaryName || 'Unknown Reported Party'}.`
    );

    const superAdminEmail = "impimediavillage@gmail.com"; 
    if (!superAdminEmail) {
      logger.error(
        "Super Admin email is not configured. Cannot send notification for pool issue."
      );
      return null;
    }

    try {
      const superAdminUser = await admin.auth().getUserByEmail(superAdminEmail);
      if (superAdminUser) {
        const notification: NotificationData = {
          recipientUid: superAdminUser.uid,
          message: `New pool issue reported by ${issue?.reporterDispensaryName || 'a dispensary'} for product "${issue?.productName || 'a product'}".`,
          link: `/admin/dashboard/pool-issues?issueId=${issueId}`,
          read: false,
          createdAt: admin.firestore.Timestamp.now() as any,
        };
        await db.collection("notifications").add(notification);
        logger.info(
          `Notification created for Super Admin ${superAdminUser.uid} regarding pool issue ${issueId}`
        );
      } else {
        logger.warn(
          `Could not find Super Admin user for email: ${superAdminEmail}`
        );
      }
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        logger.error(
          `Super Admin user with email ${superAdminEmail} not found. Cannot send notification for pool issue ${issueId}.`
        );
      } else {
        logger.error(
          `Error creating Super Admin notification for new pool issue ${issueId}:`,
          error
        );
      }
    }
    return null;
  });

/**
 * HTTP-callable function to deduct credits and log AI interaction.
 */
export const deductCreditsAndLogInteraction = onRequest(
  { cors: true }, // Gen 2 CORS configuration
  async (req: Request, res: Response) => {
    if (req.method !== "POST") {
      res.status(405).send({ error: "Method Not Allowed" });
      return;
    }

    const {
      userId,
      advisorSlug,
      creditsToDeduct,
      wasFreeInteraction,
    } = req.body as DeductCreditsRequestBody;

    if (
      !userId ||
      !advisorSlug ||
      creditsToDeduct === undefined ||
      wasFreeInteraction === undefined
    ) {
      res.status(400).send({
        error:
          "Missing required fields: userId, advisorSlug, creditsToDeduct, wasFreeInteraction",
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
          const currentCredits = (userDoc.data() as UserDocData)?.credits || 0;
          if (currentCredits < creditsToDeduct) {
            throw new HttpError(400, "Insufficient credits.", "failed-precondition");
          }
          newCreditBalance = currentCredits - creditsToDeduct;
          transaction.update(userRef, { credits: newCreditBalance });
        });
        logger.info(
          `Successfully deducted ${creditsToDeduct} credits for user ${userId}. New balance: ${newCreditBalance}`
        );
      } else {
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
          throw new HttpError(404, "User not found for free interaction logging.", "not-found");
        }
        newCreditBalance = (userDoc.data() as UserDocData)?.credits || 0;
        logger.info(
          `Logging free interaction for user ${userId}. Current balance: ${newCreditBalance}`
        );
      }

      const logEntry = {
        userId,
        advisorSlug,
        creditsUsed: wasFreeInteraction ? 0 : creditsToDeduct,
        timestamp: admin.firestore.Timestamp.now() as any,
        wasFreeInteraction,
      };
      await db.collection("aiInteractionsLog").add(logEntry);
      logger.info(
        `Logged AI interaction for user ${userId}, advisor ${advisorSlug}.`
      );

      res.status(200).send({
        success: true,
        message: "Credits updated and interaction logged successfully.",
        newCredits: newCreditBalance,
      });
    } catch (error: any) {
      logger.error("Error in deductCreditsAndLogInteraction:", error);
      if (error instanceof HttpError) {
        res.status(error.httpStatus).send({ error: error.message, code: error.code });
      } else {
        res.status(500).send({ error: "Internal server error." });
      }
    }
  }
);











