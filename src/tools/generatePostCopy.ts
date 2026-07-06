import { query } from "../lib/db.js";
import { generatePostCopyViaClaude } from "../lib/claude.js";

export async function handleGeneratePostCopy(topic?: string) {
    let selectedTopic = topic;
    let topicId: number | null = null;

    if (!selectedTopic) {
        const row = await query("SELECT * FROM topics WHERE used_at IS NULL ORDER BY RANDOM() LIMIT 1");
        if (row.rows.length === 0) {
            throw new Error("Topic bank exhausted — please add more topics to database table.");
        }
        selectedTopic = row.rows[0].topic;
        topicId = row.rows[0].id;
    }

    console.log(`Generating post copy for topic: "${selectedTopic}"`);
    const generated = await generatePostCopyViaClaude(selectedTopic!);
    const fullCopy = `${generated.hook}\n\n${generated.body}\n\n${generated.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}`;

    const result = await query(
        `INSERT INTO posts (topic_id, post_copy, hashtags, status, created_at)
     VALUES ($1, $2, $3, 'draft', NOW())
     RETURNING id`,
        [topicId, fullCopy, JSON.stringify(generated.hashtags)]
    );

    const newPostId = result.rows[0].id;

    if (topicId) {
        await query("UPDATE topics SET used_at = NOW() WHERE id = $1", [topicId]);
    }

    return {
        postId: newPostId,
        topic: selectedTopic,
        hook: generated.hook,
        body: generated.body,
        hashtags: generated.hashtags,
        fullCopy
    };
}
