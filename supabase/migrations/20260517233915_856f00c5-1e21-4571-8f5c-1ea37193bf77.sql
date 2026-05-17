DROP POLICY IF EXISTS "Public wishlists are viewable" ON public.wishlists;
DROP POLICY IF EXISTS "Items of public wishlists are viewable" ON public.wishlist_items;
DROP POLICY IF EXISTS "Group co-members can view non-private wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Group co-members can view non-private items" ON public.wishlist_items;

CREATE POLICY "Group co-members can view shared wishlists"
ON public.wishlists
FOR SELECT
TO authenticated
USING (
  visibility IN ('public', 'group')
  AND EXISTS (
    SELECT 1
    FROM public.group_members viewer
    JOIN public.group_members owner_member
      ON owner_member.group_id = viewer.group_id
    WHERE viewer.user_id = auth.uid()
      AND owner_member.user_id = wishlists.user_id
  )
);

CREATE POLICY "Group co-members can view shared items"
ON public.wishlist_items
FOR SELECT
TO authenticated
USING (
  visibility IN ('public', 'group')
  AND EXISTS (
    SELECT 1
    FROM public.wishlists w
    JOIN public.group_members owner_member
      ON owner_member.user_id = w.user_id
    JOIN public.group_members viewer
      ON viewer.group_id = owner_member.group_id
    WHERE w.id = wishlist_items.wishlist_id
      AND w.visibility IN ('public', 'group')
      AND viewer.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.reserve_gift(
  p_item_id uuid,
  p_message text DEFAULT NULL::text,
  p_expected_delivery_date date DEFAULT NULL::date,
  p_is_surprise boolean DEFAULT true,
  p_visitor_name text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_item_visibility text;
  v_list_visibility text;
  v_wishlist_id uuid;
  v_reservation_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar autenticado';
  END IF;

  SELECT wi.wishlist_id, w.user_id, wi.visibility, w.visibility
    INTO v_wishlist_id, v_owner_id, v_item_visibility, v_list_visibility
  FROM public.wishlist_items wi
  JOIN public.wishlists w ON w.id = wi.wishlist_id
  WHERE wi.id = p_item_id AND wi.is_reserved = false
  FOR UPDATE OF wi;

  IF v_wishlist_id IS NULL THEN
    RAISE EXCEPTION 'Item não encontrado ou já reservado';
  END IF;

  IF v_item_visibility NOT IN ('public','group') OR v_list_visibility NOT IN ('public','group') THEN
    RAISE EXCEPTION 'Este item não está disponível para reserva';
  END IF;

  IF v_owner_id = v_user_id THEN
    RAISE EXCEPTION 'Você não pode reservar um item da sua própria lista';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_members viewer
    JOIN public.group_members owner_member
      ON owner_member.group_id = viewer.group_id
    WHERE viewer.user_id = v_user_id
      AND owner_member.user_id = v_owner_id
  ) THEN
    RAISE EXCEPTION 'Você precisa estar no mesmo grupo do dono da lista';
  END IF;

  INSERT INTO public.reservations (
    wishlist_item_id, reserver_user_id, visitor_name, message,
    expected_delivery_date, is_surprise, visitor_token
  ) VALUES (
    p_item_id, v_user_id, NULLIF(p_visitor_name, ''), NULLIF(p_message, ''),
    p_expected_delivery_date, COALESCE(p_is_surprise, true), gen_random_uuid()
  ) RETURNING id INTO v_reservation_id;

  UPDATE public.wishlist_items
  SET is_reserved = true, updated_at = now()
  WHERE id = p_item_id;

  RETURN v_reservation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.free_item_on_reservation_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.wishlist_items
  SET is_reserved = false, updated_at = now()
  WHERE id = OLD.wishlist_item_id;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS free_item_after_reservation_delete ON public.reservations;
CREATE TRIGGER free_item_after_reservation_delete
AFTER DELETE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.free_item_on_reservation_delete();