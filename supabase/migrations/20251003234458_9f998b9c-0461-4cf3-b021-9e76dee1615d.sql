-- PARTE 2: Correção de segurança - usar user_roles ao invés de profiles

-- 1. Remover is_system_admin de profiles (campo inseguro)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_system_admin;

-- 2. Criar função segura para verificar role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Atualizar função is_system_admin para usar user_roles
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.has_role(auth.uid(), 'system_admin');
END;
$$;

-- 4. Atualizar função is_admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- System admin OU admin do tenant
  RETURN public.has_role(user_uuid, 'system_admin') 
      OR public.has_role(user_uuid, 'admin');
END;
$$;

-- 5. Atualizar função is_tenant_owner
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

-- 6. Atualizar função get_current_user_role
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

-- 7. Tornar o usuário específico system_admin via user_roles
INSERT INTO public.user_roles (user_id, tenant_id, role, created_by)
VALUES (
  '0d4e4488-a54d-4c32-8857-62aa17832966',
  '0d4e4488-a54d-4c32-8857-62aa17832966',
  'system_admin',
  '0d4e4488-a54d-4c32-8857-62aa17832966'
)
ON CONFLICT (user_id, tenant_id) 
DO UPDATE SET role = 'system_admin';

-- 8. Comentários de segurança
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check user role without RLS recursion';
COMMENT ON FUNCTION public.is_system_admin IS 'Check if user is system administrator using secure user_roles table';
COMMENT ON FUNCTION public.is_admin IS 'Check if user is system admin or tenant admin';
COMMENT ON FUNCTION public.is_tenant_owner IS 'Check if user is owner of their tenant';