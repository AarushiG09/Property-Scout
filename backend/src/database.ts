import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import { SanitizedListing } from "./piiSanitizer";

const DB_DIR = path.join(__dirname, "../data");
const DB_PATH = path.join(DB_DIR, "listings.db");

let dbInstance: Database.Database | null = null;

export interface ListingRow {
  id: number;
  external_id: string;
  title: string;
  rent: number;
  bedrooms: number;
  furnishing: string;
  amenities: string;
  society_name: string;
  sqft: number;
  availability_status: string;
  latitude: number;
  longitude: number;
  area: string;
  description: string;
  created_at: string;
}

export interface Broker {
  broker_id: number;
  name: string;
  phone: string;
  email: string;
}

export interface BookingRow {
  booking_id: string;
  broker_id: number;
  listing_id: string;
  property_title: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  visit_date: string;
  time_slot: string;
  status: string;
  created_at: string;
}

export const FIXED_BROKERS: Broker[] = [
  { broker_id: 1, name: "Rajesh Kumar", phone: "+91 98450 11001", email: "rajesh.kumar@propertyscout.ai" },
  { broker_id: 2, name: "Ananya Sharma", phone: "+91 98450 11002", email: "ananya.sharma@propertyscout.ai" },
  { broker_id: 3, name: "Vikram Patel", phone: "+91 98450 11003", email: "vikram.patel@propertyscout.ai" },
  { broker_id: 4, name: "Priya Nair", phone: "+91 98450 11004", email: "priya.nair@propertyscout.ai" },
  { broker_id: 5, name: "Siddharth Rao", phone: "+91 98450 11005", email: "siddharth.rao@propertyscout.ai" },
  { broker_id: 6, name: "Kavita Reddy", phone: "+91 98450 11006", email: "kavita.reddy@propertyscout.ai" },
  { broker_id: 7, name: "Arjun Mehta", phone: "+91 98450 11007", email: "arjun.mehta@propertyscout.ai" },
  { broker_id: 8, name: "Deepika Joshi", phone: "+91 98450 11008", email: "deepika.joshi@propertyscout.ai" },
  { broker_id: 9, name: "Rohan Verma", phone: "+91 98450 11009", email: "rohan.verma@propertyscout.ai" },
  { broker_id: 10, name: "Sneha Kapoor", phone: "+91 98450 11010", email: "sneha.kapoor@propertyscout.ai" }
];

export type ParsedListing = Omit<ListingRow, "amenities" | "id" | "created_at"> & {
  id?: number;
  created_at?: string;
  amenities: string[];
  snapshot?: any;
};

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma("journal_mode = WAL");
  }
  return dbInstance;
}

export function initDatabase(): void {
  const db = getDatabase();

  const createListingsTable = `
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      rent INTEGER NOT NULL,
      bedrooms INTEGER NOT NULL,
      furnishing TEXT NOT NULL,
      amenities TEXT NOT NULL,
      society_name TEXT NOT NULL,
      sqft INTEGER NOT NULL,
      availability_status TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      area TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createBrokersTable = `
    CREATE TABLE IF NOT EXISTS brokers (
      broker_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL
    );
  `;

  const createBookingsTable = `
    CREATE TABLE IF NOT EXISTS site_visit_bookings (
      booking_id TEXT PRIMARY KEY,
      broker_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      property_title TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      buyer_email TEXT NOT NULL,
      buyer_phone TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      status TEXT DEFAULT 'CONFIRMED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (broker_id) REFERENCES brokers (broker_id),
      CONSTRAINT unique_broker_slot UNIQUE (broker_id, visit_date, time_slot)
    );
  `;

export const DEFAULT_SEED_LISTINGS = [
  {
    external_id: "brent_koramangala_101",
    title: "Spacious 2BHK Apartment in Koramangala 4th Block",
    rent: 35000,
    bedrooms: 2,
    furnishing: "Semi-Furnished",
    amenities: ["Power Backup", "Car Parking", "Elevator", "Security"],
    society_name: "Prestige Pinewood",
    sqft: 1200,
    availability_status: "Available",
    latitude: 12.9352,
    longitude: 77.6245,
    area: "Koramangala",
    description: "Well maintained 2BHK near Sony World Signal in Koramangala 4th Block."
  },
  {
    external_id: "brent_koramangala_102",
    title: "Luxury 3BHK Penthouse in Koramangala 3rd Block",
    rent: 65000,
    bedrooms: 3,
    furnishing: "Fully-Furnished",
    amenities: ["Swimming Pool", "Gym", "Clubhouse", "Covered Parking"],
    society_name: "Raheja Residency",
    sqft: 2100,
    availability_status: "Available",
    latitude: 12.9318,
    longitude: 77.6220,
    area: "Koramangala",
    description: "High end penthouse with balcony view in Koramangala 3rd Block."
  },
  {
    external_id: "brent_indiranagar_201",
    title: "Modern 2BHK near 100 Feet Road Indiranagar",
    rent: 42000,
    bedrooms: 2,
    furnishing: "Fully-Furnished",
    amenities: ["Balcony", "Metro Connectivity", "24/7 Water", "Security"],
    society_name: "Indiranagar Palms",
    sqft: 1350,
    availability_status: "Available",
    latitude: 12.9784,
    longitude: 77.6408,
    area: "Indiranagar",
    description: "5 mins walk to Indiranagar Metro Station near 100 Feet Road."
  },
  {
    external_id: "brent_indiranagar_202",
    title: "Compact 1BHK Flat in Indiranagar 1st Stage",
    rent: 24000,
    bedrooms: 1,
    furnishing: "Semi-Furnished",
    amenities: ["Bike Parking", "Geyser", "CCTV"],
    society_name: "Standalone Building",
    sqft: 650,
    availability_status: "Available",
    latitude: 12.9719,
    longitude: 77.6412,
    area: "Indiranagar",
    description: "Ideal for working professionals in Indiranagar 1st Stage."
  },
  {
    external_id: "brent_hsr_301",
    title: "Premium 3BHK Apartment in HSR Layout Sector 1",
    rent: 48000,
    bedrooms: 3,
    furnishing: "Semi-Furnished",
    amenities: ["Gated Community", "Gym", "Car Parking", "Children Play Area"],
    society_name: "Purva Fairmont",
    sqft: 1650,
    availability_status: "Available",
    latitude: 12.9121,
    longitude: 77.6446,
    area: "HSR Layout",
    description: "Spacious layout with modular kitchen in HSR Layout Sector 1."
  },
  {
    external_id: "brent_hsr_302",
    title: "Affordable 2BHK in HSR Layout Sector 3",
    rent: 32000,
    bedrooms: 2,
    furnishing: "Unfurnished",
    amenities: ["Parking", "Water Supply"],
    society_name: "HSR Heights",
    sqft: 1100,
    availability_status: "Available",
    latitude: 12.9110,
    longitude: 77.6380,
    area: "HSR Layout",
    description: "Close to NIFT and BDA Complex in HSR Layout Sector 3."
  },
  {
    external_id: "brent_bellandur_401",
    title: "2BHK Flat near Ecospace Bellandur Outer Ring Road",
    rent: 38000,
    bedrooms: 2,
    furnishing: "Semi-Furnished",
    amenities: ["Power Backup", "Gym", "Security", "Visitor Parking"],
    society_name: "Green Glen Layout Apartments",
    sqft: 1250,
    availability_status: "Available",
    latitude: 12.9260,
    longitude: 77.6762,
    area: "Bellandur",
    description: "Walkable distance to RMZ Ecospace in Bellandur."
  },
  {
    external_id: "brent_whitefield_501",
    title: "3BHK Luxury Apartment near ITPL Whitefield",
    rent: 45000,
    bedrooms: 3,
    furnishing: "Fully-Furnished",
    amenities: ["Swimming Pool", "Tennis Court", "Clubhouse", "Metro Access"],
    society_name: "Prestige Shantiniketan",
    sqft: 1800,
    availability_status: "Available",
    latitude: 12.9857,
    longitude: 77.7314,
    area: "Whitefield",
    description: "Directly opposite ITPL Whitefield."
  },
  {
    external_id: "brent_hebbal_601",
    title: "3BHK Lake View Flat near Hebbal Flyover",
    rent: 55000,
    bedrooms: 3,
    furnishing: "Semi-Furnished",
    amenities: ["Lake View", "Clubhouse", "Covered Parking", "24h Power"],
    society_name: "Godrej Woodsman Estate",
    sqft: 1950,
    availability_status: "Available",
    latitude: 13.0359,
    longitude: 77.5970,
    area: "Hebbal",
    description: "Quick access to Airport Road near Hebbal Flyover."
  },
  {
    external_id: "brent_btm_701",
    title: "Budget 2BHK in BTM Layout 2nd Stage",
    rent: 28000,
    bedrooms: 2,
    furnishing: "Semi-Furnished",
    amenities: ["Balcony", "Parking", "Water Storage"],
    society_name: "BTM Central Residency",
    sqft: 1050,
    availability_status: "Available",
    latitude: 12.9166,
    longitude: 77.6101,
    area: "BTM Layout",
    description: "Near BTM Lake and Ring Road bus stop in BTM 2nd Stage."
  },
  {
    external_id: "brent_rajajinagar_801",
    title: "3BHK Apartment near Orion Mall Rajajinagar",
    rent: 50000,
    bedrooms: 3,
    furnishing: "Semi-Furnished",
    amenities: ["Metro Access", "Mall Proximity", "Security", "Elevator"],
    society_name: "Brigade Gateway",
    sqft: 1700,
    availability_status: "Available",
    latitude: 12.9982,
    longitude: 77.5558,
    area: "Rajajinagar",
    description: "Connected to World Trade Center and Orion Mall in Rajajinagar."
  },
  {
    external_id: "brent_jayanagar_901",
    title: "Traditional 2BHK Independent House in Jayanagar 4th Block",
    rent: 36000,
    bedrooms: 2,
    furnishing: "Semi-Furnished",
    amenities: ["Garden", "Car Parking", "Metro Access"],
    society_name: "Jayanagar Heritage Home",
    sqft: 1300,
    availability_status: "Available",
    latitude: 12.9250,
    longitude: 77.5838,
    area: "Jayanagar",
    description: "Close to Jayanagar BDA Complex and Metro Station."
  }
];

  db.exec(createListingsTable);
  db.exec(createBrokersTable);
  db.exec(createBookingsTable);

  // Seed exactly 10 brokers into database if missing
  const insertBrokerStmt = db.prepare(`
    INSERT OR REPLACE INTO brokers (broker_id, name, phone, email)
    VALUES (@broker_id, @name, @phone, @email)
  `);

  const seedTx = db.transaction(() => {
    for (const broker of FIXED_BROKERS) {
      insertBrokerStmt.run(broker);
    }
  });
  seedTx();

  // Auto-seed initial listings if listings table is empty
  const countRow = db.prepare("SELECT COUNT(*) as count FROM listings").get() as { count: number };
  if (!countRow || countRow.count === 0) {
    const insertListingStmt = db.prepare(`
      INSERT OR REPLACE INTO listings (
        external_id, title, rent, bedrooms, furnishing, amenities,
        society_name, sqft, availability_status, latitude, longitude, area, description
      ) VALUES (
        @external_id, @title, @rent, @bedrooms, @furnishing, @amenities,
        @society_name, @sqft, @availability_status, @latitude, @longitude, @area, @description
      )
    `);

    const seedListingsTx = db.transaction(() => {
      for (const item of DEFAULT_SEED_LISTINGS) {
        insertListingStmt.run({
          ...item,
          amenities: JSON.stringify(item.amenities)
        });
      }
    });
    seedListingsTx();
    console.log(`Seeded ${DEFAULT_SEED_LISTINGS.length} initial Bengaluru property listings into SQLite database.`);
  }

  console.log(`Database initialized at: ${DB_PATH} with 10 brokers and UNIQUE(broker_id, visit_date, time_slot) constraint.`);
}

export function saveListings(listings: SanitizedListing[]): { inserted: number; skipped: number } {
  const db = getDatabase();

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO listings (
      external_id, title, rent, bedrooms, furnishing, amenities,
      society_name, sqft, availability_status, latitude, longitude, area, description
    ) VALUES (
      @external_id, @title, @rent, @bedrooms, @furnishing, @amenities,
      @society_name, @sqft, @availability_status, @latitude, @longitude, @area, @description
    )
  `);

  let inserted = 0;
  let skipped = 0;

  const transaction = db.transaction((items: SanitizedListing[]) => {
    for (const item of items) {
      if (item.availability_status.toLowerCase() !== "available") {
        skipped++;
        continue;
      }

      insertStmt.run({
        external_id: item.external_id,
        title: item.title,
        rent: item.rent,
        bedrooms: item.bedrooms,
        furnishing: item.furnishing,
        amenities: JSON.stringify(item.amenities),
        society_name: item.society_name,
        sqft: item.sqft,
        availability_status: item.availability_status,
        latitude: item.latitude,
        longitude: item.longitude,
        area: item.area,
        description: item.description
      });
      inserted++;
    }
  });

  transaction(listings);
  return { inserted, skipped };
}

export function getAllAvailableListings(): ParsedListing[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM listings WHERE LOWER(availability_status) = 'available' ORDER BY id DESC").all() as ListingRow[];
  return rows.map(r => ({
    external_id: r.external_id,
    title: r.title,
    rent: r.rent,
    bedrooms: r.bedrooms,
    furnishing: r.furnishing,
    amenities: JSON.parse(r.amenities || "[]"),
    society_name: r.society_name,
    sqft: r.sqft,
    availability_status: r.availability_status,
    latitude: r.latitude,
    longitude: r.longitude,
    area: r.area,
    description: r.description,
    snapshot: {
      bhk: `${r.bedrooms} BHK`,
      locality: r.area,
      pricing: `₹${r.rent.toLocaleString('en-IN')}/mo`,
      verified_amenities: JSON.parse(r.amenities || "[]"),
      commute_summary: `Located in ${r.area}. ${r.furnishing} ${r.bedrooms} BHK (${r.sqft} sqft).`
    }
  }));
}

export function insertSingleListing(item: {
  title: string;
  rent: number;
  bedrooms: number;
  furnishing: string;
  amenities: string[];
  society_name?: string;
  sqft: number;
  availabilityStatus?: string;
  latitude: number;
  longitude: number;
  area: string;
  description?: string;
}): ParsedListing {
  const db = getDatabase();
  const external_id = "seller-prop-" + Math.random().toString(36).substring(2, 9);
  const availability_status = item.availabilityStatus || "Available";
  const society_name = item.society_name || item.area;
  const description = item.description || `${item.title} in ${item.area}. ${item.bedrooms} BHK ${item.furnishing} (${item.sqft} sqft).`;

  const insertStmt = db.prepare(`
    INSERT INTO listings (
      external_id, title, rent, bedrooms, furnishing, amenities,
      society_name, sqft, availability_status, latitude, longitude, area, description
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  insertStmt.run(
    external_id,
    item.title,
    item.rent,
    item.bedrooms,
    item.furnishing,
    JSON.stringify(item.amenities || []),
    society_name,
    item.sqft,
    availability_status,
    item.latitude,
    item.longitude,
    item.area,
    description
  );

  return {
    external_id,
    title: item.title,
    rent: item.rent,
    bedrooms: item.bedrooms,
    furnishing: item.furnishing,
    amenities: item.amenities || [],
    society_name,
    sqft: item.sqft,
    availability_status,
    latitude: item.latitude,
    longitude: item.longitude,
    area: item.area,
    description,
    snapshot: {
      bhk: `${item.bedrooms} BHK`,
      locality: item.area,
      pricing: `₹${item.rent.toLocaleString('en-IN')}/mo`,
      verified_amenities: item.amenities || [],
      commute_summary: `Located in ${item.area}. ${item.furnishing} ${item.bedrooms} BHK (${item.sqft} sqft).`
    }
  };
}

export function getListingCount(): number {
  const db = getDatabase();
  const row = db.prepare("SELECT COUNT(*) as count FROM listings").get() as { count: number };
  return row.count;
}
