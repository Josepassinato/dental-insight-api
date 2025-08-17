-- Primeiro, vamos corrigir a estrutura da tabela profiles
-- Adicionar constraint única para tenant_id se não existir
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_tenant_id_unique UNIQUE (tenant_id);

-- Remover a foreign key problemática e criar políticas RLS mais simples
ALTER TABLE public.tenant_settings DROP CONSTRAINT IF EXISTS tenant_settings_tenant_id_fkey;

-- Remover todas as políticas existentes de tenant_settings
DROP POLICY IF EXISTS "Users can view their tenant settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Users can insert their tenant settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Users can update their tenant settings" ON public.tenant_settings;

-- Criar políticas RLS mais simples que usam get_user_tenant_id()
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