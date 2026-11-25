import { formatScore, numberedMove, playLine } from "@/lib/notation";
import type { Classification, GameReview } from "@/lib/types";
import { Badge, CLASS_META } from "./Badge";
import { EngineLines } from "./EngineLines";

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
  review: GameReview;
  index: number;
  flipped: boolean;
}

/** O lance que levou à posição `index` (a partir de 1). */
export function MoveDetail({ review, index, flipped }: Props) {
  const ply = review.plies[index - 1];
  const before = review.evals[index - 1];
  const best = before.lines[0];
  const playedBest = best?.move === ply.uci;
  const bestMove = best && playLine(ply.fenBefore, best.pv, 1)[0]?.san;

  return (
    <section aria-live="polite" data-preview-panel className="rounded-lg bg-panel p-4 lg:min-h-47">
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
        // A chave fecha o hint ao trocar de lance.
        <EngineLines
          key={index}
          fen={ply.fenBefore}
          lines={before.lines}
          played={ply.uci}
          flipped={flipped}
        />
      )}
    </section>
  );
}
