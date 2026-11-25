export function FlipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="Virar o tabuleiro"
      aria-label="Virar o tabuleiro"
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
        <path d="M8 20V4M4 8l4-4 4 4M16 4v16M12 16l4 4 4-4" />
      </svg>
    </button>
  );
}
