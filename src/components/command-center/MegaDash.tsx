import { useState, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Area, Cell } from "recharts";
import { ChevronLeft, ChevronRight, TrendingDown, DollarSign, HeadphonesIcon, Wifi, ThumbsUp, Target } from "lucide-react";
import { Evento, MetricaMensal } from "@/types/evento";

interface MegaDashProps {
  eventos: Evento[];
  metricasMensais: MetricaMensal[];
  ltvStats: any;
}

type ViewType = 'churn' | 'contratos' | 'financeiro' | 'suporte' | 'rede' | 'nps' | 'ltv';
type DimensionType = 'plano' | 'cidade' | 'bairro';

const views = [
  { key: 'churn', label: 'Churn', icon: TrendingDown },
  { key: 'contratos', label: 'Contratos', icon: Target },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { key: 'suporte', label: 'Suporte', icon: HeadphonesIcon },
  { key: 'rede', label: 'Rede', icon: Wifi },
  { key: 'nps', label: 'NPS', icon: ThumbsUp },
  { key: 'ltv', label: 'LTV', icon: Target },
] as const;

const COLORS = ['hsl(0, 72%, 51%)', 'hsl(38, 92%, 50%)', 'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(280, 80%, 65%)'];

export function MegaDash({ eventos, metricasMensais, ltvStats }: MegaDashProps) {
  const [view, setView] = useState<ViewType>('churn');
  const [dimension, setDimension] = useState<DimensionType>('plano');

  const cycleDimension = (dir: 'prev' | 'next') => {
    const dims: DimensionType[] = ['plano', 'cidade', 'bairro'];
    const idx = dims.indexOf(dimension);
    const newIdx = dir === 'next' ? (idx + 1) % 3 : (idx - 1 + 3) % 3;
    setDimension(dims[newIdx]);
  };

  // Chart data generators
  const chartData = useMemo(() => {
    switch (view) {
      case 'churn':
        return getChurnData(eventos, dimension);
      case 'contratos':
        return getContratosData(metricasMensais);
      case 'financeiro':
        return getFinanceiroData(metricasMensais);
      case 'suporte':
        return getSuporteData(eventos);
      case 'rede':
        return getRedeData(eventos, dimension);
      case 'nps':
        return getNPSData(eventos);
      case 'ltv':
        return getLTVData(ltvStats, dimension);
      default:
        return [];
    }
  }, [view, dimension, eventos, metricasMensais, ltvStats]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-1">
          {views.map(v => {
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                onClick={() => setView(v.key as ViewType)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
                  view === v.key 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{v.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Dimension Switcher */}
        <div className="flex items-center gap-2">
          <button onClick={() => cycleDimension('prev')} className="p-1 rounded hover:bg-muted">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-xs font-medium text-muted-foreground min-w-[60px] text-center capitalize">
            {dimension}
          </span>
          <button onClick={() => cycleDimension('next')} className="p-1 rounded hover:bg-muted">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[350px] p-4">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(view, chartData)}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function renderChart(view: ViewType, data: any[]) {
  const tooltipStyle = {
    contentStyle: { backgroundColor: 'hsl(223, 47%, 10%)', border: '1px solid hsl(220, 20%, 25%)', borderRadius: '8px' },
    labelStyle: { color: 'hsl(210, 40%, 98%)' },
  };

  switch (view) {
    case 'churn':
      return (
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Taxa de Risco']} />
          <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      );

    case 'contratos':
      return (
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis dataKey="mes" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} />
          <Legend />
          <Area yAxisId="left" type="monotone" dataKey="ativos" fill="hsl(217, 91%, 60%)" fillOpacity={0.3} stroke="hsl(217, 91%, 60%)" name="Clientes Ativos" />
          <Line yAxisId="right" type="monotone" dataKey="crescimento" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Crescimento %" dot={{ r: 4 }} />
        </ComposedChart>
      );

    case 'financeiro':
      return (
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis dataKey="mes" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
          <Legend />
          <Bar dataKey="recebido" fill="hsl(142, 71%, 45%)" name="Recebido" radius={[4, 4, 0, 0]} />
          <Bar dataKey="vencido" fill="hsl(0, 72%, 51%)" name="Vencido" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="mrr" stroke="hsl(217, 91%, 60%)" strokeWidth={2} name="MRR" />
        </ComposedChart>
      );

    case 'ltv':
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis dataKey="name" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'LTV Médio']} />
          <Bar dataKey="ltv" fill="hsl(280, 80%, 65%)" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      );

    default:
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis dataKey="mes" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} />
          <Line type="monotone" dataKey="value" stroke="hsl(217, 91%, 60%)" strokeWidth={2} />
        </LineChart>
      );
  }
}

// Data generators
function getChurnData(eventos: Evento[], dimension: DimensionType) {
  const map = new Map<string, { total: number; risco: number }>();
  const key = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
  
  eventos.forEach(e => {
    const name = (e as any)[key];
    if (!name) return;
    const curr = map.get(name) || { total: 0, risco: 0 };
    curr.total++;
    if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') curr.risco++;
    map.set(name, curr);
  });

  return Array.from(map.entries())
    .map(([name, data]) => ({ name: name.length > 15 ? name.slice(0, 15) + '...' : name, rate: data.total > 0 ? (data.risco / data.total * 100) : 0 }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 8);
}

function getContratosData(metricas: MetricaMensal[]) {
  return metricas.map((m, i, arr) => ({
    mes: m.mes.slice(5),
    ativos: m.clientes_ativos,
    crescimento: i > 0 ? ((m.clientes_ativos - arr[i-1].clientes_ativos) / arr[i-1].clientes_ativos * 100) : 0,
  }));
}

function getFinanceiroData(metricas: MetricaMensal[]) {
  return metricas.map(m => ({
    mes: m.mes.slice(5),
    recebido: m.Faturamento_recebido,
    vencido: m.R_vencido,
    mrr: m.MRR_total,
  }));
}

function getSuporteData(eventos: Evento[]) {
  const byMonth = new Map<string, number>();
  eventos.filter(e => e.event_type === 'ATENDIMENTO').forEach(e => {
    const mes = e.mes_referencia?.slice(5) || 'N/A';
    byMonth.set(mes, (byMonth.get(mes) || 0) + 1);
  });
  return Array.from(byMonth.entries()).map(([mes, value]) => ({ mes, value })).sort((a, b) => a.mes.localeCompare(b.mes));
}

function getRedeData(eventos: Evento[], dimension: DimensionType) {
  const map = new Map<string, { total: number; critico: number }>();
  const key = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
  
  eventos.filter(e => e.event_type === 'SINAL').forEach(e => {
    const name = (e as any)[key];
    if (!name) return;
    const curr = map.get(name) || { total: 0, critico: 0 };
    curr.total++;
    if (e.alerta_tipo === 'Sinal crítico') curr.critico++;
    map.set(name, curr);
  });

  return Array.from(map.entries())
    .map(([name, data]) => ({ name: name.length > 15 ? name.slice(0, 15) + '...' : name, rate: data.total > 0 ? (data.critico / data.total * 100) : 0 }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 8);
}

function getNPSData(eventos: Evento[]) {
  const byMonth = new Map<string, { promoter: number; neutral: number; detractor: number }>();
  eventos.filter(e => e.event_type === 'NPS' && e.nps_score !== null).forEach(e => {
    const mes = e.mes_referencia?.slice(5) || 'N/A';
    const curr = byMonth.get(mes) || { promoter: 0, neutral: 0, detractor: 0 };
    const score = e.nps_score || 0;
    if (score >= 9) curr.promoter++;
    else if (score >= 7) curr.neutral++;
    else curr.detractor++;
    byMonth.set(mes, curr);
  });
  return Array.from(byMonth.entries()).map(([mes, data]) => ({ mes, ...data })).sort((a, b) => a.mes.localeCompare(b.mes));
}

function getLTVData(ltvStats: any, dimension: DimensionType) {
  if (!ltvStats) return [];
  const data = dimension === 'plano' ? ltvStats.byPlano : dimension === 'cidade' ? ltvStats.byCidade : ltvStats.byBairro;
  return (data || []).sort((a: any, b: any) => b.ltv - a.ltv).slice(0, 8).map((d: any) => ({
    name: d.name.length > 15 ? d.name.slice(0, 15) + '...' : d.name,
    ltv: d.ltv,
  }));
}
