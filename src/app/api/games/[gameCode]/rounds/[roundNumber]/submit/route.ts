import { NextRequest, NextResponse } from "next/server";
import * as gameService from "@/services/game-service";

export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ gameCode: string; roundNumber: string }> },
) {
  try {
    const { gameCode, roundNumber } = await params;
    const body = await request.json();
    const answer = parseFloat(body?.answer);
    const playerId = body?.playerId as string;
    const timeTakenMs =
      typeof body?.timeTakenMs === "number" ? body.timeTakenMs : undefined;

    if (isNaN(answer) || !playerId) {
      return NextResponse.json(
        { error: "answer (number) and playerId (string) are required" },
        { status: 400 },
      );
    }

    const result = await gameService.submitAnswer({
      gameCode,
      roundNumber: parseInt(roundNumber, 10),
      playerId,
      answer,
      timeTakenMs,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    console.error("[POST /api/games/.../submit]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
