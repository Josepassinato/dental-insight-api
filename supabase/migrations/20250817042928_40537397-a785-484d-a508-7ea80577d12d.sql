-- Verificar se a tabela tenant_settings existe e criar se necessário
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.profiles(tenant_id),
  ai_preferences JSONB DEFAULT '{}',
  report_settings JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  branding_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Habilitar RLS
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tenant_settings
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

-- Trigger para atualizar updated_at
CREATE TRIGGER update_tenant_settings_updated_at
BEFORE UPDATE ON public.tenant_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();