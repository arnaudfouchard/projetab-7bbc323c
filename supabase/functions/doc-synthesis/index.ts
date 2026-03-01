import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, results } = await req.json();

    if (!query || !results || results.length === 0) {
      return new Response(
        JSON.stringify({ error: "Query and results are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context from search results
    const context = results
      .map((r: any, i: number) => {
        const meta = r.metadata || {};
        return `--- Document ${i + 1}: ${meta.title || meta.source || "Sans titre"} (score: ${(r.score * 100).toFixed(1)}%) ---
Type: ${meta.type_document || "N/A"} | Établissement: ${meta.etablissement || "N/A"} | Année: ${meta.annee || "N/A"}
Contenu:
${meta.text || meta.content || "Pas de contenu textuel disponible"}`;
      })
      .join("\n\n");

    const systemPrompt = `Tu es un expert en stratégie hospitalière et en projets d'établissement / projets médico-soignants.
On te fournit une question de l'utilisateur et des extraits de documents trouvés par recherche sémantique.
Tu dois produire une synthèse structurée et sourcée qui répond à la question.

Règles :
- Cite systématiquement les documents sources entre crochets [Document X]
- Structure ta réponse avec des sous-titres markdown
- Si les documents ne permettent pas de répondre complètement, indique-le clairement
- Sois factuel et précis, utilise le vocabulaire du secteur hospitalier
- Réponds en 300-500 mots maximum`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Question : ${query}\n\nDocuments trouvés :\n${context}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes dépassée, réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Erreur IA [${response.status}]` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ synthesis: content || "Pas de synthèse générée." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("doc-synthesis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
