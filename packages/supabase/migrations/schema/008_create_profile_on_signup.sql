-- ============================================
-- 8. PROFILE BOOTSTRAP ON SIGNUP
-- ============================================

-- Backfill profiles for any existing auth users that do not yet have a profile row.
INSERT INTO public.profiles (
  profile_id,
  name,
  email,
  profile_pic,
  updated_at
)
SELECT
  u.id,
  COALESCE(
    NULLIF(u.raw_user_meta_data ->> 'name', ''),
    split_part(COALESCE(u.email, ''), '@', 1),
    'User'
  ),
  u.email,
  NULLIF(u.raw_user_meta_data ->> 'avatar_url', ''),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles p
  WHERE p.profile_id = u.id
);

-- Create a new profile automatically whenever a user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    profile_id,
    name,
    email,
    profile_pic,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'User'
    ),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    NOW()
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    profile_pic = EXCLUDED.profile_pic,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
