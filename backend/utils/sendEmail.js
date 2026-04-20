const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: { 
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS 
  },
  tls: { rejectUnauthorized: false },
});

// Verify connection on startup
transporter.verify((err) => {
  if (err) {
    console.error('❌ SMTP connection failed:', err.message);
    console.error('   Make sure:');
    console.error('   1. Gmail app-specific password is correct');
    console.error('   2. 2FA is enabled on Gmail account');
    console.error('   3. Less secure apps is disabled (Gmail recommends app passwords)');
  }
  else console.log('✅ SMTP ready');
});

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

  const safeInviter = inviterName || 'A collaborator';
  const safeTitle = documentTitle || 'Untitled Document';
  const safeRole = role || 'viewer';

  try {
    const info = await transporter.sendMail({
      from: `"EtherxWord" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `${safeInviter} invited you to collaborate on "${safeTitle}"`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:28px;background:#0f0f0f;color:#e8e0d0;border-radius:8px">
          <h2 style="color:#c9a84c;margin:0 0 8px 0">EtherxWord Collaboration Invite</h2>
          <p style="margin:0 0 14px 0"><strong>${safeInviter}</strong> invited you to join <strong>${safeTitle}</strong> as <strong>${safeRole}</strong>.</p>
          <a href="${shareUrl}" style="display:inline-block;padding:10px 16px;background:#c9a84c;color:#121212;text-decoration:none;border-radius:6px;font-weight:700">Open Document</a>
          <p style="margin:14px 0 0 0;font-size:12px;color:#999">If the button does not work, copy this link:<br>${shareUrl}</p>
        </div>
      `,
    });
    console.log('✅ Invite email sent to', toEmail, '| MessageId:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Failed to send invite email:', err.message);
    throw err;
  }
}

module.exports = { generateOTP, sendOTPEmail, sendInviteEmail };
