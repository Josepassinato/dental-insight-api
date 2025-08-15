-- Create plan management tables
CREATE TYPE public.plan_type AS ENUM ('basic', 'professional', 'enterprise');

CREATE TABLE public.tenant_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL DEFAULT 'basic',
  monthly_exam_limit INTEGER NOT NULL DEFAULT 50,
  current_month_usage INTEGER NOT NULL DEFAULT 0,
  billing_cycle_start DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Create audit logging table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_plans
CREATE POLICY "Users can view their tenant plan"
ON public.tenant_plans
FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can manage tenant plans"
ON public.tenant_plans
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS policies for audit_logs
CREATE POLICY "Users can view audit logs in their tenant"
ON public.audit_logs
FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can create audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create function to check if tenant has reached exam limit
CREATE OR REPLACE FUNCTION public.check_exam_quota(tenant_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN tp.current_month_usage >= tp.monthly_exam_limit THEN false
      ELSE true
    END
  FROM public.tenant_plans tp
  WHERE tp.tenant_id = tenant_uuid AND tp.is_active = true;
$$;

-- Create function to increment exam usage
CREATE OR REPLACE FUNCTION public.increment_exam_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger to increment usage when new exam is created
CREATE TRIGGER increment_exam_usage_trigger
AFTER INSERT ON public.dental_images
FOR EACH ROW
EXECUTE FUNCTION public.increment_exam_usage();

-- Create function to reset monthly usage
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Add indexes for better performance
CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_tenant_plans_tenant_id ON public.tenant_plans(tenant_id);

-- Insert default plans for existing tenants
INSERT INTO public.tenant_plans (tenant_id, plan_type, monthly_exam_limit)
SELECT id, 'basic', 50
FROM public.tenants
WHERE id NOT IN (SELECT tenant_id FROM public.tenant_plans);