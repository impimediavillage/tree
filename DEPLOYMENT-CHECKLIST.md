# AI Advisors Migration - Deployment Checklist

## ✅ Completed Implementation

All 12 steps of the AI Advisors migration have been completed successfully!

### What Was Built

1. **Type Definitions** ✅
   - `src/types/index.ts` - AIAdvisor interface with systemPrompt, model, pricing
   - `functions/src/types.ts` - Backend types mirroring frontend

2. **Super Admin Dashboard** ✅
   - `/admin/dashboard/ai-advisors` - List all advisors with toggle/edit/delete
   - `/admin/dashboard/ai-advisors/create` - Create new advisor form
   - `/admin/dashboard/ai-advisors/edit/[id]` - Edit existing advisor
   - Image upload to Firebase Storage
   - 29 Lucide icons to choose from
   - System prompt textarea (supports 200-500 word prompts)

3. **Dispensary Integration** ✅
   - `DispensaryTypeDialog.tsx` - Multi-select advisors per dispensary type
   - `recommendedAdvisorIds` field added to DispensaryType

4. **Firebase Function** ✅
   - `chatWithAdvisor` - Callable function in `functions/src/index.ts`
   - Integrates with OpenAI ChatGPT API
   - Fetches advisor configuration from Firestore
   - Calculates hybrid pricing (base + per-token)
   - Deducts credits via Firestore transaction
   - Logs interactions to `aiInteractionsLog`

5. **Public Chat Interface** ✅
   - `/advisors/[slug]` - Individual advisor chat page
   - `AdvisorChatInterface.tsx` - Real-time chat component
   - Conversation history (last 10 messages sent to API)
   - Credit estimation before sending
   - Loading states and error handling
   - Auto-scroll to new messages

6. **Homepage Updates** ✅
   - Dynamic advisor cards fetched from Firestore
   - Icon mapping for 30+ Lucide icons
   - Loading and empty states

7. **Data Seeding** ✅
   - `scripts/seed-advisors.ts` - Seeds 9 advisors with:
     - Detailed system prompts (100-400 words each)
     - Correct image paths
     - Tier-based pricing
     - Model assignments

8. **Documentation** ✅
   - `docs/ai-advisors-system.md` - Comprehensive guide covering:
     - Architecture and database structure
     - Credit system explanation
     - OpenAI model comparison
     - Setup instructions
     - System prompt templates
     - Chat flow diagram
     - Error handling
     - Troubleshooting guide

---

## 🚀 Deployment Steps

### 1. Prerequisites
- OpenAI API key from https://platform.openai.com/api-keys
- Firebase project configured
- Firebase CLI installed (`npm install -g firebase-tools`)
- Logged in to Firebase (`firebase login`)

### 2. Set OpenAI Secret
```bash
firebase functions:secrets:set OPENAI_API_KEY
```
When prompted, paste your OpenAI API key.

**Verify it was set:**
```bash
firebase functions:secrets:access OPENAI_API_KEY
```

### 3. Install Dependencies
```bash
# Root project dependencies
npm install

# Firebase Functions dependencies
cd functions
npm install openai  # If not already installed
cd ..
```

### 4. Seed Advisor Data
```bash
npx ts-node scripts/seed-advisors.ts
```

**Expected output:**
```
Seeding AI Advisors...
✅ Added: Cannabinoid Advisor (cannabinoid-advisor)
✅ Added: The Conscious Gardener (conscious-gardener)
✅ Added: Homeopathic Advisor (homeopathic-advisor)
✅ Added: Mushroom Funguy (mushroom-funguy)
✅ Added: Traditional Medicine Advisor (traditional-medicine)
✅ Added: Qigong Master (qigong-master)
✅ Added: Flower Power (flower-power)
✅ Added: Aromatherapy Expert (aromatherapy)
✅ Added: Vegan Food Guru (vegan-food-guru)
✓ Seeding complete! 9 advisors added.
```

### 5. Deploy Firebase Functions
```bash
firebase deploy --only functions
```

**Expected deploy:**
- `chatWithAdvisor` function (new)
- Existing functions remain unchanged

**Important:** The function uses the `OPENAI_API_KEY` secret, so ensure it's set before deploying.

### 6. Verify Homepage
1. Visit your app's homepage (`/`)
2. Should see 9 advisor cards loaded from Firestore
3. Each card should display:
   - Name
   - Icon (rendered from Lucide)
   - Short description
   - "Get Advice" button

### 7. Test Admin Dashboard
1. Sign in as Super Admin
2. Visit `/admin/dashboard/ai-advisors`
3. Verify all 9 advisors appear
4. Test toggling active/inactive status
5. Test editing an advisor (change description, upload new image)
6. Test creating a new advisor

### 8. Test Chat Flow
1. Visit homepage as regular user
2. Click "Get Advice" on any advisor
3. Should redirect to `/advisors/[slug]`
4. Verify advisor info displays correctly
5. Send a test message:
   - Should see "Thinking..." loading state
   - Should receive AI response
   - Should see credits deducted
   - Check credit balance updates in UI

### 9. Verify Credit Deduction
Check Firestore console:
- `users/{userId}` - Credits field should decrease
- `aiInteractionsLog` - New entry with:
  - userId, advisorSlug, creditsDeducted
  - tokensUsed, model, timestamp

---

## 🔍 Testing Checklist

### Functional Tests
- [ ] Homepage loads advisor cards from Firestore
- [ ] Advisor icons render correctly (Lucide icons)
- [ ] Clicking "Get Advice" navigates to chat page
- [ ] Chat page displays advisor details
- [ ] User can send messages (authenticated)
- [ ] AI responds with relevant advice
- [ ] Credits deduct after each message
- [ ] Conversation history maintained (last 10 messages)
- [ ] "Clear" button resets conversation
- [ ] Insufficient credits shows warning
- [ ] Unauthenticated users see sign-in prompt

### Admin Tests
- [ ] AI Advisors nav item appears in sidebar
- [ ] List page shows all advisors
- [ ] Toggle active/inactive works
- [ ] Create form validates required fields
- [ ] Image upload to Firebase Storage works
- [ ] System prompt textarea supports long text
- [ ] Edit form pre-populates advisor data
- [ ] Delete confirmation dialog works
- [ ] Dispensary Type dialog shows advisor checkboxes
- [ ] Linking advisors to dispensary types saves correctly

### Edge Cases
- [ ] Message > 5000 characters shows error
- [ ] User with 0 credits cannot send messages
- [ ] Inactive advisors don't appear on homepage
- [ ] Invalid advisor slug shows 404
- [ ] OpenAI API error shows user-friendly message
- [ ] Network errors handled gracefully
- [ ] Concurrent messages handled (transaction locks)

---

## 📊 Monitoring

### Firebase Console
1. **Firestore**
   - `aiAdvisors` collection (9 documents)
   - `aiInteractionsLog` collection (grows with usage)
   - `users/{userId}` credits field

2. **Functions Logs**
   ```bash
   firebase functions:log --only chatWithAdvisor
   ```

3. **Storage**
   - `ai-advisors/` folder with advisor images

### OpenAI Dashboard
- Monitor token usage at https://platform.openai.com/usage
- Set billing alerts to prevent overages
- Review API logs for errors

---

## 🐛 Common Issues & Solutions

### Issue: "Advisor not found"
**Solution:** Run seeding script to populate Firestore.

### Issue: "OPENAI_API_KEY not set"
**Solution:** 
```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions
```

### Issue: "Insufficient credits"
**Solution:** User needs to purchase credits. Direct to `/pricing` page.

### Issue: Icons not rendering
**Solution:** Check `iconName` field matches Lucide icon names exactly (e.g., "Leaf", "Brain").

### Issue: Images not displaying
**Solution:** 
- Verify image URLs in Firestore
- Check Firebase Storage rules allow public read
- Test image URLs directly in browser

### Issue: Chat not responding
**Solution:**
1. Check browser console for errors
2. Verify function deployed: `firebase functions:list`
3. Check OpenAI API status
4. Review function logs: `firebase functions:log`

---

## 🎉 Success Criteria

Your migration is complete when:
1. ✅ Homepage displays 9 dynamic advisor cards
2. ✅ Admin can create/edit/delete advisors
3. ✅ Users can chat with advisors
4. ✅ Credits deduct correctly
5. ✅ Interactions logged to Firestore
6. ✅ OpenAI API integrated successfully
7. ✅ All tests pass
8. ✅ Documentation complete

---

## 📝 Next Steps (Optional Enhancements)

Once core system is stable, consider:
1. Add conversation history persistence (save to Firestore)
2. Implement streaming responses (SSE)
3. Add advisor rating system
4. Build analytics dashboard (most popular advisors, avg tokens, etc.)
5. Multi-language system prompts
6. Voice input/output
7. Export conversation transcripts
8. A/B test different system prompts
9. Rate limiting per user
10. Admin approval workflow for new advisors

---

## 🔗 Quick Links

- **Admin Dashboard:** `/admin/dashboard/ai-advisors`
- **Homepage:** `/`
- **Example Advisor:** `/advisors/cannabinoid-advisor`
- **Documentation:** `docs/ai-advisors-system.md`
- **Seeding Script:** `scripts/seed-advisors.ts`
- **Firebase Console:** https://console.firebase.google.com/
- **OpenAI Dashboard:** https://platform.openai.com/

---

## 📞 Support

If you encounter issues during deployment:
1. Check this checklist first
2. Review `docs/ai-advisors-system.md` for detailed troubleshooting
3. Check Firebase Functions logs
4. Test OpenAI API key independently
5. Contact system administrator

**Congratulations on completing the AI Advisors migration!** 🎊
