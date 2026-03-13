// =============================================
// 265Stream - Email Service (Nodemailer)
// =============================================
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase.js';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Verify SMTP connection on startup
 */
export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    return true;
  } catch (error) {
    console.warn('⚠️  SMTP connection failed:', error.message);
    console.warn('   Email sending will not work until SMTP is configured.');
    return false;
  }
}

/**
 * Generate an email verification token and store it in the database
 */
export async function generateVerificationToken(userId) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const { error } = await supabaseAdmin
    .from('email_verification_tokens')
    .insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error('Error creating verification token:', error);
    throw new Error('Failed to create verification token');
  }

  return token;
}

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(email, fullName, token) {
  const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${token}`;
  const fromName = process.env.EMAIL_FROM_NAME || '265Stream';
  const fromEmail = process.env.EMAIL_FROM || 'noreply@265stream.com';

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: 'Verify your 265Stream account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0; padding:0; background-color:#0B0B0B; font-family:'Inter',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0B0B; padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#141414; border-radius:16px; border:1px solid #27272A; overflow:hidden;">
                <!-- Header -->
                <tr>
                  <td style="padding:40px 40px 20px; text-align:center;">
                    <h1 style="color:#FF0000; font-size:28px; font-weight:900; margin:0; letter-spacing:-0.03em;">265Stream</h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding:20px 40px 40px;">
                    <h2 style="color:#FFFFFF; font-size:22px; font-weight:700; margin:0 0 12px;">
                      Verify your email address
                    </h2>
                    <p style="color:#A1A1AA; font-size:15px; line-height:1.6; margin:0 0 24px;">
                      Hi ${fullName || 'there'},<br><br>
                      Welcome to 265Stream! Please verify your email address to get full access to the platform.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding:8px 0 24px;">
                          <a href="${verificationUrl}" 
                             style="display:inline-block; background-color:#FF0000; color:#FFFFFF; text-decoration:none; padding:14px 36px; border-radius:9999px; font-size:15px; font-weight:700; letter-spacing:0.02em;">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color:#71717A; font-size:13px; line-height:1.6; margin:0 0 16px;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="color:#A1A1AA; font-size:12px; word-break:break-all; background:#1F1F1F; padding:12px 16px; border-radius:8px; border:1px solid #27272A;">
                      ${verificationUrl}
                    </p>
                    <p style="color:#71717A; font-size:13px; line-height:1.6; margin:24px 0 0;">
                      This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding:24px 40px; border-top:1px solid #27272A; text-align:center;">
                    <p style="color:#71717A; font-size:12px; margin:0;">
                      &copy; ${new Date().getFullYear()} 265Stream. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
      Verify your 265Stream Account
      
      Hi ${fullName || 'there'},
      
      Welcome to 265Stream! Please verify your email by visiting this link:
      ${verificationUrl}
      
      This link expires in 24 hours.
      
      If you didn't create an account, you can safely ignore this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Verification email sent to ${email} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

/**
 * Verify a token and mark the user's email as verified
 */
export async function verifyToken(token) {
  // Find the token
  const { data: tokenRecord, error: findError } = await supabaseAdmin
    .from('email_verification_tokens')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .single();

  if (findError || !tokenRecord) {
    return { success: false, error: 'Invalid or expired verification token' };
  }

  // Check expiry
  if (new Date(tokenRecord.expires_at) < new Date()) {
    return { success: false, error: 'Verification token has expired' };
  }

  // Mark token as used
  await supabaseAdmin
    .from('email_verification_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenRecord.id);

  // Mark user email as verified
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ email_verified: true })
    .eq('id', tokenRecord.user_id);

  if (updateError) {
    console.error('Error updating profile verification:', updateError);
    return { success: false, error: 'Failed to verify email' };
  }

  // Also tell Supabase Auth that the email is verified, so it permits login
  await supabaseAdmin.auth.admin.updateUserById(tokenRecord.user_id, { email_confirm: true });

  return { success: true, userId: tokenRecord.user_id };
}

/**
 * Send a purchase receipt email
 */
export async function sendPurchaseReceiptEmail(email, fullName, songTitle, artistName, amount) {
  const fromName = process.env.EMAIL_FROM_NAME || '265Stream';
  const fromEmail = process.env.EMAIL_FROM || 'noreply@265stream.com';

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `Purchase Receipt - ${songTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; background:#141414; color:#fff; padding:40px; border-radius:16px;">
        <h1 style="color:#FF0000; font-size:24px;">265Stream</h1>
        <h2 style="color:#fff; margin-top:24px;">Purchase Confirmed! 🎵</h2>
        <p style="color:#A1A1AA;">Hi ${fullName},</p>
        <p style="color:#A1A1AA;">Your purchase has been confirmed. Here are the details:</p>
        <div style="background:#1F1F1F; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #27272A;">
          <p style="margin:4px 0; color:#fff;"><strong>Song:</strong> ${songTitle}</p>
          <p style="margin:4px 0; color:#A1A1AA;"><strong>Artist:</strong> ${artistName}</p>
          <p style="margin:4px 0; color:#FF0000; font-size:18px;"><strong>Amount:</strong> $${amount.toFixed(2)}</p>
        </div>
        <p style="color:#A1A1AA;">You can now stream and download this song from your library.</p>
        <p style="color:#71717A; font-size:12px; margin-top:24px;">&copy; ${new Date().getFullYear()} 265Stream</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send purchase receipt:', error);
    // Don't throw - receipt email failure shouldn't block the purchase
  }
}
