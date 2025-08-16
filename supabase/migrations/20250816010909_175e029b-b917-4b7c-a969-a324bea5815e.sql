-- Expandir tabela de pacientes com campos completos
ALTER TABLE public.patients 
ADD COLUMN cpf TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN zip_code TEXT,
ADD COLUMN birth_date DATE,
ADD COLUMN emergency_contact_name TEXT,
ADD COLUMN emergency_contact_phone TEXT,
ADD COLUMN insurance_provider TEXT,
ADD COLUMN insurance_number TEXT,
ADD COLUMN allergies TEXT,
ADD COLUMN current_medications TEXT,
ADD COLUMN medical_conditions TEXT,
ADD COLUMN last_visit DATE,
ADD COLUMN notes TEXT;

-- Criar tabela para histórico médico/dentário
CREATE TABLE public.patient_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  visit_date DATE NOT NULL,
  visit_type TEXT NOT NULL DEFAULT 'consulta',
  chief_complaint TEXT,
  diagnosis TEXT,
  treatment_performed TEXT,
  treatment_plan TEXT,
  next_appointment DATE,
  dentist_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on patient_history
ALTER TABLE public.patient_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for patient_history
CREATE POLICY "Users can view patient history in their tenant" 
ON public.patient_history 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create patient history in their tenant" 
ON public.patient_history 
FOR INSERT 
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update patient history in their tenant" 
ON public.patient_history 
FOR UPDATE 
USING (tenant_id = get_user_tenant_id());

-- Criar tabela para templates de relatórios
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on report_templates
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for report_templates
CREATE POLICY "Users can view report templates in their tenant" 
ON public.report_templates 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage report templates in their tenant" 
ON public.report_templates 
FOR ALL 
USING (tenant_id = get_user_tenant_id());

-- Atualizar trigger para patient_history
CREATE TRIGGER update_patient_history_updated_at
BEFORE UPDATE ON public.patient_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar trigger para report_templates
CREATE TRIGGER update_report_templates_updated_at
BEFORE UPDATE ON public.report_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir template padrão
INSERT INTO public.report_templates (tenant_id, name, description, template_data, is_default)
SELECT 
  tp.tenant_id,
  'Template Padrão',
  'Template padrão para relatórios dentários',
  '{
    "header": {
      "clinic_name": "{{clinic_name}}",
      "logo_url": "",
      "address": "{{clinic_address}}",
      "phone": "{{clinic_phone}}"
    },
    "patient_section": {
      "show_patient_info": true,
      "show_insurance": true,
      "show_emergency_contact": false
    },
    "exam_section": {
      "show_images": true,
      "show_findings": true,
      "show_confidence": true,
      "show_overlays": true
    },
    "diagnosis_section": {
      "show_summary": true,
      "show_recommendations": true,
      "show_treatment_plan": false
    },
    "footer": {
      "show_signature": true,
      "signature_text": "Dr. {{dentist_name}}",
      "cro_number": "{{cro_number}}",
      "report_date": true
    }
  }'::jsonb,
  true
FROM public.tenant_plans tp
ON CONFLICT DO NOTHING;