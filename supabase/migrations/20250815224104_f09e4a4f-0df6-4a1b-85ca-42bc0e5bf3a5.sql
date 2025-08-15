-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION public.check_exam_quota(tenant_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN tp.current_month_usage >= tp.monthly_exam_limit THEN false
      ELSE true
    END
  FROM public.tenant_plans tp
  WHERE tp.tenant_id = tenant_uuid AND tp.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.increment_exam_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenant_plans
  SET 
    current_month_usage = current_month_usage + 1,
    updated_at = now()
  WHERE tenant_id = NEW.tenant_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenant_plans
  SET 
    current_month_usage = 0,
    billing_cycle_start = CURRENT_DATE,
    updated_at = now()
  WHERE billing_cycle_start <= CURRENT_DATE - INTERVAL '1 month';
END;
$$;