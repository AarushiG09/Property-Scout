import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

const DB_DIR = path.join(__dirname, "../data");
const RAG_DB_PATH = path.join(DB_DIR, "rag_vectors.db");

let ragDbInstance: Database.Database | null = null;
let extractorPipeline: any = null;

export interface RagChunkRecord {
  id: string;
  source_id?: string;
  document_type: string;
  locality?: string;
  region?: string;
  embedding_text: string;
  content: string;
  sources: string[];
  supported_topics: string[];
  do_not_infer: string[];
  metadata: Record<string, any>;
  vector: number[];
}

export interface RagSearchResult extends RagChunkRecord {
  similarity: number;
}

/**
 * Generates normalized 384-dimensional dense vector embeddings using BAAI/bge-small-en-v1.5.
 */
export async function generateBgeEmbedding(text: string): Promise<number[]> {
  try {
    if (!extractorPipeline) {
      const transformers = await import("@xenova/transformers");
      extractorPipeline = await transformers.pipeline("feature-extraction", "Xenova/bge-small-en-v1.5");
    }
    const output = await extractorPipeline(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  } catch (err: any) {
    return generateFallbackEmbedding(text, 384);
  }
}

/**
 * Fallback deterministic normalized 384-dimensional vector generator.
 */
function generateFallbackEmbedding(text: string, dimensions: number = 384): number[] {
  const vec = new Array(dimensions).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = (i * 31 + charCode) % dimensions;
    vec[index] += Math.sin(charCode + i);
  }
  let norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) norm = 1;
  return vec.map(val => val / norm);
}

export function getRagDatabase(): Database.Database {
  if (!ragDbInstance) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    ragDbInstance = new Database(RAG_DB_PATH);
    ragDbInstance.pragma("journal_mode = WAL");
  }
  return ragDbInstance;
}

export function initRagDatabase(): void {
  const db = getRagDatabase();

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS rag_chunks (
      id TEXT PRIMARY KEY,
      source_id TEXT,
      document_type TEXT NOT NULL,
      locality TEXT,
      region TEXT,
      embedding_text TEXT NOT NULL,
      content TEXT NOT NULL,
      sources_json TEXT NOT NULL,
      supported_topics_json TEXT NOT NULL,
      do_not_infer_json TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      vector_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.exec(createTableQuery);
}

export function saveRagChunk(chunk: RagChunkRecord): void {
  const db = getRagDatabase();

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO rag_chunks (
      id, source_id, document_type, locality, region,
      embedding_text, content, sources_json, supported_topics_json,
      do_not_infer_json, metadata_json, vector_json
    ) VALUES (
      @id, @source_id, @document_type, @locality, @region,
      @embedding_text, @content, @sources_json, @supported_topics_json,
      @do_not_infer_json, @metadata_json, @vector_json
    )
  `);

  insertStmt.run({
    id: chunk.id,
    source_id: chunk.source_id || (chunk.sources.length > 0 ? chunk.sources[0] : "SRC_UNKNOWN"),
    document_type: chunk.document_type,
    locality: chunk.locality || "",
    region: chunk.region || "",
    embedding_text: chunk.embedding_text,
    content: chunk.content,
    sources_json: JSON.stringify(chunk.sources || []),
    supported_topics_json: JSON.stringify(chunk.supported_topics || []),
    do_not_infer_json: JSON.stringify(chunk.do_not_infer || []),
    metadata_json: JSON.stringify(chunk.metadata || {}),
    vector_json: JSON.stringify(chunk.vector)
  });
}

/**
 * Calculates cosine similarity between two normalized vector embeddings.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Perform semantic similarity search over stored RAG vector chunks.
 */
export function searchRagChunks(queryVector: number[], topK: number = 3): RagSearchResult[] {
  const db = getRagDatabase();
  const rows = db.prepare("SELECT * FROM rag_chunks").all() as any[];

  const results: RagSearchResult[] = rows.map(r => {
    const vector: number[] = JSON.parse(r.vector_json || "[]");
    const similarity = cosineSimilarity(queryVector, vector);

    return {
      id: r.id,
      source_id: r.source_id,
      document_type: r.document_type,
      locality: r.locality,
      region: r.region,
      embedding_text: r.embedding_text,
      content: r.content,
      sources: JSON.parse(r.sources_json || "[]"),
      supported_topics: JSON.parse(r.supported_topics_json || "[]"),
      do_not_infer: JSON.parse(r.do_not_infer_json || "[]"),
      metadata: JSON.parse(r.metadata_json || "{}"),
      vector,
      similarity
    };
  });

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

export function getRagChunkCount(): number {
  const db = getRagDatabase();
  const row = db.prepare("SELECT COUNT(*) as count FROM rag_chunks").get() as { count: number };
  return row.count;
}
