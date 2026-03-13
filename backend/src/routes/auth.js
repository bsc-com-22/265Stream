// =============================================
// 265Stream - Authentication Routes
// =============================================
import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
    generateVerificationToken,
    sendVerificationEmail,
    verifyToken,
} from '../services/emailService.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName, username, role = 'listener' } = req.body;

        // Validate required fields
        if (!email || !password || !fullName) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['email', 'password', 'fullName'],
            });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password too short',
                message: 'Password must be at least 8 characters',
            });
        }

        // Only allow listener or artist roles during registration
        const allowedRoles = ['listener', 'artist'];
        const assignedRole = allowedRoles.includes(role) ? role : 'listener';

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: false, // We handle verification ourselves via Nodemailer
            user_metadata: {
                full_name: fullName,
                username: username || email.split('@')[0],
            },
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                return res.status(409).json({ error: 'Email already registered' });
            }
            return res.status(400).json({ error: authError.message });
        }

        const userId = authData.user.id;

        // Update profile with role
        await supabaseAdmin
            .from('profiles')
            .update({
                role: assignedRole,
                full_name: fullName,
                username: username || email.split('@')[0],
            })
            .eq('id', userId);

        // If registering as artist, create artist profile
        if (assignedRole === 'artist') {
            await supabaseAdmin
                .from('artist_profiles')
                .insert({
                    user_id: userId,
                    artist_name: fullName,
                    status: 'pending', // Requires admin approval
                });
        }

        /* 
        // Generate and send verification email
        try {
            const token = await generateVerificationToken(userId);
            await sendVerificationEmail(email, fullName, token);
        } catch (emailError) {
            console.warn('Failed to send verification email:', emailError.message);
            // Don't fail registration if email fails
        }
        */

        // For now, auto-verify users
        await supabaseAdmin
            .from('profiles')
            .update({ email_verified: true })
            .eq('id', userId);
        await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });

        // Log activity
        await supabaseAdmin.from('activity_logs').insert({
            actor_id: userId,
            action: 'user.register',
            target_type: 'user',
            target_id: userId,
            details: { role: assignedRole, email },
        });

        res.status(201).json({
            message: 'Account created successfully. You can now sign in.',
            user: {
                id: userId,
                email,
                fullName,
                role: assignedRole,
                emailVerified: true,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing credentials',
                required: ['email', 'password'],
            });
        }

        // Sign in with Supabase Auth
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Fetch profile
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        // Check if account is active
        if (profile && !profile.is_active) {
            return res.status(403).json({
                error: 'Account suspended',
                message: 'Your account has been suspended. Contact support.',
            });
        }

        // Check email verification (Temporarily bypassed)
        const emailVerified = profile?.email_verified || true;

        /*
        if (!emailVerified) {
            try {
                const token = await generateVerificationToken(data.user.id);
                await sendVerificationEmail(email, profile?.full_name, token);
            } catch (err) {
                console.error('Failed to send verification email on login attempt:', err);
            }

            return res.status(403).json({
                error: 'Email not verified',
                message: 'Please verify your email address. A new verification link has been sent to your inbox.',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }
        */

        res.json({
            message: 'Login successful',
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
            },
            user: {
                id: data.user.id,
                email: data.user.email,
                fullName: profile?.full_name,
                username: profile?.username,
                role: profile?.role || 'listener',
                emailVerified,
                avatarUrl: profile?.avatar_url,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET /api/auth/verify-email?token=xxx
 * Verify email address via token from email link
 */
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Missing verification token' });
        }

        const result = await verifyToken(token);

        if (!result.success) {
            // Redirect to frontend with error
            return res.redirect(
                `${process.env.FRONTEND_URL}/verify-email?status=error&message=${encodeURIComponent(result.error)}`
            );
        }

        // Log activity
        await supabaseAdmin.from('activity_logs').insert({
            actor_id: result.userId,
            action: 'user.email_verified',
            target_type: 'user',
            target_id: result.userId,
        });

        // Redirect to frontend with success
        res.redirect(
            `${process.env.FRONTEND_URL}/verify-email?status=success`
        );
    } catch (error) {
        console.error('Email verification error:', error);
        res.redirect(
            `${process.env.FRONTEND_URL}/verify-email?status=error&message=An+error+occurred`
        );
    }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', authenticate, async (req, res) => {
    try {
        if (req.user.email_verified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        const token = await generateVerificationToken(req.user.id);
        await sendVerificationEmail(req.user.email, req.user.full_name, token);

        res.json({ message: 'Verification email sent' });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Failed to resend verification email' });
    }
});

/**
 * POST /api/auth/logout
 * Logout (invalidate session)
 */
router.post('/logout', authenticate, async (req, res) => {
    try {
        await supabaseAdmin.auth.admin.signOut(req.accessToken);
        res.json({ message: 'Logged out successfully' });
    } catch {
        res.json({ message: 'Logged out' });
    }
});

/**
 * GET /api/auth/me
 * Get current authenticated user's profile
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();

        // If user is an artist, include artist profile
        let artistProfile = null;
        if (profile.role === 'artist') {
            const { data } = await supabaseAdmin
                .from('artist_profiles')
                .select('*')
                .eq('user_id', req.user.id)
                .single();
            artistProfile = data;
        }

        res.json({
            user: {
                id: profile.id,
                email: profile.email,
                fullName: profile.full_name,
                username: profile.username,
                avatarUrl: profile.avatar_url,
                bio: profile.bio,
                role: profile.role,
                emailVerified: profile.email_verified,
                createdAt: profile.created_at,
            },
            artistProfile: artistProfile
                ? {
                    id: artistProfile.id,
                    artistName: artistProfile.artist_name,
                    genre: artistProfile.genre,
                    status: artistProfile.status,
                    verified: artistProfile.verified,
                    followerCount: artistProfile.follower_count,
                    totalEarnings: artistProfile.total_earnings,
                    pendingPayout: artistProfile.pending_payout,
                }
                : null,
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * PUT /api/auth/profile
 * Update current user's profile
 */
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { fullName, username, bio, phone } = req.body;

        const updates = {};
        if (fullName !== undefined) updates.full_name = fullName;
        if (username !== undefined) updates.username = username;
        if (bio !== undefined) updates.bio = bio;
        if (phone !== undefined) updates.phone = phone;

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) {
            if (error.message.includes('unique')) {
                return res.status(409).json({ error: 'Username already taken' });
            }
            throw error;
        }

        res.json({ message: 'Profile updated', profile: data });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
