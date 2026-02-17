import { NextRequest, NextResponse } from "next/server";
import { recordApiError } from "@/lib/metrics";
import * as gameService from "@/services/game-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ gameCode: string }> },
) {
  try {
    const { gameCode } = await params;
    await gameService.advanceRoundIfNeeded(gameCode);
    return NextResponse.json({ advanced: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    recordApiError();
    console.error("[POST /api/games/.../advance-round]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
