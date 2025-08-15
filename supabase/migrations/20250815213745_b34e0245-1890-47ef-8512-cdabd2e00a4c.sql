-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for exam status
CREATE TYPE public.exam_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create enum for exam types
CREATE TYPE public.exam_type AS ENUM ('panoramic', 'periapical', 'bitewing', 'cephalometric', 'cbct');

-- Create tenants table (clinics)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'dentist',
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create patients table with pseudonymization
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_ref TEXT NOT NULL, -- Pseudonymized patient reference
    age INTEGER,
    gender TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, patient_ref)
);

-- Create exams table
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    exam_type public.exam_type NOT NULL,
    status public.exam_status DEFAULT 'pending',
    original_file_path TEXT,
    overlay_file_path TEXT,
    metadata JSONB DEFAULT '{}',
    findings JSONB DEFAULT '{}',
    ai_analysis JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('dental-uploads', 'dental-uploads', false),
    ('dental-overlays', 'dental-overlays', false);

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for tenants
CREATE POLICY "Users can view their tenant"
ON public.tenants FOR SELECT
USING (id = public.get_user_tenant_id());

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their tenant"
ON public.profiles FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- RLS Policies for patients
CREATE POLICY "Users can view patients in their tenant"
ON public.patients FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can create patients in their tenant"
ON public.patients FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update patients in their tenant"
ON public.patients FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

-- RLS Policies for exams
CREATE POLICY "Users can view exams in their tenant"
ON public.exams FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can create exams in their tenant"
ON public.exams FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update exams in their tenant"
ON public.exams FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

-- Storage policies for dental uploads
CREATE POLICY "Users can upload files to their tenant folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'dental-uploads' 
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
);

CREATE POLICY "Users can view files from their tenant"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'dental-uploads' 
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
);

-- Storage policies for dental overlays
CREATE POLICY "Users can upload overlays to their tenant folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'dental-overlays' 
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
);

CREATE POLICY "Users can view overlays from their tenant"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'dental-overlays' 
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exams_updated_at
    BEFORE UPDATE ON public.exams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();