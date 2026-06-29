require('dotenv').config();
const express   = require('express');
const multer = require('multer');

const cors      = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const templateRoutes = require('./routes/templates');
const uploadRoutes = require('./routes/upload');

// Initialize services
console.log('🔧 Initializing services...');
require('./utils/sendEmail');      // SMTP verification happens on require
require('./utils/ipfsService');    // IPFS verification happens on require
console.log('✅ Services initialized');

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('❌ Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Stack:', error.stack);
});

const app = express();

const configuredFrontendUrls = String(process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  ...configuredFrontendUrls,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
]);

connectDB();

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// Note: multer handles multipart/form-data for /api/upload.

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/upload', uploadRoutes);

// Serve uploaded images
app.use('/uploads', express.static(require('path').join(__dirname, 'public', 'uploads')));


app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api', (req, res) => {
  res.status(404).json({
    message: 'API route not found',
    method: req.method,
    path: req.originalUrl,
  });
});

const PORT = Number(process.env.PORT || 5000);
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set PORT to another value in backend/.env.`);
    process.exit(1);
  }
  throw error;
});
