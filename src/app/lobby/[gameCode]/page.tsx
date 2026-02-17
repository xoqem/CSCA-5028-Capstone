"use client";

import { useState, useEffect, useCallback, use } from "react";

import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api-client";
import { useGameEvents } from "@/hooks/useGameEvents";
import type { PlayerInfo } from "@/types/game";

function getSessionData() {
  if (typeof window === "undefined") return null;
  const playerId = sessionStorage.getItem("playerId");
  const isHost = sessionStorage.getItem("isHost") === "true";
  if (!playerId) return null;
  return { playerId, isHost };
}

const btnClass =
  "rounded-lg bg-foreground px-10 py-4 text-background text-xl font-medium transition-opacity hover:opacity-80 disabled:opacity-40";

export default function LobbyPage({
  params,
}: {
  params: Promise<{ gameCode: string }>;
}) {
  const { gameCode } = use(params);
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSessionData();
    if (!session) {
      router.push("/");
      return;
    }

    const { playerId, isHost: hostFlag } = session;
    let cancelled = false;

    async function fetchState() {
      if (cancelled) return;
      setIsHost(hostFlag);
      try {
        const state = await apiClient.getGameState(gameCode, playerId);
        if (cancelled) return;

        if (state.status === "IN_PROGRESS" || state.status === "FINISHED") {
          router.push(`/game/${gameCode}`);
          return;
        }

        setPlayers(state.players);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load lobby");
        setLoading(false);
      }
    }

    fetchState();

    return () => {
      cancelled = true;
    };
  }, [gameCode, router]);

  const handleEvent = useCallback(
    (event: { type: string; data: Record<string, unknown> }) => {
      if (event.type === "PLAYER_JOINED") {
        const newPlayer: PlayerInfo = {
          id: event.data.playerId as string,
          displayName: event.data.displayName as string,
          isHost: false,
        };
        setPlayers((prev) => {
          if (prev.some((p) => p.id === newPlayer.id)) return prev;
          return [...prev, newPlayer];
        });
      }
      if (event.type === "GAME_STARTED") {
        router.push(`/game/${gameCode}`);
      }
    },
    [gameCode, router],
  );

  useGameEvents(gameCode, handleEvent);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      await apiClient.startGame(gameCode);
      router.push(`/game/${gameCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <p className="text-foreground/60">Loading lobby...</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <h2 className="text-3xl font-bold">Game Lobby</h2>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-foreground/50">Share this code:</p>
        <p className="text-5xl font-mono font-bold tracking-widest">
          {gameCode}
        </p>
      </div>

      <div className="w-full max-w-sm">
        <p className="text-sm text-foreground/50 mb-2">
          Players ({players.length})
        </p>
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg bg-foreground/5 px-4 py-3"
            >
              <span className="font-medium">{p.displayName}</span>
              {p.isHost && (
                <span className="text-xs text-foreground/40 uppercase tracking-wider">
                  Host
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {isHost ? (
        <button
          type="button"
          onClick={handleStart}
          disabled={starting}
          className={btnClass}
        >
          {starting ? "Starting..." : "Start Game"}
        </button>
      ) : (
        <p className="text-foreground/50 text-lg">
          Waiting for host to start...
        </p>
      )}
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      {children}
    </div>
  );
}
