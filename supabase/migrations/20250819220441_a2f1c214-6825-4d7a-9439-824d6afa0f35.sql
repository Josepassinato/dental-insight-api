-- Atualizar o limite de exames para o plano existente ou criar novo com valores válidos
DO $$
DECLARE
    tenant_uuid UUID;
BEGIN
    -- Buscar o primeiro tenant ativo
    SELECT id INTO tenant_uuid FROM tenants LIMIT 1;
    
    IF tenant_uuid IS NOT NULL THEN
        -- Verificar se já existe um plano para este tenant
        IF EXISTS (SELECT 1 FROM tenant_plans WHERE tenant_id = tenant_uuid) THEN
            -- Atualizar plano existente - aumentar limite e resetar uso
            UPDATE tenant_plans 
            SET 
                monthly_exam_limit = 1000,
                current_month_usage = 0,
                billing_cycle_start = CURRENT_DATE,
                updated_at = now()
            WHERE tenant_id = tenant_uuid;
            
            RAISE NOTICE 'Limite de exames aumentado para 1000 e uso resetado para tenant %', tenant_uuid;
        ELSE
            -- Criar novo plano com limite alto (usar 'basic' que é valor válido)
            INSERT INTO tenant_plans (
                tenant_id,
                plan_type,
                monthly_exam_limit,
                current_month_usage,
                billing_cycle_start,
                is_active
            ) VALUES (
                tenant_uuid,
                'basic',
                1000,
                0,
                CURRENT_DATE,
                true
            );
            
            RAISE NOTICE 'Novo plano criado com limite de 1000 exames para tenant %', tenant_uuid;
        END IF;
    ELSE
        RAISE NOTICE 'Nenhum tenant encontrado para configurar o plano';
    END IF;
END $$;