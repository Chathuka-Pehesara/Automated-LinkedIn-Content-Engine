import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { handleGeneratePostCopy } from "../tools/generatePostCopy.js";
import { handleGeneratePostImage } from "../tools/generatePostImage.js";
import { publishPostToLinkedIn } from "../tools/publishToLinkedIn.js";
import { initializeDatabase } from "../lib/db.js";

// Initialize Database schema
await initializeDatabase().catch(err => {
    console.error("Database initialization failed:", err);
});

const server = new McpServer({
    name: "linkedin-content-engine",
    version: "1.0.0",
});

server.tool(
    "generate_post_copy",
    {
        topic: z.string().optional().describe("Optional topic to override the database queue random selector"),
    },
    async ({ topic }) => {
        try {
            const result = await handleGeneratePostCopy(topic);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        } catch (err: any) {
            return {
                isError: true,
                content: [{ type: "text", text: err.message || String(err) }],
            };
        }
    }
);

server.tool(
    "generate_post_image",
    {
        postId: z.number().describe("Post ID in the database to link the generated visual to"),
        brief: z.string().describe("A summary of the visual elements and context to generate the image"),
    },
    async ({ postId, brief }) => {
        try {
            const result = await handleGeneratePostImage(postId, brief);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        } catch (err: any) {
            return {
                isError: true,
                content: [{ type: "text", text: err.message || String(err) }],
            };
        }
    }
);

server.tool(
    "publish_to_linkedin",
    {
        postId: z.number().describe("Database Post ID to publish to LinkedIn"),
    },
    async ({ postId }) => {
        try {
            const result = await publishPostToLinkedIn(postId);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        } catch (err: any) {
            return {
                isError: true,
                content: [{ type: "text", text: err.message || String(err) }],
            };
        }
    }
);

async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("LinkedIn Content Engine MCP Server running on stdio transport.");
}

run().catch(err => {
    console.error("Fatal error running MCP Server:", err);
    process.exit(1);
});
