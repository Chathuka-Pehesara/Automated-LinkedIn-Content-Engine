import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;

export const pool = new Pool({
    connectionString: config.databaseUrl,
});

export async function query(text: string, params?: any[]) {
    return pool.query(text, params);
}

export async function initializeDatabase() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id SERIAL PRIMARY KEY,
        topic TEXT NOT NULL,
        category TEXT,
        used_at TIMESTAMP
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        topic_id INTEGER REFERENCES topics(id),
        post_copy TEXT,
        hashtags TEXT,
        image_url TEXT,
        status TEXT DEFAULT 'draft',
        linkedin_post_urn TEXT,
        created_at TIMESTAMP DEFAULT now(),
        published_at TIMESTAMP,
        error TEXT
      );
    `);

        await client.query(`
      CREATE TABLE IF NOT EXISTS linkedin_tokens (
        id SERIAL PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        access_expires_at TIMESTAMP NOT NULL,
        refresh_expires_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT now()
      );
    `);

        await client.query("COMMIT");
        console.log("Database tables initialized successfully.");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Failed to initialize database tables:", err);
        throw err;
    } finally {
        client.release();
    }
}
