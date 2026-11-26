"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { classifyGame, ENGINE_LINES, summarize, terminalEval, type OpeningBook } from "@/lib/analysis/analyze";
import { applyDeepened, canDeepen, nodesAt, type Deepened, type KnownReview } from "@/lib/deepen";
import { defaultPoolSize } from "@/lib/engine/pool";
import { SearchQueue } from "@/lib/engine/queue";
import { EngineWorker } from "@/lib/engine/worker";
import { lineSearches, positionKey, positionSearch, withLine, type Line, type PositionSearch } from "@/lib/line";
import { loadBook, PRESETS, type Preset } from "@/lib/review";
import type { GameReview, ParsedGame, PositionEval } from "@/lib/types";

/** Basta para acompanhar quem joga lances em sequência. */
const MAX_ENGINES = 2;

/** Um lance aprofundado: as duas posições e o último nível pedido. */
interface Target {
  level: number;
  before: PositionSearch;
  after: PositionSearch;
}

type Results = ReadonlyMap<string, PositionEval>;

/** A análise original é o nível 0. */
const resultKey = (level: number, key: string) => `${level}|${key}`;

const findResult = (results: Results, level: number, { key, fen }: PositionSearch) =>
  terminalEval(fen) ?? results.get(resultKey(level, key)) ?? null;

/** O nível mais alto já pronto. */
function reached(results: Results, target: Target | undefined): { level: number; deep: Deepened | null } {
  for (let level = target?.level ?? 0; target && level > 0; level--) {
    const before = findResult(results, level, target.before);
    const after = findResult(results, level, target.after);
    if (before && after) return { level, deep: { before, after } };
  }
  return { level: 0, deep: null };
}

/**
 * Analisa o que não veio pronto com a partida: os lances da variante, com a mesma
 * profundidade, e os que o usuário mandou aprofundar. O que já foi buscado fica
 * guardado enquanto a revisão estiver aberta.
 */
export function useReviewAnalysis(review: GameReview, preset: Preset, line: Line | null, index: number) {
  const baseNodes = PRESETS[preset].nodes;
  const [results, setResults] = useState<Results>(new Map());
  const [book, setBook] = useState<OpeningBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  /** Por posição depois do lance, do pedido mais antigo ao mais novo. */
  const [targets, setTargets] = useState<ReadonlyMap<string, Target>>(new Map());
  const [deepError, setDeepError] = useState<string | null>(null);
  const queue = useRef<SearchQueue | null>(null);
  /** À parte, para uma busca longa não atrasar a variante. */
  const deepQueue = useRef<SearchQueue | null>(null);

  useEffect(() => {
    const create = (onError: (message: string | null) => void) =>
      new SearchQueue(Math.min(MAX_ENGINES, defaultPoolSize()), () => new EngineWorker(), {
        onResult: (key, result) => {
          onError(null);
          setResults((current) => new Map(current).set(key, result));
        },
        onError: ({ message }) => onError(message),
      });
    const created = [create(setError), create(setDeepError)];
    [queue.current, deepQueue.current] = created;
    return () => created.forEach((item) => item.terminate());
  }, []);

  const needsBook = book === null && (line !== null || targets.size > 0);
  useEffect(() => {
    if (!needsBook) return;
    const abort = new AbortController();
    loadBook(abort.signal)
      .then(setBook)
      .catch((failure: Error) => {
        if (abort.signal.aborted) return;
        setError(failure.message);
        setDeepError(failure.message);
      });
    return () => abort.abort();
  }, [needsBook, attempt]);

  /** As posições da variante, com a avaliação das que já foram buscadas. */
  const positions = useMemo(
    () =>
      line
        ? lineSearches(review.game, line, ENGINE_LINES).map((search) => ({
            ...search,
            found: findResult(results, 0, search),
          }))
        : [],
    [review, line, results],
  );

  useEffect(() => {
    queue.current?.replace(
      positions.flatMap(({ key, job, found }) =>
        found ? [] : [{ key: resultKey(0, key), request: { ...job, nodes: baseNodes } }],
      ),
    );
  }, [positions, baseNodes, attempt]);

  useEffect(() => {
    // O pedido mais novo vem primeiro. Depois de uma falha, espera um novo pedido.
    const wanted = deepError ? [] : [...targets.values()].reverse();
    const searches = new Map(
      wanted.flatMap(({ level, before, after }) =>
        [before, after]
          .filter((search) => !findResult(results, level, search))
          .map(({ key, job }) => {
            const id = resultKey(level, key);
            return [id, { key: id, request: { ...job, nodes: nodesAt(baseNodes, level) } }] as const;
          }),
      ),
    );
    deepQueue.current?.replace([...searches.values()], { abandon: true });
  }, [targets, results, deepError, baseNodes]);

  /** A partida, com os lances aprofundados. */
  const gameReview: GameReview & KnownReview = useMemo(() => {
    const before = review.evals.slice(0, review.plies.length);
    const deepened = book ? deepenedPlies(review.game, targets, results) : new Map();
    if (!book || deepened.size === 0) return { ...review, before };
    const updated = applyDeepened(review.game, review, deepened, book);
    return { ...review, ...updated, ...summarize(updated.plies, updated.evals) };
  }, [review, targets, results, book]);

  /** Os lances mostrados: os da partida ou os da variante. */
  const known: KnownReview = useMemo(() => {
    if (!line) return gameReview;
    const evals = review.evals.slice(0, line.base + 1);
    for (const { found } of positions) {
      if (!found) break;
      evals.push(found);
    }
    const plies = review.plies.slice(0, line.base);
    const game = withLine(review.game, line);
    if (!book) return { plies, evals, before: evals.slice(0, plies.length) };
    if (evals.length > line.base + 1) {
      const classified = classifyGame({ ...game, plies: game.plies.slice(0, evals.length - 1) }, evals, book);
      plies.push(...classified.plies.slice(line.base));
    }
    return applyDeepened(game, { plies, evals }, deepenedPlies(game, targets, results), book);
  }, [review, gameReview, line, positions, targets, results, book]);

  const game = useMemo(() => withLine(review.game, line), [review, line]);
  const plyKey = positionKey(game, index);
  const target = targets.get(plyKey);
  const done = reached(results, target).level;
  const pending = target !== undefined && !deepError && (target.level > done || (done > 0 && !book));

  /** Muda o nível pedido para o lance mostrado; 0 desiste. */
  function setLevel(level: number) {
    setDeepError(null);
    setTargets((current) => {
      const next = new Map(current);
      // Reinserido, passa a ser o mais novo.
      next.delete(plyKey);
      if (level > 0) {
        next.set(plyKey, {
          level,
          before: positionSearch(game, index - 1, ENGINE_LINES),
          after: positionSearch(game, index, ENGINE_LINES),
        });
      }
      return next;
    });
  }

  return {
    known,
    gameReview,
    error,
    retry: () => {
      setError(null);
      setAttempt((current) => current + 1);
    },
    /** Aprofundar o lance mostrado. */
    deepening: {
      pending,
      error: deepError,
      canDeepen: canDeepen(baseNodes, done),
      start: () => {
        // Também repete a carga das aberturas, se foi ela que falhou.
        setAttempt((current) => current + 1);
        setLevel(done + 1);
      },
      cancel: () => setLevel(done),
    },
  };
}

export type Deepening = ReturnType<typeof useReviewAnalysis>["deepening"];

/** Os lances da partida (ou variante) que já têm uma análise mais funda, pelo índice. */
function deepenedPlies(game: ParsedGame, targets: ReadonlyMap<string, Target>, results: Results): Map<number, Deepened> {
  const found = new Map<number, Deepened>();
  if (targets.size === 0) return found;
  game.plies.forEach((_, i) => {
    const { deep } = reached(results, targets.get(positionKey(game, i + 1)));
    if (deep) found.set(i, deep);
  });
  return found;
}
