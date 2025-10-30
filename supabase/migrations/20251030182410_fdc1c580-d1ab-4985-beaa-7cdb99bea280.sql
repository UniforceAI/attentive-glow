-- Criar tabela para armazenar chamados
CREATE TABLE public.chamados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_cliente INTEGER NOT NULL,
  qtd_chamados INTEGER NOT NULL,
  protocolo TEXT NOT NULL,
  data_abertura TEXT NOT NULL,
  ultima_atualizacao TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  setor TEXT NOT NULL,
  categoria TEXT NOT NULL,
  motivo_contato TEXT NOT NULL,
  origem TEXT NOT NULL,
  solicitante TEXT NOT NULL,
  urgencia TEXT NOT NULL,
  status TEXT NOT NULL,
  dias_desde_ultimo INTEGER,
  tempo_atendimento TEXT NOT NULL,
  classificacao TEXT NOT NULL,
  insight TEXT NOT NULL,
  chamados_anteriores TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para busca por cliente
CREATE INDEX idx_chamados_id_cliente ON public.chamados(id_cliente);

-- Criar índice para busca por protocolo
CREATE INDEX idx_chamados_protocolo ON public.chamados(protocolo);

-- Criar índice para data de abertura
CREATE INDEX idx_chamados_data_abertura ON public.chamados(data_abertura);

-- Habilitar RLS (dados públicos de leitura apenas)
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para todos
CREATE POLICY "Permitir leitura pública de chamados"
ON public.chamados
FOR SELECT
USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_chamados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_chamados_updated_at
BEFORE UPDATE ON public.chamados
FOR EACH ROW
EXECUTE FUNCTION public.update_chamados_updated_at();