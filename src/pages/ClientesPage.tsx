import { useMemo, useState } from "react";
import { useDataLoader } from "@/hooks/useDataLoader";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Search, Eye, PlayCircle, Plus, Target, DollarSign, ChevronLeft, ChevronRight, Info, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";

type DimensionType = 'plano' | 'cidade' | 'bairro';

const ClientesPage = () => {
  const { allEventos: eventos } = useDataLoader();
  const [busca, setBusca] = useState("");
  const [bucketChurn, setBucketChurn] = useState("todos");
  const [statusServico, setStatusServico] = useState("todos");
  const [dimension, setDimension] = useState<DimensionType>('plano');
  const [cohortDimension, setCohortDimension] = useState<DimensionType>('plano');

  // Agregar clientes
  const clientes = useMemo(() => {
    const map = new Map<string, any>();

    eventos.forEach(e => {
      const clienteId = String(e.cliente_id);
      if (!map.has(clienteId)) {
        map.set(clienteId, {
          cliente_id: e.cliente_id,
          cliente_nome: e.cliente_nome,
          cliente_documento: e.cliente_documento,
          cliente_celular: e.cliente_celular,
          cliente_cidade: e.cliente_cidade,
          cliente_uf: e.cliente_uf,
          plano_nome: e.plano_nome,
          servico_status: e.servico_status,
          churn_risk_score: e.churn_risk_score,
          churn_risk_bucket: e.churn_risk_bucket,
          valor_mensalidade: e.valor_mensalidade || 0,
          ltv_meses: 12, // Estimativa padrão
          ltv_reais: (e.valor_mensalidade || 0) * 12,
          inadimplencia_total: 0,
          atendimentos_30d: 0,
          ultimo_evento: e.event_datetime,
        });
      }

      const c = map.get(clienteId)!;
      if (new Date(e.event_datetime) > new Date(c.ultimo_evento)) {
        c.ultimo_evento = e.event_datetime;
        c.churn_risk_score = e.churn_risk_score ?? c.churn_risk_score;
        c.churn_risk_bucket = e.churn_risk_bucket ?? c.churn_risk_bucket;
        c.servico_status = e.servico_status ?? c.servico_status;
      }

      if (e.event_type === 'COBRANCA' && (e.cobranca_status === 'Em Aberto' || e.cobranca_status === 'Vencido')) {
        c.inadimplencia_total += e.valor_cobranca || 0;
      }

      if (e.event_type === 'ATENDIMENTO') {
        c.atendimentos_30d++;
      }
    });

    return Array.from(map.values());
  }, [eventos]);

  // KPIs de LTV
  const kpis = useMemo(() => {
    const meses = clientes.map(c => c.ltv_meses);
    const reais = clientes.map(c => c.ltv_reais);
    const emRisco = clientes.filter(c => c.churn_risk_bucket === 'Alto' || c.churn_risk_bucket === 'Crítico');
    
    return {
      ltvMesesMedio: meses.length > 0 ? meses.reduce((a, b) => a + b, 0) / meses.length : 0,
      ltvReaisMedio: reais.length > 0 ? reais.reduce((a, b) => a + b, 0) / reais.length : 0,
      ltvEmRisco: emRisco.reduce((s, c) => s + c.ltv_reais, 0),
      totalClientes: clientes.length,
    };
  }, [clientes]);

  // LTV por dimensão
  const ltvByDimension = useMemo(() => {
    const dimensionKey = dimension === 'plano' ? 'plano_nome' : dimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
    const byDim = new Map<string, { total: number; ltv: number; count: number }>();
    
    clientes.forEach(c => {
      const dim = (c as any)[dimensionKey] || 'Outros';
      if (!byDim.has(dim)) byDim.set(dim, { total: 0, ltv: 0, count: 0 });
      const d = byDim.get(dim)!;
      d.count++;
      d.ltv += c.ltv_reais;
    });
    
    return Array.from(byDim.entries())
      .map(([name, data]) => ({
        name: name.length > 15 ? name.slice(0, 15) + '...' : name,
        ltvMedio: data.count > 0 ? data.ltv / data.count : 0,
        count: data.count,
      }))
      .sort((a, b) => b.ltvMedio - a.ltvMedio)
      .slice(0, 8);
  }, [clientes, dimension]);

  // Cohort de churn por dimensão
  const cohortData = useMemo(() => {
    const dimensionKey = cohortDimension === 'plano' ? 'plano_nome' : cohortDimension === 'cidade' ? 'cliente_cidade' : 'cliente_bairro';
    const byDim = new Map<string, { total: number; risco: number }>();
    
    clientes.forEach(c => {
      const dim = (c as any)[dimensionKey] || 'Outros';
      if (!byDim.has(dim)) byDim.set(dim, { total: 0, risco: 0 });
      const d = byDim.get(dim)!;
      d.total++;
      if (c.churn_risk_bucket === 'Alto' || c.churn_risk_bucket === 'Crítico') {
        d.risco++;
      }
    });
    
    return Array.from(byDim.entries())
      .map(([name, data]) => ({
        name: name.length > 12 ? name.slice(0, 12) + '...' : name,
        taxa: data.total > 0 ? (data.risco / data.total * 100) : 0,
        count: data.risco,
      }))
      .sort((a, b) => b.taxa - a.taxa)
      .slice(0, 10);
  }, [clientes, cohortDimension]);

  // Distribuição por plano
  const distribuicaoPlano = useMemo(() => {
    const byPlano = new Map<string, number>();
    clientes.forEach(c => {
      const plano = c.plano_nome || 'Outros';
      byPlano.set(plano, (byPlano.get(plano) || 0) + 1);
    });
    return Array.from(byPlano.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [clientes]);

  // Filtrar clientes
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => {
      if (busca && !c.cliente_nome.toLowerCase().includes(busca.toLowerCase()) &&
          !String(c.cliente_id).includes(busca) &&
          !c.cliente_documento?.includes(busca) &&
          !c.cliente_celular?.includes(busca)) {
        return false;
      }
      if (bucketChurn !== "todos" && c.churn_risk_bucket !== bucketChurn) return false;
      if (statusServico !== "todos" && c.servico_status !== statusServico) return false;
      return true;
    }).slice(0, 100);
  }, [clientes, busca, bucketChurn, statusServico]);

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
  const getBucketColor = (b: string | null) => {
    if (b === 'Crítico') return "bg-red-500/10 text-red-500";
    if (b === 'Alto') return "bg-orange-500/10 text-orange-500";
    if (b === 'Médio') return "bg-yellow-500/10 text-yellow-500";
    return "bg-green-500/10 text-green-500";
  };

  const cycleDimension = (dim: 'ltv' | 'cohort', dir: 'prev' | 'next') => {
    const dims: DimensionType[] = ['plano', 'cidade', 'bairro'];
    const current = dim === 'ltv' ? dimension : cohortDimension;
    const idx = dims.indexOf(current);
    const newIdx = dir === 'next' ? (idx + 1) % 3 : (idx - 1 + 3) % 3;
    if (dim === 'ltv') setDimension(dims[newIdx]);
    else setCohortDimension(dims[newIdx]);
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#6366f1', '#ec4899'];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              Clientes & Cohorts
            </h1>
            <p className="text-muted-foreground mt-1">LTV, cohorts de churn e segmentação</p>
          </div>

          {/* KPIs de LTV */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">LTV Médio (meses)</span>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Tempo médio estimado de permanência do cliente.</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold">{kpis.ltvMesesMedio.toFixed(1)} meses</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">LTV Médio (R$)</span>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Valor total estimado que cada cliente gera durante seu ciclo de vida.</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(kpis.ltvReaisMedio)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">LTV em Risco</span>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Soma do LTV de clientes com risco Alto/Crítico de churn.</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-red-500">{formatCurrency(kpis.ltvEmRisco)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Total Clientes</span>
                </div>
                <p className="text-2xl font-bold">{kpis.totalClientes}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LTV por Dimensão */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">LTV Médio por {dimension === 'plano' ? 'Plano' : dimension === 'cidade' ? 'Cidade' : 'Bairro'}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cycleDimension('ltv', 'prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cycleDimension('ltv', 'next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ltvByDimension} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                      <RechartsTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="ltvMedio" fill="#3b82f6" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Cohort Churn por Dimensão */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Cohort Churn por {cohortDimension === 'plano' ? 'Plano' : cohortDimension === 'cidade' ? 'Cidade' : 'Bairro'}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cycleDimension('cohort', 'prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cycleDimension('cohort', 'next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cohortData}>
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

            {/* Distribuição por Plano */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Plano</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribuicaoPlano} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="count" radius={4}>
                        {distribuicaoPlano.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, ID, documento ou telefone..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={bucketChurn} onValueChange={setBucketChurn}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Risco Churn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Crítico">Crítico</SelectItem>
                    <SelectItem value="Alto">Alto</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusServico} onValueChange={setStatusServico}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Liberado">Liberado</SelectItem>
                    <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                    <SelectItem value="Suspenso">Suspenso</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle>{clientesFiltrados.length} clientes encontrados</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>LTV</TableHead>
                      <TableHead>Risco Churn</TableHead>
                      <TableHead>Inadimpl.</TableHead>
                      <TableHead>Tickets 30d</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesFiltrados.map(c => (
                      <TableRow key={c.cliente_id}>
                        <TableCell className="font-mono text-sm">{c.cliente_id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.cliente_nome}</p>
                            <p className="text-xs text-muted-foreground">{c.cliente_cidade}/{c.cliente_uf}</p>
                          </div>
                        </TableCell>
                        <TableCell>{c.plano_nome}</TableCell>
                        <TableCell>
                          <Badge variant={c.servico_status === 'Liberado' ? 'default' : 'secondary'}>
                            {c.servico_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(c.ltv_reais)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{c.churn_risk_score}</span>
                            <Badge variant="outline" className={getBucketColor(c.churn_risk_bucket)}>
                              {c.churn_risk_bucket}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className={c.inadimplencia_total > 0 ? 'text-red-500 font-medium' : ''}>
                          {formatCurrency(c.inadimplencia_total)}
                        </TableCell>
                        <TableCell>{c.atendimentos_30d}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" title="Ver 360"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" title="Playbook"><PlayCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" title="Add fila"><Plus className="h-4 w-4" /></Button>
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

export default ClientesPage;
