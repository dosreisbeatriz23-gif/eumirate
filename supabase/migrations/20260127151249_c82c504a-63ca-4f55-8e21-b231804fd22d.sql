-- EUMIRATE Database Schema

-- 1. Profiles table (stores user information from Google OAuth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Wishlists table (each user has one wishlist)
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'Minha Lista de Desejos',
  description TEXT,
  share_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Wishlist items table
CREATE TABLE public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID REFERENCES public.wishlists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_range TEXT,
  external_link TEXT,
  image_url TEXT,
  priority TEXT DEFAULT 'média' CHECK (priority IN ('alta', 'média', 'baixa')),
  is_reserved BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. Reservations table (tracks who reserved what - anonymous to owner)
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_item_id UUID REFERENCES public.wishlist_items(id) ON DELETE CASCADE NOT NULL UNIQUE,
  visitor_token UUID NOT NULL, -- Used to track anonymous visitors
  visitor_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user owns a wishlist
CREATE OR REPLACE FUNCTION public.owns_wishlist(wishlist_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wishlists
    WHERE id = wishlist_uuid AND user_id = auth.uid()
  )
$$;

-- Helper function: Check if user owns the wishlist containing an item
CREATE OR REPLACE FUNCTION public.owns_wishlist_item(item_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wishlist_items wi
    JOIN public.wishlists w ON w.id = wi.wishlist_id
    WHERE wi.id = item_uuid AND w.user_id = auth.uid()
  )
$$;

-- Helper function: Get wishlist ID by share token
CREATE OR REPLACE FUNCTION public.get_wishlist_by_share_token(token UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.wishlists WHERE share_token = token
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Wishlists RLS policies
CREATE POLICY "Users can view their own wishlist"
  ON public.wishlists FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view wishlists by share token"
  ON public.wishlists FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own wishlist"
  ON public.wishlists FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own wishlist"
  ON public.wishlists FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own wishlist"
  ON public.wishlists FOR DELETE
  USING (user_id = auth.uid());

-- Wishlist items RLS policies
CREATE POLICY "Owners can view their items"
  ON public.wishlist_items FOR SELECT
  USING (public.owns_wishlist(wishlist_id));

CREATE POLICY "Anyone can view items from shared wishlists"
  ON public.wishlist_items FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert items"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (public.owns_wishlist(wishlist_id));

CREATE POLICY "Owners can update items"
  ON public.wishlist_items FOR UPDATE
  USING (public.owns_wishlist(wishlist_id));

CREATE POLICY "Owners can delete items"
  ON public.wishlist_items FOR DELETE
  USING (public.owns_wishlist(wishlist_id));

-- Reservations RLS policies (visitors can reserve, but owner cannot see who)
CREATE POLICY "Anyone can create reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Visitors can view their own reservations"
  ON public.reservations FOR SELECT
  USING (true);

CREATE POLICY "Visitors can delete their own reservations"
  ON public.reservations FOR DELETE
  USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wishlists_updated_at
  BEFORE UPDATE ON public.wishlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wishlist_items_updated_at
  BEFORE UPDATE ON public.wishlist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile and wishlist on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.wishlists (user_id, title)
  VALUES (NEW.id, 'Minha Lista de Desejos');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();