import { useState, useEffect, useMemo } from "react";
import { Evento, Cliente, MetricaMensal, FilterState, ClienteRisco, ClienteCobranca } from "@/types/evento";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useDataLoader() {
  const { toast } = useToast();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    periodo: '12m',
    plano: null,
    cidade: null,
    bairro: null,
    segmento: null,
    status: null,
    normalizar: false,
    driver: 'all',
  });

  // Fetch all eventos from Supabase
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch all eventos - may need pagination for large datasets
        let allEventos: any[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('eventos')
            .select('*')
            .order('event_datetime', { ascending: false })
            .range(from, from + batchSize - 1);

          if (error) throw error;

          if (data && data.length > 0) {
            allEventos = [...allEventos, ...data];
            from += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }

        // Transform Supabase data to match Evento type
        const transformedEventos: Evento[] = allEventos.map(e => ({
          ...e,
          event_id: String(e.event_id),
          cliente_id: String(e.cliente_id),
          servico_id: e.servico_id ? String(e.servico_id) : null,
          event_type: e.event_type as 'COBRANCA' | 'ATENDIMENTO' | 'SINAL' | 'NPS',
          mes_referencia: e.mes_referencia ? String(e.mes_referencia).substring(0, 7) : null,
          churn_risk_bucket: e.churn_risk_bucket as 'Baixo' | 'Médio' | 'Alto' | 'Crítico' | null,
          geo_lat: e.geo_lat ? Number(e.geo_lat) : null,
          geo_lng: e.geo_lng ? Number(e.geo_lng) : null,
        }));

        setEventos(transformedEventos);
        
        toast({ 
          title: "Dados carregados!", 
          description: `${transformedEventos.length} eventos do Supabase` 
        });
      } catch (error: any) {
        console.error("Erro ao carregar dados do Supabase:", error);
        toast({ 
          title: "Erro ao carregar dados", 
          description: error.message, 
          variant: "destructive" 
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Derive clientes from eventos (unique clients with latest info)
  const clientes = useMemo((): Cliente[] => {
    const clienteMap = new Map<string, Cliente>();
    
    // Sort by event_datetime desc to get latest info first
    const sorted = [...eventos].sort((a, b) => 
      new Date(b.event_datetime).getTime() - new Date(a.event_datetime).getTime()
    );
    
    sorted.forEach(e => {
      if (!clienteMap.has(e.cliente_id)) {
        // Calculate LTV: assume 24 months average lifetime
        const ltvMeses = 24;
        const ltvReais = (e.valor_mensalidade || 0) * ltvMeses;
        
        clienteMap.set(e.cliente_id, {
          cliente_id: e.cliente_id,
          cliente_nome: e.cliente_nome,
          cliente_documento: e.cliente_documento || '',
          cliente_email: e.cliente_email || '',
          cliente_celular: e.cliente_celular || '',
          cliente_cidade: e.cliente_cidade || '',
          cliente_bairro: e.cliente_bairro || '',
          cliente_uf: e.cliente_uf || '',
          cliente_cep: e.cliente_cep || '',
          geo_lat: e.geo_lat || 0,
          geo_lng: e.geo_lng || 0,
          cliente_segmento: e.cliente_segmento || '',
          cliente_data_cadastro: e.cliente_data_cadastro || '',
          servico_id: e.servico_id || '',
          tipo_servico: e.tipo_servico || '',
          plano_nome: e.plano_nome || '',
          velocidade_down_mbps: e.velocidade_down_mbps || 0,
          velocidade_up_mbps: e.velocidade_up_mbps || 0,
          valor_mensalidade: e.valor_mensalidade || 0,
          dia_vencimento: e.dia_vencimento || 0,
          data_instalacao: e.data_instalacao || '',
          ltv_meses_estimado: e.ltv_meses_estimado || ltvMeses,
          ltv_reais_estimado: e.ltv_reais_estimado || ltvReais,
        });
      }
    });
    
    return Array.from(clienteMap.values());
  }, [eventos]);

  // Derive metricasMensais from eventos (aggregate by month)
  const metricasMensais = useMemo((): MetricaMensal[] => {
    const monthMap = new Map<string, MetricaMensal>();
    
    eventos.forEach(e => {
      // Extract month from event_datetime or mes_referencia
      let mes = '';
      if (e.mes_referencia) {
        mes = String(e.mes_referencia).substring(0, 7);
      } else if (e.event_datetime) {
        mes = String(e.event_datetime).substring(0, 7);
      }
      
      if (!mes) return;
      
      if (!monthMap.has(mes)) {
        monthMap.set(mes, {
          mes,
          clientes_ativos: 0,
          novos_clientes: 0,
          churn_rescisoes: 0,
          MRR_total: 0,
          Faturamento_recebido: 0,
          R_em_aberto: 0,
          R_vencido: 0,
          MRR_em_risco_churn: 0,
          LTV_em_risco_churn: 0,
        });
      }
      
      const m = monthMap.get(mes)!;
      
      // Count unique clients per month
      const clientesSet = new Set<string>();
      eventos.filter(ev => {
        const evMes = ev.mes_referencia ? String(ev.mes_referencia).substring(0, 7) : String(ev.event_datetime).substring(0, 7);
        return evMes === mes;
      }).forEach(ev => clientesSet.add(ev.cliente_id));
      m.clientes_ativos = clientesSet.size;
      
      // Aggregate financials
      if (e.event_type === 'COBRANCA') {
        if (e.cobranca_status === 'Pago') {
          m.Faturamento_recebido += e.valor_pago || 0;
        } else if (e.cobranca_status === 'Em Aberto') {
          m.R_em_aberto += e.valor_cobranca || 0;
        } else if (e.cobranca_status === 'Vencido') {
          m.R_vencido += e.valor_cobranca || 0;
        }
      }
      
      // MRR from active services
      if (e.servico_status === 'Liberado' || e.servico_status === 'Ativo') {
        m.MRR_total += e.valor_mensalidade || 0;
      }
      
      // Churn count
      if (e.servico_status === 'Cancelado') {
        m.churn_rescisoes++;
      }
      
      // MRR/LTV at risk
      if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') {
        m.MRR_em_risco_churn += e.valor_mensalidade || 0;
        m.LTV_em_risco_churn += (e.ltv_reais_estimado || (e.valor_mensalidade || 0) * 24);
      }
      
      monthMap.set(mes, m);
    });
    
    // Sort by month desc
    return Array.from(monthMap.values()).sort((a, b) => b.mes.localeCompare(a.mes));
  }, [eventos]);

  // Filter events based on current filters
  const filteredEventos = useMemo(() => {
    let filtered = [...eventos];
    
    if (filters.plano) filtered = filtered.filter(e => e.plano_nome === filters.plano);
    if (filters.cidade) filtered = filtered.filter(e => e.cliente_cidade === filters.cidade);
    if (filters.bairro) filtered = filtered.filter(e => e.cliente_bairro === filters.bairro);
    if (filters.segmento) filtered = filtered.filter(e => e.cliente_segmento === filters.segmento);
    if (filters.status) filtered = filtered.filter(e => e.servico_status === filters.status);
    
    if (filters.driver !== 'all') {
      filtered = filtered.filter(e => {
        switch (filters.driver) {
          case 'instabilidade':
            return e.event_type === 'SINAL' && (e.alerta_tipo === 'Sinal crítico' || e.alerta_tipo === 'Qualidade de rede' || (e.packet_loss_pct && e.packet_loss_pct > 1));
          case 'financeiro':
            return e.event_type === 'COBRANCA' && (e.cobranca_status === 'Vencido' || (e.dias_atraso && e.dias_atraso > 0));
          case 'reincidencia':
            return e.reincidente_30d === true;
          case 'detrator':
            return e.nps_score !== null && e.nps_score !== undefined && e.nps_score <= 6;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [eventos, filters]);

  // Get unique values for filters
  const filterOptions = useMemo(() => ({
    planos: [...new Set(eventos.map(e => e.plano_nome).filter(Boolean))] as string[],
    cidades: [...new Set(eventos.map(e => e.cliente_cidade).filter(Boolean))] as string[],
    bairros: [...new Set(eventos.map(e => e.cliente_bairro).filter(Boolean))] as string[],
    segmentos: [...new Set(eventos.map(e => e.cliente_segmento).filter(Boolean))] as string[],
    status: [...new Set(eventos.map(e => e.servico_status).filter(Boolean))] as string[],
  }), [eventos]);

  // Risk queue - one line per client
  const filaRisco = useMemo((): ClienteRisco[] => {
    const clienteMap = new Map<string, ClienteRisco>();
    
    filteredEventos
      .filter(e => e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico')
      .forEach(e => {
        const existing = clienteMap.get(e.cliente_id);
        if (!existing || (e.churn_risk_score || 0) > existing.score) {
          clienteMap.set(e.cliente_id, {
            cliente_id: e.cliente_id,
            cliente_nome: e.cliente_nome,
            plano_nome: e.plano_nome || '',
            cidade: e.cliente_cidade || '',
            bairro: e.cliente_bairro || '',
            score: e.churn_risk_score || 0,
            bucket: e.churn_risk_bucket || '',
            driver: e.alerta_tipo || 'N/A',
            acoes: [e.acao_recomendada_1, e.acao_recomendada_2, e.acao_recomendada_3].filter(Boolean) as string[],
            valor_mensalidade: e.valor_mensalidade || 0,
            geo_lat: e.geo_lat,
            geo_lng: e.geo_lng,
          });
        }
      });
    
    return Array.from(clienteMap.values()).sort((a, b) => b.score - a.score);
  }, [filteredEventos]);

  // Billing queue - one line per client
  const filaCobranca = useMemo((): ClienteCobranca[] => {
    const clienteMap = new Map<string, ClienteCobranca>();
    
    filteredEventos
      .filter(e => e.event_type === 'COBRANCA' && (e.cobranca_status === 'Vencido' || e.cobranca_status === 'Em Aberto'))
      .forEach(e => {
        const existing = clienteMap.get(e.cliente_id);
        if (!existing || (e.dias_atraso || 0) > existing.dias_atraso) {
          clienteMap.set(e.cliente_id, {
            cliente_id: e.cliente_id,
            cliente_nome: e.cliente_nome,
            cobranca_status: e.cobranca_status || '',
            data_vencimento: e.data_vencimento || '',
            valor_cobranca: e.valor_cobranca || 0,
            metodo_cobranca: e.metodo_cobranca || '',
            dias_atraso: e.dias_atraso || 0,
            acoes: ['Enviar PIX', 'Negociação', 'Bloqueio parcial'],
          });
        }
      });
    
    return Array.from(clienteMap.values()).sort((a, b) => b.dias_atraso - a.dias_atraso);
  }, [filteredEventos]);

  // KPIs from monthly metrics (latest month)
  const kpis = useMemo(() => {
    if (!metricasMensais.length) return null;
    
    const sorted = [...metricasMensais].sort((a, b) => b.mes.localeCompare(a.mes));
    const latest = sorted[0];
    const previous = sorted[1];
    
    if (!latest) return null;
    
    const calcDelta = (curr: number, prev: number) => prev ? ((curr - prev) / prev * 100) : 0;
    
    return {
      clientesAtivos: { value: latest.clientes_ativos, delta: calcDelta(latest.clientes_ativos, previous?.clientes_ativos || 0) },
      novosClientes: { value: latest.novos_clientes, delta: calcDelta(latest.novos_clientes, previous?.novos_clientes || 0) },
      churnRescisoes: { value: latest.churn_rescisoes, delta: calcDelta(latest.churn_rescisoes, previous?.churn_rescisoes || 0) },
      mrrTotal: { value: latest.MRR_total, delta: calcDelta(latest.MRR_total, previous?.MRR_total || 0) },
      faturamentoRecebido: { value: latest.Faturamento_recebido, delta: calcDelta(latest.Faturamento_recebido, previous?.Faturamento_recebido || 0) },
      rEmAberto: { value: latest.R_em_aberto, delta: calcDelta(latest.R_em_aberto, previous?.R_em_aberto || 0) },
      rVencido: { value: latest.R_vencido, delta: calcDelta(latest.R_vencido, previous?.R_vencido || 0) },
      mrrEmRiscoChurn: { value: latest.MRR_em_risco_churn, delta: calcDelta(latest.MRR_em_risco_churn, previous?.MRR_em_risco_churn || 0) },
      ltvEmRiscoChurn: { value: latest.LTV_em_risco_churn, delta: calcDelta(latest.LTV_em_risco_churn, previous?.LTV_em_risco_churn || 0) },
      churnRate: { 
        value: latest.clientes_ativos > 0 ? (latest.churn_rescisoes / latest.clientes_ativos * 100) : 0,
        delta: 0 
      },
    };
  }, [metricasMensais]);

  // LTV stats from clients
  const ltvStats = useMemo(() => {
    if (!clientes.length) return null;
    
    const ltvMesesMedio = clientes.reduce((sum, c) => sum + c.ltv_meses_estimado, 0) / clientes.length;
    const ltvReaisMedio = clientes.reduce((sum, c) => sum + c.ltv_reais_estimado, 0) / clientes.length;
    
    // LTV by plan
    const byPlano = new Map<string, { total: number; count: number }>();
    clientes.forEach(c => {
      if (!c.plano_nome) return;
      const p = byPlano.get(c.plano_nome) || { total: 0, count: 0 };
      p.total += c.ltv_reais_estimado;
      p.count++;
      byPlano.set(c.plano_nome, p);
    });
    
    // LTV by city
    const byCidade = new Map<string, { total: number; count: number }>();
    clientes.forEach(c => {
      if (!c.cliente_cidade) return;
      const p = byCidade.get(c.cliente_cidade) || { total: 0, count: 0 };
      p.total += c.ltv_reais_estimado;
      p.count++;
      byCidade.set(c.cliente_cidade, p);
    });
    
    // LTV by bairro
    const byBairro = new Map<string, { total: number; count: number }>();
    clientes.forEach(c => {
      if (!c.cliente_bairro) return;
      const p = byBairro.get(c.cliente_bairro) || { total: 0, count: 0 };
      p.total += c.ltv_reais_estimado;
      p.count++;
      byBairro.set(c.cliente_bairro, p);
    });
    
    return {
      ltvMesesMedio,
      ltvReaisMedio,
      byPlano: Array.from(byPlano.entries()).map(([name, data]) => ({ name, ltv: data.total / data.count, total: data.total, count: data.count })),
      byCidade: Array.from(byCidade.entries()).map(([name, data]) => ({ name, ltv: data.total / data.count, total: data.total, count: data.count })),
      byBairro: Array.from(byBairro.entries()).map(([name, data]) => ({ name, ltv: data.total / data.count, total: data.total, count: data.count })),
    };
  }, [clientes]);

  // Driver stats - count unique clients per driver
  const driverStats = useMemo(() => {
    const instabClientes = new Set(eventos.filter(e => e.event_type === 'SINAL' && (e.alerta_tipo === 'Sinal crítico' || e.alerta_tipo === 'Qualidade de rede' || (e.packet_loss_pct && e.packet_loss_pct > 1))).map(e => e.cliente_id));
    const financeiroClientes = new Set(eventos.filter(e => e.event_type === 'COBRANCA' && (e.cobranca_status === 'Vencido' || (e.dias_atraso && e.dias_atraso > 0))).map(e => e.cliente_id));
    const reincidClientes = new Set(eventos.filter(e => e.reincidente_30d === true).map(e => e.cliente_id));
    const detratorClientes = new Set(eventos.filter(e => e.nps_score !== null && e.nps_score !== undefined && e.nps_score <= 6).map(e => e.cliente_id));
    
    const drivers = {
      instabilidade: instabClientes.size,
      financeiro: financeiroClientes.size,
      reincidencia: reincidClientes.size,
      detrator: detratorClientes.size,
    };
    
    const total = new Set(eventos.map(e => e.cliente_id)).size;
    const principal = Object.entries(drivers).sort((a, b) => b[1] - a[1])[0];
    
    return { drivers, total, principal: principal?.[0] || 'N/A' };
  }, [eventos]);

  // Signal critical percentage
  const sinalCritico = useMemo(() => {
    const sinalEvents = filteredEventos.filter(e => e.event_type === 'SINAL');
    const critical = sinalEvents.filter(e => e.alerta_tipo === 'Sinal crítico').length;
    return sinalEvents.length > 0 ? (critical / sinalEvents.length * 100) : 0;
  }, [filteredEventos]);

  // Detractor percentage
  const detratores = useMemo(() => {
    const npsEvents = filteredEventos.filter(e => e.event_type === 'NPS' && e.nps_score !== null);
    const detractor = npsEvents.filter(e => (e.nps_score || 0) <= 6).length;
    return npsEvents.length > 0 ? (detractor / npsEvents.length * 100) : 0;
  }, [filteredEventos]);

  return {
    eventos: filteredEventos,
    allEventos: eventos,
    clientes,
    metricasMensais,
    isLoading,
    filters,
    setFilters,
    filterOptions,
    filaRisco,
    filaCobranca,
    kpis,
    ltvStats,
    driverStats,
    sinalCritico,
    detratores,
  };
}
