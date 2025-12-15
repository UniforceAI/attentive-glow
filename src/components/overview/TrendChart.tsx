import { useMemo } from "react";
import { Evento } from "@/types/evento";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface TrendChartProps {
  eventos: Evento[];
}

export function TrendChart({ eventos }: TrendChartProps) {
  const chartData = useMemo(() => {
    const mesesMap = new Map<string, {
      mes: string;
      churnScoreMedio: number[];
      inadimplencia: number;
    }>();

    eventos.forEach(e => {
      if (!e.mes_referencia) return;
      
      const mes = e.mes_referencia.substring(0, 7); // YYYY-MM
      
      if (!mesesMap.has(mes)) {
        mesesMap.set(mes, {
          mes,
          churnScoreMedio: [],
          inadimplencia: 0,
        });
      }

      const mesData = mesesMap.get(mes)!;
      
      if (e.churn_risk_score != null) {
        mesData.churnScoreMedio.push(e.churn_risk_score);
      }
      
      if (e.event_type === 'COBRANCA' && (e.cobranca_status === 'Em Aberto' || e.cobranca_status === 'Vencido')) {
        mesData.inadimplencia += e.valor_cobranca || 0;
      }
    });

    return Array.from(mesesMap.values())
      .map(m => ({
        mes: m.mes,
        churnScore: m.churnScoreMedio.length > 0 
          ? Math.round(m.churnScoreMedio.reduce((a, b) => a + b, 0) / m.churnScoreMedio.length)
          : 0,
        inadimplencia: Math.round(m.inadimplencia / 1000), // Em milhares
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12); // Últimos 12 meses
  }, [eventos]);

  const formatMes = (mes: string) => {
    const [year, month] = mes.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(month) - 1]}/${year.slice(2)}`;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendência Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Dados insuficientes para exibir tendência
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tendência Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="mes" 
                tickFormatter={formatMes}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                label={{ value: 'Score', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{ value: 'R$ (mil)', angle: 90, position: 'insideRight', fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'inadimplencia') return [`R$ ${value}k`, 'Inadimplência'];
                  return [value, 'Score Churn'];
                }}
                labelFormatter={formatMes}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="churnScore" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Score Churn"
                dot={{ r: 4 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="inadimplencia" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                name="Inadimplência (R$ mil)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
