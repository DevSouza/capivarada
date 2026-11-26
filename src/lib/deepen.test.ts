import { describe, expect, it } from "vitest";
import { classifyGame } from "./analysis/analyze";
import { applyDeepened, canDeepen, nodesAt } from "./deepen";
import { parsePgn } from "./pgn";
import type { PositionEval } from "./types";

const at = (cp: number, move: string, depth = 15): PositionEval => ({
  score: { kind: "cp", cp },
  lines: [{ move, pv: [move], score: { kind: "cp", cp } }],
  depth,
});

describe("applyDeepened", () => {
  const game = parsePgn("1. e4 f6 2. d4 d5 *");
  const evals = [at(30, "e2e4"), at(30, "e7e5"), at(300, "d2d4"), at(300, "d7d5"), at(300, "b1c3")];
  const base = classifyGame(game, evals, {});

  it("reclassifica o lance aprofundado sem mexer nos vizinhos", () => {
    expect(base.plies[1].classification).toBe("blunder");
    const deep = { before: at(30, "e7e5", 22), after: at(40, "d2d4", 21) };
    const known = applyDeepened(game, base, new Map([[1, deep]]), {});
    expect(known.plies[1].classification).toBe("good");
    expect(known.evals[2]).toBe(deep.after);
    expect(known.before[1]).toBe(deep.before);
    // O lance seguinte parte da mesma posição, mas com a análise original.
    expect(known.before[2]).toBe(evals[2]);
    expect([0, 2, 3].map((i) => known.plies[i])).toEqual([0, 2, 3].map((i) => base.plies[i]));
  });

  it("sem nada aprofundado, ou de um lance ainda não analisado, mantém tudo", () => {
    const deep = { before: at(0, "a2a3"), after: at(0, "a7a6") };
    const known = applyDeepened(game, base, new Map([[9, deep]]), {});
    expect(known).toEqual({ plies: base.plies, evals, before: evals.slice(0, 4) });
  });
});

describe("níveis", () => {
  it("cada nível busca mais, até o limite", () => {
    expect([0, 1, 2].map((level) => nodesAt(750_000, level))).toEqual([750_000, 3_000_000, 12_000_000]);
    expect([0, 1, 2, 3].map((level) => canDeepen(750_000, level))).toEqual([true, true, true, false]);
  });
});
