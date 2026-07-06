import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const config = {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    linkedin: {
        clientId: process.env.LINKEDIN_CLIENT_ID || "",
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
        orgUrn: process.env.LINKEDIN_ORG_URN || "",
        redirectUri: process.env.LINKEDIN_REDIRECT_URI || "http://localhost:3000/auth/linkedin/callback",
    },
    databaseUrl: process.env.DATABASE_URL || "",
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
    port: parseInt(process.env.PORT || "3000", 10),
};

const requiredEnv = [
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "LINKEDIN_CLIENT_ID",
    "LINKEDIN_CLIENT_SECRET",
    "LINKEDIN_ORG_URN",
    "DATABASE_URL"
];

for (const env of requiredEnv) {
    if (!process.env[env]) {
        console.warn(`[WARNING] Missing environment variable: ${env}`);
    }
}
