import { query } from "../lib/db.js";
import { getValidAccessToken } from "../lib/linkedinAuth.js";
import { config } from "../config.js";
import fs from "fs";
import path from "path";

async function uploadImageToLinkedIn(accessToken: string, imageBuffer: Buffer): Promise<string> {
    const orgUrn = config.linkedin.orgUrn;

    const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            registerUploadRequest: {
                recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                owner: orgUrn,
                serviceRelationships: [
                    {
                        relationshipType: "OWNER",
                        identifier: "urn:li:userGeneratedContent",
                    },
                ],
            },
        }),
    });

    if (!registerRes.ok) {
        throw new Error(`LinkedIn image upload registration failed: ${registerRes.statusText} - ${await registerRes.text()}`);
    }

    const registerData = await registerRes.json();
    const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
    const assetUrn = registerData.value.asset;

    const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "image/png",
        },
        body: imageBuffer as any,
    });

    if (!uploadRes.ok) {
        throw new Error(`LinkedIn image binary upload failed: ${uploadRes.statusText} - ${await uploadRes.text()}`);
    }

    return assetUrn;
}

export async function publishPostToLinkedIn(postId: number) {
    const row = await query("SELECT * FROM posts WHERE id = $1", [postId]);
    if (row.rows.length === 0) {
        throw new Error(`Post with ID ${postId} not found.`);
    }

    const post = row.rows[0];
    const accessToken = await getValidAccessToken();
    let assetUrn: string | undefined;

    try {
        if (post.image_url) {
            const fileName = path.basename(post.image_url);
            const filePath = path.resolve(process.cwd(), "uploads", fileName);
            if (fs.existsSync(filePath)) {
                const imageBuffer = fs.readFileSync(filePath);
                console.log(`Uploading visual asset to LinkedIn for Post ID ${postId}...`);
                assetUrn = await uploadImageToLinkedIn(accessToken, imageBuffer);
            }
        }

        console.log(`Publishing UGC post to LinkedIn...`);
        const payload: any = {
            author: config.linkedin.orgUrn,
            lifecycleState: "PUBLISHED",
            specificContent: {
                "com.linkedin.ugc.ShareContent": {
                    shareCommentary: {
                        text: post.post_copy,
                    },
                    shareMediaCategory: assetUrn ? "IMAGE" : "NONE",
                },
            },
            visibility: {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
        };

        if (assetUrn) {
            payload.specificContent["com.linkedin.ugc.ShareContent"].media = [
                {
                    status: "READY",
                    media: assetUrn,
                },
            ];
        }

        const publishRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            },
            body: JSON.stringify(payload),
        });

        if (!publishRes.ok) {
            throw new Error(`LinkedIn publishing failed: ${publishRes.statusText} - ${await publishRes.text()}`);
        }

        const postUrn = publishRes.headers.get("x-restli-id") || "";

        await query(
            "UPDATE posts SET status = 'published', linkedin_post_urn = $1, published_at = NOW() WHERE id = $2",
            [postUrn, postId]
        );

        console.log(`Successfully published post on LinkedIn! Post URN: ${postUrn}`);
        return { success: true, postUrn };
    } catch (err: any) {
        console.error(`Failed to publish Post ID ${postId}:`, err);
        await query(
            "UPDATE posts SET status = 'failed', error = $1 WHERE id = $2",
            [err.message || String(err), postId]
        );
        throw err;
    }
}
