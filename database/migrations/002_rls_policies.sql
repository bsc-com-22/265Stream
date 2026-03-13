-- =============================================
-- 265Stream - Row Level Security Policies
-- Migration 002: RLS Policies
-- Run this in the Supabase SQL Editor AFTER migration 001
-- =============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Anyone can view basic profile info (for artist pages, etc.)
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent users from changing their own role
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can update any profile (including role changes)
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Only super_admin can assign admin/super_admin roles
-- (enforced at API level, but extra safety here)
CREATE POLICY "profiles_admin_role_assignment"
  ON public.profiles FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR (
      auth.uid() = id
      AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    )
  );


-- ============================================
-- ARTIST PROFILES POLICIES
-- ============================================

-- Anyone can view approved artists
CREATE POLICY "artist_profiles_select_public"
  ON public.artist_profiles FOR SELECT
  USING (
    status = 'approved'
    OR user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- Users can create their own artist profile
CREATE POLICY "artist_profiles_insert_own"
  ON public.artist_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Artists can update their own artist profile (except status/verified)
CREATE POLICY "artist_profiles_update_own"
  ON public.artist_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND status = (SELECT status FROM public.artist_profiles WHERE user_id = auth.uid())
    AND verified = (SELECT verified FROM public.artist_profiles WHERE user_id = auth.uid())
  );

-- Admins can update any artist profile (approve, suspend, verify)
CREATE POLICY "artist_profiles_update_admin"
  ON public.artist_profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Admins can delete artist profiles
CREATE POLICY "artist_profiles_delete_admin"
  ON public.artist_profiles FOR DELETE
  USING (public.is_admin(auth.uid()));


-- ============================================
-- SONGS POLICIES
-- ============================================

-- Anyone can view published songs
CREATE POLICY "songs_select_published"
  ON public.songs FOR SELECT
  USING (
    status = 'published'
    OR artist_id IN (SELECT id FROM public.artist_profiles WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Artists can insert songs linked to their own artist profile
CREATE POLICY "songs_insert_artist"
  ON public.songs FOR INSERT
  WITH CHECK (
    artist_id IN (
      SELECT id FROM public.artist_profiles
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

-- Artists can update their own songs
CREATE POLICY "songs_update_artist"
  ON public.songs FOR UPDATE
  USING (
    artist_id IN (SELECT id FROM public.artist_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    artist_id IN (SELECT id FROM public.artist_profiles WHERE user_id = auth.uid())
  );

-- Admins can update any song (moderation)
CREATE POLICY "songs_update_admin"
  ON public.songs FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Artists can delete their own songs; admins can delete any
CREATE POLICY "songs_delete_own_or_admin"
  ON public.songs FOR DELETE
  USING (
    artist_id IN (SELECT id FROM public.artist_profiles WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );


-- ============================================
-- ALBUMS POLICIES
-- ============================================

-- Anyone can view published albums
CREATE POLICY "albums_select_published"
  ON public.albums FOR SELECT
  USING (
    status = 'published'
    OR artist_id IN (SELECT id FROM public.artist_profiles WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Artists can insert albums
CREATE POLICY "albums_insert_artist"
  ON public.albums FOR INSERT
  WITH CHECK (
    artist_id IN (
      SELECT id FROM public.artist_profiles
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

-- Artists can update own albums, admins can update any
CREATE POLICY "albums_update_own_or_admin"
  ON public.albums FOR UPDATE
  USING (
    artist_id IN (SELECT id FROM public.artist_profiles WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Artists can delete own albums, admins can delete any
CREATE POLICY "albums_delete_own_or_admin"
  ON public.albums FOR DELETE
  USING (
    artist_id IN (SELECT id FROM public.artist_profiles WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );


-- ============================================
-- ALBUM_SONGS POLICIES
-- ============================================

CREATE POLICY "album_songs_select_public"
  ON public.album_songs FOR SELECT
  USING (true);

CREATE POLICY "album_songs_insert_artist"
  ON public.album_songs FOR INSERT
  WITH CHECK (
    album_id IN (
      SELECT a.id FROM public.albums a
      JOIN public.artist_profiles ap ON a.artist_id = ap.id
      WHERE ap.user_id = auth.uid()
    )
  );

CREATE POLICY "album_songs_delete_artist_or_admin"
  ON public.album_songs FOR DELETE
  USING (
    album_id IN (
      SELECT a.id FROM public.albums a
      JOIN public.artist_profiles ap ON a.artist_id = ap.id
      WHERE ap.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );


-- ============================================
-- PURCHASES POLICIES
-- ============================================

-- Users can view their own purchases
CREATE POLICY "purchases_select_own"
  ON public.purchases FOR SELECT
  USING (buyer_id = auth.uid());

-- Artists can view purchases of their songs (to see buyers/revenue)
CREATE POLICY "purchases_select_artist"
  ON public.purchases FOR SELECT
  USING (
    artist_id IN (SELECT id FROM public.artist_profiles WHERE user_id = auth.uid())
  );

-- Admins can view all purchases
CREATE POLICY "purchases_select_admin"
  ON public.purchases FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Purchases are created through the API (service role), not directly by users
-- But we allow insert for authenticated users through the API
CREATE POLICY "purchases_insert_authenticated"
  ON public.purchases FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

-- Only admins/super_admins can update purchases (refunds)
CREATE POLICY "purchases_update_admin"
  ON public.purchases FOR UPDATE
  USING (public.is_admin(auth.uid()));


-- ============================================
-- PAYOUTS POLICIES
-- ============================================

-- Artists can view their own payouts
CREATE POLICY "payouts_select_own"
  ON public.payouts FOR SELECT
  USING (
    artist_id IN (SELECT id FROM public.artist_profiles WHERE user_id = auth.uid())
  );

-- Admins can view all payouts
CREATE POLICY "payouts_select_admin"
  ON public.payouts FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Only admins can create/update payouts
CREATE POLICY "payouts_insert_admin"
  ON public.payouts FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "payouts_update_admin"
  ON public.payouts FOR UPDATE
  USING (public.is_admin(auth.uid()));


-- ============================================
-- FAVORITES POLICIES
-- ============================================

-- Users can view their own favorites
CREATE POLICY "favorites_select_own"
  ON public.favorites FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own favorites
CREATE POLICY "favorites_insert_own"
  ON public.favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own favorites
CREATE POLICY "favorites_delete_own"
  ON public.favorites FOR DELETE
  USING (user_id = auth.uid());


-- ============================================
-- STREAM LOGS POLICIES
-- ============================================

-- Users can insert their own stream logs
CREATE POLICY "stream_logs_insert_authenticated"
  ON public.stream_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Artists can view stream logs for their songs
CREATE POLICY "stream_logs_select_artist"
  ON public.stream_logs FOR SELECT
  USING (
    song_id IN (
      SELECT s.id FROM public.songs s
      JOIN public.artist_profiles ap ON s.artist_id = ap.id
      WHERE ap.user_id = auth.uid()
    )
  );

-- Admins can view all stream logs
CREATE POLICY "stream_logs_select_admin"
  ON public.stream_logs FOR SELECT
  USING (public.is_admin(auth.uid()));


-- ============================================
-- ACTIVITY LOGS POLICIES
-- ============================================

-- Only admins can view activity logs
CREATE POLICY "activity_logs_select_admin"
  ON public.activity_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Activity logs are inserted by the service role (backend API)
-- No direct insert policy needed for regular users


-- ============================================
-- PLATFORM SETTINGS POLICIES
-- ============================================

-- Anyone can read platform settings (needed for client config)
CREATE POLICY "platform_settings_select_public"
  ON public.platform_settings FOR SELECT
  USING (true);

-- Only super_admins can modify platform settings
CREATE POLICY "platform_settings_update_super_admin"
  ON public.platform_settings FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "platform_settings_insert_super_admin"
  ON public.platform_settings FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));


-- ============================================
-- EMAIL VERIFICATION TOKENS POLICIES
-- ============================================

-- Users can view their own tokens
CREATE POLICY "email_tokens_select_own"
  ON public.email_verification_tokens FOR SELECT
  USING (user_id = auth.uid());

-- Tokens are created/consumed by the service role (backend API)
-- No direct insert/update policies for users
