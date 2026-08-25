import nodemailer from "nodemailer";
import { config } from "./config";
import { Broker } from "./database";

export interface SiteVisitBookingInfo {
  bookingId: string;
  propertyTitle: string;
  area: string;
  rent: number;
  date: string;
  timeSlot: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  broker: Broker;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  googleCalendarUrl?: string;
  isRealDelivery?: boolean;
  error?: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;

/**
 * Computes UTC ISO string for Google Calendar & iCal event rendering from IST date/timeSlot.
 */
export function getUtcTimes(dateStr: string, timeSlot: string): { startUtc: string; endUtc: string } {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] || 2026;
  const month = (parts[1] || 8) - 1;
  const day = parts[2] || 25;

  let hour = 10;
  let minute = 30;

  if (timeSlot.includes("02:00 PM") || timeSlot.includes("2:00")) {
    hour = 14;
    minute = 0;
  } else if (timeSlot.includes("05:30 PM") || timeSlot.includes("5:30")) {
    hour = 17;
    minute = 30;
  }

  // IST is UTC + 5:30. Subtract 5h 30m for UTC
  const startDate = new Date(Date.UTC(year, month, day, hour - 5, minute - 30));
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour appointment duration

  const formatUtc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { startUtc: formatUtc(startDate), endUtc: formatUtc(endDate) };
}

/**
 * Generates a 1-click Google Calendar Event creation URL.
 */
export function generateGoogleCalendarUrl(info: SiteVisitBookingInfo): string {
  const { startUtc, endUtc } = getUtcTimes(info.date, info.timeSlot);
  const title = `Site Visit: ${info.propertyTitle}`;
  const details = `Property Scout Site Visit Appointment\nBooking ID: ${info.bookingId}\nAssigned Scout Agent: ${info.broker.name} (${info.broker.phone})\nLocality: ${info.area}, Bengaluru\nBuyer: ${info.buyerName} (${info.buyerPhone})`;
  const location = `${info.area}, Bengaluru`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startUtc}/${endUtc}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
}

/**
 * Generates RFC 5545 iCalendar (.ics) event string.
 */
export function generateIcalEventContent(info: SiteVisitBookingInfo, senderEmail: string): string {
  const { startUtc, endUtc } = getUtcTimes(info.date, info.timeSlot);
  const nowUtc = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Property Scout AI//Site Visit Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${info.bookingId}@propertyscout.ai`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:Site Visit: ${info.propertyTitle} with ${info.broker.name}`,
    `DESCRIPTION:Property Scout Site Visit Appointment\\nBooking ID: ${info.bookingId}\\nAssigned Agent: ${info.broker.name} (${info.broker.phone})\\nLocation: ${info.area}\\, Bengaluru\\nBuyer: ${info.buyerName} (${info.buyerPhone})`,
    `LOCATION:${info.area}\\, Bengaluru`,
    `ORGANIZER;CN=Property Scout AI:mailto:${senderEmail}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${info.buyerName}:mailto:${info.buyerEmail}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

/**
 * Initializes Nodemailer transporter.
 */
async function getTransporter(): Promise<{ transporter: nodemailer.Transporter; isTest: boolean }> {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, isTest: !(process.env.GMAIL_USER || process.env.SMTP_HOST) };
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    console.log(`[EMAIL SERVICE] Initializing Live Gmail Transporter for sender: ${process.env.GMAIL_USER}`);
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER.trim(),
        pass: process.env.GMAIL_PASS.replace(/\s+/g, "")
      }
    });
    return { transporter: cachedTransporter, isTest: false };
  }

  if (process.env.GMAIL_USER && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    console.log(`[EMAIL SERVICE] Initializing Google OAuth2 Gmail Transporter for sender: ${process.env.GMAIL_USER}`);
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_USER.trim(),
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN
      }
    });
    return { transporter: cachedTransporter, isTest: false };
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log(`[EMAIL SERVICE] Initializing Custom SMTP Transporter (${process.env.SMTP_HOST})`);
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return { transporter: cachedTransporter, isTest: false };
  }

  console.warn("[EMAIL SERVICE] No live Gmail/SMTP credentials found in .env. Using Ethereal sandbox preview.");
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    return { transporter: cachedTransporter, isTest: true };
  } catch (err) {
    console.warn("[EMAIL SERVICE] Failed to create Ethereal test account, using JSON transport fallback:", err);
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true
    });
    return { transporter: cachedTransporter, isTest: true };
  }
}

/**
 * Sends a site visit confirmation email with embedded Google Calendar event & iCal attachment.
 */
export async function sendSiteVisitConfirmationEmail(info: SiteVisitBookingInfo): Promise<EmailResult> {
  try {
    const { transporter, isTest } = await getTransporter();
    const senderEmail = process.env.GMAIL_USER || process.env.SMTP_USER || "noreply@propertyscout.ai";

    const formattedRent = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(info.rent);

    const googleCalendarUrl = generateGoogleCalendarUrl(info);
    const icalContent = generateIcalEventContent(info, senderEmail);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #e2e8f0; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 30px 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0 0; color: #ccfbf1; font-size: 14px; font-weight: 500; }
        .body-content { padding: 30px 24px; }
        .code-badge { background: #0f172a; border: 1px solid #0d9488; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; }
        .code-badge label { display: block; font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 4px; }
        .code-badge span { font-family: monospace; font-size: 26px; font-weight: 800; color: #2dd4bf; letter-spacing: 2px; }
        .gcal-btn { display: inline-block; background: #0d9488; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; margin: 16px 0 24px 0; text-align: center; box-shadow: 0 4px 12px rgba(13,148,136,0.4); }
        .section-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 18px; margin-bottom: 20px; }
        .section-title { font-size: 13px; font-weight: 700; color: #2dd4bf; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
        .detail-label { color: #94a3b8; font-weight: 500; }
        .detail-val { color: #f8fafc; font-weight: 600; text-align: right; }
        .broker-box { background: #0d94881a; border: 1px solid #0d948840; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
        .footer { background: #0f172a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏡 Property Scout</h1>
          <p>Site Visit Confirmation & Calendar Invite</p>
        </div>

        <div class="body-content">
          <p style="font-size: 15px; margin-top: 0;">Dear <strong>${info.buyerName}</strong>,</p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.5;">
            Your site visit has been successfully confirmed. A calendar event request has been automatically attached to this email and can be added directly to your Google Calendar.
          </p>

          <div class="code-badge">
            <label>Site Visit Booking ID</label>
            <span>${info.bookingId}</span>
          </div>

          <div style="text-align: center;">
            <a href="${googleCalendarUrl}" target="_blank" class="gcal-btn">
              📅 Add Event to Google Calendar
            </a>
          </div>

          <div class="broker-box">
            <div class="section-title">👔 Assigned Property Scout Agent</div>
            <div class="detail-row">
              <span class="detail-label">Broker Name:</span>
              <span class="detail-val" style="color:#2dd4bf;">${info.broker.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Direct Phone:</span>
              <span class="detail-val">${info.broker.phone}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Broker Email:</span>
              <span class="detail-val">${info.broker.email}</span>
            </div>
          </div>

          <div class="section-card">
            <div class="section-title">📍 Property Details</div>
            <div class="detail-row">
              <span class="detail-label">Property:</span>
              <span class="detail-val">${info.propertyTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Locality:</span>
              <span class="detail-val">${info.area}, Bengaluru</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Monthly Rent:</span>
              <span class="detail-val">${formattedRent}/mo</span>
            </div>
          </div>

          <div class="section-card">
            <div class="section-title">📅 Schedule & Buyer Details</div>
            <div class="detail-row">
              <span class="detail-label">Confirmed Date:</span>
              <span class="detail-val">${info.date}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time Slot:</span>
              <span class="detail-val">${info.timeSlot}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Buyer Name:</span>
              <span class="detail-val">${info.buyerName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Buyer Email:</span>
              <span class="detail-val">${info.buyerEmail}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Contact Phone:</span>
              <span class="detail-val">${info.buyerPhone}</span>
            </div>
          </div>

          <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
            Your assigned agent <strong>${info.broker.name}</strong> will reach out to you 15 minutes prior to your visit.
          </p>
        </div>

        <div class="footer">
          <p>© 2026 Property Scout AI • Bengaluru Real Estate Workspace</p>
          <p>This is an automated appointment confirmation message with Google Calendar event invite.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"Property Scout AI" <${senderEmail}>`,
      to: info.buyerEmail,
      subject: `Site Visit Confirmed: ${info.propertyTitle} (${info.bookingId})`,
      text: `Hello ${info.buyerName},\n\nYour site visit for "${info.propertyTitle}" in ${info.area} is confirmed for ${info.date} at ${info.timeSlot}.\n\nAssigned Agent: ${info.broker.name} (${info.broker.phone})\nConfirmation Code: ${info.bookingId}\nAdd to Google Calendar: ${googleCalendarUrl}\n\nThank you,\nProperty Scout AI`,
      html: htmlContent,
      icalEvent: {
        filename: `site-visit-${info.bookingId}.ics`,
        method: "REQUEST",
        content: icalContent
      }
    };

    const mailResult = await transporter.sendMail(mailOptions);
    let previewUrl: string | undefined = undefined;

    if (isTest && (nodemailer as any).getTestMessageUrl) {
      previewUrl = (nodemailer as any).getTestMessageUrl(mailResult) || undefined;
    }

    console.log(`[EMAIL SERVICE] Confirmation email with Google Calendar event sent to ${info.buyerEmail}. Message ID: ${mailResult.messageId}`);

    return {
      success: true,
      messageId: mailResult.messageId,
      previewUrl,
      googleCalendarUrl,
      isRealDelivery: !isTest
    };
  } catch (err: any) {
    console.error("[EMAIL SERVICE] Error sending site visit email:", err);
    return {
      success: false,
      error: err.message || "Failed to dispatch email"
    };
  }
}

export interface OwnerListingConfirmationInfo {
  listingId: string;
  title: string;
  area: string;
  city: string;
  rent: number;
  bedrooms: number;
  furnishing: string;
  sqft: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  photoCount: number;
}

/**
 * Sends an instant listing publication confirmation email to the property owner.
 */
export async function sendOwnerListingConfirmationEmail(info: OwnerListingConfirmationInfo): Promise<EmailResult> {
  try {
    const { transporter, isTest } = await getTransporter();
    const senderEmail = process.env.GMAIL_USER || process.env.SMTP_USER || "noreply@propertyscout.ai";

    const formattedRent = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(info.rent);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #e2e8f0; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 30px 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0 0; color: #ccfbf1; font-size: 14px; font-weight: 500; }
        .body-content { padding: 30px 24px; }
        .badge { background: #0f172a; border: 1px solid #0d9488; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; }
        .badge .title { color: #2dd4bf; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .badge .code { color: #ffffff; font-size: 22px; font-weight: 800; font-family: monospace; margin-top: 4px; }
        .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .card-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #1e293b; }
        .card-row:last-child { border-bottom: none; }
        .label { color: #94a3b8; font-size: 13px; font-weight: 500; }
        .val { color: #f8fafc; font-size: 14px; font-weight: 600; text-align: right; }
        .highlight { color: #2dd4bf; font-weight: 700; }
        .sanitizer-box { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px; color: #6ee7b7; font-size: 13px; line-height: 1.5; }
        .footer { background: #0f172a; padding: 20px 24px; text-align: center; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏡 Property Scout Listing Published!</h1>
          <p>Your property is now live on our Voice AI Network</p>
        </div>
        
        <div class="body-content">
          <p style="font-size: 15px; margin-top: 0;">Hi <strong>${info.contactName}</strong>,</p>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
            Congratulations! Your property listing <strong>"${info.title}"</strong> has been successfully verified, PII-sanitized, and published to the Property Scout network.
          </p>

          <div class="badge">
            <div class="title">Listing ID</div>
            <div class="code">${info.listingId}</div>
          </div>

          <div class="card">
            <div class="card-row">
              <span class="label">Property Title</span>
              <span class="val">${info.title}</span>
            </div>
            <div class="card-row">
              <span class="label">Locality & City</span>
              <span class="val">${info.area}, ${info.city}</span>
            </div>
            <div class="card-row">
              <span class="label">Monthly Rent</span>
              <span class="val highlight">${formattedRent} / mo</span>
            </div>
            <div class="card-row">
              <span class="label">Layout & Area</span>
              <span class="val">${info.bedrooms} BHK (${info.sqft} Sq.Ft)</span>
            </div>
            <div class="card-row">
              <span class="label">Furnishing</span>
              <span class="val">${info.furnishing}</span>
            </div>
            <div class="card-row">
              <span class="label">Photos Attached</span>
              <span class="val">${info.photoCount} Photos</span>
            </div>
          </div>

          <div class="sanitizer-box">
            🛡️ <strong>PII Privacy Guarantee</strong><br>
            Your personal phone (<code>[REDACTED_PHONE]</code>) and email (<code>[REDACTED_EMAIL]</code>) have been sanitized from public descriptions. Interested buyers will reach you through verified Property Scout agent channels!
          </div>

          <p style="font-size: 13px; color: #94a3b8; text-align: center;">
            Need to update details or manage your listing? Log in to your <a href="http://localhost:3000" style="color: #2dd4bf;">Sell Workspace</a>.
          </p>
        </div>

        <div class="footer">
          Property Scout AI • Bengaluru Real Estate Voice Network<br>
          Sent to <strong>${info.contactEmail}</strong> for listing confirmation.
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"Property Scout AI" <${senderEmail}>`,
      to: info.contactEmail,
      subject: `🏡 Property Listing Confirmed: ${info.title} (${info.area})`,
      html: htmlContent
    };

    const mailResult = await transporter.sendMail(mailOptions);
    console.log(`[OWNER LISTING EMAIL SUCCESS] Confirmation email sent to ${info.contactEmail}. Message ID: ${mailResult.messageId}`);

    let previewUrl: string | undefined = undefined;
    if (isTest && (nodemailer as any).getTestMessageUrl) {
      previewUrl = (nodemailer as any).getTestMessageUrl(mailResult) || undefined;
    }

    return {
      success: true,
      messageId: mailResult.messageId,
      previewUrl,
      isRealDelivery: !isTest
    };
  } catch (err: any) {
    console.error("[OWNER LISTING EMAIL FAILURE]", err);
    return {
      success: false,
      error: err.message || "Failed to dispatch owner listing confirmation email"
    };
  }
}

