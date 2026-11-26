import { analyzeGame, type OpeningBook } from "./analysis/analyze";
import { AnalysisCancelled, defaultPoolSize, EnginePool } from "./engine/pool";
import type { GameReview, ParsedGame } from "./types";

export const PRESETS = {
  fast: { label: "Rápida", nodes: 250_000 },
  normal: { label: "Normal", nodes: 750_000 },
  deep: { label: "Profunda", nodes: 2_500_000 },
} as const;

export type Preset = keyof typeof PRESETS;

const PRESET_ORDER = Object.keys(PRESETS) as Preset[];

/** A profundidade seguinte; null na maior. */
export function nextPreset(preset: Preset): Preset | null {
  return PRESET_ORDER[PRESET_ORDER.indexOf(preset) + 1] ?? null;
}

export async function loadBook(signal: AbortSignal): Promise<OpeningBook> {
  try {
    const res = await fetch("/openings.json", { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    if (signal.aborted) throw new AnalysisCancelled();
    throw new Error("Não consegui carregar a base de aberturas.");
  }
}

export async function reviewGame(
  game: ParsedGame,
  preset: Preset,
  signal: AbortSignal,
  onProgress: (done: number, total: number) => void,
  workers = defaultPoolSize(),
): Promise<GameReview> {
  const book = await loadBook(signal);
  const pool = await EnginePool.create(Math.min(workers, game.plies.length + 1), signal);
  try {
    const { nodes } = PRESETS[preset];
    return await analyzeGame(
      game,
      (jobs, onDone) => pool.searchAll(jobs.map((job) => ({ ...job, nodes })), onDone),
      book,
      onProgress,
    );
  } finally {
    pool.terminate();
  }
}
