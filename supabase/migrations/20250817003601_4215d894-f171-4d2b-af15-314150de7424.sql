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

-- Atualizar campo analysis_types para incluir as novas modalidades
ALTER TABLE dental_images ALTER COLUMN analysis_types SET DEFAULT ARRAY['caries', 'periodontal', 'periapical', 'implants', 'fractures', 'orthodontics']::text[];

-- Adicionar comentários atualizados
COMMENT ON COLUMN dental_findings.finding_type IS 'Tipo de achado: Fase 1 (caries, periodontal, periapical) + Fase 2 (implants, fractures, orthodontics)';
COMMENT ON COLUMN dental_findings.severity IS 'Severidade expandida: clínica geral + graduações ortodônticas + status de implantes';
COMMENT ON COLUMN dental_images.analysis_types IS 'Modalidades de análise: caries, periodontal, periapical, implants, fractures, orthodontics';