-- Create onboarding_progress table
CREATE TABLE public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Progress tracking
  tour_completed BOOLEAN NOT NULL DEFAULT false,
  videos_watched JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  skipped_onboarding BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_onboarding UNIQUE (user_id)
);

-- Indexes
CREATE INDEX idx_onboarding_user_id ON public.onboarding_progress(user_id);
CREATE INDEX idx_onboarding_tenant_id ON public.onboarding_progress(tenant_id);

-- Trigger for updated_at
CREATE TRIGGER update_onboarding_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own onboarding progress"
  ON public.onboarding_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own onboarding progress"
  ON public.onboarding_progress FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create onboarding progress"
  ON public.onboarding_progress FOR INSERT
  WITH CHECK (true);

-- Add trial columns to tenant_plans
ALTER TABLE public.tenant_plans 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT false;

-- Indexes for trial queries
CREATE INDEX IF NOT EXISTS idx_tenant_plans_trial ON public.tenant_plans(is_trial, trial_ends_at) WHERE is_trial = true;

-- Function to setup trial on signup
CREATE OR REPLACE FUNCTION public.create_trial_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Create or update tenant plan with trial
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
    10, -- 10 exams during trial
    0,
    CURRENT_DATE,
    true,
    true,
    now() + INTERVAL '14 days'
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    is_trial = true,
    trial_ends_at = now() + INTERVAL '14 days',
    monthly_exam_limit = 10,
    is_active = true;
  
  -- Create onboarding progress entry
  INSERT INTO public.onboarding_progress (user_id, tenant_id)
  VALUES (NEW.id, user_tenant_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to setup trial when profile is created
DROP TRIGGER IF EXISTS on_profile_created_setup_trial ON public.profiles;
CREATE TRIGGER on_profile_created_setup_trial
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_on_signup();