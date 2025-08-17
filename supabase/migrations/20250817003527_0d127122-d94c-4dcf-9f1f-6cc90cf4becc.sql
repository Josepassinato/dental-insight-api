-- FASE 2: Expandir análises para incluir Implantes, Fraturas e Ortodontia
-- Adicionar novos tipos de findings para as modalidades da Fase 2

DO $$ 
BEGIN
    -- Remover constraint antiga e adicionar nova com todos os tipos da Fase 1 + Fase 2
    ALTER TABLE dental_findings DROP CONSTRAINT IF EXISTS dental_findings_finding_type_check;
    
    -- Adicionar constraint expandida com todos os tipos de análise (Fase 1 + Fase 2)
    ALTER TABLE dental_findings ADD CONSTRAINT dental_findings_finding_type_check 
    CHECK (finding_type IN (
        -- FASE 1: Cáries, Periodontal, Periapical
        'caries', 'periodontal', 'periapical', 'cavity', 'bone_loss', 'periapical_lesion', 
        'gingivitis', 'calculus', 'root_canal_issue', 'carie_oclusal_profunda', 'carie_cervical', 
        'carie_recorrente', 'perda_ossea_horizontal', 'perda_ossea_vertical', 'envolvimento_furca',
        'granuloma_periapical', 'cisto_radicular', 'abscesso_agudo', 'reabsorcao_radicular', 'necrose_pulpar',
        
        -- FASE 2: Implantes
        'implant_analysis', 'implant_positioning', 'implant_integration', 'implant_failure', 
        'bone_density_low', 'bone_density_adequate', 'implant_crown_misalignment', 'peri_implantitis',
        'implant_loosening', 'sinus_perforation', 'nerve_proximity', 'implant_angulation_error',
        
        -- FASE 2: Fraturas
        'fracture', 'root_fracture', 'crown_fracture', 'enamel_fracture', 'vertical_root_fracture',
        'horizontal_root_fracture', 'alveolar_fracture', 'tooth_crack', 'craze_lines', 'split_tooth',
        
        -- FASE 2: Ortodontia
        'orthodontic', 'malocclusion', 'crowding', 'spacing', 'overbite', 'underbite', 'crossbite',
        'open_bite', 'dental_rotation', 'tooth_impaction', 'eruption_problem', 'midline_deviation',
        'bracket_position', 'wire_problems', 'root_resorption_orthodontic'
    ));
    
    -- Expandir severidades para incluir graduações ortodônticas e de implantes
    ALTER TABLE dental_findings DROP CONSTRAINT IF EXISTS dental_findings_severity_check;
    ALTER TABLE dental_findings ADD CONSTRAINT dental_findings_severity_check 
    CHECK (severity IN (
        'leve', 'moderada', 'severa', 'inicial', 'avançada', 'crítica',
        -- Graduações para ortodontia
        'classe_i', 'classe_ii', 'classe_iii', 'grau_1', 'grau_2', 'grau_3',
        -- Graduações para implantes
        'osseointegrado', 'parcialmente_integrado', 'falha_integracao', 'sucesso', 'complicacao'
    ));
    
END $$;

-- Adicionar novos índices para performance
CREATE INDEX IF NOT EXISTS idx_dental_findings_analysis_modality ON dental_findings(
    CASE 
        WHEN finding_type IN ('caries', 'cavity', 'carie_oclusal_profunda', 'carie_cervical', 'carie_recorrente') THEN 'caries'
        WHEN finding_type IN ('periodontal', 'bone_loss', 'gingivitis', 'calculus', 'perda_ossea_horizontal', 'perda_ossea_vertical', 'envolvimento_furca') THEN 'periodontal'
        WHEN finding_type IN ('periapical', 'periapical_lesion', 'root_canal_issue', 'granuloma_periapical', 'cisto_radicular', 'abscesso_agudo', 'reabsorcao_radicular', 'necrose_pulpar') THEN 'periapical'
        WHEN finding_type IN ('implant_analysis', 'implant_positioning', 'implant_integration', 'implant_failure', 'bone_density_low', 'bone_density_adequate', 'implant_crown_misalignment', 'peri_implantitis', 'implant_loosening', 'sinus_perforation', 'nerve_proximity', 'implant_angulation_error') THEN 'implants'
        WHEN finding_type IN ('fracture', 'root_fracture', 'crown_fracture', 'enamel_fracture', 'vertical_root_fracture', 'horizontal_root_fracture', 'alveolar_fracture', 'tooth_crack', 'craze_lines', 'split_tooth') THEN 'fractures'
        WHEN finding_type IN ('orthodontic', 'malocclusion', 'crowding', 'spacing', 'overbite', 'underbite', 'crossbite', 'open_bite', 'dental_rotation', 'tooth_impaction', 'eruption_problem', 'midline_deviation', 'bracket_position', 'wire_problems', 'root_resorption_orthodontic') THEN 'orthodontics'
        ELSE 'other'
    END
);

-- Atualizar campo analysis_types para incluir as novas modalidades
ALTER TABLE dental_images ALTER COLUMN analysis_types SET DEFAULT ARRAY['caries', 'periodontal', 'periapical', 'implants', 'fractures', 'orthodontics']::text[];

-- Adicionar comentários atualizados
COMMENT ON COLUMN dental_findings.finding_type IS 'Tipo de achado: Fase 1 (caries, periodontal, periapical) + Fase 2 (implants, fractures, orthodontics)';
COMMENT ON COLUMN dental_findings.severity IS 'Severidade expandida: clínica geral + graduações ortodônticas + status de implantes';
COMMENT ON COLUMN dental_images.analysis_types IS 'Modalidades de análise: caries, periodontal, periapical, implants, fractures, orthodontics';

-- Adicionar tabela de configurações para modalidades de análise
CREATE TABLE IF NOT EXISTS analysis_modalities (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    modality_name text NOT NULL,
    is_enabled boolean NOT NULL DEFAULT true,
    configuration jsonb NOT NULL DEFAULT '{}',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS para tabela de modalidades
ALTER TABLE analysis_modalities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage analysis modalities in their tenant" 
ON analysis_modalities 
FOR ALL 
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- Inserir configurações padrão das modalidades para tenants existentes
INSERT INTO analysis_modalities (tenant_id, modality_name, configuration)
SELECT DISTINCT tenant_id, 'caries', '{"enabled": true, "confidence_threshold": 0.85}'::jsonb 
FROM tenants 
WHERE NOT EXISTS (SELECT 1 FROM analysis_modalities WHERE tenant_id = tenants.id AND modality_name = 'caries');

INSERT INTO analysis_modalities (tenant_id, modality_name, configuration)
SELECT DISTINCT tenant_id, 'periodontal', '{"enabled": true, "confidence_threshold": 0.80}'::jsonb 
FROM tenants 
WHERE NOT EXISTS (SELECT 1 FROM analysis_modalities WHERE tenant_id = tenants.id AND modality_name = 'periodontal');

INSERT INTO analysis_modalities (tenant_id, modality_name, configuration)
SELECT DISTINCT tenant_id, 'periapical', '{"enabled": true, "confidence_threshold": 0.85}'::jsonb 
FROM tenants 
WHERE NOT EXISTS (SELECT 1 FROM analysis_modalities WHERE tenant_id = tenants.id AND modality_name = 'periapical');

INSERT INTO analysis_modalities (tenant_id, modality_name, configuration)
SELECT DISTINCT tenant_id, 'implants', '{"enabled": true, "confidence_threshold": 0.75}'::jsonb 
FROM tenants 
WHERE NOT EXISTS (SELECT 1 FROM analysis_modalities WHERE tenant_id = tenants.id AND modality_name = 'implants');

INSERT INTO analysis_modalities (tenant_id, modality_name, configuration)
SELECT DISTINCT tenant_id, 'fractures', '{"enabled": true, "confidence_threshold": 0.80}'::jsonb 
FROM tenants 
WHERE NOT EXISTS (SELECT 1 FROM analysis_modalities WHERE tenant_id = tenants.id AND modality_name = 'fractures');

INSERT INTO analysis_modalities (tenant_id, modality_name, configuration)
SELECT DISTINCT tenant_id, 'orthodontics', '{"enabled": true, "confidence_threshold": 0.70}'::jsonb 
FROM tenants 
WHERE NOT EXISTS (SELECT 1 FROM analysis_modalities WHERE tenant_id = tenants.id AND modality_name = 'orthodontics');