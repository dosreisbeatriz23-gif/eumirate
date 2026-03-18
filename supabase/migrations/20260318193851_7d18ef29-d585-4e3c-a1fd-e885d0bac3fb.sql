
-- Drop old auth-dependent policies on wishlists
DROP POLICY IF EXISTS "Users can insert their own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users can update their own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users can delete their own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users can view their own wishlist" ON public.wishlists;

-- Create public policies for wishlists
CREATE POLICY "Public select wishlists" ON public.wishlists FOR SELECT USING (true);
CREATE POLICY "Public insert wishlists" ON public.wishlists FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update wishlists" ON public.wishlists FOR UPDATE USING (true);
CREATE POLICY "Public delete wishlists" ON public.wishlists FOR DELETE USING (true);

-- Drop old auth-dependent policies on wishlist_items
DROP POLICY IF EXISTS "Owners can insert items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Owners can update items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Owners can delete items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Owners can view their items" ON public.wishlist_items;

-- Create public policies for wishlist_items
CREATE POLICY "Public insert items" ON public.wishlist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update items" ON public.wishlist_items FOR UPDATE USING (true);
CREATE POLICY "Public delete items" ON public.wishlist_items FOR DELETE USING (true);

-- Drop old auth-dependent policies on profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Public select profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update profiles" ON public.profiles FOR UPDATE USING (true);

-- Add public insert/delete on reservations
DROP POLICY IF EXISTS "Select own reservations by token" ON public.reservations;
CREATE POLICY "Public select reservations" ON public.reservations FOR SELECT USING (true);
CREATE POLICY "Public insert reservations" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete reservations" ON public.reservations FOR DELETE USING (true);
