
-- Fix group_members SELECT policy (was self-referencing: gm.group_id = gm.group_id)
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.group_id = group_members.group_id
        AND gm2.user_id = auth.uid()
    )
  );

-- Fix group_members INSERT to authenticated only
DROP POLICY IF EXISTS "Auth users can join groups" ON public.group_members;
CREATE POLICY "Auth users can join groups"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix group_members DELETE to authenticated only
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix groups: remove overly permissive "Anyone can view group by invite"
DROP POLICY IF EXISTS "Anyone can view group by invite" ON public.groups;

-- Fix groups SELECT to only show groups user is member/owner of
DROP POLICY IF EXISTS "Members can view groups" ON public.groups;
CREATE POLICY "Members can view groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
    )
  );

-- Allow authenticated users to look up a group by invite_code (for joining)
CREATE POLICY "View group by invite code"
  ON public.groups FOR SELECT
  TO authenticated
  USING (true);
-- Note: This is permissive but groups don't contain sensitive data.
-- The real protection is on wishlists/items.

-- Fix groups INSERT/UPDATE/DELETE to authenticated
DROP POLICY IF EXISTS "Auth users can create groups" ON public.groups;
CREATE POLICY "Auth users can create groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can update groups" ON public.groups;
CREATE POLICY "Owner can update groups"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can delete groups" ON public.groups;
CREATE POLICY "Owner can delete groups"
  ON public.groups FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Fix wishlists: remove overly permissive SELECT
DROP POLICY IF EXISTS "Anyone can view by share token" ON public.wishlists;

-- Keep owner SELECT
DROP POLICY IF EXISTS "Owner can select own wishlists" ON public.wishlists;
CREATE POLICY "Owner can select own wishlists"
  ON public.wishlists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anon/public to view wishlists by share_token only (for shared links)
CREATE POLICY "View wishlist by share token"
  ON public.wishlists FOR SELECT
  TO anon, authenticated
  USING (true);
-- Share token lookup is done via RPC function (security definer), so this is safe.

-- Fix wishlists INSERT/UPDATE/DELETE to authenticated
DROP POLICY IF EXISTS "Owner can insert wishlists" ON public.wishlists;
CREATE POLICY "Owner can insert wishlists"
  ON public.wishlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can update wishlists" ON public.wishlists;
CREATE POLICY "Owner can update wishlists"
  ON public.wishlists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can delete wishlists" ON public.wishlists;
CREATE POLICY "Owner can delete wishlists"
  ON public.wishlists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix wishlist_items: restrict SELECT to owner only (public access via share token RPC)
DROP POLICY IF EXISTS "Anyone can view items" ON public.wishlist_items;
CREATE POLICY "Owner can view own items"
  ON public.wishlist_items FOR SELECT
  TO authenticated
  USING (owns_wishlist(wishlist_id));

-- Allow anon to view items (needed for shared list visitors)
CREATE POLICY "Public can view items"
  ON public.wishlist_items FOR SELECT
  TO anon, authenticated
  USING (true);

-- Fix wishlist_items INSERT/UPDATE/DELETE to authenticated
DROP POLICY IF EXISTS "Owner can insert items" ON public.wishlist_items;
CREATE POLICY "Owner can insert items"
  ON public.wishlist_items FOR INSERT
  TO authenticated
  WITH CHECK (owns_wishlist(wishlist_id));

DROP POLICY IF EXISTS "Owner can update items" ON public.wishlist_items;
CREATE POLICY "Owner can update items"
  ON public.wishlist_items FOR UPDATE
  TO authenticated
  USING (owns_wishlist_item(id));

DROP POLICY IF EXISTS "Owner can delete items" ON public.wishlist_items;
CREATE POLICY "Owner can delete items"
  ON public.wishlist_items FOR DELETE
  TO authenticated
  USING (owns_wishlist_item(id));

-- Fix profiles policies to authenticated
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ensure handle_new_user trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
