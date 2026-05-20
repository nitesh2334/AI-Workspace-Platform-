import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── OpenRouter embedding provider ───────────────────────────

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  name: "openrouter",
});

const EMBEDDING_MODEL = "text-embedding-3-small";

// ─── Text extraction ─────────────────────────────────────────

export async function extractTextFromFile(
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  if (mimetype === "text/plain" || mimetype === "text/markdown" || mimetype === "text/x-markdown") {
    return buffer.toString("utf-8");
  }

  if (mimetype === "application/pdf") {
    // Dynamic import — pdf-parse is heavy and only needed for PDFs
    const pdf = await import("pdf-parse");
    const data = await pdf.default(buffer);
    return data.text ?? "";
  }

  throw new Error(`Unsupported file type: ${mimetype}`);
}

// ─── Chunking ────────────────────────────────────────────────

interface ChunkOptions {
  /** Target chunk size in characters (not tokens — approximate). */
  maxChunkSize?: number;
  /** Overlap between consecutive chunks in characters. */
  overlap?: number;
}

const DEFAULT_CHUNK_SIZE = 2000;   // ~500 tokens
const DEFAULT_OVERLAP = 400;       // ~100 tokens

/**
 * Splits text into overlapping chunks.
 * Attempts to break on paragraph boundaries first, then sentences.
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {},
): string[] {
  const {
    maxChunkSize = DEFAULT_CHUNK_SIZE,
    overlap = DEFAULT_OVERLAP,
  } = options;

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  if (normalized.length <= maxChunkSize) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    // Find a good break point: try paragraph, then sentence boundary
    let end = start + maxChunkSize;

    if (end >= normalized.length) {
      // Last chunk
      chunks.push(normalized.slice(start).trim());
      break;
    }

    // Try to break at a double newline (paragraph) working backwards
    const paragraphBreak = normalized.lastIndexOf("\n\n", end);
    if (paragraphBreak > start) {
      end = paragraphBreak;
    } else {
      // Try sentence boundary
      const sentenceBreak = findSentenceBoundary(normalized, start, end);
      if (sentenceBreak > start) {
        end = sentenceBreak;
      }
    }

    chunks.push(normalized.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter((c) => c.length > 0);
}

/** Find the last sentence-ending punctuation within the window. */
function findSentenceBoundary(
  text: string,
  start: number,
  end: number,
): number {
  // Look backwards up to 200 chars for a natural break point
  const searchFrom = Math.max(end - 200, start);
  const window = text.slice(searchFrom, end);

  // Look for sentence endings in reverse order
  const patterns = [". ", "! ", "? ", ".\n", "!\n", "?\n"];
  let bestPos = -1;

  for (const pattern of patterns) {
    const idx = window.lastIndexOf(pattern);
    if (idx > bestPos) {
      bestPos = idx + pattern.length; // Include the ending punctuation
    }
  }

  if (bestPos > 0) {
    return searchFrom + bestPos;
  }

  // Fallback: break at a space near the end of the window
  const lastSpace = window.lastIndexOf(" ", window.length - 1);
  if (lastSpace > 0) {
    return searchFrom + lastSpace;
  }

  return end;
}

// ─── Embeddings ──────────────────────────────────────────────

export async function generateEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Filter out empty strings — they produce meaningless embeddings
  const validTexts = texts.filter((t) => t.trim().length > 0);
  if (validTexts.length === 0) return [];

  const { embeddings } = await embedMany({
    model: openrouter.embedding(EMBEDDING_MODEL),
    values: validTexts,
    maxRetries: 2,
  });

  return embeddings;
}

// ─── Chunk + embed + store pipeline ──────────────────────────

export interface StoredDocument {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  storage_path: string;
  chunkCount: number;
}

/**
 * Full processing pipeline:
 * 1. Extract text from the raw file buffer
 * 2. Split into overlapping chunks
 * 3. Generate embeddings for each chunk
 * 4. Store document metadata + chunks in the database
 */
export async function processAndStoreFile(
  supabase: SupabaseClient,
  params: {
    userId: string;
    workspaceId?: string;
    buffer: Buffer;
    filename: string;
    contentType: string;
    storagePath: string;
    sizeBytes: number;
  },
): Promise<StoredDocument> {
  const { userId, workspaceId, buffer, filename, contentType, storagePath, sizeBytes } =
    params;

  // 1. Extract text
  const text = await extractTextFromFile(buffer, contentType);

  if (!text.trim()) {
    throw new Error("No extractable text found in the file.");
  }

  // 2. Chunk
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    throw new Error("File text is empty after processing.");
  }

  // 3. Generate embeddings
  const embeddings = await generateEmbeddings(chunks);

  // 4. Insert document record
  const { data: doc, error: docError } = await supabase
    .from("cortex_documents")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      filename,
      content_type: contentType,
      size_bytes: sizeBytes,
      storage_path: storagePath,
    })
    .select("id")
    .single();

  if (docError || !doc) {
    throw new Error(`Failed to create document record: ${docError?.message}`);
  }

  // 5. Insert chunks with embeddings
  const chunkRows = chunks.map((content, index) => ({
    document_id: doc.id,
    user_id: userId,
    content,
    embedding: embeddings[index] ?? null,
    position: index,
  }));

  const { error: chunksError } = await supabase
    .from("cortex_document_chunks")
    .insert(chunkRows);

  if (chunksError) {
    // Clean up the document record if we can't save chunks
    await supabase.from("cortex_documents").delete().eq("id", doc.id);
    throw new Error(`Failed to store chunks: ${chunksError.message}`);
  }

  return {
    id: doc.id,
    filename,
    content_type: contentType,
    size_bytes: sizeBytes,
    storage_path: storagePath,
    chunkCount: chunks.length,
  };
}

// ─── Retrieval ───────────────────────────────────────────────

export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
  documentFilename: string;
  position: number;
}

/**
 * Search for chunks relevant to a user's query.
 * Generates an embedding for the query, then performs vector similarity search.
 */
export async function searchRelevantChunks(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  options: { limit?: number; minSimilarity?: number; workspaceId?: string } = {},
): Promise<RetrievedChunk[]> {
  const { limit = 5, minSimilarity = 0.5, workspaceId } = options;

  const queryText = query.trim();
  if (!queryText) return [];

  // Generate embedding for the query
  const embeddings = await generateEmbeddings([queryText]);
  if (embeddings.length === 0) return [];
  const queryEmbedding = embeddings[0];

  // Search via pgvector
  const { data, error } = await supabase.rpc("match_document_chunks", {
    p_user_id: userId,
    p_workspace_id: workspaceId ?? null,
    p_query_embedding: queryEmbedding,
    p_match_count: limit,
    p_min_similarity: minSimilarity,
  });

  if (error) {
    console.error("[rag] Vector search failed:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    documentId: row.document_id as string,
    content: row.content as string,
    similarity: row.similarity as number,
    documentFilename: row.document_filename as string,
    position: row.position as number,
  }));
}
