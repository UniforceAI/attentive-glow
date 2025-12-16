import { useState } from "react";
import { useDataLoader } from "@/hooks/useDataLoader";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlobalFilters } from "@/components/filters/GlobalFilters";
import { KPICards } from "@/components/command-center/KPICards";
import { MegaDash } from "@/components/command-center/MegaDash";
import { DriverChips } from "@/components/command-center/DriverChips";
import { MapSection } from "@/components/command-center/MapSection";
import { FilaRisco } from "@/components/command-center/FilaRisco";
import { FilaCobranca } from "@/components/command-center/FilaCobranca";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const data = useDataLoader();
  const [mapMetric, setMapMetric] = useState<'churn' | 'vencido' | 'sinal' | 'detrator' | 'reincidencia'>('churn');

  if (data.isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-[400px] w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Global Filter Bar */}
        <GlobalFilters 
          filters={data.filters} 
          setFilters={data.setFilters} 
          options={data.filterOptions} 
        />

        <div className="p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Command Center</h1>
              <p className="text-muted-foreground">Visão executiva em tempo real</p>
            </div>
            <DriverChips 
              stats={data.driverStats} 
              activeDriver={data.filters.driver}
              onDriverClick={(driver) => data.setFilters(prev => ({ ...prev, driver }))}
            />
          </div>

          {/* KPIs Row */}
          <KPICards 
            kpis={data.kpis} 
            sinalCritico={data.sinalCritico} 
            detratores={data.detratores}
            ltvStats={data.ltvStats}
          />

          {/* MEGA DASH + Side Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3">
              <MegaDash 
                eventos={data.eventos} 
                metricasMensais={data.metricasMensais}
                ltvStats={data.ltvStats}
              />
            </div>
            <div className="space-y-4">
              <TopCards 
                driverStats={data.driverStats} 
                eventos={data.eventos}
                ltvStats={data.ltvStats}
              />
            </div>
          </div>

          {/* Map */}
          <MapSection 
            filaRisco={data.filaRisco}
            filaCobranca={data.filaCobranca}
            eventos={data.eventos}
            metric={mapMetric}
            onMetricChange={setMapMetric}
          />

          {/* Queues */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FilaRisco fila={data.filaRisco} />
            <FilaCobranca fila={data.filaCobranca} />
          </div>
        </div>
      </main>
    </div>
  );
};

// Top Cards Component (inline for simplicity)
function TopCards({ driverStats, eventos, ltvStats }: any) {
  const [topView, setTopView] = useState<'plano' | 'cidade' | 'bairro'>('plano');
  
  // Calculate top churn by dimension
  const getTopChurn = () => {
    const map = new Map<string, { total: number; risco: number }>();
    eventos.forEach((e: any) => {
      const key = topView === 'plano' ? e.plano_nome : topView === 'cidade' ? e.cliente_cidade : e.cliente_bairro;
      if (!key) return;
      const curr = map.get(key) || { total: 0, risco: 0 };
      curr.total++;
      if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') curr.risco++;
      map.set(key, curr);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, rate: data.total > 0 ? (data.risco / data.total * 100) : 0, count: data.risco }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
  };

  const topChurn = getTopChurn();
  const driverLabels: Record<string, string> = {
    instabilidade: 'Instabilidade',
    financeiro: 'Financeiro', 
    reincidencia: 'Reincidência',
    detrator: 'Detrator NPS'
  };

  return (
    <>
      {/* Driver Principal */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">Driver Principal</p>
        <p className="text-lg font-bold text-destructive">{driverLabels[driverStats.principal] || 'N/A'}</p>
        <p className="text-xs text-muted-foreground">{driverStats.total} alertas no período</p>
      </div>

      {/* Top 5 */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">Top 5 Churn</p>
          <select 
            value={topView} 
            onChange={(e) => setTopView(e.target.value as any)}
            className="text-xs bg-background border border-border rounded px-2 py-1"
          >
            <option value="plano">Por Plano</option>
            <option value="cidade">Por Cidade</option>
            <option value="bairro">Por Bairro</option>
          </select>
        </div>
        <div className="space-y-2">
          {topChurn.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="truncate text-foreground">{item.name}</span>
              <span className="text-destructive font-medium">{item.rate.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* LTV Médio */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">LTV Médio</p>
        <p className="text-xl font-bold text-foreground">
          {ltvStats?.ltvMesesMedio?.toFixed(0) || 0} meses
        </p>
        <p className="text-sm text-success">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ltvStats?.ltvReaisMedio || 0)}
        </p>
      </div>
    </>
  );
}

export default Index;
