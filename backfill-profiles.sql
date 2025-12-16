-- Backfill profiles table for existing auth.users
-- This inserts profile records for any users that don't have one yet

INSERT INTO public.profiles (
  id,
  display_name,
  phone_number,
  created_at,
  updated_at
)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'display_name', au.email) as display_name,
  au.raw_user_meta_data->>'phone_number' as phone_number,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Verify the profiles were created
SELECT
  p.*,
  au.email
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
ORDER BY p.created_at;
