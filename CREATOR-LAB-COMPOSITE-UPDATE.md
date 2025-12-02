# Creator Lab: Composite Image Generation Update

## What Changed

**Before:**
- DALL-E call 1: Logo only → 10 credits
- DALL-E call 2: Apparel mockup → 10 credits
- **Total: 20 credits per design**

**After:**
- DALL-E call: Logo only → 10 credits
- Local composite: Overlay logo on real apparel photo → 0 credits
- **Total: 10 credits per design (50% savings!)**

## Benefits

✅ **50% cheaper** - Users save 10 credits per design  
✅ **Perfect consistency** - Uses actual product photos  
✅ **Precise positioning** - Exact logo placement every time  
✅ **Faster generation** - No second DALL-E call  
✅ **Better quality** - Real apparel photos vs AI-generated  

## Implementation

### 1. New Dependencies
- Added `sharp` library for image compositing

### 2. Logo Positioning Map
Configured precise positions for each combination:
- Cap: front only (circular/rectangular)
- Beanie: front only (circular/rectangular)
- T-Shirt: front/back (circular/rectangular)
- Long Sleeve: front/back (circular/rectangular)
- Hoodie: front/back (circular/rectangular)

### 3. Apparel Templates
Black apparel photos stored in Firebase Storage at:
`apparel-templates/[filename].jpg`

### 4. Generation Flow
1. User describes design → DALL-E generates logo (10 credits)
2. Download logo from DALL-E
3. Load appropriate black apparel template from Storage
4. Use `sharp` to overlay logo at configured position
5. Save composite mockup
6. Return both: `logoImageUrl` (for printing) + `designImageUrl` (for display)

## Deployment Steps

### Step 1: Install Dependencies
```bash
cd functions
npm install sharp
npm run build
```

### Step 2: Upload Apparel Templates
```bash
npx tsx scripts/upload-apparel-templates.ts
```

This uploads all 8 apparel photos from `public/images/apparel/` to Firebase Storage under `apparel-templates/`.

### Step 3: Deploy Functions
```bash
firebase deploy --only functions:generateCreatorDesign,functions:publishCreatorProduct
```

### Step 4: Deploy Client
Standard Next.js deployment (UI already updated).

## Logo Position Configuration

Located in `functions/src/creator-lab.ts`:

```typescript
const LOGO_POSITIONS: Record<string, LogoPosition> = {
  'Cap-front-circular': { x: 350, y: 250, width: 300, height: 300 },
  'Cap-front-rectangular': { x: 325, y: 250, width: 350, height: 280 },
  // ... etc
}
```

**Note:** These positions are estimates and may need fine-tuning after testing with actual apparel photos.

## Testing Checklist

- [ ] Generate design for Cap (circular badge)
- [ ] Generate design for Cap (rectangular badge)
- [ ] Generate design for Beanie (circular badge)
- [ ] Generate design for Beanie (rectangular badge)
- [ ] Generate design for T-Shirt front (circular)
- [ ] Generate design for T-Shirt front (rectangular)
- [ ] Generate design for T-Shirt back (circular)
- [ ] Generate design for T-Shirt back (rectangular)
- [ ] Generate design for Long Sleeve front
- [ ] Generate design for Long Sleeve back
- [ ] Generate design for Hoodie front
- [ ] Generate design for Hoodie back
- [ ] Verify logo positioning is centered and properly sized
- [ ] Verify 10 credits deducted (not 20)
- [ ] Verify both images display in UI (logo + mockup)
- [ ] Verify model showcase still works (10 credits)

## Adjusting Logo Positions

If logos appear off-center or wrong size:

1. Open `functions/src/creator-lab.ts`
2. Find the `LOGO_POSITIONS` object
3. Adjust `x`, `y`, `width`, `height` values
4. Redeploy functions

**Tip:** Use image editing software to measure pixel positions on actual apparel photos.

## Files Modified

### Functions
- `functions/package.json` - Added sharp dependency
- `functions/src/creator-lab.ts` - Complete rewrite of generation logic

### Client
- `src/components/creator-lab/DesignStudioModal.tsx` - Updated credit display (10 instead of 20)

### Scripts
- `scripts/upload-apparel-templates.ts` - New upload script

### Types
- `src/types/creator-lab.ts` - Already had `logoImageUrl` field

## Cost Comparison

| Action | Before | After | Savings |
|--------|--------|-------|---------|
| Design Generation | 20 credits | 10 credits | **50%** |
| Model Showcase | 10 credits | 10 credits | 0% |
| **Full Workflow** | **30 credits** | **20 credits** | **33%** |

## Future Enhancements

- Add logo rotation support for different angles
- Support multiple logo placements (front + back combo)
- Add preview mode to test positions without generating
- Allow users to adjust logo size/position before final composite
