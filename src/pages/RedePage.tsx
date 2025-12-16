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
import { Wifi, AlertTriangle, Clock, Activity, Eye, Wrench, Bell, CheckCircle, Plus, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";

type DimensionType = 'plano' | 'cidade' | 'bairro';

const RedePage = () => {
  const { eventos } = useEventos();
  const { toast } = useToast();
  const [dimension, setDimension] = useState<DimensionType>('plano');
  const [completados, setCompletados] = useState<Set<string>>(new Set());

  const sinais = useMemo(() => eventos.filter(e => e.event_type === 'SINAL'), [eventos]);

  // KPIs
  const kpis = useMemo(() => {
    const criticos = sinais.filter(s => 
      (s.packet_loss_pct && s.packet_loss_pct >= 2) ||
      (s.latency_ms && s.latency_ms >= 60) ||
      (s.downtime_min_24h && s.downtime_min_24h >= 30) ||
      (s.snr_db && s.snr_db <= 20)
    );
    const latencias = sinais.filter(s => s.latency_ms).map(s => s.latency_ms!);
    const losses = sinais.filter(s => s.packet_loss_pct).map(s => s.packet_loss_pct!);
    const downtimes = sinais.filter(s => s.downtime_min_24h).map(s => s.downtime_min_24h!);

    return {
      total: sinais.length,
      criticos: criticos.length,
      pctCriticos: sinais.length > 0 ? (criticos.length / sinais.length * 100) : 0,
      latenciaMedia: latencias.length > 0 ? latencias.reduce((a, b) => a + b, 0) / latencias.length : 0,
      lossMedia: losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
      downtimeMedio: downtimes.length > 0 ? downtimes.reduce((a, b) => a + b, 0) / downtimes.length : 0,
    };
  }, [sinais]);

  // Série mensal de sinais críticos
  const serieMensal = useMemo(() => {
    const byMonth = new Map<string, { total: number; criticos: number }>();
    
    sinais.forEach(s => {
      const mes = s.mes_referencia?.substring(0, 7);
      if (!mes) return;
      
      if (!byMonth.has(mes)) byMonth.set(mes, { total: 0, criticos: 0 });
      const m = byMonth.get(mes)!;
      m.total++;
      
      if ((s.packet_loss_pct && s.packet_loss_pct >= 2) ||
          (s.latency_ms && s.latency_ms >= 60) ||
          (s.downtime_min_24h && s.downtime_min_24h >= 30) ||
          (s.snr_db && s.snr_db <= 20)) {
        m.criticos++;
      }
    });
    
    return Array.from(byMonth.entries())
      .map(([mes, data]) => ({
        mes: mes.slice(5),
        taxa: data.total > 0 ? (data.criticos / data.total * 100) : 0,
        criticos: data.criticos,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12);
  }, [sinais]);

  // Ranking por dimensão
  const rankingByDim = useMemo(() => {
    const dimensionKey = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
    const byDim = new Map<string, { total: number; criticos: number }>();
    
    sinais.forEach(s => {
      const dim = (s as any)[dimensionKey] || 'Outros';
      if (!byDim.has(dim)) byDim.set(dim, { total: 0, criticos: 0 });
      const d = byDim.get(dim)!;
      d.total++;
      
      if ((s.packet_loss_pct && s.packet_loss_pct >= 2) ||
          (s.latency_ms && s.latency_ms >= 60) ||
          (s.downtime_min_24h && s.downtime_min_24h >= 30) ||
          (s.snr_db && s.snr_db <= 20)) {
        d.criticos++;
      }
    });
    
    return Array.from(byDim.entries())
      .map(([name, data]) => ({
        name: name.length > 15 ? name.slice(0, 15) + '...' : name,
        taxa: data.total > 0 ? (data.criticos / data.total * 100) : 0,
        criticos: data.criticos,
      }))
      .sort((a, b) => b.taxa - a.taxa)
      .slice(0, 8);
  }, [sinais, dimension]);

  // Top áreas críticas
  const topAreas = useMemo(() => {
    const areas = new Map<string, number>();
    sinais
      .filter(s => 
        (s.packet_loss_pct && s.packet_loss_pct >= 2) ||
        (s.latency_ms && s.latency_ms >= 60) ||
        (s.downtime_min_24h && s.downtime_min_24h >= 30) ||
        (s.snr_db && s.snr_db <= 20)
      )
      .forEach(s => {
        const area = s.cliente_cidade || 'Outros';
        areas.set(area, (areas.get(area) || 0) + 1);
      });
    
    return Array.from(areas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [sinais]);

  // Clientes com sinal crítico (sem duplicidade)
  const clientesCriticos = useMemo(() => {
    const map = new Map<string, any>();
    
    sinais
      .filter(s => 
        (s.packet_loss_pct && s.packet_loss_pct >= 2) ||
        (s.latency_ms && s.latency_ms >= 60) ||
        (s.downtime_min_24h && s.downtime_min_24h >= 30) ||
        (s.snr_db && s.snr_db <= 20)
      )
      .forEach(s => {
        const id = String(s.cliente_id);
        if (!map.has(id)) {
          map.set(id, {
            cliente_id: s.cliente_id,
            cliente_nome: s.cliente_nome,
            plano: s.plano_nome,
            cidade: s.cliente_cidade,
            rx_dbm: s.rx_dbm,
            tx_dbm: s.tx_dbm,
            snr_db: s.snr_db,
            latency_ms: s.latency_ms,
            packet_loss_pct: s.packet_loss_pct,
            downtime_min_24h: s.downtime_min_24h,
            churn_risk_bucket: s.churn_risk_bucket,
            acao_1: s.acao_recomendada_1,
            acao_2: s.acao_recomendada_2,
            acao_3: s.acao_recomendada_3,
          });
        } else {
          // Pegar piores métricas
          const c = map.get(id)!;
          if ((s.packet_loss_pct || 0) > (c.packet_loss_pct || 0)) c.packet_loss_pct = s.packet_loss_pct;
          if ((s.latency_ms || 0) > (c.latency_ms || 0)) c.latency_ms = s.latency_ms;
          if ((s.downtime_min_24h || 0) > (c.downtime_min_24h || 0)) c.downtime_min_24h = s.downtime_min_24h;
        }
      });

    return Array.from(map.values())
      .filter(c => !completados.has(String(c.cliente_id)))
      .slice(0, 50);
  }, [sinais, completados]);

  const isCritical = (value: number | null, threshold: number, reverse = false) => {
    if (value === null) return false;
    return reverse ? value <= threshold : value >= threshold;
  };

  const cycleDimension = (dir: 'prev' | 'next') => {
    const dims: DimensionType[] = ['plano', 'cidade', 'bairro'];
    const idx = dims.indexOf(dimension);
    const newIdx = dir === 'next' ? (idx + 1) % 3 : (idx - 1 + 3) % 3;
    setDimension(dims[newIdx]);
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
              <Wifi className="h-8 w-8 text-cyan-500" />
              Saúde de Rede
            </h1>
            <p className="text-muted-foreground mt-1">Monitoramento de sinal e qualidade da conexão</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Leituras", value: kpis.total, icon: Activity },
              { label: "% Crítico", value: `${kpis.pctCriticos.toFixed(1)}%`, icon: AlertTriangle, color: "text-red-500" },
              { label: "Latência Média", value: `${kpis.latenciaMedia.toFixed(0)}ms`, icon: Clock },
              { label: "Packet Loss", value: `${kpis.lossMedia.toFixed(2)}%`, icon: Wifi },
              { label: "Downtime Médio", value: `${kpis.downtimeMedio.toFixed(0)}min`, icon: Clock },
              { label: "Top Área", value: topAreas[0]?.name || '-', icon: AlertTriangle, color: "text-orange-500" },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <k.icon className={`h-4 w-4 ${k.color || 'text-muted-foreground'}`} />
                    <p className="text-xs text-muted-foreground uppercase">{k.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${k.color || ''}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Regras de Sinal Crítico */}
          <Card className="border-l-4 border-red-500">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-2">Critérios de Sinal Crítico:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">packet_loss ≥ 2%</Badge>
                <Badge variant="outline">latência ≥ 60ms</Badge>
                <Badge variant="outline">downtime ≥ 30min</Badge>
                <Badge variant="outline">SNR ≤ 20dB</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Série Mensal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Evolução Mensal (% Crítico)
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Percentual de leituras críticas por mês nos últimos 12 meses.</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={serieMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                      <RechartsTooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Line type="monotone" dataKey="taxa" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Ranking por Dimensão */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">% Crítico por {dimension === 'plano' ? 'Plano' : dimension === 'cidade' ? 'Cidade' : 'Bairro'}</CardTitle>
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
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rankingByDim}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                      <RechartsTooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="taxa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Clientes Críticos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Clientes com Sinal Crítico
                <Badge variant="outline">{clientesCriticos.length} clientes</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>SNR</TableHead>
                      <TableHead>Latência</TableHead>
                      <TableHead>Loss</TableHead>
                      <TableHead>Downtime</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesCriticos.map((c, i) => (
                      <TableRow key={`${c.cliente_id}-${i}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.cliente_nome}</p>
                            <p className="text-xs text-muted-foreground">{c.cidade}</p>
                          </div>
                        </TableCell>
                        <TableCell>{c.plano}</TableCell>
                        <TableCell className={isCritical(c.snr_db, 20, true) ? 'text-red-500 font-bold' : ''}>
                          {c.snr_db?.toFixed(1) || '-'}dB
                        </TableCell>
                        <TableCell className={isCritical(c.latency_ms, 60) ? 'text-red-500 font-bold' : ''}>
                          {c.latency_ms?.toFixed(0) || '-'}ms
                        </TableCell>
                        <TableCell className={isCritical(c.packet_loss_pct, 2) ? 'text-red-500 font-bold' : ''}>
                          {c.packet_loss_pct?.toFixed(2) || '-'}%
                        </TableCell>
                        <TableCell className={isCritical(c.downtime_min_24h, 30) ? 'text-red-500 font-bold' : ''}>
                          {c.downtime_min_24h?.toFixed(0) || '-'}min
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            c.churn_risk_bucket === 'Crítico' ? 'bg-red-500/10 text-red-500' :
                            c.churn_risk_bucket === 'Alto' ? 'bg-orange-500/10 text-orange-500' : ''
                          }>
                            {c.churn_risk_bucket || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleAction(c, 'OS preventiva')}>
                                  <Wrench className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>OS preventiva</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleAction(c, 'Monitorar 24h')}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Monitorar 24h</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleAction(c, 'Bônus banda')}>
                                  <Bell className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Bônus banda</TooltipContent>
                            </Tooltip>
                            <Button variant="ghost" size="sm" onClick={() => handleConcluir(c)}>
                              <CheckCircle className="h-4 w-4 text-green-500" />
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
        </div>
      </main>
    </div>
  );
};

export default RedePage;
