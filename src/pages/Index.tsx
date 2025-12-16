import { useState, useMemo } from "react";
import { useEventos } from "@/hooks/useEventos";
import { Sidebar } from "@/components/layout/Sidebar";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MRRChurnChart } from "@/components/charts/MRRChurnChart";
import { ContractEvolutionChart } from "@/components/charts/ContractEvolutionChart";
import { ChurnByPlanChart } from "@/components/charts/ChurnByPlanChart";
import { ChurnByNeighborhoodChart } from "@/components/charts/ChurnByNeighborhoodChart";
import { AnnualChurnChart } from "@/components/charts/AnnualChurnChart";
import { TopChurnReasonsChart } from "@/components/charts/TopChurnReasonsChart";
import { LTVChart } from "@/components/charts/LTVChart";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingDown, DollarSign, Users, AlertTriangle, 
  Activity, Target, Zap, Clock
} from "lucide-react";

const Index = () => {
  const { eventos, isLoading } = useEventos();

  const metrics = useMemo(() => {
    const services = new Map<number, any>();
    eventos.forEach(e => {
      if (!e.servico_id) return;
      const existing = services.get(e.servico_id);
      if (!existing || new Date(e.event_datetime) > new Date(existing.event_datetime)) {
        services.set(e.servico_id, e);
      }
    });

    const activeServices = Array.from(services.values()).filter(e => e.servico_status === 'Liberado');
    const mrr = activeServices.reduce((sum, e) => sum + (e.valor_mensalidade || 0), 0);
    const riskServices = activeServices.filter(e => e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico');
    const mrrRisco = riskServices.reduce((sum, e) => sum + (e.valor_mensalidade || 0), 0);
    const ltvTotal = activeServices.reduce((sum, e) => sum + ((e.valor_mensalidade || 0) * 24), 0);
    const ltvRisco = riskServices.reduce((sum, e) => sum + ((e.valor_mensalidade || 0) * 24), 0);
    const ltvMedio = activeServices.length > 0 ? ltvTotal / activeServices.length : 0;
    const clientes = new Set(eventos.map(e => e.cliente_id)).size;
    const clientesAtivos = new Set(activeServices.map(e => e.cliente_id)).size;

    return { mrr, mrrRisco, ltvTotal, ltvRisco, ltvMedio, clientes, clientesAtivos, riskCount: riskServices.length };
  }, [eventos]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1
  }).format(value);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold gradient-text">Uniforce OPS</h1>
            <p className="text-muted-foreground mt-1">Dashboard de Prevenção de Churn & Inadimplência</p>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="MRR Total" value={formatCurrency(metrics.mrr)} icon={<DollarSign className="h-5 w-5" />} variant="primary" />
            <MetricCard title="MRR em Risco" value={formatCurrency(metrics.mrrRisco)} subtitle={`${((metrics.mrrRisco / metrics.mrr) * 100 || 0).toFixed(1)}% do total`} icon={<AlertTriangle className="h-5 w-5" />} variant="danger" glowing />
            <MetricCard title="LTV em Risco" value={formatCurrency(metrics.ltvRisco)} icon={<TrendingDown className="h-5 w-5" />} variant="warning" />
            <MetricCard title="LTV Médio" value={formatCurrency(metrics.ltvMedio)} icon={<Target className="h-5 w-5" />} variant="purple" />
            <MetricCard title="Clientes Ativos" value={metrics.clientesAtivos.toLocaleString('pt-BR')} icon={<Users className="h-5 w-5" />} variant="success" />
            <MetricCard title="Em Risco de Churn" value={metrics.riskCount.toLocaleString('pt-BR')} subtitle="Alto + Crítico" icon={<Zap className="h-5 w-5" />} variant="danger" />
            <MetricCard title="Faturamento Anual" value={formatCurrency(metrics.mrr * 12)} icon={<Activity className="h-5 w-5" />} variant="primary" />
            <MetricCard title="LTV Total" value={formatCurrency(metrics.ltvTotal)} icon={<Clock className="h-5 w-5" />} variant="default" />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MRRChurnChart eventos={eventos} />
            <ContractEvolutionChart eventos={eventos} />
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChurnByPlanChart eventos={eventos} />
            <ChurnByNeighborhoodChart eventos={eventos} />
            <LTVChart eventos={eventos} />
          </div>

          {/* Charts Row 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnnualChurnChart eventos={eventos} />
            <TopChurnReasonsChart eventos={eventos} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;