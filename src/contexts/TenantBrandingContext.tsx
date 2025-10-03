import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BrandingSettings, loadTenantBranding, resolveTenantByDomain } from '@/utils/domainResolver';

interface TenantBrandingContextType {
  branding: BrandingSettings | null;
  tenantId: string | null;
  isLoading: boolean;
  updateBranding: (settings: Partial<BrandingSettings>) => Promise<void>;
  refreshBranding: () => Promise<void>;
}

const TenantBrandingContext = createContext<TenantBrandingContextType | undefined>(undefined);

export const TenantBrandingProvider = ({ children }: { children: ReactNode }) => {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyTheme = (brandingSettings: BrandingSettings) => {
    const root = document.documentElement;
    
    // Apply colors as CSS variables
    if (brandingSettings.primary_color) {
      const hsl = hexToHSL(brandingSettings.primary_color);
      root.style.setProperty('--primary', hsl);
    }
    
    if (brandingSettings.secondary_color) {
      const hsl = hexToHSL(brandingSettings.secondary_color);
      root.style.setProperty('--secondary', hsl);
    }
    
    if (brandingSettings.accent_color) {
      const hsl = hexToHSL(brandingSettings.accent_color);
      root.style.setProperty('--accent', hsl);
    }

    // Update favicon
    if (brandingSettings.favicon_url) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = brandingSettings.favicon_url;
      } else {
        const newFavicon = document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.href = brandingSettings.favicon_url;
        document.head.appendChild(newFavicon);
      }
    }

    // Update page title
    if (brandingSettings.clinic_name) {
      document.title = brandingSettings.clinic_name;
    }
  };

  const hexToHSL = (hex: string): string => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
  };

  const loadBranding = async () => {
    setIsLoading(true);
    try {
      // First try to resolve tenant by domain
      const domainTenantId = await resolveTenantByDomain(window.location.hostname);
      
      if (domainTenantId) {
        setTenantId(domainTenantId);
        const brandingSettings = await loadTenantBranding(domainTenantId);
        if (brandingSettings) {
          setBranding(brandingSettings);
          applyTheme(brandingSettings);
        }
      } else {
        // Fall back to authenticated user's tenant
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.tenant_id) {
            setTenantId(profile.tenant_id);
            const brandingSettings = await loadTenantBranding(profile.tenant_id);
            if (brandingSettings) {
              setBranding(brandingSettings);
              applyTheme(brandingSettings);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBranding = async (settings: Partial<BrandingSettings>) => {
    if (!tenantId) return;

    const newBranding = { ...branding, ...settings };
    setBranding(newBranding as BrandingSettings);
    applyTheme(newBranding as BrandingSettings);

    // Update in database
    await supabase
      .from('tenant_settings')
      .update({ branding_settings: newBranding })
      .eq('tenant_id', tenantId);
  };

  const refreshBranding = async () => {
    await loadBranding();
  };

  useEffect(() => {
    loadBranding();
  }, []);

  return (
    <TenantBrandingContext.Provider value={{ branding, tenantId, isLoading, updateBranding, refreshBranding }}>
      {children}
    </TenantBrandingContext.Provider>
  );
};

export const useTenantBranding = () => {
  const context = useContext(TenantBrandingContext);
  if (context === undefined) {
    throw new Error('useTenantBranding must be used within a TenantBrandingProvider');
  }
  return context;
};
