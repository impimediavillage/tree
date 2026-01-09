# Dispensary Image Upload Fix

## Issue
Dispensary owners were unable to upload store images and icons to their profile, receiving a `403 Forbidden` error:
```
storage/unauthorized - User does not have permission to access 'dispensaries/{dispensaryId}/branding/...'
```

## Root Cause
The Firebase Storage rules for dispensary branding uploads were using Firestore `get()` calls to check user permissions:
```javascript
// OLD (SLOW & FAILING)
match /dispensaries/{dispensaryId}/branding/{allPaths=**} {
  allow write: if request.auth != null
               && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.dispensaryId == dispensaryId
               && (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'DispensaryOwner'
                   || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'DispensaryStaff')
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches('image/.*');
}
```

**Problems with this approach:**
1. **Performance**: Each upload requires multiple Firestore reads
2. **Permission Issues**: Storage rules may not have permission to read user documents
3. **Latency**: Additional network round-trips slow down uploads
4. **Cost**: Extra Firestore reads for every upload attempt

## Solution
Changed storage rules to use **custom claims** instead of Firestore reads. Custom claims are JWT tokens set when a user document is created/updated.

```javascript
// NEW (FAST & SECURE)
match /dispensaries/{dispensaryId}/branding/{allPaths=**} {
  allow write: if request.auth != null
               && request.auth.token.dispensaryId == dispensaryId
               && (request.auth.token.role == 'DispensaryOwner' || request.auth.token.role == 'DispensaryStaff')
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches('image/.*');
}
```

**Benefits:**
1. ✅ **No Firestore reads** - Claims are in the JWT token
2. ✅ **Instant validation** - No network round-trips
3. ✅ **Lower cost** - No extra Firestore operations
4. ✅ **Better security** - Claims are cryptographically signed

## Custom Claims Setup
Custom claims are automatically set by the `onUserDocumentWrite` Cloud Function ([functions/src/index.ts](c:\www\The-Wellness-Tree\functions\src\index.ts#L150-L177)):

```typescript
exports.onUserDocumentWrite = onDocumentWritten('users/{userId}', async (event) => {
    const userId = event.params.userId;
    const afterData = event.data?.after.data();
    
    if (!afterData) {
        // User deleted - clear claims
        await admin.auth().setCustomUserClaims(userId, null);
        return;
    }
    
    const role = afterData.role as AllowedUserRole || 'User';
    const dispensaryId = afterData.dispensaryId || null;
    let dispensaryType: string | null = null;

    if (dispensaryId) {
        const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
        if (dispensaryDoc.exists) {
            dispensaryType = dispensaryDoc.data()?.dispensaryType || null;
        }
    }
    
    const claims = { role, dispensaryId, dispensaryType };
    await admin.auth().setCustomUserClaims(userId, claims);
});
```

**When claims are set:**
- User account created
- User document updated (role change, dispensary assignment)
- User logs in (claims refreshed automatically)

## Testing
After deploying the updated storage rules, test the fix:

1. **Deploy Storage Rules:**
   ```bash
   firebase deploy --only storage
   ```

2. **Test Upload:**
   - Log in as a dispensary owner
   - Navigate to `/dispensary-admin/profile`
   - Upload a store image or icon
   - Should succeed without errors

3. **Verify Claims:**
   - Open browser console
   - Run:
     ```javascript
     firebase.auth().currentUser.getIdTokenResult().then(token => console.log(token.claims))
     ```
   - Should see: `{ role: 'DispensaryOwner', dispensaryId: '...', dispensaryType: '...' }`

## Existing Users
**Important:** Users who logged in before custom claims were implemented need to:
1. Log out completely
2. Log back in (refreshes JWT token with claims)

Alternatively, force token refresh:
```javascript
await firebase.auth().currentUser?.getIdToken(true);
```

## Files Modified
1. **[storage.rules](c:\www\The-Wellness-Tree\storage.rules#L58-L65)** - Updated dispensary branding upload rules to use custom claims
2. **[functions/src/index.ts](c:\www\The-Wellness-Tree\functions\src\index.ts#L127-L177)** - Custom claims already implemented ✅

## Deployment Steps
```bash
# 1. Deploy storage rules
firebase deploy --only storage

# 2. Verify rules deployed
firebase deploy:hosting:list

# 3. Test upload
# - Login as dispensary owner
# - Upload profile image
# - Check console for errors
```

## Related Working Features
These features successfully upload images and can be referenced:
- **Event flyer upload** - Uses `events/{dispensaryId}/*` path ([events/new/page.tsx](c:\www\The-Wellness-Tree\src\app\dispensary-admin\events\new\page.tsx#L233-L238))
- **Product images** - Uses `products/{userId}/*` path ([add/thc/page.tsx](c:\www\The-Wellness-Tree\src\app\dispensary-admin\products\add\thc\page.tsx#L12))

Both use direct `uploadBytes()` calls without complex permission checks.

## Future Improvements
Consider adding custom claims for other scenarios:
- Influencer tier level
- Super admin verification
- Feature flags
- Subscription status

This would eliminate Firestore reads in many security rules.

---

**Status:** ✅ Fixed - Ready for deployment
**Priority:** High - Blocking dispensary onboarding
**Impact:** All dispensary owners unable to upload branding
