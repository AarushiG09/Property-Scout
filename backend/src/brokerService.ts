import { getDatabase, Broker, FIXED_BROKERS } from "./database";

export interface BookingRequestParams {
  listingId: string;
  propertyTitle: string;
  area: string;
  rent: number;
  visitDate: string;
  timeSlot: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
}

export type BookingResultReason = "ok" | "no_broker_available" | "invalid_time_slot" | "db_error";

export interface BookingResult {
  success: boolean;
  bookingId?: string;
  broker?: Broker;
  reason: BookingResultReason;
  message: string;
  availableSlots?: string[];
}

export const VALID_BUSINESS_SLOTS = ["10:30 AM", "02:00 PM", "05:30 PM"];

/**
 * Finds the first available broker for a given date and time slot.
 * Returns null if all 10 brokers are already booked.
 */
export function find_available_broker(visitDate: string, timeSlot: string): Broker | null {
  const db = getDatabase();
  const sql = `
    SELECT * FROM brokers
    WHERE broker_id NOT IN (
      SELECT broker_id FROM site_visit_bookings
      WHERE visit_date = ? AND time_slot = ? AND status = 'CONFIRMED'
    )
    ORDER BY broker_id ASC
    LIMIT 1
  `;
  const row = db.prepare(sql).get(visitDate, timeSlot) as Broker | undefined;
  return row || null;
}

/**
 * Returns a list of genuinely available business time slots on a given date
 * where at least one broker has zero bookings.
 */
export function find_open_time_slots(visitDate: string, excludeSlot?: string): string[] {
  const db = getDatabase();
  const openSlots: string[] = [];

  for (const slot of VALID_BUSINESS_SLOTS) {
    if (excludeSlot && slot === excludeSlot) continue;

    const countRow = db.prepare(`
      SELECT COUNT(DISTINCT broker_id) as booked_count
      FROM site_visit_bookings
      WHERE visit_date = ? AND time_slot = ? AND status = 'CONFIRMED'
    `).get(visitDate, slot) as { booked_count: number };

    // If fewer than 10 brokers are booked in this slot, it is open!
    if (countRow.booked_count < FIXED_BROKERS.length) {
      openSlots.push(slot);
    }
  }

  return openSlots;
}

/**
 * Atomic check-then-insert site visit booking.
 * Enforces database transactions and database-level UNIQUE(broker_id, visit_date, time_slot) constraints.
 */
export function book_visit(params: BookingRequestParams): BookingResult {
  const { listingId, propertyTitle, visitDate, timeSlot, buyerName, buyerEmail, buyerPhone } = params;

  // 1. Validate business slot
  if (!VALID_BUSINESS_SLOTS.includes(timeSlot)) {
    return {
      success: false,
      reason: "invalid_time_slot",
      message: `Invalid time slot "${timeSlot}". Valid slots are: ${VALID_BUSINESS_SLOTS.join(", ")}.`,
      availableSlots: VALID_BUSINESS_SLOTS
    };
  }

  const db = getDatabase();

  // 2. Perform atomic transaction check-and-insert
  const tx = db.transaction(() => {
    const availableBroker = find_available_broker(visitDate, timeSlot);
    if (!availableBroker) {
      return { success: false, reason: "no_broker_available" as const };
    }

    const bookingId = `VISIT-${Math.floor(100000 + Math.random() * 900000)}`;

    const insertStmt = db.prepare(`
      INSERT INTO site_visit_bookings (
        booking_id, broker_id, listing_id, property_title, buyer_name,
        buyer_email, buyer_phone, visit_date, time_slot, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')
    `);

    insertStmt.run(
      bookingId,
      availableBroker.broker_id,
      listingId,
      propertyTitle,
      buyerName,
      buyerEmail,
      buyerPhone,
      visitDate,
      timeSlot
    );

    return {
      success: true,
      reason: "ok" as const,
      bookingId,
      broker: availableBroker
    };
  });

  try {
    const res = tx();
    if (!res.success) {
      const openSlots = find_open_time_slots(visitDate, timeSlot);
      return {
        success: false,
        reason: "no_broker_available",
        message: `All 10 brokers are fully booked for ${timeSlot} on ${visitDate}. Please select another time slot.`,
        availableSlots: openSlots
      };
    }

    return {
      success: true,
      bookingId: res.bookingId,
      broker: res.broker,
      reason: "ok",
      message: `Site visit confirmed with broker ${res.broker!.name} for ${visitDate} at ${timeSlot}.`
    };
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT" || (err.message && err.message.includes("UNIQUE"))) {
      const openSlots = find_open_time_slots(visitDate, timeSlot);
      return {
        success: false,
        reason: "no_broker_available",
        message: `All 10 brokers are fully booked for ${timeSlot} on ${visitDate}. Please select another time slot.`,
        availableSlots: openSlots
      };
    }

    console.error("[BROKER SERVICE] Database booking error:", err);
    return {
      success: false,
      reason: "db_error",
      message: "The site visit booking could not be confirmed right now due to a storage error. Please try again."
    };
  }
}
