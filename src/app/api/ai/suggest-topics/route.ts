import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { languageId, languageName, intention, stage, selectedTopics, allTopicIds } = await req.json();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: `You are a language learning advisor for the Zaytuna app. Suggest additional study topics for a ${stage} student learning ${languageName} whose goal is ${intention}. They have already selected: ${selectedTopics.join(", ")}. Available topic IDs they haven't selected: ${allTopicIds.filter((t: string) => !selectedTopics.includes(t)).join(", ")}. Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Based on my selections (${selectedTopics.join(", ")}), what other topics should I study? Return JSON: { "suggestedTopics": [{ "id": "topic-id", "name": "Topic Name", "reason": "Why this is useful" }] }. Suggest 3-5 topics.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ suggestedTopics: [] });
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ suggestedTopics: [] });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      suggestedTopics: parsed.suggestedTopics || [],
    });
  } catch (error) {
    console.error("Suggest topics error:", error);
    return NextResponse.json({ suggestedTopics: [] });
  }
}
