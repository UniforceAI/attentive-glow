import { TrendingUp, TrendingDown, Users, UserPlus, UserMinus, DollarSign, AlertTriangle, Wifi, ThumbsDown, Banknote, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KPICardsProps {
  kpis: any;
  sinalCritico: number;
  detratores: number;
  ltvStats: any;
}

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { 
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 
}).format(v);

function KPICard({ title, value, delta, icon, variant = 'default', tooltip }: {
  title: string;
  value: string | number;
  delta?: number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  tooltip?: string;
}) {
  const variantClasses = {
    default: 'bg-card border-border',
    success: 'bg-success/10 border-success/30',
    warning: 'bg-warning/10 border-warning/30',
    danger: 'bg-destructive/10 border-destructive/30',
    primary: 'bg-primary/10 border-primary/30',
  };

  const iconColors = {
    default: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    primary: 'text-primary',
  };

  const card = (
    <div className={`rounded-xl border p-3 ${variantClasses[variant]} cursor-help min-w-0`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`${iconColors[variant]}`}>{icon}</span>
        {delta !== undefined && delta !== 0 && (
          <span className={`flex items-center text-[10px] font-medium ${delta > 0 ? 'text-success' : 'text-destructive'}`}>
            {delta > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-lg font-bold text-foreground truncate">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{title}</p>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return card;
}

export function KPICards({ kpis, sinalCritico, detratores, ltvStats }: KPICardsProps) {
  // Show empty state with N/A values when no data
  const hasData = kpis && kpis.clientesAtivos;
  
  const getValue = (obj: any, defaultValue = 0) => obj?.value ?? defaultValue;
  const getDelta = (obj: any) => obj?.delta;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
      <KPICard 
        title="Clientes Ativos" 
        value={hasData ? getValue(kpis.clientesAtivos).toLocaleString('pt-BR') : 'N/A'} 
        delta={hasData ? getDelta(kpis.clientesAtivos) : undefined}
        icon={<Users className="h-5 w-5" />} 
        variant={hasData && getValue(kpis.clientesAtivos) > 0 ? "success" : "default"}
        tooltip="Total de clientes com serviço ativo no período. Delta MoM."
      />
      <KPICard 
        title="Novos Clientes" 
        value={hasData ? getValue(kpis.novosClientes).toLocaleString('pt-BR') : 'N/A'} 
        delta={hasData ? getDelta(kpis.novosClientes) : undefined}
        icon={<UserPlus className="h-5 w-5" />} 
        variant={hasData && getValue(kpis.novosClientes) > 0 ? "primary" : "default"}
        tooltip="Clientes que entraram na base no mês. Delta MoM."
      />
      <KPICard 
        title="Churn (Rescisões)" 
        value={hasData ? getValue(kpis.churnRescisoes).toLocaleString('pt-BR') : 'N/A'} 
        delta={hasData ? getDelta(kpis.churnRescisoes) : undefined}
        icon={<UserMinus className="h-5 w-5" />} 
        variant={hasData && getValue(kpis.churnRescisoes) > 0 ? "danger" : "default"}
        tooltip="Clientes que cancelaram no mês. Acompanhe para identificar tendências."
      />
      <KPICard 
        title="MRR Total" 
        value={hasData ? formatCurrency(getValue(kpis.mrrTotal)) : 'N/A'} 
        delta={hasData ? getDelta(kpis.mrrTotal) : undefined}
        icon={<DollarSign className="h-5 w-5" />} 
        variant={hasData && getValue(kpis.mrrTotal) > 0 ? "primary" : "default"}
        tooltip="Receita Recorrente Mensal total da base ativa."
      />
      <KPICard 
        title="Faturamento Recebido" 
        value={hasData ? formatCurrency(getValue(kpis.faturamentoRecebido)) : 'N/A'} 
        delta={hasData ? getDelta(kpis.faturamentoRecebido) : undefined}
        icon={<Banknote className="h-5 w-5" />} 
        variant={hasData && getValue(kpis.faturamentoRecebido) > 0 ? "success" : "default"}
        tooltip="Valor efetivamente recebido no mês. Diferença com MRR indica inadimplência."
      />
      <KPICard 
        title="MRR em Risco" 
        value={hasData ? formatCurrency(getValue(kpis.mrrEmRiscoChurn)) : 'N/A'} 
        delta={hasData ? getDelta(kpis.mrrEmRiscoChurn) : undefined}
        icon={<AlertTriangle className="h-5 w-5" />} 
        variant={hasData && getValue(kpis.mrrEmRiscoChurn) > 0 ? "danger" : "default"}
        tooltip="MRR de clientes com risco Alto/Crítico de churn. Priorize ações de retenção."
      />
      <KPICard 
        title="LTV em Risco" 
        value={hasData ? formatCurrency(getValue(kpis.ltvEmRiscoChurn)) : 'N/A'} 
        delta={hasData ? getDelta(kpis.ltvEmRiscoChurn) : undefined}
        icon={<Shield className="h-5 w-5" />} 
        variant={hasData && getValue(kpis.ltvEmRiscoChurn) > 0 ? "danger" : "default"}
        tooltip="Valor de vida útil dos clientes em risco de churn. Impacto potencial no longo prazo."
      />
      <KPICard 
        title="R$ Vencido" 
        value={hasData ? formatCurrency(getValue(kpis.rVencido)) : 'N/A'} 
        delta={hasData ? getDelta(kpis.rVencido) : undefined}
        icon={<DollarSign className="h-5 w-5" />} 
        variant={hasData && getValue(kpis.rVencido) > 0 ? "warning" : "default"}
        tooltip="Total de cobranças vencidas. Acione fila de cobrança para recuperação."
      />
      <KPICard 
        title="% Sinal Crítico" 
        value={typeof sinalCritico === 'number' ? `${sinalCritico.toFixed(1)}%` : 'N/A'} 
        icon={<Wifi className="h-5 w-5" />} 
        variant={sinalCritico > 10 ? 'danger' : 'default'}
        tooltip="% de eventos de sinal com problemas críticos. Priorize manutenção preventiva."
      />
      <KPICard 
        title="% Detratores" 
        value={typeof detratores === 'number' ? `${detratores.toFixed(1)}%` : 'N/A'} 
        icon={<ThumbsDown className="h-5 w-5" />} 
        variant={detratores > 20 ? 'danger' : 'default'}
        tooltip="% de respostas NPS ≤6. Clientes insatisfeitos com alto risco de churn."
      />
    </div>
  );
}
