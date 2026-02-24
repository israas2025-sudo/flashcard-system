import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { sectionId, sectionTitle, cards, previousQuestions } =
      await req.json();

    const cardSummary = cards
      .map((c: { front: string; back: string }) => `${c.front} → ${c.back}`)
      .join("\n");

    const avoidList =
      previousQuestions?.length > 0
        ? `\n\nIMPORTANT: Do NOT repeat these questions:\n${previousQuestions.join("\n")}`
        : "";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: `You are a language learning quiz generator for the Zaytuna app. Create multiple-choice benchmark questions to test vocabulary and comprehension. Each question should test a different concept. Questions should be challenging but fair.${avoidList}`,
      messages: [
        {
          role: "user",
          content: `Create a benchmark quiz for the section "${sectionTitle}" (ID: ${sectionId}). Here are the flashcards studied:\n\n${cardSummary}\n\nGenerate 7 multiple-choice questions. Return ONLY valid JSON:\n{\n  "questions": [\n    {\n      "id": "q1",\n      "question": "What does X mean?",\n      "options": ["A", "B", "C", "D"],\n      "correctIndex": 0,\n      "explanation": "Brief explanation"\n    }\n  ]\n}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from AI" },
        { status: 500 }
      );
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not parse AI response" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Add sectionId to each question
    const questions = (parsed.questions || []).map(
      (q: {
        id: string;
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
      }) => ({
        ...q,
        sectionId,
      })
    );

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Generate benchmark error:", error);
    return NextResponse.json(
      { error: "Failed to generate benchmark" },
      { status: 500 }
    );
  }
}
