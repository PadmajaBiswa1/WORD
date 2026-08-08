const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const User    = require('../models/User');
const OTP     = require('../models/OTP');
const { generateOTP } = require('../utils/sendEmail');
const authMiddleware = require('../middleware/auth');

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── POST /api/auth/signup ─────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    const existing = await User.findOne({ email });
    if (existing && existing.isVerified)
      return res.status(409).json({ message: 'Email already registered' });

    // If exists but unverified, update details and resend OTP
    if (existing && !existing.isVerified) {
      existing.name = name;
      existing.password = password;
      existing.markModified('password');
      await existing.save();
    } else {
      await User.create({ name, email, password });
    }

    const otp = generateOTP();
    await OTP.deleteMany({ email, type: 'verify' });
    await OTP.create({ email, otp, type: 'verify', expiresAt: new Date(Date.now() + 10 * 60 * 1000) });

    res.status(201).json({
      message: 'Account created. Check your email for the OTP.',
      otp,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await OTP.findOne({ email, type: 'verify' });

    if (!record || record.otp !== otp || record.expiresAt < new Date())
      return res.status(400).json({ message: 'Invalid or expired OTP' });

    await User.updateOne({ email }, { isVerified: true });
    await OTP.deleteMany({ email, type: 'verify' });

    const user  = await User.findOne({ email });
    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/resend-otp ─────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, type } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not found' });

    const otp = generateOTP();
    await OTP.deleteMany({ email, type });
    await OTP.create({ email, otp, type, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });

    res.json({ message: 'OTP resent', otp });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/signin ─────────────────────────────────────
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.isVerified)
      return res.status(403).json({ message: 'Please verify your email first', needsVerification: true });

    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Always respond OK to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, an OTP has been sent.', otp: null });

    const otp = generateOTP();
    await OTP.deleteMany({ email, type: 'reset' });
    await OTP.create({ email, otp, type: 'reset', expiresAt: new Date(Date.now() + 10 * 60 * 1000) });

    res.json({ message: 'If that email exists, an OTP has been sent.', otp });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/verify-reset-otp ──────────────────────────
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await OTP.findOne({ email, type: 'reset' });

    if (!record || record.otp !== otp || record.expiresAt < new Date())
      return res.status(400).json({ message: 'Invalid or expired OTP' });

    // Issue a short-lived reset token
    const resetToken = jwt.sign({ email, purpose: 'reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ resetToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, password } = req.body;
    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: 'Reset token invalid or expired' });
    }
    if (payload.purpose !== 'reset')
      return res.status(400).json({ message: 'Invalid token purpose' });

    const user = await User.findOne({ email: payload.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = password;
    await user.save();
    await OTP.deleteMany({ email: payload.email, type: 'reset' });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
