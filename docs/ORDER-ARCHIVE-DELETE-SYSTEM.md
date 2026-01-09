# Order Archive & Delete System

## Overview
Dispensary owners can now archive and delete orders to keep their order dashboards current and organized. This system provides both soft-delete (archive) and hard-delete (permanent deletion) functionality.

## Features

### 1. Archive Orders
- **Soft Delete**: Hides orders from active view while preserving all data
- **Reversible**: Archived orders can be restored to active view
- **Tracking**: Records who archived the order and when
- **Use Case**: Hide completed orders, old test orders, or seasonal orders

### 2. Delete Orders
- **Hard Delete**: Permanently removes order from database
- **Confirmation**: Shows confirmation dialog to prevent accidental deletions
- **Irreversible**: Cannot be undone once confirmed
- **Use Case**: Remove duplicate orders, invalid test data, or spam orders

### 3. View Toggle
- **Active View** (Default): Shows all non-archived orders
- **Archived View**: Shows only archived orders
- **Button**: Toggle between views with Archive button in page header
- **Real-time Updates**: Order list automatically refreshes when toggling views

## Implementation Details

### Database Schema
Added to `Order` interface in `src/types/order.ts`:
```typescript
archived?: boolean;           // Flag indicating archived status
archivedAt?: Timestamp;       // When order was archived
archivedBy?: string;          // User ID who archived
unarchivedAt?: Timestamp;     // When order was last restored
```

### Backend Functions
Located in `src/app/dispensary-admin/orders/page.tsx`:

#### handleArchiveOrder(orderId: string)
- Updates order document with `archived: true`
- Records `archivedAt` timestamp
- Records `archivedBy` user ID
- Shows success toast notification
- Closes dialog if the selected order was archived

#### handleUnarchiveOrder(orderId: string)
- Updates order document with `archived: false`
- Records `unarchivedAt` timestamp
- Shows success toast notification
- Closes dialog if the selected order was restored

#### handleDeleteOrder(orderId: string)
- Shows confirmation dialog ("Are you sure...")
- Permanently deletes order document using `deleteDoc()`
- Shows success/error toast notification
- Closes dialog if the selected order was deleted
- Shows loading state during deletion

### UI Components

#### Archive Toggle Button
Located in page header (CardHeader section):
- **Active Mode**: Shows "Show Archived" with outline variant
- **Archived Mode**: Shows "Show Active" with default (filled) variant
- **Icon**: Archive icon from lucide-react
- **Mobile Responsive**: Text truncates on small screens
- **Styling**: Bold font, matches app design system

#### OrderDetailDialog Actions
Located in dialog header (top-right corner):
- **Active Orders**: Shows "Archive" button
- **Archived Orders**: Shows "Restore" and "Delete" buttons
- **Loading State**: Buttons disabled during processing
- **Hover Effects**: 
  - Archive: Amber hover color
  - Restore: Green hover color
  - Delete: Destructive red color
- **Mobile Responsive**: Text hidden on small screens, icons only

### Query Filtering
Located in `useEffect` real-time listener:
```typescript
.filter(doc => {
  const data = doc.data();
  if (showArchived) {
    return data.archived === true;
  }
  return !data.archived;
})
```

### State Management
```typescript
const [showArchived, setShowArchived] = useState(false);  // View toggle
const [isDeletingOrder, setIsDeletingOrder] = useState<string | null>(null);  // Loading state
```

## User Flow

### Archive an Order
1. Open order details by clicking on order card
2. Click "Archive" button in dialog header
3. Order is immediately archived and removed from active view
4. Toast notification confirms "Order Archived"
5. Toggle to "Show Archived" to view archived orders

### Restore an Archived Order
1. Click "Show Archived" button to view archived orders
2. Open archived order details
3. Click "Restore" button in dialog header
4. Order is restored to active view
5. Toast notification confirms "Order Restored"

### Delete an Order
1. Click "Show Archived" to view archived orders
2. Open archived order details
3. Click "Delete" button in dialog header
4. Confirm deletion in popup dialog
5. Order is permanently removed
6. Toast notification confirms "Order Deleted"

**Note**: Active orders can only be archived, not deleted. Must archive first, then delete from archived view.

## Security Considerations

### Permissions
- **Dispensary Owners**: Full access to archive, restore, and delete orders
- **Dispensary Staff**: Filtered view (only their dispensary's orders)
- **Audit Trail**: All archive actions tracked with user ID and timestamp

### Data Integrity
- **Real-time Sync**: Firestore onSnapshot listener automatically updates UI
- **Error Handling**: All operations wrapped in try-catch with user feedback
- **Confirmation**: Delete requires explicit user confirmation
- **Loading States**: Prevents duplicate actions during processing

### Best Practices
- **Archive First**: Always archive before deleting (safety measure)
- **Regular Cleanup**: Periodically review archived orders
- **Backup**: Ensure Firestore backups are enabled before mass deletions
- **Test Data**: Use archive/delete to clean up test orders

## Technical Notes

### Files Modified
1. `src/app/dispensary-admin/orders/page.tsx` (100+ lines added)
   - Added imports: `deleteDoc`, `Archive`, `Trash2`
   - Added state: `showArchived`, `isDeletingOrder`
   - Added handlers: `handleArchiveOrder`, `handleUnarchiveOrder`, `handleDeleteOrder`
   - Updated query filter to check archived field
   - Added Archive toggle button UI
   - Passed handlers to OrderDetailDialog

2. `src/components/orders/OrderDetailDialog.tsx` (60+ lines added)
   - Added imports: `Trash2`, `ArchiveRestore`
   - Updated interface: Added `onArchive`, `onUnarchive`, `onDelete` props
   - Added local handlers: `handleArchive`, `handleUnarchive`, `handleDelete`
   - Added `isProcessing` state
   - Added action buttons in dialog header

3. `src/types/order.ts` (5 lines added)
   - Added `archived` field
   - Added `archivedAt` field
   - Added `archivedBy` field
   - Added `unarchivedAt` field

### Dependencies
- `firebase/firestore`: `deleteDoc` for permanent deletion
- `lucide-react`: `Archive`, `Trash2`, `ArchiveRestore` icons
- Existing toast system for user feedback
- Existing real-time listener infrastructure

### Performance
- **Query Filtering**: Client-side filtering (orders already fetched)
- **Real-time Updates**: Firestore listener automatically refreshes view
- **State Management**: Minimal re-renders, only on state changes
- **Loading States**: Prevents UI blocking during operations

## Future Enhancements
- [ ] Bulk archive/delete operations
- [ ] Auto-archive orders after X days
- [ ] Archive reasons/notes
- [ ] Restore from trash within 30 days (soft-delete buffer)
- [ ] Export archived orders to CSV
- [ ] Archive analytics (most archived status, time periods)
- [ ] Role-based restrictions (limit delete to super admin only)

## Testing Checklist
- [x] Archive active order
- [x] Restore archived order
- [x] Delete archived order
- [x] Toggle between active/archived views
- [x] Confirmation dialog for delete
- [x] Toast notifications for all operations
- [x] Loading states during processing
- [x] Mobile responsive layout
- [x] TypeScript type safety
- [x] Real-time updates
- [x] Error handling

## Deployment Notes
- No database migrations required (fields are optional)
- No breaking changes to existing orders
- Backward compatible (orders without archived field treated as active)
- Can deploy immediately without data preparation

---

**Implementation Date**: Current Session (Phase 31)
**Status**: ✅ Complete and Ready for Testing
