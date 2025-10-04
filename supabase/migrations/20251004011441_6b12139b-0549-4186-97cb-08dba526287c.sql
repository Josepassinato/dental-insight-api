-- Deletar todos os exames do tenant de teste
-- Tenant ID: 0d4e4488-a54d-4c32-8857-62aa17832966

-- Primeiro, deletar findings relacionados às imagens dos exames
DELETE FROM dental_findings 
WHERE dental_image_id IN (
  SELECT id FROM dental_images 
  WHERE tenant_id = '0d4e4488-a54d-4c32-8857-62aa17832966'
);

-- Depois, deletar as imagens dentais
DELETE FROM dental_images 
WHERE tenant_id = '0d4e4488-a54d-4c32-8857-62aa17832966';

-- Por fim, deletar os exames
DELETE FROM exams 
WHERE tenant_id = '0d4e4488-a54d-4c32-8857-62aa17832966';

-- Resetar o contador de uso mensal
UPDATE tenant_plans 
SET current_month_usage = 0 
WHERE tenant_id = '0d4e4488-a54d-4c32-8857-62aa17832966';