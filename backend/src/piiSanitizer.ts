/**
 * PII Sanitizer Module
 * Strips owner names, phone numbers, email addresses, and contact details from property listing metadata.
 */

export interface ListingInput {
  external_id?: string;
  title: string;
  rent: number;
  bedrooms: number;
  furnishing?: string;
  amenities?: string[];
  society_name?: string;
  sqft?: number;
  availability_status: string;
  latitude: number;
  longitude: number;
  area: string;
  description?: string;
  contact_person?: string;
  phone_number?: string;
  email?: string;
}

export interface SanitizedListing {
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
}

/**
 * Strips phone numbers, email addresses, and personal contact info from raw strings.
 */
export function sanitizeText(text: string): string {
  if (!text) return "";

  // Match Indian phone numbers (+91, 10-digit numbers, numbers with spaces/dashes)
  const phoneRegex = /(?:(?:\+?91[\s-]?)?\(?\d{3,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}|\b\d{10}\b|\b\d{5}[\s-]\d{5}\b)/gi;

  // Match email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

  // Match phrases like "Contact Ram at", "Call Sharma", "Agent:", "Owner:"
  const contactPhraseRegex = /\b(?:contact|call|reach out to|agent|owner|broker|managed by|posted by)\s+:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/gi;

  return text
    .replace(phoneRegex, "[REDACTED_PHONE]")
    .replace(emailRegex, "[REDACTED_EMAIL]")
    .replace(contactPhraseRegex, "[REDACTED_CONTACT]")
    .trim();
}

/**
 * Sanitizes a raw listing object by stripping PII and normalizing fields.
 */
export function sanitizeListing(input: ListingInput): SanitizedListing {
  const cleanTitle = sanitizeText(input.title);
  const cleanDescription = sanitizeText(input.description || "");
  const cleanSociety = sanitizeText(input.society_name || "Independent");

  // Generate a clean external ID if missing
  const id = input.external_id || `listing_${Math.abs(input.latitude).toFixed(4)}_${Math.abs(input.longitude).toFixed(4)}_${input.bedrooms}bhk_${input.rent}`;

  return {
    external_id: id,
    title: cleanTitle,
    rent: Number(input.rent) || 0,
    bedrooms: Number(input.bedrooms) || 1,
    furnishing: input.furnishing || "Semi-Furnished",
    amenities: Array.isArray(input.amenities) ? input.amenities.map(a => sanitizeText(a)) : [],
    society_name: cleanSociety,
    sqft: Number(input.sqft) || 1000,
    availability_status: input.availability_status || "Available",
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    area: sanitizeText(input.area),
    description: cleanDescription
  };
}
