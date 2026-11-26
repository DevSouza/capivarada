import { describe, expect, it } from "vitest";
import { classifyGame } from "./analysis/analyze";
import { closeLine, fenAt, lineResult, lineSearches, mountLine, playMove, withLine, type Cursor } from "./line";
import { parsePgn } from "./pgn";
import type { PositionEval } from "./types";

const game = parsePgn("1. e4 e5 2. Nf3 Nc6 *");

/** Joga a partir da posição mostrada. */
const play = (cursor: Cursor, uci: string) =>
  playMove(game, cursor, fenAt(withLine(game, cursor.line), cursor.index), uci);

const movesOf = ({ line }: Cursor) => withLine(game, line).plies.map((ply) => ply.san).join(" ");

describe("playMove", () => {
  it("só avança quando o lance é o da partida", () => {
    expect(play({ index: 1, line: null }, "e7e5")).toEqual({ index: 2, line: null });
  });

  it("abre uma variante com outro lance, no meio ou depois do fim", () => {
    const middle = play({ index: 1, line: null }, "c7c5");
    expect(middle).toMatchObject({ index: 2, line: { base: 1 } });
    expect(movesOf(middle)).toBe("e4 c5");

    const end = play({ index: 4, line: null }, "f1b5");
    expect(end).toMatchObject({ index: 5, line: { base: 4 } });
    expect(movesOf(end)).toBe("e4 e5 Nf3 Nc6 Bb5");
  });

  it("continua a variante, avança nela e troca o resto dela", () => {
    const longer = play(play({ index: 1, line: null }, "c7c5"), "g1f3");
    expect(movesOf(longer)).toBe("e4 c5 Nf3");
    expect(play({ ...longer, index: 2 }, "g1f3")).toEqual(longer);

    const replaced = play({ ...longer, index: 2 }, "d2d4");
    expect(replaced).toMatchObject({ index: 3, line: { base: 1 } });
    expect(movesOf(replaced)).toBe("e4 c5 d4");
  });

  it("muda a origem ao jogar antes da variante", () => {
    const line = play({ index: 3, line: null }, "g8f6");
    const earlier = play({ ...line, index: 1 }, "c7c5");
    expect(earlier).toMatchObject({ index: 2, line: { base: 1 } });
    expect(movesOf(earlier)).toBe("e4 c5");
  });

  it("volta à partida ao jogar o lance dela na origem da variante", () => {
    const line = play({ index: 1, line: null }, "c7c5");
    expect(play({ ...line, index: 1 }, "e7e5")).toEqual({ index: 2, line: null });
  });

  it("ignora lance ilegal ou de outra posição", () => {
    const cursor: Cursor = { index: 1, line: null };
    expect(play(cursor, "e7e4")).toBe(cursor);
    expect(playMove(game, cursor, game.startFen, "d2d4")).toBe(cursor);
  });
});

describe("mountLine", () => {
  it("abre a variante a partir da posição, no primeiro lance dela", () => {
    const mounted = mountLine(game, { index: 2, line: null }, 1, ["c7c5", "g1f3", "d7d6"]);
    expect(mounted).toMatchObject({ index: 2, line: { base: 1 } });
    expect(movesOf(mounted)).toBe("e4 c5 Nf3 d6");
  });

  it("mantém na partida os lances que coincidem com ela", () => {
    const mounted = mountLine(game, { index: 2, line: null }, 1, ["e7e5", "f1c4"]);
    expect(mounted).toMatchObject({ index: 2, line: { base: 2 } });
    expect(movesOf(mounted)).toBe("e4 e5 Bc4");
    expect(mountLine(game, { index: 2, line: null }, 1, ["e7e5", "g1f3"])).toEqual({ index: 2, line: null });
  });

  it("dentro da variante, troca o resto dela", () => {
    const line = play(play({ index: 1, line: null }, "c7c5"), "g1f3");
    const mounted = mountLine(game, line, 2, ["d2d4", "c5d4"]);
    expect(mounted).toMatchObject({ index: 3, line: { base: 1 } });
    expect(movesOf(mounted)).toBe("e4 c5 d4 cxd4");
  });

  it("para no lance ilegal e ignora a sequência sem nenhum lance", () => {
    expect(movesOf(mountLine(game, { index: 1, line: null }, 1, ["c7c5", "e1e8"]))).toBe("e4 c5");
    const cursor: Cursor = { index: 1, line: null };
    expect(mountLine(game, cursor, 1, ["e1e8"])).toEqual(cursor);
  });
});

describe("closeLine", () => {
  it("volta à posição de onde a variante saiu", () => {
    const line = play(play({ index: 1, line: null }, "c7c5"), "g1f3");
    expect(closeLine(line)).toEqual({ index: 1, line: null });
    expect(closeLine({ ...line, index: 0 })).toEqual({ index: 0, line: null });
  });
});

describe("lineSearches", () => {
  it("pede só as posições da variante, com todos os lances desde o início", () => {
    const { line } = play(play({ index: 1, line: null }, "c7c5"), "g1f3");
    expect(lineSearches(game, line!, 3).map(({ key, job }) => [key, job.turn])).toEqual([
      ["e2e4 c7c5", "w"],
      ["e2e4 c7c5 g1f3", "b"],
    ]);
  });
});

describe("lineResult", () => {
  it("reconhece mate e afogamento", () => {
    expect(lineResult(game.startFen)).toBeNull();
    expect(lineResult("7k/5KQ1/8/8/8/8/8/8 b - - 0 1")).toEqual({ kind: "win", winner: "w", checkmate: true });
    expect(lineResult("7k/5Q2/5K2/8/8/8/8/8 b - - 0 1")).toEqual({ kind: "draw" });
  });
});

describe("classificação da variante", () => {
  it("classifica os lances jogados com as avaliações conhecidas", () => {
    const cursor = play(play({ index: 2, line: null }, "g1f3"), "f7f6");
    const at = (cp: number, move: string): PositionEval => ({
      score: { kind: "cp", cp },
      lines: [{ move, pv: [move], score: { kind: "cp", cp } }],
      depth: 20,
    });
    const evals = [at(30, "e2e4"), at(30, "e7e5"), at(30, "g1f3"), at(30, "b8c6"), at(300, "f3e5")];
    const { plies } = classifyGame(withLine(game, cursor.line), evals, {});
    expect(plies.map((ply) => ply.classification)).toEqual(["best", "best", "best", "blunder"]);
  });
});
