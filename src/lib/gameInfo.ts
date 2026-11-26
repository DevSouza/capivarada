import { Chess } from "chess.js";
import { playerName, RESIGNATION, type GameResult } from "./players";
import type { SavedGame } from "./savedGame";
import type { Color } from "./types";

type Headers = Record<string, string>;

/** "600" -> "10 min", "180+2" -> "3 | 2", "1/86400" -> "1 dia". */
export function timeControlLabel(headers: Headers): string | null {
  const value = headers.TimeControl ?? "";
  const daily = value.match(/^1\/(\d+)$/);
  if (daily) {
    const days = Math.round(Number(daily[1]) / 86400);
    return days > 0 ? `${days} ${days === 1 ? "dia" : "dias"}` : null;
  }
  const clock = value.match(/^(\d+)(?:\+(\d+))?$/);
  if (!clock) return null;
  const seconds = Number(clock[1]);
  const increment = Number(clock[2] ?? 0);
  if (seconds === 0 && increment === 0) return null;
  const minutes = String(seconds / 60).replace(".", ",");
  if (increment > 0) return seconds % 30 === 0 ? `${minutes} | ${increment}` : `${seconds} s | ${increment}`;
  return seconds < 60 ? `${seconds} s` : seconds % 30 === 0 ? `${minutes} min` : `${seconds} s`;
}

const ENDINGS: [RegExp, string][] = [
  [/checkmate|xeque-mate/i, "Xeque-mate"],
  [RESIGNATION, "Desistência"],
  [/timeout vs|time ?out.*insufficient|tempo.*insuficiente/i, "Tempo × material insuficiente"],
  [/on time|time forfeit|timeout|tempo/i, "Tempo esgotado"],
  [/abandon/i, "Abandono"],
  [/stalemate|afogamento/i, "Afogamento"],
  [/repetition|repeti[cç]/i, "Repetição"],
  [/agreement|acordo/i, "Acordo"],
  [/insufficient|insuficiente/i, "Material insuficiente"],
  [/50.?(move|lances)/i, "Regra dos 50 lances"],
];

/** Como a partida terminou; a posição final vale mais que o cabeçalho. */
export function endingLabel(headers: Headers, finalFen: string): string | null {
  const chess = new Chess(finalFen);
  if (chess.isCheckmate()) return "Xeque-mate";
  if (chess.isStalemate()) return "Afogamento";
  if (chess.isInsufficientMaterial()) return "Material insuficiente";
  const termination = headers.Termination ?? "";
  return ENDINGS.find(([pattern]) => pattern.test(termination))?.[1] ?? null;
}

export function resultOf(headers: Headers, finalFen: string): GameResult | null {
  const chess = new Chess(finalFen);
  if (chess.isCheckmate()) return { kind: "win", winner: chess.turn() === "w" ? "b" : "w", checkmate: true };
  if (headers.Result === "1-0") return { kind: "win", winner: "w", checkmate: false };
  if (headers.Result === "0-1") return { kind: "win", winner: "b", checkmate: false };
  return headers.Result === "1/2-1/2" ? { kind: "draw" } : null;
}

export function scoreOf(result: GameResult | null, color: Color): string {
  if (!result) return "–";
  if (result.kind === "draw") return "½";
  return result.winner === color ? "1" : "0";
}

/** Nome da abertura: o da análise ou, antes dela, o que o PGN trouxer. */
export function openingName(headers: Headers, analyzed: string | null | undefined): string | null {
  if (analyzed) return analyzed.replace(/^[A-E]\d\d /, "");
  if (headers.Opening && headers.Opening !== "?") return headers.Opening;
  const slug = headers.ECOUrl?.match(/\/openings\/([^/?#]+)/)?.[1];
  if (!slug) return null;
  // Alguns sites acrescentam lances ao fim: "Pirc-Defense-2.d4-Nf6" ou "...3.Nc3".
  const name = slug.split(/[-.]+\d+\./)[0].replace(/-/g, " ").trim();
  return name || null;
}

/** Variação de rating, quando o PGN inclui (como no Lichess). */
export function ratingDiff(headers: Headers, color: Color): number | null {
  const value = headers[color === "w" ? "WhiteRatingDiff" : "BlackRatingDiff"];
  return value && /^[+-]?\d+$/.test(value) ? Number(value) : null;
}

/** Data da partida em UTC (ms), com a hora quando houver. */
export function playedAt(headers: Headers): number | null {
  const withTime = headers.UTCDate ?? headers.Date ?? "";
  const date = withTime.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!date) return null;
  const time = (headers.UTCTime ?? headers.EndTime)?.match(
    /^(\d{1,2}):(\d{2}):(\d{2})(?: GMT([+-])(\d{2})(\d{2}))?$/,
  );
  const [hours, minutes, seconds] = time ? time.slice(1, 4).map(Number) : [0, 0, 0];
  const offset = time?.[4] ? (Number(time[5]) * 60 + Number(time[6])) * (time[4] === "-" ? -1 : 1) : 0;
  const ms = Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3]), hours, minutes - offset, seconds);
  return Number.isNaN(ms) ? null : ms;
}

const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "24 de nov. de 2026", na data local em que a partida foi jogada. */
export function dateLabel(headers: Headers): string | null {
  const local = headers.Date && /^\d{4}\.\d{2}\.\d{2}$/.test(headers.Date) ? headers.Date : headers.UTCDate;
  const ms = playedAt({ Date: local ?? "" });
  return ms === null ? null : DATE_FORMAT.format(ms);
}

/** Da partida mais recente para a mais antiga; sem data, vale quando foi salva. */
export function sortGames(games: SavedGame[]): SavedGame[] {
  const key = (game: SavedGame) => playedAt(game.headers) ?? game.addedAt;
  return [...games].sort((a, b) => key(b) - key(a) || b.addedAt - a.addedAt);
}

/**
 * Nome (em minúsculas) do dono da lista: quem aparece em mais partidas, desde
 * que em pelo menos duas e na maioria delas. null quando não dá para saber.
 */
export function findOwner(games: SavedGame[]): string | null {
  const counts = new Map<string, number>();
  for (const { headers } of games) {
    const names = (["w", "b"] as Color[])
      .filter((color) => !["", "?"].includes(headers[color === "w" ? "White" : "Black"] ?? ""))
      .map((color) => playerName(headers, color).toLowerCase());
    for (const name of new Set(names)) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const ranked = [...counts].sort(([, a], [, b]) => b - a);
  const [first, second] = ranked;
  if (!first || first[1] < 2 || first[1] * 2 <= games.length || first[1] === second?.[1]) return null;
  return first[0];
}

/** Cor que o dono da lista jogou; null se ele não jogou esta partida. */
export function ownerColor(headers: Headers, owner: string | null): Color | null {
  if (!owner) return null;
  if (headers.White?.toLowerCase() === owner) return "w";
  return headers.Black?.toLowerCase() === owner ? "b" : null;
}

/** Junta partidas num só texto que pode ser importado de volta. */
export function joinPgns(pgns: string[]): string {
  if (pgns.length === 1) return pgns[0];
  // Sem cabeçalho, não daria para saber onde a partida começa.
  return pgns.map((pgn) => (pgn.startsWith("[") ? pgn : `[Event "?"]\n\n${pgn}`)).join("\n\n");
}
