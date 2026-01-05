import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get credentials from secrets
    const sourceUrl = Deno.env.get("SOURCE_SUPABASE_URL");
    const sourceKey = Deno.env.get("SOURCE_SUPABASE_ANON_KEY");

    if (!sourceUrl || !sourceKey) {
      return new Response(
        JSON.stringify({ 
          error: "Missing external Supabase credentials",
          details: "SOURCE_SUPABASE_URL or SOURCE_SUPABASE_ANON_KEY not configured" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client for external Supabase
    const externalSupabase = createClient(sourceUrl, sourceKey);

    // Fetch all eventos with pagination
    let allEventos: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await externalSupabase
        .from("eventos")
        .select("*")
        .order("event_datetime", { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error("Error fetching eventos:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (data && data.length > 0) {
        allEventos = [...allEventos, ...data];
        from += batchSize;
        hasMore = data.length === batchSize;
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
