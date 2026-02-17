import * as analyticsRepo from "@/repositories/analytics-repository";
import type { AnalyticsDashboard } from "@/types/analytics";

export async function getAnalyticsDashboard(): Promise<AnalyticsDashboard> {
	const [overview, playerLeaderboard, roundDifficulty, recentGames, firstCorrectLeaders] =
		await Promise.all([
			analyticsRepo.getOverallStats(),
			analyticsRepo.getPlayerAccuracyLeaderboard(),
			analyticsRepo.getRoundDifficultyStats(),
			analyticsRepo.getRecentGames(),
			analyticsRepo.getFirstCorrectLeaderboard(),
		]);

	return {
		overview,
		playerLeaderboard,
		roundDifficulty,
		recentGames,
		firstCorrectLeaders,
	};
}
