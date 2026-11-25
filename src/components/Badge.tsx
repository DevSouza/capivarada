import type { Classification } from "@/lib/types";

export const CLASS_META: Record<Classification, { label: string; glyph: string; color: string; ink: string }> = {
  brilliant: { label: "Brilhante", glyph: "!!", color: "#1fb8a6", ink: "#06211e" },
  great: { label: "Excelente", glyph: "!", color: "#6f9cf5", ink: "#0a1530" },
  best: { label: "Melhor", glyph: "★", color: "#86c04f", ink: "#ffffff" },
  good: { label: "Bom", glyph: "", color: "#86c04f", ink: "#ffffff" },
  book: { label: "Livro", glyph: "", color: "#b9946a", ink: "#ffffff" },
  inaccuracy: { label: "Imprecisão", glyph: "?!", color: "#ecc94b", ink: "#2a2204" },
  mistake: { label: "Erro", glyph: "?", color: "#ee9b4d", ink: "#2c1703" },
  miss: { label: "Chance perdida", glyph: "", color: "#ea7f86", ink: "#2e0b0e" },
  forced: { label: "Forçado", glyph: "→", color: "#8a95a8", ink: "#10141d" },
  blunder: { label: "Capivara", glyph: "??", color: "#dc4646", ink: "#ffffff" },
};

/** Cor da classificação para texto: o vermelho do selo é escuro demais sobre o painel. */
export function classTextColor(kind: Classification): string {
  return kind === "blunder" ? "#f47c7c" : CLASS_META[kind].color;
}

export function Badge({ kind, size = 20 }: { kind: Classification; size?: number | string }) {
  const { label, glyph, color, ink } = CLASS_META[kind];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label} className="shrink-0">
      <title>{label}</title>
      <circle cx="12" cy="12" r="11" fill={color} stroke="#10141d" strokeWidth="1" />
      {kind === "book" ? (
        // Livro fechado: a lombada e o marcador ficam na cor do selo.
        <>
          <rect x="7.1" y="5.5" width="10" height="13" rx="0.9" fill={ink} />
          <path d="M8.85 5.5h.9v13h-.9zM12.2 5.5h3v6l-1.5-1.3-1.5 1.3z" fill={color} />
        </>
      ) : kind === "good" ? (
        // Polegar para cima: o punho e a mão.
        <path
          d="M6.2 10.5h1.2c.4 0 .7.3.7.7v5.5c0 .4-.3.7-.7.7H6.2c-.4 0-.7-.3-.7-.7v-5.5c0-.4.3-.7.7-.7zM9.2 10.8 11.6 6.1c.3-.6.9-.9 1.5-.7 1 .3 1.4 1.2 1.2 2.2l-.5 2.4h3.6c1.1 0 1.9 1 1.6 2.1l-1 4c-.2.8-.9 1.3-1.7 1.3h-4.5c-.5 0-1-.1-1.4-.4l-1.1-.8z"
          fill={ink}
        />
      ) : kind === "miss" ? (
        <path d="m8 8 8 8m0-8-8 8" fill="none" stroke={ink} strokeWidth="2.8" strokeLinecap="round" />
      ) : (
        <text
          x="12"
          y="12.5"
          fill={ink}
          fontSize={glyph.length > 1 ? 12 : 14}
          fontWeight="800"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {glyph}
        </text>
      )}
    </svg>
  );
}
