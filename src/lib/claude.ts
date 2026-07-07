import { config } from "../config.js";

const BRAND_SYSTEM_PROMPT = `You are writing LinkedIn posts for an innovative software product.
Voice: confident, concise, no corporate jargon, occasional dry humor.
Audience: B2B software buyers and industry peers.
Always return valid JSON only, without markdown styling or backticks: {"hook": string, "body": string, "hashtags": string[]}.
Body should be 80-150 words, no emojis unless the topic is a milestone/celebration.`;

export async function generatePostCopyViaClaude(topic: string): Promise<{ hook: string; body: string; hashtags: string[] }> {
    if (!config.anthropicApiKey) {
        throw new Error("Missing ANTHROPIC_API_KEY in environment configuration.");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": config.anthropicApiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 500,
            system: [
                {
                    type: "text",
                    text: BRAND_SYSTEM_PROMPT,
                    cache_control: { type: "ephemeral" }
                }
            ],
            messages: [
                {
                    role: "user",
                    content: `Write a post about this topic: "${topic}"`
                }
            ]
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Claude API call failed: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const cleanJsonText = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    try {
        return JSON.parse(cleanJsonText);
    } catch (err) {
        console.error("Failed to parse JSON response from Claude:", text);
        throw new Error("Invalid JSON formatting returned by AI assistant.");
    }
}
