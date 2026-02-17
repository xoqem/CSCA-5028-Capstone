import { NextRequest, NextResponse } from "next/server";
import * as gameService from "@/services/game-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameCode: string }> },
) {
  try {
    const { gameCode } = await params;
    const body = await request.json();
    const displayName = (body?.displayName as string)?.trim() || "Player";
    const result = await gameService.joinGame(gameCode, displayName);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found")
      ? 404
      : message.includes("already started")
        ? 409
        : 500;
    console.error("[POST /api/games/.../join]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
