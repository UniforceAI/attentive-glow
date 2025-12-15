import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Evento, ClienteAgregado, KPIData } from "@/types/evento";
import { OverviewKPIs } from "@/components/overview/OverviewKPIs";
import { TopClientesRisco } from "@/components/overview/TopClientesRisco";
import { CausaRaizCards } from "@/components/overview/CausaRaizCards";
import { TrendChart } from "@/components/overview/TrendChart";
import { UploadDialog } from "@/components/upload/UploadDialog";
import { GlobalFilters } from "@/components/filters/GlobalFilters";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Upload, RefreshCw } from "lucide-react";

const Index = () => {
  const { toast } = useToast();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Filtros globais
  const [periodo, setPeriodo] = useState("30");
  const [uf, setUf] = useState("todos");
  const [plano, setPlano] = useState("todos");
  const [statusServico, setStatusServico] = useState("todos");
  const [bucketRisco, setBucketRisco] = useState("todos");
  const [segmento, setSegmento] = useState("todos");

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

  useEffect(() => {
    fetchEventos();
  }, []);

  // Filtrar eventos
  const eventosFiltrados = useMemo(() => {
    return eventos.filter(e => {
      if (uf !== "todos" && e.cliente_uf !== uf) return false;
      if (plano !== "todos" && e.plano_nome !== plano) return false;
      if (statusServico !== "todos" && e.servico_status !== statusServico) return false;
      if (bucketRisco !== "todos" && e.churn_risk_bucket !== bucketRisco) return false;
      if (segmento !== "todos" && e.cliente_segmento !== segmento) return false;
      return true;
    });
  }, [eventos, uf, plano, statusServico, bucketRisco, segmento]);

  // Calcular KPIs
  const kpis = useMemo((): KPIData => {
    const clientesUnicos = new Map<number, Evento>();
    const servicosUnicos = new Map<number, Evento>();

    eventosFiltrados.forEach(e => {
      if (!clientesUnicos.has(e.cliente_id) || 
          new Date(e.event_datetime) > new Date(clientesUnicos.get(e.cliente_id)!.event_datetime)) {
        clientesUnicos.set(e.cliente_id, e);
      }
      if (e.servico_id && (!servicosUnicos.has(e.servico_id) || 
          new Date(e.event_datetime) > new Date(servicosUnicos.get(e.servico_id)!.event_datetime))) {
        servicosUnicos.set(e.servico_id, e);
      }
    });

    const clientesAtivos = Array.from(clientesUnicos.values()).filter(e => e.servico_status !== 'Cancelado').length;
    const servicosLiberados = Array.from(servicosUnicos.values()).filter(e => e.servico_status === 'Liberado').length;
    const servicosBloqueados = Array.from(servicosUnicos.values()).filter(e => e.servico_status === 'Bloqueado').length;
    const servicosSuspensos = Array.from(servicosUnicos.values()).filter(e => e.servico_status === 'Suspenso').length;

    const servicosLiberadosArr = Array.from(servicosUnicos.values()).filter(e => e.servico_status === 'Liberado');
    const mrr = servicosLiberadosArr.reduce((sum, e) => sum + (e.valor_mensalidade || 0), 0);
    
    const servicosEmRisco = servicosLiberadosArr.filter(e => 
      e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico'
    );
    const mrrEmRisco = servicosEmRisco.reduce((sum, e) => sum + (e.valor_mensalidade || 0), 0);

    const cobrancas = eventosFiltrados.filter(e => e.event_type === 'COBRANCA');
    const inadimplenciaTotal = cobrancas
      .filter(e => e.cobranca_status === 'Em Aberto' || e.cobranca_status === 'Vencido')
      .reduce((sum, e) => sum + (e.valor_cobranca || 0), 0);

    const atendimentos = eventosFiltrados.filter(e => e.event_type === 'ATENDIMENTO');
    const atendimentosN1 = atendimentos.filter(e => e.setor?.includes('N1') || e.setor === 'Suporte Interno');
    const ticketN1Por100 = clientesAtivos > 0 ? (atendimentosN1.length / clientesAtivos) * 100 : 0;

    const temposAtendimento = atendimentos
      .filter(e => e.tempo_atendimento_min != null)
      .map(e => e.tempo_atendimento_min!);
    const tempoMedioAtendimento = temposAtendimento.length > 0 
      ? temposAtendimento.reduce((a, b) => a + b, 0) / temposAtendimento.length 
      : 0;

    const npsEventos = eventosFiltrados.filter(e => e.event_type === 'NPS' && e.nps_score != null);
    const promotores = npsEventos.filter(e => e.nps_score! >= 9).length;
    const neutros = npsEventos.filter(e => e.nps_score! >= 7 && e.nps_score! <= 8).length;
    const detratores = npsEventos.filter(e => e.nps_score! <= 6).length;
    const totalNps = promotores + neutros + detratores;
    const nps = totalNps > 0 ? Math.round(((promotores - detratores) / totalNps) * 100) : 0;

    return {
      clientesAtivos,
      servicosLiberados,
      servicosBloqueados,
      servicosSuspensos,
      mrr,
      mrrEmRisco,
      inadimplenciaTotal,
      ticketN1Por100,
      tempoMedioAtendimento,
      nps,
      promotores,
      neutros,
      detratores,
    };
  }, [eventosFiltrados]);

  // Top 20 clientes em risco
  const clientesEmRisco = useMemo((): ClienteAgregado[] => {
    const clientesMap = new Map<number, ClienteAgregado>();

    eventosFiltrados.forEach(e => {
      if (!clientesMap.has(e.cliente_id)) {
        clientesMap.set(e.cliente_id, {
          cliente_id: e.cliente_id,
          cliente_nome: e.cliente_nome,
          cliente_email: e.cliente_email,
          cliente_celular: e.cliente_celular,
          cliente_cidade: e.cliente_cidade,
          cliente_uf: e.cliente_uf,
          cliente_segmento: e.cliente_segmento,
          plano_nome: e.plano_nome,
          servico_status: e.servico_status,
          valor_mensalidade: e.valor_mensalidade,
          churn_risk_score: e.churn_risk_score,
          churn_risk_bucket: e.churn_risk_bucket,
          inadimplencia_total: 0,
          qtd_atendimentos_30d: 0,
          ultimo_evento: e.event_datetime,
          acao_recomendada: e.acao_recomendada_1,
        });
      }

      const cliente = clientesMap.get(e.cliente_id)!;
      
      // Atualizar com evento mais recente
      if (new Date(e.event_datetime) > new Date(cliente.ultimo_evento || '')) {
        cliente.ultimo_evento = e.event_datetime;
        cliente.churn_risk_score = e.churn_risk_score ?? cliente.churn_risk_score;
        cliente.churn_risk_bucket = e.churn_risk_bucket ?? cliente.churn_risk_bucket;
        cliente.servico_status = e.servico_status ?? cliente.servico_status;
        cliente.acao_recomendada = e.acao_recomendada_1 ?? cliente.acao_recomendada;
      }

      if (e.event_type === 'COBRANCA' && (e.cobranca_status === 'Em Aberto' || e.cobranca_status === 'Vencido')) {
        cliente.inadimplencia_total += e.valor_cobranca || 0;
      }

      if (e.event_type === 'ATENDIMENTO') {
        cliente.qtd_atendimentos_30d++;
      }
    });

    return Array.from(clientesMap.values())
      .filter(c => c.churn_risk_bucket === 'Alto' || c.churn_risk_bucket === 'Crítico')
      .sort((a, b) => (b.churn_risk_score || 0) - (a.churn_risk_score || 0))
      .slice(0, 20);
  }, [eventosFiltrados]);

  // Opções para filtros
  const filterOptions = useMemo(() => {
    const ufs = [...new Set(eventos.map(e => e.cliente_uf).filter(Boolean))].sort();
    const planos = [...new Set(eventos.map(e => e.plano_nome).filter(Boolean))].sort();
    const segmentos = [...new Set(eventos.map(e => e.cliente_segmento).filter(Boolean))].sort();
    return { ufs, planos, segmentos };
  }, [eventos]);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                Uniforce OPS
              </h1>
              <p className="text-muted-foreground mt-1">
                Prevenção de Churn + Inadimplência
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={fetchEventos} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Dados
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <GlobalFilters
            periodo={periodo}
            setPeriodo={setPeriodo}
            uf={uf}
            setUf={setUf}
            plano={plano}
            setPlano={setPlano}
            statusServico={statusServico}
            setStatusServico={setStatusServico}
            bucketRisco={bucketRisco}
            setBucketRisco={setBucketRisco}
            segmento={segmento}
            setSegmento={setSegmento}
            ufs={filterOptions.ufs as string[]}
            planos={filterOptions.planos as string[]}
            segmentos={filterOptions.segmentos as string[]}
          />

          {eventos.length === 0 && !isLoading ? (
            <div className="text-center py-20 bg-card rounded-lg border">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum dado carregado</h3>
              <p className="text-muted-foreground mb-4">
                Faça upload de um arquivo CSV ou JSONL para começar
              </p>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Dados
              </Button>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <OverviewKPIs kpis={kpis} isLoading={isLoading} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Clientes em Risco */}
                <div className="lg:col-span-2">
                  <TopClientesRisco clientes={clientesEmRisco} isLoading={isLoading} />
                </div>

                {/* Causa Raiz */}
                <div>
                  <CausaRaizCards eventos={eventosFiltrados} />
                </div>
              </div>

              {/* Tendência */}
              <TrendChart eventos={eventosFiltrados} />
            </>
          )}
        </div>
      </main>

      <UploadDialog 
        open={uploadOpen} 
        onOpenChange={setUploadOpen}
        onSuccess={fetchEventos}
      />
    </div>
  );
};

export default Index;
