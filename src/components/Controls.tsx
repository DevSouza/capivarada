import type { ReactNode } from "react";

/** Teclas de navegação; os botões usam os mesmos nomes. */
export const NAV_KEYS = ["Home", "ArrowLeft", "ArrowRight", "End"] as const;
export type NavKey = (typeof NAV_KEYS)[number];

export function step(current: number, key: NavKey, last: number): number {
  if (key === "Home") return 0;
  if (key === "End") return last;
  return Math.max(0, Math.min(last, current + (key === "ArrowRight" ? 1 : -1)));
}

interface Props {
  index: number;
  last: number;
  playing: boolean;
  onNavigate: (key: NavKey) => void;
  onTogglePlay: () => void;
}

export function Controls({ index, last, playing, onNavigate, onTogglePlay }: Props) {
  const button = (key: NavKey, label: string, icon: ReactNode) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={key === "Home" || key === "ArrowLeft" ? index === 0 : index === last}
      onClick={() => onNavigate(key)}
      className="flex h-10 w-12 items-center justify-center rounded-lg bg-panel hover:bg-raised disabled:opacity-40"
    >
      {icon}
    </button>
  );
  const playLabel = playing ? "Pausar" : "Reproduzir";

  return (
    <nav aria-label="Navegar pelos lances" className="flex justify-center gap-2">
      {button("Home", "Início", <Stroke d="M7 5v14M18 6l-6 6 6 6" />)}
      {button("ArrowLeft", "Lance anterior", <Stroke d="m15 6-6 6 6 6" />)}
      <button
        type="button"
        aria-label={playLabel}
        title={playLabel}
        onClick={onTogglePlay}
        className="flex h-10 w-14 items-center justify-center rounded-lg bg-accent text-[#2a1a02] hover:brightness-110"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d={playing ? "M6 5h4v14H6zM14 5h4v14h-4z" : "M7 4.5v15l12-7.5z"} />
        </svg>
      </button>
      {button("ArrowRight", "Próximo lance", <Stroke d="m9 6 6 6-6 6" />)}
      {button("End", "Fim", <Stroke d="M17 5v14M6 6l6 6-6 6" />)}
    </nav>
  );
}

function Stroke({ d }: { d: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}
