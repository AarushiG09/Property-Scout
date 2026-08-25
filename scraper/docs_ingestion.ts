import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { initRagDatabase, saveRagChunk, getRagChunkCount, searchRagChunks, generateBgeEmbedding, RagChunkRecord } from "../backend/src/ragStore";

const RAG_DIR = path.join(__dirname, "../RAG");
const LOCALITIES_FILE = path.join(RAG_DIR, "localities.jsonl");
const SAFETY_FILE = path.join(RAG_DIR, "safety_sources.jsonl");
const SOURCES_FILE = path.join(RAG_DIR, "sources.jsonl");
const README_FILE = path.join(RAG_DIR, "README.md");

/**
 * Parse JSONL file line by line
 */
async function parseJsonlFile<T>(filePath: string): Promise<T[]> {
  const records: T[] = [];
  if (!fs.existsSync(filePath)) return records;

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch (e) {
      console.warn(`Failed to parse line in ${path.basename(filePath)}`);
    }
  }
  return records;
}

export async function runDocsIngestion(): Promise<void> {
  console.log("====================================================");
  console.log("  PROPERTY SCOUT - PHASE 2: RAG INGESTION & VECTOR DB");
  console.log("====================================================");

  // Initialize RAG Database
  initRagDatabase();

  let totalIngested = 0;
  let localitiesCount = 0;
  let safetyCount = 0;

  // 1. Process localities.jsonl (Record-Level Chunking)
  console.log(`Reading local knowledge base: ${LOCALITIES_FILE}...`);
  const localityRecords = await parseJsonlFile<any>(LOCALITIES_FILE);

  for (const record of localityRecords) {
    const embeddingText = `Locality: ${record.locality}. Region: ${record.region}. ` +
      `Document Type: ${record.document_type || "neighborhood_profile"}. ` +
      `Topics: ${(record.supported_topics || []).join(", ")}. ` +
      `Restrictions: Do not infer ${(record.do_not_infer || []).join(", ")}. ` +
      `Content: ${record.content}`;

    const vector = await generateBgeEmbedding(embeddingText);

    const chunkRecord: RagChunkRecord = {
      id: record.id,
      source_id: (record.sources && record.sources.length > 0) ? record.sources[0] : "SRC_WIKI_NEIGHBORHOODS",
      document_type: record.document_type || "neighborhood_profile",
      locality: record.locality,
      region: record.region,
      embedding_text: embeddingText,
      content: record.content,
      sources: record.sources || [],
      supported_topics: record.supported_topics || [],
      do_not_infer: record.do_not_infer || [],
      metadata: {
        id: record.id,
        locality: record.locality,
        region: record.region,
        sources: record.sources,
        supported_topics: record.supported_topics,
        do_not_infer: record.do_not_infer
      },
      vector
    };

    saveRagChunk(chunkRecord);
    localitiesCount++;
    totalIngested++;
  }

  // 2. Process safety_sources.jsonl (Record-Level Chunking)
  console.log(`Reading safety knowledge base: ${SAFETY_FILE}...`);
  const safetyRecords = await parseJsonlFile<any>(SAFETY_FILE);

  for (const record of safetyRecords) {
    const embeddingText = `Safety Title: ${record.title}. Source ID: ${record.source_id}. ` +
      `Publisher: ${record.publisher}. Year: ${record.year}. Updated: ${record.updated}. ` +
      `Usage Policy: ${record.usage}. ` +
      `Allowed Claims: ${(record.allowed_claims || []).join(", ")}. ` +
      `Forbidden Inferences: ${(record.forbidden_inference || []).join(", ")}`;

    const vector = await generateBgeEmbedding(embeddingText);

    const chunkRecord: RagChunkRecord = {
      id: record.id,
      source_id: record.source_id || "SRC_KAR_POLICE_CRIME_2025",
      document_type: "safety_profile",
      locality: "Bengaluru Metropolitan Region",
      region: "State/City Level",
      embedding_text: embeddingText,
      content: record.usage,
      sources: [record.source_id],
      supported_topics: record.allowed_claims || ["crime_statistics"],
      do_not_infer: record.forbidden_inference || ["safe", "unsafe", "safe at night"],
      metadata: {
        id: record.id,
        title: record.title,
        publisher: record.publisher,
        year: record.year,
        updated: record.updated,
        allowed_claims: record.allowed_claims,
        forbidden_inference: record.forbidden_inference
      },
      vector
    };

    saveRagChunk(chunkRecord);
    safetyCount++;
    totalIngested++;
  }

  // 3. Process README.md guidelines chunk
  if (fs.existsSync(README_FILE)) {
    const readmeContent = fs.readFileSync(README_FILE, "utf-8");
    const embeddingText = `RAG Grounding & Policy Guidelines: ${readmeContent}`;
    const vector = await generateBgeEmbedding(embeddingText);

    saveRagChunk({
      id: "rag_system_readme_guidelines",
      source_id: "SRC_RAG_README",
      document_type: "system_policy",
      locality: "Bengaluru",
      region: "System",
      embedding_text: embeddingText,
      content: "RAG Knowledge Base Guidelines: Every factual claim returned from RAG must have a source citation. If no reliable source supports a claim, the agent must not invent one.",
      sources: ["SRC_RAG_README"],
      supported_topics: ["grounding_policy", "citation_policy"],
      do_not_infer: ["unsupported_claims"],
      metadata: { source_file: "README.md" },
      vector
    });
    totalIngested++;
  }

  console.log("\n--- PHASE 2 INGESTION SUMMARY ---");
  console.log(`Localities Chunks Ingested  : ${localitiesCount}`);
  console.log(`Safety Records Ingested    : ${safetyCount}`);
  console.log(`Total RAG Chunks Persisted : ${getRagChunkCount()}`);
  console.log(`Embedding Model Executed   : BAAI/bge-small-en-v1.5`);
  console.log(`Chunking Strategy          : Record-Level Chunking (Zero factual claim splitting)`);

  // Perform semantic retrieval check for "What is Koramangala like?"
  console.log("\n--- SEMANTIC RETRIEVAL TEST: 'What is Koramangala like?' ---");
  const testQueryVector = await generateBgeEmbedding("What is Koramangala like?");
  const searchResults = searchRagChunks(testQueryVector, 2);

  for (let i = 0; i < searchResults.length; i++) {
    const res = searchResults[i];
    console.log(`\nMatch #${i + 1} (Score: ${(res.similarity * 100).toFixed(2)}%)`);
    console.log(`ID       : ${res.id}`);
    console.log(`Locality : ${res.locality} (${res.region})`);
    console.log(`Content  : "${res.content}"`);
    console.log(`Sources  : ${JSON.stringify(res.sources)}`);
    console.log(`Do Not Infer: ${JSON.stringify(res.do_not_infer)}`);
  }
  console.log("====================================================\n");
}

if (require.main === module) {
  runDocsIngestion().catch(console.error);
}
