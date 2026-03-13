-- =============================================
-- 265Stream - Seed Data
-- Run this AFTER all migrations to populate test data
-- =============================================

-- NOTE: You need to create the users through Supabase Auth first
-- (via the API or dashboard), then their profiles will be auto-created.
-- This seed file shows the structure for manual testing.

-- After creating users via the auth API, update their roles:
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'admin@265stream.com';
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'moderator@265stream.com';
-- UPDATE public.profiles SET role = 'artist' WHERE email = 'artist@265stream.com';

-- Then create artist profiles:
-- INSERT INTO public.artist_profiles (user_id, artist_name, genre, bio, status, verified)
-- SELECT id, full_name, 'Pop', 'Test artist', 'approved', true
-- FROM public.profiles WHERE email = 'artist@265stream.com';

-- ============================================
-- Sample Platform Settings (already in schema)
-- ============================================

-- Settings are inserted in migration 001, but here are additional ones:
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('supported_genres', '["Pop","Hip-Hop","R&B","Rock","Electronic","Jazz","Classical","Country","Lo-Fi","Afrobeats","Reggae","Latin","Other"]', 'List of supported music genres'),
  ('max_cover_size_mb', '"5"', 'Maximum cover image size in MB'),
  ('payout_minimum', '"50.00"', 'Minimum balance required for payout')
ON CONFLICT (key) DO NOTHING;
