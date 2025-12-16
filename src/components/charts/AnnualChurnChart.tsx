import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { Evento } from "@/types/evento";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AnnualChurnChartProps {
  eventos: Evento[];
}

export function AnnualChurnChart({ eventos }: AnnualChurnChartProps) {
  const chartData = useMemo(() => {
    const monthlyChurn = new Map<string, { churned: number; total: number; mrr: number }>();
    
    const serviceStatus = new Map<string, { month: string; status: string; mrr: number }[]>();
    
    eventos.forEach(e => {
      if (!e.servico_id || !e.event_datetime) return;
      const monthKey = format(startOfMonth(parseISO(e.event_datetime)), "yyyy-MM");
      const serviceId = String(e.servico_id);
      
      if (!serviceStatus.has(serviceId)) {
        serviceStatus.set(serviceId, []);
      }
      serviceStatus.get(serviceId)!.push({
        month: monthKey,
        status: e.servico_status || '',
        mrr: e.valor_mensalidade || 0,
      });
    });

    // Detect churns (status change to Cancelado)
    serviceStatus.forEach((history, serviceId) => {
      const sorted = history.sort((a, b) => a.month.localeCompare(b.month));
      
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        
        if (prev.status !== 'Cancelado' && curr.status === 'Cancelado') {
          if (!monthlyChurn.has(curr.month)) {
            monthlyChurn.set(curr.month, { churned: 0, total: 0, mrr: 0 });
          }
          monthlyChurn.get(curr.month)!.churned++;
          monthlyChurn.get(curr.month)!.mrr += prev.mrr;
        }
      }
    });

    // Add total active per month
    const monthlyActive = new Map<string, number>();
    eventos.forEach(e => {
      if (!e.servico_id || !e.event_datetime) return;
      const monthKey = format(startOfMonth(parseISO(e.event_datetime)), "yyyy-MM");
      if (!monthlyActive.has(monthKey)) {
        monthlyActive.set(monthKey, 0);
      }
    });

    // Get unique services per month
    const activePerMonth = new Map<string, Set<string>>();
    eventos.forEach(e => {
      if (!e.servico_id || !e.event_datetime) return;
      const monthKey = format(startOfMonth(parseISO(e.event_datetime)), "yyyy-MM");
      if (!activePerMonth.has(monthKey)) {
        activePerMonth.set(monthKey, new Set());
      }
      if (e.servico_status !== 'Cancelado') {
        activePerMonth.get(monthKey)!.add(String(e.servico_id));
      }
    });

    // Build final data
    const allMonths = new Set([...monthlyChurn.keys(), ...activePerMonth.keys()]);
    
    return Array.from(allMonths)
      .sort()
      .slice(-12)
      .map(month => {
        const churnData = monthlyChurn.get(month) || { churned: 0, mrr: 0 };
        const activeCount = activePerMonth.get(month)?.size || 0;
        const churnRate = activeCount > 0 ? (churnData.churned / activeCount) * 100 : 0;
        
        return {
          month: format(parseISO(month + "-01"), "MMM/yy", { locale: ptBR }),
          churns: churnData.churned,
          taxaChurn: churnRate,
          mrrPerdido: churnData.mrr,
          ativos: activeCount,
        };
      });
  }, [eventos]);

  const avgChurnRate = chartData.length > 0 
    ? chartData.reduce((sum, d) => sum + d.taxaChurn, 0) / chartData.length 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <ChartCard 
      title="Taxa de Churn Anual" 
      subtitle={`Média: ${avgChurnRate.toFixed(1)}% ao mês`}
      height="h-[320px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradientChurn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatCurrency}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(223, 47%, 10%)', 
              border: '1px solid hsl(220, 20%, 25%)',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(210, 40%, 98%)', fontWeight: 600 }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                taxaChurn: 'Taxa de Churn',
                mrrPerdido: 'MRR Perdido',
                churns: 'Cancelamentos',
              };
              if (name === 'taxaChurn') return [`${value.toFixed(2)}%`, labels[name]];
              if (name === 'mrrPerdido') return [formatCurrency(value), labels[name]];
              return [value, labels[name] || name];
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                taxaChurn: 'Taxa Churn %',
                mrrPerdido: 'MRR Perdido'
              };
              return <span style={{ color: 'hsl(215, 20%, 65%)', fontSize: 12 }}>{labels[value] || value}</span>;
            }}
          />
          <ReferenceLine yAxisId="left" y={avgChurnRate} stroke="hsl(38, 92%, 50%)" strokeDasharray="5 5" />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="taxaChurn" 
            stroke="hsl(0, 72%, 51%)" 
            strokeWidth={3}
            dot={{ fill: 'hsl(0, 72%, 51%)', strokeWidth: 0, r: 5 }}
            activeDot={{ r: 7, fill: 'hsl(0, 72%, 51%)' }}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="mrrPerdido" 
            stroke="hsl(280, 80%, 65%)" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}