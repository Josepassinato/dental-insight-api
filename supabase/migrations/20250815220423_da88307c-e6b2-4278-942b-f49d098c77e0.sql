-- Create dental_images table for storing dental images metadata
CREATE TABLE public.dental_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  image_type TEXT NOT NULL DEFAULT 'radiografia',
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dental_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view dental images in their tenant" 
ON public.dental_images 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create dental images in their tenant" 
ON public.dental_images 
FOR INSERT 
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update dental images in their tenant" 
ON public.dental_images 
FOR UPDATE 
USING (tenant_id = get_user_tenant_id());

-- Create indexes for better performance
CREATE INDEX idx_dental_images_exam_id ON public.dental_images(exam_id);
CREATE INDEX idx_dental_images_tenant_id ON public.dental_images(tenant_id);
CREATE INDEX idx_dental_images_processing_status ON public.dental_images(processing_status);

-- Create trigger for updating updated_at
CREATE TRIGGER update_dental_images_updated_at
BEFORE UPDATE ON public.dental_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();