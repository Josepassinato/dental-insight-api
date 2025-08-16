-- Add insert policy for profiles so users can create their own profile row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Backfill existing profiles without tenant_id to ensure RLS checks pass
UPDATE public.profiles 
SET tenant_id = id 
WHERE tenant_id IS NULL;