import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Filter } from "lucide-react";

interface GlobalFiltersProps {
  periodo: string;
  setPeriodo: (value: string) => void;
  uf: string;
  setUf: (value: string) => void;
  plano: string;
  setPlano: (value: string) => void;
  statusServico: string;
  setStatusServico: (value: string) => void;
  bucketRisco: string;
  setBucketRisco: (value: string) => void;
  segmento: string;
  setSegmento: (value: string) => void;
  ufs: string[];
  planos: string[];
  segmentos: string[];
}

export function GlobalFilters({
  periodo,
  setPeriodo,
  uf,
  setUf,
  plano,
  setPlano,
  statusServico,
  setStatusServico,
  bucketRisco,
  setBucketRisco,
  segmento,
  setSegmento,
  ufs,
  planos,
  segmentos,
}: GlobalFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>

          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="15">15 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="60">60 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>

          <Select value={uf} onValueChange={setUf}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos UFs</SelectItem>
              {ufs.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={plano} onValueChange={setPlano}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Planos</SelectItem>
              {planos.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusServico} onValueChange={setStatusServico}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="Liberado">Liberado</SelectItem>
              <SelectItem value="Bloqueado">Bloqueado</SelectItem>
              <SelectItem value="Suspenso">Suspenso</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={bucketRisco} onValueChange={setBucketRisco}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Risco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Riscos</SelectItem>
              <SelectItem value="Crítico">Crítico</SelectItem>
              <SelectItem value="Alto">Alto</SelectItem>
              <SelectItem value="Médio">Médio</SelectItem>
              <SelectItem value="Baixo">Baixo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={segmento} onValueChange={setSegmento}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {segmentos.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
