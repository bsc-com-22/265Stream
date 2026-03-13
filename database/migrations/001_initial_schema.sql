-- =============================================
-- 265Stream Database Schema
-- Migration 001: Initial Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- ============================================
-- 1. CUSTOM TYPES
-- ============================================

-- User roles enum
CREATE TYPE public.user_role AS ENUM ('listener', 'artist', 'admin', 'super_admin');

-- Artist account status
CREATE TYPE public.artist_status AS ENUM ('pending', 'approved', 'suspended');

-- Song/album moderation status
CREATE TYPE public.content_status AS ENUM ('pending_review', 'published', 'flagged', 'removed');

-- Purchase status
CREATE TYPE public.purchase_status AS ENUM ('completed', 'refunded', 'disputed');

-- Payout status
CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');


-- ============================================
-- 2. PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  phone TEXT,
  role public.user_role NOT NULL DEFAULT 'listener',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for role-based queries
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_username ON public.profiles(username);


-- ============================================
-- 3. ARTIST PROFILES TABLE
-- Additional data for users with 'artist' role
-- ============================================

CREATE TABLE public.artist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  genre TEXT,
  bio TEXT DEFAULT '',
  website TEXT,
  social_links JSONB DEFAULT '{}',
  status public.artist_status NOT NULL DEFAULT 'pending',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  follower_count INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  pending_payout NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  commission_rate NUMERIC(4, 2) NOT NULL DEFAULT 0.30, -- 30% platform commission
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artist_profiles_user_id ON public.artist_profiles(user_id);
CREATE INDEX idx_artist_profiles_status ON public.artist_profiles(status);


-- ============================================
-- 4. SONGS TABLE
-- ============================================

CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  genre TEXT,
  album_name TEXT,
  duration INTEGER, -- duration in seconds
  price NUMERIC(8, 2) NOT NULL DEFAULT 0.99,
  audio_storage_path TEXT NOT NULL, -- path in audio-files bucket
  cover_storage_path TEXT, -- path in cover-images bucket
  cover_url TEXT, -- public or signed URL for display
  status public.content_status NOT NULL DEFAULT 'pending_review',
  play_count INTEGER NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  release_date DATE DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}', -- extra metadata (BPM, key, etc.)
  moderated_by UUID REFERENCES public.profiles(id),
  moderated_at TIMESTAMPTZ,
  moderation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT songs_slug_artist_unique UNIQUE (artist_id, slug)
);

CREATE INDEX idx_songs_artist_id ON public.songs(artist_id);
CREATE INDEX idx_songs_status ON public.songs(status);
CREATE INDEX idx_songs_genre ON public.songs(genre);
CREATE INDEX idx_songs_release_date ON public.songs(release_date DESC);
CREATE INDEX idx_songs_play_count ON public.songs(play_count DESC);
CREATE INDEX idx_songs_purchase_count ON public.songs(purchase_count DESC);


-- ============================================
-- 5. ALBUMS TABLE
-- ============================================

CREATE TABLE public.albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  genre TEXT,
  price NUMERIC(8, 2) NOT NULL DEFAULT 9.99,
  cover_storage_path TEXT,
  cover_url TEXT,
  status public.content_status NOT NULL DEFAULT 'pending_review',
  purchase_count INTEGER NOT NULL DEFAULT 0,
  release_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT albums_slug_artist_unique UNIQUE (artist_id, slug)
);

CREATE INDEX idx_albums_artist_id ON public.albums(artist_id);
CREATE INDEX idx_albums_status ON public.albums(status);


-- ============================================
-- 6. ALBUM_SONGS JUNCTION TABLE
-- ============================================

CREATE TABLE public.album_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  track_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT album_songs_unique UNIQUE (album_id, song_id)
);


-- ============================================
-- 7. PURCHASES TABLE
-- ============================================

CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  album_id UUID REFERENCES public.albums(id) ON DELETE SET NULL,
  artist_id UUID NOT NULL REFERENCES public.artist_profiles(id),
  amount NUMERIC(8, 2) NOT NULL,
  platform_fee NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  artist_earnings NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT,
  payment_reference TEXT, -- external payment ID
  status public.purchase_status NOT NULL DEFAULT 'completed',
  refunded_at TIMESTAMPTZ,
  refunded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure either song_id or album_id is set, not both
  CONSTRAINT purchases_item_check CHECK (
    (song_id IS NOT NULL AND album_id IS NULL) OR
    (song_id IS NULL AND album_id IS NOT NULL)
  )
);

CREATE INDEX idx_purchases_buyer_id ON public.purchases(buyer_id);
CREATE INDEX idx_purchases_artist_id ON public.purchases(artist_id);
CREATE INDEX idx_purchases_song_id ON public.purchases(song_id);
CREATE INDEX idx_purchases_album_id ON public.purchases(album_id);
CREATE INDEX idx_purchases_created_at ON public.purchases(created_at DESC);
CREATE INDEX idx_purchases_status ON public.purchases(status);


-- ============================================
-- 8. PAYOUTS TABLE
-- ============================================

CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  status public.payout_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_artist_id ON public.payouts(artist_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);


-- ============================================
-- 9. FAVORITES TABLE
-- ============================================

CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT favorites_item_check CHECK (
    (song_id IS NOT NULL AND album_id IS NULL) OR
    (song_id IS NULL AND album_id IS NOT NULL)
  ),
  CONSTRAINT favorites_unique_song UNIQUE (user_id, song_id),
  CONSTRAINT favorites_unique_album UNIQUE (user_id, album_id)
);

CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);


-- ============================================
-- 10. STREAM LOGS TABLE
-- For tracking play/stream events
-- ============================================

CREATE TABLE public.stream_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  duration_seconds INTEGER DEFAULT 0, -- how long they listened
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stream_logs_song_id ON public.stream_logs(song_id);
CREATE INDEX idx_stream_logs_user_id ON public.stream_logs(user_id);
CREATE INDEX idx_stream_logs_created_at ON public.stream_logs(created_at DESC);


-- ============================================
-- 11. ACTIVITY LOGS TABLE
-- For admin audit trail
-- ============================================

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. 'user.ban', 'song.approve', 'purchase.refund'
  target_type TEXT, -- e.g. 'user', 'song', 'purchase'
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_actor_id ON public.activity_logs(actor_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);


-- ============================================
-- 12. PLATFORM SETTINGS TABLE
-- Global configuration, managed by super_admin
-- ============================================

CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('platform_commission', '"0.30"', 'Default platform commission rate (30%)'),
  ('min_song_price', '"0.49"', 'Minimum price for a song'),
  ('max_upload_size_mb', '"50"', 'Maximum audio file upload size in MB'),
  ('require_email_verification', '"true"', 'Whether email verification is required'),
  ('auto_approve_artists', '"false"', 'Whether new artist accounts are auto-approved'),
  ('maintenance_mode', '"false"', 'Whether the platform is in maintenance mode');


-- ============================================
-- 13. EMAIL VERIFICATION TOKENS TABLE
-- For Nodemailer email verification flow
-- ============================================

CREATE TABLE public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_token ON public.email_verification_tokens(token);


-- ============================================
-- 14. HELPER FUNCTIONS
-- ============================================

-- Function to automatically create a profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: create profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_artist_profiles_updated_at
  BEFORE UPDATE ON public.artist_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON public.songs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_albums_updated_at
  BEFORE UPDATE ON public.albums
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- Function to increment song play count
CREATE OR REPLACE FUNCTION public.increment_play_count(p_song_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.songs SET play_count = play_count + 1 WHERE id = p_song_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to check if user has purchased a song
CREATE OR REPLACE FUNCTION public.has_purchased_song(p_user_id UUID, p_song_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.purchases
    WHERE buyer_id = p_user_id
      AND song_id = p_song_id
      AND status = 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to check if user has purchased an album
CREATE OR REPLACE FUNCTION public.has_purchased_album(p_user_id UUID, p_album_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.purchases
    WHERE buyer_id = p_user_id
      AND album_id = p_album_id
      AND status = 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to get user role (used in RLS policies)
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS public.user_role AS $$
DECLARE
  v_role public.user_role;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- Function to check if user is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- Function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
