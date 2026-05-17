CREATE OR REPLACE FUNCTION public.reserve_gift(p_item_id uuid, p_message text DEFAULT NULL::text, p_expected_delivery_date date DEFAULT NULL::date, p_is_surprise boolean DEFAULT true, p_visitor_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_item_visibility text;
  v_wishlist_id uuid;
  v_reservation_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar autenticado';
  END IF;

  SELECT wi.wishlist_id, w.user_id, wi.visibility
    INTO v_wishlist_id, v_owner_id, v_item_visibility
  FROM public.wishlist_items wi
  JOIN public.wishlists w ON w.id = wi.wishlist_id
  WHERE wi.id = p_item_id AND wi.is_reserved = false;

  IF v_wishlist_id IS NULL THEN
    RAISE EXCEPTION 'Item não encontrado ou já reservado';
  END IF;

  IF v_item_visibility NOT IN ('public','group') THEN
    RAISE EXCEPTION 'Este item não está disponível para reserva';
  END IF;

  IF v_owner_id = v_user_id THEN
    RAISE EXCEPTION 'Você não pode reservar um item da sua própria lista';
  END IF;

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
$function$;