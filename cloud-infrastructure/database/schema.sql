-- Dental Analysis Database Schema for Google Cloud SQL (PostgreSQL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table for multi-tenancy
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dental exams table
CREATE TABLE dental_exams (
    id VARCHAR(50) PRIMARY KEY, -- Format: ex_<12_chars>
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    original_filename VARCHAR(255),
    file_path VARCHAR(500) NOT NULL,
    content_type VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
    analysis_started_at TIMESTAMP WITH TIME ZONE,
    analysis_completed_at TIMESTAMP WITH TIME ZONE,
    analysis_summary JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dental findings table
CREATE TABLE dental_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id VARCHAR(50) NOT NULL REFERENCES dental_exams(id) ON DELETE CASCADE,
    tooth_number VARCHAR(10),
    finding_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50),
    confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
    coordinates JSONB, -- {"x": 100, "y": 200, "width": 50, "height": 40}
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_dental_exams_tenant_id ON dental_exams(tenant_id);
CREATE INDEX idx_dental_exams_status ON dental_exams(status);
CREATE INDEX idx_dental_exams_created_at ON dental_exams(created_at);
CREATE INDEX idx_dental_findings_exam_id ON dental_findings(exam_id);
CREATE INDEX idx_dental_findings_tooth_number ON dental_findings(tooth_number);
CREATE INDEX idx_dental_findings_finding_type ON dental_findings(finding_type);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dental_exams_updated_at BEFORE UPDATE ON dental_exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert demo tenant
INSERT INTO tenants (id, name, api_key, active) VALUES 
(
    'demo-tenant-uuid-here'::uuid,
    'Demo Clinic',
    'demo_api_key_12345',
    true
) ON CONFLICT (api_key) DO NOTHING;

-- Sample data for testing (optional)
INSERT INTO dental_exams (id, tenant_id, original_filename, file_path, content_type, status) VALUES
(
    'ex_sample123456',
    'demo-tenant-uuid-here'::uuid,
    'sample_xray.jpg',
    'demo_tenant/ex_sample123456.jpg',
    'image/jpeg',
    'completed'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO dental_findings (exam_id, tooth_number, finding_type, severity, confidence, coordinates, description) VALUES
(
    'ex_sample123456',
    '14',
    'caries',
    'moderate',
    0.85,
    '{"x": 150, "y": 200, "width": 30, "height": 25}',
    'Distal caries detected on upper right first premolar'
),
(
    'ex_sample123456',
    '36',
    'caries',
    'mild',
    0.72,
    '{"x": 400, "y": 180, "width": 20, "height": 20}',
    'Occlusal caries detected on lower left first molar'
) ON CONFLICT DO NOTHING;