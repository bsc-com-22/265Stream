// =============================================
// 265Stream - Music Routes (Songs, Albums, Upload)
// =============================================
import { Router } from 'express';
import multer from 'multer';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate, requireEmailVerification, requireApprovedArtist, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Multer config for file uploads (memory storage -> stream to Supabase)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, cb) => {
        const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
        const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (file.fieldname === 'audio' && audioTypes.includes(file.mimetype)) {
            cb(null, true);
        } else if (file.fieldname === 'cover' && imageTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype} for field ${file.fieldname}`), false);
        }
    },
});


// ============================================
// PUBLIC ROUTES (browsing catalog)
// ============================================

/**
 * GET /api/music/songs
 * Browse published songs (public)
 */
router.get('/songs', optionalAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            genre,
            search,
            sort = 'newest',
            artist_id,
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabaseAdmin
            .from('songs')
            .select(`
        *,
        artist:artist_profiles(id, artist_name, user_id, verified)
      `, { count: 'exact' })
            .eq('status', 'published');

        // Filters
        if (genre) query = query.eq('genre', genre);
        if (artist_id) query = query.eq('artist_id', artist_id);
        if (search) {
            query = query.or(`title.ilike.%${search}%,album_name.ilike.%${search}%,genre.ilike.%${search}%`);
        }

        // Sorting
        switch (sort) {
            case 'popular': query = query.order('play_count', { ascending: false }); break;
            case 'best_selling': query = query.order('purchase_count', { ascending: false }); break;
            case 'price_low': query = query.order('price', { ascending: true }); break;
            case 'price_high': query = query.order('price', { ascending: false }); break;
            case 'oldest': query = query.order('release_date', { ascending: true }); break;
            default: query = query.order('release_date', { ascending: false }); // newest
        }

        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: songs, error, count } = await query;

        if (error) throw error;

        // Generate signed URLs for covers
        const songsWithUrls = await Promise.all(
            songs.map(async (song) => {
                let coverUrl = null;
                if (song.cover_storage_path) {
                    const { data } = await supabaseAdmin.storage
                        .from('cover-images')
                        .createSignedUrl(song.cover_storage_path, 3600); // 1 hour
                    coverUrl = data?.signedUrl;
                }

                // Check if current user has purchased
                let purchased = false;
                if (req.user) {
                    const { data: purchase } = await supabaseAdmin
                        .from('purchases')
                        .select('id')
                        .eq('buyer_id', req.user.id)
                        .eq('song_id', song.id)
                        .eq('status', 'completed')
                        .maybeSingle();
                    purchased = !!purchase;
                }

                return {
                    id: song.id,
                    title: song.title,
                    slug: song.slug,
                    genre: song.genre,
                    albumName: song.album_name,
                    duration: song.duration,
                    price: song.price,
                    isFree: song.is_free,
                    coverUrl,
                    playCount: song.play_count,
                    purchaseCount: song.purchase_count,
                    releaseDate: song.release_date,
                    artist: song.artist
                        ? {
                            id: song.artist.id,
                            name: song.artist.artist_name,
                            verified: song.artist.verified,
                        }
                        : null,
                    purchased,
                };
            })
        );

        res.json({
            songs: songsWithUrls,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching songs:', error);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});

/**
 * GET /api/music/songs/:id
 * Get a single song detail
 */
router.get('/songs/:id', optionalAuth, async (req, res) => {
    try {
        const { data: song, error } = await supabaseAdmin
            .from('songs')
            .select(`
        *,
        artist:artist_profiles(id, artist_name, user_id, verified, genre, bio, follower_count)
      `)
            .eq('id', req.params.id)
            .eq('status', 'published')
            .single();

        if (error || !song) {
            return res.status(404).json({ error: 'Song not found' });
        }

        // Cover signed URL
        let coverUrl = null;
        if (song.cover_storage_path) {
            const { data } = await supabaseAdmin.storage
                .from('cover-images')
                .createSignedUrl(song.cover_storage_path, 3600);
            coverUrl = data?.signedUrl;
        }

        // Check purchase status
        let purchased = false;
        if (req.user) {
            const { data: purchase } = await supabaseAdmin
                .from('purchases')
                .select('id')
                .eq('buyer_id', req.user.id)
                .eq('song_id', song.id)
                .eq('status', 'completed')
                .maybeSingle();
            purchased = !!purchase;
        }

        res.json({
            ...song,
            coverUrl,
            purchased,
            // Don't expose storage paths to the client
            audio_storage_path: undefined,
            cover_storage_path: undefined,
        });
    } catch (error) {
        console.error('Error fetching song:', error);
        res.status(500).json({ error: 'Failed to fetch song' });
    }
});

/**
 * GET /api/music/songs/:id/stream
 * Get a signed URL for streaming/downloading a purchased song
 * Only available after purchase verification
 */
router.get('/songs/:id/stream', authenticate, requireEmailVerification, async (req, res) => {
    try {
        const songId = req.params.id;
        const userId = req.user.id;

        // Fetch the song
        const { data: song, error: songError } = await supabaseAdmin
            .from('songs')
            .select('*')
            .eq('id', songId)
            .single();

        if (songError || !song) {
            return res.status(404).json({ error: 'Song not found' });
        }

        // Check if the user has purchased the song (or if it's free)
        if (!song.is_free) {
            const { data: purchase } = await supabaseAdmin
                .from('purchases')
                .select('id')
                .eq('buyer_id', userId)
                .eq('song_id', songId)
                .eq('status', 'completed')
                .maybeSingle();

            if (!purchase) {
                // Also check if user purchased the album containing this song
                const { data: albumSongs } = await supabaseAdmin
                    .from('album_songs')
                    .select('album_id')
                    .eq('song_id', songId);

                let hasAlbumPurchase = false;
                if (albumSongs?.length) {
                    const albumIds = albumSongs.map(as => as.album_id);
                    const { data: albumPurchase } = await supabaseAdmin
                        .from('purchases')
                        .select('id')
                        .eq('buyer_id', userId)
                        .in('album_id', albumIds)
                        .eq('status', 'completed')
                        .maybeSingle();
                    hasAlbumPurchase = !!albumPurchase;
                }

                if (!hasAlbumPurchase) {
                    return res.status(403).json({
                        error: 'Purchase required',
                        message: 'You must purchase this song before streaming or downloading',
                    });
                }
            }
        }

        // Generate a short-lived signed URL for the audio file
        const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
            .from('audio-files')
            .createSignedUrl(song.audio_storage_path, 600); // 10 minutes

        if (urlError) {
            throw urlError;
        }

        // Increment play count
        await supabaseAdmin.rpc('increment_play_count', { p_song_id: songId });

        // Log the stream
        await supabaseAdmin.from('stream_logs').insert({
            user_id: userId,
            song_id: songId,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
        });

        res.json({
            streamUrl: signedUrlData.signedUrl,
            expiresIn: 600,
            song: {
                id: song.id,
                title: song.title,
                duration: song.duration,
            },
        });
    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({ error: 'Failed to generate stream URL' });
    }
});

/**
 * GET /api/music/songs/:id/download
 * Get a signed URL for downloading a purchased song
 */
router.get('/songs/:id/download', authenticate, requireEmailVerification, async (req, res) => {
    try {
        const songId = req.params.id;

        // Fetch the song
        const { data: song } = await supabaseAdmin
            .from('songs')
            .select('*')
            .eq('id', songId)
            .single();

        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }

        // Verify purchase
        if (!song.is_free) {
            const hasPurchased = await supabaseAdmin.rpc('has_purchased_song', {
                p_user_id: req.user.id,
                p_song_id: songId,
            });

            if (!hasPurchased.data) {
                return res.status(403).json({
                    error: 'Purchase required',
                    message: 'You must purchase this song before downloading',
                });
            }
        }

        // Generate download URL (longer expiry)
        const { data: signedUrlData } = await supabaseAdmin.storage
            .from('audio-files')
            .createSignedUrl(song.audio_storage_path, 300, {
                download: `${song.title}.mp3`,
            });

        res.json({
            downloadUrl: signedUrlData.signedUrl,
            expiresIn: 300,
        });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to generate download URL' });
    }
});


// ============================================
// ARTIST ROUTES (upload, manage songs)
// ============================================

/**
 * POST /api/music/songs/upload
 * Upload a new song (artist only)
 */
router.post(
    '/songs/upload',
    authenticate,
    requireEmailVerification,
    requireApprovedArtist,
    upload.fields([
        { name: 'audio', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const { title, genre, albumName, price, description, releaseDate, isFree } = req.body;
            const audioFile = req.files?.audio?.[0];
            const coverFile = req.files?.cover?.[0];

            if (!title) {
                return res.status(400).json({ error: 'Song title is required' });
            }

            if (!audioFile) {
                return res.status(400).json({ error: 'Audio file is required' });
            }

            const artistProfile = req.artistProfile;
            const userId = req.user.id;

            // Generate unique slug
            const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

            console.log(`[Upload] Starting upload for: ${title} (slug: ${slug})`);

            // Upload audio file to Supabase Storage
            const audioFileName = `${userId}/${Date.now()}-${slug}.${audioFile.originalname.split('.').pop()}`;

            // Proactive check: Ensure bucket exists (or at least try to upload and catch)
            const { error: audioUploadError } = await supabaseAdmin.storage
                .from('audio-files')
                .upload(audioFileName, audioFile.buffer, {
                    contentType: audioFile.mimetype,
                    upsert: false,
                });

            if (audioUploadError) {
                console.error('[Upload] Audio storage error:', audioUploadError);
                return res.status(500).json({
                    error: 'Failed to upload audio file',
                    details: audioUploadError.message,
                    hint: 'Ensure the "audio-files" bucket exists in Supabase storage and is public/accessible.'
                });
            }

            // Upload cover image if provided
            let coverStoragePath = null;
            if (coverFile) {
                const coverFileName = `${userId}/${Date.now()}-${slug}-cover.${coverFile.originalname.split('.').pop()}`;
                const { error: coverUploadError } = await supabaseAdmin.storage
                    .from('cover-images')
                    .upload(coverFileName, coverFile.buffer, {
                        contentType: coverFile.mimetype,
                        upsert: false,
                    });

                if (coverUploadError) {
                    console.error('[Upload] Cover storage error:', coverUploadError);
                    // Cleanup audio file
                    await supabaseAdmin.storage.from('audio-files').remove([audioFileName]);
                    return res.status(500).json({
                        error: 'Failed to upload cover image',
                        details: coverUploadError.message,
                        hint: 'Ensure the "cover-images" bucket exists in Supabase storage.'
                    });
                }
                coverStoragePath = coverFileName;
            }

            // Create song record
            const { data: song, error: songError } = await supabaseAdmin
                .from('songs')
                .insert({
                    artist_id: artistProfile.id,
                    title,
                    slug,
                    description: description || '',
                    genre: genre || null,
                    album_name: albumName || null,
                    price: isFree === 'true' ? 0 : parseFloat(price) || 0.99,
                    is_free: isFree === 'true',
                    audio_storage_path: audioFileName,
                    cover_storage_path: coverStoragePath,
                    release_date: releaseDate || new Date().toISOString().split('T')[0],
                    status: 'pending_review',
                })
                .select()
                .single();

            if (songError) {
                console.error('[Upload] Database insert error:', songError);
                // Cleanup files
                await supabaseAdmin.storage.from('audio-files').remove([audioFileName]);
                if (coverStoragePath) {
                    await supabaseAdmin.storage.from('cover-images').remove([coverStoragePath]);
                }
                return res.status(500).json({
                    error: 'Failed to save song record',
                    details: songError.message
                });
            }

            console.log(`[Upload] Song uploaded successfully: ${song.id}`);

            // Log activity
            await supabaseAdmin.from('activity_logs').insert({
                actor_id: userId,
                action: 'song.upload',
                target_type: 'song',
                target_id: song.id,
                details: { title, genre },
            });

            res.status(201).json({
                message: 'Song uploaded successfully! It will be reviewed before publishing.',
                song: {
                    id: song.id,
                    title: song.title,
                    status: song.status,
                },
            });
        } catch (error) {
            console.error('[Upload] Unexpected server error:', error);
            res.status(500).json({ error: 'An unexpected error occurred during upload' });
        }
    }
);

/**
 * GET /api/music/artist/songs
 * Get all songs for the authenticated artist
 */
router.get('/artist/songs', authenticate, requireApprovedArtist, async (req, res) => {
    try {
        const { data: songs, error } = await supabaseAdmin
            .from('songs')
            .select('*')
            .eq('artist_id', req.artistProfile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Generate cover URLs
        const songsWithUrls = await Promise.all(
            songs.map(async (song) => {
                let coverUrl = null;
                if (song.cover_storage_path) {
                    const { data } = await supabaseAdmin.storage
                        .from('cover-images')
                        .createSignedUrl(song.cover_storage_path, 3600);
                    coverUrl = data?.signedUrl;
                }
                return { ...song, coverUrl, audio_storage_path: undefined };
            })
        );

        res.json({ songs: songsWithUrls });
    } catch (error) {
        console.error('Error fetching artist songs:', error);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});

/**
 * PUT /api/music/songs/:id
 * Update a song (artist owner or admin)
 */
router.put('/songs/:id', authenticate, async (req, res) => {
    try {
        const songId = req.params.id;
        const { title, genre, price, description, albumName } = req.body;

        // Verify ownership
        const { data: song } = await supabaseAdmin
            .from('songs')
            .select('*, artist:artist_profiles(user_id)')
            .eq('id', songId)
            .single();

        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }

        const isOwner = song.artist?.user_id === req.user.id;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized to edit this song' });
        }

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (genre !== undefined) updates.genre = genre;
        if (price !== undefined) updates.price = parseFloat(price);
        if (description !== undefined) updates.description = description;
        if (albumName !== undefined) updates.album_name = albumName;

        const { data: updated, error } = await supabaseAdmin
            .from('songs')
            .update(updates)
            .eq('id', songId)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Song updated', song: updated });
    } catch (error) {
        console.error('Update song error:', error);
        res.status(500).json({ error: 'Failed to update song' });
    }
});

/**
 * DELETE /api/music/songs/:id
 * Delete a song (artist owner or admin)
 */
router.delete('/songs/:id', authenticate, async (req, res) => {
    try {
        const songId = req.params.id;

        const { data: song } = await supabaseAdmin
            .from('songs')
            .select('*, artist:artist_profiles(user_id)')
            .eq('id', songId)
            .single();

        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }

        const isOwner = song.artist?.user_id === req.user.id;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized to delete this song' });
        }

        // Delete files from storage
        if (song.audio_storage_path) {
            await supabaseAdmin.storage.from('audio-files').remove([song.audio_storage_path]);
        }
        if (song.cover_storage_path) {
            await supabaseAdmin.storage.from('cover-images').remove([song.cover_storage_path]);
        }

        // Delete song record
        await supabaseAdmin.from('songs').delete().eq('id', songId);

        // Log activity
        await supabaseAdmin.from('activity_logs').insert({
            actor_id: req.user.id,
            action: 'song.delete',
            target_type: 'song',
            target_id: songId,
            details: { title: song.title, deletedBy: isAdmin ? 'admin' : 'artist' },
        });

        res.json({ message: 'Song deleted' });
    } catch (error) {
        console.error('Delete song error:', error);
        res.status(500).json({ error: 'Failed to delete song' });
    }
});


// ============================================
// ALBUMS
// ============================================

/**
 * GET /api/music/albums
 * Browse published albums
 */
router.get('/albums', async (req, res) => {
    try {
        const { data: albums, error } = await supabaseAdmin
            .from('albums')
            .select(`
        *,
        artist:artist_profiles(id, artist_name, verified),
        songs:album_songs(song:songs(id, title, duration, price))
      `)
            .eq('status', 'published')
            .order('release_date', { ascending: false });

        if (error) throw error;

        // Generate cover URLs
        const albumsWithUrls = await Promise.all(
            albums.map(async (album) => {
                let coverUrl = null;
                if (album.cover_storage_path) {
                    const { data } = await supabaseAdmin.storage
                        .from('cover-images')
                        .createSignedUrl(album.cover_storage_path, 3600);
                    coverUrl = data?.signedUrl;
                }
                return {
                    ...album,
                    coverUrl,
                    cover_storage_path: undefined,
                    songCount: album.songs?.length || 0,
                };
            })
        );

        res.json({ albums: albumsWithUrls });
    } catch (error) {
        console.error('Error fetching albums:', error);
        res.status(500).json({ error: 'Failed to fetch albums' });
    }
});

/**
 * GET /api/music/artists
 * Browse approved artists
 */
router.get('/artists', async (req, res) => {
    try {
        const { data: artists, error } = await supabaseAdmin
            .from('artist_profiles')
            .select(`
        id, artist_name, genre, bio, verified, follower_count,
        user:profiles!artist_profiles_user_id_fkey(avatar_url)
      `)
            .eq('status', 'approved')
            .order('follower_count', { ascending: false });

        if (error) throw error;

        res.json({ artists });
    } catch (error) {
        console.error('Error fetching artists:', error);
        res.status(500).json({ error: 'Failed to fetch artists' });
    }
});

export default router;
