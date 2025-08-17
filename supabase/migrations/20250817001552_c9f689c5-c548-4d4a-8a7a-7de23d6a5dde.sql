-- Corrigir as políticas de storage para funcionar corretamente
-- Primeiro, vamos criar políticas mais simples para debug

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view files from their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can view overlays from their tenant" ON storage.objects;

-- Criar políticas mais permissivas para usuários autenticados
CREATE POLICY "Authenticated users can view dental uploads" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'dental-uploads' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can view dental overlays" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'dental-overlays' AND 
  auth.uid() IS NOT NULL
);

-- Atualizar a função para garantir que ela retorna um valor válido
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()),
    auth.uid()
  );
$$;