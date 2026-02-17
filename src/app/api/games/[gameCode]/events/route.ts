import type { NextRequest } from "next/server";
import * as gameRepo from "@/repositories/game-repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ gameCode: string }> },
) {
	const { gameCode } = await params;

	const game = await gameRepo.findGameByCode(gameCode);
	if (!game) {
		return new Response("Game not found", { status: 404 });
	}

	const gameId = game.id;
	const encoder = new TextEncoder();
	let lastTimestamp = new Date();

	const stream = new ReadableStream({
		async start(controller) {
			const poll = setInterval(async () => {
				try {
					const events = await gameRepo.getGameEventsSince(
						gameId,
						lastTimestamp,
					);
					for (const event of events) {
						const data = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
						controller.enqueue(encoder.encode(data));
						lastTimestamp = event.createdAt;
					}
					// heartbeat to keep connection alive
					controller.enqueue(encoder.encode(": heartbeat\n\n"));
				} catch {
					clearInterval(poll);
					controller.close();
				}
			}, 1000);

			request.signal.addEventListener("abort", () => {
				clearInterval(poll);
				controller.close();
			});
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
