import { playerName } from "@/lib/players";
import type { Color } from "@/lib/types";

interface Props {
  headers: Record<string, string>;
  color: Color;
  size: number;
}

/** A inicial do nome do jogador sobre a cor das peças. */
export function Avatar({ headers, color, size }: Props) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded font-semibold ${color === "w" ? "bg-[#f1ede4] text-[#1b2230]" : "bg-[#3a4456] text-white"}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {playerName(headers, color)[0].toUpperCase()}
    </span>
  );
}
