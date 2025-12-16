import { useMemo } from "react";
import { useEventos } from "@/hooks/useEventos";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Headphones, Clock, RefreshCw, CheckCircle, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const SuportePage = () => {
  const { eventos } = useEventos();

  const atendimentos = useMemo(() => eventos.filter(e => e.event_type === 'ATENDIMENTO'), [eventos]);

  const kpis = useMemo(() => {
    const total = atendimentos.length;
    const n1 = atendimentos.filter(a => a.setor?.includes('Suporte') || a.setor?.includes('N1')).length;
    const n2 = atendimentos.filter(a => a.setor?.includes('N2')).length;
    const tempos = atendimentos.filter(a => a.tempo_atendimento_min).map(a => a.tempo_atendimento_min!);
    const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
    const fcr = atendimentos.filter(a => a.resolvido_primeiro_contato).length;
    const reincidencia = atendimentos.filter(a => a.reincidente_30d).length;

    return {
      total,
      n1,
      n2,
      tempoMedioN1: tempoMedio,
      fcr: total > 0 ? Math.round((fcr / total) * 100) : 0,
      reincidencia: total > 0 ? Math.round((reincidencia / total) * 100) : 0,
    };
  }, [atendimentos]);

  // Top motivos
  const topMotivos = useMemo(() => {
    const motivos = new Map<string, number>();
    atendimentos.forEach(a => {
      const m = a.motivo_contato || 'Outros';
      motivos.set(m, (motivos.get(m) || 0) + 1);
    });
    return Array.from(motivos.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [atendimentos]);

  // Clientes com mais atendimentos
  const topClientes = useMemo(() => {
    const clientes = new Map<string, { nome: string; count: number }>();
    atendimentos.forEach(a => {
      const clienteId = String(a.cliente_id);
      if (!clientes.has(clienteId)) {
        clientes.set(clienteId, { nome: a.cliente_nome, count: 0 });
      }
      clientes.get(clienteId)!.count++;
    });
    return Array.from(clientes.entries())
      .map(([id, { nome, count }]) => ({ cliente_id: id, nome, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [atendimentos]);

  // Distribuição N1 vs N2
  const distribuicao = [
    { name: 'N1/Suporte', value: kpis.n1, color: '#3b82f6' },
    { name: 'N2', value: kpis.n2, color: '#8b5cf6' },
    { name: 'Outros', value: kpis.total - kpis.n1 - kpis.n2, color: '#6b7280' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <Headphones className="h-8 w-8 text-purple-500" />
              Suporte & N1
            </h1>
            <p className="text-muted-foreground mt-1">Carga, reincidência e eficiência do atendimento</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Atendimentos", value: kpis.total, icon: Headphones },
              { label: "% N1", value: `${Math.round((kpis.n1/kpis.total)*100)}%`, icon: Users },
              { label: "% N2", value: `${Math.round((kpis.n2/kpis.total)*100)}%`, icon: Users },
              { label: "Tempo Médio", value: `${kpis.tempoMedioN1.toFixed(0)}min`, icon: Clock },
              { label: "FCR", value: `${kpis.fcr}%`, icon: CheckCircle },
              { label: "Reincidência", value: `${kpis.reincidencia}%`, icon: RefreshCw },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <k.icon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground uppercase">{k.label}</p>
                  </div>
                  <p className="text-2xl font-bold">{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pareto de Motivos */}
            <Card>
              <CardHeader>
                <CardTitle>Top Motivos de Contato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topMotivos} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Distribuição N1 vs N2 */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Nível</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribuicao}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {distribuicao.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ranking de Clientes */}
          <Card>
            <CardHeader>
              <CardTitle>Clientes com Mais Atendimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {topClientes.map((c, i) => (
                  <div key={c.cliente_id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{i + 1}º</Badge>
                      <span className="font-bold">{c.count}</span>
                    </div>
                    <p className="text-sm truncate">{c.nome}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SuportePage;
