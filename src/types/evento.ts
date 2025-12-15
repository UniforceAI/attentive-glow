export interface Evento {
  id: string;
  event_id: number;
  event_type: 'COBRANCA' | 'ATENDIMENTO' | 'SINAL' | 'NPS';
  event_datetime: string;
  
  // Cliente
  cliente_id: number;
  cliente_nome: string;
  cliente_tipo_pessoa: string | null;
  cliente_documento: string | null;
  cliente_email: string | null;
  cliente_celular: string | null;
  cliente_cidade: string | null;
  cliente_uf: string | null;
  cliente_segmento: string | null;
  cliente_data_cadastro: string | null;
  
  // Servico
  servico_id: number | null;
  tipo_servico: string | null;
  plano_nome: string | null;
  velocidade_down_mbps: number | null;
  velocidade_up_mbps: number | null;
  valor_mensalidade: number | null;
  dia_vencimento: number | null;
  servico_status_codigo: number | null;
  servico_status: string | null;
  data_instalacao: string | null;
  
  // Cobranca
  cobranca_id: number | null;
  cobranca_status_codigo: number | null;
  cobranca_status: string | null;
  data_gerado: string | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  valor_cobranca: number | null;
  valor_pago: number | null;
  metodo_cobranca: string | null;
  dias_atraso: number | null;
  vencido: boolean | null;
  
  // Atendimento
  atendimento_id: number | null;
  protocolo: string | null;
  assunto: string | null;
  categoria: string | null;
  motivo_contato: string | null;
  origem: string | null;
  setor: string | null;
  urgencia: string | null;
  atendimento_status: string | null;
  tempo_atendimento_min: number | null;
  resolvido_primeiro_contato: boolean | null;
  reincidente_30d: boolean | null;
  
  // Sinal
  rx_dbm: number | null;
  tx_dbm: number | null;
  snr_db: number | null;
  latency_ms: number | null;
  jitter_ms: number | null;
  packet_loss_pct: number | null;
  downtime_min_24h: number | null;
  
  // NPS
  nps_score: number | null;
  nps_comment: string | null;
  
  // Risk
  churn_risk_score: number | null;
  churn_risk_bucket: 'Baixo' | 'Médio' | 'Alto' | 'Crítico' | null;
  inadimplencia_risk_score: number | null;
  inadimplencia_bucket: string | null;
  alerta_tipo: string | null;
  acao_recomendada_1: string | null;
  acao_recomendada_2: string | null;
  acao_recomendada_3: string | null;
  mes_referencia: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface ClienteAgregado {
  cliente_id: number;
  cliente_nome: string;
  cliente_email: string | null;
  cliente_celular: string | null;
  cliente_cidade: string | null;
  cliente_uf: string | null;
  cliente_segmento: string | null;
  plano_nome: string | null;
  servico_status: string | null;
  valor_mensalidade: number | null;
  churn_risk_score: number | null;
  churn_risk_bucket: string | null;
  inadimplencia_total: number;
  qtd_atendimentos_30d: number;
  ultimo_evento: string | null;
  acao_recomendada: string | null;
}

export interface KPIData {
  clientesAtivos: number;
  servicosLiberados: number;
  servicosBloqueados: number;
  servicosSuspensos: number;
  mrr: number;
  mrrEmRisco: number;
  inadimplenciaTotal: number;
  ticketN1Por100: number;
  tempoMedioAtendimento: number;
  nps: number;
  promotores: number;
  neutros: number;
  detratores: number;
}
