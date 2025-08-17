-- Primeiro, vamos limpar todas as políticas existentes de tenant_settings
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all existing policies on tenant_settings
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tenant_settings' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.tenant_settings';
    END LOOP;
END $$;

-- Agora criar políticas RLS simples
CREATE POLICY "Users can view tenant settings" 
ON public.tenant_settings 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert tenant settings" 
ON public.tenant_settings 
FOR INSERT 
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update tenant settings" 
ON public.tenant_settings 
FOR UPDATE 
USING (tenant_id = get_user_tenant_id());