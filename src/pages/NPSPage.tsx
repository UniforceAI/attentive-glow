import { useMemo, useState } from "react";
import { useDataLoader } from "@/hooks/useDataLoader";
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
import { Star, ThumbsUp, Minus, ThumbsDown, MessageSquare, Phone, ChevronLeft, ChevronRight, Info, CheckCircle, AlertTriangle, Mail } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, BarChart, Bar } from "recharts";
import { useToast } from "@/hooks/use-toast";

type DimensionType = 'plano' | 'cidade' | 'bairro';

const NPSPage = () => {
  const { allEventos: eventos } = useDataLoader();
  const { toast } = useToast();
  const [dimension, setDimension] = useState<DimensionType>('plano');
  const [completados, setCompletados] = useState<Set<string>>(new Set());

  const npsEventos = useMemo(() => eventos.filter(e => e.event_type === 'NPS' && e.nps_score !== null), [eventos]);

  const kpis = useMemo(() => {
    const promotores = npsEventos.filter(e => e.nps_score! >= 9).length;
    const neutros = npsEventos.filter(e => e.nps_score! >= 7 && e.nps_score! <= 8).length;
    const detratores = npsEventos.filter(e => e.nps_score! <= 6).length;
    const total = promotores + neutros + detratores;
    const nps = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0;

    // Detratores em risco (NPS <= 6 E churn Alto/Crítico)
    const detratoresEmRisco = npsEventos.filter(e => 
      e.nps_score! <= 6 && (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico')
    ).length;

    return { 
      nps, 
      promotores, 
      neutros, 
      detratores, 
      total,
      pctDetratores: total > 0 ? (detratores / total * 100) : 0,
      detratoresEmRisco,
    };
  }, [npsEventos]);

  // Série mensal
  const serieMensal = useMemo(() => {
    const byMonth = new Map<string, { promotores: number; neutros: number; detratores: number }>();
    
    npsEventos.forEach(e => {
      const mes = e.mes_referencia?.substring(0, 7);
      if (!mes) return;
      
      if (!byMonth.has(mes)) byMonth.set(mes, { promotores: 0, neutros: 0, detratores: 0 });
      const m = byMonth.get(mes)!;
      
      if (e.nps_score! >= 9) m.promotores++;
      else if (e.nps_score! >= 7) m.neutros++;
      else m.detratores++;
    });
    
    return Array.from(byMonth.entries())
      .map(([mes, data]) => ({ mes: mes.slice(5), ...data }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12);
  }, [npsEventos]);

  // Detratores por dimensão
  const detratoresByDim = useMemo(() => {
    const dimensionKey = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
    const byDim = new Map<string, { total: number; detratores: number }>();
    
    npsEventos.forEach(e => {
      const dim = (e as any)[dimensionKey] || 'Outros';
      if (!byDim.has(dim)) byDim.set(dim, { total: 0, detratores: 0 });
      const d = byDim.get(dim)!;
      d.total++;
      if (e.nps_score! <= 6) d.detratores++;
    });
    
    return Array.from(byDim.entries())
      .map(([name, data]) => ({
        name: name.length > 15 ? name.slice(0, 15) + '...' : name,
        taxa: data.total > 0 ? (data.detratores / data.total * 100) : 0,
        count: data.detratores,
      }))
      .sort((a, b) => b.taxa - a.taxa)
      .slice(0, 8);
  }, [npsEventos, dimension]);

  // Detratores com detalhes (sem duplicidade)
  const detratores = useMemo(() => {
    const map = new Map<string, any>();
    
    npsEventos
      .filter(e => e.nps_score! <= 6)
      .forEach(e => {
        const id = String(e.cliente_id);
        if (!map.has(id)) {
          map.set(id, {
            cliente_id: e.cliente_id,
            cliente_nome: e.cliente_nome,
            plano: e.plano_nome,
            cidade: e.cliente_cidade,
            nps_score: e.nps_score,
            nps_comment: e.nps_comment,
            churn_risk_bucket: e.churn_risk_bucket,
            alerta_tipo: e.alerta_tipo,
            acao_1: e.acao_recomendada_1,
            acao_2: e.acao_recomendada_2,
          });
        } else {
          // Pegar pior score
          const c = map.get(id)!;
          if (e.nps_score! < c.nps_score) {
            c.nps_score = e.nps_score;
            c.nps_comment = e.nps_comment;
          }
        }
      });

    return Array.from(map.values())
      .filter(c => !completados.has(String(c.cliente_id)))
      .sort((a, b) => a.nps_score - b.nps_score)
      .slice(0, 50);
  }, [npsEventos, completados]);

  const pieData = [
    { name: 'Promotores (9-10)', value: kpis.promotores, color: '#22c55e' },
    { name: 'Neutros (7-8)', value: kpis.neutros, color: '#eab308' },
    { name: 'Detratores (0-6)', value: kpis.detratores, color: '#ef4444' },
  ];

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
              <Star className="h-8 w-8 text-yellow-500" />
              NPS & Experiência
            </h1>
            <p className="text-muted-foreground mt-1">Net Promoter Score e satisfação do cliente</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <Card className="col-span-2 md:col-span-1">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase mb-1">NPS</p>
                <p className={`text-4xl font-bold ${kpis.nps >= 50 ? 'text-green-500' : kpis.nps >= 0 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {kpis.nps > 0 ? '+' : ''}{kpis.nps}
                </p>
              </CardContent>
            </Card>
            {[
              { label: "Promotores", value: kpis.promotores, icon: ThumbsUp, color: "text-green-500" },
              { label: "Neutros", value: kpis.neutros, icon: Minus, color: "text-yellow-500" },
              { label: "Detratores", value: kpis.detratores, icon: ThumbsDown, color: "text-red-500" },
              { label: "% Detratores", value: `${kpis.pctDetratores.toFixed(1)}%`, icon: ThumbsDown, color: "text-red-500" },
              { label: "Detratores Risco", value: kpis.detratoresEmRisco, icon: AlertTriangle, color: "text-orange-500" },
              { label: "Respostas", value: kpis.total, icon: MessageSquare },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <k.icon className={`h-4 w-4 ${k.color || 'text-muted-foreground'}`} />
                    <p className="text-xs text-muted-foreground uppercase">{k.label}</p>
                  </div>
                  <p className={`text-2xl font-bold ${k.color || ''}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Distribuição */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição NPS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Série Mensal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Evolução Mensal
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Distribuição de promotores, neutros e detratores por mês.</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={serieMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="promotores" name="Promotores" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="neutros" name="Neutros" stroke="#eab308" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="detratores" name="Detratores" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detratores por Dimensão */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">% Detratores por {dimension === 'plano' ? 'Plano' : dimension === 'cidade' ? 'Cidade' : 'Bairro'}</CardTitle>
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
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={detratoresByDim}>
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

          {/* Detratores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ThumbsDown className="h-5 w-5 text-red-500" />
                Fila de Detratores (Ação Necessária)
                <Badge variant="outline">{detratores.length} clientes</Badge>
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
                      <TableHead>Comentário</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detratores.map((d, i) => (
                      <TableRow key={`${d.cliente_id}-${i}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{d.cliente_nome}</p>
                            <p className="text-xs text-muted-foreground">{d.cidade}</p>
                          </div>
                        </TableCell>
                        <TableCell>{d.plano}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{d.nps_score}</Badge>
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                          {d.nps_comment || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            d.churn_risk_bucket === 'Crítico' ? 'bg-red-500/10 text-red-500' :
                            d.churn_risk_bucket === 'Alto' ? 'bg-orange-500/10 text-orange-500' : ''
                          }>
                            {d.churn_risk_bucket || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleAction(d, 'Ligar')}>
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Retorno imediato</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleAction(d, 'Email')}>
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Pedido de desculpas</TooltipContent>
                            </Tooltip>
                            <Button variant="ghost" size="sm" onClick={() => handleConcluir(d)}>
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

export default NPSPage;
