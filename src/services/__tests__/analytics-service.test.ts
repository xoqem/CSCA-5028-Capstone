import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/repositories/analytics-repository");

import * as analyticsRepo from "@/repositories/analytics-repository";
import { getAnalyticsDashboard } from "@/services/analytics-service";

const repo = analyticsRepo as unknown as {
	[K in keyof typeof analyticsRepo]: Mock;
};

const mockOverview = {
	totalGames: 5,
	totalPlayers: 12,
	totalRounds: 50,
	totalSubmissions: 100,
	overallAccuracyPct: 70,
};

const mockPlayerLeaderboard = [
	{
		displayName: "Alice",
		gamesPlayed: 3,
		totalSubmissions: 30,
		correctCount: 25,
		accuracyPct: 83.3,
		avgTimeMsCorrect: 600,
		totalScore: 3500,
	},
	{
		displayName: "Bob",
		gamesPlayed: 2,
		totalSubmissions: 20,
		correctCount: 12,
		accuracyPct: 60,
		avgTimeMsCorrect: 900,
		totalScore: 1800,
	},
];

const mockRoundDifficulty = [
	{ roundNumber: 1, totalAttempts: 10, correctCount: 8, failRatePct: 20, avgSolveTimeMs: 500 },
	{ roundNumber: 10, totalAttempts: 10, correctCount: 3, failRatePct: 70, avgSolveTimeMs: 1200 },
];

const mockRecentGames = [
	{
		gameCode: "ABC123",
		playerCount: 3,
		avgScore: 800,
		scoreSpread: 400,
		avgRoundDurationMs: 5000,
		createdAt: "2025-01-01T00:00:00.000Z",
	},
];

const mockFirstCorrectLeaders = [
	{ displayName: "Alice", firstCorrectCount: 15, gamesPlayed: 3 },
];

beforeEach(() => {
	vi.clearAllMocks();
});

describe("getAnalyticsDashboard", () => {
	it("assembles dashboard from all repository data", async () => {
		repo.getOverallStats.mockResolvedValue(mockOverview);
		repo.getPlayerAccuracyLeaderboard.mockResolvedValue(mockPlayerLeaderboard);
		repo.getRoundDifficultyStats.mockResolvedValue(mockRoundDifficulty);
		repo.getRecentGames.mockResolvedValue(mockRecentGames);
		repo.getFirstCorrectLeaderboard.mockResolvedValue(mockFirstCorrectLeaders);

		const result = await getAnalyticsDashboard();

		expect(result.overview).toEqual(mockOverview);
		expect(result.playerLeaderboard).toHaveLength(2);
		expect(result.roundDifficulty).toHaveLength(2);
		expect(result.recentGames).toHaveLength(1);
		expect(result.firstCorrectLeaders).toHaveLength(1);
	});

	it("calls all repository functions", async () => {
		repo.getOverallStats.mockResolvedValue(mockOverview);
		repo.getPlayerAccuracyLeaderboard.mockResolvedValue([]);
		repo.getRoundDifficultyStats.mockResolvedValue([]);
		repo.getRecentGames.mockResolvedValue([]);
		repo.getFirstCorrectLeaderboard.mockResolvedValue([]);

		await getAnalyticsDashboard();

		expect(repo.getOverallStats).toHaveBeenCalledOnce();
		expect(repo.getPlayerAccuracyLeaderboard).toHaveBeenCalledOnce();
		expect(repo.getRoundDifficultyStats).toHaveBeenCalledOnce();
		expect(repo.getRecentGames).toHaveBeenCalledOnce();
		expect(repo.getFirstCorrectLeaderboard).toHaveBeenCalledOnce();
	});

	it("handles empty database gracefully", async () => {
		repo.getOverallStats.mockResolvedValue({
			totalGames: 0,
			totalPlayers: 0,
			totalRounds: 0,
			totalSubmissions: 0,
			overallAccuracyPct: 0,
		});
		repo.getPlayerAccuracyLeaderboard.mockResolvedValue([]);
		repo.getRoundDifficultyStats.mockResolvedValue([]);
		repo.getRecentGames.mockResolvedValue([]);
		repo.getFirstCorrectLeaderboard.mockResolvedValue([]);

		const result = await getAnalyticsDashboard();

		expect(result.overview.totalGames).toBe(0);
		expect(result.overview.overallAccuracyPct).toBe(0);
		expect(result.playerLeaderboard).toHaveLength(0);
		expect(result.roundDifficulty).toHaveLength(0);
		expect(result.recentGames).toHaveLength(0);
		expect(result.firstCorrectLeaders).toHaveLength(0);
	});

	it("preserves player leaderboard order from repository", async () => {
		repo.getOverallStats.mockResolvedValue(mockOverview);
		repo.getPlayerAccuracyLeaderboard.mockResolvedValue(mockPlayerLeaderboard);
		repo.getRoundDifficultyStats.mockResolvedValue([]);
		repo.getRecentGames.mockResolvedValue([]);
		repo.getFirstCorrectLeaderboard.mockResolvedValue([]);

		const result = await getAnalyticsDashboard();

		expect(result.playerLeaderboard[0].displayName).toBe("Alice");
		expect(result.playerLeaderboard[1].displayName).toBe("Bob");
	});

	it("preserves round difficulty order from repository", async () => {
		repo.getOverallStats.mockResolvedValue(mockOverview);
		repo.getPlayerAccuracyLeaderboard.mockResolvedValue([]);
		repo.getRoundDifficultyStats.mockResolvedValue(mockRoundDifficulty);
		repo.getRecentGames.mockResolvedValue([]);
		repo.getFirstCorrectLeaderboard.mockResolvedValue([]);

		const result = await getAnalyticsDashboard();

		expect(result.roundDifficulty[0].roundNumber).toBe(1);
		expect(result.roundDifficulty[0].failRatePct).toBe(20);
		expect(result.roundDifficulty[1].roundNumber).toBe(10);
		expect(result.roundDifficulty[1].failRatePct).toBe(70);
	});
});
