import { formatScore, numberedMove, playLine } from "@/lib/notation";
import type { Classification, EngineLine, GameReview, Ply } from "@/lib/types";
import { Badge, CLASS_META } from "./Badge";
import { Detective } from "./Detective";
import { EngineLines } from "./EngineLines";
import type { KnownReview } from "./useLineReview";

const COMMENT: Record<Classification, string> = {
  brilliant: "Um sacrifício que funciona.",
  great: "O único lance que mantinha a posição.",
  best: "O melhor lance da posição.",
  good: "Um bom lance, perto do melhor.",
  book: "Lance de teoria de abertura.",
  inaccuracy: "Um lance um pouco fraco.",
  mistake: "Piora bastante a posição.",
  miss: "Deixou passar o erro do adversário.",
  blunder: "Um erro grave.",
  forced: "O único lance possível.",
};

interface Props {
  review: KnownReview;
  index: number;
  /** Monta como variante uma linha do motor, que parte da posição anterior ao lance. */
  onMount: (line: EngineLine) => void;
}

const PANEL = "rounded-lg bg-panel p-4 lg:min-h-50";

interface PendingProps {
  ply: Ply;
  /** Falha da análise. */
  error: string | null;
  onRetry: () => void;
}

/** Lance de uma variante ainda sem classificação. */
export function PendingDetail({ ply, error, onRetry }: PendingProps) {
  return (
    <section aria-live="polite" className={PANEL}>
      <div className="flex items-center gap-3">
        <p className="min-w-0">
          <span className="font-semibold">{numberedMove(ply.moveNumber, ply.color, ply.san)}</span>{" "}
          <span className="text-soft">{error ? "Sem análise" : "Analisando…"}</span>
        </p>
      </div>
      {error ? (
        <>
          <p className="mt-2 text-sm text-soft">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-raised px-3 py-1.5 text-sm font-medium hover:brightness-125"
          >
            Tentar de novo
          </button>
        </>
      ) : (
        <Detective size={230} />
      )}
    </section>
  );
}

/** Início da variante que sai da posição inicial. */
export function StartDetail({ review, onMount }: { review: GameReview; onMount: (line: EngineLine) => void }) {
  const { lines } = review.evals[0];
  return (
    <section aria-live="polite" className={PANEL}>
      <p className="font-semibold">Posição inicial</p>
      <EngineLines fen={review.game.startFen} lines={lines} played="" onMount={onMount} />
    </section>
  );
}

/** O lance que levou à posição `index` (a partir de 1). */
export function MoveDetail({ review, index, onMount }: Props) {
  const ply = review.plies[index - 1];
  const before = review.evals[index - 1];
  const best = before.lines[0];
  const playedBest = best?.move === ply.uci;
  const bestMove = best && playLine(ply.fenBefore, best.pv, 1)[0]?.san;

  return (
    <section aria-live="polite" className={PANEL}>
      <div className="flex items-center gap-3">
        <Badge kind={ply.classification} size={28} />
        <p className="min-w-0">
          <span className="font-semibold">
            {numberedMove(ply.moveNumber, ply.color, ply.san)}
          </span>{" "}
          <span className="text-soft">{CLASS_META[ply.classification].label}</span>
        </p>
        <p className="ml-auto text-sm whitespace-nowrap text-soft tabular-nums">
          {formatScore(before.score)} → {formatScore(review.evals[index].score)}
        </p>
      </div>
      <p className="mt-2 text-sm text-soft">
        {COMMENT[ply.classification]}
        {!playedBest && bestMove && ply.classification !== "book" && (
          <>
            {" "}
            O melhor era <strong className="text-text">{bestMove}</strong>.
          </>
        )}
      </p>
      {before.lines.length > 0 && (
        <EngineLines fen={ply.fenBefore} lines={before.lines} played={ply.uci} onMount={onMount} />
      )}
    </section>
  );
}
