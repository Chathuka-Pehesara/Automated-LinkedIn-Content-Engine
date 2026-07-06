import { query } from "../lib/db.js";
import { generatePostImageViaGemini } from "../lib/gemini.js";
import path from "path";
import fs from "fs";

export async function handleGeneratePostImage(postId: number, brief: string) {
    console.log(`Generating image for Post ID ${postId} with brief: "${brief}"`);

    const imageBuffer = await generatePostImageViaGemini(brief);
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
    }

    const fileName = `post_${postId}_image.png`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, imageBuffer);

    const imageUrl = `/uploads/${fileName}`;

    await query(
        "UPDATE posts SET image_url = $1 WHERE id = $2",
        [imageUrl, postId]
    );

    return {
        postId,
        imageUrl,
        filePath,
        message: "Image generated and saved successfully."
    };
}
