import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { message, chatHistory, currentPathway, userPreferences } =
      await req.json();

    const pathwaySummary = currentPathway?.sections
      ?.map(
        (s: { title: string; status: string; order: number }) =>
          `[${s.order}] ${s.title} (${s.status})`
      )
      .join("\n");

    const systemPrompt = `You are an AI learning assistant for the Zaytuna language learning app. You help students modify their learning pathway.

Current student profile:
- Level: ${userPreferences?.stage || "beginner"}
- Goal: ${userPreferences?.intention || "understanding"}
- Daily time: ${userPreferences?.dailyTimeMinutes || 15} minutes
- Languages: ${userPreferences?.languages?.map((l: { id: string }) => l.id).join(", ") || "none set"}

Current pathway:
${pathwaySummary || "No pathway generated yet"}

You can help the student:
1. Reorder sections
2. Add new topics/sections
3. Remove sections
4. Modify section content
5. Adjust study timing

When suggesting pathway changes, include a JSON block at the end of your message:
\`\`\`json
{"pathwayChanges": [{"type": "reorder|add|remove|modify", "sectionId": "id", "details": {...}}]}
\`\`\`

If no changes are needed (just answering a question), don't include the JSON block. Keep responses concise and friendly.`;

    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...(chatHistory || []).slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { response: "Sorry, I couldn't process that. Try again?" },
      );
    }

    const text = textBlock.text;

    // Check for pathway changes JSON
    const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    let pathwayChanges = null;
    let cleanResponse = text;

    if (jsonMatch) {
      try {
        pathwayChanges = JSON.parse(jsonMatch[1]);
        cleanResponse = text.replace(/```json[\s\S]*?```/, "").trim();
      } catch {
        // Ignore parse errors, treat as plain response
      }
    }

    return NextResponse.json({
      response: cleanResponse,
      pathwayChanges: pathwayChanges?.pathwayChanges || null,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { response: "Sorry, something went wrong. Please try again." },
    );
  }
}
