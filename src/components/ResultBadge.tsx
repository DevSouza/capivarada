import type { GameResult } from "@/lib/players";
import type { Color } from "@/lib/types";

/** Selo do rei no fim da partida: coroa, mate (#), derrota ou empate. */
export function ResultBadge({ result, color }: { result: GameResult; color: Color }) {
  const won = result.kind === "win" && result.winner === color;
  const label =
    result.kind === "draw" ? "Empate" : won ? "Vitória" : result.checkmate ? "Xeque-mate" : "Derrota";
  const fill = result.kind === "draw" ? "#8a95a8" : won ? "#86c04f" : "#dc4646";
  return (
    <svg width="100%" viewBox="0 0 24 24" role="img" aria-label={label} className="block">
      <title>{label}</title>
      <circle cx="12" cy="12" r="11" fill={fill} stroke="#10141d" strokeWidth="1" />
      {won ? (
        <path d="M6 16.5 5 8.5l4 3 3-5 3 5 4-3-1 8z" fill="#fff" />
      ) : (
        <text
          x="12"
          y="12.5"
          fill="#fff"
          fontSize={result.kind === "draw" ? 12 : 14}
          fontWeight="800"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {result.kind === "draw" ? "½" : result.checkmate ? "#" : "×"}
        </text>
      )}
    </svg>
  );
}
