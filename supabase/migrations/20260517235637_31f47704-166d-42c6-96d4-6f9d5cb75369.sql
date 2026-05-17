CREATE OR REPLACE FUNCTION public.sync_item_visibility_to_list()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list_vis text;
BEGIN
  SELECT visibility INTO v_list_vis FROM public.wishlists WHERE id = NEW.wishlist_id;
  IF v_list_vis IS NOT NULL THEN
    NEW.visibility := v_list_vis;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_item_visibility ON public.wishlist_items;
CREATE TRIGGER trg_sync_item_visibility
BEFORE INSERT OR UPDATE OF wishlist_id ON public.wishlist_items
FOR EACH ROW EXECUTE FUNCTION public.sync_item_visibility_to_list();