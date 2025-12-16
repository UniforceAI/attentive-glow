import { useMemo } from "react";
import { useEventos } from "@/hooks/useEventos";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingDown, AlertTriangle, Eye, PlayCircle, CheckCircle, Wifi, CreditCard, Headphones, Frown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";

const ChurnPage = () => {
  const { eventos, isLoading } = useEventos();

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
    const total = clientes.length;

    return [
      {
        nome: "Reincidência Suporte",
        icon: Headphones,
        count: clientes.filter(c => c.reincidencia).length,
        impacto: clientes.filter(c => c.reincidencia).reduce((s, c) => s + c.valor, 0),
        color: "#8b5cf6",
      },
      {
        nome: "Instabilidade",
        icon: Wifi,
        count: clientes.filter(c => c.instabilidade).length,
        impacto: clientes.filter(c => c.instabilidade).reduce((s, c) => s + c.valor, 0),
        color: "#f97316",
      },
      {
        nome: "Financeiro",
        icon: CreditCard,
        count: clientes.filter(c => c.financeiro).length,
        impacto: clientes.filter(c => c.financeiro).reduce((s, c) => s + c.valor, 0),
        color: "#ef4444",
      },
      {
        nome: "Detrator NPS",
        icon: Frown,
        count: clientes.filter(c => c.detrator).length,
        impacto: clientes.filter(c => c.detrator).reduce((s, c) => s + c.valor, 0),
        color: "#eab308",
      },
    ].sort((a, b) => b.impacto - a.impacto);
  }, [eventos]);

  // Early Warning - % por bucket por mês
  const earlyWarning = useMemo(() => {
    const mesesMap = new Map<string, { baixo: number; medio: number; alto: number; critico: number; total: number }>();

    eventos.forEach(e => {
      if (!e.mes_referencia) return;
      const mes = e.mes_referencia.substring(0, 7);
      if (!mesesMap.has(mes)) {
        mesesMap.set(mes, { baixo: 0, medio: 0, alto: 0, critico: 0, total: 0 });
      }
      const m = mesesMap.get(mes)!;
      m.total++;
      if (e.churn_risk_bucket === 'Baixo') m.baixo++;
      if (e.churn_risk_bucket === 'Médio') m.medio++;
      if (e.churn_risk_bucket === 'Alto') m.alto++;
      if (e.churn_risk_bucket === 'Crítico') m.critico++;
    });

    return Array.from(mesesMap.entries())
      .map(([mes, data]) => ({
        mes,
        Baixo: Math.round((data.baixo / data.total) * 100),
        Médio: Math.round((data.medio / data.total) * 100),
        Alto: Math.round((data.alto / data.total) * 100),
        Crítico: Math.round((data.critico / data.total) * 100),
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12);
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
              Prevenção de Churn
            </h1>
            <p className="text-muted-foreground mt-1">Identifique e aja em clientes com risco de cancelamento</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fila de Risco */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Fila de Risco (Hoje)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Plano</TableHead>
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

            {/* Drivers */}
            <Card>
              <CardHeader>
                <CardTitle>Drivers de Churn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={drivers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="impacto" radius={4}>
                        {drivers.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {drivers.map(d => (
                    <div key={d.nome} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <d.icon className="h-4 w-4" style={{ color: d.color }} />
                        <span>{d.nome}</span>
                      </div>
                      <span className="text-muted-foreground">{d.count} clientes</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Early Warning */}
          <Card>
            <CardHeader>
              <CardTitle>Churn Early-Warning (% por bucket)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={earlyWarning}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Area type="monotone" dataKey="Crítico" stackId="1" fill="#ef4444" stroke="#ef4444" />
                    <Area type="monotone" dataKey="Alto" stackId="1" fill="#f97316" stroke="#f97316" />
                    <Area type="monotone" dataKey="Médio" stackId="1" fill="#eab308" stroke="#eab308" />
                    <Area type="monotone" dataKey="Baixo" stackId="1" fill="#22c55e" stroke="#22c55e" />
                  </AreaChart>
                </ResponsiveContainer>
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
