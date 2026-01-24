/**
 * Social Media Integration Cloud Functions
 * Handles secure storage and posting to social media platforms
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import * as crypto from 'crypto';

const db = admin.firestore();

// Encryption key (should be stored in environment variables in production)
const ENCRYPTION_KEY = process.env.SOCIAL_ENCRYPTION_KEY || 'your-32-character-encryption-key!!';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt sensitive data
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt sensitive data
 * Note: Currently unused but kept for future decryption needs
 */
// function decrypt(text: string): string {
//   const textParts = text.split(':');
//   const iv = Buffer.from(textParts.shift()!, 'hex');
//   const encryptedText = Buffer.from(textParts.join(':'), 'hex');
//   const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
//   let decrypted = decipher.update(encryptedText);
//   decrypted = Buffer.concat([decrypted, decipher.final()]);
//   return decrypted.toString();
// }

/**
 * Connect a social media account
 */
export const connectSocialAccount = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; accountId: string }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { entityId, userContext = 'dispensary', platform, authMethod, username, password, apiKey, apiSecret, token } = request.data;

    if (!entityId || !platform || !authMethod) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
      // Verify user has access
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();

      if (!userData) {
        throw new HttpsError('not-found', 'User not found');
      }

      // Permission check based on context
      if (userContext === 'dispensary') {
        if (userData.role !== 'DispensaryOwner' && userData.dispensaryId !== entityId) {
          throw new HttpsError('permission-denied', 'You do not have permission to connect accounts for this dispensary');
        }
      } else {
        // For leaf users and influencers, they can only connect their own accounts
        if (request.auth.uid !== entityId) {
          throw new HttpsError('permission-denied', 'You can only connect accounts for yourself');
        }
      }

      // Prepare encrypted credentials
      let encryptedData: any = {};

      if (authMethod === 'credentials' && username && password) {
        const credentialsJson = JSON.stringify({ username, password });
        encryptedData.encryptedCredentials = encrypt(credentialsJson);
        encryptedData.username = username; // Store username unencrypted for display
      }

      if (authMethod === 'api_key' && apiKey) {
        encryptedData.apiKey = encrypt(apiKey);
        if (apiSecret) {
          encryptedData.apiSecret = encrypt(apiSecret);
        }
      }

      if (token) {
        encryptedData.accessToken = encrypt(token);
      }

      // Determine collection path based on user context
      const collectionPath = userContext === 'dispensary' 
        ? `dispensaries/${entityId}/socialAccounts`
        : `users/${entityId}/socialAccounts`;

      // Create or update the social account document
      const accountData = {
        entityId,
        userContext,
        platform,
        authMethod,
        status: 'connected',
        ...encryptedData,
        canPost: true,
        canPostImages: true,
        canPostVideos: platform !== 'twitter', // Twitter has limitations
        canSchedule: true,
        postsCount: 0,
        connectedAt: admin.firestore.FieldValue.serverTimestamp(),
        connectedBy: request.auth.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true
      };

      // Check if account already exists
      const [collection1, collection2, collection3] = collectionPath.split('/');
      const existingAccountQuery = await db
        .collection(collection1)
        .doc(collection2)
        .collection(collection3)
        .where('platform', '==', platform)
        .limit(1)
        .get();

      let accountId: string;

      if (!existingAccountQuery.empty) {
        // Update existing account
        accountId = existingAccountQuery.docs[0].id;
        await db
          .collection(collection1)
          .doc(collection2)
          .collection(collection3)
          .doc(accountId)
          .update(accountData);

        logger.info(`Updated social account: ${platform} for ${userContext}: ${entityId}`);
      } else {
        // Create new account
        const accountRef = await db
          .collection(collection1)
          .doc(collection2)
          .collection(collection3)
          .add(accountData);

        accountId = accountRef.id;
        logger.info(`Created social account: ${platform} for ${userContext}: ${entityId}`);
      }

      return { success: true, accountId };
    } catch (error: any) {
      logger.error('Error connecting social account:', error);
      throw new HttpsError('internal', error.message || 'Failed to connect account');
    }
  }
);

/**
 * Disconnect a social media account
 */
export const disconnectSocialAccount = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { entityId, userContext = 'dispensary', accountId } = request.data;

    if (!entityId || !accountId) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
      // Verify user has access
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();

      if (!userData) {
        throw new HttpsError('not-found', 'User not found');
      }

      // Permission check based on context
      if (userContext === 'dispensary') {
        if (userData.role !== 'DispensaryOwner' && userData.dispensaryId !== entityId) {
          throw new HttpsError('permission-denied', 'Access denied');
        }
      } else {
        if (request.auth.uid !== entityId) {
          throw new HttpsError('permission-denied', 'Access denied');
        }
      }

      // Determine collection path
      const collectionPath = userContext === 'dispensary' 
        ? `dispensaries/${entityId}/socialAccounts`
        : `users/${entityId}/socialAccounts`;
      const [collection1, collection2, collection3] = collectionPath.split('/');

      // Delete the account
      await db
        .collection(collection1)
        .doc(collection2)
        .collection(collection3)
        .doc(accountId)
        .delete();

      logger.info(`Disconnected social account: ${accountId} for ${userContext}: ${entityId}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Error disconnecting social account:', error);
      throw new HttpsError('internal', error.message || 'Failed to disconnect account');
    }
  }
);

/**
 * Refresh OAuth token (placeholder for OAuth implementation)
 */
export const refreshSocialToken = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { accountId } = request.data;

    // TODO: Implement OAuth token refresh logic
    // This would make API calls to each platform's token refresh endpoint

    logger.info(`Token refresh requested for account: ${accountId}`);

    return { success: true };
  }
);

/**
 * Post to multiple social media platforms
 */
export const postToSocial = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; results: any }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { 
      dispensaryId, 
      platforms, 
      message, 
      imageUrls, 
      videoUrl, 
      link, 
      hashtags,
      platformContent 
    } = request.data;

    if (!dispensaryId || !platforms || !message) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
      // Verify user has access
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();

      if (!userData || (userData.role !== 'DispensaryOwner' && userData.dispensaryId !== dispensaryId)) {
        throw new HttpsError('permission-denied', 'Access denied');
      }

      // Get connected accounts for the requested platforms
      const accountsQuery = await db
        .collection('dispensaries')
        .doc(dispensaryId)
        .collection('socialAccounts')
        .where('platform', 'in', platforms)
        .where('status', '==', 'connected')
        .where('isActive', '==', true)
        .get();

      const results: any = {};

      // Post to each platform
      for (const doc of accountsQuery.docs) {
        const account = doc.data();
        const platform = account.platform;

        try {
          // Get platform-specific content if provided
          const platformMessage = platformContent?.[platform]?.message || message;
          const platformHashtags = platformContent?.[platform]?.hashtags || hashtags || [];

          // Combine message with hashtags
          const fullMessage = `${platformMessage}\n\n${platformHashtags.map((tag: string) => `#${tag}`).join(' ')}`;

          // TODO: Implement actual API calls to each platform
          // For now, we'll simulate success
          
          logger.info(`Posting to ${platform} for dispensary: ${dispensaryId}`);
          logger.info(`Message: ${fullMessage.substring(0, 100)}...`);

          results[platform] = {
            status: 'success',
            postId: `${platform}_${Date.now()}`,
            postUrl: `https://${platform}.com/post/example`,
            postedAt: new Date().toISOString()
          };

          // Update post count
          await db
            .collection('dispensaries')
            .doc(dispensaryId)
            .collection('socialAccounts')
            .doc(doc.id)
            .update({
              postsCount: admin.firestore.FieldValue.increment(1),
              lastPostAt: admin.firestore.FieldValue.serverTimestamp()
            });

        } catch (error: any) {
          logger.error(`Error posting to ${platform}:`, error);
          results[platform] = {
            status: 'failed',
            error: error.message
          };
        }
      }

      // Store the post record
      await db
        .collection('dispensaries')
        .doc(dispensaryId)
        .collection('socialPosts')
        .add({
          createdBy: request.auth.uid,
          message,
          imageUrls: imageUrls || [],
          videoUrl: videoUrl || null,
          link: link || null,
          hashtags: hashtags || [],
          platforms,
          platformContent: platformContent || {},
          status: 'posted',
          postResults: results,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      return { success: true, results };
    } catch (error: any) {
      logger.error('Error posting to social media:', error);
      throw new HttpsError('internal', error.message || 'Failed to post');
    }
  }
);

/**
 * Get social media post analytics (placeholder)
 */
export const getSocialAnalytics = onCall(
  { cors: true },
  async (request): Promise<{ analytics: any }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // TODO: Implement analytics fetching from each platform's API
    // const { dispensaryId, postId } = request.data;

    return {
      analytics: {
        facebook: { views: 150, likes: 25, comments: 5, shares: 3 },
        instagram: { views: 300, likes: 45, comments: 8 },
        twitter: { views: 200, likes: 30, retweets: 10 }
      }
    };
  }
);
