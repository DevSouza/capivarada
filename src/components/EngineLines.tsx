import { Fragment } from "react";
import { formatScore, playLine, type LineMove } from "@/lib/notation";
import type { EngineLine } from "@/lib/types";
import { PieceIcon } from "./PieceIcon";
import type { Deepening } from "./useReviewAnalysis";

interface Props {
  /** Posição de onde as linhas partem. */
  fen: string;
  lines: EngineLine[];
  /** Profundidade alcançada pelo motor. */
  depth: number;
  /** Lance jogado na partida, destacado se for uma das linhas. */
  played: string;
  /** Monta a linha como variante no tabuleiro. */
  onMount: (line: EngineLine) => void;
  /** Sem ele, só mostra a profundidade. */
  deepening?: Deepening;
}

export function EngineLines({ fen, lines, depth, played, onMount, deepening }: Props) {
  return (
    <>
      <Depth depth={depth} deepening={deepening} />
      <ol aria-label="Melhores linhas do motor" className="mt-1.5 flex flex-col gap-1.5 text-sm">
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
    </>
  );
}

function Depth({ depth, deepening }: Pick<Props, "depth" | "deepening">) {
  return (
    <div className="mt-2 flex h-6 items-center justify-between gap-2 text-xs text-soft">
      <p className="min-w-0 truncate" title={deepening?.error ?? undefined}>
        Profundidade <span className="font-semibold text-text tabular-nums">{depth}</span>
        {deepening?.pending && " · aprofundando…"}
        {deepening?.error && <span className="text-[#ff9c9c]"> · {deepening.error}</span>}
      </p>
      {deepening && (deepening.pending || deepening.canDeepen) && (
        <button
          type="button"
          title={deepening.pending ? "Parar" : "Aumentar a profundidade deste lance"}
          aria-label={deepening.pending ? "Parar de aprofundar" : "Aumentar a profundidade deste lance"}
          onClick={deepening.pending ? deepening.cancel : deepening.start}
          className={`flex h-5.5 w-7 shrink-0 items-center justify-center rounded bg-raised hover:bg-line hover:text-text ${deepening.pending ? "animate-pulse text-accent" : ""}`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden
          >
            <path d={deepening.pending ? "M7 7h10v10H7z" : "M12 5v14M5 12h14"} />
          </svg>
        </button>
      )}
    </div>
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
