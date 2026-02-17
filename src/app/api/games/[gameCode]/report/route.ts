import { NextRequest, NextResponse } from "next/server";
import * as gameService from "@/services/game-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameCode: string }> },
) {
  const playerId = request.nextUrl.searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json(
      { error: "playerId query param required" },
      { status: 400 },
    );
  }

  try {
    const { gameCode } = await params;
    const report = await gameService.getGameReport(gameCode, playerId);
    return NextResponse.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    console.error("[GET /api/games/.../report]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
