-- Drop existing chamados table (será substituído)
DROP TABLE IF EXISTS public.chamados CASCADE;

-- Create eventos table for Uniforce OPS
CREATE TABLE public.eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- COBRANCA, ATENDIMENTO, SINAL, NPS
  event_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Cliente fields
  cliente_id INTEGER NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_tipo_pessoa TEXT, -- F, J
  cliente_documento TEXT,
  cliente_email TEXT,
  cliente_celular TEXT,
  cliente_cidade TEXT,
  cliente_uf TEXT,
  cliente_segmento TEXT, -- Residencial, PME
  cliente_data_cadastro TIMESTAMP WITH TIME ZONE,
  
  -- Servico fields
  servico_id INTEGER,
  tipo_servico TEXT,
  plano_nome TEXT,
  velocidade_down_mbps INTEGER,
  velocidade_up_mbps INTEGER,
  valor_mensalidade DECIMAL(10,2),
  dia_vencimento INTEGER,
  servico_status_codigo INTEGER,
  servico_status TEXT, -- Liberado, Bloqueado, Suspenso, Cancelado
  data_instalacao DATE,
  
  -- Cobranca fields
  cobranca_id DECIMAL(15,1),
  cobranca_status_codigo DECIMAL(5,1),
  cobranca_status TEXT, -- Em Aberto, Pago, Cancelado, Vencido
  data_gerado TIMESTAMP WITH TIME ZONE,
  data_vencimento DATE,
  data_pagamento DATE,
  valor_cobranca DECIMAL(10,2),
  valor_pago DECIMAL(10,2),
  metodo_cobranca TEXT,
  dias_atraso DECIMAL(10,1),
  vencido BOOLEAN,
  
  -- Atendimento fields
  atendimento_id DECIMAL(15,1),
  protocolo TEXT,
  assunto TEXT,
  categoria TEXT,
  motivo_contato TEXT,
  origem TEXT,
  setor TEXT,
  urgencia TEXT,
  atendimento_status TEXT,
  tempo_atendimento_min DECIMAL(10,1),
  resolvido_primeiro_contato BOOLEAN,
  reincidente_30d BOOLEAN,
  
  -- Sinal fields
  rx_dbm DECIMAL(10,2),
  tx_dbm DECIMAL(10,2),
  snr_db DECIMAL(10,2),
  latency_ms DECIMAL(10,2),
  jitter_ms DECIMAL(10,2),
  packet_loss_pct DECIMAL(10,4),
  downtime_min_24h DECIMAL(10,2),
  
  -- NPS fields
  nps_score INTEGER,
  nps_comment TEXT,
  
  -- Risk fields
  churn_risk_score INTEGER,
  churn_risk_bucket TEXT, -- Baixo, Médio, Alto, Crítico
  inadimplencia_risk_score INTEGER,
  inadimplencia_bucket TEXT,
  alerta_tipo TEXT,
  acao_recomendada_1 TEXT,
  acao_recomendada_2 TEXT,
  acao_recomendada_3 TEXT,
  mes_referencia DATE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_eventos_cliente_id ON public.eventos(cliente_id);
CREATE INDEX idx_eventos_event_type ON public.eventos(event_type);
CREATE INDEX idx_eventos_event_datetime ON public.eventos(event_datetime);
CREATE INDEX idx_eventos_churn_bucket ON public.eventos(churn_risk_bucket);
CREATE INDEX idx_eventos_servico_status ON public.eventos(servico_status);

-- Enable RLS
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- Public read access (dashboard is public)
CREATE POLICY "Public can view eventos" 
ON public.eventos 
FOR SELECT 
USING (true);

-- Service role can insert/update/delete
CREATE POLICY "Service role can insert eventos" 
ON public.eventos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update eventos" 
ON public.eventos 
FOR UPDATE 
USING (true);

CREATE POLICY "Service role can delete eventos" 
ON public.eventos 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_eventos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_eventos_updated_at
BEFORE UPDATE ON public.eventos
FOR EACH ROW
EXECUTE FUNCTION public.update_eventos_updated_at();