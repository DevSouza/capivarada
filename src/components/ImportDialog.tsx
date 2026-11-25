"use client";

import { useEffect, useRef, useState } from "react";
import { PRESETS, type Preset } from "@/lib/review";

const EXAMPLE = `[Event "Ópera de Paris"]
[Site "Paris"]
[Date "1858.11.02"]
[White "Paul Morphy"]
[Black "Duque Karl / Conde Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

interface Props {
  preset: Preset;
  onPresetChange: (preset: Preset) => void;
  /** Devolve a mensagem de erro, ou null se importou. */
  onImport: (text: string, onProgress: (message: string) => void) => Promise<string | null>;
  onClose: () => void;
}

export function ImportDialog({ preset, onPresetChange, onImport, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const busy = progress !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    textRef.current?.focus();
    return () => dialog?.close();
  }, []);

  async function submit() {
    setError(null);
    setProgress("Importando…");
    const message = await onImport(text, setProgress);
    setProgress(null);
    setError(message);
    // O navegador pode fechar o diálogo à força (Esc repetido) durante a importação.
    if (message && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="import-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto w-[min(42rem,calc(100vw-2rem))] rounded-xl border border-line bg-panel p-6 text-text backdrop:bg-black/60"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) submit();
        }}
      >
        <div>
          <h2 id="import-title" className="text-xl font-semibold">
            Importar partida
          </h2>
          <p className="mt-1 text-sm text-soft">
            Cole o PGN. Uma partida já abre com a análise; várias entram na lista para revisar depois.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="pgn" className="text-sm font-medium">
              PGN
            </label>
            <button type="button" className="text-sm text-accent hover:underline" onClick={() => setText(EXAMPLE)}>
              Usar exemplo
            </button>
          </div>
          <textarea
            ref={textRef}
            id="pgn"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            spellCheck={false}
            placeholder="1. e4 e5 2. Nf3 Nc6 …"
            aria-invalid={error !== null}
            aria-describedby={error ? "pgn-error" : undefined}
            className="w-full resize-y rounded-lg border border-line bg-ink p-3 font-mono text-sm placeholder:text-muted"
          />
          {error && (
            <p id="pgn-error" role="alert" className="text-sm text-[#ff9c9c]">
              {error}
            </p>
          )}
        </div>

        <fieldset className="flex flex-wrap items-center gap-3">
          <legend className="sr-only">Profundidade da análise</legend>
          <span aria-hidden className="text-sm text-soft">
            Análise
          </span>
          <div className="flex gap-1 rounded-lg bg-ink p-1">
            {(Object.keys(PRESETS) as Preset[]).map((key) => (
              <label
                key={key}
                className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-soft has-checked:bg-raised has-checked:text-text has-focus-visible:outline-2 has-focus-visible:outline-accent"
              >
                <input
                  type="radio"
                  name="preset"
                  value={key}
                  checked={preset === key}
                  onChange={() => onPresetChange(key)}
                  className="sr-only"
                />
                {PRESETS[key].label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-3">
          <p aria-live="polite" className="mr-auto text-sm text-soft">
            {progress}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm hover:bg-raised disabled:opacity-50"
          >
            Fechar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-[#2a1a02] hover:brightness-110 disabled:opacity-50"
          >
            Importar
          </button>
        </div>
      </form>
    </dialog>
  );
}
