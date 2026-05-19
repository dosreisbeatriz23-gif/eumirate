
-- ============================================================
-- Security hardening
-- ============================================================

-- 1) Item visibility enforcement on anonymous/public reads
DROP POLICY IF EXISTS "Items of public wishlists are viewable" ON public.wishlist_items;
CREATE POLICY "Items of public wishlists are viewable"
ON public.wishlist_items
FOR SELECT
TO anon, authenticated
USING (
  visibility = 'public'
  AND EXISTS (
    SELECT 1 FROM public.wishlists w
    WHERE w.id = wishlist_items.wishlist_id
      AND w.visibility = 'public'
  )
);

-- 2) Hide share_token from non-owners via column-level privileges
--    Owners read it through a dedicated RPC.
REVOKE SELECT (share_token) ON public.wishlists FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_share_token(p_wishlist_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT share_token
  FROM public.wishlists
  WHERE id = p_wishlist_id
    AND user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_share_token(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_share_token(uuid) TO authenticated;

-- 3) Convert ownership-check helpers to SECURITY INVOKER (no need for DEFINER;
--    avoids the public-executable-DEFINER linter warning). is_group_member must
--    remain DEFINER to prevent recursive RLS on group_members.
CREATE OR REPLACE FUNCTION public.owns_wishlist(wishlist_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wishlists
    WHERE id = wishlist_uuid AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_wishlist_item(item_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wishlist_items wi
    JOIN public.wishlists w ON w.id = wi.wishlist_id
    WHERE wi.id = item_uuid AND w.user_id = auth.uid()
  )
$$;
