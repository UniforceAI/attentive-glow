import { useMemo, useState } from "react";
import { useEventos } from "@/hooks/useEventos";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingDown, AlertTriangle, CheckCircle, Wifi, CreditCard, Headphones, Frown, ChevronLeft, ChevronRight, Target, DollarSign, Phone, Mail, Gift, Plus, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { useToast } from "@/hooks/use-toast";

type DimensionType = 'plano' | 'cidade' | 'bairro';

const ChurnPage = () => {
  const { eventos } = useEventos();
  const { toast } = useToast();
  const [cohortDimension, setCohortDimension] = useState<DimensionType>('plano');
  const [completados, setCompletados] = useState<Set<string>>(new Set());

  const cycleDimension = (dir: 'prev' | 'next') => {
    const dims: DimensionType[] = ['plano', 'cidade', 'bairro'];
    const idx = dims.indexOf(cohortDimension);
    const newIdx = dir === 'next' ? (idx + 1) % 3 : (idx - 1 + 3) % 3;
    setCohortDimension(dims[newIdx]);
  };

  // KPIs de Churn
  const kpis = useMemo(() => {
    const clientesMap = new Map<string, any>();
    let churnCount = 0;
    
    eventos.forEach(e => {
      const id = String(e.cliente_id);
      if (!clientesMap.has(id)) {
        clientesMap.set(id, {
          valor: e.valor_mensalidade || 0,
          churn_risk_bucket: e.churn_risk_bucket,
          ltv: (e.valor_mensalidade || 0) * 12,
        });
      } else {
        const c = clientesMap.get(id)!;
        if (e.churn_risk_bucket) c.churn_risk_bucket = e.churn_risk_bucket;
      }
      
      if (e.servico_status === 'Cancelado') churnCount++;
    });

    const clientes = Array.from(clientesMap.values());
    const emRisco = clientes.filter(c => c.churn_risk_bucket === 'Alto' || c.churn_risk_bucket === 'Crítico');
    const totalClientes = clientes.length;
    
    return {
      mrrEmRisco: emRisco.reduce((s, c) => s + c.valor, 0),
      ltvEmRisco: emRisco.reduce((s, c) => s + c.ltv, 0),
      clientesRisco: emRisco.length,
      totalClientes,
      churnRescisoes: churnCount,
      churnRate: totalClientes > 0 ? (emRisco.length / totalClientes * 100) : 0,
    };
  }, [eventos]);

  // Fila de Risco (clientes Alto/Crítico) - sem duplicidade
  const filaRisco = useMemo(() => {
    const clientesMap = new Map<string, any>();

    eventos.forEach(e => {
      const clienteId = String(e.cliente_id);
      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          cliente_id: e.cliente_id,
          cliente_nome: e.cliente_nome,
          plano_nome: e.plano_nome,
          cidade: e.cliente_cidade,
          churn_risk_score: e.churn_risk_score,
          churn_risk_bucket: e.churn_risk_bucket,
          motivo: e.alerta_tipo || e.motivo_contato,
          acao_1: e.acao_recomendada_1,
          acao_2: e.acao_recomendada_2,
          acao_3: e.acao_recomendada_3,
          ultima_interacao: e.event_datetime,
        });
      } else {
        const cliente = clientesMap.get(clienteId)!;
        // Pegar o pior score do período
        if ((e.churn_risk_score || 0) > (cliente.churn_risk_score || 0)) {
          cliente.churn_risk_score = e.churn_risk_score;
          cliente.churn_risk_bucket = e.churn_risk_bucket;
        }
        // Atualizar última interação
        if (new Date(e.event_datetime) > new Date(cliente.ultima_interacao)) {
          cliente.ultima_interacao = e.event_datetime;
          cliente.motivo = e.alerta_tipo || e.motivo_contato || cliente.motivo;
          cliente.acao_1 = e.acao_recomendada_1 || cliente.acao_1;
          cliente.acao_2 = e.acao_recomendada_2 || cliente.acao_2;
          cliente.acao_3 = e.acao_recomendada_3 || cliente.acao_3;
        }
      }
    });

    return Array.from(clientesMap.values())
      .filter(c => c.churn_risk_bucket === 'Alto' || c.churn_risk_bucket === 'Crítico')
      .filter(c => !completados.has(String(c.cliente_id)))
      .sort((a, b) => (b.churn_risk_score || 0) - (a.churn_risk_score || 0))
      .slice(0, 50);
  }, [eventos, completados]);

  // Drivers de Churn com MRR e LTV
  const drivers = useMemo(() => {
    const clientesMap = new Map<string, any>();

    eventos.forEach(e => {
      const clienteId = String(e.cliente_id);
      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          valor: e.valor_mensalidade || 0,
          ltv: (e.valor_mensalidade || 0) * 12,
          reincidencia: false,
          instabilidade: false,
          financeiro: false,
          detrator: false,
        });
      }

      const c = clientesMap.get(clienteId)!;
      if (e.reincidente_30d) c.reincidencia = true;
      if (e.packet_loss_pct && e.packet_loss_pct > 2) c.instabilidade = true;
      if (e.downtime_min_24h && e.downtime_min_24h > 30) c.instabilidade = true;
      if (e.latency_ms && e.latency_ms > 60) c.instabilidade = true;
      if (e.vencido || (e.dias_atraso && e.dias_atraso > 7)) c.financeiro = true;
      if (e.nps_score !== null && e.nps_score !== undefined && e.nps_score <= 6) c.detrator = true;
    });

    const clientes = Array.from(clientesMap.values());

    return [
      {
        nome: "Reincidência",
        icon: Headphones,
        count: clientes.filter(c => c.reincidencia).length,
        mrr: clientes.filter(c => c.reincidencia).reduce((s, c) => s + c.valor, 0),
        ltv: clientes.filter(c => c.reincidencia).reduce((s, c) => s + c.ltv, 0),
        color: "#8b5cf6",
      },
      {
        nome: "Instabilidade",
        icon: Wifi,
        count: clientes.filter(c => c.instabilidade).length,
        mrr: clientes.filter(c => c.instabilidade).reduce((s, c) => s + c.valor, 0),
        ltv: clientes.filter(c => c.instabilidade).reduce((s, c) => s + c.ltv, 0),
        color: "#f97316",
      },
      {
        nome: "Financeiro",
        icon: CreditCard,
        count: clientes.filter(c => c.financeiro).length,
        mrr: clientes.filter(c => c.financeiro).reduce((s, c) => s + c.valor, 0),
        ltv: clientes.filter(c => c.financeiro).reduce((s, c) => s + c.ltv, 0),
        color: "#ef4444",
      },
      {
        nome: "Detrator NPS",
        icon: Frown,
        count: clientes.filter(c => c.detrator).length,
        mrr: clientes.filter(c => c.detrator).reduce((s, c) => s + c.valor, 0),
        ltv: clientes.filter(c => c.detrator).reduce((s, c) => s + c.ltv, 0),
        color: "#eab308",
      },
    ].sort((a, b) => b.mrr - a.mrr);
  }, [eventos]);

  // Cohort data por dimensão
  const cohortData = useMemo(() => {
    const dimensionKey = cohortDimension === 'plano' ? 'plano_nome' : 
                        cohortDimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
    
    const byDimension = new Map<string, { total: number; risco: number; mrr: number }>();
    const clientesSeen = new Map<string, Set<string>>();
    
    eventos.forEach(e => {
      const dim = (e as any)[dimensionKey];
      const clienteId = String(e.cliente_id);
      if (!dim) return;
      
      if (!clientesSeen.has(dim)) {
        clientesSeen.set(dim, new Set());
      }
      
      if (!clientesSeen.get(dim)!.has(clienteId)) {
        clientesSeen.get(dim)!.add(clienteId);
        const curr = byDimension.get(dim) || { total: 0, risco: 0, mrr: 0 };
        curr.total++;
        if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') {
          curr.risco++;
        }
        curr.mrr += e.valor_mensalidade || 0;
        byDimension.set(dim, curr);
      }
    });

    return Array.from(byDimension.entries())
      .map(([name, data]) => ({
        name: name.length > 15 ? name.slice(0, 15) + '...' : name,
        fullName: name,
        taxa: data.total > 0 ? (data.risco / data.total * 100) : 0,
        clientes: data.risco,
        total: data.total,
        mrr: data.mrr,
      }))
      .sort((a, b) => b.taxa - a.taxa)
      .slice(0, 10);
  }, [eventos, cohortDimension]);

  // Série anual de churn (12 meses)
  const churnAnual = useMemo(() => {
    const byMonth = new Map<string, { total: number; risco: number; churn: number }>();
    const clientesPorMes = new Map<string, Set<string>>();
    
    eventos.forEach(e => {
      const mes = e.mes_referencia?.substring(0, 7);
      if (!mes) return;
      
      const clienteId = String(e.cliente_id);
      if (!clientesPorMes.has(mes)) clientesPorMes.set(mes, new Set());
      
      if (!clientesPorMes.get(mes)!.has(clienteId)) {
        clientesPorMes.get(mes)!.add(clienteId);
        const curr = byMonth.get(mes) || { total: 0, risco: 0, churn: 0 };
        curr.total++;
        if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') {
          curr.risco++;
        }
        if (e.servico_status === 'Cancelado') {
          curr.churn++;
        }
        byMonth.set(mes, curr);
      }
    });

    return Array.from(byMonth.entries())
      .map(([mes, data]) => ({
        mes: mes.slice(5),
        taxa: data.total > 0 ? (data.risco / data.total * 100) : 0,
        absoluto: data.churn,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12);
  }, [eventos]);

  // Top motivos via OS
  const topMotivos = useMemo(() => {
    const motivos = new Map<string, number>();
    
    eventos
      .filter(e => e.event_type === 'ATENDIMENTO' && e.motivo_contato)
      .forEach(e => {
        const motivo = e.motivo_contato!;
        motivos.set(motivo, (motivos.get(motivo) || 0) + 1);
      });

    return Array.from(motivos.entries())
      .map(([motivo, count]) => ({ motivo: motivo.length > 20 ? motivo.slice(0, 20) + '...' : motivo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [eventos]);

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
  const getBucketColor = (b: string) => {
    if (b === 'Crítico') return "bg-red-500/10 text-red-500 border-red-500/20";
    if (b === 'Alto') return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  };

  const handleAction = (cliente: any, action: string) => {
    toast({ title: "Ação executada", description: `${action} para ${cliente.cliente_nome}` });
  };

  const handleConcluir = (cliente: any) => {
    setCompletados(prev => new Set(prev).add(String(cliente.cliente_id)));
    toast({ title: "Concluído", description: `${cliente.cliente_nome} removido da fila` });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-orange-500" />
              Churn & Retenção
            </h1>
            <p className="text-muted-foreground mt-1">Identifique e aja em clientes com risco de cancelamento</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Clientes em Risco</span>
                </div>
                <p className="text-2xl font-bold">{kpis.clientesRisco}</p>
                <p className="text-xs text-muted-foreground">{kpis.churnRate.toFixed(1)}% da base</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Churn Rescisões</span>
                </div>
                <p className="text-2xl font-bold">{kpis.churnRescisoes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">MRR em Risco</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(kpis.mrrEmRisco)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">LTV em Risco</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(kpis.ltvEmRisco)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-warning" />
                  <span className="text-xs text-muted-foreground">Churn Rate</span>
                </div>
                <p className="text-2xl font-bold">{kpis.churnRate.toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Total Clientes</span>
                </div>
                <p className="text-2xl font-bold">{kpis.totalClientes}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Drivers de Churn */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Drivers de Churn
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Fatores que mais contribuem para o risco de churn. MRR associado a cada driver.</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={drivers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis type="category" dataKey="nome" width={90} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <RechartsTooltip 
                        formatter={(v: number) => formatCurrency(v)} 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} 
                      />
                      <Bar dataKey="mrr" radius={4}>
                        {drivers.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5">
                  {drivers.map(d => (
                    <div key={d.nome} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <d.icon className="h-3 w-3" style={{ color: d.color }} />
                        <span className="text-muted-foreground">{d.nome}</span>
                      </div>
                      <div className="flex gap-2">
                        <span>{d.count} clientes</span>
                        <span className="text-muted-foreground">LTV: {formatCurrency(d.ltv)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cohort por Dimensão */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    Cohort Churn por {cohortDimension === 'plano' ? 'Plano' : cohortDimension === 'cidade' ? 'Cidade' : 'Bairro'}
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>% de clientes em risco Alto/Crítico por {cohortDimension}. Use as setas para alternar dimensões.</TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cycleDimension('prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground capitalize w-16 text-center">{cohortDimension}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cycleDimension('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cohortData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <RechartsTooltip 
                        formatter={(v: number, name: string) => [name === 'taxa' ? `${v.toFixed(1)}%` : v, name === 'taxa' ? 'Taxa Risco' : 'Clientes']} 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="taxa" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Churn Anual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Churn Anual (Taxa % por mês)
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Evolução mensal da taxa de clientes em risco de churn nos últimos 12 meses.</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={churnAnual}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <RechartsTooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Area type="monotone" dataKey="taxa" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%, 0.2)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Motivos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Top Motivos de Contato (OS)
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Principais motivos de contato nos atendimentos. Indicam causas-raiz do churn.</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topMotivos} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis type="category" dataKey="motivo" width={120} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fila de Risco */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Fila de Risco (Alto/Crítico)
                <Badge variant="outline">{filaRisco.length} clientes</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filaRisco.map((c, i) => (
                      <TableRow key={`${c.cliente_id}-${i}`}>
                        <TableCell className="font-medium">{c.cliente_nome}</TableCell>
                        <TableCell>{c.plano_nome}</TableCell>
                        <TableCell>{c.cidade}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{c.churn_risk_score}</span>
                            <Badge variant="outline" className={getBucketColor(c.churn_risk_bucket)}>
                              {c.churn_risk_bucket}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-32 truncate">{c.motivo || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {c.acao_1 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleAction(c, c.acao_1)}>
                                    <Phone className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{c.acao_1}</TooltipContent>
                              </Tooltip>
                            )}
                            {c.acao_2 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleAction(c, c.acao_2)}>
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{c.acao_2}</TooltipContent>
                              </Tooltip>
                            )}
                            {c.acao_3 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleAction(c, c.acao_3)}>
                                    <Gift className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{c.acao_3}</TooltipContent>
                              </Tooltip>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleConcluir(c)}>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Playbooks */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { titulo: "Rede", icon: Wifi, color: "border-orange-500", desc: "OS preventiva, monitorar 24h, bônus banda" },
              { titulo: "Financeiro", icon: CreditCard, color: "border-red-500", desc: "PIX copia/cola, negociação, bloqueio parcial" },
              { titulo: "Experiência", icon: Frown, color: "border-purple-500", desc: "Retorno imediato, desculpas, prioridade" },
              { titulo: "Reincidência", icon: Headphones, color: "border-blue-500", desc: "Escalar N2, auditoria, diagnóstico" },
            ].map(p => (
              <Card key={p.titulo} className={`border-l-4 ${p.color}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p.icon className="h-5 w-5" />
                    <span className="font-semibold">Playbook {p.titulo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChurnPage;
