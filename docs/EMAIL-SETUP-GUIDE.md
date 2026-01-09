# Email Service Configuration Guide

## Overview
The Wellness Tree uses **nodemailer** with Gmail SMTP for sending automated emails (e.g., dispensary approval notifications).

## Gmail SMTP Setup (FREE)

### Step 1: Enable 2-Factor Authentication on Gmail
1. Go to your [Google Account Security Settings](https://myaccount.google.com/security)
2. Enable **2-Step Verification**

### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Enter "Wellness Tree"
4. Click **Generate**
5. **Copy the 16-character password** (you won't see it again)

### Step 3: Configure Firebase Environment Variables

#### Option A: Using Firebase Secrets (Recommended for Production)
```bash
# Set SMTP credentials as secrets
firebase functions:secrets:set SMTP_USER
# Enter your Gmail address when prompted

firebase functions:secrets:set SMTP_PASS
# Enter the 16-character app password when prompted
```

Then update `functions/src/email-service.ts`:
```typescript
import { defineSecret } from 'firebase-functions/params';

const smtpUser = defineSecret('SMTP_USER');
const smtpPass = defineSecret('SMTP_PASS');

const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: smtpUser.value(),
    pass: smtpPass.value(),
  },
};

// Export function with secrets
export const someFunction = onCall({ secrets: [smtpUser, smtpPass] }, async (request) => {
  // ... function code
});
```

#### Option B: Using Environment Variables (Development)
Create `.env` file in `functions/` directory:
```env
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

Update `functions/src/email-service.ts`:
```typescript
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password',
  },
};
```

### Step 4: Install Dependencies
```bash
cd functions
npm install nodemailer@^6.9.8 @types/nodemailer@^6.4.14
npm run build
```

### Step 5: Deploy Functions
```bash
firebase deploy --only functions:createDispensaryUser
```

## Testing Email Service

### Test Email Connection
Add this to your Cloud Function:
```typescript
import { verifyEmailConnection } from './email-service';

// Test connection
const isConnected = await verifyEmailConnection();
console.log('Email service connected:', isConnected);
```

### Test Approval Email
```typescript
import { sendDispensaryApprovalEmail } from './email-service';

await sendDispensaryApprovalEmail({
  dispensaryName: 'Test Dispensary',
  ownerName: 'John Doe',
  ownerEmail: 'test@example.com',
  temporaryPassword: 'test1234',
  loginUrl: 'http://localhost:3000/auth/login',
  dispensaryId: 'test-id',
});
```

## Email Templates

### Approval Email Features
- ✅ Modern, responsive HTML design
- ✅ Wellness Tree branding with gradient colors
- ✅ Clear display of login credentials
- ✅ Security warning to change password
- ✅ Call-to-action button
- ✅ Next steps checklist
- ✅ Quick links to key pages
- ✅ Plain text fallback for email clients without HTML support

### Customizing Email Templates
Edit `functions/src/email-service.ts`:
- Update `createApprovalEmailTemplate()` function
- Modify colors, text, or structure
- Add your logo URL
- Change button styles

## Email Sending Limits

### Gmail SMTP Limits
- **Free Gmail**: 500 emails/day
- **Google Workspace**: 2000 emails/day

For higher volume, consider:
- [SendGrid](https://sendgrid.com/) (100 emails/day free)
- [Mailgun](https://www.mailgun.com/) (5000 emails/month free)
- [AWS SES](https://aws.amazon.com/ses/) (62,000 emails/month free first year)

## Troubleshooting

### Error: "Invalid login"
- Verify App Password (not your Gmail password)
- Check 2FA is enabled
- Generate new App Password

### Error: "Connection timeout"
- Check Firebase Functions has internet access
- Verify port 587 is not blocked
- Try port 465 with `secure: true`

### Email not received
- Check spam folder
- Verify recipient email address
- Check Gmail sent folder
- Review Firebase Functions logs: `firebase functions:log`

### Firestore Rules
No special Firestore rules needed - emails sent server-side only.

## Alternative: Firebase Extensions

For no-code email setup, use [Trigger Email](https://extensions.dev/extensions/firebase/firestore-send-email) extension:

```bash
firebase ext:install firebase/firestore-send-email
```

However, this requires Firestore triggers and is less flexible than our custom solution.

## Production Checklist

- [ ] Gmail App Password generated
- [ ] Firebase Secrets configured (`SMTP_USER`, `SMTP_PASS`)
- [ ] Dependencies installed (`nodemailer`, `@types/nodemailer`)
- [ ] Functions deployed
- [ ] Test email sent successfully
- [ ] Update `loginUrl` in `createDispensaryUser` function to production domain
- [ ] Monitor Firebase Functions logs for email errors
- [ ] Set up error alerting (optional)

## Support

For issues:
1. Check Firebase Functions logs: `firebase functions:log`
2. Test SMTP connection with `verifyEmailConnection()`
3. Verify Gmail App Password is correct
4. Ensure Firebase Functions has billing enabled (required for external API calls)

---

**Note**: Firebase Functions requires **Blaze (Pay-as-you-go)** plan for outbound network requests (including SMTP). The first 2 million function invocations per month are free.
