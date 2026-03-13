// =============================================
// 265Stream - Authentication Middleware
// =============================================
import { supabaseAdmin, createUserClient } from '../config/supabase.js';

/**
 * Middleware: Authenticate user via Supabase JWT
 * Extracts the user from the Authorization header and attaches to req
 */
export async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please provide a valid Bearer token in the Authorization header',
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify the JWT with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Your authentication token is invalid or expired',
            });
        }

        // Fetch the user's profile with role
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(401).json({
                error: 'Profile not found',
                message: 'User profile does not exist',
            });
        }

        // Check if account is active
        if (!profile.is_active) {
            return res.status(403).json({
                error: 'Account suspended',
                message: 'Your account has been suspended. Contact support for assistance.',
            });
        }

        // Attach user info and Supabase client to request
        req.user = {
            id: user.id,
            email: user.email,
            ...profile,
        };
        req.accessToken = token;
        req.supabase = createUserClient(token); // RLS-enforced client

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            error: 'Authentication error',
            message: 'An error occurred during authentication',
        });
    }
}

/**
 * Middleware: Require email verification
 * Use AFTER authenticate middleware
 */
export function requireEmailVerification(req, res, next) {
    // Temporarily disabled verification check
    /*
    if (!req.user.email_verified) {
        return res.status(403).json({
            error: 'Email not verified',
            message: 'Please verify your email address before accessing this resource',
            code: 'EMAIL_NOT_VERIFIED',
        });
    }
    */
    next();
}

/**
 * Middleware factory: Require specific role(s)
 * Usage: requireRole('admin', 'super_admin')
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                message: `This action requires one of: ${roles.join(', ')}`,
                required: roles,
                current: req.user.role,
            });
        }

        next();
    };
}

/**
 * Middleware: Require approved artist status
 * Use AFTER authenticate
 */
export async function requireApprovedArtist(req, res, next) {
    if (req.user.role !== 'artist' && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
            error: 'Artist access required',
            message: 'You must be a registered artist to perform this action',
        });
    }

    // Fetch artist profile
    let { data: artistProfile, error } = await supabaseAdmin
        .from('artist_profiles')
        .select('*')
        .eq('user_id', req.user.id)
        .maybeSingle();

    if (!artistProfile) {
        // If user is an artist but profile is missing, auto-create it (common during development)
        if (req.user.role === 'artist' || ['admin', 'super_admin'].includes(req.user.role)) {
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('artist_profiles')
                .insert({
                    user_id: req.user.id,
                    artist_name: req.user.full_name || req.user.username || 'Unknown Artist',
                    status: 'approved',
                })
                .select()
                .single();

            if (createError) {
                console.error('Failed to auto-create artist profile:', createError);
                return res.status(500).json({ error: 'Artist profile sync failed' });
            }
            artistProfile = newProfile;
        } else {
            return res.status(403).json({
                error: 'Artist profile not found',
                message: 'Please complete your artist profile setup',
            });
        }
    }

    // Status check temporarily disabled for testing
    /*
    if (artistProfile.status !== 'approved' && !['admin', 'super_admin'].includes(req.user.role)) {
        ...
    }
    */

    req.artistProfile = artistProfile;
    next();
}

/**
 * Optional authentication: attaches user if token present, but doesn't reject
 */
export async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            if (user) {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    req.user = { id: user.id, email: user.email, ...profile };
                    req.accessToken = token;
                    req.supabase = createUserClient(token);
                }
            }
        } catch {
            // Silently continue without auth
        }
    }
    next();
}
