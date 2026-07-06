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
  'http://localhost:3001',
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

const BASE_PORT = Number(process.env.PORT || 3001);
const MAX_PORT_ATTEMPTS = Number(process.env.PORT_RETRY_ATTEMPTS || 20);

function startServer(port, attempt = 0) {
  const server = app.listen(port, () => {
    const extraInfo = port !== BASE_PORT ? ` (fallback from ${BASE_PORT})` : '';
    console.log(`Server running on port ${port}${extraInfo}`);
  });

  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use, retrying on ${nextPort}...`);
      return startServer(nextPort, attempt + 1);
    }

    if (error?.code === 'EADDRINUSE') {
      console.error(`Unable to find a free port after ${MAX_PORT_ATTEMPTS + 1} attempts (starting at ${BASE_PORT}).`);
      process.exit(1);
    }

    throw error;
  });
}

startServer(BASE_PORT);
