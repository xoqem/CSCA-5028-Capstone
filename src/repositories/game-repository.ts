import type {
	Game,
	GameStatus,
	Player,
	Round,
	RoundStatus,
	Submission,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function createGame(gameCode: string): Promise<Game> {
	return prisma.game.create({
		data: { gameCode, status: "WAITING" },
	});
}

export async function findGameByCode(gameCode: string): Promise<Game | null> {
	return prisma.game.findUnique({ where: { gameCode } });
}

export async function findGameByCodeWithPlayers(
	gameCode: string,
): Promise<(Game & { players: Player[] }) | null> {
	return prisma.game.findUnique({
		where: { gameCode },
		include: { players: { orderBy: { joinedAt: "asc" } } },
	});
}

export async function updateGameStatus(
	gameCode: string,
	status: GameStatus,
): Promise<Game> {
	return prisma.game.update({
		where: { gameCode },
		data: { status },
	});
}

export async function updateGameCurrentRound(
	gameCode: string,
	roundNumber: number,
): Promise<Game> {
	return prisma.game.update({
		where: { gameCode },
		data: { currentRoundNumber: roundNumber },
	});
}

export async function createPlayer(
	gameId: string,
	displayName: string,
	sessionToken: string,
	isHost: boolean,
): Promise<Player> {
	return prisma.player.create({
		data: { gameId, displayName, sessionToken, isHost },
	});
}

export async function findPlayersByGameId(gameId: string): Promise<Player[]> {
	return prisma.player.findMany({
		where: { gameId },
		orderBy: { joinedAt: "asc" },
	});
}

export async function countPlayersInGame(gameId: string): Promise<number> {
	return prisma.player.count({ where: { gameId } });
}

export async function createRounds(
	rounds: Array<{
		gameId: string;
		roundNumber: number;
		equationText: string;
		correctAnswer: number;
	}>,
): Promise<void> {
	await prisma.round.createMany({ data: rounds });
}

export async function findRound(
	gameId: string,
	roundNumber: number,
): Promise<Round | null> {
	return prisma.round.findUnique({
		where: { gameId_roundNumber: { gameId, roundNumber } },
	});
}

export async function updateRoundStatus(
	roundId: string,
	status: RoundStatus,
	timestamps: {
		startedAt?: Date;
		firstCorrectAt?: Date;
		countdownEndsAt?: Date;
		endedAt?: Date;
	} = {},
): Promise<Round> {
	return prisma.round.update({
		where: { id: roundId },
		data: { status, ...timestamps },
	});
}

export async function setRoundFirstCorrect(
	roundId: string,
	firstCorrectAt: Date,
	countdownEndsAt: Date,
): Promise<Round | null> {
	// only update if firstCorrectAt is still null to prevent race conditions
	const updated = await prisma.round.updateMany({
		where: { id: roundId, firstCorrectAt: null },
		data: {
			status: "COUNTDOWN",
			firstCorrectAt,
			countdownEndsAt,
		},
	});
	if (updated.count === 0) return null;
	return prisma.round.findUnique({ where: { id: roundId } });
}

export async function createSubmission(data: {
	roundId: string;
	playerId: string;
	answer: number;
	isCorrect: boolean;
	score: number;
	timeTakenMs?: number;
}): Promise<Submission> {
	return prisma.submission.create({ data });
}

export async function findSubmissionForPlayerRound(
	roundId: string,
	playerId: string,
): Promise<Submission | null> {
	return prisma.submission.findUnique({
		where: { roundId_playerId: { roundId, playerId } },
	});
}

export async function countSubmissionsForPlayer(
	playerId: string,
	gameId: string,
): Promise<number> {
	return prisma.submission.count({
		where: {
			playerId,
			round: { gameId },
		},
	});
}

export async function countSubmissionsForRound(
	roundId: string,
): Promise<number> {
	return prisma.submission.count({ where: { roundId } });
}

export async function countCorrectSubmissionsForRound(
	roundId: string,
): Promise<number> {
	return prisma.submission.count({
		where: { roundId, isCorrect: true },
	});
}

export async function countRoundsWithStatus(
	gameId: string,
	status: RoundStatus,
): Promise<number> {
	return prisma.round.count({ where: { gameId, status } });
}

export async function getSubmissionsForPlayer(
	playerId: string,
	gameId: string,
): Promise<Array<Submission & { round: Round }>> {
	return prisma.submission.findMany({
		where: {
			playerId,
			round: { gameId },
		},
		include: { round: true },
		orderBy: { round: { roundNumber: "asc" } },
	});
}

export async function getLeaderboard(gameId: string): Promise<
	Array<{
		playerId: string;
		displayName: string;
		totalScore: number;
		correctCount: number;
		averageTimeMs: number;
	}>
> {
	const players = await prisma.player.findMany({
		where: { gameId },
		include: {
			submissions: {
				where: { round: { gameId } },
			},
		},
		orderBy: { joinedAt: "asc" },
	});

	return players
		.map((p) => {
			const totalScore = p.submissions.reduce((sum, s) => sum + s.score, 0);
			const correctSubs = p.submissions.filter((s) => s.isCorrect);
			const correctCount = correctSubs.length;
			const avgTime =
				correctSubs.length > 0
					? correctSubs.reduce((sum, s) => sum + (s.timeTakenMs ?? 0), 0) /
						correctSubs.length
					: 0;

			return {
				playerId: p.id,
				displayName: p.displayName,
				totalScore,
				correctCount,
				averageTimeMs: Math.round(avgTime),
			};
		})
		.sort((a, b) => {
			if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
			if (b.correctCount !== a.correctCount)
				return b.correctCount - a.correctCount;
			return a.averageTimeMs - b.averageTimeMs;
		});
}

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

export async function createGameEvent(
	gameId: string,
	type: string,
	payload: Record<string, JsonValue> = {},
): Promise<void> {
	await prisma.gameEvent.create({
		data: { gameId, type, payload },
	});
}

export async function getGameEventsSince(
	gameId: string,
	afterTimestamp: Date,
): Promise<
	Array<{ id: string; type: string; payload: unknown; createdAt: Date }>
> {
	return prisma.gameEvent.findMany({
		where: {
			gameId,
			createdAt: { gt: afterTimestamp },
		},
		orderBy: { createdAt: "asc" },
		select: { id: true, type: true, payload: true, createdAt: true },
	});
}
