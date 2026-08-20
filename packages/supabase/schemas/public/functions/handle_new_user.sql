create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
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
$function$;

grant execute on function "public"."handle_new_user"() to public, "postgres";
