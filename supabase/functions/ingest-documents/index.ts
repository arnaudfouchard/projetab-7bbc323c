import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PINECONE_HOST = "https://projetabpepms-2wbvkah.svc.aped-4627-b74a.pinecone.io";

// --- Chunking logic ---
function chunkText(text: string, maxChars = 1500, overlap = 200): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      current = overlapWords.join(" ") + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim().length > 20) {
    chunks.push(current.trim());
  }

  if (chunks.length === 0 && text.length > 0) {
    for (let i = 0; i < text.length; i += maxChars - overlap) {
      chunks.push(text.slice(i, i + maxChars).trim());
    }
  }

  return chunks;
}

// --- Check existing vectors in Pinecone (dedup) ---
async function checkExistingIds(ids: string[], apiKey: string): Promise<Set<string>> {
  const existing = new Set<string>();
  // Fetch in batches of 100 (Pinecone limit)
  const BATCH = 100;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const params = batch.map(id => `ids=${encodeURIComponent(id)}`).join("&");
    const res = await fetch(`${PINECONE_HOST}/vectors/fetch?${params}`, {
      headers: { "Api-Key": apiKey },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.vectors) {
        for (const id of Object.keys(data.vectors)) {
          existing.add(id);
        }
      }
    }
  }
  return existing;
}

// --- Batch embed via Pinecone Inference ---
async function embedTexts(texts: string[], apiKey: string): Promise<number[][]> {
  const BATCH_SIZE = 96;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await fetch("https://api.pinecone.io/embed", {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
        "X-Pinecone-API-Version": "2025-04",
      },
      body: JSON.stringify({
        model: "multilingual-e5-large",
        inputs: batch.map(t => ({ text: t })),
        parameters: { input_type: "passage", truncate: "END" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embedding error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    for (const item of data.data) {
      allEmbeddings.push(item.values);
    }
  }

  return allEmbeddings;
}

// --- Upsert to Pinecone ---
async function upsertVectors(
  vectors: { id: string; values: number[]; metadata: Record<string, any> }[],
  apiKey: string,
  namespace?: string
) {
  const BATCH_SIZE = 100;
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    const body: any = { vectors: batch };
    if (namespace) body.namespace = namespace;

    const response = await fetch(`${PINECONE_HOST}/vectors/upsert`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Upsert error [${response.status}]: ${errText}`);
    }
  }
}

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

    const { documents, skipExisting = true } = await req.json();

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: "No documents provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { name: string; chunks: number; status: string }[] = [];

    for (const doc of documents) {
      const {
        name,
        text,
        metadata = {},
      } = doc as {
        name: string;
        text: string;
        metadata?: Record<string, string>;
      };

      if (!text || text.trim().length < 50) {
        results.push({ name, chunks: 0, status: "skipped_too_short" });
        continue;
      }

      try {
        // 1. Chunk the text
        const chunks = chunkText(text);
        const docId = name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();

        // 2. Dedup check — see if first chunk already exists
        if (skipExisting) {
          const checkIds = [`${docId}_chunk_0`];
          const existing = await checkExistingIds(checkIds, PINECONE_API_KEY);
          if (existing.size > 0) {
            console.log(`Document "${name}" already indexed (${docId}_chunk_0 exists), skipping`);
            results.push({ name, chunks: 0, status: "skipped_duplicate" });
            continue;
          }
        }

        console.log(`Document "${name}": ${chunks.length} chunks`);

        // 3. Generate embeddings
        const embeddings = await embedTexts(chunks, PINECONE_API_KEY);

        // 4. Build vectors with metadata
        const vectors = chunks.map((chunk, i) => ({
          id: `${docId}_chunk_${i}`,
          values: embeddings[i],
          metadata: {
            ...metadata,
            title: name,
            source: name,
            text: chunk,
            chunk_index: i,
            total_chunks: chunks.length,
          },
        }));

        // 5. Upsert to Pinecone
        await upsertVectors(vectors, PINECONE_API_KEY);

        results.push({ name, chunks: chunks.length, status: "indexed" });
      } catch (err: any) {
        console.error(`Error indexing "${name}":`, err);
        results.push({ name, chunks: 0, status: `error: ${err.message}` });
      }
    }

    const totalChunks = results.reduce((s, r) => s + r.chunks, 0);
    const indexed = results.filter(r => r.status === "indexed").length;
    const skippedDup = results.filter(r => r.status === "skipped_duplicate").length;

    return new Response(
      JSON.stringify({
        message: `${indexed}/${documents.length} documents indexés, ${totalChunks} chunks créés, ${skippedDup} doublons ignorés`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ingest-documents error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
