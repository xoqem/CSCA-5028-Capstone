import { describe, it, expect } from "vitest";
import {
	createGame,
	joinGame,
	startGame,
	submitAnswer,
	getGameState,
	getGameReport,
	getLeaderboard,
} from "@/services/game-service";

describe("Game Service (integration)", () => {
	describe("create + join", () => {
		it("creates a game and returns host info", async () => {
			const result = await createGame("Alice");

			expect(result.gameCode).toHaveLength(6);
			expect(result.playerId).toBeTruthy();
			expect(result.isHost).toBe(true);
		});

		it("allows a second player to join", async () => {
			const host = await createGame("Alice");
			const joiner = await joinGame(host.gameCode, "Bob");

			expect(joiner.isHost).toBe(false);
			expect(joiner.gameCode).toBe(host.gameCode);

			const state = await getGameState(host.gameCode, host.playerId);
			expect(state.players).toHaveLength(2);
			expect(state.players.map((p) => p.displayName).sort()).toEqual([
				"Alice",
				"Bob",
			]);
		});

		it("rejects joining a non-existent game", async () => {
			await expect(joinGame("NOCODE", "Bob")).rejects.toThrow("Game not found");
		});
	});

	describe("start + round creation", () => {
		it("starts game with 10 rounds and activates round 1", async () => {
			const host = await createGame("Alice");
			await startGame(host.gameCode);

			const state = await getGameState(host.gameCode, host.playerId);
			expect(state.status).toBe("IN_PROGRESS");
			expect(state.totalRounds).toBe(10);
			expect(state.currentRound).toBeTruthy();
			expect(state.currentRound?.roundNumber).toBe(1);
			expect(state.currentRound?.status).toBe("ACTIVE");
		});

		it("rejects starting an already-started game", async () => {
			const host = await createGame("Alice");
			await startGame(host.gameCode);
			await expect(startGame(host.gameCode)).rejects.toThrow(
				"Game already started",
			);
		});
	});

	describe("submission handling", () => {
		it("correct answer scores > 0", async () => {
			const host = await createGame("Alice");
			await startGame(host.gameCode);

			const result = await submitAnswer({
				gameCode: host.gameCode,
				roundNumber: 1,
				playerId: host.playerId,
				answer: 4,
				timeTakenMs: 500,
			});

			expect(result.isCorrect).toBe(true);
			expect(result.score).toBeGreaterThan(0);
			expect(result.correctAnswer).toBe(4);
		});

		it("incorrect answer scores 0", async () => {
			const host = await createGame("Alice");
			await startGame(host.gameCode);

			const result = await submitAnswer({
				gameCode: host.gameCode,
				roundNumber: 1,
				playerId: host.playerId,
				answer: 999,
			});

			expect(result.isCorrect).toBe(false);
			expect(result.score).toBe(0);
		});

		it("first correct triggers countdown fields", async () => {
			const host = await createGame("Alice");
			const joiner = await joinGame(host.gameCode, "Bob");
			await startGame(host.gameCode);

			await submitAnswer({
				gameCode: host.gameCode,
				roundNumber: 1,
				playerId: host.playerId,
				answer: 4,
				timeTakenMs: 300,
			});

			const state = await getGameState(host.gameCode, joiner.playerId);
			expect(state.currentRound?.countdownEndsAt).toBeTruthy();
		});

		it("rejects duplicate submission", async () => {
			const host = await createGame("Alice");
			await joinGame(host.gameCode, "Bob");
			await startGame(host.gameCode);

			await submitAnswer({
				gameCode: host.gameCode,
				roundNumber: 1,
				playerId: host.playerId,
				answer: 4,
			});

			await expect(
				submitAnswer({
					gameCode: host.gameCode,
					roundNumber: 1,
					playerId: host.playerId,
					answer: 4,
				}),
			).rejects.toThrow("Already submitted");
		});
	});

	describe("full game flow + leaderboard", () => {
		it("plays through all rounds and produces correct leaderboard", async () => {
			const host = await createGame("Alice");
			const joiner = await joinGame(host.gameCode, "Bob");
			await startGame(host.gameCode);

			for (let round = 1; round <= 10; round++) {
				await submitAnswer({
					gameCode: host.gameCode,
					roundNumber: round,
					playerId: host.playerId,
					answer: 4,
					timeTakenMs: 500,
				});
				await submitAnswer({
					gameCode: host.gameCode,
					roundNumber: round,
					playerId: joiner.playerId,
					answer: 999,
				});

			}

			const state = await getGameState(host.gameCode, host.playerId);
			expect(state.status).toBe("FINISHED");

			const leaderboard = await getLeaderboard(host.gameCode);
			expect(leaderboard).toHaveLength(2);
			expect(leaderboard[0].displayName).toBe("Alice");
			expect(leaderboard[0].totalScore).toBeGreaterThan(0);
			expect(leaderboard[0].correctCount).toBe(10);
			expect(leaderboard[1].displayName).toBe("Bob");
			expect(leaderboard[1].totalScore).toBe(0);

			const report = await getGameReport(host.gameCode, host.playerId);
			expect(report.correctCount).toBe(10);
			expect(report.totalScore).toBe(leaderboard[0].totalScore);
		});
	});
});
