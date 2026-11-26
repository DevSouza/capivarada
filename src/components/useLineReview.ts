"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { classifyGame, ENGINE_LINES, terminalEval, type OpeningBook } from "@/lib/analysis/analyze";
import { defaultPoolSize } from "@/lib/engine/pool";
import { SearchQueue } from "@/lib/engine/queue";
import { EngineWorker } from "@/lib/engine/worker";
import { lineSearches, withLine, type Line } from "@/lib/line";
import { loadBook, PRESETS, type Preset } from "@/lib/review";
import type { GameReview, PositionEval } from "@/lib/types";

/** Basta para acompanhar quem joga lances em sequência. */
const MAX_ENGINES = 2;

/** O que já se sabe dos lances mostrados: pode ter menos lances que eles. */
export type KnownReview = Pick<GameReview, "plies" | "evals">;

/**
 * Analisa e classifica os lances da variante, com a mesma profundidade da partida.
 * As posições já vistas ficam guardadas enquanto a revisão estiver aberta.
 */
export function useLineReview(review: GameReview, preset: Preset, line: Line | null) {
  const [results, setResults] = useState<ReadonlyMap<string, PositionEval>>(new Map());
  const [book, setBook] = useState<OpeningBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const queue = useRef<SearchQueue | null>(null);

  useEffect(() => {
    const created = new SearchQueue(Math.min(MAX_ENGINES, defaultPoolSize()), () => new EngineWorker(), {
      onResult: (key, result) => {
        setError(null);
        setResults((current) => new Map(current).set(key, result));
      },
      onError: ({ message }) => setError(message),
    });
    queue.current = created;
    return () => created.terminate();
  }, []);

  const needsBook = line !== null && book === null;
  useEffect(() => {
    if (!needsBook) return;
    const abort = new AbortController();
    loadBook(abort.signal)
      .then(setBook)
      .catch((failure: Error) => {
        if (!abort.signal.aborted) setError(failure.message);
      });
    return () => abort.abort();
  }, [needsBook, attempt]);

  /** As posições da variante, com a avaliação das que já foram buscadas. */
  const positions = useMemo(
    () =>
      line
        ? lineSearches(review.game, line, ENGINE_LINES).map((search) => ({
            ...search,
            found: terminalEval(search.fen) ?? results.get(search.key) ?? null,
          }))
        : [],
    [review, line, results],
  );

  useEffect(() => {
    const { nodes } = PRESETS[preset];
    queue.current?.replace(
      positions.flatMap(({ key, job, found }) => (found ? [] : [{ key, request: { ...job, nodes } }])),
    );
  }, [positions, preset, attempt]);

  const known: KnownReview = useMemo(() => {
    if (!line) return review;
    const evals = review.evals.slice(0, line.base + 1);
    for (const { found } of positions) {
      if (!found) break;
      evals.push(found);
    }
    const plies = review.plies.slice(0, line.base);
    if (!book || evals.length === line.base + 1) return { plies, evals };
    const game = withLine(review.game, line);
    const classified = classifyGame({ ...game, plies: game.plies.slice(0, evals.length - 1) }, evals, book);
    return { plies: [...plies, ...classified.plies.slice(line.base)], evals };
  }, [review, line, positions, book]);

  return {
    known,
    error,
    retry: () => {
      setError(null);
      setAttempt((current) => current + 1);
    },
  };
}
