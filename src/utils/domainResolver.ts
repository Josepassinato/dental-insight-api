import { supabase } from "@/integrations/supabase/client";

export interface BrandingSettings {
  clinic_name?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  custom_domain?: string;
  custom_domain_verified?: boolean;
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta_text?: string;
  email_header_color?: string;
  email_logo_url?: string;
  email_footer_text?: string;
  contact_email?: string;
  phone?: string;
  company_address?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export const resolveTenantByDomain = async (hostname: string): Promise<string | null> => {
  // Skip for localhost/development
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return null;
  }

  try {
    // 1. Check if it's a custom domain
    const { data: domain } = await supabase
      .from('tenant_domains')
      .select('tenant_id, is_primary')
      .eq('domain', hostname)
      .eq('verified', true)
      .maybeSingle();

    if (domain) {
      return domain.tenant_id;
    }

    // 2. Check if it's a subdomain pattern (tenant-slug.dentalai.app)
    const subdomain = hostname.split('.')[0];
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', subdomain)
      .maybeSingle();

    return tenant?.id || null;
  } catch (error) {
    console.error('Error resolving tenant by domain:', error);
    return null;
  }
};

export const loadTenantBranding = async (tenantId: string): Promise<BrandingSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('branding_settings')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    
    return (data?.branding_settings as BrandingSettings) || null;
  } catch (error) {
    console.error('Error loading tenant branding:', error);
    return null;
  }
};
