-- Criar enum para roles de usuário
CREATE TYPE public.user_role AS ENUM ('admin', 'dentist', 'assistant', 'viewer');

-- Criar tabela de roles de usuário
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  role public.user_role NOT NULL DEFAULT 'viewer',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Criar tabela para API keys
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para eventos de analytics
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  user_id UUID,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para configurações do tenant
CREATE TABLE public.tenant_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,
  ai_preferences JSONB NOT NULL DEFAULT '{}',
  report_settings JSONB NOT NULL DEFAULT '{}',
  notification_settings JSONB NOT NULL DEFAULT '{}',
  branding_settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID, tenant_uuid UUID)
RETURNS public.user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = user_uuid AND tenant_id = tenant_uuid;
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.tenant_id = ur.tenant_id
    WHERE ur.user_id = user_uuid 
    AND p.id = user_uuid
    AND ur.role = 'admin'
  );
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their tenant" 
ON public.user_roles 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND is_admin());

-- RLS Policies for api_keys  
CREATE POLICY "Admins can manage API keys" 
ON public.api_keys 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND is_admin());

-- RLS Policies for analytics_events
CREATE POLICY "Users can view analytics in their tenant" 
ON public.analytics_events 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can insert analytics events" 
ON public.analytics_events 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for tenant_settings
CREATE POLICY "Admins can manage tenant settings" 
ON public.tenant_settings 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND is_admin());

CREATE POLICY "Users can view tenant settings" 
ON public.tenant_settings 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create triggers for updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_settings_updated_at
BEFORE UPDATE ON public.tenant_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tenant settings for existing tenants
INSERT INTO public.tenant_settings (tenant_id, ai_preferences, report_settings, notification_settings, branding_settings)
SELECT 
  tp.tenant_id,
  '{
    "confidence_threshold": 0.8,
    "auto_generate_reports": true,
    "preferred_analysis_type": "comprehensive",
    "enable_overlay_generation": true
  }'::jsonb,
  '{
    "default_template": "professional",
    "include_patient_photos": true,
    "show_confidence_scores": true,
    "auto_sign_reports": false
  }'::jsonb,
  '{
    "email_on_completion": true,
    "slack_integration": false,
    "webhook_url": null
  }'::jsonb,
  '{
    "clinic_name": "",
    "logo_url": "",
    "primary_color": "#2563eb",
    "secondary_color": "#64748b"
  }'::jsonb
FROM public.tenant_plans tp
ON CONFLICT (tenant_id) DO NOTHING;

-- Insert admin role for existing users
INSERT INTO public.user_roles (user_id, tenant_id, role, created_by)
SELECT 
  p.id,
  p.tenant_id,
  'admin'::public.user_role,
  p.id
FROM public.profiles p
WHERE p.tenant_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;