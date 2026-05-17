-- Remove permissive policy
DROP POLICY IF EXISTS "View group by invite code" ON public.groups;

-- Secure RPC for invite preview (returns only safe fields)
CREATE OR REPLACE FUNCTION public.get_group_by_invite_code(p_invite_code uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  icon text,
  member_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id,
    g.name,
    g.description,
    g.icon,
    (SELECT count(*) FROM public.group_members gm WHERE gm.group_id = g.id) AS member_count
  FROM public.groups g
  WHERE g.invite_code = p_invite_code
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_group_by_invite_code(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_group_by_invite_code(uuid) TO authenticated;
