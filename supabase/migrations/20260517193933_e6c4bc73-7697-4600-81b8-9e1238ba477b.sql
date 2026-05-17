-- Restrict group co-members visibility: never expose private items/wishlists
DROP POLICY IF EXISTS "Group co-members can view wishlists" ON public.wishlists;
CREATE POLICY "Group co-members can view non-private wishlists"
ON public.wishlists
FOR SELECT
TO authenticated
USING (
  visibility <> 'private'
  AND EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() AND gm2.user_id = wishlists.user_id
  )
);

DROP POLICY IF EXISTS "Group co-members can view items" ON public.wishlist_items;
CREATE POLICY "Group co-members can view non-private items"
ON public.wishlist_items
FOR SELECT
TO authenticated
USING (
  visibility IN ('group','public')
  AND EXISTS (
    SELECT 1
    FROM public.wishlists w
    JOIN public.group_members gm1 ON gm1.user_id = w.user_id
    JOIN public.group_members gm2 ON gm2.group_id = gm1.group_id
    WHERE w.id = wishlist_items.wishlist_id AND gm2.user_id = auth.uid()
  )
);