import { useMemo, useState } from "react";
import { useDataLoader } from "@/hooks/useDataLoader";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, TrendingDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Info, Wifi, CreditCard, Headphones, Frown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, AreaChart, Area } from "recharts";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type DimensionType = 'plano' | 'cidade' | 'bairro';

const TendenciasPage = () => {
  const { allEventos: eventos } = useDataLoader();
  const [dimension, setDimension] = useState<DimensionType>('plano');

  // Séries mensais principais
  const seriesMensais = useMemo(() => {
    const byMonth = new Map<string, {
      churn: number;
      mrr: number;
      faturamento: number;
      vencidos: number;
      mrrRisco: number;
      ltvRisco: number;
      clientes: Set<string>;
    }>();

    eventos.forEach(e => {
      const mes = e.mes_referencia?.substring(0, 7);
      if (!mes) return;

      if (!byMonth.has(mes)) {
        byMonth.set(mes, {
          churn: 0,
          mrr: 0,
          faturamento: 0,
          vencidos: 0,
          mrrRisco: 0,
          ltvRisco: 0,
          clientes: new Set(),
        });
      }

      const m = byMonth.get(mes)!;
      const clienteId = String(e.cliente_id);

      if (!m.clientes.has(clienteId)) {
        m.clientes.add(clienteId);
        m.mrr += e.valor_mensalidade || 0;
        
        if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') {
          m.mrrRisco += e.valor_mensalidade || 0;
          m.ltvRisco += (e.valor_mensalidade || 0) * 12;
        }
        
        if (e.servico_status === 'Cancelado') {
          m.churn++;
        }
      }

      if (e.event_type === 'COBRANCA') {
        if (e.cobranca_status === 'Pago') {
          m.faturamento += e.valor_pago || 0;
        }
        if (e.cobranca_status === 'Vencido') {
          m.vencidos += e.valor_cobranca || 0;
        }
      }
    });

    return Array.from(byMonth.entries())
      .map(([mes, data]) => ({
        mes: mes.slice(5),
        fullMes: mes,
        churn: data.churn,
        mrr: Math.round(data.mrr / 1000),
        faturamento: Math.round(data.faturamento / 1000),
        vencidos: Math.round(data.vencidos / 1000),
        mrrRisco: Math.round(data.mrrRisco / 1000),
        ltvRisco: Math.round(data.ltvRisco / 1000),
        clientes: data.clientes.size,
      }))
      .sort((a, b) => a.fullMes.localeCompare(b.fullMes))
      .slice(-12);
  }, [eventos]);

  // Drivers ao longo do tempo
  const driversTempo = useMemo(() => {
    const byMonth = new Map<string, {
      instabilidade: Set<string>;
      financeiro: Set<string>;
      reincidencia: Set<string>;
      detrator: Set<string>;
    }>();

    eventos.forEach(e => {
      const mes = e.mes_referencia?.substring(0, 7);
      if (!mes) return;

      if (!byMonth.has(mes)) {
        byMonth.set(mes, {
          instabilidade: new Set(),
          financeiro: new Set(),
          reincidencia: new Set(),
          detrator: new Set(),
        });
      }

      const m = byMonth.get(mes)!;
      const clienteId = String(e.cliente_id);

      if (e.packet_loss_pct && e.packet_loss_pct > 2) m.instabilidade.add(clienteId);
      if (e.downtime_min_24h && e.downtime_min_24h > 30) m.instabilidade.add(clienteId);
      if (e.latency_ms && e.latency_ms > 60) m.instabilidade.add(clienteId);
      if (e.vencido || (e.dias_atraso && e.dias_atraso > 7)) m.financeiro.add(clienteId);
      if (e.reincidente_30d) m.reincidencia.add(clienteId);
      if (e.nps_score !== null && e.nps_score !== undefined && e.nps_score <= 6) m.detrator.add(clienteId);
    });

    return Array.from(byMonth.entries())
      .map(([mes, data]) => ({
        mes: mes.slice(5),
        fullMes: mes,
        instabilidade: data.instabilidade.size,
        financeiro: data.financeiro.size,
        reincidencia: data.reincidencia.size,
        detrator: data.detrator.size,
      }))
      .sort((a, b) => a.fullMes.localeCompare(b.fullMes))
      .slice(-12);
  }, [eventos]);

  // Top variações MoM por dimensão
  const variacoesMoM = useMemo(() => {
    const dimensionKey = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
    
    // Pegar últimos 2 meses
    const meses = [...new Set(eventos.map(e => e.mes_referencia?.substring(0, 7)).filter(Boolean))].sort();
    const mesAtual = meses[meses.length - 1];
    const mesAnterior = meses[meses.length - 2];
    
    if (!mesAtual || !mesAnterior) return { melhorou: [], piorou: [] };

    const countByDim = (mes: string) => {
      const map = new Map<string, { risco: number; total: number }>();
      const clientesSeen = new Map<string, Set<string>>();
      
      eventos.filter(e => e.mes_referencia?.substring(0, 7) === mes).forEach(e => {
        const dim = (e as any)[dimensionKey] || 'Outros';
        const clienteId = String(e.cliente_id);
        
        if (!clientesSeen.has(dim)) clientesSeen.set(dim, new Set());
        if (clientesSeen.get(dim)!.has(clienteId)) return;
        clientesSeen.get(dim)!.add(clienteId);
        
        if (!map.has(dim)) map.set(dim, { risco: 0, total: 0 });
        const d = map.get(dim)!;
        d.total++;
        if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') {
          d.risco++;
        }
      });
      
      return map;
    };

    const atual = countByDim(mesAtual);
    const anterior = countByDim(mesAnterior);

    const variacoes: { name: string; variacao: number; atual: number; anterior: number }[] = [];

    atual.forEach((dataAtual, dim) => {
      const dataAnterior = anterior.get(dim);
      const taxaAtual = dataAtual.total > 0 ? (dataAtual.risco / dataAtual.total * 100) : 0;
      const taxaAnterior = dataAnterior && dataAnterior.total > 0 ? (dataAnterior.risco / dataAnterior.total * 100) : 0;
      const variacao = taxaAtual - taxaAnterior;
      
      variacoes.push({
        name: dim.length > 20 ? dim.slice(0, 20) + '...' : dim,
        variacao,
        atual: taxaAtual,
        anterior: taxaAnterior,
      });
    });

    variacoes.sort((a, b) => b.variacao - a.variacao);

    return {
      piorou: variacoes.filter(v => v.variacao > 0).slice(0, 5),
      melhorou: variacoes.filter(v => v.variacao < 0).sort((a, b) => a.variacao - b.variacao).slice(0, 5),
    };
  }, [eventos, dimension]);

  const formatMes = (mes: string) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const [_, month] = mes.split('-');
    if (!month) return mes;
    return meses[parseInt(month) - 1] || mes;
  };

  const cycleDimension = (dir: 'prev' | 'next') => {
    const dims: DimensionType[] = ['plano', 'cidade', 'bairro'];
    const idx = dims.indexOf(dimension);
    const newIdx = dir === 'next' ? (idx + 1) % 3 : (idx - 1 + 3) % 3;
    setDimension(dims[newIdx]);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-emerald-500" />
              Tendências
            </h1>
            <p className="text-muted-foreground mt-1">Séries mensais e variações MoM</p>
          </div>

          {/* Séries Principais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Churn */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Churn (rescisões/mês)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={seriesMensais}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Area type="monotone" dataKey="churn" stroke="#ef4444" fill="#ef444420" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* MRR */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  MRR (R$ mil)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={seriesMensais}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `R$${v}k`} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `R$ ${v}k`} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Area type="monotone" dataKey="mrr" stroke="#22c55e" fill="#22c55e20" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Faturamento vs Vencidos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Faturamento vs Vencidos (R$ mil)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={seriesMensais}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `R$${v}k`} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `R$ ${v}k`} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="vencidos" name="Vencidos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* MRR e LTV em Risco */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">MRR e LTV em Risco (R$ mil)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={seriesMensais}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `R$${v}k`} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `R$ ${v}k`} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="mrrRisco" name="MRR Risco" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="ltvRisco" name="LTV Risco" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Drivers ao longo do tempo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Drivers ao longo do tempo
                <UITooltip>
                  <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent>Quantidade de clientes afetados por cada driver em cada mês.</TooltipContent>
                </UITooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={driversTempo}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="instabilidade" name="Instabilidade" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="financeiro" name="Financeiro" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="reincidencia" name="Reincidência" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="detrator" name="Detrator NPS" stroke="#eab308" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Variações MoM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Piorou */}
            <Card className="border-l-4 border-red-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowUp className="h-4 w-4 text-red-500" />
                    Piorou MoM (% Risco por {dimension === 'plano' ? 'Plano' : dimension === 'cidade' ? 'Cidade' : 'Bairro'})
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cycleDimension('prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cycleDimension('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {variacoesMoM.piorou.map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-red-500/5 rounded">
                      <span className="text-sm font-medium">{v.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{v.anterior.toFixed(1)}% → {v.atual.toFixed(1)}%</span>
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <ArrowUp className="h-3 w-3" />
                          +{v.variacao.toFixed(1)}pp
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {variacoesMoM.piorou.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma piora significativa</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Melhorou */}
            <Card className="border-l-4 border-green-500">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowDown className="h-4 w-4 text-green-500" />
                  Melhorou MoM (% Risco por {dimension === 'plano' ? 'Plano' : dimension === 'cidade' ? 'Cidade' : 'Bairro'})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {variacoesMoM.melhorou.map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-green-500/5 rounded">
                      <span className="text-sm font-medium">{v.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{v.anterior.toFixed(1)}% → {v.atual.toFixed(1)}%</span>
                        <Badge className="bg-green-500 flex items-center gap-1">
                          <ArrowDown className="h-3 w-3" />
                          {v.variacao.toFixed(1)}pp
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {variacoesMoM.melhorou.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma melhora significativa</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TendenciasPage;
