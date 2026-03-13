// ============================================= 
// 265Stream - Express Server
// =============================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import routes
import authRoutes from './routes/auth.js';
import musicRoutes from './routes/music.js';
import purchaseRoutes from './routes/purchases.js';
import adminRoutes from './routes/admin.js';

// Import services
import { verifyEmailConnection } from './services/emailService.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS - allow frontend origin
app.use(cors({
    origin: true, // Allow any origin to connect (useful for local development with Live Server etc)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
    },
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // 10 attempts per 15 minutes
    message: {
        error: 'Too many authentication attempts',
        message: 'Please try again later.',
    },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (simple)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (process.env.NODE_ENV !== 'production' || res.statusCode >= 400) {
            console.log(
                `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
            );
        }
    });
    next();
});


// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: '265Stream API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            error: 'File too large',
            message: 'File exceeds the maximum size limit',
        });
    }

    // Multer file type error
    if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({
            error: 'Invalid file type',
            message: err.message,
        });
    }

    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message,
    });
});


// ============================================
// START SERVER
// ============================================

async function startServer() {
    console.log('');
    console.log('🎵 ═══════════════════════════════════════');
    console.log('   265Stream Backend API');
    console.log('   ═══════════════════════════════════════');
    console.log('');

    // Verify email connection
    await verifyEmailConnection();

    // Verify Supabase connection
    try {
        const { supabaseAdmin } = await import('./config/supabase.js');
        const { data, error } = await supabaseAdmin.from('platform_settings').select('key').limit(1);
        if (error) throw error;
        console.log('✅ Supabase connection verified');
    } catch (error) {
        console.warn('⚠️  Supabase connection issue:', error.message);
        console.warn('   Make sure your Supabase URL and service role key are correct.');
    }

    app.listen(PORT, () => {
        console.log('');
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 API available at http://localhost:${PORT}/api`);
        console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('');
        console.log('Available endpoints:');
        console.log('  POST   /api/auth/register');
        console.log('  POST   /api/auth/login');
        console.log('  GET    /api/auth/verify-email?token=...');
        console.log('  GET    /api/auth/me');
        console.log('  PUT    /api/auth/profile');
        console.log('  GET    /api/music/songs');
        console.log('  GET    /api/music/songs/:id');
        console.log('  GET    /api/music/songs/:id/stream');
        console.log('  GET    /api/music/songs/:id/download');
        console.log('  POST   /api/music/songs/upload');
        console.log('  GET    /api/music/albums');
        console.log('  GET    /api/music/artists');
        console.log('  POST   /api/purchases/song/:songId');
        console.log('  POST   /api/purchases/album/:albumId');
        console.log('  GET    /api/purchases');
        console.log('  GET    /api/admin/dashboard');
        console.log('  GET    /api/admin/users');
        console.log('  GET    /api/admin/artists');
        console.log('  GET    /api/admin/content');
        console.log('  GET    /api/admin/purchases');
        console.log('  GET    /api/admin/settings');
        console.log('  GET    /api/admin/analytics');
        console.log('');
    });
}

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
