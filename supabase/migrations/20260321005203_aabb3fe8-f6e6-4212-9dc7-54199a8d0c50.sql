
-- Groups table
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  invite_code uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  icon text DEFAULT 'users',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Group members table
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Groups policies (public for now since using local user IDs)
CREATE POLICY "Public select groups" ON public.groups FOR SELECT TO public USING (true);
CREATE POLICY "Public insert groups" ON public.groups FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update groups" ON public.groups FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete groups" ON public.groups FOR DELETE TO public USING (true);

CREATE POLICY "Public select group_members" ON public.group_members FOR SELECT TO public USING (true);
CREATE POLICY "Public insert group_members" ON public.group_members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public delete group_members" ON public.group_members FOR DELETE TO public USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
