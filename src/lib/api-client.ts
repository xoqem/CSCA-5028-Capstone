import type {
  CreateGameResponse,
  JoinGameResponse,
  GameStateResponse,
  SubmitAnswerResponse,
  GameReport,
} from "@/types/game";

const BASE = "/api";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function get<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const apiClient = {
  createGame: (displayName: string) =>
    post<CreateGameResponse>("/games", { displayName }),

  joinGame: (gameCode: string, displayName: string) =>
    post<JoinGameResponse>(`/games/${gameCode}/join`, { displayName }),

  startGame: (gameCode: string) =>
    post<{ started: boolean }>(`/games/${gameCode}/start`, {}),

  getGameState: (gameCode: string, playerId: string) =>
    get<GameStateResponse>(`/games/${gameCode}/state`, { playerId }),

  submitAnswer: (
    gameCode: string,
    roundNumber: number,
    playerId: string,
    answer: number,
    timeTakenMs?: number,
  ) =>
    post<SubmitAnswerResponse>(
      `/games/${gameCode}/rounds/${roundNumber}/submit`,
      { playerId, answer, timeTakenMs },
    ),

  advanceRound: (gameCode: string) =>
    post<{ advanced: boolean }>(`/games/${gameCode}/advance-round`, {}),

  getReport: (gameCode: string, playerId: string) =>
    get<GameReport>(`/games/${gameCode}/report`, { playerId }),
};
