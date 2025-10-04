-- Criar usuários de teste e configurar roles
-- Todos os usuários terão senha: Test123!@#

-- 1. Criar usuários de teste no auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES
  -- Owner de teste
  (
    'a1111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'owner@teste.com',
    crypt('Test123!@#', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Owner Teste"}',
    false,
    'authenticated',
    'authenticated'
  ),
  -- Admin de teste
  (
    'a2222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'admin@teste.com',
    crypt('Test123!@#', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin Teste"}',
    false,
    'authenticated',
    'authenticated'
  ),
  -- Dentist de teste
  (
    'a3333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'dentist@teste.com',
    crypt('Test123!@#', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dentista Teste"}',
    false,
    'authenticated',
    'authenticated'
  ),
  -- Assistant de teste
  (
    'a4444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'assistant@teste.com',
    crypt('Test123!@#', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Assistente Teste"}',
    false,
    'authenticated',
    'authenticated'
  ),
  -- Viewer de teste
  (
    'a5555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'viewer@teste.com',
    crypt('Test123!@#', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Visualizador Teste"}',
    false,
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Criar profiles para os usuários de teste
INSERT INTO public.profiles (id, email, full_name, tenant_id, role)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'owner@teste.com', 'Owner Teste', '0d4e4488-a54d-4c32-8857-62aa17832966', 'dentist'),
  ('a2222222-2222-2222-2222-222222222222', 'admin@teste.com', 'Admin Teste', '0d4e4488-a54d-4c32-8857-62aa17832966', 'dentist'),
  ('a3333333-3333-3333-3333-333333333333', 'dentist@teste.com', 'Dentista Teste', '0d4e4488-a54d-4c32-8857-62aa17832966', 'dentist'),
  ('a4444444-4444-4444-4444-444444444444', 'assistant@teste.com', 'Assistente Teste', '0d4e4488-a54d-4c32-8857-62aa17832966', 'dentist'),
  ('a5555555-5555-5555-5555-555555555555', 'viewer@teste.com', 'Visualizador Teste', '0d4e4488-a54d-4c32-8857-62aa17832966', 'dentist')
ON CONFLICT (id) DO NOTHING;

-- 3. Configurar roles na tabela user_roles
INSERT INTO public.user_roles (user_id, tenant_id, role, created_by)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '0d4e4488-a54d-4c32-8857-62aa17832966', 'owner', '0d4e4488-a54d-4c32-8857-62aa17832966'),
  ('a2222222-2222-2222-2222-222222222222', '0d4e4488-a54d-4c32-8857-62aa17832966', 'admin', '0d4e4488-a54d-4c32-8857-62aa17832966'),
  ('a3333333-3333-3333-3333-333333333333', '0d4e4488-a54d-4c32-8857-62aa17832966', 'dentist', '0d4e4488-a54d-4c32-8857-62aa17832966'),
  ('a4444444-4444-4444-4444-444444444444', '0d4e4488-a54d-4c32-8857-62aa17832966', 'assistant', '0d4e4488-a54d-4c32-8857-62aa17832966'),
  ('a5555555-5555-5555-5555-555555555555', '0d4e4488-a54d-4c32-8857-62aa17832966', 'viewer', '0d4e4488-a54d-4c32-8857-62aa17832966')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 4. Comentários informativos
COMMENT ON TABLE public.user_roles IS 'Test users created with password: Test123!@#';
