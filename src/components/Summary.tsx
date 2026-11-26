import { formatAccuracy } from "@/lib/notation";
import { playerName } from "@/lib/players";
import { CLASSIFICATIONS, type Classification, type Color, type GameReview } from "@/lib/types";
import { Badge, CLASS_META } from "./Badge";

interface Props {
  review: GameReview;
  /** Recebe a posição logo depois do lance escolhido. */
  onSelect: (index: number) => void;
}

export function Summary({ review, onSelect }: Props) {
  const { headers } = review.game;
  return (
    <table className="w-full table-fixed rounded-lg bg-panel">
      <caption className="sr-only">Resumo da partida</caption>
      <thead>
        <tr>
          <th scope="col" className="truncate px-3 pt-4 font-medium max-sm:px-1 max-sm:text-sm" title={playerName(headers, "w")}>
            {playerName(headers, "w")}
          </th>
          <th scope="col" className="w-44 pt-4">
            <span className="sr-only">Classificação</span>
          </th>
          <th scope="col" className="truncate px-3 pt-4 font-medium max-sm:px-1 max-sm:text-sm" title={playerName(headers, "b")}>
            {playerName(headers, "b")}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-line text-center">
          <td className="pt-1 pb-4 text-3xl font-semibold">{formatAccuracy(review.accuracy.w)}</td>
          <th scope="row" className="pt-1 pb-4 font-normal text-soft">
            Precisão
          </th>
          <td className="pt-1 pb-4 text-3xl font-semibold">{formatAccuracy(review.accuracy.b)}</td>
        </tr>
        {review.opening && (
          <tr className="border-b border-line text-center">
            <td colSpan={3} className="px-4 py-2.5 text-sm text-soft">
              <span className="sr-only">Abertura: </span>
              {review.opening}
            </td>
          </tr>
        )}
        {CLASSIFICATIONS.map((kind) => {
          const { label } = CLASS_META[kind];
          const first = firstMove(review, kind);
          const name = (
            <>
              <Badge kind={kind} size={24} />
              {label}
            </>
          );
          return (
            <tr key={kind} className="text-center">
              <td className="py-0.5">
                <Count review={review} kind={kind} color="w" onSelect={onSelect} />
              </td>
              <th scope="row" className="py-0.5 font-normal">
                {first ? (
                  <button
                    type="button"
                    title={`Ir para o primeiro lance: ${label}`}
                    onClick={() => onSelect(first)}
                    className="flex h-10 w-full items-center gap-3 rounded-md px-2 text-left hover:bg-raised"
                  >
                    {name}
                  </button>
                ) : (
                  <span className="flex h-10 items-center gap-3 px-2 text-left text-muted">{name}</span>
                )}
              </th>
              <td className="py-0.5">
                <Count review={review} kind={kind} color="b" onSelect={onSelect} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Posição logo depois do primeiro lance da classificação; null se não houver. */
function firstMove(review: GameReview, kind: Classification, color?: Color): number | null {
  const at = review.plies.findIndex(
    (ply) => ply.classification === kind && (color === undefined || ply.color === color),
  );
  return at < 0 ? null : at + 1;
}

interface CountProps extends Props {
  kind: Classification;
  color: Color;
}

function Count({ review, kind, color, onSelect }: CountProps) {
  const count = review.counts[color][kind];
  const first = firstMove(review, kind, color);
  if (!first) return <span className="text-muted tabular-nums">{count}</span>;

  const label = `${CLASS_META[kind].label}, ${playerName(review.game.headers, color)}: ${count}. Ir para o ${count > 1 ? "primeiro " : ""}lance`;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => onSelect(first)}
      className="h-10 min-w-12 rounded-md px-3 font-semibold tabular-nums hover:bg-raised"
    >
      {count}
    </button>
  );
}
