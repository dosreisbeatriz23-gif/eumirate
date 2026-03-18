-- Remove broken foreign keys that point user_id to a non-existent public.users table.
-- This app uses a locally generated UUID to identify the current user's lists.
ALTER TABLE public.wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Keep lookups fast for the local user flow.
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);