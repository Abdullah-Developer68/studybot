-- Templates RLS policies
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_select_own" ON public.templates;
DROP POLICY IF EXISTS "templates_select_public" ON public.templates;
DROP POLICY IF EXISTS "templates_insert_own" ON public.templates;
DROP POLICY IF EXISTS "templates_update_own" ON public.templates;
DROP POLICY IF EXISTS "templates_delete_own" ON public.templates;

-- 1) Owners can read their own templates
CREATE POLICY "templates_select_own"
ON public.templates FOR SELECT TO authenticated
USING (profile_id = auth.uid());

-- 2) Owners can insert only private templates
CREATE POLICY "templates_insert_own"
ON public.templates FOR INSERT TO authenticated
WITH CHECK (
	profile_id = auth.uid()
	AND is_public = false
);

-- 3) Owners can update only their own private templates
CREATE POLICY "templates_update_own"
ON public.templates FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (
	profile_id = auth.uid()
	AND is_public = false
);

-- 4) Owners can delete only their own templates
CREATE POLICY "templates_delete_own"
ON public.templates FOR DELETE TO authenticated
USING (profile_id = auth.uid());