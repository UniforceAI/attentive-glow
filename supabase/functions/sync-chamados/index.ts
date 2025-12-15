import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 Iniciando sincronização de chamados...");

    // Cliente do projeto fonte (antigo)
    const sourceUrl = Deno.env.get("SOURCE_SUPABASE_URL");
    const sourceKey = Deno.env.get("SOURCE_SUPABASE_ANON_KEY");

    if (!sourceUrl || !sourceKey) {
      throw new Error("Credenciais do projeto fonte não configuradas");
    }

    const sourceClient = createClient(sourceUrl, sourceKey);

    // Cliente do projeto atual (destino)
    const destUrl = Deno.env.get("SUPABASE_URL");
    const destKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!destUrl || !destKey) {
      throw new Error("Credenciais do projeto destino não configuradas");
    }

    const destClient = createClient(destUrl, destKey);

    // Buscar todos os chamados do projeto fonte em batches
    console.log("📥 Buscando chamados do projeto fonte...");
    
    const BATCH_SIZE = 1000;
    let allSourceData: any[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await sourceClient
        .from("chamados")
        .select("*")
        .range(offset, offset + BATCH_SIZE - 1)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("❌ Erro ao buscar do fonte:", error);
        throw error;
      }

      if (data && data.length > 0) {
        allSourceData = [...allSourceData, ...data];
        offset += BATCH_SIZE;
        console.log(`📊 Buscados ${allSourceData.length} registros até agora...`);
      }

      hasMore = data && data.length === BATCH_SIZE;
    }

    console.log(`✅ Total de ${allSourceData.length} chamados encontrados no projeto fonte`);

    if (allSourceData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Nenhum chamado encontrado no projeto fonte",
          synced: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limpar dados existentes no destino
    console.log("🗑️ Limpando dados existentes no destino...");
    const { error: deleteError } = await destClient
      .from("chamados")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (deleteError) {
      console.error("⚠️ Erro ao limpar destino:", deleteError);
    }

    // Inserir dados em batches
    console.log("📤 Inserindo chamados no projeto destino...");
    
    const INSERT_BATCH_SIZE = 100;
    let insertedCount = 0;

    for (let i = 0; i < allSourceData.length; i += INSERT_BATCH_SIZE) {
      const batch = allSourceData.slice(i, i + INSERT_BATCH_SIZE);
      
      // Remover campos que podem causar conflito
      const cleanBatch = batch.map(item => {
        const { id, created_at, updated_at, ...rest } = item;
        return rest;
      });

      const { error: insertError } = await destClient
        .from("chamados")
        .insert(cleanBatch);

      if (insertError) {
        console.error(`❌ Erro ao inserir batch ${i / INSERT_BATCH_SIZE + 1}:`, insertError);
        throw insertError;
      }

      insertedCount += batch.length;
      console.log(`✅ Inseridos ${insertedCount}/${allSourceData.length} registros...`);
    }

    console.log(`🎉 Sincronização concluída! ${insertedCount} chamados sincronizados.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronização concluída com sucesso`,
        synced: insertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Erro na sincronização:", errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
