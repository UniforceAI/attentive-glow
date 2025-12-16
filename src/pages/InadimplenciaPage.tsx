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
import { CreditCard, Clock, AlertTriangle, Send, FileText, Ban, CheckCircle, Plus, Copy, MessageSquare, Info, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";

type DimensionType = 'plano' | 'cidade' | 'bairro';

const InadimplenciaPage = () => {
  const { eventos } = useEventos();
  const { toast } = useToast();
  const [completados, setCompletados] = useState<Set<string>>(new Set());
  const [dimension, setDimension] = useState<DimensionType>('plano');

  const cobrancas = useMemo(() => eventos.filter(e => e.event_type === 'COBRANCA'), [eventos]);

  // KPIs
  const kpis = useMemo(() => {
    const emAberto = cobrancas.filter(c => c.cobranca_status === 'Em Aberto');
    const vencidas = cobrancas.filter(c => c.cobranca_status === 'Vencido');
    const pagas = cobrancas.filter(c => c.cobranca_status === 'Pago');
    const recuperadas = pagas.filter(c => c.data_pagamento && c.data_vencimento && new Date(c.data_pagamento) > new Date(c.data_vencimento));
    
    return {
      qtdAberto: emAberto.length,
      qtdVencido: vencidas.length,
      valorAberto: emAberto.reduce((s, c) => s + (c.valor_cobranca || 0), 0),
      valorVencido: vencidas.reduce((s, c) => s + (c.valor_cobranca || 0), 0),
      recuperacao: recuperadas.reduce((s, c) => s + (c.valor_pago || 0), 0),
      taxaRecuperacao: pagas.length > 0 ? (recuperadas.length / pagas.length * 100) : 0,
    };
  }, [cobrancas]);

  // Aging buckets
  const aging = useMemo(() => {
    const buckets = { 
      "1-7d": { valor: 0, count: 0 }, 
      "8-15d": { valor: 0, count: 0 }, 
      "16-30d": { valor: 0, count: 0 }, 
      "31-60d": { valor: 0, count: 0 }, 
      "60+d": { valor: 0, count: 0 } 
    };
    
    cobrancas.filter(c => c.cobranca_status === 'Vencido' || c.cobranca_status === 'Em Aberto').forEach(c => {
      const dias = c.dias_atraso || 0;
      const bucket = dias <= 7 ? "1-7d" : dias <= 15 ? "8-15d" : dias <= 30 ? "16-30d" : dias <= 60 ? "31-60d" : "60+d";
      buckets[bucket].valor += c.valor_cobranca || 0;
      buckets[bucket].count++;
    });
    
    return Object.entries(buckets).map(([name, data]) => ({ name, valor: data.valor, count: data.count }));
  }, [cobrancas]);

  // Eficácia por método
  const eficaciaMetodo = useMemo(() => {
    const metodos = new Map<string, { total: number; pagos: number; valor: number }>();
    cobrancas.forEach(c => {
      const m = c.metodo_cobranca || 'Outro';
      if (!metodos.has(m)) metodos.set(m, { total: 0, pagos: 0, valor: 0 });
      const met = metodos.get(m)!;
      met.total++;
      met.valor += c.valor_cobranca || 0;
      if (c.cobranca_status === 'Pago') met.pagos++;
    });
    return Array.from(metodos.entries())
      .map(([name, { total, pagos, valor }]) => ({
        name,
        taxa: total > 0 ? Math.round((pagos / total) * 100) : 0,
        total,
        valor,
      }))
      .sort((a, b) => b.taxa - a.taxa);
  }, [cobrancas]);

  // Inadimplência por dimensão
  const inadByDimension = useMemo(() => {
    const dimensionKey = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
    const byDim = new Map<string, number>();
    
    cobrancas.filter(c => c.cobranca_status === 'Vencido').forEach(c => {
      const dim = (c as any)[dimensionKey] || 'Outros';
      byDim.set(dim, (byDim.get(dim) || 0) + (c.valor_cobranca || 0));
    });
    
    return Array.from(byDim.entries())
      .map(([name, valor]) => ({ name: name.length > 15 ? name.slice(0, 15) + '...' : name, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [cobrancas, dimension]);

  // Série mensal
  const serieMensal = useMemo(() => {
    const byMonth = new Map<string, { vencido: number; recuperado: number }>();
    
    cobrancas.forEach(c => {
      const mes = c.mes_referencia?.substring(0, 7);
      if (!mes) return;
      
      if (!byMonth.has(mes)) byMonth.set(mes, { vencido: 0, recuperado: 0 });
      const m = byMonth.get(mes)!;
      
      if (c.cobranca_status === 'Vencido') m.vencido += c.valor_cobranca || 0;
      if (c.cobranca_status === 'Pago' && c.data_pagamento && c.data_vencimento && new Date(c.data_pagamento) > new Date(c.data_vencimento)) {
        m.recuperado += c.valor_pago || 0;
      }
    });
    
    return Array.from(byMonth.entries())
      .map(([mes, data]) => ({ mes: mes.slice(5), ...data }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12);
  }, [cobrancas]);

  // Fila de Cobrança (sem duplicidade)
  const filaCobranca = useMemo(() => {
    const clientesMap = new Map<string, any>();
    
    cobrancas
      .filter(c => c.cobranca_status === 'Em Aberto' || c.cobranca_status === 'Vencido')
      .forEach(c => {
        const clienteId = String(c.cliente_id);
        if (!clientesMap.has(clienteId)) {
          clientesMap.set(clienteId, {
            cliente_id: c.cliente_id,
            cliente_nome: c.cliente_nome,
            plano: c.plano_nome,
            cidade: c.cliente_cidade,
            cobranca_status: c.cobranca_status,
            data_vencimento: c.data_vencimento,
            valor_total: c.valor_cobranca || 0,
            metodo_cobranca: c.metodo_cobranca,
            dias_atraso: c.dias_atraso || 0,
            inadimplencia_bucket: c.inadimplencia_bucket,
            acao_1: c.acao_recomendada_1,
            acao_2: c.acao_recomendada_2,
            acao_3: c.acao_recomendada_3,
          });
        } else {
          const cliente = clientesMap.get(clienteId)!;
          cliente.valor_total += c.valor_cobranca || 0;
          if ((c.dias_atraso || 0) > cliente.dias_atraso) {
            cliente.dias_atraso = c.dias_atraso;
            cliente.cobranca_status = c.cobranca_status;
          }
        }
      });

    return Array.from(clientesMap.values())
      .filter(c => !completados.has(String(c.cliente_id)))
      .sort((a, b) => b.valor_total - a.valor_total)
      .slice(0, 50);
  }, [cobrancas, completados]);

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
  const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#991b1b'];

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
              <CreditCard className="h-8 w-8 text-red-500" />
              Financeiro (Inadimplência)
            </h1>
            <p className="text-muted-foreground mt-1">Gestão de cobranças e recuperação de crédito</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Cobranças Abertas", value: kpis.qtdAberto, color: "text-orange-500" },
              { label: "Cobranças Vencidas", value: kpis.qtdVencido, color: "text-red-500" },
              { label: "R$ em Aberto", value: formatCurrency(kpis.valorAberto), color: "text-orange-500" },
              { label: "R$ Vencido", value: formatCurrency(kpis.valorVencido), color: "text-red-500" },
              { label: "R$ Recuperado", value: formatCurrency(kpis.recuperacao), color: "text-green-500" },
              { label: "Taxa Recuperação", value: `${kpis.taxaRecuperacao.toFixed(1)}%`, color: "text-green-500" },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase">{k.label}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Aging */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Aging (dias de atraso)
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Distribuição do valor vencido por faixas de dias de atraso.</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aging}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                      <RechartsTooltip 
                        formatter={(v: number, name: string) => [name === 'valor' ? formatCurrency(v) : v, name === 'valor' ? 'Valor' : 'Qtd']} 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="valor" radius={4}>
                        {aging.map((_, i) => (
                          <Cell key={i} fill={COLORS[i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1 text-xs">
                  {aging.map((a, i) => (
                    <div key={a.name} className="text-center">
                      <div className="font-bold">{a.count}</div>
                      <div className="text-muted-foreground">cobranças</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Eficácia por Método */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Eficácia por Método
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Taxa de pagamento por método de cobrança utilizado.</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eficaciaMetodo} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                      <RechartsTooltip formatter={(v: number) => `${v}%`} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="taxa" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Inadimplência por Dimensão */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Vencido por {dimension === 'plano' ? 'Plano' : dimension === 'cidade' ? 'Cidade' : 'Bairro'}</CardTitle>
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
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={inadByDimension} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                      <RechartsTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="valor" fill="#ef4444" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Série Mensal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolução Mensal: Vencido vs Recuperado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serieMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <RechartsTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Line type="monotone" dataKey="vencido" name="Vencido" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="recuperado" name="Recuperado" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Fila de Cobrança */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Fila de Cobrança Inteligente
                <Badge variant="outline">{filaCobranca.length} clientes</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Atraso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filaCobranca.map((c, i) => (
                      <TableRow key={`${c.cliente_id}-${i}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.cliente_nome}</p>
                            <p className="text-xs text-muted-foreground">{c.cidade}</p>
                          </div>
                        </TableCell>
                        <TableCell>{c.plano}</TableCell>
                        <TableCell>
                          <Badge variant={c.cobranca_status === 'Vencido' ? "destructive" : "secondary"}>
                            {c.cobranca_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-red-500">{formatCurrency(c.valor_total)}</TableCell>
                        <TableCell>{c.metodo_cobranca}</TableCell>
                        <TableCell className={c.dias_atraso > 30 ? 'text-red-500 font-bold' : ''}>{c.dias_atraso}d</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleAction(c, 'PIX copia/cola')}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>PIX copia/cola</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleAction(c, 'Negociação')}>
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Negociação</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleAction(c, 'Bloqueio parcial')}>
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Bloqueio parcial</TooltipContent>
                            </Tooltip>
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
        </div>
      </main>
    </div>
  );
};

export default InadimplenciaPage;
