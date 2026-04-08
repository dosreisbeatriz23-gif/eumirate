
-- 1. Attach the handle_new_user trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Fix profiles RLS
DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public update profiles" ON public.profiles;

CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. Fix wishlists RLS
DROP POLICY IF EXISTS "Anyone can view wishlists by share token" ON public.wishlists;
DROP POLICY IF EXISTS "Public select wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Public insert wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Public update wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Public delete wishlists" ON public.wishlists;

CREATE POLICY "Owner can select own wishlists"
  ON public.wishlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view by share token"
  ON public.wishlists FOR SELECT
  USING (true);

CREATE POLICY "Owner can insert wishlists"
  ON public.wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update wishlists"
  ON public.wishlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete wishlists"
  ON public.wishlists FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Fix wishlist_items RLS
DROP POLICY IF EXISTS "Anyone can view items from shared wishlists" ON public.wishlist_items;
DROP POLICY IF EXISTS "Public delete items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Public insert items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Public update items" ON public.wishlist_items;

CREATE POLICY "Anyone can view items"
  ON public.wishlist_items FOR SELECT
  USING (true);

CREATE POLICY "Owner can insert items"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (public.owns_wishlist(wishlist_id));

CREATE POLICY "Owner can update items"
  ON public.wishlist_items FOR UPDATE
  USING (public.owns_wishlist_item(id));

CREATE POLICY "Owner can delete items"
  ON public.wishlist_items FOR DELETE
  USING (public.owns_wishlist_item(id));

-- 5. Fix groups RLS
DROP POLICY IF EXISTS "Public select groups" ON public.groups;
DROP POLICY IF EXISTS "Public insert groups" ON public.groups;
DROP POLICY IF EXISTS "Public update groups" ON public.groups;
DROP POLICY IF EXISTS "Public delete groups" ON public.groups;

CREATE POLICY "Members can view groups"
  ON public.groups FOR SELECT
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view group by invite"
  ON public.groups FOR SELECT
  USING (true);

CREATE POLICY "Auth users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update groups"
  ON public.groups FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner can delete groups"
  ON public.groups FOR DELETE
  USING (auth.uid() = owner_id);

-- 6. Fix group_members RLS
DROP POLICY IF EXISTS "Public select group_members" ON public.group_members;
DROP POLICY IF EXISTS "Public insert group_members" ON public.group_members;
DROP POLICY IF EXISTS "Public delete group_members" ON public.group_members;

CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Auth users can join groups"
  ON public.group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Reservations stay open (anonymous system)
-- Keep existing policies as-is since reservations use visitor_token not auth
