# AI Advisors System - OpenAI Integration

## Overview

The Wellness Tree uses a dynamic AI advisor system powered by OpenAI's ChatGPT models. All advisors are stored in Firestore and configured through a Super Admin dashboard.

## Architecture

### Database Structure

**Collection: `aiAdvisors`**
```typescript
{
  id: string;
  name: string;                    // Display name
  slug: string;                    // URL-friendly identifier
  shortDescription: string;        // Brief tagline
  longDescription: string;         // Detailed description
  systemPrompt: string;           // OpenAI system message
  model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  tier: 'basic' | 'standard' | 'premium';
  creditCostBase: number;         // Minimum credits per interaction
  creditCostPerTokens: number;    // Cost multiplier per token
  iconName: string;               // Lucide icon name
  imageUrl: string;               // Profile image URL
  order: number;                  // Display order
  isActive: boolean;              // Visibility toggle
  tags: string[];                 // Category tags
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Credit System

The hybrid pricing model combines base costs with token-based scaling:

```typescript
totalCredits = creditCostBase + (tokensUsed * creditCostPerTokens)
```

**Example Pricing Tiers:**
- **Basic** (gpt-3.5-turbo): 3-4 base credits + 0.0001 per token
- **Standard** (gpt-4-turbo): 5-6 base credits + 0.0002 per token
- **Premium** (gpt-4): 7-8 base credits + 0.0003 per token

### OpenAI Models

- **gpt-3.5-turbo**: Fastest, most cost-effective. Best for basic advisors with straightforward queries.
- **gpt-4-turbo**: Balanced performance and cost. Recommended for most advisors.
- **gpt-4**: Highest quality, most expensive. Use for premium advisors requiring deep expertise.

## Setup Instructions

### 1. Set OpenAI API Key

```bash
# Set the secret in Firebase Functions
firebase functions:secrets:set OPENAI_API_KEY

# When prompted, paste your OpenAI API key from https://platform.openai.com/api-keys
```

### 2. Seed Initial Advisors

```bash
# Run the seeding script to populate Firestore
npx ts-node scripts/seed-advisors.ts
```

This creates 9 advisors:
1. **Cannabinoid Advisor** - THC & CBD expertise
2. **The Conscious Gardener** - Organic permaculture
3. **Homeopathic Advisor** - Classical homeopathy
4. **Mushroom Funguy** - Medicinal & sacred mushrooms
5. **Traditional Medicine Advisor** - African healing traditions
6. **Qigong Master** - Energy cultivation practices
7. **Flower Power** - Garden design & Bach remedies
8. **Aromatherapy Expert** - Essential oils & blending
9. **Vegan Food Guru** - Plant-based nutrition

### 3. Deploy Functions

```bash
# Deploy all Firebase Functions (including chatWithAdvisor)
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:chatWithAdvisor
```

### 4. Verify Setup

1. Visit `/admin/dashboard/ai-advisors` to view advisors
2. Test creating/editing an advisor
3. Visit homepage to see advisor cards
4. Click an advisor to test the chat interface

## System Prompts

Each advisor has a detailed system prompt that defines:
- Expertise area and knowledge scope
- Communication style and personality
- Safety guidelines and disclaimers
- Response structure preferences

**Example System Prompt Template:**
```
You are [ROLE] with deep knowledge of [DOMAIN].

Your expertise includes:
- [Specialty 1]
- [Specialty 2]
- [Specialty 3]

When providing advice:
1. [Guideline 1]
2. [Guideline 2]
3. [Guideline 3]

Important disclaimers:
- [Legal/safety disclaimer]
- [Scope limitation]

Always maintain a [TONE] tone and provide [DEPTH] explanations.
```

## Chat Flow

### Client Side
1. User types message in `AdvisorChatInterface.tsx`
2. Component estimates cost based on message length
3. Checks user has sufficient credits
4. Calls Firebase `chatWithAdvisor` function with:
   - `advisorSlug`: Advisor identifier
   - `userMessage`: Current user input
   - `conversationHistory`: Last 10 messages for context

### Firebase Function
1. `chatWithAdvisor` validates user authentication
2. Fetches advisor from Firestore by slug
3. Checks advisor is active
4. Verifies user has minimum credits (base cost)
5. Prepares messages array: system prompt + history + new message
6. Calls OpenAI Chat Completions API
7. Receives response with assistant message and token count
8. Calculates total credits: `base + (tokens * perTokenCost)`
9. Deducts credits via Firestore transaction
10. Logs interaction to `aiInteractionsLog` collection
11. Returns response to client

### Credit Deduction
- Uses Firestore transaction for atomic updates
- Checks fresh credit balance before deduction
- Throws error if insufficient credits mid-transaction
- Logs to `aiInteractionsLog` with fields:
  - `userId`, `advisorSlug`, `advisorId`
  - `creditsDeducted`, `tokensUsed`, `model`
  - `messageLength`, `responseLength`
  - `wasFreeInteraction`, `timestamp`

## Token Counting

OpenAI's API returns token usage in the response:

```json
{
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  }
}
```

The function uses `total_tokens` for billing calculations.

**Estimation Formula (Client-Side):**
```typescript
// Rough estimate before sending
const estimatedTokens = Math.ceil(messageLength / 4);
const tokenCost = Math.ceil(estimatedTokens * advisor.creditCostPerTokens);
const estimatedTotal = advisor.creditCostBase + tokenCost;
```

## Admin Workflows

### Creating an Advisor
1. Navigate to `/admin/dashboard/ai-advisors`
2. Click "Add Advisor"
3. Fill in required fields:
   - Name, slug, descriptions
   - **System Prompt** (200-500 words recommended)
   - Model selection
   - Tier and pricing
   - Icon and image upload
4. Submit to save to Firestore

### Editing an Advisor
1. Click "Edit" on advisor row
2. Modify fields (image updates replace old file)
3. Save changes - updates Firestore document

### Linking to Dispensary Types
1. Navigate to `/admin/dashboard/dispensary-types`
2. Create/edit a dispensary type
3. Check advisors in "Recommended Advisors" section
4. Selected advisor IDs stored in `recommendedAdvisorIds` array

### Toggling Active Status
Use the switch in the advisors list to:
- **Active**: Visible on homepage, available for chat
- **Inactive**: Hidden from users, admin-only visibility

## Error Handling

### Common Errors

**Insufficient Credits**
```
Code: failed-precondition
Message: "Insufficient credits. Required: X, Available: Y"
```
- User needs to purchase more credits
- Shows toast notification with credit purchase link

**Advisor Not Found**
```
Code: not-found
Message: "Advisor 'slug' not found or is not active"
```
- Check advisor exists and `isActive` is true
- Verify slug matches URL parameter

**OpenAI API Error**
```
Code: internal
Message: "OpenAI API error: [status]"
```
- Check OPENAI_API_KEY is set correctly
- Verify OpenAI account has credits
- Check model name is valid

**Authentication Required**
```
Code: unauthenticated
Message: "You must be signed in to chat with an advisor"
```
- User needs to sign in via `/auth/signin`

## Conversation Context

The system maintains conversation history:
- **Client Side**: Full conversation in component state
- **API Call**: Last 10 messages sent to OpenAI
- **Context Window**: Prevents excessive token usage
- **Reset**: "Clear" button resets conversation

## Security Considerations

1. **Authentication**: All function calls require Firebase Auth
2. **Rate Limiting**: Consider implementing per-user limits
3. **Content Moderation**: OpenAI automatically filters harmful content
4. **Credit Validation**: Transaction-based deduction prevents race conditions
5. **User ID Tracking**: OpenAI receives hashed user ID for abuse monitoring

## Performance Optimization

### Client Side
- Lazy load chat interface (only on advisor page)
- Debounce input for cost estimation
- Auto-scroll to new messages
- Optimistic UI updates

### Server Side
- Firestore queries limited to active advisors
- Conversation history capped at 10 messages
- OpenAI max_tokens limited to 1000
- Transaction retries for credit deduction

### Caching
- Consider caching advisor data on client
- Cache conversation history in localStorage
- Pre-fetch advisor list on homepage

## Monitoring & Analytics

### Firestore Collection: `aiInteractionsLog`
Track every interaction:
```typescript
{
  userId: string;
  advisorSlug: string;
  advisorId: string;
  creditsDeducted: number;
  tokensUsed: number;
  model: string;
  messageLength: number;
  responseLength: number;
  wasFreeInteraction: boolean;
  timestamp: Timestamp;
}
```

### Useful Queries
```typescript
// Most popular advisors
SELECT advisorSlug, COUNT(*) as interactions
FROM aiInteractionsLog
GROUP BY advisorSlug
ORDER BY interactions DESC;

// Average tokens per advisor
SELECT advisorSlug, AVG(tokensUsed) as avgTokens
FROM aiInteractionsLog
GROUP BY advisorSlug;

// Daily credit consumption
SELECT DATE(timestamp), SUM(creditsDeducted)
FROM aiInteractionsLog
GROUP BY DATE(timestamp);
```

## Future Enhancements

- [ ] Add conversation history persistence (Firestore)
- [ ] Implement AI response streaming (SSE)
- [ ] Add file upload support (images for analysis)
- [ ] Multi-language support for system prompts
- [ ] Advisor rating system
- [ ] Suggested follow-up questions
- [ ] Voice input/output integration
- [ ] Export conversation transcripts
- [ ] Admin analytics dashboard
- [ ] A/B testing different system prompts

## Troubleshooting

### Advisor Not Appearing on Homepage
- Check `isActive` is true in Firestore
- Verify `order` field is set (lower numbers appear first)
- Clear browser cache

### Chat Not Working
1. Check user is authenticated
2. Verify sufficient credits
3. Check browser console for errors
4. Inspect Network tab for function call failures
5. Check Firebase Functions logs: `firebase functions:log`

### OpenAI Errors
1. Verify secret is set: `firebase functions:secrets:access OPENAI_API_KEY`
2. Check OpenAI dashboard for API status
3. Ensure billing is active on OpenAI account
4. Test API key with curl:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Credit Deduction Issues
- Check Firestore rules allow writes to `users` collection
- Verify transaction logic in function logs
- Check for concurrent requests causing race conditions
- Inspect `aiInteractionsLog` for duplicate entries

## Support

For issues or questions:
1. Check Firebase Functions logs: `firebase functions:log --only chatWithAdvisor`
2. Review Firestore data in Firebase Console
3. Test OpenAI API key independently
4. Contact system administrator for access issues
