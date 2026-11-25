import { describe, expect, it } from "vitest";
import { parsePgn } from "./pgn";
import {
  ANALYSIS_VERSION,
  gameId,
  isCurrent,
  pgnFileName,
  restoreReview,
  toSavedAnalysis,
  toSavedGame,
} from "./savedGame";
import type { GameReview } from "./types";

const HEADERS = '[White "Ana"]\n[Black "Beto"]\n[Date "2026.11.23"]\n[Result "1-0"]\n\n';

describe("partida salva", () => {
  it("guarda o PGN original, com comentários e relógio", () => {
    const text = `${HEADERS}1. e4 {boa! [%clk 0:09:58]} e5 (1... c5) 2. Nf3 1-0`;
    expect(toSavedGame(parsePgn(text), 5)).toMatchObject({
      pgn: text,
      addedAt: 5,
      headers: { White: "Ana", Result: "1-0" },
      moves: 2,
      favorite: false,
      analysis: null,
    });
  });

  it("de várias partidas, guarda só a primeira", () => {
    const first = `${HEADERS}1. e4 {a\n[%clk 0:09:58]\nb} e5 1-0`;
    const game = parsePgn(`${first}\n\n[Event "outra"]\n\n1. d4 d5 *`);
    expect(game.pgn).toBe(first);
    expect(parsePgn(game.pgn).warnings).toEqual([]);
  });

  it("reconhece a mesma partida com ou sem relógio, e distingue outras", () => {
    const id = (text: string) => gameId(parsePgn(HEADERS + text));
    expect(id("1. e4 {[%clk 0:09:58]} e5 1-0")).toBe(id("1. e4 e5 1-0"));
    expect(id("1. e4 e5 1-0")).not.toBe(id("1. e4 c5 1-0"));
    expect(gameId(parsePgn("1. e4 e5"))).not.toBe(id("1. e4 e5 1-0"));
  });

  it("salva e restaura a análise", () => {
    const game = parsePgn(`${HEADERS}1. e4 e5 1-0`);
    const review: GameReview = {
      game,
      plies: game.plies.map((ply) => ({ ...ply, classification: "book", loss: 0.01, accuracy: 99 })),
      evals: [0, 1, 2].map((cp) => ({ score: { kind: "cp", cp }, lines: [], depth: 1 })),
      accuracy: { w: 99, b: 98 },
      counts: {} as GameReview["counts"],
      opening: "C20",
    };
    const saved = toSavedAnalysis(review);
    expect(saved.id).toBe(gameId(game));
    expect(restoreReview(game, structuredClone(saved))).toEqual(review);
    expect(restoreReview(game, { ...saved, version: ANALYSIS_VERSION - 1 })).toBeNull();
    expect(restoreReview(parsePgn("1. e4"), saved)).toBeNull();
  });

  it("trata análise de versão antiga como desatualizada", () => {
    const summary = { version: ANALYSIS_VERSION, preset: "normal" as const, accuracy: { w: 1, b: 1 }, opening: null };
    expect(isCurrent(summary)).toBe(true);
    expect(isCurrent({ ...summary, version: ANALYSIS_VERSION - 1 })).toBe(false);
    expect(isCurrent(null)).toBe(false);
  });

  it("gera um nome de arquivo seguro", () => {
    expect(pgnFileName({ White: "José da Silva", Black: "../a/b", Date: "2026.11.23" })).toBe(
      "Jose-da-Silva-vs-ab-2026-11-23.pgn",
    );
    expect(pgnFileName({ White: "???", Black: "Ana" })).toBe("jogador-vs-Ana.pgn");
  });
});
