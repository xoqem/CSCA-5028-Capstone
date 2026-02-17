import { randomBytes } from "crypto";
import { generateEquation, getDifficulty } from "@/lib/equation-generator";
import * as gameRepo from "@/repositories/game-repository";
import { calculateScore } from "@/services/scoring-service";
import type {
	CreateGameResponse,
	GameEventType,
	GameReport,
	GameStateResponse,
	JoinGameResponse,
	LeaderboardEntry,
	RoundView,
	SubmitAnswerResponse,
} from "@/types/game";

const ROUNDS_PER_GAME = 10;
const ANSWER_TOLERANCE = 0.01;
const COUNTDOWN_DURATION_MS = 5_000;

function generateGameCode(): string {
	return randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

function generateSessionToken(): string {
	return randomBytes(32).toString("hex");
}

async function emitEvent(
	gameId: string,
	type: GameEventType,
	data: Record<string, string | number | boolean | null> = {},
): Promise<void> {
	await gameRepo.createGameEvent(gameId, type, data);
}

export async function createGame(
	displayName: string,
): Promise<CreateGameResponse> {
	const gameCode = generateGameCode();
	const sessionToken = generateSessionToken();

	const game = await gameRepo.createGame(gameCode);
	const player = await gameRepo.createPlayer(
		game.id,
		displayName,
		sessionToken,
		true,
	);

	await emitEvent(game.id, "PLAYER_JOINED", {
		playerId: player.id,
		displayName,
	});

	return { gameCode, playerId: player.id, sessionToken, isHost: true };
}

export async function joinGame(
	gameCode: string,
	displayName: string,
): Promise<JoinGameResponse> {
	const game = await gameRepo.findGameByCode(gameCode);
	if (!game) throw new Error(`Game not found: ${gameCode}`);
	if (game.status !== "WAITING") throw new Error("Game already started");

	const sessionToken = generateSessionToken();
	const player = await gameRepo.createPlayer(
		game.id,
		displayName,
		sessionToken,
		false,
	);

	await emitEvent(game.id, "PLAYER_JOINED", {
		playerId: player.id,
		displayName,
	});

	return { gameCode, playerId: player.id, sessionToken, isHost: false };
}

export async function startGame(gameCode: string): Promise<void> {
	const game = await gameRepo.findGameByCode(gameCode);
	if (!game) throw new Error(`Game not found: ${gameCode}`);
	if (game.status !== "WAITING") throw new Error("Game already started");

	const rounds: Array<{
		gameId: string;
		roundNumber: number;
		equationText: string;
		correctAnswer: number;
	}> = [];

	for (let i = 1; i <= ROUNDS_PER_GAME; i++) {
		const difficulty = getDifficulty(i);
		const { text, answer } = await generateEquation(difficulty);
		rounds.push({
			gameId: game.id,
			roundNumber: i,
			equationText: text,
			correctAnswer: answer,
		});
	}

	await gameRepo.createRounds(rounds);
	await gameRepo.updateGameStatus(gameCode, "IN_PROGRESS");
	await emitEvent(game.id, "GAME_STARTED", {});

	await startRound(gameCode, game.id, 1);
}

async function startRound(
	gameCode: string,
	gameId: string,
	roundNumber: number,
): Promise<void> {
	const round = await gameRepo.findRound(gameId, roundNumber);
	if (!round) return;

	await gameRepo.updateRoundStatus(round.id, "ACTIVE", {
		startedAt: new Date(),
	});
	await gameRepo.updateGameCurrentRound(gameCode, roundNumber);

	await emitEvent(gameId, "ROUND_STARTED", {
		roundNumber,
		equationText: round.equationText,
	});
}

export async function advanceRoundIfNeeded(gameCode: string): Promise<void> {
	const game = await gameRepo.findGameByCode(gameCode);
	if (!game || game.status !== "IN_PROGRESS" || game.currentRoundNumber === 0)
		return;

	const round = await gameRepo.findRound(game.id, game.currentRoundNumber);
	if (!round) return;

	if (round.status === "ENDED") return;

	// check if countdown has expired
	if (round.status === "COUNTDOWN" && round.countdownEndsAt) {
		if (new Date() >= round.countdownEndsAt) {
			await endRound(gameCode, game.id, game.currentRoundNumber);
		}
		return;
	}

	// check if all players have submitted, then auto end if no countdown is needed
	if (round.status === "ACTIVE") {
		const playerCount = await gameRepo.countPlayersInGame(game.id);
		const subCount = await gameRepo.countSubmissionsForRound(round.id);
		if (subCount >= playerCount) {
			// all players submitted, if someone was correct, set a short countdown, otherwise end now
			const correctCount = await gameRepo.countCorrectSubmissionsForRound(
				round.id,
			);
			if (correctCount > 0 && !round.firstCorrectAt) {
				// edge case, all submitted with a correct answer but no countdown was set
				await endRound(gameCode, game.id, game.currentRoundNumber);
			} else if (correctCount === 0) {
				// nobody got it right, end the round
				await endRound(gameCode, game.id, game.currentRoundNumber);
			} else {
				// countdown already set, check if expired
				if (round.countdownEndsAt && new Date() >= round.countdownEndsAt) {
					await endRound(gameCode, game.id, game.currentRoundNumber);
				}
			}
		}
	}
}

async function endRound(
	gameCode: string,
	gameId: string,
	roundNumber: number,
): Promise<void> {
	const round = await gameRepo.findRound(gameId, roundNumber);
	if (!round || round.status === "ENDED") return;

	await gameRepo.updateRoundStatus(round.id, "ENDED", { endedAt: new Date() });
	await emitEvent(gameId, "ROUND_ENDED", { roundNumber });

	if (roundNumber >= ROUNDS_PER_GAME) {
		await gameRepo.updateGameStatus(gameCode, "FINISHED");
		await emitEvent(gameId, "GAME_ENDED", {});
	} else {
		await startRound(gameCode, gameId, roundNumber + 1);
	}
}

export async function getGameState(
	gameCode: string,
	playerId: string,
): Promise<GameStateResponse> {
	const game = await gameRepo.findGameByCodeWithPlayers(gameCode);
	if (!game) throw new Error(`Game not found: ${gameCode}`);

	// check if current round needs to move forward
	if (game.status === "IN_PROGRESS" && game.currentRoundNumber > 0) {
		await advanceRoundIfNeeded(gameCode);
		// fetch again after round potentially advanced
		const updated = await gameRepo.findGameByCodeWithPlayers(gameCode);
		if (updated) {
			return buildGameState(updated, playerId);
		}
	}

	return buildGameState(game, playerId);
}

async function buildGameState(
	game: Awaited<ReturnType<typeof gameRepo.findGameByCodeWithPlayers>> & object,
	playerId: string,
): Promise<GameStateResponse> {
	const players = game.players.map((p) => ({
		id: p.id,
		displayName: p.displayName,
		isHost: p.isHost,
	}));

	const completedRounds = await gameRepo.countRoundsWithStatus(
		game.id,
		"ENDED",
	);

	let currentRound: GameStateResponse["currentRound"] = null;

	if (game.status === "IN_PROGRESS" && game.currentRoundNumber > 0) {
		const round = await gameRepo.findRound(game.id, game.currentRoundNumber);
		if (round) {
			const existing = await gameRepo.findSubmissionForPlayerRound(
				round.id,
				playerId,
			);
			currentRound = {
				roundNumber: round.roundNumber,
				equationText: round.equationText,
				status: round.status as RoundView["status"],
				startedAt: round.startedAt?.toISOString() ?? null,
				countdownEndsAt: round.countdownEndsAt?.toISOString() ?? null,
				hasSubmitted: existing !== null,
			};
		}
	}

	return {
		gameCode: game.gameCode,
		status: game.status as GameStateResponse["status"],
		currentRound,
		totalRounds: ROUNDS_PER_GAME,
		completedRounds,
		currentRoundNumber: game.currentRoundNumber,
		players,
	};
}

export async function submitAnswer(input: {
	gameCode: string;
	roundNumber: number;
	playerId: string;
	answer: number;
	timeTakenMs?: number;
}): Promise<SubmitAnswerResponse> {
	const game = await gameRepo.findGameByCode(input.gameCode);
	if (!game) throw new Error(`Game not found: ${input.gameCode}`);
	if (game.status !== "IN_PROGRESS") throw new Error("Game is not in progress");

	const round = await gameRepo.findRound(game.id, input.roundNumber);
	if (!round) throw new Error(`Round ${input.roundNumber} not found`);

	// check round is accepting submissions
	if (round.status !== "ACTIVE" && round.status !== "COUNTDOWN") {
		throw new Error("Round is not accepting submissions");
	}

	// check countdown hasn't expired
	if (round.countdownEndsAt && new Date() >= round.countdownEndsAt) {
		await advanceRoundIfNeeded(input.gameCode);
		throw new Error("Round countdown has expired");
	}

	// check player hasn't already submitted
	const existing = await gameRepo.findSubmissionForPlayerRound(
		round.id,
		input.playerId,
	);
	if (existing) throw new Error("Already submitted for this round");

	const isCorrect =
		Math.abs(input.answer - round.correctAnswer) <= ANSWER_TOLERANCE;

	// determine if this is the first correct answer
	let isFirstCorrect = false;
	if (isCorrect && !round.firstCorrectAt) {
		const now = new Date();
		const countdownEndsAt = new Date(now.getTime() + COUNTDOWN_DURATION_MS);
		const updated = await gameRepo.setRoundFirstCorrect(
			round.id,
			now,
			countdownEndsAt,
		);
		isFirstCorrect = updated !== null;
		if (isFirstCorrect) {
			await emitEvent(game.id, "FIRST_CORRECT", {
				roundNumber: input.roundNumber,
				playerId: input.playerId,
			});
			await emitEvent(game.id, "COUNTDOWN_STARTED", {
				roundNumber: input.roundNumber,
				countdownEndsAt: countdownEndsAt.toISOString(),
			});
		}
	}

	const score = calculateScore({
		isCorrect,
		isFirstCorrect,
		timeTakenMs: input.timeTakenMs,
	});

	await gameRepo.createSubmission({
		roundId: round.id,
		playerId: input.playerId,
		answer: input.answer,
		isCorrect,
		score,
		timeTakenMs: input.timeTakenMs,
	});

	await emitEvent(game.id, "ANSWER_SUBMITTED", {
		roundNumber: input.roundNumber,
		playerId: input.playerId,
	});

	// check if all players have submitted, auto advance if so
	const playerCount = await gameRepo.countPlayersInGame(game.id);
	const subCount = await gameRepo.countSubmissionsForRound(round.id);
	if (subCount >= playerCount) {
		// all players submitted, end round immediately
		await endRound(input.gameCode, game.id, input.roundNumber);
	}

	// determine next round for this player
	const completedCount = await gameRepo.countSubmissionsForPlayer(
		input.playerId,
		game.id,
	);
	const nextRoundNumber =
		completedCount < ROUNDS_PER_GAME ? game.currentRoundNumber : null;

	return {
		isCorrect,
		correctAnswer: round.correctAnswer,
		roundNumber: round.roundNumber,
		score,
		nextRoundNumber,
	};
}

export async function getGameReport(
	gameCode: string,
	playerId: string,
): Promise<GameReport> {
	const game = await gameRepo.findGameByCode(gameCode);
	if (!game) throw new Error(`Game not found: ${gameCode}`);

	const submissions = await gameRepo.getSubmissionsForPlayer(playerId, game.id);
	const leaderboard = await gameRepo.getLeaderboard(game.id);

	const rounds = submissions.map((s) => ({
		roundNumber: s.round.roundNumber,
		equationText: s.round.equationText,
		correctAnswer: s.round.correctAnswer,
		playerAnswer: s.answer,
		isCorrect: s.isCorrect,
		timeTakenMs: s.timeTakenMs,
		score: s.score,
	}));

	const totalScore = rounds.reduce((sum, r) => sum + r.score, 0);

	return {
		gameCode,
		totalRounds: ROUNDS_PER_GAME,
		correctCount: rounds.filter((r) => r.isCorrect).length,
		incorrectCount: rounds.filter((r) => !r.isCorrect).length,
		totalScore,
		rounds,
		leaderboard,
	};
}

export async function getLeaderboard(
	gameCode: string,
): Promise<LeaderboardEntry[]> {
	const game = await gameRepo.findGameByCode(gameCode);
	if (!game) throw new Error(`Game not found: ${gameCode}`);
	return gameRepo.getLeaderboard(game.id);
}
