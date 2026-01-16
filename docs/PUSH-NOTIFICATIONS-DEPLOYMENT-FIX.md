# 🚀 Push Notifications Deployment Fix

## Problem Identified

Your deployed app showed this error:
```
Error getting FCM token: TypeError: Failed to register a ServiceWorker for scope with script ('https://tree--dispensary-tree.us-central1.hosted.app/firebase-messaging-sw.js'): A bad HTTP response code (404) was received when fetching the script.
```

**Root Cause:** The Firebase Messaging Service Worker (`firebase-messaging-sw.js`) wasn't being served correctly by Next.js in production.

---

## ✅ Fixes Applied

### 1. **Updated `next.config.ts`**
- Added `publicExcludes` to prevent next-pwa from processing `firebase-messaging-sw.js`
- Added custom headers configuration to serve the service worker with correct MIME type and scope

### 2. **Created `public/_headers`**
- Added Netlify-style headers file (for compatibility with some hosting platforms)
- Ensures service worker is served with `Service-Worker-Allowed: /` header

---

## 🚀 Deployment Steps

### Step 1: Rebuild Your App
```bash
npm run build
```

This will:
- Build Next.js with the new configuration
- Properly include `firebase-messaging-sw.js` in the build output
- Apply the custom headers

### Step 2: Deploy to Firebase App Hosting
```bash
firebase deploy --only hosting
```

Or if you're using the full deployment:
```bash
firebase deploy
```

### Step 3: Verify Service Worker in Production

1. **Open your deployed app** in Chrome
2. **Open DevTools** (F12)
3. **Go to Application tab** → Service Workers section
4. **Check if `firebase-messaging-sw.js` is registered**

You should see:
```
✅ firebase-messaging-sw.js
   Status: activated and running
   Scope: https://your-app-url/
```

### Step 4: Test Push Notifications

1. **Log in** to your deployed app
2. **Grant notification permission** when prompted
3. **Log out and close the browser**
4. **Trigger a test event** (place order, request payout)
5. **Notification should appear!**

---

## 🔍 Troubleshooting

### Service Worker Still 404?

If you still see 404 errors after deployment:

**Option 1: Clear Build Cache**
```bash
# Delete build artifacts
rm -rf .next
rm -rf out

# Rebuild
npm run build

# Deploy
firebase deploy --only hosting
```

**Option 2: Verify File Exists in Build Output**
```bash
# Check if service worker is in the build
ls -la .next/static/ | grep firebase
ls -la public/ | grep firebase
```

The file should exist at: `public/firebase-messaging-sw.js`

**Option 3: Check Firebase Hosting Configuration**

Make sure your `firebase.json` includes the public directory:
```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  }
}
```

### Service Worker Registered But Not Working?

1. **Check Firebase Config in Service Worker:**
   - Open `public/firebase-messaging-sw.js`
   - Verify the `firebaseConfig` matches your project
   - Especially check `projectId` and `messagingSenderId`

2. **Check VAPID Key:**
   - Ensure `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is set in your environment
   - Generate one in Firebase Console if you haven't: Project Settings → Cloud Messaging → Web Push certificates

3. **Check FCM Tokens in Firestore:**
   ```
   Firestore → users collection → [your user ID] → fcmTokens (should be an array)
   ```

4. **Check Cloud Functions Logs:**
   ```bash
   firebase functions:log --only onOrderCreated
   ```

---

## 📋 Deployment Checklist

Before deploying, ensure you have:

- [x] ✅ Updated `next.config.ts` with service worker headers
- [x] ✅ Created `public/_headers` file
- [ ] ⚠️ Set `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in your environment variables
- [ ] ⚠️ Deployed Cloud Functions: `firebase deploy --only functions`
- [ ] ⚠️ Rebuilt your app: `npm run build`
- [ ] ⚠️ Deployed hosting: `firebase deploy --only hosting`

---

## 🎯 Expected Behavior After Fix

### Production Console (No Errors):
```
✅ Notification permission granted
✅ Service worker registered successfully
✅ FCM token: [token string]
✅ FCM token saved to Firestore
```

### Production Service Worker (DevTools):
```
✅ firebase-messaging-sw.js
   Status: activated and running
   Source: /firebase-messaging-sw.js
   Scope: /
```

### Production Push Notifications:
```
✅ App closed/logged out
✅ Order placed → Notification appears
✅ Sound plays
✅ Click opens app to order page
```

---

## 🚨 Important Notes

1. **Service Worker Updates:**
   - Browsers cache service workers aggressively
   - Users may need to hard refresh (Ctrl+Shift+R) after deployment
   - Consider versioning your service worker for production

2. **HTTPS Required:**
   - Service workers only work on HTTPS (or localhost)
   - Your Firebase App Hosting URL is HTTPS by default ✅

3. **Browser Support:**
   - Chrome/Edge: Full support ✅
   - Firefox: Full support ✅
   - Safari: Limited support (iOS 16.4+)

4. **Testing Locally:**
   - Service worker won't register in development mode (disabled in config)
   - To test locally: `npm run build && npm run start`

---

## 🔄 Redeployment Process

After fixing the configuration:

```bash
# 1. Clean build
rm -rf .next

# 2. Install dependencies (if needed)
npm install

# 3. Build production version
npm run build

# 4. Deploy functions first (if updated)
cd functions
npm run build
firebase deploy --only functions
cd ..

# 5. Deploy hosting
firebase deploy --only hosting

# 6. Test in production
# Open your app URL and check DevTools console
```

---

## ✅ Verification Commands

```bash
# Check if service worker file exists
ls -la public/firebase-messaging-sw.js

# Check next config
cat next.config.ts | grep -A 10 "headers()"

# Check environment variables
echo $NEXT_PUBLIC_FIREBASE_VAPID_KEY

# Test build locally
npm run build && npm run start
# Then open http://localhost:3000 and check DevTools
```

---

## 📞 Still Having Issues?

If the service worker still won't register after following all steps:

1. Check the **Network tab** in DevTools:
   - Look for the request to `/firebase-messaging-sw.js`
   - Status should be `200 OK`, not `404`
   - Content-Type should be `application/javascript`

2. Check the **Console** for any other errors

3. Verify your Firebase project configuration

4. Ensure you're testing on the correct deployed URL

---

## 🎉 Success Criteria

You'll know it's working when:
1. ✅ No 404 errors for service worker in console
2. ✅ Service worker appears in DevTools Application tab
3. ✅ "Notification permission granted" appears in console
4. ✅ FCM token is logged in console
5. ✅ Notifications appear when app is closed
6. ✅ Sound plays automatically
7. ✅ Clicking notification opens the app

Deploy and test! 🚀
