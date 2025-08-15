-- Add new columns to dental_images for advanced AI analysis
ALTER TABLE public.dental_images 
ADD COLUMN overlay_file_path TEXT,
ADD COLUMN findings JSONB DEFAULT '[]'::jsonb,
ADD COLUMN analysis_confidence DECIMAL(3,2),
ADD COLUMN processed_overlay_at TIMESTAMP WITH TIME ZONE;

-- Create findings table for structured dental findings
CREATE TABLE public.dental_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dental_image_id UUID NOT NULL REFERENCES public.dental_images(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  tooth_number TEXT,
  finding_type TEXT NOT NULL CHECK (finding_type IN ('carie', 'perda_ossea', 'restauracao_defeituosa', 'calculo', 'gengivite', 'periodontite', 'impactacao', 'fratura')),
  severity TEXT NOT NULL CHECK (severity IN ('leve', 'moderada', 'severa')) DEFAULT 'leve',
  confidence DECIMAL(3,2) NOT NULL,
  bbox_coordinates JSONB, -- {x, y, width, height}
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on dental_findings
ALTER TABLE public.dental_findings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for dental_findings
CREATE POLICY "Users can view dental findings in their tenant" 
ON public.dental_findings 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create dental findings in their tenant" 
ON public.dental_findings 
FOR INSERT 
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update dental findings in their tenant" 
ON public.dental_findings 
FOR UPDATE 
USING (tenant_id = get_user_tenant_id());

-- Create indexes for performance
CREATE INDEX idx_dental_findings_image_id ON public.dental_findings(dental_image_id);
CREATE INDEX idx_dental_findings_tenant_id ON public.dental_findings(tenant_id);
CREATE INDEX idx_dental_findings_type ON public.dental_findings(finding_type);
CREATE INDEX idx_dental_findings_severity ON public.dental_findings(severity);

-- Create trigger for updating updated_at
CREATE TRIGGER update_dental_findings_updated_at
BEFORE UPDATE ON public.dental_findings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();