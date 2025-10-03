-- Create patient_documents table for medical records uploads
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for patient_documents
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view patient documents in their tenant"
  ON public.patient_documents FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create patient documents in their tenant"
  ON public.patient_documents FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update patient documents in their tenant"
  ON public.patient_documents FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete patient documents in their tenant"
  ON public.patient_documents FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- Create index for faster queries
CREATE INDEX idx_patient_documents_patient_id ON public.patient_documents(patient_id);
CREATE INDEX idx_patient_documents_tenant_id ON public.patient_documents(tenant_id);

-- Create storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for patient documents
CREATE POLICY "Users can view patient documents in their tenant"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'patient-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can upload patient documents to their tenant folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'patient-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update patient documents in their tenant"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'patient-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete patient documents in their tenant"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'patient-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create integration_settings table for future integrations with dental software
CREATE TABLE IF NOT EXISTS public.integration_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  integration_type TEXT NOT NULL,
  integration_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, integration_type)
);

-- Add RLS policies for integration_settings
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage integration settings"
  ON public.integration_settings FOR ALL
  USING (tenant_id = get_user_tenant_id() AND is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_patient_documents_updated_at
  BEFORE UPDATE ON public.patient_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_settings_updated_at
  BEFORE UPDATE ON public.integration_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.patient_documents IS 'Stores uploaded medical documents for patients';
COMMENT ON TABLE public.integration_settings IS 'Configuration for integrations with external dental software (Dentrix, Open Dental, etc.)';