import { NextRequest, NextResponse } from "next/server";
import { recordApiError } from "@/lib/metrics";
import * as gameService from "@/services/game-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const displayName = (body?.displayName as string)?.trim() || "Player";
    const result = await gameService.createGame(displayName);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    recordApiError();
    console.error("[POST /api/games]", err);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 },
    );
  }
}
