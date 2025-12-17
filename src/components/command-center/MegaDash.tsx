import { useState, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Area, Cell, PieChart, Pie } from "recharts";
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

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

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
        return getSuporteData(eventos, dimension);
      case 'rede':
        return getRedeData(eventos, dimension);
      case 'nps':
        return getNPSData(eventos, dimension);
      case 'ltv':
        return getLTVData(eventos, ltvStats, dimension);
      default:
        return [];
    }
  }, [view, dimension, eventos, metricasMensais, ltvStats]);

  const dimLabel = dimension === 'plano' ? 'Plano' : dimension === 'cidade' ? 'Cidade' : 'Bairro';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-1 flex-wrap">
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
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
          <button 
            onClick={() => cycleDimension('prev')} 
            className="p-1 rounded hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-xs font-semibold text-foreground min-w-[60px] text-center">
            {dimLabel}
          </span>
          <button 
            onClick={() => cycleDimension('next')} 
            className="p-1 rounded hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[350px] p-4">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(view, chartData, dimLabel)}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function renderChart(view: ViewType, data: any[], dimLabel: string) {
  const tooltipStyle = {
    contentStyle: { backgroundColor: 'hsl(223, 47%, 10%)', border: '1px solid hsl(220, 20%, 25%)', borderRadius: '8px' },
    labelStyle: { color: 'hsl(210, 40%, 98%)' },
  };

  switch (view) {
    case 'churn':
      return (
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, `Risco por ${dimLabel}`]} />
          <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      );

    case 'contratos':
      return (
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} />
          <Legend />
          <Area yAxisId="left" type="monotone" dataKey="ativos" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" name="Clientes Ativos" />
          <Line yAxisId="right" type="monotone" dataKey="crescimento" stroke="#22c55e" strokeWidth={2} name="Crescimento %" dot={{ r: 4 }} />
        </ComposedChart>
      );

    case 'financeiro':
      return (
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
          <Legend />
          <Bar dataKey="recebido" fill="#22c55e" name="Recebido" radius={[4, 4, 0, 0]} />
          <Bar dataKey="vencido" fill="#ef4444" name="Vencido" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="mrr" stroke="#3b82f6" strokeWidth={2} name="MRR" />
        </ComposedChart>
      );

    case 'suporte':
      return (
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => [v, `Atendimentos por ${dimLabel}`]} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      );

    case 'rede':
      return (
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, `% Sinal Crítico por ${dimLabel}`]} />
          <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      );

    case 'nps':
      return (
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [v, name === 'nps' ? `NPS por ${dimLabel}` : name]} />
          <Legend />
          <Bar dataKey="promotores" fill="#22c55e" name="Promotores" stackId="a" />
          <Bar dataKey="neutros" fill="#f59e0b" name="Neutros" stackId="a" />
          <Bar dataKey="detratores" fill="#ef4444" name="Detratores" stackId="a" />
        </BarChart>
      );

    case 'ltv':
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
          <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, `LTV por ${dimLabel}`]} />
          <Bar dataKey="ltv" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      );

    default:
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
          <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
        </LineChart>
      );
  }
}

// Data generators with dimension support
function getChurnData(eventos: Evento[], dimension: DimensionType) {
  const map = new Map<string, { total: number; risco: number }>();
  const key = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
  
  // Get unique clients per dimension
  const clienteMap = new Map<string, Set<string>>();
  const riscoMap = new Map<string, Set<string>>();
  
  eventos.forEach(e => {
    const name = (e as any)[key];
    if (!name) return;
    
    if (!clienteMap.has(name)) clienteMap.set(name, new Set());
    if (!riscoMap.has(name)) riscoMap.set(name, new Set());
    
    clienteMap.get(name)!.add(e.cliente_id);
    if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') {
      riscoMap.get(name)!.add(e.cliente_id);
    }
  });

  return Array.from(clienteMap.entries())
    .map(([name, clients]) => {
      const risco = riscoMap.get(name)?.size || 0;
      return { 
        name: name.length > 18 ? name.slice(0, 18) + '...' : name, 
        rate: clients.size > 0 ? (risco / clients.size * 100) : 0,
        total: clients.size,
        risco
      };
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 8);
}

function getContratosData(metricas: MetricaMensal[]) {
  return metricas.map((m, i, arr) => {
    const prevAtivos = i > 0 ? arr[i-1].clientes_ativos : m.clientes_ativos;
    const variacaoAbs = m.clientes_ativos - prevAtivos;
    const crescimento = prevAtivos > 0 ? (variacaoAbs / prevAtivos * 100) : 0;
    return {
      mes: m.mes.slice(5),
      ativos: m.clientes_ativos,
      novos: m.novos_clientes,
      churn: m.churn_rescisoes,
      crescimento: Number(crescimento.toFixed(1)),
    };
  });
}

function getFinanceiroData(metricas: MetricaMensal[]) {
  return metricas.map(m => ({
    mes: m.mes.slice(5),
    recebido: m.Faturamento_recebido,
    vencido: m.R_vencido,
    mrr: m.MRR_total,
  }));
}

function getSuporteData(eventos: Evento[], dimension: DimensionType) {
  const key = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
  const map = new Map<string, number>();
  
  eventos.filter(e => e.event_type === 'ATENDIMENTO').forEach(e => {
    const name = (e as any)[key];
    if (!name) return;
    map.set(name, (map.get(name) || 0) + 1);
  });
  
  return Array.from(map.entries())
    .map(([name, total]) => ({ 
      name: name.length > 18 ? name.slice(0, 18) + '...' : name, 
      total 
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

function getRedeData(eventos: Evento[], dimension: DimensionType) {
  const map = new Map<string, { total: number; critico: number }>();
  const key = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
  
  eventos.filter(e => e.event_type === 'SINAL').forEach(e => {
    const name = (e as any)[key];
    if (!name) return;
    const curr = map.get(name) || { total: 0, critico: 0 };
    curr.total++;
    // Critical if alerta_tipo is 'Sinal crítico' OR packet_loss > 2% OR downtime > 30min
    if (e.alerta_tipo === 'Sinal crítico' || (e.packet_loss_pct && e.packet_loss_pct > 2) || (e.downtime_min_24h && e.downtime_min_24h > 30)) {
      curr.critico++;
    }
    map.set(name, curr);
  });

  return Array.from(map.entries())
    .map(([name, data]) => ({ 
      name: name.length > 18 ? name.slice(0, 18) + '...' : name, 
      rate: data.total > 0 ? (data.critico / data.total * 100) : 0,
      total: data.total,
      critico: data.critico
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 8);
}

function getNPSData(eventos: Evento[], dimension: DimensionType) {
  const key = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
  const map = new Map<string, { promotores: number; neutros: number; detratores: number }>();
  
  eventos.filter(e => e.nps_score !== null && e.nps_score !== undefined).forEach(e => {
    const name = (e as any)[key];
    if (!name) return;
    const curr = map.get(name) || { promotores: 0, neutros: 0, detratores: 0 };
    const score = e.nps_score || 0;
    if (score >= 9) curr.promotores++;
    else if (score >= 7) curr.neutros++;
    else curr.detratores++;
    map.set(name, curr);
  });
  
  return Array.from(map.entries())
    .map(([name, data]) => ({ 
      name: name.length > 18 ? name.slice(0, 18) + '...' : name,
      ...data,
      total: data.promotores + data.neutros + data.detratores
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

function getLTVData(eventos: Evento[], ltvStats: any, dimension: DimensionType) {
  // Calculate LTV from eventos directly
  const key = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
  const map = new Map<string, { total: number; count: number }>();
  const clienteSeen = new Map<string, Set<string>>();
  
  eventos.forEach(e => {
    const name = (e as any)[key];
    if (!name || !e.ltv_reais_estimado) return;
    
    // Only count each cliente once per dimension
    if (!clienteSeen.has(name)) clienteSeen.set(name, new Set());
    if (clienteSeen.get(name)!.has(e.cliente_id)) return;
    clienteSeen.get(name)!.add(e.cliente_id);
    
    const curr = map.get(name) || { total: 0, count: 0 };
    curr.total += e.ltv_reais_estimado;
    curr.count++;
    map.set(name, curr);
  });
  
  return Array.from(map.entries())
    .map(([name, data]) => ({ 
      name: name.length > 18 ? name.slice(0, 18) + '...' : name, 
      ltv: data.count > 0 ? data.total / data.count : 0 
    }))
    .sort((a, b) => b.ltv - a.ltv)
    .slice(0, 8);
}
