import { Fragment } from "react";
import { formatScore, playLine, type LineMove } from "@/lib/notation";
import type { EngineLine } from "@/lib/types";
import { PieceIcon } from "./PieceIcon";

interface Props {
  /** Posição de onde as linhas partem. */
  fen: string;
  lines: EngineLine[];
  /** Lance jogado na partida, destacado se for uma das linhas. */
  played: string;
  /** Monta a linha como variante no tabuleiro. */
  onMount: (line: EngineLine) => void;
}

export function EngineLines({ fen, lines, played, onMount }: Props) {
  return (
    <ol aria-label="Melhores linhas do motor" className="mt-2 flex flex-col gap-1.5 text-sm">
      {lines.map((line) => {
        const isPlayed = line.move === played;
        const moves = playLine(fen, line.pv);
        return (
          <li
            key={line.move}
            className={`flex h-6 items-center gap-2 ${isPlayed ? "font-medium text-text" : "text-muted"}`}
          >
            <span className="w-9 shrink-0 text-xs font-semibold text-soft tabular-nums">{formatScore(line.score)}</span>
            {/* O lance que não cabe quebra para a linha escondida, em vez de aparecer cortado. */}
            <span className="relative h-6 min-w-0 flex-1 overflow-hidden leading-6">
              {moves.map((move, i) => (
                <Fragment key={i}>
                  <span className="mr-1 inline-block whitespace-nowrap">
                    <LineSan move={move} />
                  </span>
                  {/* Espaço de verdade para copiar e para leitores de tela. */}{" "}
                </Fragment>
              ))}
            </span>
            {isPlayed && <span className="sr-only">(lance jogado)</span>}
            {moves.length > 0 && (
              <button
                type="button"
                title="Montar esta variante"
                aria-label={`Montar a variante de ${moves[0].san}`}
                onClick={() => onMount(line)}
                className="flex h-5.5 w-7 shrink-0 items-center justify-center rounded bg-raised text-soft hover:bg-line hover:text-text"
              >
                <BranchIcon />
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Um caminho que sai do principal. */
function BranchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 3v18M6 14c0-5 4-7 13-7M14.5 2.5 19 7l-4.5 4.5" />
    </svg>
  );
}

/** Lance com o ícone da peça; a letra fica escondida, para copiar e para leitores de tela. */
function LineSan({ move: { san, color, parts } }: { move: LineMove }) {
  if (!parts.piece) return san;
  // O roque não tem letra de peça.
  const letter = san.slice(0, san.length - parts.rest.length);
  return (
    <>
      {letter && <span className="sr-only">{letter}</span>}
      <span aria-hidden className="inline-block w-4.5 align-[-0.25rem]">
        <PieceIcon piece={parts.piece} color={color} />
      </span>
      {parts.rest}
    </>
  );
}
