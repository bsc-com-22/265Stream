// =============================================
// 265Stream - Admin Routes
// =============================================
import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication + admin/super_admin role
router.use(authenticate);
router.use(requireRole('admin', 'super_admin'));


// ============================================
// DASHBOARD OVERVIEW
// ============================================

/**
 * GET /api/admin/dashboard
 * Get platform overview statistics
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Total users
        const { count: totalUsers } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // Total artists
        const { count: totalArtists } = await supabaseAdmin
            .from('artist_profiles')
            .select('*', { count: 'exact', head: true });

        // Total songs
        const { count: totalSongs } = await supabaseAdmin
            .from('songs')
            .select('*', { count: 'exact', head: true });

        // Total purchases
        const { count: totalPurchases } = await supabaseAdmin
            .from('purchases')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed');

        // Total revenue
        const { data: revenueData } = await supabaseAdmin
            .from('purchases')
            .select('amount, platform_fee')
            .eq('status', 'completed');

        const totalRevenue = revenueData?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
        const platformRevenue = revenueData?.reduce((sum, p) => sum + parseFloat(p.platform_fee), 0) || 0;

        // Pending reviews
        const { count: pendingReviews } = await supabaseAdmin
            .from('songs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_review');

        // Pending artist approvals
        const { count: pendingArtists } = await supabaseAdmin
            .from('artist_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        // Recent activity
        const { data: recentActivity } = await supabaseAdmin
            .from('activity_logs')
            .select(`
        *,
        actor:profiles!activity_logs_actor_id_fkey(full_name, avatar_url)
      `)
            .order('created_at', { ascending: false })
            .limit(20);

        res.json({
            stats: {
                totalUsers,
                totalArtists,
                totalSongs,
                totalPurchases,
                totalRevenue: totalRevenue.toFixed(2),
                platformRevenue: platformRevenue.toFixed(2),
                pendingReviews,
                pendingArtists,
            },
            recentActivity: recentActivity || [],
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});


// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /api/admin/users
 * List all users with filters
 */
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, role, search, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact' });

        if (role) query = query.eq('role', role);
        if (status === 'active') query = query.eq('is_active', true);
        if (status === 'suspended') query = query.eq('is_active', false);
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
        }

        query = query.order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            users: data,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: count },
        });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * PUT /api/admin/users/:id/role
 * Change a user's role (super_admin only for admin/super_admin assignments)
 */
router.put('/users/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const validRoles = ['listener', 'artist', 'admin', 'super_admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Only super_admin can assign admin or super_admin roles
        if (['admin', 'super_admin'].includes(role) && req.user.role !== 'super_admin') {
            return res.status(403).json({
                error: 'Only super_admin can assign admin privileges',
            });
        }

        // Can't change own role to lower
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot change your own role' });
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ role })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // If changing to artist, create artist profile if not exists
        if (role === 'artist') {
            const { data: existingProfile } = await supabaseAdmin
                .from('artist_profiles')
                .select('id')
                .eq('user_id', id)
                .maybeSingle();

            if (!existingProfile) {
                await supabaseAdmin.from('artist_profiles').insert({
                    user_id: id,
                    artist_name: data.full_name,
                    status: 'approved',
                });
            }
        }

        // Log activity
        await supabaseAdmin.from('activity_logs').insert({
            actor_id: req.user.id,
            action: 'user.role_change',
            target_type: 'user',
            target_id: id,
            details: { newRole: role, previousRole: data.role },
        });

        res.json({ message: `User role updated to ${role}`, user: data });
    } catch (error) {
        console.error('Role change error:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

/**
 * PUT /api/admin/users/:id/suspend
 * Suspend or reactivate a user
 */
router.put('/users/:id/suspend', async (req, res) => {
    try {
        const { id } = req.params;
        const { suspended, reason } = req.body;

        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot suspend yourself' });
        }

        // Check target user's role - can't suspend super_admins
        const { data: targetUser } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', id)
            .single();

        if (targetUser?.role === 'super_admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Cannot suspend a super_admin' });
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ is_active: !suspended })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Log activity
        await supabaseAdmin.from('activity_logs').insert({
            actor_id: req.user.id,
            action: suspended ? 'user.suspend' : 'user.reactivate',
            target_type: 'user',
            target_id: id,
            details: { reason },
        });

        res.json({
            message: suspended ? 'User suspended' : 'User reactivated',
            user: data,
        });
    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});


// ============================================
// ARTIST MANAGEMENT
// ============================================

/**
 * GET /api/admin/artists
 * List all artist profiles
 */
router.get('/artists', async (req, res) => {
    try {
        const { status, search } = req.query;

        let query = supabaseAdmin
            .from('artist_profiles')
            .select(`
        *,
        user:profiles!artist_profiles_user_id_fkey(id, full_name, email, avatar_url, is_active)
      `);

        if (status) query = query.eq('status', status);
        if (search) query = query.ilike('artist_name', `%${search}%`);

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        res.json({ artists: data });
    } catch (error) {
        console.error('List artists error:', error);
        res.status(500).json({ error: 'Failed to fetch artists' });
    }
});

/**
 * PUT /api/admin/artists/:id/approve
 * Approve or reject an artist application
 */
router.put('/artists/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;

        const newStatus = approved ? 'approved' : 'suspended';

        const { data, error } = await supabaseAdmin
            .from('artist_profiles')
            .update({
                status: newStatus,
                approved_at: approved ? new Date().toISOString() : null,
                approved_by: req.user.id,
            })
            .eq('id', id)
            .select('*, user:profiles!artist_profiles_user_id_fkey(id, email, full_name)')
            .single();

        if (error) throw error;

        // If approved, update user role to artist
        if (approved && data.user) {
            await supabaseAdmin
                .from('profiles')
                .update({ role: 'artist' })
                .eq('id', data.user.id);
        }

        // Log activity
        await supabaseAdmin.from('activity_logs').insert({
            actor_id: req.user.id,
            action: approved ? 'artist.approve' : 'artist.reject',
            target_type: 'artist',
            target_id: id,
        });

        res.json({
            message: approved ? 'Artist approved' : 'Artist application rejected',
            artist: data,
        });
    } catch (error) {
        console.error('Artist approval error:', error);
        res.status(500).json({ error: 'Failed to update artist status' });
    }
});

/**
 * PUT /api/admin/artists/:id/verify
 * Toggle artist verification badge
 */
router.put('/artists/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const { verified } = req.body;

        const { data, error } = await supabaseAdmin
            .from('artist_profiles')
            .update({ verified: !!verified })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await supabaseAdmin.from('activity_logs').insert({
            actor_id: req.user.id,
            action: verified ? 'artist.verify' : 'artist.unverify',
            target_type: 'artist',
            target_id: id,
        });

        res.json({ message: verified ? 'Artist verified' : 'Verification removed', artist: data });
    } catch (error) {
        console.error('Verify artist error:', error);
        res.status(500).json({ error: 'Failed to update verification' });
    }
});


// ============================================
// CONTENT MODERATION
// ============================================

/**
 * GET /api/admin/content
 * List all songs for moderation
 */
router.get('/content', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabaseAdmin
            .from('songs')
            .select(`
        *,
        artist:artist_profiles(id, artist_name, user_id, verified)
      `, { count: 'exact' });

        if (status) query = query.eq('status', status);

        query = query.order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            songs: data,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: count },
        });
    } catch (error) {
        console.error('Content moderation error:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

/**
 * PUT /api/admin/content/:id/moderate
 * Approve, flag, or remove a song
 */
router.put('/content/:id/moderate', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['published', 'flagged', 'removed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const { data, error } = await supabaseAdmin
            .from('songs')
            .update({
                status,
                moderated_by: req.user.id,
                moderated_at: new Date().toISOString(),
                moderation_notes: notes || null,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // If removed, also clean up storage files
        if (status === 'removed') {
            if (data.audio_storage_path) {
                await supabaseAdmin.storage.from('audio-files').remove([data.audio_storage_path]);
            }
            if (data.cover_storage_path) {
                await supabaseAdmin.storage.from('cover-images').remove([data.cover_storage_path]);
            }
        }

        await supabaseAdmin.from('activity_logs').insert({
            actor_id: req.user.id,
            action: `content.${status}`,
            target_type: 'song',
            target_id: id,
            details: { notes, title: data.title },
        });

        res.json({ message: `Song ${status}`, song: data });
    } catch (error) {
        console.error('Moderation error:', error);
        res.status(500).json({ error: 'Failed to moderate content' });
    }
});


// ============================================
// PURCHASE MANAGEMENT
// ============================================

/**
 * GET /api/admin/purchases
 * List all purchases
 */
router.get('/purchases', async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabaseAdmin
            .from('purchases')
            .select(`
        *,
        buyer:profiles!purchases_buyer_id_fkey(id, full_name, email),
        song:songs(id, title),
        album:albums(id, title),
        artist:artist_profiles(id, artist_name)
      `, { count: 'exact' });

        if (status) query = query.eq('status', status);

        query = query.order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            purchases: data,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: count },
        });
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({ error: 'Failed to fetch purchases' });
    }
});


// ============================================
// PLATFORM SETTINGS (super_admin only)
// ============================================

/**
 * GET /api/admin/settings
 * Get all platform settings
 */
router.get('/settings', requireRole('super_admin'), async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('platform_settings')
            .select('*')
            .order('key');

        if (error) throw error;

        res.json({ settings: data });
    } catch (error) {
        console.error('Settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * PUT /api/admin/settings/:key
 * Update a platform setting (super_admin only)
 */
router.put('/settings/:key', requireRole('super_admin'), async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        const { data, error } = await supabaseAdmin
            .from('platform_settings')
            .update({
                value: JSON.stringify(value),
                updated_by: req.user.id,
                updated_at: new Date().toISOString(),
            })
            .eq('key', key)
            .select()
            .single();

        if (error) throw error;

        await supabaseAdmin.from('activity_logs').insert({
            actor_id: req.user.id,
            action: 'settings.update',
            target_type: 'setting',
            details: { key, value },
        });

        res.json({ message: 'Setting updated', setting: data });
    } catch (error) {
        console.error('Setting update error:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});


// ============================================
// ACTIVITY LOGS
// ============================================

/**
 * GET /api/admin/activity-logs
 * Get platform activity logs
 */
router.get('/activity-logs', async (req, res) => {
    try {
        const { page = 1, limit = 50, action, actor_id } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabaseAdmin
            .from('activity_logs')
            .select(`
        *,
        actor:profiles!activity_logs_actor_id_fkey(id, full_name, email, avatar_url)
      `, { count: 'exact' });

        if (action) query = query.eq('action', action);
        if (actor_id) query = query.eq('actor_id', actor_id);

        query = query.order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            logs: data,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: count },
        });
    } catch (error) {
        console.error('Activity logs error:', error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
});

/**
 * GET /api/admin/analytics
 * Platform analytics (super_admin)
 */
router.get('/analytics', requireRole('super_admin'), async (req, res) => {
    try {
        // Revenue by month (last 12 months)
        const { data: monthlyRevenue } = await supabaseAdmin.rpc('get_monthly_revenue').catch(() => ({ data: [] }));

        // Top selling songs
        const { data: topSongs } = await supabaseAdmin
            .from('songs')
            .select('id, title, purchase_count, play_count, price, artist:artist_profiles(artist_name)')
            .eq('status', 'published')
            .order('purchase_count', { ascending: false })
            .limit(10);

        // Top artists by revenue
        const { data: topArtists } = await supabaseAdmin
            .from('artist_profiles')
            .select('id, artist_name, total_earnings, follower_count, verified')
            .eq('status', 'approved')
            .order('total_earnings', { ascending: false })
            .limit(10);

        // User registrations (last 30 days count)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { count: newUsers } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo);

        res.json({
            monthlyRevenue: monthlyRevenue || [],
            topSongs: topSongs || [],
            topArtists: topArtists || [],
            newUsersLast30Days: newUsers || 0,
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

export default router;
