"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api-client";

type Mode = "menu" | "join";

const btnClass =
  "rounded-lg bg-foreground px-10 py-4 text-background text-xl font-medium transition-opacity hover:opacity-80 disabled:opacity-40";

const inputClass =
  "w-64 rounded-lg border border-foreground/20 bg-background px-4 py-3 text-center text-lg font-mono focus:border-foreground/50 focus:outline-none";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("menu");
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNewGame() {
    setLoading(true);
    setError(null);
    try {
      const name = displayName.trim() || "Player";
      const { gameCode, playerId, sessionToken, isHost } =
        await apiClient.createGame(name);

      sessionStorage.setItem("playerId", playerId);
      sessionStorage.setItem("sessionToken", sessionToken);
      sessionStorage.setItem("gameCode", gameCode);
      sessionStorage.setItem("isHost", String(isHost));

      router.push(`/lobby/${gameCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
      setLoading(false);
    }
  }

  async function handleJoinGame(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    setError(null);
    try {
      const name = displayName.trim() || "Player";
      const { gameCode, playerId, sessionToken, isHost } =
        await apiClient.joinGame(code, name);

      sessionStorage.setItem("playerId", playerId);
      sessionStorage.setItem("sessionToken", sessionToken);
      sessionStorage.setItem("gameCode", gameCode);
      sessionStorage.setItem("isHost", String(isHost));

      router.push(`/lobby/${gameCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join game");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Math Sprint</h1>
      <p className="text-lg text-foreground/60">
        Test your mental math. 10 equations. Race your friends.
      </p>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Your name (optional)"
        className={inputClass}
      />

      {mode === "menu" && (
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleNewGame}
            disabled={loading}
            className={btnClass}
          >
            {loading ? "Creating..." : "New Game"}
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className="text-foreground/60 underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Join a game
          </button>
        </div>
      )}

      {mode === "join" && (
        <form
          onSubmit={handleJoinGame}
          className="flex flex-col items-center gap-4"
        >
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Game code"
            maxLength={6}
            className={`${inputClass} uppercase tracking-widest`}
          />
          <button type="submit" disabled={loading || !joinCode.trim()} className={btnClass}>
            {loading ? "Joining..." : "Join"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("menu");
              setJoinCode("");
              setError(null);
            }}
            className="text-foreground/60 underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Back
          </button>
        </form>
      )}

      <div className="mt-8 flex gap-6 text-sm text-foreground/60">
        <Link href="/stats" className="underline underline-offset-4 hover:text-foreground transition-colors">
          Stats
        </Link>
        <Link href="/monitoring" className="underline underline-offset-4 hover:text-foreground transition-colors">
          Monitoring
        </Link>
      </div>
    </div>
  );
}
