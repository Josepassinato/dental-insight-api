-- FASE 1: White Label Database Structure

-- Create tenant_domains table for custom domain management
CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  ssl_certificate TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ
);

-- Enable RLS on tenant_domains
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_domains
CREATE POLICY "Tenants can view their domains"
  ON public.tenant_domains FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage domains"
  ON public.tenant_domains FOR ALL
  USING (tenant_id = get_user_tenant_id() AND is_admin());

-- Create storage bucket for tenant branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-branding', 'tenant-branding', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for tenant-branding bucket
CREATE POLICY "Tenants can upload their branding"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-branding' 
    AND (storage.foldername(name))[1] = get_user_tenant_id()::text
  );

CREATE POLICY "Tenants can update their branding"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tenant-branding' 
    AND (storage.foldername(name))[1] = get_user_tenant_id()::text
  );

CREATE POLICY "Tenants can delete their branding"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tenant-branding' 
    AND (storage.foldername(name))[1] = get_user_tenant_id()::text
  );

CREATE POLICY "Public can view branding assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-branding');

-- Add index for faster domain lookups
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain ON public.tenant_domains(domain);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant_id ON public.tenant_domains(tenant_id);