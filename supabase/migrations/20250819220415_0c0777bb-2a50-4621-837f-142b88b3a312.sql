-- Verificar se já existe um plano ativo e atualizar/criar conforme necessário
DO $$
DECLARE
    tenant_uuid UUID;
BEGIN
    -- Buscar o primeiro tenant ativo (assumindo que você é o usuário principal)
    SELECT id INTO tenant_uuid FROM tenants LIMIT 1;
    
    IF tenant_uuid IS NOT NULL THEN
        -- Verificar se já existe um plano para este tenant
        IF EXISTS (SELECT 1 FROM tenant_plans WHERE tenant_id = tenant_uuid) THEN
            -- Atualizar plano existente com limite maior e resetar uso
            UPDATE tenant_plans 
            SET 
                monthly_exam_limit = 1000,
                current_month_usage = 0,
                billing_cycle_start = CURRENT_DATE,
                plan_type = 'premium',
                updated_at = now()
            WHERE tenant_id = tenant_uuid;
            
            RAISE NOTICE 'Plano atualizado para tenant %', tenant_uuid;
        ELSE
            -- Criar novo plano com limite alto
            INSERT INTO tenant_plans (
                tenant_id,
                plan_type,
                monthly_exam_limit,
                current_month_usage,
                billing_cycle_start,
                is_active
            ) VALUES (
                tenant_uuid,
                'premium',
                1000,
                0,
                CURRENT_DATE,
                true
            );
            
            RAISE NOTICE 'Novo plano criado para tenant %', tenant_uuid;
        END IF;
    ELSE
        RAISE NOTICE 'Nenhum tenant encontrado';
    END IF;
END $$;