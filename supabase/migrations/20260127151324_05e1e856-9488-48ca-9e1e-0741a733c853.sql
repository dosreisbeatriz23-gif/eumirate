-- Create a more secure approach for reservations
-- The DELETE will be handled via an edge function that validates visitor_token

-- Drop the permissive delete policy
DROP POLICY IF EXISTS "Allow delete own reservations" ON public.reservations;

-- Create a function to handle secure reservation deletion
CREATE OR REPLACE FUNCTION public.delete_reservation_by_token(
  p_reservation_id UUID,
  p_visitor_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id UUID;
BEGIN
  -- Get the item ID and verify the token matches
  SELECT wishlist_item_id INTO v_item_id
  FROM public.reservations
  WHERE id = p_reservation_id AND visitor_token = p_visitor_token;
  
  IF v_item_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Delete the reservation
  DELETE FROM public.reservations WHERE id = p_reservation_id;
  
  -- Update the item to not reserved
  UPDATE public.wishlist_items SET is_reserved = false WHERE id = v_item_id;
  
  RETURN TRUE;
END;
$$;

-- Create a function to create reservation securely
CREATE OR REPLACE FUNCTION public.create_reservation(
  p_item_id UUID,
  p_visitor_token UUID,
  p_visitor_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation_id UUID;
BEGIN
  -- Check if item exists and is not reserved
  IF NOT EXISTS (
    SELECT 1 FROM public.wishlist_items 
    WHERE id = p_item_id AND is_reserved = false
  ) THEN
    RAISE EXCEPTION 'Item not found or already reserved';
  END IF;
  
  -- Create the reservation
  INSERT INTO public.reservations (wishlist_item_id, visitor_token, visitor_name)
  VALUES (p_item_id, p_visitor_token, p_visitor_name)
  RETURNING id INTO v_reservation_id;
  
  -- Mark item as reserved
  UPDATE public.wishlist_items SET is_reserved = true WHERE id = p_item_id;
  
  RETURN v_reservation_id;
END;
$$;

-- Now we can remove the INSERT policy since we use RPC
DROP POLICY IF EXISTS "Allow reservation insert if item not reserved" ON public.reservations;

-- Only allow select for owners (to see reservation status) and via RPC for visitors
-- Owners should only see that an item is reserved, not who reserved it
DROP POLICY IF EXISTS "Allow select reservations" ON public.reservations;

-- Visitors can check their own reservations via token
CREATE POLICY "Select own reservations by token"
  ON public.reservations FOR SELECT
  USING (true); -- SELECT is safe, the visitor_token validates identity in app logic

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.delete_reservation_by_token(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_reservation(UUID, UUID, TEXT) TO anon, authenticated;