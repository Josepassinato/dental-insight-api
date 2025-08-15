-- Create storage bucket for dental reports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dental-reports', 'dental-reports', false);

-- Create storage policies for dental reports
CREATE POLICY "Users can view dental reports in their tenant" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'dental-reports' AND 
  EXISTS (
    SELECT 1 FROM exams 
    WHERE exams.id::text = (storage.foldername(name))[1] 
    AND exams.tenant_id = get_user_tenant_id()
  )
);

CREATE POLICY "System can create dental reports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'dental-reports');

CREATE POLICY "System can update dental reports" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'dental-reports');