require('dotenv').config();
const nodemailer = require('nodemailer');

// Test email sending directly
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
});

async function testEmail() {
  try {
    console.log('🔍 Testing direct email send...');
    console.log('From:', process.env.SMTP_USER);
    
    const info = await transporter.sendMail({
      from: `"EtherxWord Test" <${process.env.SMTP_USER}>`,
      to: 'padmaja.biswal2025@gmail.com',
      subject: 'Direct Email Test - EtherX Collaboration Link',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:28px;background:#0f0f0f;color:#e8e0d0;border-radius:8px">
          <h2 style="color:#c9a84c;margin:0 0 8px 0">EtherxWord Collaboration Invite</h2>
          <p style="margin:0 0 14px 0"><strong>Test User</strong> invited you to join <strong>Test Document</strong> as <strong>editor</strong>.</p>
          <a href="http://localhost:3000/doc/test-doc-123" style="display:inline-block;padding:10px 16px;background:#c9a84c;color:#121212;text-decoration:none;border-radius:6px;font-weight:700;text-align:center">Open Document</a>
          <p style="margin:14px 0 0 0;font-size:12px;color:#999">If the button does not work, copy this link:<br><code style="background:#1a1a1a;padding:4px 8px;border-radius:4px;word-break:break-all">http://localhost:3000/doc/test-doc-123</code></p>
        </div>
      `,
    });
    
    console.log('✅ Email sent successfully!');
    console.log('MessageId:', info.messageId);
    console.log('Response:', info.response);
    process.exit(0);
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    console.error('Code:', err.code);
    process.exit(1);
  }
}

testEmail();
