// =============================================
// 265Stream - Purchase Routes
// =============================================
import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate, requireEmailVerification, requireRole } from '../middleware/auth.js';
import { sendPurchaseReceiptEmail } from '../services/emailService.js';

const router = Router();

/**
 * POST /api/purchases/song/:songId
 * Purchase a song
 */
router.post('/song/:songId', authenticate, requireEmailVerification, async (req, res) => {
    try {
        const { songId } = req.params;
        const buyerId = req.user.id;
        const { paymentMethod = 'card', paymentReference } = req.body;

        // Fetch song with artist info
        const { data: song, error: songError } = await supabaseAdmin
            .from('songs')
            .select('*, artist:artist_profiles(id, user_id, commission_rate, artist_name)')
            .eq('id', songId)
            .eq('status', 'published')
            .single();

        if (songError || !song) {
            return res.status(404).json({ error: 'Song not found' });
        }

        // Check if already purchased
        const { data: existingPurchase } = await supabaseAdmin
            .from('purchases')
            .select('id')
            .eq('buyer_id', buyerId)
            .eq('song_id', songId)
            .eq('status', 'completed')
            .maybeSingle();

        if (existingPurchase) {
            return res.status(409).json({
                error: 'Already purchased',
                message: 'You have already purchased this song',
            });
        }

        // Can't purchase own songs
        if (song.artist?.user_id === buyerId) {
            return res.status(400).json({ error: 'Cannot purchase your own song' });
        }

        // Free songs don't require payment
        if (song.is_free) {
            // Create a free purchase record
            const { data: purchase, error: purchaseError } = await supabaseAdmin
                .from('purchases')
                .insert({
                    buyer_id: buyerId,
                    song_id: songId,
                    artist_id: song.artist.id,
                    amount: 0,
                    platform_fee: 0,
                    artist_earnings: 0,
                    payment_method: 'free',
                    status: 'completed',
                })
                .select()
                .single();

            if (purchaseError) throw purchaseError;

            // Increment purchase count
            await supabaseAdmin
                .from('songs')
                .update({ purchase_count: song.purchase_count + 1 })
                .eq('id', songId);

            return res.status(201).json({
                message: 'Song added to your library',
                purchase: { id: purchase.id, amount: 0 },
            });
        }

        // Calculate fees
        const commissionRate = song.artist?.commission_rate || 0.30;
        const platformFee = parseFloat((song.price * commissionRate).toFixed(2));
        const artistEarnings = parseFloat((song.price - platformFee).toFixed(2));

        // --- Payment processing would go here ---
        // In production, integrate with Stripe, PayPal, etc.
        // For now, we simulate a successful payment

        // Create purchase record
        const { data: purchase, error: purchaseError } = await supabaseAdmin
            .from('purchases')
            .insert({
                buyer_id: buyerId,
                song_id: songId,
                artist_id: song.artist.id,
                amount: song.price,
                platform_fee: platformFee,
                artist_earnings: artistEarnings,
                payment_method: paymentMethod,
                payment_reference: paymentReference || `sim_${Date.now()}`,
                status: 'completed',
            })
            .select()
            .single();

        if (purchaseError) throw purchaseError;

        // Update song purchase count
        await supabaseAdmin
            .from('songs')
            .update({ purchase_count: song.purchase_count + 1 })
            .eq('id', songId);

        // Update artist earnings
        await supabaseAdmin
            .from('artist_profiles')
            .update({
                total_earnings: song.artist.total_earnings
                    ? parseFloat(song.artist.total_earnings) + artistEarnings
                    : artistEarnings,
                pending_payout: song.artist.pending_payout
                    ? parseFloat(song.artist.pending_payout) + artistEarnings
                    : artistEarnings,
            })
            .eq('id', song.artist.id);

        // Send receipt email (non-blocking)
        sendPurchaseReceiptEmail(
            req.user.email,
            req.user.full_name,
            song.title,
            song.artist.artist_name,
            song.price
        ).catch(() => { });

        // Log activity
        await supabaseAdmin.from('activity_logs').insert({
            actor_id: buyerId,
            action: 'purchase.completed',
            target_type: 'song',
            target_id: songId,
            details: {
                amount: song.price,
                artistEarnings,
                platformFee,
            },
        });

        res.status(201).json({
            message: 'Purchase successful!',
            purchase: {
                id: purchase.id,
                songId,
                amount: song.price,
                songTitle: song.title,
                artist: song.artist.artist_name,
            },
        });
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ error: 'Purchase failed' });
    }
});

/**
 * POST /api/purchases/album/:albumId
 * Purchase an album (all songs included)
 */
router.post('/album/:albumId', authenticate, requireEmailVerification, async (req, res) => {
    try {
        const { albumId } = req.params;
        const buyerId = req.user.id;
        const { paymentMethod = 'card', paymentReference } = req.body;

        // Fetch album
        const { data: album, error: albumError } = await supabaseAdmin
            .from('albums')
            .select('*, artist:artist_profiles(id, user_id, commission_rate, artist_name)')
            .eq('id', albumId)
            .eq('status', 'published')
            .single();

        if (albumError || !album) {
            return res.status(404).json({ error: 'Album not found' });
        }

        // Check existing purchase
        const { data: existing } = await supabaseAdmin
            .from('purchases')
            .select('id')
            .eq('buyer_id', buyerId)
            .eq('album_id', albumId)
            .eq('status', 'completed')
            .maybeSingle();

        if (existing) {
            return res.status(409).json({ error: 'Already purchased this album' });
        }

        // Calculate fees
        const commissionRate = album.artist?.commission_rate || 0.30;
        const platformFee = parseFloat((album.price * commissionRate).toFixed(2));
        const artistEarnings = parseFloat((album.price - platformFee).toFixed(2));

        // Create purchase
        const { data: purchase, error: purchaseError } = await supabaseAdmin
            .from('purchases')
            .insert({
                buyer_id: buyerId,
                album_id: albumId,
                artist_id: album.artist.id,
                amount: album.price,
                platform_fee: platformFee,
                artist_earnings: artistEarnings,
                payment_method: paymentMethod,
                payment_reference: paymentReference || `sim_${Date.now()}`,
                status: 'completed',
            })
            .select()
            .single();

        if (purchaseError) throw purchaseError;

        // Update album purchase count
        await supabaseAdmin
            .from('albums')
            .update({ purchase_count: album.purchase_count + 1 })
            .eq('id', albumId);

        // Update artist earnings
        await supabaseAdmin.rpc('increment_artist_earnings', {
            p_artist_id: album.artist.id,
            p_amount: artistEarnings,
        }).catch(() => {
            // Fallback if RPC doesn't exist
            supabaseAdmin
                .from('artist_profiles')
                .update({
                    total_earnings: parseFloat(album.artist.total_earnings || 0) + artistEarnings,
                    pending_payout: parseFloat(album.artist.pending_payout || 0) + artistEarnings,
                })
                .eq('id', album.artist.id);
        });

        res.status(201).json({
            message: 'Album purchased successfully!',
            purchase: {
                id: purchase.id,
                albumId,
                amount: album.price,
            },
        });
    } catch (error) {
        console.error('Album purchase error:', error);
        res.status(500).json({ error: 'Purchase failed' });
    }
});

/**
 * GET /api/purchases
 * Get purchase history for the authenticated user
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { data: purchasesData, error, count } = await supabaseAdmin
            .from('purchases')
            .select(`
        *,
        song:songs(id, title, genre, duration, cover_storage_path),
        album:albums(id, title, cover_storage_path),
        artist:artist_profiles(id, artist_name)
      `, { count: 'exact' })
            .eq('buyer_id', req.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        // Generate cover URLs
        const purchasesWithUrls = await Promise.all(
            purchasesData.map(async (p) => {
                let coverUrl = null;
                const coverPath = p.song?.cover_storage_path || p.album?.cover_storage_path;
                if (coverPath) {
                    const { data } = await supabaseAdmin.storage
                        .from('cover-images')
                        .createSignedUrl(coverPath, 3600);
                    coverUrl = data?.signedUrl;
                }
                return {
                    id: p.id,
                    amount: p.amount,
                    paymentMethod: p.payment_method,
                    status: p.status,
                    createdAt: p.created_at,
                    song: p.song ? { id: p.song.id, title: p.song.title, genre: p.song.genre, coverUrl } : null,
                    album: p.album ? { id: p.album.id, title: p.album.title, coverUrl } : null,
                    artist: p.artist ? { id: p.artist.id, name: p.artist.artist_name } : null,
                };
            })
        );

        res.json({
            purchases: purchasesWithUrls,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({ error: 'Failed to fetch purchases' });
    }
});

/**
 * GET /api/purchases/artist
 * Get sales data for the authenticated artist
 */
router.get('/artist', authenticate, async (req, res) => {
    try {
        // Get artist profile
        const { data: artistProfile } = await supabaseAdmin
            .from('artist_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!artistProfile) {
            return res.status(403).json({ error: 'Not an artist' });
        }

        const { data: salesData, error } = await supabaseAdmin
            .from('purchases')
            .select(`
        *,
        song:songs(id, title, cover_storage_path),
        buyer:profiles!purchases_buyer_id_fkey(id, full_name, email, avatar_url)
      `)
            .eq('artist_id', artistProfile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Calculate totals
        const totalSales = salesData.length;
        const totalRevenue = salesData.reduce((sum, p) => sum + parseFloat(p.artist_earnings), 0);

        res.json({
            sales: salesData.map(s => ({
                id: s.id,
                amount: s.amount,
                artistEarnings: s.artist_earnings,
                platformFee: s.platform_fee,
                paymentMethod: s.payment_method,
                status: s.status,
                createdAt: s.created_at,
                song: s.song ? { id: s.song.id, title: s.song.title } : null,
                buyer: s.buyer ? { id: s.buyer.id, name: s.buyer.full_name } : null,
            })),
            summary: {
                totalSales,
                totalRevenue: totalRevenue.toFixed(2),
            },
        });
    } catch (error) {
        console.error('Error fetching artist sales:', error);
        res.status(500).json({ error: 'Failed to fetch sales data' });
    }
});

/**
 * POST /api/purchases/:id/refund
 * Refund a purchase (admin/super_admin only)
 */
router.post('/:id/refund', authenticate, requireRole('admin', 'super_admin'), async (req, res) => {
    try {
        const purchaseId = req.params.id;
        const { reason } = req.body;

        const { data: purchase, error: fetchError } = await supabaseAdmin
            .from('purchases')
            .select('*')
            .eq('id', purchaseId)
            .single();

        if (fetchError || !purchase) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        if (purchase.status === 'refunded') {
            return res.status(400).json({ error: 'Already refunded' });
        }

        // Update purchase status
        await supabaseAdmin
            .from('purchases')
            .update({
                status: 'refunded',
                refunded_at: new Date().toISOString(),
                refunded_by: req.user.id,
            })
            .eq('id', purchaseId);

        // Deduct artist earnings
        await supabaseAdmin
            .from('artist_profiles')
            .update({
                total_earnings: supabaseAdmin.rpc('subtract_earnings', {
                    p_artist_id: purchase.artist_id,
                    p_amount: purchase.artist_earnings,
                }),
                pending_payout: supabaseAdmin.rpc('subtract_payout', {
                    p_artist_id: purchase.artist_id,
                    p_amount: purchase.artist_earnings,
                }),
            })
            .eq('id', purchase.artist_id)
            .catch(() => {
                // Manual fallback
                supabaseAdmin.rpc('adjust_artist_balance', {
                    p_id: purchase.artist_id,
                    p_earnings: -purchase.artist_earnings,
                });
            });

        // Log activity
        await supabaseAdmin.from('activity_logs').insert({
            actor_id: req.user.id,
            action: 'purchase.refund',
            target_type: 'purchase',
            target_id: purchaseId,
            details: { reason, amount: purchase.amount },
        });

        res.json({ message: 'Purchase refunded successfully' });
    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({ error: 'Refund failed' });
    }
});

export default router;
