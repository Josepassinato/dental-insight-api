-- Enhanced security measures for patient medical records and sensitive data

-- 1. Create audit logging function for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  table_name text,
  record_id uuid,
  operation text,
  user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    tenant_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address
  ) VALUES (
    user_id,
    get_user_tenant_id(),
    operation,
    table_name,
    record_id,
    jsonb_build_object(
      'timestamp', now(),
      'sensitive_access', true
    ),
    inet_client_addr()
  );
END;
$$;

-- 2. Enhanced tenant validation function with additional checks
CREATE OR REPLACE FUNCTION public.validate_tenant_access(target_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tenant uuid;
  user_exists boolean;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify user exists in profiles
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid()) INTO user_exists;
  IF NOT user_exists THEN
    RETURN false;
  END IF;
  
  -- Get user's tenant with validation
  SELECT tenant_id INTO user_tenant FROM public.profiles WHERE id = auth.uid();
  
  -- Ensure tenant_id is not null and matches
  IF user_tenant IS NULL OR user_tenant != target_tenant_id THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 3. Role-based access function for medical data
CREATE OR REPLACE FUNCTION public.can_access_medical_data()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user role from profiles
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  
  -- Only dentists and admins can access medical data
  RETURN user_role IN ('dentist', 'admin');
END;
$$;

-- 4. Update RLS policies for patients table with enhanced security
DROP POLICY IF EXISTS "Users can view patients in their tenant" ON public.patients;
DROP POLICY IF EXISTS "Users can create patients in their tenant" ON public.patients;
DROP POLICY IF EXISTS "Users can update patients in their tenant" ON public.patients;

CREATE POLICY "Enhanced: Users can view patients in their tenant"
ON public.patients
FOR SELECT
USING (
  validate_tenant_access(tenant_id) 
  AND can_access_medical_data()
);

CREATE POLICY "Enhanced: Users can create patients in their tenant"
ON public.patients
FOR INSERT
WITH CHECK (
  validate_tenant_access(tenant_id) 
  AND can_access_medical_data()
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Enhanced: Users can update patients in their tenant"
ON public.patients
FOR UPDATE
USING (
  validate_tenant_access(tenant_id) 
  AND can_access_medical_data()
)
WITH CHECK (
  validate_tenant_access(tenant_id) 
  AND can_access_medical_data()
  AND tenant_id = get_user_tenant_id()
);

-- 5. Enhanced RLS policies for patient_history table
DROP POLICY IF EXISTS "Users can view patient history in their tenant" ON public.patient_history;
DROP POLICY IF EXISTS "Users can create patient history in their tenant" ON public.patient_history;
DROP POLICY IF EXISTS "Users can update patient history in their tenant" ON public.patient_history;

CREATE POLICY "Enhanced: Users can view patient history in their tenant"
ON public.patient_history
FOR SELECT
USING (
  validate_tenant_access(tenant_id) 
  AND can_access_medical_data()
);

CREATE POLICY "Enhanced: Users can create patient history in their tenant"
ON public.patient_history
FOR INSERT
WITH CHECK (
  validate_tenant_access(tenant_id) 
  AND can_access_medical_data()
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Enhanced: Users can update patient history in their tenant"
ON public.patient_history
FOR UPDATE
USING (
  validate_tenant_access(tenant_id) 
  AND can_access_medical_data()
)
WITH CHECK (
  validate_tenant_access(tenant_id) 
  AND can_access_medical_data()
  AND tenant_id = get_user_tenant_id()
);

-- 6. Enhanced profiles table RLS policy
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;

CREATE POLICY "Enhanced: Users can view profiles in their tenant"
ON public.profiles
FOR SELECT
USING (
  validate_tenant_access(tenant_id) 
  OR id = auth.uid() -- Users can always view their own profile
);

-- 7. Add triggers for audit logging on sensitive data access
CREATE OR REPLACE FUNCTION public.audit_patients_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM log_sensitive_data_access('patients', COALESCE(NEW.id, OLD.id), TG_OP);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_patient_history_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM log_sensitive_data_access('patient_history', COALESCE(NEW.id, OLD.id), TG_OP);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit triggers
CREATE TRIGGER audit_patients_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION audit_patients_access();

CREATE TRIGGER audit_patient_history_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.patient_history
  FOR EACH ROW EXECUTE FUNCTION audit_patient_history_access();

-- 8. Create a function to validate user session integrity
CREATE OR REPLACE FUNCTION public.validate_session_integrity()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_valid boolean := false;
BEGIN
  -- Check if auth.uid() returns a valid UUID
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify the user exists in auth.users (this will fail if session is invalid)
  SELECT EXISTS(
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND deleted_at IS NULL
  ) INTO session_valid;
  
  RETURN session_valid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 9. Add session validation to existing RLS policies
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN validate_session_integrity() THEN
      COALESCE(
        (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()),
        auth.uid()
      )
    ELSE
      NULL
  END;
$$;