import { config } from "../config.js";

export async function generatePostImageViaGemini(brief: string): Promise<Buffer> {
    if (!config.geminiApiKey) {
        throw new Error("Missing GEMINI_API_KEY in environment configuration.");
    }

    // API endpoint for Gemini Imagen model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${config.geminiApiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            instances: [
                {
                    prompt: `Professional LinkedIn post visual, clean design, high contrast, corporate editorial style, no rendered text: ${brief}`,
                }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                outputMimeType: "image/png"
            }
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini Imagen API call failed: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    const base64ImageBytes = data.predictions?.[0]?.bytesBase64Encoded;

    if (!base64ImageBytes) {
        throw new Error("Gemini API response did not contain image base64 bytes.");
    }

    return Buffer.from(base64ImageBytes, "base64");
}
