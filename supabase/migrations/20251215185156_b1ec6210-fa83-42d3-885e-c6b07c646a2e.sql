-- Remover política antiga que exige autenticação
DROP POLICY IF EXISTS "Authenticated users can view chamados" ON public.chamados;

-- Criar nova política para permitir leitura pública
CREATE POLICY "Public can view chamados" 
ON public.chamados 
FOR SELECT 
USING (true);