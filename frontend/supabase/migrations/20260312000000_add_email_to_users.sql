-- Add email column to public.users and sync it from auth.users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from auth.users for existing rows
UPDATE public.users u
SET email = a.email
FROM auth.users a
WHERE u.id = a.id
  AND u.email IS NULL;

-- Update the trigger so new signups also save email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
