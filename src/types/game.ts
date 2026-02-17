export type GameStatus = "WAITING" | "IN_PROGRESS" | "FINISHED";

export type RoundStatus = "PENDING" | "ACTIVE" | "COUNTDOWN" | "ENDED";

export interface CreateGameResponse {
  gameCode: string;
  playerId: string;
  sessionToken: string;
  isHost: boolean;
}

export interface JoinGameResponse {
  gameCode: string;
  playerId: string;
  sessionToken: string;
  isHost: boolean;
}

export interface PlayerInfo {
  id: string;
  displayName: string;
  isHost: boolean;
}

export interface GameStateResponse {
  gameCode: string;
  status: GameStatus;
  currentRound: RoundView | null;
  totalRounds: number;
  completedRounds: number;
  currentRoundNumber: number;
  players: PlayerInfo[];
}

export interface RoundView {
  roundNumber: number;
  equationText: string;
  status: RoundStatus;
  startedAt: string | null;
  countdownEndsAt: string | null;
  hasSubmitted: boolean;
}

export interface SubmitAnswerResponse {
  isCorrect: boolean;
  correctAnswer: number;
  roundNumber: number;
  score: number;
  nextRoundNumber: number | null;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  totalScore: number;
  correctCount: number;
  averageTimeMs: number;
}

export interface GameReport {
  gameCode: string;
  totalRounds: number;
  correctCount: number;
  incorrectCount: number;
  totalScore: number;
  rounds: RoundResult[];
  leaderboard: LeaderboardEntry[];
}

export interface RoundResult {
  roundNumber: number;
  equationText: string;
  correctAnswer: number;
  playerAnswer: number;
  isCorrect: boolean;
  timeTakenMs: number | null;
  score: number;
}

export type GameEventType =
  | "PLAYER_JOINED"
  | "GAME_STARTED"
  | "ROUND_STARTED"
  | "ANSWER_SUBMITTED"
  | "FIRST_CORRECT"
  | "COUNTDOWN_STARTED"
  | "ROUND_ENDED"
  | "GAME_ENDED"
  | "LEADERBOARD_UPDATED";

export interface GameEventPayload {
  type: GameEventType;
  data: Record<string, unknown>;
  timestamp: string;
}
