-- Create sales leads table
CREATE TABLE IF NOT EXISTS public.sales_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  plan_interest TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to insert (public form)
CREATE POLICY "Anyone can submit sales leads"
ON public.sales_leads
FOR INSERT
WITH CHECK (true);

-- Policy to allow admins to view
CREATE POLICY "Admins can view sales leads"
ON public.sales_leads
FOR SELECT
USING (true);

-- Add index for performance
CREATE INDEX idx_sales_leads_status ON public.sales_leads(status);
CREATE INDEX idx_sales_leads_created_at ON public.sales_leads(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_sales_leads_updated_at
BEFORE UPDATE ON public.sales_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();