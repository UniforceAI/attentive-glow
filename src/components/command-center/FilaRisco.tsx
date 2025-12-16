import { ClienteRisco } from "@/types/evento";
import { AlertTriangle, Phone, Mail, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface FilaRiscoProps {
  fila: ClienteRisco[];
}

export function FilaRisco({ fila }: FilaRiscoProps) {
  const { toast } = useToast();

  const handleAction = (cliente: string, acao: string) => {
    toast({
      title: "Ação registrada",
      description: `${acao} para ${cliente}`,
    });
  };

  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case 'Crítico': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Alto': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="font-semibold text-foreground">Fila de Risco (Hoje)</h3>
          <Badge variant="destructive" className="ml-2">{fila.length}</Badge>
        </div>
      </div>

      <div className="max-h-[400px] overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-4 py-2 font-medium">Cliente</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Plano</th>
              <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Local</th>
              <th className="text-center px-4 py-2 font-medium">Score</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Driver</th>
              <th className="text-right px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {fila.slice(0, 20).map((c) => (
              <tr key={c.cliente_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground text-sm">{c.cliente_nome}</p>
                  <p className="text-xs text-muted-foreground">R$ {c.valor_mensalidade.toFixed(2)}/mês</p>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                  {c.plano_nome}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                  <span className="truncate block max-w-[120px]">{c.cidade}</span>
                  <span className="text-xs">{c.bairro}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge className={getBucketColor(c.bucket)}>
                    {c.score}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm hidden md:table-cell">
                  <span className="text-xs text-muted-foreground">{c.driver}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {c.acoes.slice(0, 3).map((a, i) => {
                      const icons = [Phone, Mail, Gift];
                      const Icon = icons[i] || Phone;
                      return (
                        <Button
                          key={i}
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title={a}
                          onClick={() => handleAction(c.cliente_nome, a)}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </Button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {fila.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cliente em risco alto/crítico
          </div>
        )}
      </div>
    </div>
  );
}
