import { useState, useEffect, useMemo } from "react";
import { Evento, Cliente, MetricaMensal, FilterState, ClienteRisco, ClienteCobranca } from "@/types/evento";
import { useToast } from "@/hooks/use-toast";

function parseCSV<T>(text: string): T[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: any = {};
    headers.forEach((h, i) => {
      let val: any = values[i]?.trim() || '';
      if (val === '' || val === 'False') val = val === 'False' ? false : null;
      else if (val === 'True') val = true;
      else if (!isNaN(Number(val)) && val !== '') val = Number(val);
      obj[h.trim()] = val;
    });
    return obj as T;
  });
}

export function useDataLoader() {
  const { toast } = useToast();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [metricasMensais, setMetricasMensais] = useState<MetricaMensal[]>([]);
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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [eventosRes, clientesRes, metricasRes] = await Promise.all([
          fetch('/data/eventos.csv'),
          fetch('/data/clientes.csv'),
          fetch('/data/metricas_mensais.csv'),
        ]);

        const [eventosText, clientesText, metricasText] = await Promise.all([
          eventosRes.text(),
          clientesRes.text(),
          metricasRes.text(),
        ]);

        setEventos(parseCSV<Evento>(eventosText));
        setClientes(parseCSV<Cliente>(clientesText));
        setMetricasMensais(parseCSV<MetricaMensal>(metricasText));

        toast({ title: "Dados carregados!", description: "Dashboard pronto" });
      } catch (error: any) {
        console.error("Erro ao carregar dados:", error);
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter events based on current filters
  const filteredEventos = useMemo(() => {
    let filtered = [...eventos];
    
    if (filters.plano) filtered = filtered.filter(e => e.plano_nome === filters.plano);
    if (filters.cidade) filtered = filtered.filter(e => e.cliente_cidade === filters.cidade);
    if (filters.bairro) filtered = filtered.filter(e => e.cliente_bairro === filters.bairro);
    if (filters.segmento) filtered = filtered.filter(e => e.cliente_segmento === filters.segmento);
    if (filters.status) filtered = filtered.filter(e => e.servico_status === filters.status);
    
    if (filters.driver !== 'all') {
      const driverMap: Record<string, string[]> = {
        instabilidade: ['Sinal crítico', 'Qualidade de rede'],
        financeiro: ['Financeiro'],
        reincidencia: ['Reincidência'],
        detrator: ['Detrator (NPS)'],
      };
      filtered = filtered.filter(e => driverMap[filters.driver]?.includes(e.alerta_tipo || ''));
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
      const p = byPlano.get(c.plano_nome) || { total: 0, count: 0 };
      p.total += c.ltv_reais_estimado;
      p.count++;
      byPlano.set(c.plano_nome, p);
    });
    
    // LTV by city
    const byCidade = new Map<string, { total: number; count: number }>();
    clientes.forEach(c => {
      const p = byCidade.get(c.cliente_cidade) || { total: 0, count: 0 };
      p.total += c.ltv_reais_estimado;
      p.count++;
      byCidade.set(c.cliente_cidade, p);
    });
    
    // LTV by bairro
    const byBairro = new Map<string, { total: number; count: number }>();
    clientes.forEach(c => {
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

  // Driver stats
  const driverStats = useMemo(() => {
    const drivers = {
      instabilidade: filteredEventos.filter(e => e.alerta_tipo === 'Sinal crítico' || e.alerta_tipo === 'Qualidade de rede').length,
      financeiro: filteredEventos.filter(e => e.alerta_tipo === 'Financeiro').length,
      reincidencia: filteredEventos.filter(e => e.alerta_tipo === 'Reincidência').length,
      detrator: filteredEventos.filter(e => e.alerta_tipo === 'Detrator (NPS)').length,
    };
    
    const total = Object.values(drivers).reduce((a, b) => a + b, 0);
    const principal = Object.entries(drivers).sort((a, b) => b[1] - a[1])[0];
    
    return { drivers, total, principal: principal?.[0] || 'N/A' };
  }, [filteredEventos]);

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
