import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sourceUrl = Deno.env.get("SOURCE_SUPABASE_URL");
    const sourceKey = Deno.env.get("SOURCE_SUPABASE_SERVICE_KEY");

    if (!sourceUrl || !sourceKey) {
      return new Response(
        JSON.stringify({ 
          error: "Missing external Supabase credentials",
          details: "SOURCE_SUPABASE_URL or SOURCE_SUPABASE_SERVICE_KEY not configured" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const externalSupabase = createClient(sourceUrl, sourceKey);

    // Select only columns used by the dashboard to avoid timeout
    const columns = [
      "event_id", "event_type", "event_datetime", "mes_referencia",
      "cliente_id", "cliente_nome", "cliente_documento", "cliente_email", "cliente_celular",
      "cliente_cidade", "cliente_uf", "cliente_segmento", "cliente_data_cadastro",
      "servico_id", "tipo_servico", "plano_nome",
      "velocidade_down_mbps", "velocidade_up_mbps", "valor_mensalidade",
      "dia_vencimento", "servico_status", "data_instalacao",
      "cobranca_status", "data_vencimento", "data_pagamento",
      "valor_cobranca", "valor_pago", "metodo_cobranca", "dias_atraso", "vencido",
      "motivo_contato", "categoria", "setor", "origem", "urgencia",
      "tempo_atendimento_min", "reincidente_30d", "resolvido_primeiro_contato",
      "rx_dbm", "tx_dbm", "snr_db", "latency_ms", "packet_loss_pct", "downtime_min_24h",
      "nps_score", "nps_comment",
      "churn_risk_score", "churn_risk_bucket",
      "inadimplencia_risk_score", "inadimplencia_bucket",
      "alerta_tipo", "acao_recomendada_1", "acao_recomendada_2", "acao_recomendada_3"
    ].join(",");

    let allEventos: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    // Try smaller batch without ordering to avoid timeout on large tables
    while (hasMore) {
      const { data, error } = await externalSupabase
        .from("eventos")
        .select(columns)
        .range(from, from + batchSize - 1);

      if (error) {
        console.error("Error fetching eventos batch:", error);
        // If first batch fails, return what we have or error
        if (allEventos.length === 0) {
          return new Response(
            JSON.stringify({ error: error.message, hint: "Table may be too large. Consider adding an index on event_datetime." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Return partial results
        hasMore = false;
        break;
      }

      if (data && data.length > 0) {
        allEventos = [...allEventos, ...data];
        from += batchSize;
        hasMore = data.length === batchSize;
        if (allEventos.length >= 5000) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`Fetched ${allEventos.length} eventos from external Supabase`);

    return new Response(
      JSON.stringify({ eventos: allEventos, count: allEventos.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
