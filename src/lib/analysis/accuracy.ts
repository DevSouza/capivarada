import type { Color } from "../types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Precisão (0..100) de um lance a partir da queda de Win% de quem jogou. */
export function moveAccuracy(drop: number): number {
  if (drop <= 0) return 100;
  const raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * drop) - 3.166924740191411;
  return clamp(raw + 1, 0, 100);
}

function standardDeviation(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}

/** Peso de cada lance: volatilidade do Win% na janela correspondente. */
export function volatilityWeights(winPercents: number[]): number[] {
  const moves = winPercents.length - 1;
  const size = clamp(Math.floor(moves / 10), 2, 8);
  const windows: number[][] = [];
  for (let i = 0; i < Math.min(size, winPercents.length) - 2; i++) windows.push(winPercents.slice(0, size));
  for (let i = 0; i + size <= winPercents.length; i++) windows.push(winPercents.slice(i, i + size));
  return windows.map((window) => clamp(standardDeviation(window), 0.5, 12));
}

/** Peso da média ponderada; o resto é da harmônica, que castiga mais os lances ruins. */
const WEIGHTED_SHARE = 0.5;

interface MoveForAccuracy {
  color: Color;
  accuracy: number;
  /** false para lances que não entram na conta (livro e forçados). */
  counts: boolean;
}

/**
 * Combina a média ponderada pela volatilidade com a harmônica, meio a meio, como
 * o Lichess.
 */
export function gameAccuracy(moves: MoveForAccuracy[], winPercents: number[]): Record<Color, number | null> {
  const weights = volatilityWeights(winPercents);
  const forColor = (color: Color): number | null => {
    const all = moves.map((move, i) => ({ ...move, weight: weights[i] })).filter((move) => move.color === color);
    if (all.length === 0) return null;
    const counted = all.filter((move) => move.counts);
    if (counted.length === 0) return 100;
    let weighted = 0;
    let total = 0;
    let inverse = 0;
    for (const { accuracy, weight } of counted) {
      weighted += accuracy * weight;
      total += weight;
      inverse += 1 / Math.max(1, accuracy);
    }
    return WEIGHTED_SHARE * (weighted / total) + (1 - WEIGHTED_SHARE) * (counted.length / inverse);
  };
  return { w: forColor("w"), b: forColor("b") };
}
