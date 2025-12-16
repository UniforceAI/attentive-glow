import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { Evento } from "@/types/evento";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MRRChurnChartProps {
  eventos: Evento[];
}

export function MRRChurnChart({ eventos }: MRRChurnChartProps) {
  const chartData = useMemo(() => {
    const monthlyData = new Map<string, { mrr: number; mrrRisco: number; ltv: number; ltvRisco: number }>();
    
    // Get unique services with latest event per month
    const servicesByMonth = new Map<string, Map<number, Evento>>();
    
    eventos.forEach(e => {
      if (!e.servico_id || !e.event_datetime) return;
      const monthKey = format(startOfMonth(parseISO(e.event_datetime)), "yyyy-MM");
      
      if (!servicesByMonth.has(monthKey)) {
        servicesByMonth.set(monthKey, new Map());
      }
      
      const monthServices = servicesByMonth.get(monthKey)!;
      const existing = monthServices.get(e.servico_id);
      
      if (!existing || new Date(e.event_datetime) > new Date(existing.event_datetime)) {
        monthServices.set(e.servico_id, e);
      }
    });

    // Calculate metrics per month
    servicesByMonth.forEach((services, monthKey) => {
      let mrr = 0;
      let mrrRisco = 0;
      let ltv = 0;
      let ltvRisco = 0;

      services.forEach(e => {
        if (e.servico_status === 'Liberado' && e.valor_mensalidade) {
          mrr += e.valor_mensalidade;
          // LTV estimation: avg lifetime 24 months
          const serviceLtv = e.valor_mensalidade * 24;
          ltv += serviceLtv;
          
          if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') {
            mrrRisco += e.valor_mensalidade;
            ltvRisco += serviceLtv;
          }
        }
      });

      monthlyData.set(monthKey, { mrr, mrrRisco, ltv, ltvRisco });
    });

    // Sort and format for chart
    return Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12) // Last 12 months
      .map(([month, data]) => ({
        month: format(parseISO(month + "-01"), "MMM/yy", { locale: ptBR }),
        mrr: data.mrr,
        mrrRisco: data.mrrRisco,
        ltv: data.ltv / 1000,
        ltvRisco: data.ltvRisco / 1000,
        pctRisco: data.mrr > 0 ? (data.mrrRisco / data.mrr) * 100 : 0,
      }));
  }, [eventos]);

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
      title="MRR & LTV em Risco de Churn" 
      subtitle="Faturamento recorrente e lifetime value ameaçados"
      height="h-[320px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradientMrr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientMrrRisco" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.6} />
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
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)'
            }}
            labelStyle={{ color: 'hsl(210, 40%, 98%)', fontWeight: 600, marginBottom: 8 }}
            itemStyle={{ color: 'hsl(215, 20%, 75%)' }}
            formatter={(value: number, name: string) => {
              const label = name === 'mrr' ? 'MRR Total' : name === 'mrrRisco' ? 'MRR em Risco' : name;
              return [formatCurrency(value), label];
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                mrr: 'MRR Total',
                mrrRisco: 'MRR em Risco'
              };
              return <span style={{ color: 'hsl(215, 20%, 65%)', fontSize: 12 }}>{labels[value] || value}</span>;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="mrr" 
            stroke="hsl(217, 91%, 60%)" 
            strokeWidth={2}
            fill="url(#gradientMrr)" 
          />
          <Area 
            type="monotone" 
            dataKey="mrrRisco" 
            stroke="hsl(0, 72%, 51%)" 
            strokeWidth={2}
            fill="url(#gradientMrrRisco)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}