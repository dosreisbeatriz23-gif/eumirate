ALTER TABLE public.wishlist_items 
ADD COLUMN visibility text NOT NULL DEFAULT 'private' 
CHECK (visibility IN ('private', 'group'));