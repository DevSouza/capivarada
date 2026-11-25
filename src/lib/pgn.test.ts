import { describe, expect, it } from "vitest";
import { formatScore, playLine, sanToPt, splitSan } from "./notation";
import { parsePgn, PgnError } from "./pgn";

const sans = (pgn: string) => parsePgn(pgn).plies.map((ply) => ply.san).join(" ");

describe("parsePgn", () => {
  it("lê cabeçalhos e lances", () => {
    const game = parsePgn('[Event "Teste"]\n[White "Ana"]\n[Black "Beto"]\n\n1. e4 e5 2. Nf3 1-0');
    expect(game.headers.White).toBe("Ana");
    expect(game.plies).toHaveLength(3);
    expect(game.plies[2]).toMatchObject({ color: "w", moveNumber: 2, san: "Nf3", uci: "g1f3", from: "g1", to: "f3" });
    expect(game.warnings).toEqual([]);
  });

  it("aceita só os lances, com ou sem numeração", () => {
    expect(sans("1.e4 e5 2.Nf3")).toBe("e4 e5 Nf3");
    expect(sans("e4 e5 Nf3")).toBe("e4 e5 Nf3");
  });

  it("ignora comentários, relógio, NAGs e variantes", () => {
    expect(sans("1. e4 {boa} {[%clk 0:03:00]} e5 $1 (1... c5 2. Nf3 (2. c3)) 2. Nf3!? Nc6 *")).toBe("e4 e5 Nf3 Nc6");
  });

  it("lê o relógio, mesmo com outros comentários e variantes", () => {
    const game = parsePgn(
      "1. e4 {boa} {[%clk 0:09:58]} 1... e5 {[%eval 0.2] [%clk 0:09:57.3]} (1... c5 {[%clk 0:01:00]}) 2. Nf3 1-0",
    );
    expect(game.plies.map((ply) => ply.clock)).toEqual([598, 597.3, null]);
  });

  it("lê a partida mesmo com o relógio em lugar inesperado", () => {
    expect(sans("1. e4 {[%clk 0:01:00]} $1 e5 {[%clk 0:01:00]} $2 2. Nf3 *")).toBe("e4 e5 Nf3");
  });

  it("tolera CRLF, espaços extras e BOM", () => {
    expect(sans('﻿  [Event "a"]  \r\n\r\n  1. e4 e5 *')).toBe("e4 e5");
  });

  it("respeita a tag FEN, inclusive com as pretas na vez", () => {
    const game = parsePgn('[SetUp "1"]\n[FEN "4k3/p7/8/8/8/8/8/4K3 b - - 0 10"]\n\n10... a5 11. Kd2 *');
    expect(game.startFen).toBe("4k3/p7/8/8/8/8/8/4K3 b - - 0 10");
    expect(game.plies.map((ply) => [ply.color, ply.moveNumber])).toEqual([["b", 10], ["w", 11]]);
  });

  it("usa a primeira de várias partidas e avisa", () => {
    const game = parsePgn('[Event "a"]\n\n1. e4 e5 1-0\n\n[Event "b"]\n\n1. d4 d5 *');
    expect(game.plies.map((ply) => ply.san)).toEqual(["e4", "e5"]);
    expect(game.warnings).toHaveLength(1);
  });

  it("não confunde comentário de relógio em linha própria com outra partida", () => {
    const game = parsePgn('[Event "a"]\n\n1. e4 {\n[%clk 0:03:00]} e5 *');
    expect(game.plies).toHaveLength(2);
    expect(game.warnings).toEqual([]);
  });

  it("explica entradas inválidas", () => {
    expect(() => parsePgn("   ")).toThrow(PgnError);
    expect(() => parsePgn("1. e4 e5 2. Ke4")).toThrow(/Ke4/);
    expect(() => parsePgn("olá mundo")).toThrow(PgnError);
    expect(() => parsePgn('[Event "a"]\n\n*')).toThrow(/nenhum lance/);
  });
});

describe("notação", () => {
  it("traduz SAN para português", () => {
    expect(["Nf3", "Rxd8#", "e8=Q+", "Kd2", "Bb5", "O-O", "Nbd7"].map(sanToPt)).toEqual([
      "Cf3", "Txd8#", "e8=D+", "Rd2", "Bb5", "O-O", "Cbd7",
    ]);
  });

  it("separa a peça do lance", () => {
    expect(["Nbd7", "Bxf3+", "e4", "bxc3", "exd8=Q#", "O-O-O+", "Kd2"].map((san) => `${splitSan(san).piece ?? "-"} ${splitSan(san).rest}`)).toEqual([
      "N bd7", "B xf3+", "- e4", "- bxc3", "- exd8=D#", "K O-O-O+", "K d2",
    ]);
  });

  it("converte linha UCI e para no lance ilegal", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const line = playLine(start, ["e2e4", "e7e5", "g1f3"]);
    expect(line.map((move) => move.san)).toEqual(["e4", "e5", "Cf3"]);
    expect(line.map((move) => move.label)).toEqual(["1. e4", "1… e5", "2. Cf3"]);
    expect(line[2]).toMatchObject({ from: "g1", to: "f3" });
    expect(line[0].fenAfter).toContain("/4P3/");
    expect(playLine(start, ["e2e4", "e2e4"])).toHaveLength(1);
    expect(playLine(start, ["e2e4", "e7e5", "g1f3"], 1)).toHaveLength(1);
  });

  it("formata avaliações", () => {
    expect(formatScore({ kind: "cp", cp: 123 })).toBe("+1,2");
    expect(formatScore({ kind: "cp", cp: -340 })).toBe("−3,4");
    expect(formatScore({ kind: "cp", cp: -3 })).toBe("0,0");
    expect(formatScore({ kind: "mate", mate: 3, winner: "b" })).toBe("−M3");
    expect(formatScore({ kind: "mate", mate: 0, winner: "w" })).toBe("1–0");
  });
});
