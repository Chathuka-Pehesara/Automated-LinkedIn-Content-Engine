import { query } from "./db.js";
import { config } from "../config.js";

export interface LinkedInToken {
    access_token: string;
    refresh_token: string;
    access_expires_at: Date;
    refresh_expires_at: Date;
}

export async function getValidAccessToken(): Promise<string> {
    const row = await query("SELECT * FROM linkedin_tokens ORDER BY id DESC LIMIT 1");
    if (row.rows.length === 0) {
        throw new Error("No LinkedIn tokens found in the database. Please perform the manual OAuth handshake first.");
    }
    const token = row.rows[0] as LinkedInToken & { id: number };
    const bufferTime = 5 * 60 * 1000;
    const now = new Date();

    if (new Date(token.access_expires_at).getTime() > now.getTime() + bufferTime) {
        return token.access_token;
    }

    console.log("LinkedIn access token expired or expiring soon. Refreshing...");

    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: token.refresh_token,
            client_id: config.linkedin.clientId,
            client_secret: config.linkedin.clientSecret,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to refresh LinkedIn access token: ${response.statusText} - ${errText}`);
    }

    const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
        refresh_token?: string;
        refresh_token_expires_in?: number;
    };

    const accessExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    const newRefreshToken = data.refresh_token || token.refresh_token;
    const refreshExpiresAt = data.refresh_token_expires_in
        ? new Date(Date.now() + data.refresh_token_expires_in * 1000)
        : token.refresh_expires_at;

    await query(
        `UPDATE linkedin_tokens 
     SET access_token = $1, access_expires_at = $2, refresh_token = $3, refresh_expires_at = $4, updated_at = NOW() 
     WHERE id = $5`,
        [data.access_token, accessExpiresAt, newRefreshToken, refreshExpiresAt, token.id]
    );

    console.log("LinkedIn access token refreshed successfully.");
    return data.access_token;
}

export async function saveInitialTokens(accessToken: string, expiresIn: number, refreshToken: string, refreshExpiresIn: number) {
    const accessExpiresAt = new Date(Date.now() + expiresIn * 1000);
    const refreshExpiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

    await query(
        `INSERT INTO linkedin_tokens (access_token, refresh_token, access_expires_at, refresh_expires_at)
     VALUES ($1, $2, $3, $4)`,
        [accessToken, refreshToken, accessExpiresAt, refreshExpiresAt]
    );
    console.log("Initial LinkedIn tokens saved to the database.");
}
