import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UploadDialog({ open, onOpenChange, onSuccess }: UploadDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.jsonl'))) {
      setFile(droppedFile);
      setStatus('idle');
    } else {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo CSV ou JSONL",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus('idle');
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const records: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const record: any = {};
      
      headers.forEach((header, index) => {
        let value: any = values[index] || null;
        
        // Convert types
        if (value === '' || value === 'null' || value === 'None') {
          value = null;
        } else if (value === 'True' || value === 'true') {
          value = true;
        } else if (value === 'False' || value === 'false') {
          value = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          value = Number(value);
        }
        
        record[header] = value;
      });
      
      records.push(record);
    }
    
    return records;
  };

  const parseJSONL = (text: string): any[] => {
    return text
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  };

  const transformRecord = (record: any) => {
    return {
      event_id: record.event_id,
      event_type: record.event_type,
      event_datetime: record.event_datetime,
      cliente_id: record.cliente_id,
      cliente_nome: record.cliente_nome,
      cliente_tipo_pessoa: record.cliente_tipo_pessoa || null,
      cliente_documento: record.cliente_documento || null,
      cliente_email: record.cliente_email || null,
      cliente_celular: record.cliente_celular || null,
      cliente_cidade: record.cliente_cidade || null,
      cliente_uf: record.cliente_uf || null,
      cliente_segmento: record.cliente_segmento || null,
      cliente_data_cadastro: record.cliente_data_cadastro || null,
      servico_id: record.servico_id || null,
      tipo_servico: record.tipo_servico || null,
      plano_nome: record.plano_nome || null,
      velocidade_down_mbps: record.velocidade_down_mbps || null,
      velocidade_up_mbps: record.velocidade_up_mbps || null,
      valor_mensalidade: record.valor_mensalidade || null,
      dia_vencimento: record.dia_vencimento || null,
      servico_status_codigo: record.servico_status_codigo || null,
      servico_status: record.servico_status || null,
      data_instalacao: record.data_instalacao || null,
      cobranca_id: record.cobranca_id || null,
      cobranca_status_codigo: record.cobranca_status_codigo || null,
      cobranca_status: record.cobranca_status || null,
      data_gerado: record.data_gerado || null,
      data_vencimento: record.data_vencimento || null,
      data_pagamento: record.data_pagamento || null,
      valor_cobranca: record.valor_cobranca || null,
      valor_pago: record.valor_pago || null,
      metodo_cobranca: record.metodo_cobranca || null,
      dias_atraso: record.dias_atraso || null,
      vencido: record.vencido ?? null,
      atendimento_id: record.atendimento_id || null,
      protocolo: record.protocolo || null,
      assunto: record.assunto || null,
      categoria: record.categoria || null,
      motivo_contato: record.motivo_contato || null,
      origem: record.origem || null,
      setor: record.setor || null,
      urgencia: record.urgencia || null,
      atendimento_status: record.atendimento_status || null,
      tempo_atendimento_min: record.tempo_atendimento_min || null,
      resolvido_primeiro_contato: record.resolvido_primeiro_contato ?? null,
      reincidente_30d: record.reincidente_30d ?? null,
      rx_dbm: record.rx_dbm || null,
      tx_dbm: record.tx_dbm || null,
      snr_db: record.snr_db || null,
      latency_ms: record.latency_ms || null,
      jitter_ms: record.jitter_ms || null,
      packet_loss_pct: record.packet_loss_pct || null,
      downtime_min_24h: record.downtime_min_24h || null,
      nps_score: record.nps_score || null,
      nps_comment: record.nps_comment || null,
      churn_risk_score: record.churn_risk_score || null,
      churn_risk_bucket: record.churn_risk_bucket || null,
      inadimplencia_risk_score: record.inadimplencia_risk_score || null,
      inadimplencia_bucket: record.inadimplencia_bucket || null,
      alerta_tipo: record.alerta_tipo || null,
      acao_recomendada_1: record.acao_recomendada_1 || null,
      acao_recomendada_2: record.acao_recomendada_2 || null,
      acao_recomendada_3: record.acao_recomendada_3 || null,
      mes_referencia: record.mes_referencia || null,
    };
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setStatus('uploading');
    setProgress(10);

    try {
      const text = await file.text();
      setProgress(20);

      let records: any[];
      if (file.name.endsWith('.csv')) {
        records = parseCSV(text);
      } else {
        records = parseJSONL(text);
      }

      if (records.length === 0) {
        throw new Error("Nenhum registro encontrado no arquivo");
      }

      setProgress(30);
      setMessage(`Processando ${records.length} registros...`);

      // Transformar registros
      const transformedRecords = records.map(transformRecord);
      setProgress(50);

      // Limpar dados existentes
      setMessage("Limpando dados anteriores...");
      const { error: deleteError } = await supabase
        .from('eventos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw deleteError;
      setProgress(60);

      // Inserir em lotes de 500
      const batchSize = 500;
      const batches = [];
      for (let i = 0; i < transformedRecords.length; i += batchSize) {
        batches.push(transformedRecords.slice(i, i + batchSize));
      }

      setMessage(`Inserindo ${batches.length} lotes...`);
      
      for (let i = 0; i < batches.length; i++) {
        const { error: insertError } = await supabase
          .from('eventos')
          .insert(batches[i] as any);

        if (insertError) throw insertError;
        setProgress(60 + Math.round((i + 1) / batches.length * 35));
      }

      setProgress(100);
      setStatus('success');
      setMessage(`${records.length} registros importados com sucesso!`);
      
      toast({
        title: "Upload concluído!",
        description: `${records.length} registros importados com sucesso.`,
      });

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setFile(null);
        setStatus('idle');
        setProgress(0);
      }, 1500);

    } catch (error: any) {
      console.error("Erro no upload:", error);
      setStatus('error');
      setMessage(error.message || "Erro ao processar arquivo");
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload de Dados</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV ou JSONL com os eventos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".csv,.jsonl"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Suporta CSV e JSONL
                </p>
              </>
            )}
          </div>

          {/* Progress */}
          {status !== 'idle' && (
            <div className="space-y-2">
              <Progress value={progress} />
              <div className="flex items-center gap-2 text-sm">
                {status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
                {status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                <span className={status === 'error' ? 'text-red-500' : ''}>{message}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Fazer Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
