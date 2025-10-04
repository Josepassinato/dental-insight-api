-- Atualizar créditos de exames para 60
-- Tenant ID: 0d4e4488-a54d-4c32-8857-62aa17832966

UPDATE tenant_plans 
SET 
  monthly_exam_limit = 60,
  updated_at = now()
WHERE tenant_id = '0d4e4488-a54d-4c32-8857-62aa17832966';