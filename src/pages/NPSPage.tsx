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
import { Star, ThumbsUp, Minus, ThumbsDown, MessageSquare, Phone } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

const NPSPage = () => {
  const { eventos } = useEventos();

  const npsEventos = useMemo(() => eventos.filter(e => e.event_type === 'NPS' && e.nps_score !== null), [eventos]);

  const kpis = useMemo(() => {
    const promotores = npsEventos.filter(e => e.nps_score! >= 9).length;
    const neutros = npsEventos.filter(e => e.nps_score! >= 7 && e.nps_score! <= 8).length;
    const detratores = npsEventos.filter(e => e.nps_score! <= 6).length;
    const total = promotores + neutros + detratores;
    const nps = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0;

    return { nps, promotores, neutros, detratores, total };
  }, [npsEventos]);

  // Detratores com detalhes
  const detratores = useMemo(() => {
    return npsEventos
      .filter(e => e.nps_score! <= 6)
      .map(e => ({
        cliente_id: e.cliente_id,
        cliente_nome: e.cliente_nome,
        nps_score: e.nps_score,
        nps_comment: e.nps_comment,
        churn_risk_bucket: e.churn_risk_bucket,
        alerta_tipo: e.alerta_tipo,
      }))
      .slice(0, 50);
  }, [npsEventos]);

  const pieData = [
    { name: 'Promotores (9-10)', value: kpis.promotores, color: '#22c55e' },
    { name: 'Neutros (7-8)', value: kpis.neutros, color: '#eab308' },
    { name: 'Detratores (0-6)', value: kpis.detratores, color: '#ef4444' },
  ];

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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              { label: "Total Respostas", value: kpis.total, icon: MessageSquare },
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
                <CardTitle>Distribuição NPS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detratores */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ThumbsDown className="h-5 w-5 text-red-500" />
                  Detratores (Ação Necessária)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-72 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Comentário</TableHead>
                        <TableHead>Risco</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detratores.map((d, i) => (
                        <TableRow key={`${d.cliente_id}-${i}`}>
                          <TableCell className="font-medium">{d.cliente_nome}</TableCell>
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
                              {d.churn_risk_bucket}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" title="Ligar"><Phone className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NPSPage;
