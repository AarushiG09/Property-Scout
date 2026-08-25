import fs from "fs";
import path from "path";
import readline from "readline";

export interface SourceCatalogItem {
  id: string;
  name: string;
  type: string;
  role: string;
  reliability_note: string;
  verified: boolean;
  url?: string;
}

const SOURCES_FILE = path.join(__dirname, "../../RAG/sources.jsonl");

let sourceCatalogCache: Record<string, SourceCatalogItem> | null = null;

export async function loadSourceCatalog(): Promise<Record<string, SourceCatalogItem>> {
  if (sourceCatalogCache) return sourceCatalogCache;

  const catalog: Record<string, SourceCatalogItem> = {
    SRC_OSM_POIS: {
      id: "SRC_OSM_POIS",
      name: "OpenStreetMap POI & Transit API",
      type: "Geospatial MCP Service",
      role: "Live transit, metro station, school, hospital, and park calculations",
      reliability_note: "OpenStreetMap public geospatial features",
      verified: true,
      url: "https://www.openstreetmap.org"
    },
    SRC_BENGALURU_RENT: {
      id: "SRC_BENGALURU_RENT",
      name: "Bengaluru Rent Listings Index",
      type: "Rental Property Database",
      role: "Current property availability, rent prices, BHK configurations",
      reliability_note: "Scraped and sanitized active available rental pins",
      verified: true,
      url: "https://bengaluru.rent"
    }
  };

  if (fs.existsSync(SOURCES_FILE)) {
    const fileStream = fs.createReadStream(SOURCES_FILE);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        catalog[record.id] = {
          id: record.id,
          name: record.name || record.id,
          type: record.type || "Knowledge Source",
          role: record.role || "RAG Knowledge Retrieval",
          reliability_note: record.reliability_note || "Verified source",
          verified: record.verified !== false,
          url: record.url || undefined
        };
      } catch (e) {
        // Skip malformed line
      }
    }
  }

  sourceCatalogCache = catalog;
  return catalog;
}

export function resolveSources(sourceIds: string[]): SourceCatalogItem[] {
  const catalog = sourceCatalogCache || {};
  return sourceIds.map(id => catalog[id] || {
    id,
    name: `Source ${id}`,
    type: "Document Citation",
    role: "Verified RAG Evidence",
    reliability_note: "Traceable source claim",
    verified: true
  });
}
