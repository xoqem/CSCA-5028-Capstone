import {
	describe,
	it,
	expect,
	vi,
	beforeEach,
	type Mock,
} from "vitest";

vi.mock("@/repositories/game-repository");
vi.mock("@/lib/equation-generator", () => ({
	getDifficulty: vi.fn(() => "easy"),
	generateEquation: vi.fn(async () => ({ text: "2 + 2", answer: 4 })),
}));

import * as gameRepo from "@/repositories/game-repository";
import {
	createGame,
	joinGame,
	startGame,
	submitAnswer,
	advanceRoundIfNeeded,
	getGameState,
	getGameReport,
} from "@/services/game-service";

const repo = gameRepo as unknown as {
	[K in keyof typeof gameRepo]: Mock;
};

function makeGame(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "game-1",
		gameCode: "ABC123",
		status: "WAITING",
		currentRoundNumber: 0,
		createdAt: new Date(),
		...overrides,
	};
}

function makePlayer(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "player-1",
		gameId: "game-1",
		displayName: "Alice",
		sessionToken: "tok-abc",
		isHost: true,
		joinedAt: new Date(),
		...overrides,
	};
}

function makeRound(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "round-1",
		gameId: "game-1",
		roundNumber: 1,
		equationText: "2 + 2",
		correctAnswer: 4,
		status: "ACTIVE",
		startedAt: new Date(),
		firstCorrectAt: null,
		countdownEndsAt: null,
		endedAt: null,
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	repo.createGameEvent.mockResolvedValue(undefined);
});

describe("createGame", () => {
	it("creates game + player and returns isHost true", async () => {
		const game = makeGame();
		const player = makePlayer();
		repo.createGame.mockResolvedValue(game);
		repo.createPlayer.mockResolvedValue(player);

		const result = await createGame("Alice");

		expect(result.gameCode).toHaveLength(6);
		expect(result.playerId).toBe("player-1");
		expect(result.isHost).toBe(true);
		expect(result.sessionToken).toBeTruthy();
		expect(repo.createGame).toHaveBeenCalledOnce();
		expect(repo.createPlayer).toHaveBeenCalledOnce();
	});

	it("emits PLAYER_JOINED event", async () => {
		repo.createGame.mockResolvedValue(makeGame());
		repo.createPlayer.mockResolvedValue(makePlayer());

		await createGame("Alice");

		expect(repo.createGameEvent).toHaveBeenCalledWith(
			"game-1",
			"PLAYER_JOINED",
			expect.objectContaining({ playerId: "player-1", displayName: "Alice" }),
		);
	});
});

describe("joinGame", () => {
	it("joins an existing waiting game and returns isHost false", async () => {
		repo.findGameByCode.mockResolvedValue(makeGame());
		repo.createPlayer.mockResolvedValue(
			makePlayer({ id: "player-2", isHost: false, displayName: "Bob" }),
		);

		const result = await joinGame("ABC123", "Bob");

		expect(result.isHost).toBe(false);
		expect(result.playerId).toBe("player-2");
		expect(repo.createPlayer).toHaveBeenCalledWith(
			"game-1",
			"Bob",
			expect.any(String),
			false,
		);
	});

	it("throws when game not found", async () => {
		repo.findGameByCode.mockResolvedValue(null);
		await expect(joinGame("NOPE", "Bob")).rejects.toThrow("Game not found");
	});

	it("throws when game already started", async () => {
		repo.findGameByCode.mockResolvedValue(makeGame({ status: "IN_PROGRESS" }));
		await expect(joinGame("ABC123", "Bob")).rejects.toThrow("Game already started");
	});
});

describe("startGame", () => {
	it("creates 10 rounds and sets game to IN_PROGRESS", async () => {
		repo.findGameByCode.mockResolvedValue(makeGame());
		repo.createRounds.mockResolvedValue(undefined);
		repo.updateGameStatus.mockResolvedValue(undefined);
		repo.findRound.mockResolvedValue(makeRound());
		repo.updateRoundStatus.mockResolvedValue(undefined);
		repo.updateGameCurrentRound.mockResolvedValue(undefined);

		await startGame("ABC123");

		expect(repo.createRounds).toHaveBeenCalledOnce();
		const roundsArg = repo.createRounds.mock.calls[0][0] as Array<unknown>;
		expect(roundsArg).toHaveLength(10);
		expect(repo.updateGameStatus).toHaveBeenCalledWith("ABC123", "IN_PROGRESS");
	});

	it("activates round 1 after starting", async () => {
		repo.findGameByCode.mockResolvedValue(makeGame());
		repo.createRounds.mockResolvedValue(undefined);
		repo.updateGameStatus.mockResolvedValue(undefined);
		repo.findRound.mockResolvedValue(makeRound());
		repo.updateRoundStatus.mockResolvedValue(undefined);
		repo.updateGameCurrentRound.mockResolvedValue(undefined);

		await startGame("ABC123");

		expect(repo.updateRoundStatus).toHaveBeenCalledWith(
			"round-1",
			"ACTIVE",
			expect.objectContaining({ startedAt: expect.any(Date) }),
		);
		expect(repo.updateGameCurrentRound).toHaveBeenCalledWith("ABC123", 1);
	});
});

describe("submitAnswer", () => {
	it("scores a correct answer", async () => {
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		repo.findRound.mockResolvedValue(makeRound());
		repo.findSubmissionForPlayerRound.mockResolvedValue(null);
		repo.setRoundFirstCorrect.mockResolvedValue(makeRound({ firstCorrectAt: new Date() }));
		repo.createSubmission.mockResolvedValue(undefined);
		repo.countPlayersInGame.mockResolvedValue(2);
		repo.countSubmissionsForRound.mockResolvedValue(1);
		repo.countSubmissionsForPlayer.mockResolvedValue(1);

		const result = await submitAnswer({
			gameCode: "ABC123",
			roundNumber: 1,
			playerId: "player-1",
			answer: 4,
			timeTakenMs: 500,
		});

		expect(result.isCorrect).toBe(true);
		expect(result.score).toBeGreaterThan(0);
		expect(repo.createSubmission).toHaveBeenCalledWith(
			expect.objectContaining({
				isCorrect: true,
				score: expect.any(Number),
			}),
		);
	});

	it("scores an incorrect answer as 0", async () => {
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		repo.findRound.mockResolvedValue(makeRound());
		repo.findSubmissionForPlayerRound.mockResolvedValue(null);
		repo.createSubmission.mockResolvedValue(undefined);
		repo.countPlayersInGame.mockResolvedValue(2);
		repo.countSubmissionsForRound.mockResolvedValue(1);
		repo.countSubmissionsForPlayer.mockResolvedValue(1);

		const result = await submitAnswer({
			gameCode: "ABC123",
			roundNumber: 1,
			playerId: "player-1",
			answer: 999,
		});

		expect(result.isCorrect).toBe(false);
		expect(result.score).toBe(0);
	});

	it("first correct triggers countdown", async () => {
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		repo.findRound.mockResolvedValue(makeRound());
		repo.findSubmissionForPlayerRound.mockResolvedValue(null);
		repo.setRoundFirstCorrect.mockResolvedValue(
			makeRound({ firstCorrectAt: new Date(), countdownEndsAt: new Date() }),
		);
		repo.createSubmission.mockResolvedValue(undefined);
		repo.countPlayersInGame.mockResolvedValue(2);
		repo.countSubmissionsForRound.mockResolvedValue(1);
		repo.countSubmissionsForPlayer.mockResolvedValue(1);

		await submitAnswer({
			gameCode: "ABC123",
			roundNumber: 1,
			playerId: "player-1",
			answer: 4,
		});

		expect(repo.setRoundFirstCorrect).toHaveBeenCalledWith(
			"round-1",
			expect.any(Date),
			expect.any(Date),
		);
		const eventCalls = repo.createGameEvent.mock.calls.map(
			(c: unknown[]) => c[1],
		);
		expect(eventCalls).toContain("FIRST_CORRECT");
		expect(eventCalls).toContain("COUNTDOWN_STARTED");
	});

	it("does not retrigger countdown on second correct answer", async () => {
		const roundWithCountdown = makeRound({
			firstCorrectAt: new Date(),
			countdownEndsAt: new Date(Date.now() + 5000),
			status: "COUNTDOWN",
		});
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		repo.findRound.mockResolvedValue(roundWithCountdown);
		repo.findSubmissionForPlayerRound.mockResolvedValue(null);
		repo.createSubmission.mockResolvedValue(undefined);
		repo.countPlayersInGame.mockResolvedValue(2);
		repo.countSubmissionsForRound.mockResolvedValue(1);
		repo.countSubmissionsForPlayer.mockResolvedValue(1);

		await submitAnswer({
			gameCode: "ABC123",
			roundNumber: 1,
			playerId: "player-2",
			answer: 4,
		});

		expect(repo.setRoundFirstCorrect).not.toHaveBeenCalled();
	});

	it("rejects submission when round is ENDED", async () => {
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		repo.findRound.mockResolvedValue(makeRound({ status: "ENDED" }));

		await expect(
			submitAnswer({
				gameCode: "ABC123",
				roundNumber: 1,
				playerId: "player-1",
				answer: 4,
			}),
		).rejects.toThrow("Round is not accepting submissions");
	});

	it("rejects duplicate submission", async () => {
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		repo.findRound.mockResolvedValue(makeRound());
		repo.findSubmissionForPlayerRound.mockResolvedValue({ id: "existing" });

		await expect(
			submitAnswer({
				gameCode: "ABC123",
				roundNumber: 1,
				playerId: "player-1",
				answer: 4,
			}),
		).rejects.toThrow("Already submitted for this round");
	});

	it("rejects submission after countdown expired", async () => {
		const expired = makeRound({
			status: "COUNTDOWN",
			countdownEndsAt: new Date(Date.now() - 1000),
		});
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		repo.findRound.mockResolvedValue(expired);

		await expect(
			submitAnswer({
				gameCode: "ABC123",
				roundNumber: 1,
				playerId: "player-1",
				answer: 4,
			}),
		).rejects.toThrow("Round countdown has expired");
	});

	it("ends round immediately when all players have submitted", async () => {
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		repo.findRound
			.mockResolvedValueOnce(makeRound())
			.mockResolvedValueOnce(makeRound());
		repo.findSubmissionForPlayerRound.mockResolvedValue(null);
		repo.createSubmission.mockResolvedValue(undefined);
		repo.countPlayersInGame.mockResolvedValue(1);
		repo.countSubmissionsForRound.mockResolvedValue(1);
		repo.countSubmissionsForPlayer.mockResolvedValue(1);
		repo.updateRoundStatus.mockResolvedValue(undefined);
		repo.updateGameCurrentRound.mockResolvedValue(undefined);

		await submitAnswer({
			gameCode: "ABC123",
			roundNumber: 1,
			playerId: "player-1",
			answer: 999,
		});

		expect(repo.updateRoundStatus).toHaveBeenCalledWith(
			"round-1",
			"ENDED",
			expect.objectContaining({ endedAt: expect.any(Date) }),
		);
	});
});

describe("advanceRoundIfNeeded", () => {
	it("ends COUNTDOWN round when countdown has expired", async () => {
		vi.useFakeTimers();
		const now = new Date("2025-01-01T00:00:10.000Z");
		vi.setSystemTime(now);

		const expiredRound = makeRound({
			status: "COUNTDOWN",
			countdownEndsAt: new Date("2025-01-01T00:00:05.000Z"),
		});
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		repo.findRound
			.mockResolvedValueOnce(expiredRound)
			.mockResolvedValueOnce(expiredRound);
		repo.updateRoundStatus.mockResolvedValue(undefined);
		repo.updateGameCurrentRound.mockResolvedValue(undefined);

		await advanceRoundIfNeeded("ABC123");

		expect(repo.updateRoundStatus).toHaveBeenCalledWith(
			"round-1",
			"ENDED",
			expect.objectContaining({ endedAt: expect.any(Date) }),
		);

		vi.useRealTimers();
	});

	it("does not end ACTIVE round when not all players submitted", async () => {
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		repo.findRound.mockResolvedValue(makeRound({ status: "ACTIVE" }));
		repo.countPlayersInGame.mockResolvedValue(2);
		repo.countSubmissionsForRound.mockResolvedValue(1);

		await advanceRoundIfNeeded("ABC123");

		expect(repo.updateRoundStatus).not.toHaveBeenCalled();
	});

	it("ends ACTIVE round when all submitted and none correct", async () => {
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		const activeRound = makeRound({ status: "ACTIVE" });
		repo.findRound
			.mockResolvedValueOnce(activeRound)
			.mockResolvedValueOnce(activeRound);
		repo.countPlayersInGame.mockResolvedValue(2);
		repo.countSubmissionsForRound.mockResolvedValue(2);
		repo.countCorrectSubmissionsForRound.mockResolvedValue(0);
		repo.updateRoundStatus.mockResolvedValue(undefined);
		repo.updateGameCurrentRound.mockResolvedValue(undefined);

		await advanceRoundIfNeeded("ABC123");

		expect(repo.updateRoundStatus).toHaveBeenCalledWith(
			"round-1",
			"ENDED",
			expect.objectContaining({ endedAt: expect.any(Date) }),
		);
	});

	it("does nothing when round is already ENDED", async () => {
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		repo.findRound.mockResolvedValue(makeRound({ status: "ENDED" }));

		await advanceRoundIfNeeded("ABC123");

		expect(repo.updateRoundStatus).not.toHaveBeenCalled();
	});
});

describe("getGameState", () => {
	it("returns game state with current round info", async () => {
		const game = {
			...makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
			players: [makePlayer()],
		};
		repo.findGameByCodeWithPlayers.mockResolvedValue(game);
		repo.findGameByCode.mockResolvedValue(
			makeGame({ status: "IN_PROGRESS", currentRoundNumber: 1 }),
		);
		repo.findRound.mockResolvedValue(makeRound());
		repo.countPlayersInGame.mockResolvedValue(1);
		repo.countSubmissionsForRound.mockResolvedValue(0);
		repo.countRoundsWithStatus.mockResolvedValue(0);
		repo.findSubmissionForPlayerRound.mockResolvedValue(null);

		const result = await getGameState("ABC123", "player-1");

		expect(result.gameCode).toBe("ABC123");
		expect(result.status).toBe("IN_PROGRESS");
		expect(result.totalRounds).toBe(10);
		expect(result.currentRound).toBeTruthy();
		expect(result.currentRound?.roundNumber).toBe(1);
		expect(result.currentRound?.hasSubmitted).toBe(false);
		expect(result.players).toHaveLength(1);
	});
});

describe("getGameReport", () => {
	it("builds report with scores and leaderboard", async () => {
		repo.findGameByCode.mockResolvedValue(makeGame({ status: "FINISHED" }));
		repo.getSubmissionsForPlayer.mockResolvedValue([
			{
				id: "sub-1",
				roundId: "round-1",
				playerId: "player-1",
				answer: 4,
				isCorrect: true,
				score: 125,
				timeTakenMs: 500,
				submittedAt: new Date(),
				round: makeRound(),
			},
		]);
		repo.getLeaderboard.mockResolvedValue([
			{
				playerId: "player-1",
				displayName: "Alice",
				totalScore: 125,
				correctCount: 1,
				averageTimeMs: 500,
			},
		]);

		const report = await getGameReport("ABC123", "player-1");

		expect(report.gameCode).toBe("ABC123");
		expect(report.totalRounds).toBe(10);
		expect(report.correctCount).toBe(1);
		expect(report.totalScore).toBe(125);
		expect(report.leaderboard).toHaveLength(1);
		expect(report.rounds).toHaveLength(1);
	});
});
