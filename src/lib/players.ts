import type { Color, GameReview, ParsedGame, Ply } from "./types";

type Headers = Record<string, string>;

const PIECE_ORDER = ["p", "n", "b", "r", "q"];

export function playerName(headers: Headers, color: Color): string {
  const name = headers[color === "w" ? "White" : "Black"];
  return name && name !== "?" ? name : color === "w" ? "Brancas" : "Pretas";
}

export function playerRating(headers: Headers, color: Color): string | null {
  const rating = headers[color === "w" ? "WhiteElo" : "BlackElo"];
  return rating && /^[1-9]\d*$/.test(rating) ? rating : null;
}

/** Peças que `color` capturou até a posição `index`, da menos para a mais valiosa. */
export function capturedBy(plies: Ply[], index: number, color: Color): string[] {
  return plies
    .slice(0, index)
    .flatMap((ply) => (ply.color === color && ply.captured ? [ply.captured] : []))
    .sort((a, b) => PIECE_ORDER.indexOf(a) - PIECE_ORDER.indexOf(b));
}

/** Segundos no relógio de `color` na posição `index`; null se o PGN não tem relógio. */
export function clockAt(game: ParsedGame, index: number, color: Color): number | null {
  if (game.plies.every((ply) => ply.clock === null)) return null;
  for (let i = index - 1; i >= 0; i--) {
    const { color: mover, clock } = game.plies[i];
    if (mover === color && clock !== null) return clock;
  }
  const initial = game.headers.TimeControl?.match(/^(\d+)(?:\+\d+)?$/);
  return initial ? Number(initial[1]) : null;
}

/** 598 -> "9:58"; abaixo de 20 s mostra décimos. */
export function formatClock(seconds: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const tenths = seconds < 20 ? `.${Math.floor((seconds - whole) * 10 + 1e-6)}` : "";
  return `${hours ? `${hours}:${pad(minutes)}` : minutes}:${pad(whole % 60)}${tenths}`;
}

export type GameResult = { kind: "draw" } | { kind: "win"; winner: Color; checkmate: boolean };

export function gameResult(review: Pick<GameReview, "game" | "evals">): GameResult | null {
  const { score } = review.evals[review.evals.length - 1];
  if (score.kind === "mate" && score.mate === 0) return { kind: "win", winner: score.winner, checkmate: true };
  switch (review.game.headers.Result) {
    case "1-0":
      return { kind: "win", winner: "w", checkmate: false };
    case "0-1":
      return { kind: "win", winner: "b", checkmate: false };
    case "1/2-1/2":
      return { kind: "draw" };
    default:
      return null;
  }
}
