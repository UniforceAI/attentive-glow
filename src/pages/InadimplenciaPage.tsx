import { useMemo } from "react";
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
import { CreditCard, Clock, AlertTriangle, Send, FileText, Ban } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

const InadimplenciaPage = () => {
  const { eventos } = useEventos();

  const cobrancas = useMemo(() => eventos.filter(e => e.event_type === 'COBRANCA'), [eventos]);

  // KPIs
  const kpis = useMemo(() => {
    const emAberto = cobrancas.filter(c => c.cobranca_status === 'Em Aberto');
    const vencidas = cobrancas.filter(c => c.cobranca_status === 'Vencido');
    return {
      qtdAberto: emAberto.length,
      qtdVencido: vencidas.length,
      valorAberto: emAberto.reduce((s, c) => s + (c.valor_cobranca || 0), 0),
      valorVencido: vencidas.reduce((s, c) => s + (c.valor_cobranca || 0), 0),
    };
  }, [cobrancas]);

  // Aging
  const aging = useMemo(() => {
    const buckets = { "1-7": 0, "8-15": 0, "16-30": 0, "31-60": 0, "60+": 0 };
    cobrancas.filter(c => c.cobranca_status === 'Vencido' || c.cobranca_status === 'Em Aberto').forEach(c => {
      const dias = c.dias_atraso || 0;
      if (dias <= 7) buckets["1-7"] += c.valor_cobranca || 0;
      else if (dias <= 15) buckets["8-15"] += c.valor_cobranca || 0;
      else if (dias <= 30) buckets["16-30"] += c.valor_cobranca || 0;
      else if (dias <= 60) buckets["31-60"] += c.valor_cobranca || 0;
      else buckets["60+"] += c.valor_cobranca || 0;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [cobrancas]);

  // Fila de Cobrança
  const filaCobranca = useMemo(() => {
    return cobrancas
      .filter(c => c.cobranca_status === 'Em Aberto' || c.cobranca_status === 'Vencido')
      .map(c => ({
        cliente_id: c.cliente_id,
        cliente_nome: c.cliente_nome,
        cobranca_status: c.cobranca_status,
        data_vencimento: c.data_vencimento,
        valor_cobranca: c.valor_cobranca,
        metodo_cobranca: c.metodo_cobranca,
        dias_atraso: c.dias_atraso,
        inadimplencia_bucket: c.inadimplencia_bucket,
        acao: c.acao_recomendada_1,
      }))
      .sort((a, b) => (b.valor_cobranca || 0) - (a.valor_cobranca || 0))
      .slice(0, 50);
  }, [cobrancas]);

  // Eficácia por método
  const eficaciaMetodo = useMemo(() => {
    const metodos = new Map<string, { total: number; pagos: number }>();
    cobrancas.forEach(c => {
      const m = c.metodo_cobranca || 'Outro';
      if (!metodos.has(m)) metodos.set(m, { total: 0, pagos: 0 });
      metodos.get(m)!.total++;
      if (c.cobranca_status === 'Pago') metodos.get(m)!.pagos++;
    });
    return Array.from(metodos.entries()).map(([name, { total, pagos }]) => ({
      name,
      taxa: total > 0 ? Math.round((pagos / total) * 100) : 0,
      total,
    }));
  }, [cobrancas]);

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
  const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#991b1b'];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-red-500" />
              Inadimplência
            </h1>
            <p className="text-muted-foreground mt-1">Gestão de cobranças e recuperação de crédito</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Cobranças em Aberto", value: kpis.qtdAberto, color: "text-orange-500" },
              { label: "Cobranças Vencidas", value: kpis.qtdVencido, color: "text-red-500" },
              { label: "R$ em Aberto", value: formatCurrency(kpis.valorAberto), color: "text-orange-500" },
              { label: "R$ Vencido", value: formatCurrency(kpis.valorVencido), color: "text-red-500" },
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aging}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" radius={4}>
                        {aging.map((_, i) => (
                          <Cell key={i} fill={COLORS[i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Eficácia por Método */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Eficácia por Método de Cobrança</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eficaciaMetodo} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="taxa" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fila de Cobrança */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Fila de Cobrança Inteligente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Atraso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filaCobranca.map((c, i) => (
                      <TableRow key={`${c.cliente_id}-${i}`}>
                        <TableCell className="font-medium">{c.cliente_nome}</TableCell>
                        <TableCell>
                          <Badge variant={c.cobranca_status === 'Vencido' ? "destructive" : "secondary"}>
                            {c.cobranca_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{c.data_vencimento}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(c.valor_cobranca || 0)}</TableCell>
                        <TableCell>{c.metodo_cobranca}</TableCell>
                        <TableCell>{c.dias_atraso ? `${c.dias_atraso}d` : '-'}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" title="Enviar 2ª via"><Send className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" title="Negociar"><FileText className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" title="Bloquear"><Ban className="h-4 w-4" /></Button>
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
