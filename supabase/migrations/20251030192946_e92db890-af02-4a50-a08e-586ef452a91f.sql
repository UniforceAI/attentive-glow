-- Remover políticas RLS que exigem autenticação na tabela chamados
DROP POLICY IF EXISTS "Support staff and admins can manage chamados" ON public.chamados;
DROP POLICY IF EXISTS "Support staff and admins can view chamados" ON public.chamados;

-- Criar política pública para visualizar chamados
CREATE POLICY "Allow public read access to chamados"
ON public.chamados
FOR SELECT
TO public
USING (true);

-- Criar política pública para inserir chamados (para o webhook do n8n)
CREATE POLICY "Allow public insert to chamados"
ON public.chamados
FOR INSERT
TO public
WITH CHECK (true);

-- Criar política pública para atualizar chamados
CREATE POLICY "Allow public update to chamados"
ON public.chamados
FOR UPDATE
TO public
USING (true);

-- Criar política pública para deletar chamados
CREATE POLICY "Allow public delete from chamados"
ON public.chamados
FOR DELETE
TO public
USING (true);