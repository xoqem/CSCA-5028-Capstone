"use client";

import { useEffect, useRef } from "react";

import type { GameEventType } from "@/types/game";

export interface GameEvent {
  type: GameEventType;
  data: Record<string, unknown>;
}

const EVENT_TYPES: GameEventType[] = [
  "PLAYER_JOINED",
  "GAME_STARTED",
  "ROUND_STARTED",
  "ANSWER_SUBMITTED",
  "FIRST_CORRECT",
  "COUNTDOWN_STARTED",
  "ROUND_ENDED",
  "GAME_ENDED",
  "LEADERBOARD_UPDATED",
];

export function useGameEvents(
  gameCode: string | null,
  onEvent: (event: GameEvent) => void,
) {
  const callbackRef = useRef(onEvent);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!gameCode) return;

    const es = new EventSource(`/api/games/${gameCode}/events`);

    for (const type of EVENT_TYPES) {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as Record<string, unknown>;
          callbackRef.current({ type, data });
        } catch {
          // ignore parse errors
        }
      });
    }

    return () => {
      es.close();
    };
  }, [gameCode]);
}
