import { describe, expect, it } from "vitest";
import {
  dateLabel,
  endingLabel,
  findOwner,
  joinPgns,
  openingName,
  ownerColor,
  playedAt,
  ratingDiff,
  resultOf,
  scoreOf,
  sortGames,
  timeControlLabel,
} from "./gameInfo";
import { parsePgn, splitGames } from "./pgn";
import { toSavedGame } from "./savedGame";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const MATE = parsePgn("1. f3 e5 2. g4 Qh4#").plies[3].fenAfter;
const saved = (headers: Record<string, string>, addedAt = 0) => ({
  ...toSavedGame(parsePgn("1. e4"), addedAt),
  headers,
});

describe("informações da partida", () => {
  it.each([
    ["600", "10 min"], ["60", "1 min"], ["30", "30 s"], ["90", "1,5 min"], ["180+2", "3 | 2"],
    ["15+1", "15 s | 1"], ["1/86400", "1 dia"], ["1/259200", "3 dias"], ["-", null], ["?", null],
  ])("ritmo %s -> %s", (TimeControl, expected) => {
    expect(timeControlLabel({ TimeControl })).toBe(expected);
  });

  it("descreve o fim da partida", () => {
    const ending = (Termination: string) => endingLabel({ Termination }, START);
    expect(endingLabel({}, MATE)).toBe("Xeque-mate");
    expect(endingLabel({}, "k7/2K5/8/8/3B4/8/8/8 b - - 0 1")).toBe("Afogamento");
    expect(ending("jcolelover21 won by resignation")).toBe("Desistência");
    expect(ending("ana won on time")).toBe("Tempo esgotado");
    expect(ending("Time forfeit")).toBe("Tempo esgotado");
    expect(ending("Game drawn by timeout vs insufficient material")).toBe("Tempo × material insuficiente");
    expect(ending("ana won - game abandoned")).toBe("Abandono");
    expect(ending("Game drawn by repetition")).toBe("Repetição");
    expect(ending("Normal")).toBeNull();
  });

  it("dá o placar de cada lado", () => {
    const scores = (Result: string, fen = START) => {
      const result = resultOf({ Result }, fen);
      return [scoreOf(result, "w"), scoreOf(result, "b")];
    };
    expect(scores("1-0")).toEqual(["1", "0"]);
    expect(scores("*", MATE)).toEqual(["0", "1"]);
    expect(scores("1/2-1/2")).toEqual(["½", "½"]);
    expect(scores("*")).toEqual(["–", "–"]);
  });

  it("escolhe o nome da abertura", () => {
    const url = (slug: string) => ({ ECOUrl: `https://exemplo.com/openings/${slug}` });
    expect(openingName(url("Pirc-Defense"), "C42 Petrov's Defense")).toBe("Petrov's Defense");
    expect(openingName(url("Petrovs-Defense-Three-Knights-Game"), null)).toBe("Petrovs Defense Three Knights Game");
    expect(openingName(url("Pirc-Defense-2.d4-Nf6-3.Nc3"), null)).toBe("Pirc Defense");
    expect(openingName({ Opening: "Sicilian Defense" }, undefined)).toBe("Sicilian Defense");
    expect(openingName({}, null)).toBeNull();
  });

  it("lê variação de rating e data", () => {
    expect(ratingDiff({ WhiteRatingDiff: "+8", BlackRatingDiff: "-11" }, "w")).toBe(8);
    expect(ratingDiff({ BlackRatingDiff: "-11" }, "b")).toBe(-11);
    expect(ratingDiff({}, "w")).toBeNull();
    expect(dateLabel({ Date: "2026.11.24" })).toBe("24 de nov. de 2026");
    expect(dateLabel({ Date: "2026.11.23", UTCDate: "2026.11.24" })).toBe("23 de nov. de 2026");
    expect(dateLabel({ Date: "????.??.??" })).toBeNull();
    expect(playedAt({ UTCDate: "2026.11.24", UTCTime: "01:02:03" })).toBe(Date.UTC(2026, 10, 24, 1, 2, 3));
  });

  it("ordena da mais recente para a mais antiga", () => {
    const old = saved({ Date: "1858.11.02" }, 9e12);
    const early = saved({ UTCDate: "2026.11.23", UTCTime: "10:00:00" });
    const late = saved({ UTCDate: "2026.11.23", UTCTime: "11:00:00" });
    const undated = saved({}, Date.UTC(2026, 10, 25));
    expect(sortGames([old, early, undated, late])).toEqual([undated, late, early, old]);
  });

  it("descobre o dono da lista só quando dá para saber", () => {
    const a = saved({ White: "Eu", Black: "Ana" });
    const b = saved({ White: "Beto", Black: "eu" });
    const other = saved({ White: "Morphy", Black: "Duque" });
    expect(findOwner([a, b])).toBe("eu");
    expect(findOwner([a, b, other])).toBe("eu");
    expect(findOwner([a])).toBeNull();
    expect(findOwner([a, a])).toBeNull();
    expect(findOwner([a, other, other, b, saved({ White: "?", Black: "?" })])).toBeNull();
    expect(ownerColor(b.headers, "eu")).toBe("b");
    expect(ownerColor(other.headers, "eu")).toBeNull();
  });

  it("junta partidas de forma que possam ser importadas de volta", () => {
    const games = ['[White "Ana"]\n\n1. e4 {[%clk 0:01:00]} e5 1-0', "1. d4 d5", '[White "Beto"]\n\n1. c4 *'];
    const split = splitGames(joinPgns(games));
    expect(split.map((pgn) => parsePgn(pgn).plies[0].san)).toEqual(["e4", "d4", "c4"]);
    expect(joinPgns(["1. e4"])).toBe("1. e4");
    expect(splitGames("  \n ")).toEqual([]);
  });
});
