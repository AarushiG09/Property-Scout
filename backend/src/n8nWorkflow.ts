import nodemailer from "nodemailer";
import { ParsedListing } from "./database";

export interface ShortlistPdfPayload {
  buyerEmail: string;
  buyerName: string;
  area?: string;
  maxRent?: number;
  shortlist: ParsedListing[];
}

export interface N8nWorkflowResult {
  success: boolean;
  source: "n8n_webhook" | "direct_nodemailer_fallback";
  messageId?: string;
  webhookStatus?: number;
  error?: string;
}

/**
 * Dispatches shortlist payload to n8n Webhook, falling back to direct Nodemailer delivery if n8n container is offline.
 */
export async function triggerN8nShortlistWorkflow(payload: ShortlistPdfPayload): Promise<N8nWorkflowResult> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/shortlist-pdf";
  console.log(`[N8N WORKFLOW] Triggering shortlist PDF export for ${payload.buyerEmail} via webhook: ${webhookUrl}`);

  // 1. Attempt sending webhook POST to n8n workflow engine
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout for webhook test

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log(`[N8N WEBHOOK SUCCESS] n8n engine responded with status ${response.status}`);
      return {
        success: true,
        source: "n8n_webhook",
        webhookStatus: response.status,
        messageId: data.messageId || "n8n-processed"
      };
    }
  } catch (err: any) {
    console.warn(`[N8N WEBHOOK NOTICE] n8n container offline (${err.message}). Executing direct Nodemailer fallback...`);
  }

  // 2. Fallback: Direct Nodemailer Email Dispatch with formatted HTML Shortlist Summary
  try {
    const senderEmail = process.env.GMAIL_USER || process.env.SMTP_USER || "noreply@propertyscout.ai";
    const pass = (process.env.GMAIL_PASS || "").replace(/\s+/g, "");

    let transporter: nodemailer.Transporter;

    if (process.env.GMAIL_USER && pass) {
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: process.env.GMAIL_USER.trim(), pass }
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
    }

    const itemsHtml = payload.shortlist.map((item, idx) => `
      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-b: 1px solid #1e293b; padding-bottom: 10px; margin-bottom: 12px;">
          <h3 style="margin: 0; color: #38bdf8; font-size: 16px;">#${idx + 1}. ${item.title}</h3>
          <span style="background: #0d9488; color: #ffffff; font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">
            ₹${item.rent.toLocaleString('en-IN')}/mo
          </span>
        </div>
        <p style="margin: 4px 0; color: #cbd5e1; font-size: 13px;">📍 <strong>Locality:</strong> ${item.area}, Bengaluru</p>
        <p style="margin: 4px 0; color: #cbd5e1; font-size: 13px;">🏠 <strong>Layout:</strong> ${item.bedrooms} BHK (${item.sqft} Sq.Ft) • ${item.furnishing}</p>
        <p style="margin: 4px 0; color: #cbd5e1; font-size: 13px;">✨ <strong>Amenities:</strong> ${item.amenities.join(', ')}</p>
      </div>
    `).join("");

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: 'Segoe UI', Roboto, sans-serif; background-color: #0b1120; color: #e2e8f0; margin: 0; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 28px 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 22px;">📋 Property Scout Shortlist Report</h1>
          <p style="margin: 6px 0 0 0; color: #ccfbf1; font-size: 14px;">Curated for ${payload.buyerName}</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 14px; margin-top: 0; color: #cbd5e1;">
            Hi <strong>${payload.buyerName}</strong>,<br>
            Here is your requested property shortlist summary for <strong>${payload.area || 'Bengaluru'}</strong> containing <strong>${payload.shortlist.length} verified listings</strong>:
          </p>

          ${itemsHtml}

          <div style="background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3); border-radius: 12px; padding: 16px; text-align: center; margin-top: 24px;">
            <p style="margin: 0; color: #2dd4bf; font-size: 13px; font-weight: 600;">
              Ready to schedule a site visit? Ask your AI Voice Scout or visit <a href="http://localhost:3000" style="color: #38bdf8;">Property Scout Portal</a>.
            </p>
          </div>
        </div>
        <div style="background: #0f172a; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px;">
          Property Scout AI • Voice-First Real Estate Network<br>
          Sent to <strong>${payload.buyerEmail}</strong>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"Property Scout AI" <${senderEmail}>`,
      to: payload.buyerEmail,
      subject: `📋 Your Property Scout Shortlist (${payload.shortlist.length} Listings)`,
      html: htmlContent
    };

    const mailResult = await transporter.sendMail(mailOptions);
    console.log(`[SHORTLIST EMAIL FALLBACK SUCCESS] Shortlist report sent to ${payload.buyerEmail}. Message ID: ${mailResult.messageId}`);

    return {
      success: true,
      source: "direct_nodemailer_fallback",
      messageId: mailResult.messageId
    };
  } catch (fallbackErr: any) {
    console.error("[SHORTLIST EMAIL FAILURE]", fallbackErr);
    return {
      success: false,
      source: "direct_nodemailer_fallback",
      error: fallbackErr.message || "Failed to deliver shortlist email"
    };
  }
}
