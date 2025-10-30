import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Chamado } from "@/types/chamado";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eye, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ClientesTableProps {
  chamados: Chamado[];
  onClienteClick: (chamado: Chamado) => void;
}

export function ClientesTable({ chamados, onClienteClick }: ClientesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatTempo = (tempo: string) => {
    // Parse horas do tempo
    let totalHoras = 0;
    
    if (tempo.includes("h")) {
      totalHoras = parseFloat(tempo.split("h")[0]);
    } else if (tempo.includes("min")) {
      totalHoras = parseFloat(tempo.split("min")[0]) / 60;
    } else if (tempo.includes("dia")) {
      // Já está em dias
      return tempo;
    } else {
      return tempo;
    }
    
    // Se >= 1 dia, mostrar em dias
    if (totalHoras >= 24) {
      const dias = Math.floor(totalHoras / 24);
      return `${dias} dia${dias > 1 ? 's' : ''}`;
    }
    
    // Se < 1 dia, mostrar em horas
    return `${totalHoras.toFixed(1)}h`;
  };

  const parseChamadosAnteriores = (chamadosStr: string) => {
    try {
      // Formato esperado: "Protocolo1 - Data1; Protocolo2 - Data2"
      if (!chamadosStr || chamadosStr === "-") return [];
      
      return chamadosStr.split(";").map(item => {
        const [protocolo, data] = item.split(" - ").map(s => s.trim());
        return { protocolo, data };
      }).filter(item => item.protocolo && item.data);
    } catch (e) {
      return [];
    }
  };

  const getClassificacaoColor = (classificacao: string) => {
    switch (classificacao) {
      case "Reincidente":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "Lento":
        return "bg-warning/10 text-warning border-warning/20";
      case "Rápido":
        return "bg-success/10 text-success border-success/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRowColor = (classificacao: string) => {
    switch (classificacao) {
      case "Reincidente":
        return "bg-destructive/5 hover:bg-destructive/10";
      case "Lento":
        return "bg-warning/5 hover:bg-warning/10";
      case "Rápido":
        return "bg-success/5 hover:bg-success/10";
      default:
        return "hover:bg-muted/50";
    }
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>ID Cliente</TableHead>
            <TableHead>Qtd. Chamados</TableHead>
            <TableHead>Último Motivo</TableHead>
            <TableHead>Dias desde Último</TableHead>
            <TableHead>Tempo de Atendimento</TableHead>
            <TableHead>Classificação</TableHead>
            <TableHead>Insight</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chamados.map((chamado) => {
            const chamadosAnteriores = parseChamadosAnteriores(chamado["Chamados Anteriores"]);
            const isExpanded = expandedRows.has(chamado._id || chamado.Protocolo);
            
            return (
              <Collapsible key={chamado._id || chamado.Protocolo} asChild open={isExpanded}>
                <>
                  <TableRow 
                    className={cn("transition-colors", getRowColor(chamado.Classificação))}
                  >
                    <TableCell>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(chamado._id || chamado.Protocolo)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                    <TableCell className="font-medium">{chamado["ID Cliente"]}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{chamado["Qtd. Chamados"]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {chamado["Motivo do Contato"]}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {chamado["Dias desde Último Chamado"]} dias
                      </Badge>
                    </TableCell>
                    <TableCell>{formatTempo(chamado["Tempo de Atendimento"])}</TableCell>
                    <TableCell>
                      <Badge className={getClassificacaoColor(chamado.Classificação)}>
                        {chamado.Classificação}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">
                      {chamado.Insight}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onClienteClick(chamado)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {chamadosAnteriores.length > 0 && (
                    <CollapsibleContent asChild>
                      <TableRow className={cn("border-t-0", getRowColor(chamado.Classificação))}>
                        <TableCell colSpan={9} className="bg-muted/30 p-4">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Chamados Anteriores:</h4>
                            <div className="flex flex-wrap gap-2">
                              {chamadosAnteriores.map((anterior, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {anterior.protocolo} - {anterior.data}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  )}
                </>
              </Collapsible>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
