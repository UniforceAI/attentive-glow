import { useMemo } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from "recharts";
import { Evento } from "@/types/evento";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContractEvolutionChartProps {
  eventos: Evento[];
}

export function ContractEvolutionChart({ eventos }: ContractEvolutionChartProps) {
  const chartData = useMemo(() => {
    const monthlyData = new Map<string, { novos: number; churn: number; ativos: number }>();
    
    // Group by month and track new contracts and churns
    const serviceFirstSeen = new Map<number, string>();
    const serviceLastStatus = new Map<number, { month: string; status: string }>();
    
    // Sort eventos by date
    const sortedEventos = [...eventos]
      .filter(e => e.servico_id && e.event_datetime)
      .sort((a, b) => new Date(a.event_datetime).getTime() - new Date(b.event_datetime).getTime());

    sortedEventos.forEach(e => {
      const monthKey = format(startOfMonth(parseISO(e.event_datetime)), "yyyy-MM");
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { novos: 0, churn: 0, ativos: 0 });
      }
      
      const serviceId = e.servico_id!;
      
      // Track first seen (new contract)
      if (!serviceFirstSeen.has(serviceId)) {
        serviceFirstSeen.set(serviceId, monthKey);
        monthlyData.get(monthKey)!.novos++;
      }
      
      // Track status changes for churn
      const lastStatus = serviceLastStatus.get(serviceId);
      if (lastStatus && lastStatus.status !== 'Cancelado' && e.servico_status === 'Cancelado') {
        monthlyData.get(monthKey)!.churn++;
      }
      
      serviceLastStatus.set(serviceId, { month: monthKey, status: e.servico_status || '' });
    });

    // Calculate active count and growth percentage
    let cumulativeActive = 0;
    const result = Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, data], index, arr) => {
        cumulativeActive += data.novos - data.churn;
        
        const prevActive = index > 0 
          ? arr.slice(0, index).reduce((sum, [, d]) => sum + d.novos - d.churn, 0)
          : cumulativeActive;
        
        const growth = prevActive > 0 
          ? ((data.novos - data.churn) / prevActive) * 100 
          : 0;

        return {
          month: format(parseISO(month + "-01"), "MMM/yy", { locale: ptBR }),
          novos: data.novos,
          churn: -data.churn, // Negative for visual effect
          ativos: cumulativeActive,
          crescimento: growth,
          netChange: data.novos - data.churn,
        };
      });

    return result;
  }, [eventos]);

  const totalNovos = chartData.reduce((sum, d) => sum + d.novos, 0);
  const totalChurn = chartData.reduce((sum, d) => sum + Math.abs(d.churn), 0);
  const avgGrowth = chartData.length > 0 
    ? chartData.reduce((sum, d) => sum + d.crescimento, 0) / chartData.length 
    : 0;

  return (
    <ChartCard 
      title="Evolução Mensal de Contratos" 
      subtitle={`+${totalNovos} novos | -${totalChurn} churns | ${avgGrowth > 0 ? '+' : ''}${avgGrowth.toFixed(1)}% média`}
      height="h-[320px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" vertical={false} />
          <XAxis 
            dataKey="month" 
            tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
            axisLine={{ stroke: 'hsl(220, 20%, 18%)' }}
            tickLine={false}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value.toFixed(0)}%`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(223, 47%, 10%)', 
              border: '1px solid hsl(220, 20%, 25%)',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(210, 40%, 98%)', fontWeight: 600, marginBottom: 8 }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                novos: 'Novos Clientes',
                churn: 'Churn',
                crescimento: 'Crescimento',
              };
              if (name === 'crescimento') {
                return [`${value.toFixed(1)}%`, labels[name]];
              }
              return [Math.abs(value), labels[name] || name];
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                novos: 'Novos',
                churn: 'Churn',
                crescimento: '% Crescimento'
              };
              return <span style={{ color: 'hsl(215, 20%, 65%)', fontSize: 12 }}>{labels[value] || value}</span>;
            }}
          />
          <ReferenceLine yAxisId="left" y={0} stroke="hsl(220, 20%, 30%)" />
          <Bar yAxisId="left" dataKey="novos" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="churn" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill="hsl(0, 72%, 51%)" />
            ))}
          </Bar>
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="crescimento" 
            stroke="hsl(280, 80%, 65%)" 
            strokeWidth={2}
            dot={{ fill: 'hsl(280, 80%, 65%)', strokeWidth: 0, r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}