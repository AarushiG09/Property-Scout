import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  sarvamApiKey: process.env.SARVAM_API_KEY || "",
  osmMcpUrl: process.env.OSM_MCP_URL || "http://localhost:3001/sse",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleProjectId: process.env.GOOGLE_PROJECT_ID || "",
  gmailClientId: process.env.GMAIL_CLIENT_ID || "",
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET || "",
  gmailUser: process.env.GMAIL_USER || "",
  gmailPass: process.env.GMAIL_PASS || ""
};
