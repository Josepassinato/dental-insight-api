-- Expandir tipos de análise dental para incluir periodontal e lesões periapicais
-- Atualizar enum de finding_type se existir, senão criar constraint

-- Primeiro, vamos verificar se precisamos atualizar constraints existentes
DO $$ 
BEGIN
    -- Adicionar novos tipos de análise à tabela dental_findings
    -- Como não temos um enum definido, vamos adicionar uma constraint check mais ampla
    
    -- Remover constraint antiga se existir
    ALTER TABLE dental_findings DROP CONSTRAINT IF EXISTS dental_findings_finding_type_check;
    
    -- Adicionar nova constraint com todos os tipos de análise
    ALTER TABLE dental_findings ADD CONSTRAINT dental_findings_finding_type_check 
    CHECK (finding_type IN ('caries', 'periodontal', 'periapical', 'cavity', 'bone_loss', 'periapical_lesion', 'gingivitis', 'calculus', 'root_canal_issue'));
    
    -- Adicionar novos tipos de severidade se necessário
    ALTER TABLE dental_findings DROP CONSTRAINT IF EXISTS dental_findings_severity_check;
    ALTER TABLE dental_findings ADD CONSTRAINT dental_findings_severity_check 
    CHECK (severity IN ('leve', 'moderada', 'severa', 'inicial', 'avançada', 'crítica'));
    
END $$;

-- Adicionar índices para melhor performance nas consultas por tipo
CREATE INDEX IF NOT EXISTS idx_dental_findings_finding_type ON dental_findings(finding_type);
CREATE INDEX IF NOT EXISTS idx_dental_findings_severity ON dental_findings(severity);

-- Atualizar a tabela dental_images para suportar múltiplos tipos de análise
ALTER TABLE dental_images ADD COLUMN IF NOT EXISTS analysis_types text[] DEFAULT ARRAY['caries']::text[];

-- Adicionar comentários para documentação
COMMENT ON COLUMN dental_findings.finding_type IS 'Tipo de achado: caries, periodontal, periapical, cavity, bone_loss, periapical_lesion, gingivitis, calculus, root_canal_issue';
COMMENT ON COLUMN dental_findings.severity IS 'Severidade: leve, moderada, severa, inicial, avançada, crítica';
COMMENT ON COLUMN dental_images.analysis_types IS 'Tipos de análise aplicados à imagem: caries, periodontal, periapical';