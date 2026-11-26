import { Chess } from "chess.js";
import {
  CLASSIFICATIONS,
  type Classification,
  type Color,
  type GameReview,
  type ParsedGame,
  type PositionEval,
  type ReviewedPly,
  type Score,
} from "../types";
import { gameAccuracy, moveAccuracy } from "./accuracy";
import { canBeBrilliant, canBeGreat, classify, type ClassifyInput } from "./classify";
import { judgeMate } from "./mate";
import { isRoutineCapture, isSacrifice } from "./sacrifice";
import { BOOK_MAX_LOSS } from "./thresholds";
import { expectedPoints, winPercent } from "./winprob";

export interface SearchJob {
  startFen: string;
  moves: string[];
  turn: Color;
  multiPv: number;
}

/** Linhas por posição: a classificação usa as duas primeiras; a tela mostra todas. */
export const ENGINE_LINES = 3;

/** Executa as buscas na ordem pedida. É o único ponto que toca o motor. */
export type SearchAll = (jobs: SearchJob[], onDone?: (finished: number) => void) => Promise<PositionEval[]>;

/** EPD -> "ECO Nome", ou "" para posição de teoria sem nome próprio. */
export type OpeningBook = Record<string, string>;

const toEpd = (fen: string) => fen.split(" ").slice(0, 4).join(" ");

/** Avaliação de uma posição encerrada; null se a partida continua. */
export function terminalEval(fen: string): PositionEval | null {
  const chess = new Chess(fen);
  let score: Score | null = null;
  if (chess.isCheckmate()) score = { kind: "mate", mate: 0, winner: chess.turn() === "w" ? "b" : "w" };
  else if (chess.isStalemate() || chess.isInsufficientMaterial()) score = { kind: "cp", cp: 0 };
  return score && { score, lines: [], depth: 0 };
}

async function evaluatePositions(
  game: ParsedGame,
  searchAll: SearchAll,
  onProgress?: (done: number, total: number) => void,
): Promise<PositionEval[]> {
  const fens = [game.startFen, ...game.plies.map((ply) => ply.fenAfter)];
  const ucis = game.plies.map((ply) => ply.uci);
  const evals = fens.map(terminalEval);
  const pending = evals.flatMap((value, i) => (value ? [] : [i]));
  onProgress?.(0, pending.length);
  const results = await searchAll(
    pending.map((i) => ({
      startFen: game.startFen,
      moves: ucis.slice(0, i),
      turn: fens[i].split(" ")[1] as Color,
      multiPv: ENGINE_LINES,
    })),
    (done) => onProgress?.(done, pending.length),
  );
  pending.forEach((position, i) => (evals[position] = results[i]));
  return evals as PositionEval[];
}

/** Quantos lances iniciais seguem a teoria, e o nome da abertura. */
export function matchOpening(game: ParsedGame, book: OpeningBook): { plies: number; name: string | null } {
  let name: string | null = null;
  let plies = 0;
  for (const ply of game.plies) {
    const entry = book[toEpd(ply.fenAfter)];
    if (entry === undefined) break;
    plies++;
    if (entry) name = entry;
  }
  return { plies, name };
}

function sameScore(a: Score, b: Score): boolean {
  if (a.kind === "cp") return b.kind === "cp" && a.cp === b.cp;
  return b.kind === "mate" && a.mate === b.mate && a.winner === b.winner;
}

export async function analyzeGame(
  game: ParsedGame,
  searchAll: SearchAll,
  book: OpeningBook,
  onProgress?: (done: number, total: number) => void,
): Promise<GameReview> {
  return classifyGame(game, await evaluatePositions(game, searchAll, onProgress), book);
}

/** Classifica os lances pelas avaliações das posições (uma a mais que os lances). */
export function classifyGame(game: ParsedGame, evals: PositionEval[], book: OpeningBook): GameReview {
  const opening = matchOpening(game, book);

  // 1ª passada: números de cada lance.
  const inputs: ClassifyInput[] = [];
  const drops: number[] = [];
  let inBook = true;
  game.plies.forEach((ply, i) => {
    const before = evals[i];
    const after = evals[i + 1];
    const [first, second] = before.lines;
    const playedLine = before.lines.find((line) => line.move === ply.uci);
    // No lance nº 1, diferença entre as duas buscas é ruído, não erro.
    const isBest = playedLine !== undefined && sameScore(playedLine.score, first.score);
    const expectedBefore = expectedPoints(before.score, ply.color);
    const expectedAfter = expectedPoints(after.score, ply.color);
    const legalMoves = new Chess(ply.fenBefore).moves().length;
    const forced = isBest || legalMoves === 1;
    const loss = forced ? 0 : Math.max(0, expectedBefore - expectedAfter);
    inBook &&= i < opening.plies && loss < BOOK_MAX_LOSS;

    const whiteDrop = winPercent(before.score) - winPercent(after.score);
    drops.push(forced ? 0 : ply.color === "w" ? whiteDrop : -whiteDrop);
    inputs.push({
      isBook: inBook,
      legalMoves,
      isBest,
      expectedBefore,
      expectedAfter,
      expectedSecond: second ? expectedPoints(second.score, ply.color) : null,
      loss,
      opponentLoss: inputs[i - 1]?.loss ?? 0,
      mateJudgement: judgeMate(before.score, after.score, ply.color),
      isRoutineCapture: false,
      isSacrifice: false,
      otherMoveMates: before.lines.some(
        ({ move, score }) => move !== ply.uci && score.kind === "mate" && score.winner === ply.color,
      ),
    });
  });

  // 2ª passada: verificações caras, só nos candidatos.
  game.plies.forEach((ply, i) => {
    const input = inputs[i];
    if (canBeGreat(input)) {
      const previous = game.plies[i - 1];
      const recaptureSquare = previous?.san.includes("x") ? previous.to : null;
      input.isRoutineCapture = isRoutineCapture(ply.fenBefore, ply.uci, recaptureSquare);
    }
    if (canBeBrilliant(input)) input.isSacrifice = isSacrifice(ply.fenBefore, ply.uci);
  });

  const plies: ReviewedPly[] = game.plies.map((ply, i) => ({
    ...ply,
    classification: classify(inputs[i]),
    loss: inputs[i].loss,
    accuracy: moveAccuracy(drops[i]),
  }));

  const emptyCounts = () =>
    Object.fromEntries([...CLASSIFICATIONS, "forced"].map((name) => [name, 0])) as Record<Classification, number>;
  const counts = { w: emptyCounts(), b: emptyCounts() };
  for (const ply of plies) counts[ply.color][ply.classification]++;

  return {
    game,
    plies,
    evals,
    accuracy: gameAccuracy(
      // Teoria e lance único não medem a qualidade de quem jogou.
      plies.map((ply) => ({ ...ply, counts: ply.classification !== "book" && ply.classification !== "forced" })),
      evals.map((value) => winPercent(value.score)),
    ),
    counts,
    opening: opening.name,
  };
}
