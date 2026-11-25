import { describe, expect, it } from "vitest";
import { parsePgn } from "../pgn";
import type { PositionEval, Score } from "../types";
import { gameAccuracy, moveAccuracy, volatilityWeights } from "./accuracy";
import { analyzeGame, matchOpening, type SearchAll } from "./analyze";
import { classify, classifyByLoss, type ClassifyInput } from "./classify";
import { judgeMate } from "./mate";
import { findSacrifice, isRoutineCapture, sacrificeStands } from "./sacrifice";
import { expectedPoints, winPercent } from "./winprob";

const cp = (value: number): Score => ({ kind: "cp", cp: value });

describe("pontos esperados", () => {
  it("inverte a perspectiva e limita a ±1000 cp", () => {
    expect(expectedPoints(cp(0), "w")).toBe(0.5);
    expect(expectedPoints(cp(200), "w") + expectedPoints(cp(200), "b")).toBeCloseTo(1);
    expect(expectedPoints(cp(5000), "w")).toBe(expectedPoints(cp(1000), "w"));
    expect(expectedPoints({ kind: "mate", mate: 4, winner: "b" }, "b")).toBe(1);
    expect(expectedPoints({ kind: "mate", mate: 4, winner: "b" }, "w")).toBe(0);
    expect(winPercent({ kind: "mate", mate: 1, winner: "w" })).toBe(winPercent(cp(1000)));
  });
});

describe("precisão", () => {
  it("dá 100 sem queda e cai com ela", () => {
    expect(moveAccuracy(0)).toBe(100);
    expect(moveAccuracy(-5)).toBe(100);
    expect(moveAccuracy(10)).toBeCloseTo(64.6, 0);
    expect(moveAccuracy(100)).toBe(0);
  });

  it("tem um peso por lance, entre 0,5 e 12", () => {
    for (const moves of [1, 2, 5, 19, 20, 45, 90, 200]) {
      const wins = Array.from({ length: moves + 1 }, (_, i) => (i % 2 ? 95 : 5));
      const weights = volatilityWeights(wins);
      expect(weights).toHaveLength(moves);
      expect(Math.max(...weights)).toBeLessThanOrEqual(12);
    }
    expect(volatilityWeights([50, 50, 50])).toEqual([0.5, 0.5]);
  });

  it("calcula por jogador; quem não jogou fica sem precisão", () => {
    const move = (color: "w" | "b", accuracy: number) => ({ color, accuracy, counts: true });
    const perfect = [move("w", 100), move("b", 100)];
    expect(gameAccuracy(perfect, [50, 50, 50])).toEqual({ w: 100, b: 100 });
    expect(gameAccuracy(perfect.slice(0, 1), [50, 50])).toEqual({ w: 100, b: null });
    const result = gameAccuracy([move("w", 0), move("b", 100)], [50, 10, 10]);
    expect(result.w).toBeLessThan(1);
    expect(result.b).toBe(100);
    // Pesos iguais: metade da média (60) e metade da harmônica.
    const mixed = gameAccuracy([move("w", 100), move("b", 100), move("w", 20)], [50, 50, 50, 50]);
    expect(mixed.w).toBeCloseTo(0.5 * 60 + 0.5 * (2 / (1 / 100 + 1 / 20)));
  });

  it("não conta lances de livro e forçados", () => {
    const moves = [
      { color: "w" as const, accuracy: 100, counts: false },
      { color: "b" as const, accuracy: 100, counts: false },
      { color: "w" as const, accuracy: 40, counts: true },
    ];
    const result = gameAccuracy(moves, [50, 50, 50, 50]);
    expect(result.w).toBeCloseTo(40);
    expect(result.b).toBe(100);
  });
});

describe("faixas por perda", () => {
  it.each([
    [0, "good"], [0.0499, "good"], [0.05, "inaccuracy"],
    [0.0999, "inaccuracy"], [0.1, "mistake"], [0.1499, "mistake"], [0.15, "blunder"], [1, "blunder"],
  ])("%f -> %s", (loss, expected) => {
    expect(classifyByLoss(loss)).toBe(expected);
  });
});

describe("classify", () => {
  const base: ClassifyInput = {
    isBook: false, legalMoves: 30, isBest: true, expectedBefore: 0.6, expectedAfter: 0.6, expectedSecond: 0.58,
    loss: 0, opponentLoss: 0, mateJudgement: null, isRoutineCapture: false, isSacrifice: false,
  };
  const run = (changes: Partial<ClassifyInput>) => classify({ ...base, ...changes });

  it("melhor e livro", () => {
    expect(run({})).toBe("best");
    expect(run({ isBook: true, isBest: false, loss: 0.3 })).toBe("book");
    expect(run({ legalMoves: 1, isBest: false, expectedSecond: null })).toBe("forced");
  });

  it("brilhante exige sacrifício, posição boa e não estar ganhando sem ele", () => {
    expect(run({ isSacrifice: true })).toBe("brilliant");
    expect(run({ isSacrifice: true, isBest: false, loss: 0.01, expectedAfter: 0.59 })).toBe("brilliant");
    expect(run({ isSacrifice: true, isBest: false, loss: 0.04, expectedAfter: 0.56 })).toBe("good");
    expect(run({ isSacrifice: true, expectedBefore: 0.3, expectedAfter: 0.3, expectedSecond: 0.25 })).toBe("best");
    expect(run({ isSacrifice: true, expectedBefore: 1, expectedAfter: 1, expectedSecond: 0.95 })).toBe("best");
  });

  it("ótimo exige segunda opção bem pior e não ser captura rotineira", () => {
    expect(run({ expectedSecond: 0.45 })).toBe("great");
    expect(run({ expectedSecond: 0.55 })).toBe("best");
    expect(run({ expectedBefore: 0.93, expectedAfter: 0.93, expectedSecond: 0.8 })).toBe("best");
    expect(run({ expectedSecond: 0.45, isRoutineCapture: true })).toBe("best");
    // Captura que pune um erro do adversário vale.
    expect(run({ expectedSecond: 0.45, isRoutineCapture: true, opponentLoss: 0.3 })).toBe("great");
    expect(run({ expectedBefore: 0.15, expectedAfter: 0.15, expectedSecond: 0.01 })).toBe("best");
  });

  it("chance perdida exige erro do adversário e algo a aproveitar", () => {
    const miss = { isBest: false, expectedBefore: 0.85, expectedAfter: 0.5, loss: 0.35, opponentLoss: 0.3 };
    expect(run(miss)).toBe("miss");
    expect(run({ ...miss, opponentLoss: 0.05 })).toBe("blunder");
    expect(run({ ...miss, expectedAfter: 0.2, loss: 0.65 })).toBe("miss");
    expect(run({ ...miss, expectedBefore: 0.3, expectedAfter: 0.16, loss: 0.14 })).toBe("mistake");
    expect(run({ ...miss, expectedAfter: 0.78, loss: 0.07 })).toBe("inaccuracy");
  });
});

describe("mate perdido ou permitido", () => {
  const mate = (winner: "w" | "b", moves = 3): Score => ({ kind: "mate", mate: moves, winner });

  it.each([
    [1000, "inaccuracy"], [999, "mistake"], [701, "mistake"], [700, "blunder"], [0, "blunder"], [-500, "blunder"],
  ])("com %i de vantagem -> %s", (value, expected) => {
    // Perder o mate olha a avaliação que sobrou; permitir, a que havia antes.
    expect(judgeMate(mate("w"), cp(value), "w")).toBe(expected);
    expect(judgeMate(mate("b"), cp(-value), "b")).toBe(expected);
    expect(judgeMate(cp(-value), mate("b"), "w")).toBe(expected);
    expect(judgeMate(cp(value), mate("w"), "b")).toBe(expected);
  });

  it("trocar o próprio mate pelo do adversário é capivara", () => {
    expect(judgeMate(mate("w"), mate("b"), "w")).toBe("blunder");
  });

  it("não julga mate adiado, achado ou que já existia", () => {
    expect(judgeMate(mate("w", 3), mate("w", 6), "w")).toBeNull();
    expect(judgeMate(mate("w", 1), mate("w", 0), "w")).toBeNull();
    expect(judgeMate(cp(300), mate("w"), "w")).toBeNull();
    expect(judgeMate(mate("b"), mate("b", 1), "w")).toBeNull();
    expect(judgeMate(mate("b"), cp(-300), "w")).toBeNull();
    expect(judgeMate(cp(300), cp(-300), "w")).toBeNull();
  });

  it("vem antes de Chance perdida e das faixas, mas não do melhor lance", () => {
    const input: ClassifyInput = {
      isBook: false, legalMoves: 30, isBest: false, expectedBefore: 1, expectedAfter: 0.96, expectedSecond: 0.96,
      loss: 0.04, opponentLoss: 0.3, mateJudgement: "mistake", isRoutineCapture: false, isSacrifice: false,
    };
    expect(classify(input)).toBe("mistake");
    expect(classify({ ...input, loss: 0.5, expectedAfter: 0.5, mateJudgement: "blunder" })).toBe("blunder");
    expect(classify({ ...input, isBest: true })).toBe("best");
    expect(classify({ ...input, legalMoves: 1 })).toBe("forced");
  });
});

describe("sacrifícios", () => {
  const opera = "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 16";

  it("reconhece o sacrifício de dama da Partida da Ópera", () => {
    expect(findSacrifice(opera, "b3b8")).toBe("d7b8");
    expect(sacrificeStands(opera, "b3b8", ["d7b8", "d1d8"])).toBe(true);
  });

  it("troca de damas não é sacrifício", () => {
    expect(findSacrifice("3qk3/8/8/8/8/8/8/3QK3 w - - 0 1", "d1d8")).toBeNull();
  });

  it("peça já perdida não é sacrifício", () => {
    expect(findSacrifice("7N/6k1/8/8/8/8/8/K7 w - - 0 1", "a1a2")).toBeNull();
  });

  it("entregar peão não é sacrifício", () => {
    expect(findSacrifice("4k3/8/8/3p4/8/4P3/8/4K3 w - - 0 1", "e3e4")).toBeNull();
  });

  it("não vale quando o material volta na resposta", () => {
    // Cavalo entregue em d5, mas a dama que captura é capturada em seguida.
    const fen = "3qk3/8/8/8/8/4N3/8/3RK3 w - - 0 1";
    expect(sacrificeStands(fen, "e3d5", ["d8d5", "d1d5"])).toBe(false);
    expect(sacrificeStands(fen, "e3d5", ["d8d5", "e1e2"])).toBe(true);
  });

  it("identifica recaptura e captura de peça solta", () => {
    const hanging = "4k3/8/8/3n4/8/8/8/3RK3 w - - 0 1";
    expect(isRoutineCapture(hanging, "d1d5", null)).toBe(true);
    const defended = "4k3/8/4p3/3n4/8/8/8/3RK3 w - - 0 1";
    expect(isRoutineCapture(defended, "d1d5", null)).toBe(false);
    expect(isRoutineCapture(defended, "d1d5", "d5")).toBe(true);
    expect(isRoutineCapture(defended, "d1d2", "d5")).toBe(false);
  });
});

describe("analyzeGame", () => {
  const evalOf = (score: Score, ...moves: [string, Score][]): PositionEval => ({
    score, depth: 10, lines: moves.map(([move, s]) => ({ move, pv: [move], score: s })),
  });

  it("classifica do começo ao mate sem mandar posição terminal ao motor", async () => {
    const game = parsePgn("1. f3 e5 2. g4 Qh4#");
    const mate: Score = { kind: "mate", mate: 1, winner: "b" };
    const evals = [
      evalOf(cp(20), ["e2e4", cp(20)], ["d2d4", cp(18)]),
      evalOf(cp(-60), ["e7e5", cp(-60)], ["d7d5", cp(-55)]),
      evalOf(cp(-60), ["g2g3", cp(-60)], ["e2e4", cp(-70)]),
      evalOf(mate, ["d8h4", mate], ["d7d5", cp(-100)]),
    ];
    const searchAll: SearchAll = async (jobs) => {
      expect(jobs).toHaveLength(4);
      expect(jobs.map((job) => job.turn)).toEqual(["w", "b", "w", "b"]);
      return evals;
    };
    const review = await analyzeGame(game, searchAll, {});
    expect(review.plies.map((ply) => ply.classification)).toEqual(["inaccuracy", "best", "blunder", "great"]);
    expect(review.evals[4].score).toEqual({ kind: "mate", mate: 0, winner: "b" });
    expect(review.accuracy.b).toBe(100);
    expect(review.accuracy.w).toBeLessThan(80);
    expect(review.counts.w.blunder).toBe(1);

    // Mesmo catalogada como abertura, a capivara não vira Livro.
    const book = Object.fromEntries(
      game.plies.map((ply) => [ply.fenAfter.split(" ").slice(0, 4).join(" "), "A00 Fool's Mate"]),
    );
    const withBook = await analyzeGame(game, searchAll, book);
    expect(withBook.plies.map((ply) => ply.classification)).toEqual(["book", "book", "blunder", "great"]);
  });

  it("confirma o sacrifício com uma busca extra", async () => {
    const game = parsePgn('[SetUp "1"]\n[FEN "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 16"]\n\n16. Qb8+ *');
    const win: Score = { kind: "mate", mate: 2, winner: "w" };
    let calls = 0;
    const searchAll: SearchAll = async (jobs) => {
      calls++;
      if (jobs[0].searchMoves) {
        expect(jobs).toMatchObject([{ turn: "b", searchMoves: ["d7b8"], moves: ["b3b8"], multiPv: 1 }]);
        return [{ score: win, depth: 5, lines: [{ move: "d7b8", pv: ["d7b8", "d1d8"], score: win }] }];
      }
      return [evalOf(win, ["b3b8", win], ["b3e6", cp(100)]), evalOf(win, ["d7b8", win])];
    };
    const review = await analyzeGame(game, searchAll, {});
    expect(calls).toBe(2);
    expect(review.plies[0].classification).toBe("brilliant");
  });

  it("não dá Brilhante quando a busca posterior mostra que o lance perde", async () => {
    const game = parsePgn('[SetUp "1"]\n[FEN "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 16"]\n\n16. Qb8+ *');
    const searchAll: SearchAll = async () => [
      evalOf(cp(0), ["b3b8", cp(0)], ["b3e6", cp(-200)]),
      evalOf(cp(-400), ["d7b8", cp(-400)]),
    ];
    const review = await analyzeGame(game, searchAll, {});
    expect(review.plies[0].classification).toBe("best");
  });

  it("segue a teoria até o primeiro lance fora dela", () => {
    const game = parsePgn("1. e4 e5 2. Ke2");
    const [a, b] = game.plies.map((ply) => ply.fenAfter.split(" ").slice(0, 4).join(" "));
    expect(matchOpening(game, { [a]: "B00 King's Pawn", [b]: "" })).toEqual({ plies: 2, name: "B00 King's Pawn" });
  });
});
