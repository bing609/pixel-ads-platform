/**
 * Pixel Ads Platform - Backend Server
 * Entry point for Express.js backend application
 * 
 * Features:
 * - Express.js server setup
 * - Middleware configuration (CORS, security, validation)
 * - Route initialization
 * - Global error handling
 * - Database connection
 */

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Routes
import authRoutes from './routes/auth.js';
import blockRoutes from './routes/blocks.js';
import paypalRoutes from './routes/paypal.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';
import { validateJWT } from './middleware/auth.js';

// Utils
import { initDatabase } from './database/connection.js';
import { initRedis } from './utils/cache.js';

// Config
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Security Headers
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,  // Disable `X-RateLimit-*` headers
});

// Apply rate limiting to all requests
app.use(limiter);

// Request Logging (simple)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Public Routes (Authentication)
app.use('/api/auth', authRoutes);

// Public Routes (Grid & Blocks)
app.use('/api/blocks', blockRoutes);

// PayPal Routes (webhook does not require auth)
app.use('/api/paypal', paypalRoutes);

// Protected Routes (User)
app.use('/api/user', validateJWT, userRoutes);

// Protected Routes (Admin)
app.use('/api/admin', validateJWT, adminRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global Error Handler
app.use(errorHandler);

// ============================================
// SERVER INITIALIZATION
// ============================================

const startServer = async () => {
  try {
    // Initialize Database
    console.log('📊 Initializing database...');
    await initDatabase();
    console.log('✅ Database connected');

    // Initialize Redis Cache (optional)
    if (process.env.REDIS_ENABLE === 'true') {
      console.log('💾 Initializing Redis cache...');
      await initRedis();
      console.log('✅ Redis connected');
    }

    // Start Server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   🎯 Pixel Ads Platform Server        ║
║   Running on port ${PORT}                 ║
║   Environment: ${process.env.NODE_ENV}        ║
║   Client URL: ${process.env.CLIENT_URL}    ║
╚════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('📍 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📍 SIGINT received, shutting down gracefully...');
  process.exit(0);
});
