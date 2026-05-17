
-- ============ WISHLISTS ============
DROP POLICY IF EXISTS "View wishlist by share token" ON public.wishlists;

CREATE POLICY "Public wishlists are viewable"
ON public.wishlists FOR SELECT
TO anon, authenticated
USING (visibility = 'public');

-- Allow group members to see wishlists of co-members
CREATE POLICY "Group co-members can view wishlists"
ON public.wishlists FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid()
      AND gm2.user_id = public.wishlists.user_id
  )
);

-- ============ WISHLIST_ITEMS ============
DROP POLICY IF EXISTS "Public can view items" ON public.wishlist_items;

CREATE POLICY "Items of public wishlists are viewable"
ON public.wishlist_items FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wishlists w
    WHERE w.id = public.wishlist_items.wishlist_id
      AND w.visibility = 'public'
  )
);

CREATE POLICY "Group co-members can view items"
ON public.wishlist_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.wishlists w
    JOIN public.group_members gm1 ON gm1.user_id = w.user_id
    JOIN public.group_members gm2 ON gm2.group_id = gm1.group_id
    WHERE w.id = public.wishlist_items.wishlist_id
      AND gm2.user_id = auth.uid()
  )
);

-- ============ RESERVATIONS ============
DROP POLICY IF EXISTS "Public select reservations" ON public.reservations;
DROP POLICY IF EXISTS "Public insert reservations" ON public.reservations;
DROP POLICY IF EXISTS "Public delete reservations" ON public.reservations;

-- No direct access; all reads/writes go through SECURITY DEFINER RPCs
-- (create_reservation, delete_reservation_by_token).
CREATE POLICY "No direct reservation access"
ON public.reservations FOR SELECT
TO anon, authenticated
USING (false);
