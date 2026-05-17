GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_wishlist(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_wishlist_item(uuid) TO authenticated;