# 🔧 FCM Service Worker 404 Fix - Firebase App Hosting

## 🚨 Problem

When logging into the Super Admin dashboard, the following error appears:
```
Failed to register a ServiceWorker for scope 
('https://tree--dispensary-tree.us-central1.hosted.app/') 
with script ('https://tree--dispensary-tree.us-central1.hosted.app/firebase-messaging-sw.js'): 
A bad HTTP response code (404) was received when fetching the script.
```

**Root Cause**: Firebase App Hosting doesn't automatically serve static files from the `/public` directory. The service worker file exists locally but isn't accessible in production.

---

## ✅ Solution Overview

We need to ensure the service worker is:
1. ✅ Properly configured in `next.config.ts` 
2. ✅ Accessible at the root URL (`/firebase-messaging-sw.js`)
3. ✅ Served with correct headers and caching policy
4. ✅ Deployed as part of the build output

---

## 🛠️ Implementation Steps

### Step 1: Update `next.config.ts` (DONE ✅)

Already updated with:
- **Headers**: Set correct `Content-Type` and `Cache-Control`
- **Rewrites**: Ensure the service worker is served at `/firebase-messaging-sw.js`

```typescript
async headers() {
  return [
    {
      source: '/firebase-messaging-sw.js',
      headers: [
        {
          key: 'Service-Worker-Allowed',
          value: '/',
        },
        {
          key: 'Content-Type',
          value: 'application/javascript; charset=utf-8',
        },
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, must-revalidate',
        },
      ],
    },
  ];
},
async rewrites() {
  return [
    {
      source: '/firebase-messaging-sw.js',
      destination: '/firebase-messaging-sw.js',
    },
  ];
},
```

### Step 2: Verify Service Worker Registration

Check that the service worker is being registered correctly in `src/lib/fcm-token-service.ts`:

```typescript
// Service worker registration (line 39)
const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
  scope: '/'
});
```

✅ **Status**: Already correct in the codebase.

### Step 3: Copy Service Worker to Public Output (CRITICAL)

Since Next.js with Firebase App Hosting doesn't automatically include `/public` files in all cases, we need to ensure the service worker is accessible.

**Option A**: Add a build script to copy the service worker:

Create `scripts/copy-service-worker.js`:
```javascript
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');
const dest = path.join(__dirname, '..', '.next', 'static', 'firebase-messaging-sw.js');

// Ensure .next/static directory exists
const staticDir = path.join(__dirname, '..', '.next', 'static');
if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir, { recursive: true });
}

// Copy service worker
fs.copyFileSync(source, dest);
console.log('✅ Service worker copied to .next/static/');
```

Update `package.json`:
```json
"scripts": {
  "build": "npm run copy-sw && next build",
  "copy-sw": "node scripts/copy-service-worker.js"
}
```

**Option B** (Recommended): Use Next.js public folder properly

Next.js should automatically serve files from `/public` at the root URL. The issue might be with Firebase App Hosting's static file serving.

Check if `public/firebase-messaging-sw.js` is being included in the deployment by adding it to `.firebaserc` or ensuring it's not ignored.

### Step 4: Update `.gitignore` (if needed)

Ensure the service worker is NOT ignored:
```
# DO NOT ignore service worker
!public/firebase-messaging-sw.js
```

### Step 5: Test Locally Before Deploying

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Run production build locally**:
   ```bash
   npm run start
   ```

3. **Test service worker registration**:
   - Open DevTools → Application → Service Workers
   - Navigate to `http://localhost:3000`
   - Verify service worker is registered at `/firebase-messaging-sw.js`

4. **Test notification permissions**:
   - Log in as Super Admin
   - Grant notification permissions when prompted
   - Check browser console for FCM token registration

### Step 6: Deploy to Firebase App Hosting

```bash
firebase apphosting:backends:rollback dispensary-tree --location=us-central1
firebase deploy --only hosting
```

Or if using Firebase App Hosting auto-deployment:
```bash
git add .
git commit -m "fix: FCM service worker 404 - ensure public files are served"
git push origin main
```

### Step 7: Verify in Production

1. **Check service worker URL**:
   - Navigate to: `https://tree--dispensary-tree.us-central1.hosted.app/firebase-messaging-sw.js`
   - Should return JavaScript code (not 404)

2. **Test in browser**:
   - Open production URL in incognito window
   - Log in as Super Admin
   - Check DevTools → Console for errors
   - Check DevTools → Application → Service Workers for registration

---

## 🔍 Debugging Steps

### Check 1: Service Worker File Exists
```bash
ls -la public/firebase-messaging-sw.js
```
Expected: File should exist and be readable.

### Check 2: Next.js Build Output
```bash
npm run build
ls -la .next/static/
```
Expected: Service worker should be copied to build output (if using Option A).

### Check 3: Firebase Hosting Configuration
Check `firebase.json`:
```json
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/firebase-messaging-sw.js",
        "headers": [
          {
            "key": "Service-Worker-Allowed",
            "value": "/"
          },
          {
            "key": "Content-Type",
            "value": "application/javascript; charset=utf-8"
          }
        ]
      }
    ]
  }
}
```

### Check 4: FCM Token Service
Test FCM initialization:
```javascript
// In browser console after login
await window.navigator.serviceWorker.getRegistrations()
  .then(registrations => console.log('Service Workers:', registrations));
```

### Check 5: Firebase Console
1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Verify **Web Push certificates** (VAPID key) is generated
3. Copy VAPID key to `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=YOUR_VAPID_KEY_HERE
   ```

---

## 🎯 Expected Behavior After Fix

### ✅ Service Worker Registration
- Browser console shows: `Service Worker registered: ServiceWorkerRegistration`
- No 404 errors in Network tab for `/firebase-messaging-sw.js`

### ✅ Notification Permissions
- User sees notification permission prompt on first login
- After granting, FCM token is generated and saved to Firestore

### ✅ Push Notifications Work
- **Foreground** (app open): Notifications appear in-app
- **Background** (app closed): Notifications appear as system notifications
- Clicking notification opens the app to the correct page

### ✅ Firestore Token Storage
- User document in Firestore has `fcmTokens` array with valid tokens
- Tokens update on refresh and across devices

---

## 🚨 Common Issues & Solutions

### Issue 1: "Service worker registration failed"
**Solution**: 
- Clear browser cache and service workers
- Rebuild and redeploy
- Check browser console for detailed error

### Issue 2: "FCM token is null"
**Solution**:
- Ensure VAPID key is set in environment variables
- Check Firebase Console → Cloud Messaging → Web Push certificates
- Regenerate VAPID key if needed

### Issue 3: "Service worker registered but notifications don't work"
**Solution**:
- Check Firestore user document for `fcmTokens` array
- Verify Cloud Functions are deployed (`firebase deploy --only functions`)
- Test with Cloud Functions logs: `firebase functions:log --only sendFCMPushNotification`

### Issue 4: "Service worker loads but shows old version"
**Solution**:
- Service worker is cached aggressively
- Force refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or clear service workers: DevTools → Application → Service Workers → Unregister

---

## 📋 Checklist

Before marking this as complete, ensure:

- [ ] `next.config.ts` has correct headers and rewrites
- [ ] Service worker file exists at `public/firebase-messaging-sw.js`
- [ ] VAPID key is set in environment variables
- [ ] App builds successfully (`npm run build`)
- [ ] Service worker accessible locally at `http://localhost:3000/firebase-messaging-sw.js`
- [ ] Service worker registered in local DevTools
- [ ] FCM token generated and saved to Firestore locally
- [ ] Changes deployed to Firebase App Hosting
- [ ] Service worker accessible in production at `https://tree--dispensary-tree.us-central1.hosted.app/firebase-messaging-sw.js`
- [ ] Service worker registered in production DevTools
- [ ] FCM token generated and saved to Firestore in production
- [ ] Test notification sent from Cloud Function works
- [ ] Notification appears in browser (background mode)
- [ ] Clicking notification opens correct page

---

## 🔗 Related Files

- **Service Worker**: `public/firebase-messaging-sw.js`
- **Next.js Config**: `next.config.ts`
- **FCM Token Service**: `src/lib/fcm-token-service.ts`
- **Firebase Config**: `src/lib/firebase.ts`
- **Auth Context**: `src/contexts/AuthContext.tsx`
- **Notification Functions**: `functions/src/notifications.ts`

---

## 📚 Resources

- [Next.js Service Workers](https://nextjs.org/docs/app/building-your-application/optimizing/service-workers)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Firebase App Hosting Docs](https://firebase.google.com/docs/app-hosting)

---

**Status**: 🚧 In Progress  
**Priority**: 🔴 Critical (Notifications not working in production)  
**Last Updated**: January 2025
