# Email Configuration Guide

## Overview
EtherX Word uses Nodemailer to send collaboration invitation emails. By default, it's configured to use Gmail SMTP, but you can use any SMTP provider.

## Gmail Setup (Recommended)

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click "2-Step Verification"
3. Follow the setup wizard

### Step 2: Generate App Password
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Scroll down to "App passwords" (only visible if 2FA is enabled)
3. Select "Mail" and "Windows Computer"
4. Google will generate a 16-character password (format: `xxxx xxxx xxxx xxxx`)
5. Copy this password

### Step 3: Update `.env` File
In `backend/.env`, update these variables:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password (16 characters without spaces)
```

**Example:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=biswalpadmaja411@gmail.com
SMTP_PASS=abcdefghijklmnop
```

### Step 4: Test Email Sending
1. Start the backend: `npm run dev`
2. Send a POST request to test the email:
```bash
curl -X POST http://localhost:5000/api/documents/test/send-email \
  -H "Content-Type: application/json" \
  -d '{"testEmail":"your-test-email@gmail.com"}'
```

You should see:
- Console log: `✅ Invite email sent to your-test-email@gmail.com | MessageId: <...>`
- Response: `{"ok":true,"message":"Test email sent to..."}`
- Email arrives in the test inbox within seconds

## Troubleshooting

### "SMTP connection failed" on startup
**Solution:** Check that SMTP_USER and SMTP_PASS are set correctly in `.env`

### "Invalid login" or "Authentication failed"
**Solutions:**
1. Verify you're using an **app-specific password**, not your regular Gmail password
2. Confirm 2FA is enabled on your Gmail account
3. Try regenerating the app password (settings > security > app passwords)
4. Check SMTP_USER is your full email (user@gmail.com, not just username)

### "Cannot connect to SMTP server"
**Solutions:**
1. Verify SMTP_HOST and SMTP_PORT are correct:
   - Gmail: `smtp.gmail.com:465` (secure)
   - Gmail: `smtp.gmail.com:587` (TLS)
2. Check internet connectivity
3. Try a different network (some corporate networks block SMTP)

### Email not arriving
1. Check spam folder
2. Verify recipient email address is correct
3. Check backend console for error messages
4. Try the test endpoint to isolate the issue

## Alternative Email Providers

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-smtp-password
```

### Office 365 / Outlook
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

## How Collaboration Emails Work

When a user shares a document:
1. Frontend sends: `POST /api/documents/{id}/share` with email and role
2. Backend creates share record and calls `sendInviteEmail()`
3. Nodemailer connects to SMTP server and sends email
4. Recipient receives invitation email with collaboration link
5. Clicking link opens document with real-time collaboration

## Testing Collaboration Flow

1. **Create document** - Create a new document in the editor
2. **Open Share dialog** - Click Share button
3. **Invite via email** - Enter collaborator's email address
4. **Verify email sent** - Check console for success message
5. **Check inbox** - Recipient should receive email within seconds
6. **Click to collaborate** - Recipient clicks the link in email
7. **Real-time sync** - Changes sync between users in real-time

## Environment Variables Reference

| Variable | Default | Example |
|----------|---------|---------|
| SMTP_HOST | smtp.gmail.com | smtp.gmail.com |
| SMTP_PORT | 465 | 465, 587 |
| SMTP_USER | (required) | user@gmail.com |
| SMTP_PASS | (required) | abcdefghijklmnop |
| FRONTEND_URL | http://localhost:3000 | https://etherxword.com |

## Support

If you're still having issues:
1. Check backend console output when sharing a document
2. Run the test email endpoint to isolate email configuration
3. Verify environment variables are set correctly
4. Ensure 2FA and app passwords are configured for Gmail
