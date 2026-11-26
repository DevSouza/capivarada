import { describe, expect, it } from "vitest";
import { canReach } from "./reach";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("alcance das peças", () => {
  it("segue o movimento de cada peça", () => {
    expect(canReach(START, "g1", "f3")).toBe(true);
    expect(canReach(START, "g1", "g3")).toBe(false);
    expect(canReach(START, "e2", "e4")).toBe(true);
    expect(canReach(START, "e2", "e5")).toBe(false);
    expect(canReach(START, "e2", "d3")).toBe(false);
  });

  it("não atravessa peças nem captura as próprias", () => {
    expect(canReach(START, "a1", "a4")).toBe(false);
    expect(canReach(START, "f1", "b5")).toBe(false);
    expect(canReach(START, "d1", "d2")).toBe(false);
    expect(canReach("4k3/8/8/3p4/8/8/8/3RK3 w - - 0 1", "d1", "d5")).toBe(true);
    expect(canReach("4k3/8/8/3p4/8/8/8/3RK3 w - - 0 1", "d1", "d6")).toBe(false);
  });

  it("vale para quem não está na vez", () => {
    expect(canReach(START, "b8", "c6")).toBe(true);
    expect(canReach(START, "e7", "e5")).toBe(true);
  });

  it("ignora cravadas e xeques", () => {
    // Bispo cravado em e2 pela torre de e8.
    expect(canReach("4r2k/8/8/8/8/8/4B3/4K3 w - - 0 1", "e2", "b5")).toBe(true);
    // Brancas em xeque: a torre ainda mostra o alcance dela.
    expect(canReach("4r2k/8/8/8/8/8/8/R3K3 w - - 0 1", "a1", "a5")).toBe(true);
    // O rei continua ocupando a casa dele, e o do adversário pode ser alvo.
    expect(canReach("7k/8/8/8/8/8/8/R3K2R w - - 0 1", "a1", "f1")).toBe(false);
    expect(canReach("7k/8/8/8/8/8/8/4K2R w - - 0 1", "h1", "h8")).toBe(true);
  });

  it("rei não entra em casa atacada e pode rocar", () => {
    expect(canReach("3r3k/8/8/8/8/8/8/4K3 w - - 0 1", "e1", "d1")).toBe(false);
    expect(canReach("3r3k/8/8/8/8/8/8/4K3 w - - 0 1", "e1", "f1")).toBe(true);
    expect(canReach("4k3/8/8/8/8/8/8/4K2R b K - 0 1", "e1", "g1")).toBe(true);
  });

  it("aceita en passant só de quem está na vez", () => {
    const fen = "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2";
    expect(canReach(fen, "e5", "d6")).toBe(true);
    expect(canReach(fen.replace("d6", "-"), "e5", "d6")).toBe(false);
  });

  it("casa vazia não alcança nada", () => {
    expect(canReach(START, "e4", "e5")).toBe(false);
  });
});
