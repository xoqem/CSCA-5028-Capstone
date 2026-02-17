import { NextRequest, NextResponse } from "next/server";
import * as gameService from "@/services/game-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ gameCode: string }> },
) {
  try {
    const { gameCode } = await params;
    await gameService.startGame(gameCode);
    return NextResponse.json({ started: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found")
      ? 404
      : message.includes("already started")
        ? 409
        : 500;
    console.error("[POST /api/games/.../start]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
