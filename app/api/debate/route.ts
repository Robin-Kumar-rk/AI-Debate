import { NextResponse } from "next/server";

import { limitPromptHistory, type DebateRequestBody, type DebateSide } from "@/lib/debate";
import { generateDebateRound } from "@/lib/gemini";

export const runtime = "nodejs";

function isDebateSide(value: unknown): value is DebateSide {
  return value === "pro" || value === "against";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<DebateRequestBody>;
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const debateHistory = Array.isArray(body.debateHistory)
      ? body.debateHistory.filter((entry): entry is string => typeof entry === "string")
      : [];
    const side = body.side;
    const userArgument =
      typeof body.userArgument === "string" && body.userArgument.trim().length > 0
        ? body.userArgument.trim()
        : null;

    if (!topic) {
      return NextResponse.json({ error: "Topic is required." }, { status: 400 });
    }

    if (!isDebateSide(side)) {
      return NextResponse.json(
        { error: "Support side must be either pro or against." },
        { status: 400 },
      );
    }

    const result = await generateDebateRound({
      topic,
      side,
      debateHistory: limitPromptHistory(debateHistory),
      userArgument,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while generating the debate round.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
