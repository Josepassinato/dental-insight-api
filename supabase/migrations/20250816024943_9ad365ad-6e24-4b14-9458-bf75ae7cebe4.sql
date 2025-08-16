-- Create INSERT policies for tenants and profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'Users can create their own tenant'
  ) THEN
    CREATE POLICY "Users can create their own tenant"
    ON public.tenants
    FOR INSERT
    WITH CHECK (id = auth.uid());
  END IF;

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

-- Backfill: create tenants for profiles missing tenant_id
WITH to_create AS (
  SELECT p.id AS tenant_id,
         COALESCE(p.full_name, p.email, 'Tenant ' || LEFT(p.id::text, 8)) AS name,
         'tenant-' || LEFT(p.id::text, 8) AS slug
  FROM public.profiles p
  WHERE p.tenant_id IS NULL
)
INSERT INTO public.tenants (id, name, slug)
SELECT tenant_id, name, slug
FROM to_create
ON CONFLICT (id) DO NOTHING;

-- Link profiles to their tenant when missing
UPDATE public.profiles p
SET tenant_id = p.id
WHERE p.tenant_id IS NULL;