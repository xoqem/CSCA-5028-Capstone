import { prisma } from "@/lib/prisma";
import type {
	OverviewStats,
	PlayerAccuracyEntry,
	RoundDifficultyEntry,
	GameCompetitivenessEntry,
	FirstCorrectEntry,
} from "@/types/analytics";

export async function getOverallStats(): Promise<OverviewStats> {
	const [totalGames, totalPlayers, totalRounds, totalSubmissions, totalCorrect] =
		await Promise.all([
			prisma.game.count({ where: { status: "FINISHED" } }),
			prisma.player.count(),
			prisma.round.count({ where: { status: "ENDED" } }),
			prisma.submission.count(),
			prisma.submission.count({ where: { isCorrect: true } }),
		]);

	const overallAccuracyPct =
		totalSubmissions > 0
			? Math.round((totalCorrect / totalSubmissions) * 1000) / 10
			: 0;

	return {
		totalGames,
		totalPlayers,
		totalRounds,
		totalSubmissions,
		overallAccuracyPct,
	};
}

export async function getPlayerAccuracyLeaderboard(
	limit = 20,
): Promise<PlayerAccuracyEntry[]> {
	const players = await prisma.player.findMany({
		where: {
			game: { status: "FINISHED" },
		},
		include: {
			submissions: true,
		},
	});

	const playerMap = new Map<
		string,
		{
			displayName: string;
			gamesPlayed: Set<string>;
			totalSubmissions: number;
			correctCount: number;
			totalCorrectTimeMs: number;
			totalScore: number;
		}
	>();

	for (const player of players) {
		const key = player.displayName;
		const entry = playerMap.get(key) ?? {
			displayName: key,
			gamesPlayed: new Set<string>(),
			totalSubmissions: 0,
			correctCount: 0,
			totalCorrectTimeMs: 0,
			totalScore: 0,
		};

		entry.gamesPlayed.add(player.gameId);

		for (const sub of player.submissions) {
			entry.totalSubmissions++;
			entry.totalScore += sub.score;
			if (sub.isCorrect) {
				entry.correctCount++;
				entry.totalCorrectTimeMs += sub.timeTakenMs ?? 0;
			}
		}

		playerMap.set(key, entry);
	}

	return Array.from(playerMap.values())
		.map((e) => ({
			displayName: e.displayName,
			gamesPlayed: e.gamesPlayed.size,
			totalSubmissions: e.totalSubmissions,
			correctCount: e.correctCount,
			accuracyPct:
				e.totalSubmissions > 0
					? Math.round((e.correctCount / e.totalSubmissions) * 1000) / 10
					: 0,
			avgTimeMsCorrect:
				e.correctCount > 0
					? Math.round(e.totalCorrectTimeMs / e.correctCount)
					: 0,
			totalScore: e.totalScore,
		}))
		.sort((a, b) => b.accuracyPct - a.accuracyPct || b.totalScore - a.totalScore)
		.slice(0, limit);
}

export async function getRoundDifficultyStats(): Promise<RoundDifficultyEntry[]> {
	const submissions = await prisma.submission.findMany({
		where: { round: { status: "ENDED" } },
		include: { round: { select: { roundNumber: true } } },
	});

	const roundMap = new Map<
		number,
		{ total: number; correct: number; totalTimeMs: number }
	>();

	for (const sub of submissions) {
		const rn = sub.round.roundNumber;
		const entry = roundMap.get(rn) ?? { total: 0, correct: 0, totalTimeMs: 0 };
		entry.total++;
		if (sub.isCorrect) {
			entry.correct++;
			entry.totalTimeMs += sub.timeTakenMs ?? 0;
		}
		roundMap.set(rn, entry);
	}

	return Array.from(roundMap.entries())
		.map(([roundNumber, e]) => ({
			roundNumber,
			totalAttempts: e.total,
			correctCount: e.correct,
			failRatePct:
				e.total > 0
					? Math.round(((e.total - e.correct) / e.total) * 1000) / 10
					: 0,
			avgSolveTimeMs:
				e.correct > 0 ? Math.round(e.totalTimeMs / e.correct) : 0,
		}))
		.sort((a, b) => a.roundNumber - b.roundNumber);
}

export async function getRecentGames(
	limit = 10,
): Promise<GameCompetitivenessEntry[]> {
	const games = await prisma.game.findMany({
		where: { status: "FINISHED" },
		orderBy: { createdAt: "desc" },
		take: limit,
		include: {
			players: {
				include: { submissions: true },
			},
			rounds: {
				where: { status: "ENDED" },
				select: { startedAt: true, endedAt: true },
			},
		},
	});

	return games.map((game) => {
		const playerScores = game.players.map((p) =>
			p.submissions.reduce((sum, s) => sum + s.score, 0),
		);
		const maxScore = Math.max(0, ...playerScores);
		const minScore = Math.min(maxScore, ...playerScores);
		const avgScore =
			playerScores.length > 0
				? Math.round(
						playerScores.reduce((a, b) => a + b, 0) / playerScores.length,
					)
				: 0;

		const roundDurations = game.rounds
			.filter((r) => r.startedAt && r.endedAt)
			.map(
				(r) =>
					new Date(r.endedAt!).getTime() - new Date(r.startedAt!).getTime(),
			);
		const avgRoundDurationMs =
			roundDurations.length > 0
				? Math.round(
						roundDurations.reduce((a, b) => a + b, 0) /
							roundDurations.length,
					)
				: 0;

		return {
			gameCode: game.gameCode,
			playerCount: game.players.length,
			avgScore,
			scoreSpread: maxScore - minScore,
			avgRoundDurationMs,
			createdAt: game.createdAt.toISOString(),
		};
	});
}

export async function getFirstCorrectLeaderboard(
	limit = 10,
): Promise<FirstCorrectEntry[]> {
	const events = await prisma.gameEvent.findMany({
		where: { type: "FIRST_CORRECT" },
		select: { payload: true, gameId: true },
	});

	const playerMap = new Map<
		string,
		{ count: number; gameIds: Set<string> }
	>();

	for (const event of events) {
		const payload = event.payload as Record<string, unknown>;
		const playerId = payload.playerId as string;
		if (!playerId) continue;

		const entry = playerMap.get(playerId) ?? {
			count: 0,
			gameIds: new Set<string>(),
		};
		entry.count++;
		entry.gameIds.add(event.gameId);
		playerMap.set(playerId, entry);
	}

	const playerIds = Array.from(playerMap.keys());
	if (playerIds.length === 0) return [];

	const players = await prisma.player.findMany({
		where: { id: { in: playerIds } },
		select: { id: true, displayName: true },
	});

	const nameMap = new Map(players.map((p) => [p.id, p.displayName]));

	return Array.from(playerMap.entries())
		.map(([playerId, e]) => ({
			displayName: nameMap.get(playerId) ?? "Unknown",
			firstCorrectCount: e.count,
			gamesPlayed: e.gameIds.size,
		}))
		.sort((a, b) => b.firstCorrectCount - a.firstCorrectCount)
		.slice(0, limit);
}
