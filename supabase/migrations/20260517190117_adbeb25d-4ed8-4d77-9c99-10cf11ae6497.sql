
-- Internal helpers used only inside RLS policies / triggers: revoke API execute
REVOKE EXECUTE ON FUNCTION public.owns_wishlist(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.owns_wishlist_item(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- Public-facing reservation / share flows: keep callable
GRANT EXECUTE ON FUNCTION public.create_reservation(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_reservation_by_token(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_wishlist_by_share_token(uuid) TO anon, authenticated;
