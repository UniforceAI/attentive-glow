import { ClienteCobranca } from "@/types/evento";
import { DollarSign, Copy, MessageSquare, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface FilaCobrancaProps {
  fila: ClienteCobranca[];
}

export function FilaCobranca({ fila }: FilaCobrancaProps) {
  const { toast } = useToast();

  const handleAction = (cliente: string, acao: string) => {
    toast({
      title: "Ação registrada",
      description: `${acao} para ${cliente}`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Vencido': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Em Aberto': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAtrasoBadge = (dias: number) => {
    if (dias > 30) return 'bg-red-500/20 text-red-400';
    if (dias > 15) return 'bg-orange-500/20 text-orange-400';
    if (dias > 7) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-warning" />
          <h3 className="font-semibold text-foreground">Cobrança Inteligente</h3>
          <Badge variant="secondary" className="ml-2">{fila.length}</Badge>
        </div>
      </div>

      <div className="max-h-[400px] overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-4 py-2 font-medium">Cliente</th>
              <th className="text-center px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Vencimento</th>
              <th className="text-right px-4 py-2 font-medium">Valor</th>
              <th className="text-center px-4 py-2 font-medium hidden lg:table-cell">Método</th>
              <th className="text-center px-4 py-2 font-medium">Atraso</th>
              <th className="text-right px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {fila.slice(0, 20).map((c) => (
              <tr key={c.cliente_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground text-sm">{c.cliente_nome}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge className={getStatusColor(c.cobranca_status)}>
                    {c.cobranca_status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                  {c.data_vencimento ? new Date(c.data_vencimento).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-medium text-foreground">
                    R$ {c.valor_cobranca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-4 py-3 text-center hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">{c.metodo_cobranca}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge className={getAtrasoBadge(c.dias_atraso)}>
                    {c.dias_atraso}d
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title="Copiar PIX"
                      onClick={() => handleAction(c.cliente_nome, 'PIX copiado')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title="Negociação"
                      onClick={() => handleAction(c.cliente_nome, 'Negociação iniciada')}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      title="Bloqueio parcial"
                      onClick={() => handleAction(c.cliente_nome, 'Bloqueio parcial')}
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {fila.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma cobrança pendente
          </div>
        )}
      </div>
    </div>
  );
}
