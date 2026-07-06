import { query } from "../lib/db.js";
import { handleGeneratePostCopy } from "../tools/generatePostCopy.js";
import { handleGeneratePostImage } from "../tools/generatePostImage.js";
import { publishPostToLinkedIn } from "../tools/publishToLinkedIn.js";
import { config } from "../config.js";

async function sendSlackAlert(message: string) {
    if (!config.slackWebhookUrl) {
        console.log("[Slack Alert Simulator]:", message);
        return;
    }

    try {
        await fetch(config.slackWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: `⚠️ *LinkedIn Content Engine Alert*:\n${message}` }),
        });
    } catch (err) {
        console.error("Failed to send Slack alert:", err);
    }
}

export async function runDailyJob(skipPublishing: boolean = false) {
    console.log("Starting daily LinkedIn Content Engine run...");

    try {
        const existing = await query(
            "SELECT * FROM posts WHERE created_at::date = CURRENT_DATE"
        );
        if (existing.rows.length > 0) {
            console.log("Daily run already executed for today. Skipping.");
            return;
        }

        const copyResult = await handleGeneratePostCopy();
        console.log("Generated copy. Post ID:", copyResult.postId);

        const visualBrief = `Category: update, theme: modern technology, context: ${copyResult.hook}`;
        const imageResult = await handleGeneratePostImage(copyResult.postId, visualBrief);
        console.log("Generated image. URL:", imageResult.imageUrl);

        if (skipPublishing) {
            console.log("Run set to skip publishing (draft only mode). Post left as draft.");
            return;
        }

        console.log("Publishing Post ID:", copyResult.postId);
        await publishPostToLinkedIn(copyResult.postId);
        console.log("Daily Content Engine run completed successfully!");

    } catch (err: any) {
        const errMsg = err.message || String(err);
        console.error("Daily run failed:", errMsg);
        await sendSlackAlert(`Daily job execution failed. Error details: ${errMsg}`);
    }
}
