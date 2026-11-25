import type { Classification } from "@/lib/types";

export const CLASS_META: Record<Classification, { label: string; glyph: string; color: string; ink: string }> = {
  brilliant: { label: "Brilhante", glyph: "!!", color: "#1fb8a6", ink: "#06211e" },
  great: { label: "Excelente", glyph: "!", color: "#6f9cf5", ink: "#0a1530" },
  best: { label: "Melhor", glyph: "★", color: "#86c04f", ink: "#ffffff" },
  good: { label: "Bom", glyph: "✓", color: "#a9b79a", ink: "#181d13" },
  book: { label: "Livro", glyph: "", color: "#b9946a", ink: "#ffffff" },
  inaccuracy: { label: "Imprecisão", glyph: "?!", color: "#ecc94b", ink: "#2a2204" },
  mistake: { label: "Erro", glyph: "?", color: "#ee9b4d", ink: "#2c1703" },
  miss: { label: "Chance perdida", glyph: "×", color: "#ea7f86", ink: "#2e0b0e" },
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
        // Livro aberto: duas páginas, com a lombada no vão entre elas.
        <path
          d="M11.2 8.1C9.7 7 7.6 6.5 5 6.7v9.6c2.6-.2 4.7.3 6.2 1.4zM12.8 8.1C14.3 7 16.4 6.5 19 6.7v9.6c-2.6-.2-4.7.3-6.2 1.4z"
          fill={ink}
        />
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
