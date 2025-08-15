-- Create tables for dental image management

-- Exams table to group images by exam session
CREATE TABLE public.exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    patient_id TEXT NOT NULL, -- Pseudonymized patient identifier
    exam_type TEXT NOT NULL DEFAULT 'radiografia',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_images INTEGER DEFAULT 0,
    processed_images INTEGER DEFAULT 0,
    ai_analysis JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Dental images table
CREATE TABLE public.dental_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    image_type TEXT NOT NULL DEFAULT 'radiografia' CHECK (image_type IN ('radiografia', 'fotografia', 'scan')),
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    ai_analysis JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exams
CREATE POLICY "Users can view their tenant exams"
ON public.exams FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can create exams for their tenant"
ON public.exams FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update their tenant exams"
ON public.exams FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete their tenant exams"
ON public.exams FOR DELETE
USING (tenant_id = public.get_user_tenant_id());

-- RLS Policies for dental images
CREATE POLICY "Users can view their tenant images"
ON public.dental_images FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can create images for their tenant"
ON public.dental_images FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update their tenant images"
ON public.dental_images FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete their tenant images"
ON public.dental_images FOR DELETE
USING (tenant_id = public.get_user_tenant_id());

-- Create indexes for performance
CREATE INDEX idx_exams_tenant_id ON public.exams(tenant_id);
CREATE INDEX idx_exams_patient_id ON public.exams(patient_id);
CREATE INDEX idx_exams_status ON public.exams(status);
CREATE INDEX idx_dental_images_exam_id ON public.dental_images(exam_id);
CREATE INDEX idx_dental_images_tenant_id ON public.dental_images(tenant_id);
CREATE INDEX idx_dental_images_processing_status ON public.dental_images(processing_status);

-- Triggers for updated_at
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dental_images_updated_at
BEFORE UPDATE ON public.dental_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();