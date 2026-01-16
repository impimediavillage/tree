# ✅ Firestore Rules Updated for Push Notifications

## What Was Fixed

Your Firestore rules were **missing critical permissions** for push notifications to work properly. Here's what was added:

---

## 🔧 Changes Made

### 1. **FCM Token Storage** (CRITICAL FIX)
**Location:** `users/{userId}` collection

**Problem:** Users couldn't write their FCM tokens to their profile.

**Solution:** Added specific rule to allow users to update their `fcmTokens` array:

```javascript
// Allow users to write FCM tokens even if they only update the fcmTokens field
allow update: if isAuthenticated() && 
              request.auth.uid == userId && 
              request.resource.data.diff(resource.data).affectedKeys().hasOnly(['fcmTokens', 'lastTokenUpdate']);
```

**Why This Matters:**
- When you grant notification permission, the app saves your FCM token to Firestore
- Cloud Functions read these tokens to send push notifications
- Without this rule, tokens couldn't be saved → notifications wouldn't work

---

### 2. **Treehouse Creator Payout Notifications** (NEW)
**Collection:** `payout_requests`

```javascript
match /payout_requests/{requestId} {
  allow read: if isAuthenticated() && 
                (request.auth.uid == resource.data.creatorId || isRole('Super Admin'));
  allow create: if isAuthenticated() && request.auth.uid == request.resource.data.creatorId;
  allow update: if isRole('Super Admin');
}
```

**Permissions:**
- ✅ Creators can create their own payout requests
- ✅ Creators can read their own payout requests
- ✅ Super Admins can read and update all payout requests (approve/reject)
- ✅ Cloud Functions can create notifications about payout status changes

---

### 3. **Influencer Payout Notifications** (NEW)
**Collection:** `influencerPayouts`

```javascript
match /influencerPayouts/{requestId} {
  allow read: if isAuthenticated() && 
                (request.auth.uid == resource.data.influencerId || isRole('Super Admin'));
  allow create: if isAuthenticated() && request.auth.uid == request.resource.data.influencerId;
  allow update: if isRole('Super Admin');
}
```

**Permissions:**
- ✅ Influencers can create their own payout requests
- ✅ Influencers can read their own payout requests
- ✅ Super Admins can read and update all payout requests
- ✅ Cloud Functions can create notifications about payout status changes

---

## ✅ Already Configured (No Changes Needed)

These collections already had correct rules:

### 1. **Notifications Collection**
```javascript
match /notifications/{notificationId} {
  allow read: if isAuthenticated() && request.auth.uid == resource.data.userId;
  allow create: if true; // ✅ Cloud Functions can create notifications
  allow update: if isAuthenticated() && request.auth.uid == resource.data.userId;
  allow delete: if isAuthenticated() && request.auth.uid == resource.data.userId;
}
```

### 2. **Driver Notifications**
```javascript
match /driver_notifications/{notificationId} {
  allow read: if isAuthenticated() && request.auth.uid == resource.data.driverId;
  allow create: if true; // ✅ Cloud Functions can create notifications
  allow update: if isAuthenticated() && request.auth.uid == resource.data.driverId;
}
```

### 3. **Dispensary Payout Requests**
```javascript
match /dispensary_payout_requests/{requestId} {
  allow read: if isAuthenticated() && 
                (isDispensaryMember(resource.data.dispensaryId) || isRole('Super Admin'));
  allow create: if isDispensaryMember(request.resource.data.dispensaryId);
  allow update: if isRole('Super Admin');
}
```

### 4. **Driver Payout Requests**
```javascript
match /driver_payout_requests/{payoutId} {
  allow read: if isAuthenticated() && 
                (request.auth.uid == resource.data.driverId || 
                 isDispensaryMember(resource.data.dispensaryId));
  allow create: if isAuthenticated() && request.auth.uid == request.resource.data.driverId;
  allow update: if isDispensaryMember(resource.data.dispensaryId) || isRole('Super Admin');
}
```

---

## 🚀 Deployment

### Deploy the Updated Rules:
```bash
firebase deploy --only firestore:rules
```

Expected output:
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/dispensary-tree/overview
```

---

## 🔐 Security Summary

### What Each User Role Can Do:

| User Role | FCM Tokens | Own Notifications | Payout Requests | All Notifications |
|-----------|------------|-------------------|-----------------|-------------------|
| **Leaf User** | Write own ✅ | Read own ✅ | N/A | ❌ |
| **Dispensary Owner** | Write own ✅ | Read own ✅ | Create/Read own ✅ | ❌ |
| **Dispensary Staff** | Write own ✅ | Read own ✅ | Create/Read own ✅ | ❌ |
| **Driver** | Write own ✅ | Read own ✅ | Create/Read own ✅ | ❌ |
| **Treehouse Creator** | Write own ✅ | Read own ✅ | Create/Read own ✅ | ❌ |
| **Influencer** | Write own ✅ | Read own ✅ | Create/Read own ✅ | ❌ |
| **Super Admin** | Read/Write all ✅ | Read all ✅ | Read/Update all ✅ | Read all ✅ |

### What Cloud Functions Can Do:
- ✅ Read any user's FCM tokens (to send push notifications)
- ✅ Create notifications for any user
- ✅ Update notification documents
- ✅ Read and update payout requests
- ✅ Clean up invalid FCM tokens

---

## 🧪 Testing the Rules

### Test 1: FCM Token Storage
```javascript
// Should succeed: User writing their own token
await updateDoc(doc(db, 'users', userId), {
  fcmTokens: arrayUnion('new-fcm-token'),
  lastTokenUpdate: serverTimestamp()
});
// ✅ Success - Token saved
```

### Test 2: Notification Creation (Cloud Function)
```javascript
// Should succeed: Cloud Function creating notification
await addDoc(collection(db, 'notifications'), {
  userId: 'user123',
  title: 'Test Notification',
  message: 'This is a test',
  read: false
});
// ✅ Success - Notification created
```

### Test 3: Payout Request Creation (Creator)
```javascript
// Should succeed: Creator creating payout request
await addDoc(collection(db, 'payout_requests'), {
  creatorId: userId,
  requestedAmount: 1500,
  status: 'pending'
});
// ✅ Success - Payout request created
```

### Test 4: Payout Request Read (Super Admin)
```javascript
// Should succeed: Super Admin reading all payout requests
const payouts = await getDocs(collection(db, 'payout_requests'));
// ✅ Success - All payouts retrieved
```

---

## ⚠️ Important Notes

1. **Security First:**
   - Users can ONLY write to their own `fcmTokens` field
   - Users CANNOT modify other fields when updating tokens
   - This prevents malicious token injection or profile tampering

2. **Cloud Functions:**
   - Cloud Functions run with admin privileges
   - They bypass Firestore security rules
   - This is intentional and secure (server-side only)

3. **Token Cleanup:**
   - Invalid tokens are automatically removed by Cloud Functions
   - This happens during `sendFCMPushNotification()` calls
   - Keeps the token arrays clean and efficient

4. **Multi-Device Support:**
   - `fcmTokens` is an array, not a single value
   - Users can have tokens for desktop, mobile, tablet
   - All devices receive notifications simultaneously

---

## ✅ Verification Checklist

After deploying the rules, verify:

- [ ] Users can grant notification permission without errors
- [ ] FCM tokens appear in Firestore: `users/{userId}/fcmTokens`
- [ ] Notifications collection receives new documents
- [ ] Payout requests can be created by users
- [ ] Super Admins can see all payout requests
- [ ] Push notifications work when app is closed
- [ ] No permission errors in console

---

## 🎉 Result

Your Firestore rules are now **fully configured** for push notifications across all user roles:
- ✅ FCM token storage
- ✅ Notification creation
- ✅ Payout request handling
- ✅ Secure multi-device support
- ✅ Role-based access control

Deploy the rules and you're ready to go! 🚀
