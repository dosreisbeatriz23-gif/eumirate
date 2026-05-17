ALTER TABLE public.wishlist_items
DROP CONSTRAINT IF EXISTS wishlist_items_visibility_check;

ALTER TABLE public.wishlist_items
ADD CONSTRAINT wishlist_items_visibility_check
CHECK (visibility IN ('private', 'group', 'public'));