import { useMemo, useState } from "react";
import { useDataLoader } from "@/hooks/useDataLoader";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Headphones, Clock, RefreshCw, CheckCircle, Users, ChevronLeft, ChevronRight, Info, Phone, Mail, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { useToast } from "@/hooks/use-toast";

type DimensionType = 'plano' | 'cidade' | 'bairro';

const SuportePage = () => {
  const { allEventos: eventos } = useDataLoader();
  const { toast } = useToast();
  const [dimension, setDimension] = useState<DimensionType>('plano');

  const atendimentos = useMemo(() => eventos.filter(e => e.event_type === 'ATENDIMENTO'), [eventos]);

  const kpis = useMemo(() => {
    const total = atendimentos.length;
    const n1 = atendimentos.filter(a => a.setor?.includes('Suporte') || a.setor?.includes('N1')).length;
    const n2 = atendimentos.filter(a => a.setor?.includes('N2')).length;
    const financeiro = atendimentos.filter(a => a.setor?.includes('Financeiro')).length;
    const retencao = atendimentos.filter(a => a.setor?.includes('Retenção')).length;
    const tempos = atendimentos.filter(a => a.tempo_atendimento_min).map(a => a.tempo_atendimento_min!);
    const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
    const fcr = atendimentos.filter(a => a.resolvido_primeiro_contato).length;
    const reincidencia = atendimentos.filter(a => a.reincidente_30d).length;

    return {
      total,
      n1,
      n2,
      financeiro,
      retencao,
      tempoMedio,
      fcr: total > 0 ? Math.round((fcr / total) * 100) : 0,
      reincidencia: total > 0 ? Math.round((reincidencia / total) * 100) : 0,
    };
  }, [atendimentos]);

  // Série mensal
  const serieMensal = useMemo(() => {
    const byMonth = new Map<string, number>();
    atendimentos.forEach(a => {
      const mes = a.mes_referencia?.substring(0, 7);
      if (!mes) return;
      byMonth.set(mes, (byMonth.get(mes) || 0) + 1);
    });
    return Array.from(byMonth.entries())
      .map(([mes, count]) => ({ mes: mes.slice(5), count }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12);
  }, [atendimentos]);

  // Top motivos
  const topMotivos = useMemo(() => {
    const motivos = new Map<string, number>();
    atendimentos.forEach(a => {
      const m = a.motivo_contato || 'Outros';
      motivos.set(m, (motivos.get(m) || 0) + 1);
    });
    return Array.from(motivos.entries())
      .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [atendimentos]);

  // Reincidência por dimensão
  const reincidenciaByDim = useMemo(() => {
    const dimensionKey = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
    const byDim = new Map<string, { total: number; reincidentes: number }>();
    
    atendimentos.forEach(a => {
      const dim = (a as any)[dimensionKey] || 'Outros';
      if (!byDim.has(dim)) byDim.set(dim, { total: 0, reincidentes: 0 });
      const d = byDim.get(dim)!;
      d.total++;
      if (a.reincidente_30d) d.reincidentes++;
    });
    
    return Array.from(byDim.entries())
      .map(([name, data]) => ({
        name: name.length > 15 ? name.slice(0, 15) + '...' : name,
        taxa: data.total > 0 ? (data.reincidentes / data.total * 100) : 0,
        count: data.reincidentes,
      }))
      .sort((a, b) => b.taxa - a.taxa)
      .slice(0, 8);
  }, [atendimentos, dimension]);

  // Clientes reincidentes
  const clientesReincidentes = useMemo(() => {
    const map = new Map<string, any>();
    atendimentos.filter(a => a.reincidente_30d).forEach(a => {
      const id = String(a.cliente_id);
      if (!map.has(id)) {
        map.set(id, {
          cliente_id: a.cliente_id,
          cliente_nome: a.cliente_nome,
          plano: a.plano_nome,
          cidade: a.cliente_cidade,
          motivo: a.motivo_contato,
          count: 0,
        });
      }
      map.get(id)!.count++;
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }, [atendimentos]);

  // Clientes com mais atendimentos
  const topClientes = useMemo(() => {
    const clientes = new Map<string, { nome: string; count: number; plano: string }>();
    atendimentos.forEach(a => {
      const clienteId = String(a.cliente_id);
      if (!clientes.has(clienteId)) {
        clientes.set(clienteId, { nome: a.cliente_nome, count: 0, plano: a.plano_nome || '' });
      }
      clientes.get(clienteId)!.count++;
    });
    return Array.from(clientes.entries())
      .map(([id, data]) => ({ cliente_id: id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [atendimentos]);

  // Distribuição N1 vs N2
  const distribuicao = [
    { name: 'N1/Suporte', value: kpis.n1, color: '#3b82f6' },
    { name: 'N2', value: kpis.n2, color: '#8b5cf6' },
    { name: 'Financeiro', value: kpis.financeiro, color: '#ef4444' },
    { name: 'Retenção', value: kpis.retencao, color: '#22c55e' },
    { name: 'Outros', value: kpis.total - kpis.n1 - kpis.n2 - kpis.financeiro - kpis.retencao, color: '#6b7280' },
  ].filter(d => d.value > 0);

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
              <Headphones className="h-8 w-8 text-purple-500" />
              Suporte
            </h1>
            <p className="text-muted-foreground mt-1">Volume, reincidência e eficiência do atendimento</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { label: "Total", value: kpis.total, icon: Headphones },
              { label: "N1", value: kpis.n1, icon: Users },
              { label: "N2", value: kpis.n2, icon: Users },
              { label: "Financeiro", value: kpis.financeiro, icon: Users },
              { label: "Retenção", value: kpis.retencao, icon: Users },
              { label: "Tempo Médio", value: `${kpis.tempoMedio.toFixed(0)}min`, icon: Clock },
              { label: "FCR", value: `${kpis.fcr}%`, icon: CheckCircle, color: "text-green-500" },
              { label: "Reincidência", value: `${kpis.reincidencia}%`, icon: RefreshCw, color: "text-orange-500" },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <k.icon className={`h-3.5 w-3.5 ${k.color || 'text-muted-foreground'}`} />
                    <p className="text-[10px] text-muted-foreground uppercase">{k.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${k.color || ''}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Série Mensal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Volume Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={serieMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Motivos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Motivos de Contato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topMotivos} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Distribuição N1 vs N2 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Setor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribuicao}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {distribuicao.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reincidência por Dimensão */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-orange-500" />
                    Reincidência por {dimension === 'plano' ? 'Plano' : dimension === 'cidade' ? 'Cidade' : 'Bairro'}
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
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reincidenciaByDim}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                      <RechartsTooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="taxa" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Clientes por Volume */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clientes com Mais Atendimentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {topClientes.map((c, i) => (
                    <div key={c.cliente_id} className="p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant="outline" className="text-[10px] px-1.5">{i + 1}º</Badge>
                        <span className="font-bold text-sm">{c.count}</span>
                      </div>
                      <p className="text-xs truncate">{c.nome}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.plano}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Clientes Reincidentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Clientes Reincidentes (30d)
                <Badge variant="outline">{clientesReincidentes.length} clientes</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-72 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Tickets</TableHead>
                      <TableHead>Último Motivo</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesReincidentes.map((c, i) => (
                      <TableRow key={`${c.cliente_id}-${i}`}>
                        <TableCell className="font-medium">{c.cliente_nome}</TableCell>
                        <TableCell>{c.plano}</TableCell>
                        <TableCell>{c.cidade}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{c.count}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-32 truncate">{c.motivo || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Phone className="h-4 w-4" />
                          </Button>
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

export default SuportePage;
