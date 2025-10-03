-- Fase 1: Sistema de Admin do SaaS

-- 1. Adicionar campo is_system_admin na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_system_admin boolean NOT NULL DEFAULT false;

-- 2. Criar função para verificar se é admin do sistema
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND is_system_admin = true
  );
END;
$$;

-- 3. Atualizar a função is_admin existente para verificar is_system_admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se é system admin OU admin do tenant
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid 
    AND is_system_admin = true
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.tenant_id = ur.tenant_id
    WHERE ur.user_id = user_uuid 
    AND p.id = user_uuid
    AND ur.role = 'admin'
  );
END;
$$;

-- Fase 2: Simplificar Gestão de Clínicas

-- 4. Atualizar enum user_role para incluir roles de clínica
DO $$ 
BEGIN
  -- Adicionar novos valores ao enum se não existirem
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'owner' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'owner';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'dentist' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'dentist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'assistant' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'assistant';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Ignora se já existe
END $$;

-- 5. Criar função para verificar se usuário é owner do seu tenant
CREATE OR REPLACE FUNCTION public.is_tenant_owner(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = user_uuid 
    AND ur.tenant_id = get_user_tenant_id()
    AND ur.role = 'owner'
  );
END;
$$;

-- 6. Criar função para obter role do usuário no tenant
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND tenant_id = get_user_tenant_id()
  LIMIT 1;
$$;

-- 7. Atualizar trigger de criação de usuário para criar role 'owner' automaticamente
CREATE OR REPLACE FUNCTION public.create_trial_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_tenant_id uuid;
BEGIN
  -- Get or create tenant for the user
  user_tenant_id := NEW.tenant_id;
  
  -- If tenant_id is null, use user's id as tenant (self-tenant)
  IF user_tenant_id IS NULL THEN
    user_tenant_id := NEW.id;
    
    -- Create tenant entry
    INSERT INTO public.tenants (id, name, slug)
    VALUES (user_tenant_id, COALESCE(NEW.full_name, NEW.email), lower(replace(NEW.email, '@', '-')))
    ON CONFLICT (id) DO NOTHING;
    
    -- Update profile with tenant_id
    UPDATE public.profiles SET tenant_id = user_tenant_id WHERE id = NEW.id;
  END IF;
  
  -- Create or update tenant plan with trial
  INSERT INTO public.tenant_plans (
    tenant_id,
    plan_type,
    monthly_exam_limit,
    current_month_usage,
    billing_cycle_start,
    is_active,
    is_trial,
    trial_ends_at
  ) VALUES (
    user_tenant_id,
    'basic',
    10,
    0,
    CURRENT_DATE,
    true,
    true,
    now() + INTERVAL '14 days'
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    is_trial = true,
    trial_ends_at = now() + INTERVAL '14 days',
    monthly_exam_limit = 10,
    is_active = true;
  
  -- Create user_role as 'owner' for the new user
  INSERT INTO public.user_roles (user_id, tenant_id, role, created_by)
  VALUES (NEW.id, user_tenant_id, 'owner', NEW.id)
  ON CONFLICT (user_id, tenant_id) DO NOTHING;
  
  -- Create onboarding progress entry
  INSERT INTO public.onboarding_progress (user_id, tenant_id)
  VALUES (NEW.id, user_tenant_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 8. Tornar o usuário específico system admin
UPDATE public.profiles
SET is_system_admin = true
WHERE id = '0d4e4488-a54d-4c32-8857-62aa17832966';

-- 9. Adicionar comentários para documentação
COMMENT ON COLUMN public.profiles.is_system_admin IS 'Indica se o usuário é o administrador do sistema SaaS (apenas 1 usuário)';
COMMENT ON FUNCTION public.is_system_admin() IS 'Verifica se o usuário atual é o administrador do sistema';
COMMENT ON FUNCTION public.is_tenant_owner(uuid) IS 'Verifica se o usuário é o dono (owner) do seu tenant/clínica';
COMMENT ON FUNCTION public.get_current_user_role() IS 'Retorna a role do usuário atual no seu tenant';