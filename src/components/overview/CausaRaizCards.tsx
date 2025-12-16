import { useMemo } from "react";
import { Evento } from "@/types/evento";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Wifi, Headphones, Frown, Users } from "lucide-react";

interface CausaRaizCardsProps {
  eventos: Evento[];
}

interface CausaRaiz {
  nome: string;
  icon: React.ElementType;
  count: number;
  percentage: number;
  impacto: number;
  color: string;
}

export function CausaRaizCards({ eventos }: CausaRaizCardsProps) {
  const causasRaiz = useMemo((): CausaRaiz[] => {
    const clientesMap = new Map<string, { 
      financeiro: boolean;
      rede: boolean;
      suporte: boolean;
      experiencia: boolean;
      valor: number;
    }>();

    // Agrupar por cliente
    eventos.forEach(e => {
      const clienteId = String(e.cliente_id);
      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          financeiro: false,
          rede: false,
          suporte: false,
          experiencia: false,
          valor: e.valor_mensalidade || 0,
        });
      }

      const cliente = clientesMap.get(clienteId)!;
      
      // Financeiro: cobrança vencida ou dias_atraso > 7
      if (e.event_type === 'COBRANCA' && (e.vencido || (e.dias_atraso && e.dias_atraso > 7))) {
        cliente.financeiro = true;
      }
      
      // Rede: sinal ruim
      if (e.event_type === 'SINAL' && (
        (e.packet_loss_pct && e.packet_loss_pct > 2) ||
        (e.downtime_min_24h && e.downtime_min_24h > 30)
      )) {
        cliente.rede = true;
      }
      
      // Suporte: reincidência
      if (e.event_type === 'ATENDIMENTO' && e.reincidente_30d) {
        cliente.suporte = true;
      }
      
      // Experiência: NPS detrator
      if (e.event_type === 'NPS' && e.nps_score !== null && e.nps_score <= 6) {
        cliente.experiencia = true;
      }
    });

    const total = clientesMap.size;
    const clientes = Array.from(clientesMap.values());

    const financeiro = clientes.filter(c => c.financeiro);
    const rede = clientes.filter(c => c.rede);
    const suporte = clientes.filter(c => c.suporte);
    const experiencia = clientes.filter(c => c.experiencia);

    return [
      {
        nome: "Financeiro",
        icon: CreditCard,
        count: financeiro.length,
        percentage: total > 0 ? (financeiro.length / total) * 100 : 0,
        impacto: financeiro.reduce((sum, c) => sum + c.valor, 0),
        color: "text-red-500",
      },
      {
        nome: "Instabilidade",
        icon: Wifi,
        count: rede.length,
        percentage: total > 0 ? (rede.length / total) * 100 : 0,
        impacto: rede.reduce((sum, c) => sum + c.valor, 0),
        color: "text-orange-500",
      },
      {
        nome: "Reincidência",
        icon: Headphones,
        count: suporte.length,
        percentage: total > 0 ? (suporte.length / total) * 100 : 0,
        impacto: suporte.reduce((sum, c) => sum + c.valor, 0),
        color: "text-purple-500",
      },
      {
        nome: "Detrator",
        icon: Frown,
        count: experiencia.length,
        percentage: total > 0 ? (experiencia.length / total) * 100 : 0,
        impacto: experiencia.reduce((sum, c) => sum + c.valor, 0),
        color: "text-yellow-500",
      },
    ];
  }, [eventos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Causas Raiz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {causasRaiz.map((causa) => (
          <div key={causa.nome} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <causa.icon className={`h-4 w-4 ${causa.color}`} />
                <span className="text-sm font-medium">{causa.nome}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {causa.count} ({causa.percentage.toFixed(0)}%)
              </span>
            </div>
            <Progress value={causa.percentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Impacto: {formatCurrency(causa.impacto)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
