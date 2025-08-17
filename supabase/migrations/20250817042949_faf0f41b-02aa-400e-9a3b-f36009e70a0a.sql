-- Primeiro, vamos corrigir as políticas RLS para tenant_settings
-- Remover políticas existentes que requerem admin
DROP POLICY IF EXISTS "Admins can manage tenant settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Users can view tenant settings" ON public.tenant_settings;

-- Criar políticas mais permissivas para tenant_settings
CREATE POLICY "Users can view their tenant settings" 
ON public.tenant_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = tenant_settings.tenant_id
  )
);

CREATE POLICY "Users can insert their tenant settings" 
ON public.tenant_settings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = tenant_settings.tenant_id
  )
);

CREATE POLICY "Users can update their tenant settings" 
ON public.tenant_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = tenant_settings.tenant_id
  )
);

-- Corrigir a foreign key para referenciar profiles.tenant_id
ALTER TABLE public.tenant_settings DROP CONSTRAINT IF EXISTS tenant_settings_tenant_id_fkey;
ALTER TABLE public.tenant_settings 
ADD CONSTRAINT tenant_settings_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.profiles(tenant_id);