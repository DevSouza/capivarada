export function SoundButton({ muted, onClick }: { muted: boolean; onClick: () => void }) {
  const label = muted ? "Ligar o som dos lances" : "Desligar o som dos lances";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-lg bg-panel text-soft hover:bg-raised hover:text-text"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
        <path d={muted ? "m16 9.5 5 5M21 9.5l-5 5" : "M15.5 9a4 4 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"} />
      </svg>
    </button>
  );
}
