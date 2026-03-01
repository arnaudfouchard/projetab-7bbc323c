import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PINECONE_HOST = "https://projetab-embeddings-2wbvkah.svc.aped-4627-b74a.pinecone.io";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PINECONE_API_KEY = Deno.env.get("PINECONE_API_KEY");
    if (!PINECONE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "PINECONE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, query, filters, topK, id } = await req.json();

    // ============ ACTION: search (semantic search with optional filters) ============
    if (action === "search") {
      if (!query) {
        return new Response(
          JSON.stringify({ error: "No query provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build filter object for Pinecone metadata filtering
      const pineconeFilter: Record<string, any> = {};
      if (filters) {
        if (filters.type_document) pineconeFilter.type_document = { "$eq": filters.type_document };
        if (filters.etablissement) pineconeFilter.etablissement = { "$eq": filters.etablissement };
        if (filters.annee) pineconeFilter.annee = { "$eq": filters.annee };
        if (filters.thematique) pineconeFilter.thematique = { "$eq": filters.thematique };
        if (filters.type_etablissement) pineconeFilter.type_etablissement = { "$eq": filters.type_etablissement };
      }

      // Use Pinecone Inference for embedding the query
      const embedResponse = await fetch("https://api.pinecone.io/embed", {
        method: "POST",
        headers: {
          "Api-Key": PINECONE_API_KEY,
          "Content-Type": "application/json",
          "X-Pinecone-API-Version": "2025-04",
        },
        body: JSON.stringify({
          model: "multilingual-e5-large",
          inputs: [{ text: query }],
          parameters: { input_type: "query", truncate: "END" },
        }),
      });

      if (!embedResponse.ok) {
        const errText = await embedResponse.text();
        console.error("Pinecone embed error:", embedResponse.status, errText);
        return new Response(
          JSON.stringify({ error: `Erreur embedding [${embedResponse.status}]` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const embedData = await embedResponse.json();
      const vector = embedData.data?.[0]?.values;

      if (!vector) {
        return new Response(
          JSON.stringify({ error: "No embedding returned" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Query Pinecone index
      const queryBody: any = {
        vector,
        topK: topK || 10,
        includeMetadata: true,
      };
      if (Object.keys(pineconeFilter).length > 0) {
        queryBody.filter = pineconeFilter;
      }

      const searchResponse = await fetch(`${PINECONE_HOST}/query`, {
        method: "POST",
        headers: {
          "Api-Key": PINECONE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(queryBody),
      });

      if (!searchResponse.ok) {
        const errText = await searchResponse.text();
        console.error("Pinecone query error:", searchResponse.status, errText);
        return new Response(
          JSON.stringify({ error: `Erreur recherche [${searchResponse.status}]` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const searchData = await searchResponse.json();
      return new Response(JSON.stringify(searchData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ ACTION: fetch (get a specific vector by ID) ============
    if (action === "fetch" && id) {
      const fetchResponse = await fetch(`${PINECONE_HOST}/vectors/fetch?ids=${encodeURIComponent(id)}`, {
        method: "GET",
        headers: {
          "Api-Key": PINECONE_API_KEY,
        },
      });

      if (!fetchResponse.ok) {
        const errText = await fetchResponse.text();
        console.error("Pinecone fetch error:", fetchResponse.status, errText);
        return new Response(
          JSON.stringify({ error: `Erreur fetch [${fetchResponse.status}]` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fetchData = await fetchResponse.json();
      return new Response(JSON.stringify(fetchData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ ACTION: list-filters (get available filter values) ============
    if (action === "list-filters") {
      // Query a sample to extract unique metadata values
      // Use a zero vector query with high topK to get metadata
      const statsResponse = await fetch(`${PINECONE_HOST}/describe-index-stats`, {
        method: "POST",
        headers: {
          "Api-Key": PINECONE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!statsResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Erreur récupération stats index" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stats = await statsResponse.json();
      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Action inconnue. Actions possibles: search, fetch, list-filters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("pinecone-search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
