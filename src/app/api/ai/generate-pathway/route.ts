import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      languageId,
      languageName,
      intention,
      stage,
      dailyTimeMinutes,
      selectedTopics,
      availableCards,
    } = body;

    const systemPrompt = `You are a language learning pathway designer for the Zaytuna app.
Your job is to create a personalized study pathway for a student learning ${languageName}.

Student profile:
- Current level: ${stage}
- Goal: ${intention === "fluency" ? "Full fluency and mastery" : intention === "understanding" ? "Reading and listening comprehension" : "Everyday conversational ability"}
- Daily study time: ${dailyTimeMinutes} minutes

Available topics the student selected: ${(selectedTopics || []).join(", ")}

You have ${(availableCards || []).length} flashcards available. Here is a sample:
${(availableCards || []).slice(0, 40).map((c: { id: string; front: string; back: string; tags?: string[] }) => `- [${c.id}] ${c.front} → ${c.back}${c.tags?.length ? ` (${c.tags.slice(0, 2).join(", ")})` : ""}`).join("\n")}
${(availableCards || []).length > 40 ? `\n... and ${(availableCards || []).length - 40} more cards available.` : ""}

Create a learning pathway divided into logical sections. Each section should:
1. Focus on 1-3 related topics
2. Include specific card IDs from the available cards
3. Have a clear progressive order (basics first, advanced later)
4. Include estimated study time based on card count and daily time

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "sections": [
    {
      "id": "section-1",
      "title": "Section title",
      "description": "Brief description of what the student will learn",
      "topics": ["topic-id-1", "topic-id-2"],
      "cardIds": ["card-id-1", "card-id-2"],
      "estimatedMinutes": 30,
      "order": 0
    }
  ],
  "totalEstimatedHours": 10
}

Create 6-12 sections that cover the selected topics in a logical learning progression.`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Create a personalized ${languageName} learning pathway for me. I'm a ${stage} student who wants ${intention}. I can study ${dailyTimeMinutes} minutes per day. My selected topics are: ${(selectedTopics || []).join(", ")}.`,
        },
      ],
      system: systemPrompt,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from AI" },
        { status: 500 }
      );
    }

    // Extract JSON from response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not parse AI response" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Add status fields + safety defaults for arrays the AI might omit
    const sections = (parsed.sections || []).map(
      (
        s: {
          id?: string;
          title?: string;
          description?: string;
          topics?: string[];
          cardIds?: string[];
          estimatedMinutes?: number;
          order?: number;
        },
        i: number
      ) => ({
        id: s.id || `section-${i + 1}`,
        title: s.title || `Section ${i + 1}`,
        description: s.description || "",
        topics: s.topics || [],
        cardIds: s.cardIds || [],
        estimatedMinutes: s.estimatedMinutes || 15,
        order: s.order ?? i,
        languageId,
        status: i === 0 ? "active" : "locked",
        benchmarkPassed: null,
      })
    );

    return NextResponse.json({
      sections,
      totalEstimatedHours: parsed.totalEstimatedHours || 0,
    });
  } catch (error) {
    console.error("Generate pathway error:", error);
    return NextResponse.json(
      { error: "Failed to generate pathway" },
      { status: 500 }
    );
  }
}
