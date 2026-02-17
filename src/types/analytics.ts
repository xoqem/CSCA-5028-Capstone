export interface OverviewStats {
	totalGames: number;
	totalPlayers: number;
	totalRounds: number;
	totalSubmissions: number;
	overallAccuracyPct: number;
}

export interface PlayerAccuracyEntry {
	displayName: string;
	gamesPlayed: number;
	totalSubmissions: number;
	correctCount: number;
	accuracyPct: number;
	avgTimeMsCorrect: number;
	totalScore: number;
}

export interface RoundDifficultyEntry {
	roundNumber: number;
	totalAttempts: number;
	correctCount: number;
	failRatePct: number;
	avgSolveTimeMs: number;
}

export interface GameCompetitivenessEntry {
	gameCode: string;
	playerCount: number;
	avgScore: number;
	scoreSpread: number;
	avgRoundDurationMs: number;
	createdAt: string;
}

export interface FirstCorrectEntry {
	displayName: string;
	firstCorrectCount: number;
	gamesPlayed: number;
}

export interface AnalyticsDashboard {
	overview: OverviewStats;
	playerLeaderboard: PlayerAccuracyEntry[];
	roundDifficulty: RoundDifficultyEntry[];
	recentGames: GameCompetitivenessEntry[];
	firstCorrectLeaders: FirstCorrectEntry[];
}
