export interface PoiItem {
  name: string;
  category: "transit" | "metro" | "hospital" | "school" | "park" | "restaurant" | "grocery";
  distance_km: number;
  latitude: number;
  longitude: number;
}

export interface NeighborhoodSnapshot {
  transit_points: PoiItem[];
  nearest_metro: PoiItem | null;
  essential_pois: PoiItem[];
  commute_summary: string;
}

export interface Listing {
  id: number;
  external_id: string;
  title: string;
  rent: number;
  bedrooms: number;
  furnishing: string;
  amenities: string[];
  society_name: string;
  sqft: number;
  availability_status: string;
  latitude: number;
  longitude: number;
  area: string;
  description: string;
  snapshot?: NeighborhoodSnapshot;
  image_url?: string;
}

export interface SourceCatalogItem {
  id: string;
  name: string;
  type: string;
  role: string;
  reliability_note: string;
  verified: boolean;
  url?: string;
}

export interface RagSearchResult {
  id: string;
  locality?: string;
  region?: string;
  content: string;
  sources: string[];
  do_not_infer: string[];
  similarity: number;
}

export interface UserPreferences {
  maxRent?: number;
  minRent?: number;
  bedrooms?: number;
  area?: string;
  furnishing?: string;
  commuteAnchor?: string;
  clarifyingQuestionsCount: number;
}

export interface AgentQueryResult {
  success: boolean;
  response_text: string;
  shortlist: Listing[];
  sources: SourceCatalogItem[];
  retrieved_rag_context: RagSearchResult[];
  clarifying_question_asked: boolean;
  preferences: UserPreferences;
}
