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
import { TrendingDown, AlertTriangle, Eye, PlayCircle, CheckCircle, Wifi, CreditCard, Headphones, Frown, ChevronLeft, ChevronRight, Target, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, LineChart, Line, Legend } from "recharts";

type DimensionType = 'plano' | 'cidade' | 'bairro';

const ChurnPage = () => {
  const { eventos, isLoading } = useEventos();
  const [cohortDimension, setCohortDimension] = useState<DimensionType>('plano');

  const cycleDimension = (dir: 'prev' | 'next') => {
    const dims: DimensionType[] = ['plano', 'cidade', 'bairro'];
    const idx = dims.indexOf(cohortDimension);
    const newIdx = dir === 'next' ? (idx + 1) % 3 : (idx - 1 + 3) % 3;
    setCohortDimension(dims[newIdx]);
  };

  // KPIs de Churn
  const kpis = useMemo(() => {
    const clientesMap = new Map<string, any>();
    
    eventos.forEach(e => {
      const id = String(e.cliente_id);
      if (!clientesMap.has(id)) {
        clientesMap.set(id, {
          valor: e.valor_mensalidade || 0,
          churn_risk_bucket: e.churn_risk_bucket,
          ltv: e.ltv_reais_estimado || 0,
        });
      } else {
        const c = clientesMap.get(id)!;
        if (e.churn_risk_bucket) c.churn_risk_bucket = e.churn_risk_bucket;
      }
    });

    const clientes = Array.from(clientesMap.values());
    const emRisco = clientes.filter(c => c.churn_risk_bucket === 'Alto' || c.churn_risk_bucket === 'Crítico');
    
    return {
      mrrEmRisco: emRisco.reduce((s, c) => s + c.valor, 0),
      ltvEmRisco: emRisco.reduce((s, c) => s + c.ltv, 0),
      clientesRisco: emRisco.length,
      totalClientes: clientes.length,
    };
  }, [eventos]);

  // Fila de Risco (clientes Alto/Crítico)
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
          bairro: e.cliente_bairro,
          servico_status: e.servico_status,
          valor_mensalidade: e.valor_mensalidade,
          churn_risk_score: e.churn_risk_score,
          churn_risk_bucket: e.churn_risk_bucket,
          ultima_interacao: e.event_datetime,
          motivo_provavel: e.alerta_tipo,
          acao_recomendada: e.acao_recomendada_1,
        });
      } else {
        const cliente = clientesMap.get(clienteId)!;
        if (new Date(e.event_datetime) > new Date(cliente.ultima_interacao)) {
          cliente.ultima_interacao = e.event_datetime;
          cliente.churn_risk_score = e.churn_risk_score ?? cliente.churn_risk_score;
          cliente.churn_risk_bucket = e.churn_risk_bucket ?? cliente.churn_risk_bucket;
          cliente.motivo_provavel = e.alerta_tipo ?? cliente.motivo_provavel;
          cliente.acao_recomendada = e.acao_recomendada_1 ?? cliente.acao_recomendada;
        }
      }
    });

    return Array.from(clientesMap.values())
      .filter(c => c.churn_risk_bucket === 'Alto' || c.churn_risk_bucket === 'Crítico')
      .sort((a, b) => (b.churn_risk_score || 0) - (a.churn_risk_score || 0))
      .slice(0, 50);
  }, [eventos]);

  // Drivers de Churn
  const drivers = useMemo(() => {
    const clientesMap = new Map<string, any>();

    eventos.forEach(e => {
      const clienteId = String(e.cliente_id);
      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          valor: e.valor_mensalidade || 0,
          ltv: e.ltv_reais_estimado || 0,
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
      if (e.vencido || (e.dias_atraso && e.dias_atraso > 7)) c.financeiro = true;
      if (e.nps_score !== null && e.nps_score <= 6) c.detrator = true;
    });

    const clientes = Array.from(clientesMap.values());

    return [
      {
        nome: "Reincidência Suporte",
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
        name: name.length > 12 ? name.slice(0, 12) + '...' : name,
        fullName: name,
        taxa: data.total > 0 ? (data.risco / data.total * 100) : 0,
        clientes: data.risco,
        total: data.total,
        mrr: data.mrr,
      }))
      .sort((a, b) => b.taxa - a.taxa)
      .slice(0, 10);
  }, [eventos, cohortDimension]);

  // Série anual de churn
  const churnAnual = useMemo(() => {
    const byMonth = new Map<string, { total: number; risco: number }>();
    
    eventos.forEach(e => {
      const mes = e.mes_referencia?.substring(0, 7);
      if (!mes) return;
      
      const curr = byMonth.get(mes) || { total: 0, risco: 0 };
      curr.total++;
      if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') {
        curr.risco++;
      }
      byMonth.set(mes, curr);
    });

    return Array.from(byMonth.entries())
      .map(([mes, data]) => ({
        mes: mes.slice(5),
        taxa: data.total > 0 ? (data.risco / data.total * 100) : 0,
        absoluto: data.risco,
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
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [eventos]);

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
  const getBucketColor = (b: string) => {
    if (b === 'Crítico') return "bg-red-500/10 text-red-500 border-red-500/20";
    if (b === 'Alto') return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Clientes em Risco</span>
                </div>
                <p className="text-2xl font-bold">{kpis.clientesRisco}</p>
                <p className="text-xs text-muted-foreground">{((kpis.clientesRisco / kpis.totalClientes) * 100).toFixed(1)}% da base</p>
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
                <p className="text-2xl font-bold">{((kpis.clientesRisco / kpis.totalClientes) * 100).toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Drivers de Churn */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Drivers de Churn (MRR)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={drivers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis type="number" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                      <YAxis type="category" dataKey="nome" width={90} tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(223, 47%, 10%)', border: '1px solid hsl(220, 20%, 25%)' }} />
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
                      <span>{d.count} clientes</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cohort por Dimensão */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Cohort Churn por {cohortDimension === 'plano' ? 'Plano' : cohortDimension === 'cidade' ? 'Cidade' : 'Bairro'}</CardTitle>
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
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                      <Tooltip 
                        formatter={(v: number, name: string) => [name === 'taxa' ? `${v.toFixed(1)}%` : v, name === 'taxa' ? 'Taxa Risco' : 'Clientes']} 
                        contentStyle={{ backgroundColor: 'hsl(223, 47%, 10%)', border: '1px solid hsl(220, 20%, 25%)' }}
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
                <CardTitle className="text-base">Churn Anual (Taxa % por mês)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={churnAnual}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis dataKey="mes" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ backgroundColor: 'hsl(223, 47%, 10%)', border: '1px solid hsl(220, 20%, 25%)' }} />
                      <Line type="monotone" dataKey="taxa" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Motivos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Motivos de Contato (OS)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topMotivos} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis type="number" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                      <YAxis type="category" dataKey="motivo" width={100} tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 9 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(223, 47%, 10%)', border: '1px solid hsl(220, 20%, 25%)' }} />
                      <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
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
                Fila de Risco (Hoje)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filaRisco.map(c => (
                      <TableRow key={c.cliente_id}>
                        <TableCell>
                          <p className="font-medium text-sm">{c.cliente_nome}</p>
                          <p className="text-xs text-muted-foreground">{c.servico_status}</p>
                        </TableCell>
                        <TableCell className="text-sm">{c.plano_nome}</TableCell>
                        <TableCell className="text-sm">
                          <span>{c.cidade}</span>
                          {c.bairro && <span className="text-xs text-muted-foreground block">{c.bairro}</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{c.churn_risk_score}</span>
                            <Badge variant="outline" className={getBucketColor(c.churn_risk_bucket)}>
                              {c.churn_risk_bucket}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-32 truncate">{c.motivo_provavel}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm"><PlayCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Playbooks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Playbook Rede", items: ["Monitorar 24h", "Abrir OS preventiva", "Crédito proporcional", "Bônus banda 72h"], color: "border-orange-500" },
              { title: "Playbook Financeiro", items: ["Lembrete automático", "PIX copia/cola", "Negociação", "Bloqueio parcial"], color: "border-red-500" },
              { title: "Playbook Experiência", items: ["Retorno imediato", "Pedido desculpas", "Prioridade", "Oferta upgrade"], color: "border-purple-500" },
              { title: "Playbook Reincidência", items: ["Escalar N2", "Auditoria instalação", "Diagnóstico completo", "Acompanhamento"], color: "border-blue-500" },
            ].map(p => (
              <Card key={p.title} className={`border-l-4 ${p.color}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{p.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {p.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-3 w-3" />
                        {item}
                      </li>
                    ))}
                  </ul>
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