import { describe, expect, it } from "vitest";
import { parseInfo, SearchCollector } from "./uci";

const info = (rest: string) => `info depth 12 seldepth 18 ${rest}`;

describe("parseInfo", () => {
  it("lê cp na visão das brancas", () => {
    const line = info("multipv 1 score cp 35 nodes 1000 nps 1 time 1 pv e2e4 e7e5");
    expect(parseInfo(line, "w")).toMatchObject({ depth: 12, multipv: 1, bound: false, score: { kind: "cp", cp: 35 }, pv: ["e2e4", "e7e5"] });
    expect(parseInfo(line, "b")?.score).toEqual({ kind: "cp", cp: -35 });
  });

  it("lê mate a favor e contra quem está na vez", () => {
    expect(parseInfo(info("score mate 3 pv a1a8"), "w")?.score).toEqual({ kind: "mate", mate: 3, winner: "w" });
    expect(parseInfo(info("score mate -2 pv a1a8"), "w")?.score).toEqual({ kind: "mate", mate: 2, winner: "b" });
    expect(parseInfo(info("score mate 3 pv a1a8"), "b")?.score).toEqual({ kind: "mate", mate: 3, winner: "b" });
    expect(parseInfo(info("score mate -2 pv a1a8"), "b")?.score).toEqual({ kind: "mate", mate: 2, winner: "w" });
  });

  it("ignora linhas sem score ou sem pv", () => {
    expect(parseInfo("info depth 5 currmove e2e4 currmovenumber 1", "w")).toBeNull();
    expect(parseInfo("info string NNUE evaluation", "w")).toBeNull();
    expect(parseInfo("bestmove e2e4", "w")).toBeNull();
  });
});

describe("SearchCollector", () => {
  it("mantém a última linha exata de cada MultiPV", () => {
    const collector = new SearchCollector("w");
    collector.add(info("multipv 1 score cp 10 pv e2e4"));
    collector.add(info("multipv 2 score cp 5 pv d2d4"));
    collector.add(info("multipv 1 score cp 20 pv e2e4 c7c5"));
    collector.add(info("multipv 1 score cp 90 lowerbound pv g1f3"));
    const result = collector.finish("e2e4");
    expect(result?.score).toEqual({ kind: "cp", cp: 20 });
    expect(result?.lines.map((line) => line.move)).toEqual(["e2e4", "d2d4"]);
  });

  it("põe o bestmove em primeiro e descarta duplicatas", () => {
    const collector = new SearchCollector("w");
    collector.add(info("multipv 1 score cp 10 pv e2e4"));
    collector.add(info("multipv 2 score cp 12 pv d2d4"));
    expect(collector.finish("d2d4")?.lines.map((line) => line.move)).toEqual(["d2d4", "e2e4"]);

    const repeated = new SearchCollector("w");
    repeated.add(info("multipv 1 score cp 10 pv e2e4"));
    repeated.add(info("multipv 2 score cp 8 pv e2e4"));
    expect(repeated.finish("e2e4")?.lines).toHaveLength(1);
  });

  it("recupera a linha deslocada quando a busca para no meio de uma profundidade", () => {
    const collector = new SearchCollector("b");
    const at = (depth: number, multipv: number, cp: number, move: string) =>
      collector.add(`info depth ${depth} multipv ${multipv} score cp ${cp} pv ${move}`);
    at(14, 3, 1, "h7h6");
    at(15, 1, 30, "e7e5");
    at(15, 2, 20, "c7c5");
    at(15, 3, 10, "d7d5");
    // Na profundidade 16 o segundo lance virou o melhor e a busca acabou.
    at(16, 1, 35, "c7c5");
    const result = collector.finish("c7c5");
    expect(result?.lines.map((line) => line.move)).toEqual(["c7c5", "e7e5", "d7d5"]);
    expect(result?.lines.map((line) => line.score)).toEqual([-35, -30, -10].map((cp) => ({ kind: "cp", cp })));
  });

  it("ordena mates nos extremos, do ponto de vista de quem joga", () => {
    const collector = new SearchCollector("w");
    collector.add(info("multipv 1 score mate 2 pv a1a8"));
    collector.add(info("multipv 2 score mate -3 pv b1b2"));
    collector.add(info("multipv 3 score cp -500 pv c1c2"));
    collector.add(info("multipv 4 score mate 5 pv d1d2"));
    expect(collector.finish("a1a8")?.lines.map((line) => line.move)).toEqual(["a1a8", "d1d2", "c1c2", "b1b2"]);
  });

  it("devolve null sem nenhuma linha", () => {
    expect(new SearchCollector("w").finish("e2e4")).toBeNull();
  });
});
