-- PARTE 1: Adicionar novo valor ao enum
-- Deve ser feito em transação separada

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'system_admin';