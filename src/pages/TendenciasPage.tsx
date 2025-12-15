import { useMemo } from "react";
import { useEventos } from "@/hooks/useEventos";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

const TendenciasPage = () => {
  const { eventos } = useEventos();

  // Tendência de R$ em risco por mês
  const tendenciaRisco = useMemo(() => {
    const meses = new Map<string, number>();
    eventos.forEach(e => {
      if (!e.mes_referencia) return;
      const mes = e.mes_referencia.substring(0, 7);
      if ((e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') && e.valor_mensalidade) {
        meses.set(mes, (meses.get(mes) || 0) + e.valor_mensalidade);
      }
    });
    return Array.from(meses.entries())
      .map(([mes, valor]) => ({ mes, valor: Math.round(valor / 1000) }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12);
  }, [eventos]);

  // Tendência de inadimplência por mês
  const tendenciaInad = useMemo(() => {
    const meses = new Map<string, number>();
    eventos.filter(e => e.event_type === 'COBRANCA').forEach(e => {
      if (!e.mes_referencia) return;
      const mes = e.mes_referencia.substring(0, 7);
      if ((e.cobranca_status === 'Em Aberto' || e.cobranca_status === 'Vencido') && e.valor_cobranca) {
        meses.set(mes, (meses.get(mes) || 0) + e.valor_cobranca);
      }
    });
    return Array.from(meses.entries())
      .map(([mes, valor]) => ({ mes, valor: Math.round(valor / 1000) }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12);
  }, [eventos]);

  // FCR e Reincidência por mês
  const tendenciaAtendimento = useMemo(() => {
    const meses = new Map<string, { total: number; fcr: number; reincidencia: number }>();
    eventos.filter(e => e.event_type === 'ATENDIMENTO').forEach(e => {
      if (!e.mes_referencia) return;
      const mes = e.mes_referencia.substring(0, 7);
      if (!meses.has(mes)) meses.set(mes, { total: 0, fcr: 0, reincidencia: 0 });
      const m = meses.get(mes)!;
      m.total++;
      if (e.resolvido_primeiro_contato) m.fcr++;
      if (e.reincidente_30d) m.reincidencia++;
    });
    return Array.from(meses.entries())
      .map(([mes, data]) => ({
        mes,
        FCR: data.total > 0 ? Math.round((data.fcr / data.total) * 100) : 0,
        Reincidência: data.total > 0 ? Math.round((data.reincidencia / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12);
  }, [eventos]);

  // Coorte por plano
  const coortePlano = useMemo(() => {
    const planos = new Map<string, { total: number; risco: number; inad: number }>();
    const clientesPorPlano = new Map<string, Set<number>>();

    eventos.forEach(e => {
      const plano = e.plano_nome || 'Outros';
      if (!planos.has(plano)) {
        planos.set(plano, { total: 0, risco: 0, inad: 0 });
        clientesPorPlano.set(plano, new Set());
      }
      
      const p = planos.get(plano)!;
      const clientes = clientesPorPlano.get(plano)!;
      
      if (!clientes.has(e.cliente_id)) {
        clientes.add(e.cliente_id);
        p.total++;
        if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') p.risco++;
      }

      if (e.event_type === 'COBRANCA' && (e.cobranca_status === 'Em Aberto' || e.cobranca_status === 'Vencido')) {
        p.inad += e.valor_cobranca || 0;
      }
    });

    return Array.from(planos.entries())
      .map(([plano, data]) => ({
        plano,
        riscoAlto: data.total > 0 ? Math.round((data.risco / data.total) * 100) : 0,
        inadMedia: data.total > 0 ? Math.round(data.inad / data.total) : 0,
      }))
      .filter(p => p.plano !== 'Outros')
      .sort((a, b) => b.riscoAlto - a.riscoAlto);
  }, [eventos]);

  const formatMes = (mes: string) => {
    const [year, month] = mes.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(month) - 1]}/${year.slice(2)}`;
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-emerald-500" />
              Coortes & Tendências
            </h1>
            <p className="text-muted-foreground mt-1">Análise mensal de evolução dos indicadores</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* R$ em Risco */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  Evolução R$ em Risco (Churn)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tendenciaRisco}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tickFormatter={formatMes} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => `R$${v}k`} />
                      <Tooltip formatter={(v: number) => `R$ ${v}k`} labelFormatter={formatMes} />
                      <Line type="monotone" dataKey="valor" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Inadimplência */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  Evolução Inadimplência (R$)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tendenciaInad}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tickFormatter={formatMes} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => `R$${v}k`} />
                      <Tooltip formatter={(v: number) => `R$ ${v}k`} labelFormatter={formatMes} />
                      <Line type="monotone" dataKey="valor" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FCR e Reincidência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                FCR e Reincidência por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tendenciaAtendimento}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tickFormatter={formatMes} tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} labelFormatter={formatMes} />
                    <Legend />
                    <Line type="monotone" dataKey="FCR" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Reincidência" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Coorte por Plano */}
          <Card>
            <CardHeader>
              <CardTitle>Coorte por Plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coortePlano}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="plano" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tickFormatter={v => `${v}%`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `R$${v}`} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="riscoAlto" name="% Risco Alto/Crítico" fill="#f97316" radius={4} />
                    <Bar yAxisId="right" dataKey="inadMedia" name="Inadimpl. Média (R$)" fill="#ef4444" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default TendenciasPage;
