# Migration: Set useGenericWorkflow for Apothecary

## Date
January 17, 2026

## Purpose
Set `useGenericWorkflow: true` for the Apothecary dispensary type to enable the dynamic category structure system while keeping all other wellness types on their existing custom pages.

## Firestore Updates

### 1. Update Apothecary in dispensaryTypes collection

Find the document where `name === "Apothecary"` and update:

```javascript
// In Firebase Console or Admin SDK
db.collection('dispensaryTypes')
  .where('name', '==', 'Apothecary')
  .get()
  .then(snapshot => {
    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      return db.collection('dispensaryTypes').doc(docId).update({
        useGenericWorkflow: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  });
```

### 2. Analyze Apothecary Category Structure

Run the Cloud Function to analyze and store category structure metadata:

```javascript
// In admin dashboard or developer console
const analyzeFn = httpsCallable(functions, 'analyzeCategoryStructureAndUpdate');

const result = await analyzeFn({
  dispensaryTypeName: 'Apothecary'
});

console.log('Analysis Result:', result.data);
// Should show:
// {
//   success: true,
//   message: "Successfully analyzed and updated category structure for Apothecary",
//   metadata: {
//     depth: 2,
//     navigationPath: ["homeopathicProducts", "homeopathicProducts"],
//     levels: [...],
//     sampleCategories: [...]
//   }
// }
```

### 3. Verify All Other Types Have useGenericWorkflow: false (or undefined)

Query all dispensary types and confirm:

```javascript
// In Firebase Console
db.collection('dispensaryTypes').get().then(snapshot => {
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(data.name, '→ useGenericWorkflow:', data.useGenericWorkflow);
  });
});

// Expected output:
// Homeopathic store → useGenericWorkflow: undefined (or false)
// Traditional Medicine → useGenericWorkflow: undefined (or false)
// Mushroom → useGenericWorkflow: undefined (or false)
// Permaculture → useGenericWorkflow: undefined (or false)
// THC → useGenericWorkflow: undefined (or false)
// Apothecary → useGenericWorkflow: true ← Only this one should be true
```

## Safety Mechanisms

The system has multiple safety layers:

### Layer 1: Default Behavior
- `useGenericWorkflow` defaults to `false` if not set
- Existing types continue working with custom pages

### Layer 2: Forced Custom Workflow List
In [productWorkflowRouter.ts](../src/lib/productWorkflowRouter.ts):

```typescript
const FORCE_CUSTOM_WORKFLOW: string[] = [
  'Homeopathic store',
  'Traditional Medicine',
  'Mushroom',
  'Permaculture',
  'THC'
];
```

Even if someone accidentally sets `useGenericWorkflow: true` on these types, they will still use custom pages.

### Layer 3: Approved Generic Workflow List
```typescript
export const GENERIC_WORKFLOW_TYPES = new Set<string>([
  'Apothecary'
]);
```

Only explicitly approved types can use the generic workflow.

## Testing Checklist

### ✅ Test Existing Types (Should NOT change)
- [ ] Navigate to `/dispensary-admin/products/add/homeopathy_store`
- [ ] Verify it still uses `EditHomeopathyProductPage` (custom page)
- [ ] Add a test product
- [ ] Edit the test product
- [ ] Verify no errors or changes in behavior

Repeat for:
- [ ] Traditional Medicine
- [ ] Mushroom
- [ ] Permaculture
- [ ] THC

### ✅ Test Apothecary (Should use new workflow)
- [ ] Navigate to `/dispensary-admin/products/add/apothecary`
- [ ] Verify it uses `GenericProductAddPage` (dynamic page)
- [ ] Verify categories load from `categoryStructure` metadata
- [ ] Add a test product with images and pool settings
- [ ] Navigate to edit page
- [ ] Verify edit uses `GenericProductEditPage`
- [ ] Edit the product and save
- [ ] Verify changes persist

## Rollback Plan

If issues occur with Apothecary:

### Option 1: Disable Generic Workflow
```javascript
db.collection('dispensaryTypes')
  .where('name', '==', 'Apothecary')
  .get()
  .then(snapshot => {
    const docId = snapshot.docs[0].id;
    return db.collection('dispensaryTypes').doc(docId).update({
      useGenericWorkflow: false
    });
  });
```

This will make Apothecary fall back to custom pages (which don't exist yet, so you'd need to create them).

### Option 2: Keep Generic Workflow, Fix Issues
- Debug the generic components
- Check category structure metadata
- Verify routing logic

## Future Migrations

To migrate an existing type to generic workflow:

1. **Analyze Structure**:
   ```javascript
   await analyzeFn({ dispensaryTypeName: 'Traditional Medicine' });
   ```

2. **Test Thoroughly**:
   - Test add page
   - Test edit page
   - Test with multiple dispensaries
   - Test edge cases (no images, no subcategories, etc.)

3. **Update Flag**:
   ```javascript
   db.collection('dispensaryTypes')
     .where('name', '==', 'Traditional Medicine')
     .get()
     .then(snapshot => {
       const docId = snapshot.docs[0].id;
       return db.collection('dispensaryTypes').doc(docId).update({
         useGenericWorkflow: true
       });
     });
   ```

4. **Add to Approved List**:
   ```typescript
   // In productWorkflowRouter.ts
   export const GENERIC_WORKFLOW_TYPES = new Set<string>([
     'Apothecary',
     'Traditional Medicine'  // ← Add here
   ]);
   ```

5. **Remove from Force Custom List** (if present):
   ```typescript
   const FORCE_CUSTOM_WORKFLOW: string[] = [
     'Homeopathic store',
     // 'Traditional Medicine',  ← Remove this line
     'Mushroom',
     'Permaculture',
     'THC'
   ];
   ```

## Monitoring

After deployment, monitor:

- [ ] Error logs for Apothecary product creation
- [ ] User feedback from Apothecary dispensary admins
- [ ] Performance metrics (page load times)
- [ ] Category structure queries

## Success Criteria

- ✅ All existing wellness types work exactly as before
- ✅ Apothecary uses generic workflow successfully
- ✅ No errors in console or logs
- ✅ Products can be added, edited, and deleted in Apothecary
- ✅ Images upload correctly
- ✅ Pool settings save correctly
- ✅ Categories render correctly from metadata

## Timeline

- **Day 1**: Deploy code changes (types, router, documentation)
- **Day 2**: Update Apothecary dispensaryType document
- **Day 3**: Run analyzeCategoryStructureAndUpdate function
- **Day 4**: Test thoroughly with staging data
- **Day 5**: Deploy to production
- **Week 2**: Monitor and gather feedback
- **Month 2+**: Consider migrating other types if successful
