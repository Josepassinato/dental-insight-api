-- Atualizar plano básico gratuito para 6 exames
UPDATE public.tenant_plans
SET monthly_exam_limit = 6
WHERE plan_type = 'basic' AND is_trial = true;

-- Atualizar função de criação de trial para usar 6 exames
CREATE OR REPLACE FUNCTION public.create_trial_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Create or update tenant plan with trial - LIMITE DE 6 EXAMES GRATUITOS
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
    6,  -- Limite gratuito de 6 exames
    0,
    CURRENT_DATE,
    true,
    true,
    NULL  -- Sem expiração de trial, limite permanente de 6 exames
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    is_trial = true,
    trial_ends_at = NULL,
    monthly_exam_limit = 6,
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
$function$;