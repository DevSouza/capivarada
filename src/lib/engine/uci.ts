import type { Color, EngineLine, PositionEval, Score } from "../types";

export interface UciInfo {
  depth: number;
  multipv: number;
  bound: boolean;
  score: Score;
  pv: string[];
}

/** Lê uma linha "info ... score ... pv ..."; devolve null para as demais. */
export function parseInfo(line: string, turn: Color): UciInfo | null {
  if (!line.startsWith("info ")) return null;
  const tokens = line.trim().split(/\s+/);
  const after = (name: string) => {
    const index = tokens.indexOf(name);
    return index < 0 ? undefined : tokens[index + 1];
  };
  const scoreAt = tokens.indexOf("score");
  const pvAt = tokens.indexOf("pv");
  if (scoreAt < 0 || pvAt < 0 || pvAt + 1 >= tokens.length) return null;

  const value = Number(tokens[scoreAt + 2]);
  if (!Number.isFinite(value)) return null;
  const other: Color = turn === "w" ? "b" : "w";
  let score: Score;
  if (tokens[scoreAt + 1] === "mate") {
    score = { kind: "mate", mate: Math.abs(value), winner: value > 0 ? turn : other };
  } else if (tokens[scoreAt + 1] === "cp") {
    score = { kind: "cp", cp: turn === "w" ? value : 0 - value };
  } else {
    return null;
  }

  return {
    depth: Number(after("depth") ?? 0),
    multipv: Number(after("multipv") ?? 1),
    bound: tokens.includes("lowerbound") || tokens.includes("upperbound"),
    score,
    pv: tokens.slice(pvAt + 1),
  };
}

/** Acumula as linhas "info" de uma busca e monta o resultado no "bestmove". */
export class SearchCollector {
  private readonly latest = new Map<number, UciInfo>();
  private readonly byMove = new Map<string, UciInfo>();

  constructor(private readonly turn: Color) {}

  add(line: string): void {
    const info = parseInfo(line, this.turn);
    if (!info) return;
    // Limites (bounds) só valem enquanto não houver um valor exato.
    const previous = this.latest.get(info.multipv);
    if (info.bound && previous && !previous.bound) return;
    this.latest.set(info.multipv, info);
    this.byMove.set(info.pv[0], info);
  }

  finish(bestmove: string): PositionEval | null {
    const slots = [...this.latest.values()].sort((a, b) => a.multipv - b.multipv);
    if (slots.length === 0) return null;

    const chosen = new Map<string, UciInfo>();
    for (const info of slots) if (!chosen.has(info.pv[0])) chosen.set(info.pv[0], info);
    // Busca cortada no meio de uma profundidade: o mesmo lance pode ocupar duas
    // posições, e o que ele deslocou só existe na profundidade anterior.
    const displaced = [...this.byMove.values()]
      .filter((info) => !chosen.has(info.pv[0]))
      .sort((a, b) => b.depth - a.depth || a.multipv - b.multipv);
    for (const info of displaced.slice(0, slots.length - chosen.size)) chosen.set(info.pv[0], info);

    const first = chosen.get(bestmove) ?? slots[0];
    const rest = [...chosen.values()]
      .filter((info) => info !== first)
      .sort((a, b) => this.value(b.score) - this.value(a.score));
    const lines: EngineLine[] = [first, ...rest].map(({ pv, score }) => ({ move: pv[0], pv, score }));
    return { score: first.score, lines, depth: slots[0].depth };
  }

  /** Quanto a avaliação é boa para quem está na vez; mates ficam nos extremos. */
  private value(score: Score): number {
    if (score.kind === "cp") return this.turn === "w" ? score.cp : -score.cp;
    const closeness = 1_000_000 - score.mate;
    return score.winner === this.turn ? closeness : -closeness;
  }
}
