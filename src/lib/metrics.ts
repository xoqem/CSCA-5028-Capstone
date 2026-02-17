interface MetricsStore {
	gamesCreated: number;
	gamesFinished: number;
	roundsCompleted: number;
	submissionsReceived: number;
	correctSubmissions: number;
	incorrectSubmissions: number;
	apiErrors: number;
	totalRoundDurationMs: number;
	startedAt: string;
}

const globalForMetrics = globalThis as unknown as {
	metricsStore: MetricsStore | undefined;
};

function createStore(): MetricsStore {
	return {
		gamesCreated: 0,
		gamesFinished: 0,
		roundsCompleted: 0,
		submissionsReceived: 0,
		correctSubmissions: 0,
		incorrectSubmissions: 0,
		apiErrors: 0,
		totalRoundDurationMs: 0,
		startedAt: new Date().toISOString(),
	};
}

const store = globalForMetrics.metricsStore ?? createStore();
globalForMetrics.metricsStore = store;

export function recordGameCreated() {
	store.gamesCreated++;
}

export function recordGameFinished() {
	store.gamesFinished++;
}

export function recordRoundCompleted(durationMs: number) {
	store.roundsCompleted++;
	store.totalRoundDurationMs += durationMs;
}

export function recordSubmission(isCorrect: boolean) {
	store.submissionsReceived++;
	if (isCorrect) {
		store.correctSubmissions++;
	} else {
		store.incorrectSubmissions++;
	}
}

export function recordApiError() {
	store.apiErrors++;
}

export interface MetricsSnapshot {
	gamesCreated: number;
	gamesFinished: number;
	roundsCompleted: number;
	submissionsReceived: number;
	correctSubmissions: number;
	incorrectSubmissions: number;
	apiErrors: number;
	avgRoundDurationMs: number;
	startedAt: string;
}

export function getMetricsSnapshot(): MetricsSnapshot {
	return {
		gamesCreated: store.gamesCreated,
		gamesFinished: store.gamesFinished,
		roundsCompleted: store.roundsCompleted,
		submissionsReceived: store.submissionsReceived,
		correctSubmissions: store.correctSubmissions,
		incorrectSubmissions: store.incorrectSubmissions,
		apiErrors: store.apiErrors,
		avgRoundDurationMs:
			store.roundsCompleted > 0
				? Math.round(store.totalRoundDurationMs / store.roundsCompleted)
				: 0,
		startedAt: store.startedAt,
	};
}

export function resetMetrics() {
	store.gamesCreated = 0;
	store.gamesFinished = 0;
	store.roundsCompleted = 0;
	store.submissionsReceived = 0;
	store.correctSubmissions = 0;
	store.incorrectSubmissions = 0;
	store.apiErrors = 0;
	store.totalRoundDurationMs = 0;
	store.startedAt = new Date().toISOString();
}
