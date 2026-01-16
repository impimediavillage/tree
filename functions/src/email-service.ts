import * as nodemailer from 'nodemailer';
import { logger } from 'firebase-functions/v2';

// Email configuration - using AfroHost SMTP
// Using Firebase secrets for production security
const SMTP_CONFIG = {
  host: 'mail.thewellnesstree.co.za',
  port: 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER || 'support@thewellnesstree.co.za',
    pass: process.env.SMTP_PASS || 'KI(jJIGHW-aimV&F', // Stored in Firebase secrets for production
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates (common with hosting providers)
  }
};

interface DispensaryApprovalEmailData {
  dispensaryName: string;
  ownerName: string;
  ownerEmail: string;
  temporaryPassword: string;
  loginUrl: string;
  dispensaryId: string;
}

interface CrewMemberWelcomeEmailData {
  dispensaryName: string;
  memberName: string;
  memberEmail: string;
  memberRole: 'Driver' | 'Vendor' | 'In-house Staff';
  temporaryPassword: string;
  loginUrl: string;
  phoneNumber?: string;
  vehicleInfo?: string;
  additionalInfo?: string;
}

/**
 * Creates a styled HTML email template for dispensary approval
 */
function createApprovalEmailTemplate(data: DispensaryApprovalEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Wellness Store Has Been Approved!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Logo and Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #006B3E 0%, #3D2E17 100%); padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <div style="background-color: #ffffff; display: inline-block; padding: 15px 25px; border-radius: 50px; margin-bottom: 20px;">
                <h1 style="margin: 0; color: #006B3E; font-size: 24px; font-weight: bold;">🌿 The Wellness Tree</h1>
              </div>
              <h2 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Congratulations!</h2>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Your Wellness Store Has Been Approved</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Welcome Message -->
              <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); padding: 25px; border-radius: 8px; border-left: 5px solid #006B3E; margin-bottom: 30px;">
                <h3 style="color: #3D2E17; margin: 0 0 10px 0; font-size: 20px;">Welcome to The Wellness Tree, ${data.ownerName}! 🎉</h3>
                <p style="color: #3D2E17; margin: 0; line-height: 1.6; font-size: 15px;">
                  We're excited to have <strong>${data.dispensaryName}</strong> join our wellness community. Your store is now live and ready to serve customers!
                </p>
              </div>

              <!-- Login Credentials Box -->
              <div style="background-color: #fff3e0; padding: 25px; border-radius: 8px; border: 2px solid #ff9800; margin-bottom: 30px;">
                <h3 style="color: #3D2E17; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
                  🔑 Your Login Credentials
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #666; font-size: 14px; font-weight: bold;">Username (Email):</td>
                    <td style="padding: 10px 0; color: #3D2E17; font-size: 14px; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px;">${data.ownerEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #666; font-size: 14px; font-weight: bold;">Temporary Password:</td>
                    <td style="padding: 10px 0; color: #3D2E17; font-size: 14px; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px; font-weight: bold;">${data.temporaryPassword}</td>
                  </tr>
                </table>
                <div style="background-color: #ffe0b2; padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid #ff9800;">
                  <p style="margin: 0; color: #3D2E17; font-size: 13px; line-height: 1.5;">
                    <strong>⚠️ Important:</strong> Please change your password immediately after logging in for security. Go to your profile settings.
                  </p>
                </div>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #006B3E 0%, #3D2E17 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(0, 107, 62, 0.3);">
                  🚀 Access Your Dashboard
                </a>
              </div>

              <!-- Next Steps -->
              <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin-top: 30px;">
                <h3 style="color: #3D2E17; margin: 0 0 15px 0; font-size: 18px;">📋 Next Steps to Get Started:</h3>
                <ol style="color: #3D2E17; line-height: 2; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li><strong>Complete your profile</strong> - Set shipping methods, operating hours, and origin locker</li>
                  <li><strong>Add your products</strong> - Build your product catalog</li>
                  <li><strong>Upload store branding</strong> - Add your logo and icon for a professional look</li>
                  <li><strong>Share your store URL</strong> - Start inviting customers</li>
                  <li><strong>Enable PWA installation</strong> - Let customers install your store as an app</li>
                </ol>
              </div>

              <!-- Quick Links -->
              <div style="margin-top: 30px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
                <h4 style="color: #3D2E17; margin: 0 0 15px 0; font-size: 16px;">🔗 Useful Links:</h4>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <a href="${data.loginUrl.replace('/auth/login', '/dispensary-admin/profile')}" style="color: #006B3E; text-decoration: none; font-weight: bold; font-size: 14px;">📝 Complete Profile</a>
                    </td>
                    <td style="padding: 8px 0;">
                      <a href="${data.loginUrl.replace('/auth/login', '/dispensary-admin/products')}" style="color: #006B3E; text-decoration: none; font-weight: bold; font-size: 14px;">📦 Add Products</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <a href="${data.loginUrl.replace('/auth/login', '/dispensary-admin/dashboard')}" style="color: #006B3E; text-decoration: none; font-weight: bold; font-size: 14px;">📊 View Dashboard</a>
                    </td>
                    <td style="padding: 8px 0;">
                      <a href="mailto:support@thewellnesstree.com" style="color: #006B3E; text-decoration: none; font-weight: bold; font-size: 14px;">💬 Contact Support</a>
                    </td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 25px 30px; text-align: center; border-radius: 0 0 10px 10px;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 13px;">
                If you have any questions, our team is here to help!
              </p>
              <p style="color: #999; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} The Wellness Tree. All rights reserved.
              </p>
              <div style="margin-top: 15px;">
                <p style="color: #999; margin: 0; font-size: 11px;">
                  This email was sent to ${data.ownerEmail} regarding your dispensary application.
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends a welcome email when a dispensary is approved
 */
export async function sendDispensaryApprovalEmail(emailData: DispensaryApprovalEmailData): Promise<void> {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    // Email options
    const mailOptions = {
      from: {
        name: 'The Wellness Tree',
        address: 'support@thewellnesstree.co.za',
      },
      to: emailData.ownerEmail,
      subject: `🎉 ${emailData.dispensaryName} Has Been Approved! - Access Your Dashboard`,
      html: createApprovalEmailTemplate(emailData),
      // Plain text fallback
      text: `
Congratulations ${emailData.ownerName}!

Your wellness store "${emailData.dispensaryName}" has been approved and is now live on The Wellness Tree platform.

LOGIN CREDENTIALS:
Username: ${emailData.ownerEmail}
Temporary Password: ${emailData.temporaryPassword}

IMPORTANT: Please change your password immediately after logging in.

Access your dashboard: ${emailData.loginUrl}

Next Steps:
1. Complete your profile (shipping methods, operating hours, origin locker)
2. Add your products
3. Upload store branding (logo and icon)
4. Share your store URL with customers
5. Enable PWA installation

If you have any questions, contact our support team.

Best regards,
The Wellness Tree Team
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Approval email sent successfully to ${emailData.ownerEmail}`, {
      messageId: info.messageId,
      dispensaryId: emailData.dispensaryId,
    });

  } catch (error: any) {
    logger.error('Failed to send dispensary approval email:', {
      error: error.message,
      stack: error.stack,
      emailData: {
        ownerEmail: emailData.ownerEmail,
        dispensaryId: emailData.dispensaryId,
      },
    });
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

/**
 * Creates a styled HTML email template for crew member welcome
 */
function createCrewMemberWelcomeTemplate(data: CrewMemberWelcomeEmailData): string {
  const roleEmoji = data.memberRole === 'Driver' ? '🚗' : data.memberRole === 'Vendor' ? '📦' : '👥';
  const roleColor = data.memberRole === 'Driver' ? '#2196F3' : data.memberRole === 'Vendor' ? '#9C27B0' : '#4CAF50';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${data.dispensaryName}!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${roleColor} 0%, #3D2E17 100%); padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <div style="background-color: #ffffff; display: inline-block; padding: 15px 25px; border-radius: 50px; margin-bottom: 20px;">
                <h1 style="margin: 0; color: #006B3E; font-size: 24px; font-weight: bold;">🌿 The Wellness Tree</h1>
              </div>
              <div style="font-size: 48px; margin-bottom: 10px;">${roleEmoji}</div>
              <h2 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Welcome Aboard!</h2>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">You're Now Part of ${data.dispensaryName}</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Welcome Message -->
              <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); padding: 25px; border-radius: 8px; border-left: 5px solid ${roleColor}; margin-bottom: 30px;">
                <h3 style="color: #3D2E17; margin: 0 0 10px 0; font-size: 20px;">Hey ${data.memberName}! 👋</h3>
                <p style="color: #3D2E17; margin: 0; line-height: 1.6; font-size: 15px;">
                  You've been added as a <strong style="color: ${roleColor};">${data.memberRole}</strong> at <strong>${data.dispensaryName}</strong>. Your account is ready, and we're excited to have you on the team!
                </p>
              </div>

              <!-- Role Badge -->
              <div style="text-align: center; margin-bottom: 30px;">
                <span style="display: inline-block; background-color: ${roleColor}; color: #ffffff; padding: 12px 30px; border-radius: 50px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                  ${roleEmoji} ${data.memberRole}
                </span>
              </div>

              <!-- Login Credentials -->
              <div style="background-color: #fff3e0; padding: 25px; border-radius: 8px; border: 2px solid #ff9800; margin-bottom: 30px;">
                <h3 style="color: #3D2E17; margin: 0 0 15px 0; font-size: 18px;">🔑 Your Login Credentials</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #666; font-size: 14px; font-weight: bold;">Email:</td>
                    <td style="padding: 10px 0; color: #3D2E17; font-size: 14px; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px;">${data.memberEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #666; font-size: 14px; font-weight: bold;">Temporary Password:</td>
                    <td style="padding: 10px 0; color: #3D2E17; font-size: 14px; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px; font-weight: bold;">${data.temporaryPassword}</td>
                  </tr>
                  ${data.phoneNumber ? `
                  <tr>
                    <td style="padding: 10px 0; color: #666; font-size: 14px; font-weight: bold;">Phone:</td>
                    <td style="padding: 10px 0; color: #3D2E17; font-size: 14px; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px;">${data.phoneNumber}</td>
                  </tr>` : ''}
                </table>
                <div style="background-color: #ffe0b2; padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid #ff9800;">
                  <p style="margin: 0; color: #3D2E17; font-size: 13px; line-height: 1.5;">
                    <strong>⚠️ Security:</strong> Change your password after first login. Go to Profile Settings.
                  </p>
                </div>
              </div>

              ${data.vehicleInfo ? `
              <!-- Vehicle Info (Drivers) -->
              <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #2196F3;">
                <h3 style="color: #3D2E17; margin: 0 0 10px 0; font-size: 16px;">🚗 Your Vehicle</h3>
                <p style="color: #3D2E17; margin: 0; font-size: 14px; line-height: 1.6;">${data.vehicleInfo}</p>
              </div>` : ''}

              ${data.additionalInfo ? `
              <!-- Additional Info -->
              <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #9C27B0;">
                <p style="color: #3D2E17; margin: 0; font-size: 14px; line-height: 1.6;">${data.additionalInfo}</p>
              </div>` : ''}

              <!-- Action Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, ${roleColor} 0%, #3D2E17 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                  ${roleEmoji} Access Your Panel
                </a>
              </div>

              <!-- What's Next -->
              <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin-top: 30px;">
                <h3 style="color: #3D2E17; margin: 0 0 15px 0; font-size: 18px;">📋 What's Next?</h3>
                ${data.memberRole === 'Driver' ? `
                <ol style="color: #3D2E17; line-height: 2; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>Log in and complete your driver profile</li>
                  <li>Update your availability status</li>
                  <li>Wait for document verification</li>
                  <li>Start accepting deliveries!</li>
                </ol>` : data.memberRole === 'Vendor' ? `
                <ol style="color: #3D2E17; line-height: 2; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>Log in and explore your vendor dashboard</li>
                  <li>Add your products to the catalog</li>
                  <li>Set up your payout information</li>
                  <li>Start selling!</li>
                </ol>` : `
                <ol style="color: #3D2E17; line-height: 2; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>Log in and explore your dashboard</li>
                  <li>Familiarize yourself with the system</li>
                  <li>Contact your manager if you have questions</li>
                  <li>Start contributing to the team!</li>
                </ol>`}
              </div>

              <!-- Support -->
              <div style="margin-top: 30px; padding-top: 25px; border-top: 2px solid #e0e0e0; text-align: center;">
                <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
                  Need help? Contact us at <a href="mailto:support@thewellnesstree.co.za" style="color: #006B3E; text-decoration: none; font-weight: bold;">support@thewellnesstree.co.za</a>
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 25px 30px; text-align: center; border-radius: 0 0 10px 10px;">
              <p style="color: #999; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} The Wellness Tree. All rights reserved.
              </p>
              <div style="margin-top: 10px;">
                <p style="color: #999; margin: 0; font-size: 11px;">
                  This email was sent to ${data.memberEmail} by ${data.dispensaryName}.
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends a welcome email to a newly created crew member
 */
export async function sendCrewMemberWelcomeEmail(emailData: CrewMemberWelcomeEmailData): Promise<void> {
  try {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    const mailOptions = {
      from: {
        name: 'The Wellness Tree',
        address: 'support@thewellnesstree.co.za',
      },
      to: emailData.memberEmail,
      subject: `${emailData.memberRole === 'Driver' ? '🚗' : emailData.memberRole === 'Vendor' ? '📦' : '👥'} Welcome to ${emailData.dispensaryName} - Access Your Account`,
      html: createCrewMemberWelcomeTemplate(emailData),
      text: `
Welcome ${emailData.memberName}!

You've been added as a ${emailData.memberRole} at ${emailData.dispensaryName}.

LOGIN CREDENTIALS:
Email: ${emailData.memberEmail}
Temporary Password: ${emailData.temporaryPassword}
${emailData.phoneNumber ? `Phone: ${emailData.phoneNumber}\n` : ''}

IMPORTANT: Change your password after first login.

Access your panel: ${emailData.loginUrl}

${emailData.vehicleInfo ? `Vehicle: ${emailData.vehicleInfo}\n\n` : ''}${emailData.additionalInfo ? `${emailData.additionalInfo}\n\n` : ''}
If you have questions, contact support@thewellnesstree.co.za

Best regards,
The Wellness Tree Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Crew member welcome email sent to ${emailData.memberEmail}`, {
      messageId: info.messageId,
      role: emailData.memberRole,
    });

  } catch (error: any) {
    logger.error('Failed to send crew member welcome email:', {
      error: error.message,
      emailData: {
        memberEmail: emailData.memberEmail,
        role: emailData.memberRole,
      },
    });
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

/**
 * Verify SMTP connection (useful for testing)
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);
    await transporter.verify();
    logger.info('SMTP connection verified successfully');
    return true;
  } catch (error: any) {
    logger.error('SMTP connection verification failed:', error.message);
    return false;
  }
}
