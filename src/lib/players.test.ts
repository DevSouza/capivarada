import { describe, expect, it } from "vitest";
import { parsePgn } from "./pgn";
import {
  capturedBy,
  clockAt,
  formatClock,
  gameResult,
  playerName,
  playerRating,
} from "./players";
import type { Score } from "./types";

describe("jogadores", () => {
  it("usa o nome do PGN ou a cor", () => {
    expect(playerName({ White: "Ana" }, "w")).toBe("Ana");
    expect(playerName({ Black: "?" }, "b")).toBe("Pretas");
    expect(playerName({}, "w")).toBe("Brancas");
  });

  it("lê o rating só quando é um número", () => {
    expect(playerRating({ WhiteElo: "505" }, "w")).toBe("505");
    expect(playerRating({ WhiteElo: "?" }, "w")).toBeNull();
    expect(playerRating({ BlackElo: "0" }, "b")).toBeNull();
    expect(playerRating({}, "b")).toBeNull();
  });

  it("acumula as capturas até a posição mostrada", () => {
    const { plies } = parsePgn(
      "1. e4 e5 2. Nf3 Nf6 3. Nc3 d5 4. d4 dxe4 5. Nxe4 Nxe4 6. Nxe5 Qh4 7. Bb5+ c6 8. Ba4 Qxf2#",
    );
    expect(capturedBy(plies, 0, "b")).toEqual([]);
    expect(capturedBy(plies, 16, "b")).toEqual(["p", "p", "n"]);
    expect(capturedBy(plies, 16, "w")).toEqual(["p", "p"]);
  });

  it("mostra o relógio de cada lado na posição", () => {
    const game = parsePgn(
      '[TimeControl "600+5"]\n\n1. e4 {[%clk 0:09:58]} e5 {[%clk 0:09:51]} 2. Nf3 {[%clk 0:09:40]} *',
    );
    expect([0, 1, 2, 3].map((i) => clockAt(game, i, "w"))).toEqual([600, 598, 598, 580]);
    expect([0, 1, 2, 3].map((i) => clockAt(game, i, "b"))).toEqual([600, 600, 591, 591]);
    expect(clockAt(parsePgn('[TimeControl "600"]\n\n1. e4 e5 *'), 1, "w")).toBeNull();
  });

  it("formata o relógio", () => {
    expect([598, 576.4, 3725, 9.35, 0].map(formatClock)).toEqual(["9:58", "9:36", "1:02:05", "0:09.3", "0:00.0"]);
  });

  it("identifica o resultado, com o mate na frente do cabeçalho", () => {
    const at = (Result: string, score: Score) =>
      gameResult({
        game: { pgn: "", headers: { Result }, startFen: "", plies: [], warnings: [] },
        evals: [{ score, lines: [], depth: 0 }],
      });
    const even: Score = { kind: "cp", cp: 0 };
    expect(at("*", { kind: "mate", mate: 0, winner: "b" })).toEqual({ kind: "win", winner: "b", checkmate: true });
    expect(at("1-0", even)).toEqual({ kind: "win", winner: "w", checkmate: false });
    expect(at("1/2-1/2", even)).toEqual({ kind: "draw" });
    expect(at("*", even)).toBeNull();
  });
});
