import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Evento } from "@/types/evento";
import { useToast } from "@/hooks/use-toast";

export function useEventos() {
  const { toast } = useToast();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEventos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .order('event_datetime', { ascending: false });

      if (error) throw error;
      setEventos((data as unknown as Evento[]) || []);
    } catch (error: any) {
      console.error("Erro ao carregar eventos:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromFile = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Carregando dados...",
        description: "Importando 5000 eventos do arquivo",
      });

      const response = await fetch('/data/eventos.jsonl');
      const text = await response.text();
      const lines = text.trim().split('\n');
      const records = lines.map(line => JSON.parse(line));

      // Clear existing data
      await supabase.from('eventos').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert in batches
      const batchSize = 500;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize).map((r: any) => ({
          event_id: r.event_id,
          event_type: r.event_type,
          event_datetime: r.event_datetime,
          cliente_id: r.cliente_id,
          cliente_nome: r.cliente_nome,
          cliente_tipo_pessoa: r.cliente_tipo_pessoa,
          cliente_documento: r.cliente_documento,
          cliente_email: r.cliente_email,
          cliente_celular: r.cliente_celular,
          cliente_cidade: r.cliente_cidade,
          cliente_uf: r.cliente_uf,
          cliente_segmento: r.cliente_segmento,
          cliente_data_cadastro: r.cliente_data_cadastro,
          servico_id: r.servico_id,
          tipo_servico: r.tipo_servico,
          plano_nome: r.plano_nome,
          velocidade_down_mbps: r.velocidade_down_mbps,
          velocidade_up_mbps: r.velocidade_up_mbps,
          valor_mensalidade: r.valor_mensalidade,
          dia_vencimento: r.dia_vencimento,
          servico_status_codigo: r.servico_status_codigo,
          servico_status: r.servico_status,
          data_instalacao: r.data_instalacao,
          cobranca_id: r.cobranca_id,
          cobranca_status_codigo: r.cobranca_status_codigo,
          cobranca_status: r.cobranca_status,
          data_gerado: r.data_gerado,
          data_vencimento: r.data_vencimento,
          data_pagamento: r.data_pagamento,
          valor_cobranca: r.valor_cobranca,
          valor_pago: r.valor_pago,
          metodo_cobranca: r.metodo_cobranca,
          dias_atraso: r.dias_atraso,
          vencido: r.vencido,
          atendimento_id: r.atendimento_id,
          protocolo: r.protocolo,
          assunto: r.assunto,
          categoria: r.categoria,
          motivo_contato: r.motivo_contato,
          origem: r.origem,
          setor: r.setor,
          urgencia: r.urgencia,
          atendimento_status: r.atendimento_status,
          tempo_atendimento_min: r.tempo_atendimento_min,
          resolvido_primeiro_contato: r.resolvido_primeiro_contato,
          reincidente_30d: r.reincidente_30d,
          rx_dbm: r.rx_dbm,
          tx_dbm: r.tx_dbm,
          snr_db: r.snr_db,
          latency_ms: r.latency_ms,
          jitter_ms: r.jitter_ms,
          packet_loss_pct: r.packet_loss_pct,
          downtime_min_24h: r.downtime_min_24h,
          nps_score: r.nps_score,
          nps_comment: r.nps_comment,
          churn_risk_score: r.churn_risk_score,
          churn_risk_bucket: r.churn_risk_bucket,
          inadimplencia_risk_score: r.inadimplencia_risk_score,
          inadimplencia_bucket: r.inadimplencia_bucket,
          alerta_tipo: r.alerta_tipo,
          acao_recomendada_1: r.acao_recomendada_1,
          acao_recomendada_2: r.acao_recomendada_2,
          acao_recomendada_3: r.acao_recomendada_3,
          mes_referencia: r.mes_referencia,
        }));

        const { error } = await supabase.from('eventos').insert(batch as any);
        if (error) throw error;
      }

      toast({
        title: "Dados carregados!",
        description: `${records.length} eventos importados com sucesso`,
      });

      await fetchEventos();
    } catch (error: any) {
      console.error("Erro ao carregar arquivo:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      const { count } = await supabase.from('eventos').select('*', { count: 'exact', head: true });
      if (!count || count === 0) {
        await loadFromFile();
      } else {
        await fetchEventos();
      }
    };
    initData();
  }, []);

  return { eventos, isLoading, fetchEventos, loadFromFile };
}
