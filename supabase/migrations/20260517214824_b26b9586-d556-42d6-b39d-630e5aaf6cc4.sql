
-- 1. Extend reservations table
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS reserver_user_id uuid,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS expected_delivery_date date,
  ADD COLUMN IF NOT EXISTS is_surprise boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- visitor_token is now optional (we use reserver_user_id for logged-in users)
ALTER TABLE public.reservations ALTER COLUMN visitor_token DROP NOT NULL;

-- Prevent duplicate active reservations per item
CREATE UNIQUE INDEX IF NOT EXISTS reservations_one_per_item ON public.reservations(wishlist_item_id);

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS update_reservations_updated_at ON public.reservations;
CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to free the item on reservation delete
CREATE OR REPLACE FUNCTION public.free_item_on_reservation_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.wishlist_items SET is_reserved = false WHERE id = OLD.wishlist_item_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS free_item_on_reservation_delete ON public.reservations;
CREATE TRIGGER free_item_on_reservation_delete
AFTER DELETE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.free_item_on_reservation_delete();

-- 2. RLS policies for reservations
DROP POLICY IF EXISTS "No direct reservation access" ON public.reservations;

-- Reserver can see their own reservations
CREATE POLICY "Reserver can view own reservations"
ON public.reservations FOR SELECT TO authenticated
USING (reserver_user_id = auth.uid());

-- Reserver can update their own reservations
CREATE POLICY "Reserver can update own reservations"
ON public.reservations FOR UPDATE TO authenticated
USING (reserver_user_id = auth.uid())
WITH CHECK (reserver_user_id = auth.uid());

-- Reserver can delete own reservations
CREATE POLICY "Reserver can delete own reservations"
ON public.reservations FOR DELETE TO authenticated
USING (reserver_user_id = auth.uid());

-- List owner can view non-surprise reservations on their items
CREATE POLICY "Owner can view non-surprise reservations"
ON public.reservations FOR SELECT TO authenticated
USING (
  is_surprise = false
  AND EXISTS (
    SELECT 1 FROM public.wishlist_items wi
    JOIN public.wishlists w ON w.id = wi.wishlist_id
    WHERE wi.id = wishlist_item_id AND w.user_id = auth.uid()
  )
);

-- 3. SECURITY DEFINER function to reserve a gift (handles all validation)
CREATE OR REPLACE FUNCTION public.reserve_gift(
  p_item_id uuid,
  p_message text DEFAULT NULL,
  p_expected_delivery_date date DEFAULT NULL,
  p_is_surprise boolean DEFAULT true,
  p_visitor_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_visibility text;
  v_wishlist_id uuid;
  v_reservation_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar autenticado';
  END IF;

  SELECT wi.wishlist_id, w.user_id, w.visibility
    INTO v_wishlist_id, v_owner_id, v_visibility
  FROM public.wishlist_items wi
  JOIN public.wishlists w ON w.id = wi.wishlist_id
  WHERE wi.id = p_item_id AND wi.is_reserved = false;

  IF v_wishlist_id IS NULL THEN
    RAISE EXCEPTION 'Item não encontrado ou já reservado';
  END IF;

  IF v_visibility <> 'public' THEN
    RAISE EXCEPTION 'Reservas só são permitidas em listas públicas';
  END IF;

  IF v_owner_id = v_user_id THEN
    RAISE EXCEPTION 'Você não pode reservar um item da sua própria lista';
  END IF;

  -- Must share at least one group with the owner
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = v_user_id AND gm2.user_id = v_owner_id
  ) THEN
    RAISE EXCEPTION 'Você precisa estar no mesmo grupo do dono da lista';
  END IF;

  INSERT INTO public.reservations (
    wishlist_item_id, reserver_user_id, visitor_name, message,
    expected_delivery_date, is_surprise, visitor_token
  ) VALUES (
    p_item_id, v_user_id, p_visitor_name, p_message,
    p_expected_delivery_date, COALESCE(p_is_surprise, true), gen_random_uuid()
  ) RETURNING id INTO v_reservation_id;

  UPDATE public.wishlist_items SET is_reserved = true WHERE id = p_item_id;

  RETURN v_reservation_id;
END;
$$;

-- 4. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wishlist_items;
