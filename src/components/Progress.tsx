export function Progress({ done, total, onCancel }: { done: number; total: number; onCancel: () => void }) {
  return (
    <section className="mx-auto flex max-w-md flex-col gap-4 pt-24 text-center">
      <h1 className="text-xl font-semibold">Analisando a partida</h1>
      <progress
        value={done}
        max={total}
        aria-label="Posições analisadas"
        className="h-2 w-full appearance-none overflow-hidden rounded-full bg-raised [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-raised [&::-webkit-progress-value]:bg-accent"
      />
      <p className="text-sm text-soft tabular-nums">
        {done === 0 ? "Carregando o motor…" : `${done} de ${total} posições`}
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="mx-auto rounded-lg border border-line px-4 py-2 text-sm hover:bg-panel"
      >
        Cancelar
      </button>
    </section>
  );
}
