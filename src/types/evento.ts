export interface Evento {
  id?: string;
  event_id: string;
  event_type: 'COBRANCA' | 'ATENDIMENTO' | 'SINAL' | 'NPS';
  event_datetime: string;
  mes_referencia: string;
  
  // Cliente
  cliente_id: string;
  cliente_nome: string;
  cliente_documento: string | null;
  cliente_email: string | null;
  cliente_celular: string | null;
  cliente_cidade: string | null;
  cliente_bairro: string | null;
  cliente_uf: string | null;
  cliente_cep: string | null;
  cliente_segmento: string | null;
  cliente_data_cadastro: string | null;
  
  // GEO
  geo_lat: number | null;
  geo_lng: number | null;
  
  // Servico
  servico_id: string | null;
  tipo_servico: string | null;
  plano_nome: string | null;
  velocidade_down_mbps: number | null;
  velocidade_up_mbps: number | null;
  valor_mensalidade: number | null;
  dia_vencimento: number | null;
  servico_status: string | null;
  data_instalacao: string | null;
  
  // LTV
  ltv_meses_estimado: number | null;
  ltv_reais_estimado: number | null;
  
  // Cobranca
  cobranca_status: string | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  valor_cobranca: number | null;
  valor_pago: number | null;
  metodo_cobranca: string | null;
  dias_atraso: number | null;
  vencido: boolean | null;
  
  // Atendimento
  motivo_contato: string | null;
  categoria: string | null;
  setor: string | null;
  origem: string | null;
  urgencia: string | null;
  tempo_atendimento_min: number | null;
  reincidente_30d: boolean | null;
  resolvido_primeiro_contato: boolean | null;
  
  // Sinal
  rx_dbm: number | null;
  tx_dbm: number | null;
  snr_db: number | null;
  latency_ms: number | null;
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
  
  // Legacy compatibility
  servico_status_codigo?: number | null;
  cobranca_status_codigo?: number | null;
  cobranca_id?: number | null;
  atendimento_id?: number | null;
  atendimento_status?: string | null;
  protocolo?: string | null;
  assunto?: string | null;
  jitter_ms?: number | null;
  data_gerado?: string | null;
  cliente_tipo_pessoa?: string | null;
}

export interface Cliente {
  cliente_id: string;
  cliente_nome: string;
  cliente_documento: string;
  cliente_email: string;
  cliente_celular: string;
  cliente_cidade: string;
  cliente_bairro: string;
  cliente_uf: string;
  cliente_cep: string;
  geo_lat: number;
  geo_lng: number;
  cliente_segmento: string;
  cliente_data_cadastro: string;
  servico_id: string;
  tipo_servico: string;
  plano_nome: string;
  velocidade_down_mbps: number;
  velocidade_up_mbps: number;
  valor_mensalidade: number;
  dia_vencimento: number;
  data_instalacao: string;
  ltv_meses_estimado: number;
  ltv_reais_estimado: number;
}

export interface MetricaMensal {
  mes: string;
  clientes_ativos: number;
  novos_clientes: number;
  churn_rescisoes: number;
  MRR_total: number;
  Faturamento_recebido: number;
  R_em_aberto: number;
  R_vencido: number;
  MRR_em_risco_churn: number;
  LTV_em_risco_churn: number;
}

export interface FilterState {
  periodo: '7d' | '30d' | '90d' | '12m' | 'custom';
  plano: string | null;
  cidade: string | null;
  bairro: string | null;
  segmento: string | null;
  status: string | null;
  normalizar: boolean;
  driver: 'all' | 'instabilidade' | 'financeiro' | 'reincidencia' | 'detrator';
}

export interface ClienteRisco {
  cliente_id: string;
  cliente_nome: string;
  plano_nome: string;
  cidade: string;
  bairro: string;
  score: number;
  bucket: string;
  driver: string;
  acoes: string[];
  valor_mensalidade: number;
  geo_lat: number | null;
  geo_lng: number | null;
}

export interface ClienteCobranca {
  cliente_id: string;
  cliente_nome: string;
  cobranca_status: string;
  data_vencimento: string;
  valor_cobranca: number;
  metodo_cobranca: string;
  dias_atraso: number;
  acoes: string[];
}

// Legacy compatibility
export interface ClienteAgregado {
  cliente_id: string;
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
