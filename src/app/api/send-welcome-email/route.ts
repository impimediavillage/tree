import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// SMTP Configuration (same as dispensary signup emails)
const SMTP_CONFIG = {
  host: 'mail.thewellnesstree.co.za',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'support@thewellnesstree.co.za',
    pass: process.env.SMTP_PASS || 'KI(jJIGHW-aimV&F',
  },
  tls: {
    rejectUnauthorized: false
  }
};

interface Dispensary {
  name: string;
  logoUrl?: string;
  coverImageUrl?: string;
  customDomain?: string;
  slug?: string;
}

interface WelcomeEmailData {
  userEmail: string;
  userName: string;
  userType: 'crew' | 'leaf';
  dispensaryId: string;
  temporaryPassword?: string;
}

/**
 * Create styled HTML email template for crew member welcome
 */
function createCrewMemberEmailTemplate(data: WelcomeEmailData, dispensary: Dispensary, storeUrl: string): string {
  const storeName = dispensary.name || 'Your Dispensary';
  const logoUrl = dispensary.logoUrl || '';
  const coverImage = dispensary.coverImageUrl || '';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${storeName} Team!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header with Store Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #006B3E 0%, #3D2E17 100%); padding: 40px 30px; text-align: center;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${storeName}" style="max-width: 120px; height: auto; margin-bottom: 20px; background: white; padding: 10px; border-radius: 12px;" />` : `<div style="background-color: #ffffff; display: inline-block; padding: 15px 25px; border-radius: 12px; margin-bottom: 20px;">
                <h1 style="margin: 0; color: #006B3E; font-size: 24px; font-weight: bold;">🌿 ${storeName}</h1>
              </div>`}
              <h2 style="color: #ffffff; margin: 20px 0 0 0; font-size: 28px; font-weight: bold;">Welcome to the Crew! 🎉</h2>
            </td>
          </tr>

          ${coverImage ? `
          <!-- Store Cover Image -->
          <tr>
            <td style="padding: 0;">
              <img src="${coverImage}" alt="${storeName}" style="width: 100%; height: auto; display: block;" />
            </td>
          </tr>
          ` : ''}

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Welcome Message -->
              <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); padding: 25px; border-radius: 8px; border-left: 5px solid #006B3E; margin-bottom: 30px;">
                <h3 style="color: #3D2E17; margin: 0 0 10px 0; font-size: 20px;">Hey ${data.userName}! 👋</h3>
                <p style="color: #3D2E17; margin: 0; line-height: 1.6; font-size: 15px;">
                  You've been added as a crew member at <strong>${storeName}</strong>! You now have access to manage products and orders.
                </p>
              </div>

              <!-- Login Credentials Box -->
              ${data.temporaryPassword ? `
              <div style="background-color: #fff3e0; padding: 25px; border-radius: 8px; border: 2px solid #ff9800; margin-bottom: 30px;">
                <h3 style="color: #3D2E17; margin: 0 0 15px 0; font-size: 18px;">🔑 Your Login Credentials</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #666; font-size: 14px; font-weight: bold;">Email:</td>
                    <td style="padding: 10px 0; color: #3D2E17; font-size: 14px; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px;">${data.userEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #666; font-size: 14px; font-weight: bold;">Temporary Password:</td>
                    <td style="padding: 10px 0; color: #3D2E17; font-size: 14px; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px; font-weight: bold;">${data.temporaryPassword}</td>
                  </tr>
                </table>
                <div style="background-color: #ffe0b2; padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid #ff9800;">
                  <p style="margin: 0; color: #3D2E17; font-size: 13px; line-height: 1.5;">
                    <strong>⚠️ Important:</strong> Please change your password immediately after logging in for security.
                  </p>
                </div>
              </div>
              ` : ''}

              <!-- Action Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${storeUrl}" style="display: inline-block; background: linear-gradient(135deg, #006B3E 0%, #3D2E17 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(0, 107, 62, 0.3);">
                  🚀 Visit ${storeName}
                </a>
              </div>

              <!-- What You Can Do -->
              <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin-top: 30px;">
                <h3 style="color: #3D2E17; margin: 0 0 15px 0; font-size: 18px;">✨ What You Can Do:</h3>
                <ul style="color: #3D2E17; line-height: 2; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>Manage products and inventory</li>
                  <li>Process and fulfill orders</li>
                  <li>View sales and analytics</li>
                  <li>Assist customers</li>
                </ul>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 25px 30px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 13px;">
                Need help? Contact your dispensary manager or our support team.
              </p>
              <p style="color: #999; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} ${storeName}. Powered by The Wellness Tree.
              </p>
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
 * Create styled HTML email template for leaf user welcome
 */
function createLeafUserEmailTemplate(data: WelcomeEmailData, dispensary: Dispensary, storeUrl: string): string {
  const storeName = dispensary.name || 'Your Dispensary';
  const logoUrl = dispensary.logoUrl || '';
  const coverImage = dispensary.coverImageUrl || '';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${storeName}!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header with Store Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #006B3E 0%, #3D2E17 100%); padding: 40px 30px; text-align: center;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${storeName}" style="max-width: 120px; height: auto; margin-bottom: 20px; background: white; padding: 10px; border-radius: 12px;" />` : `<div style="background-color: #ffffff; display: inline-block; padding: 15px 25px; border-radius: 12px; margin-bottom: 20px;">
                <h1 style="margin: 0; color: #006B3E; font-size: 24px; font-weight: bold;">🌿 ${storeName}</h1>
              </div>`}
              <h2 style="color: #ffffff; margin: 20px 0 0 0; font-size: 28px; font-weight: bold;">Welcome! 🎉</h2>
            </td>
          </tr>

          ${coverImage ? `
          <!-- Store Cover Image -->
          <tr>
            <td style="padding: 0;">
              <img src="${coverImage}" alt="${storeName}" style="width: 100%; height: auto; display: block;" />
            </td>
          </tr>
          ` : ''}

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Welcome Message -->
              <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); padding: 25px; border-radius: 8px; border-left: 5px solid #006B3E; margin-bottom: 30px;">
                <h3 style="color: #3D2E17; margin: 0 0 10px 0; font-size: 20px;">Hey ${data.userName}! 👋</h3>
                <p style="color: #3D2E17; margin: 0; line-height: 1.6; font-size: 15px;">
                  Welcome to <strong>${storeName}</strong>! Your account has been created and you're ready to start shopping with us.
                </p>
              </div>

              <!-- Welcome Credits -->
              <div style="background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%); padding: 25px; border-radius: 8px; text-align: center; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);">
                <h3 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">🎁 Welcome Gift!</h3>
                <p style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">10 Credits</p>
                <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Use them on your first purchase!</p>
              </div>

              <!-- Login Credentials Box -->
              ${data.temporaryPassword ? `
              <div style="background-color: #fff3e0; padding: 25px; border-radius: 8px; border: 2px solid #ff9800; margin-bottom: 30px;">
                <h3 style="color: #3D2E17; margin: 0 0 15px 0; font-size: 18px;">🔑 Your Login Credentials</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #666; font-size: 14px; font-weight: bold;">Email:</td>
                    <td style="padding: 10px 0; color: #3D2E17; font-size: 14px; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px;">${data.userEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #666; font-size: 14px; font-weight: bold;">Temporary Password:</td>
                    <td style="padding: 10px 0; color: #3D2E17; font-size: 14px; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px; font-weight: bold;">${data.temporaryPassword}</td>
                  </tr>
                </table>
                <div style="background-color: #ffe0b2; padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid #ff9800;">
                  <p style="margin: 0; color: #3D2E17; font-size: 13px; line-height: 1.5;">
                    <strong>⚠️ Important:</strong> Please change your password after logging in for security.
                  </p>
                </div>
              </div>
              ` : ''}

              <!-- Action Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${storeUrl}" style="display: inline-block; background: linear-gradient(135deg, #006B3E 0%, #3D2E17 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(0, 107, 62, 0.3);">
                  🛍️ Start Shopping at ${storeName}
                </a>
              </div>

              <!-- What's Next -->
              <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin-top: 30px;">
                <h3 style="color: #3D2E17; margin: 0 0 15px 0; font-size: 18px;">🌿 What's Next:</h3>
                <ul style="color: #3D2E17; line-height: 2; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>Browse our premium cannabis products</li>
                  <li>Use your 10 welcome credits on your first order</li>
                  <li>Enjoy fast and discreet delivery</li>
                  <li>Earn more credits with every purchase</li>
                </ul>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 25px 30px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 13px;">
                Questions? Contact ${storeName} or our support team.
              </p>
              <p style="color: #999; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} ${storeName}. Powered by The Wellness Tree.
              </p>
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

export async function POST(request: NextRequest) {
  try {
    const body: WelcomeEmailData = await request.json();
    const { userEmail, userName, userType, dispensaryId, temporaryPassword } = body;

    // Validate required fields
    if (!userEmail || !userName || !userType || !dispensaryId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch dispensary data
    const dispensaryDoc = await getDoc(doc(db, 'dispensaries', dispensaryId));
    if (!dispensaryDoc.exists()) {
      return NextResponse.json(
        { error: 'Dispensary not found' },
        { status: 404 }
      );
    }

    const dispensary = dispensaryDoc.data() as Dispensary;
    
    // Build store URL
    const storeUrl = dispensary.customDomain 
      ? `https://${dispensary.customDomain}` 
      : `https://thewellnesstree.co.za/store/${dispensary.slug || dispensaryId}`;

    // Create email template based on user type
    const emailTemplate = userType === 'crew'
      ? createCrewMemberEmailTemplate(body, dispensary, storeUrl)
      : createLeafUserEmailTemplate(body, dispensary, storeUrl);

    const subject = userType === 'crew'
      ? `Welcome to ${dispensary.name} Team! 🎉`
      : `Welcome to ${dispensary.name}! 🎁`;

    // Create transporter
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    // Send email
    const mailOptions = {
      from: {
        name: dispensary.name || 'The Wellness Tree',
        address: 'support@thewellnesstree.co.za',
      },
      to: userEmail,
      subject: subject,
      html: emailTemplate,
      text: `Welcome to ${dispensary.name}! Visit ${storeUrl}`,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ 
      success: true, 
      message: 'Welcome email sent successfully' 
    });

  } catch (error: any) {
    console.error('Failed to send welcome email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}
