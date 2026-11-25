import { expectedPoints } from "@/lib/analysis/winprob";
import { formatScore } from "@/lib/notation";
import type { Score } from "@/lib/types";

export function EvalBar({ score, flipped }: { score: Score; flipped: boolean }) {
  const white = expectedPoints(score, "w");
  const text = formatScore(score);
  const whiteLeads = white >= 0.5;
  // O número fica na ponta de quem está melhor.
  const labelAtBottom = whiteLeads !== flipped;
  return (
    <div
      role="img"
      aria-label={`Avaliação ${text}`}
      className="relative col-start-1 overflow-hidden rounded-md bg-[#3a4456]"
    >
      <div
        className="absolute inset-x-0 bg-[#f1ede4] transition-[height] duration-200"
        style={{ height: `${white * 100}%`, [flipped ? "top" : "bottom"]: 0 }}
      />
      <span
        className={`absolute inset-x-0 text-center text-[10px] font-semibold tabular-nums ${labelAtBottom ? "bottom-1" : "top-1"} ${whiteLeads ? "text-[#1b2230]" : "text-white"}`}
      >
        {text.replace(/^[+−]/, "")}
      </span>
    </div>
  );
}
