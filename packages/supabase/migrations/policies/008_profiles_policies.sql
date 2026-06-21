-- Profiles RLS Policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile row.
CREATE POLICY "profiles_read_own"
ON public.profiles FOR SELECT TO authenticated
USING (profile_id = auth.uid());

-- Users can insert their own profile row.
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Users can update their own profile row.
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Users can delete their own profile row.
CREATE POLICY "profiles_delete_own"
ON public.profiles FOR DELETE TO authenticated
USING (profile_id = auth.uid());
