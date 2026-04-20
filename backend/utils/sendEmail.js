const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: parseInt(process.env.SMTP_PORT) === 465 ? true : false,
  auth: { 
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS 
  },
  tls: { 
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  logger: false,
  debug: false,
});

// Verify connection on startup - async
(async () => {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified - Email service ready');
  } catch (err) {
    console.error('❌ SMTP connection failed:', err.message);
    console.error('   Make sure:');
    console.error('   1. Gmail app-specific password is correct (not regular password)');
    console.error('   2. 2FA is enabled on Gmail account');
    console.error('   3. App password is using: Settings > Security > App passwords');
    console.error('   4. SMTP_USER and SMTP_PASS are set in .env file');
  }
})();

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOTPEmail(email, otp, type) {
  const subject = type === 'verify' ? 'Verify your EtherxWord account' : 'Reset your EtherxWord password';
  const action  = type === 'verify' ? 'verify your account' : 'reset your password';

  try {
    const info = await transporter.sendMail({
      from: `"EtherxWord" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px;background:#0f0f0f;color:#e8e0d0;border-radius:8px">
          <h2 style="color:#c9a84c;margin-bottom:8px">EtherxWord</h2>
          <p>Use the code below to ${action}. It expires in <strong>10 minutes</strong>.</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#c9a84c;margin:24px 0;text-align:center">
            ${otp}
          </div>
          <p style="font-size:12px;color:#888">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    console.log('✅ OTP email sent to', email, '| MessageId:', info.messageId);
  } catch (err) {
    console.error('❌ Failed to send OTP email:', err.message);
    throw err;
  }
}

async function sendInviteEmail({ toEmail, inviterName, documentTitle, shareUrl, role = 'viewer' }) {
  if (!toEmail) throw new Error('Invite email is required');

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(toEmail)) {
    throw new Error(`Invalid email format: ${toEmail}`);
  }

  const safeInviter = inviterName || 'A collaborator';
  const safeTitle = documentTitle || 'Untitled Document';
  const safeRole = role || 'viewer';

  try {
    // Ensure transporter credentials exist
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials not configured in environment variables (SMTP_USER, SMTP_PASS)');
    }

    const info = await transporter.sendMail({
      from: `"EtherxWord" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `${safeInviter} invited you to collaborate on "${safeTitle}"`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:28px;background:#0f0f0f;color:#e8e0d0;border-radius:8px">
          <h2 style="color:#c9a84c;margin:0 0 8px 0">EtherxWord Collaboration Invite</h2>
          <p style="margin:0 0 14px 0"><strong>${safeInviter}</strong> invited you to join <strong>${safeTitle}</strong> as <strong>${safeRole}</strong>.</p>
          <a href="${shareUrl}" style="display:inline-block;padding:10px 16px;background:#c9a84c;color:#121212;text-decoration:none;border-radius:6px;font-weight:700;text-align:center">Open Document</a>
          <p style="margin:14px 0 0 0;font-size:12px;color:#999">If the button does not work, copy this link:<br><code style="background:#1a1a1a;padding:4px 8px;border-radius:4px;word-break:break-all">${shareUrl}</code></p>
          <hr style="border:none;border-top:1px solid #333;margin:20px 0">
          <p style="font-size:11px;color:#666;margin:0">This is an automated message from EtherxWord. Do not reply directly to this email.</p>
        </div>
      `,
      replyTo: process.env.SMTP_USER,
    });

    console.log(`✅ Invite email sent to ${toEmail} | MessageId: ${info.messageId}`);
    return { messageId: info.messageId, response: info.response };

  } catch (err) {
    const errorMsg = err?.message || 'Unknown error';
    console.error(`❌ Failed to send invite email to ${toEmail}:`, errorMsg);
    
    // Provide detailed error context for common issues
    if (errorMsg.includes('Credential')) {
      console.error('   Issue: Gmail credentials not set correctly');
      console.error('   Fix: Use Gmail App Password (not your regular password)');
      console.error('   Setup: https://support.google.com/accounts/answer/185833');
    } else if (errorMsg.includes('ECONNREFUSED')) {
      console.error('   Issue: Cannot connect to SMTP server');
      console.error('   Fix: Check SMTP_HOST and SMTP_PORT in .env');
    } else if (errorMsg.includes('timeout')) {
      console.error('   Issue: SMTP connection timeout');
      console.error('   Fix: Check network connectivity and SMTP server status');
    }
    
    throw err;
  }
}

module.exports = { generateOTP, sendOTPEmail, sendInviteEmail };
