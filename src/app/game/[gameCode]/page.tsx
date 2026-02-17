"use client";

import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useGameEvents } from "@/hooks/useGameEvents";
import { apiClient } from "@/lib/api-client";
import type {
	GameReport,
	GameStateResponse,
	LeaderboardEntry,
	SubmitAnswerResponse,
} from "@/types/game";

type Phase =
	| "loading"
	| "playing"
	| "waiting-result"
	| "round-result"
	| "finished"
	| "error";

interface RoundResultData {
	isCorrect: boolean;
	correctAnswer: number;
	playerAnswer: number;
	roundNumber: number;
	score: number;
}

function getPlayerId(): string | null {
	if (typeof window === "undefined") return null;
	return sessionStorage.getItem("playerId");
}

const btnClass =
	"rounded-lg bg-foreground px-8 py-3 text-background font-medium transition-opacity hover:opacity-80";

const inputClass =
	"w-64 rounded-lg border border-foreground/20 bg-background px-4 py-3 text-center text-2xl font-mono focus:border-foreground/50 focus:outline-none";

export default function GamePage({
	params,
}: {
	params: Promise<{ gameCode: string }>;
}) {
	const { gameCode } = use(params);
	const router = useRouter();

	const [phase, setPhase] = useState<Phase>("loading");
	const [gameState, setGameState] = useState<GameStateResponse | null>(null);
	const [answer, setAnswer] = useState("");
	const [roundResult, setRoundResult] = useState<RoundResultData | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
	const [countdown, setCountdown] = useState<number | null>(null);
	const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const fetchAndSetState = useCallback(async () => {
		const playerId = getPlayerId();
		if (!playerId) {
			router.push("/");
			return;
		}

		try {
			const state = await apiClient.getGameState(gameCode, playerId);
			setGameState(state);

			if (state.status === "FINISHED") {
				setPhase("finished");
			} else if (state.currentRound) {
				if (state.currentRound.hasSubmitted) {
					setPhase("waiting-result");
					if (state.currentRound.countdownEndsAt) {
						const endsAt = new Date(
							state.currentRound.countdownEndsAt,
						).getTime();
						const remaining = Math.max(
							0,
							Math.ceil((endsAt - Date.now()) / 1000),
						);
						setCountdown(remaining);
					}
				} else if (
					state.currentRound.status === "ACTIVE" ||
					state.currentRound.status === "COUNTDOWN"
				) {
					setRoundStartTime(Date.now());
					setPhase("playing");
					if (state.currentRound.countdownEndsAt) {
						const endsAt = new Date(
							state.currentRound.countdownEndsAt,
						).getTime();
						const remaining = Math.max(
							0,
							Math.ceil((endsAt - Date.now()) / 1000),
						);
						setCountdown(remaining);
					}
				} else if (state.currentRound.status === "ENDED") {
					await apiClient.advanceRound(gameCode);
					const next = await apiClient.getGameState(gameCode, playerId);
					setGameState(next);
					if (next.status === "FINISHED") {
						setPhase("finished");
					} else if (next.currentRound) {
						setRoundStartTime(Date.now());
						setPhase("playing");
					}
				}
			} else {
				setPhase("error");
				setErrorMessage("No round available");
			}
		} catch (err) {
			setPhase("error");
			setErrorMessage(
				err instanceof Error ? err.message : "Failed to load game",
			);
		}
	}, [gameCode, router]);

	// initial load
	useEffect(() => {
		const pid = getPlayerId();
		if (!pid) {
			router.push("/");
			return;
		}
		let cancelled = false;
		async function init() {
			await fetchAndSetState();
		}
		if (!cancelled) init();
		return () => {
			cancelled = true;
		};
	}, [fetchAndSetState, router]);

	// countdown timer
	useEffect(() => {
		if (countdown === null || countdown <= 0) {
			if (countdownRef.current) {
				clearInterval(countdownRef.current);
				countdownRef.current = null;
			}
			if (countdown === 0) {
				apiClient.advanceRound(gameCode).then(() => fetchAndSetState());
			}
			return;
		}

		countdownRef.current = setInterval(() => {
			setCountdown((prev) => {
				if (prev === null || prev <= 1) return 0;
				return prev - 1;
			});
		}, 1000);

		return () => {
			if (countdownRef.current) {
				clearInterval(countdownRef.current);
				countdownRef.current = null;
			}
		};
	}, [countdown, gameCode, fetchAndSetState]);

	// sse event handler
	const handleEvent = useCallback(
		(event: { type: string; data: Record<string, unknown> }) => {
			switch (event.type) {
				case "COUNTDOWN_STARTED": {
					const endsAt = event.data.countdownEndsAt as string;
					if (endsAt) {
						const remaining = Math.max(
							0,
							Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000),
						);
						setCountdown(remaining);
					}
					break;
				}
				case "ROUND_ENDED":
				case "ROUND_STARTED":
					fetchAndSetState();
					break;
				case "GAME_ENDED":
					setPhase("finished");
					break;
			}
		},
		[fetchAndSetState],
	);

	useGameEvents(gameCode, handleEvent);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const playerId = getPlayerId();
		if (!gameState?.currentRound || !playerId) return;

		const numAnswer = parseFloat(answer);
		if (isNaN(numAnswer)) return;

		const timeTakenMs = roundStartTime
			? Date.now() - roundStartTime
			: undefined;

		try {
			const result: SubmitAnswerResponse = await apiClient.submitAnswer(
				gameCode,
				gameState.currentRound.roundNumber,
				playerId,
				numAnswer,
				timeTakenMs,
			);

			setRoundResult({
				isCorrect: result.isCorrect,
				correctAnswer: result.correctAnswer,
				playerAnswer: numAnswer,
				roundNumber: result.roundNumber,
				score: result.score,
			});
			setAnswer("");
			setPhase("round-result");
		} catch (err) {
			setPhase("error");
			setErrorMessage(err instanceof Error ? err.message : "Submission failed");
		}
	}

	// after seeing round result, wait for next round
	async function handleContinue() {
		setPhase("loading");
		setRoundResult(null);
		setCountdown(null);
		await fetchAndSetState();
	}

	if (phase === "loading") {
		return (
			<Screen>
				<p className="text-foreground/60">Loading...</p>
			</Screen>
		);
	}

	if (phase === "error") {
		return (
			<Screen>
				<p className="text-red-500">{errorMessage ?? "Something went wrong"}</p>
				<button
					type="button"
					onClick={() => router.push("/")}
					className={btnClass}
				>
					Home
				</button>
			</Screen>
		);
	}

	if (phase === "playing" && gameState?.currentRound) {
		return (
			<Screen>
				<RoundHeader
					roundNumber={gameState.currentRound.roundNumber}
					totalRounds={gameState.totalRounds}
					countdown={countdown}
					playerCount={gameState.players.length}
				/>
				<p className="text-5xl font-mono font-bold tracking-tight">
					{gameState.currentRound.equationText} = ?
				</p>
				<form
					onSubmit={handleSubmit}
					className="flex flex-col items-center gap-4"
				>
					<input
						type="number"
						step="any"
						value={answer}
						onChange={(e) => setAnswer(e.target.value)}
						placeholder="Your answer"
						className={inputClass}
					/>
					<button type="submit" className={btnClass}>
						Submit
					</button>
				</form>
			</Screen>
		);
	}

	if (phase === "waiting-result" && gameState?.currentRound) {
		return (
			<Screen>
				<RoundHeader
					roundNumber={gameState.currentRound.roundNumber}
					totalRounds={gameState.totalRounds}
					countdown={countdown}
					playerCount={gameState.players.length}
				/>
				<p className="text-2xl text-foreground/60">
					Waiting for round to end...
				</p>
			</Screen>
		);
	}

	if (phase === "round-result" && roundResult) {
		return (
			<Screen>
				<p
					className={`text-4xl font-bold ${roundResult.isCorrect ? "text-green-500" : "text-red-500"}`}
				>
					{roundResult.isCorrect ? "Correct!" : "Wrong"}
				</p>
				{roundResult.score > 0 && (
					<p className="text-2xl font-mono font-bold text-foreground/80">
						+{roundResult.score} pts
					</p>
				)}
				{!roundResult.isCorrect && (
					<p className="text-foreground/60">
						Answer was{" "}
						<span className="font-mono font-bold">
							{roundResult.correctAnswer}
						</span>
					</p>
				)}
				<p className="text-sm text-foreground/40">
					You answered:{" "}
					<span className="font-mono">{roundResult.playerAnswer}</span>
				</p>
				{countdown !== null && countdown > 0 && (
					<p className="text-sm text-foreground/50">
						Next round in {countdown}s...
					</p>
				)}
				<button type="button" onClick={handleContinue} className={btnClass}>
					Continue
				</button>
			</Screen>
		);
	}

	if (phase === "finished") {
		return (
			<FinishedScreen gameCode={gameCode} playerId={getPlayerId() ?? ""} />
		);
	}

	return null;
}

function Screen({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
			{children}
		</div>
	);
}

function RoundHeader({
	roundNumber,
	totalRounds,
	countdown,
	playerCount,
}: {
	roundNumber: number;
	totalRounds: number;
	countdown: number | null;
	playerCount: number;
}) {
	return (
		<div className="flex items-center gap-6 text-sm text-foreground/50 font-mono">
			<span>
				Round {roundNumber}/{totalRounds}
			</span>
			{playerCount > 1 && <span>{playerCount} players</span>}
			{countdown !== null && countdown > 0 && (
				<span className="text-orange-500 font-bold">{countdown}s</span>
			)}
		</div>
	);
}

function FinishedScreen({
	gameCode,
	playerId,
}: {
	gameCode: string;
	playerId: string;
}) {
	const router = useRouter();
	const [report, setReport] = useState<GameReport | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		apiClient
			.getReport(gameCode, playerId)
			.then((data) => {
				if (!cancelled) setReport(data);
			})
			.catch(console.error)
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [gameCode, playerId]);

	if (loading) {
		return (
			<Screen>
				<p className="text-foreground/60">Calculating results...</p>
			</Screen>
		);
	}

	return (
		<Screen>
			<h2 className="text-3xl font-bold">Game Over</h2>
			{report && (
				<>
					{report.leaderboard.length > 1 && (
						<LeaderboardTable
							entries={report.leaderboard}
							currentPlayerId={playerId}
						/>
					)}

					<div className="flex items-baseline gap-3">
						<p className="text-5xl font-mono font-bold">{report.totalScore}</p>
						<p className="text-foreground/60 text-lg">points</p>
					</div>
					<p className="text-foreground/50">
						{report.correctCount}/{report.totalRounds} correct
					</p>

					<div className="w-full max-w-md flex flex-col gap-2 mt-4">
						{report.rounds.map((r) => (
							<div
								key={r.roundNumber}
								className={`flex justify-between rounded-lg px-4 py-3 text-sm font-mono ${
									r.isCorrect
										? "bg-green-500/10 text-green-600"
										: "bg-red-500/10 text-red-600"
								}`}
							>
								<span>
									{r.equationText} = {r.correctAnswer}
								</span>
								<span>{r.isCorrect ? `+${r.score}` : "0"} pts</span>
							</div>
						))}
					</div>
				</>
			)}
			<button
				type="button"
				onClick={() => router.push("/")}
				className={btnClass}
			>
				Play Again
			</button>
		</Screen>
	);
}

function LeaderboardTable({
	entries,
	currentPlayerId,
}: {
	entries: LeaderboardEntry[];
	currentPlayerId: string;
}) {
	return (
		<div className="w-full max-w-md">
			<h3 className="text-sm text-foreground/50 mb-2 uppercase tracking-wider">
				Leaderboard
			</h3>
			<div className="flex flex-col gap-1">
				{entries.map((entry, i) => (
					<div
						key={entry.playerId}
						className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-mono ${
							entry.playerId === currentPlayerId
								? "bg-foreground/10 font-bold"
								: "bg-foreground/5"
						}`}
					>
						<span>
							#{i + 1} {entry.displayName}
						</span>
						<span>{entry.totalScore} pts</span>
					</div>
				))}
			</div>
		</div>
	);
}
