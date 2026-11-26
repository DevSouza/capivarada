"use client";

import { useEffect, useState } from "react";
import { findOwner, joinPgns } from "@/lib/gameInfo";
import { deleteGames, listGames, setFavorite } from "@/lib/library";
import type { JobRequest, Jobs } from "@/lib/backgroundJobs";
import type { Preset } from "@/lib/review";
import { pgnFileName, type SavedGame } from "@/lib/savedGame";
import { Brand } from "./Brand";
import { ExportPgn } from "./ExportPgn";
import { GameRow } from "./GameRow";
import { ImportDialog } from "./ImportDialog";

export interface ImportOutcome {
  /** Nada foi importado: o diálogo continua aberto com esta mensagem. */
  error?: string;
  /** Várias partidas entraram na lista. */
  notice?: string;
}

interface Props {
  /** Nome que o usuário disse ser o dele; null se ainda não escolheu. */
  chosenOwner: string | null;
  preset: Preset;
  /** Falha da última análise. */
  error: string | null;
  onPresetChange: (preset: Preset) => void;
  onImport: (text: string, onProgress: (message: string) => void) => Promise<ImportOutcome>;
  onOpen: (game: SavedGame, owner: string | null) => void;
  /** Análises em segundo plano. */
  background: {
    jobs: Jobs;
    /** Muda a cada análise pronta. */
    revision: number;
    start: (request: JobRequest) => void;
    cancel: (ids: string[]) => void;
  };
}

export function Home({ chosenOwner, preset, error, onPresetChange, onImport, onOpen, background }: Props) {
  const { revision } = background;
  const [games, setGames] = useState<SavedGame[] | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let active = true;
    listGames()
      .catch(() => {
        if (active) setStorageError("Não consegui ler as partidas salvas neste navegador.");
        return [];
      })
      .then((list) => {
        if (!active) return;
        setGames(list);
        // Nada na lista: já abre pedindo a primeira partida.
        if (list.length === 0 && !error) setImporting(true);
      });
    return () => {
      active = false;
    };
  }, [error, revision]);

  async function handleImport(text: string, onProgress: (message: string) => void): Promise<string | null> {
    const outcome = await onImport(text, onProgress);
    if (outcome.error) return outcome.error;
    if (outcome.notice) {
      setNotice(outcome.notice);
      setGames(await listGames().catch(() => games));
      setImporting(false);
    }
    return null;
  }

  async function toggleFavorite(game: SavedGame) {
    const favorite = !game.favorite;
    try {
      await setFavorite(game.id, favorite);
      setGames((list) => list?.map((item) => (item.id === game.id ? { ...item, favorite } : item)) ?? null);
    } catch {
      setStorageError("Não consegui salvar a favorita.");
    }
  }

  function toggleSelected(id: string) {
    const next = new Set(selected);
    if (!next.delete(id)) next.add(id);
    setSelected(next);
    setConfirming(false);
  }

  function clearSelection() {
    setSelected(new Set());
    setConfirming(false);
  }

  async function removeSelected(ids: string[]) {
    try {
      background.cancel(ids);
      await deleteGames(ids);
      setGames((list) => list?.filter((game) => !ids.includes(game.id)) ?? null);
      clearSelection();
    } catch {
      setStorageError("Não consegui excluir as partidas.");
      setConfirming(false);
    }
  }

  const owner = chosenOwner ?? findOwner(games ?? []);
  const hasFavorites = games?.some((game) => game.favorite) ?? false;
  const filtering = onlyFavorites && hasFavorites;
  const visible = (games ?? []).filter((game) => !filtering || game.favorite);
  // Só age sobre o que está na tela.
  const chosen = visible.filter((game) => selected.has(game.id));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Brand />
        <div className="flex gap-2">
          {hasFavorites && (
            <button
              type="button"
              aria-pressed={filtering}
              onClick={() => setOnlyFavorites(!filtering)}
              className="rounded-lg border border-line px-4 py-2.5 text-sm hover:bg-panel aria-pressed:bg-raised"
            >
              Só favoritas
            </button>
          )}
          <button
            type="button"
            onClick={() => setImporting(true)}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-[#2a1a02] hover:brightness-110"
          >
            Importar
          </button>
        </div>
      </header>

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">Suas partidas</h1>

      {[error, storageError].map(
        (message) =>
          message && (
            <p key={message} role="alert" className="rounded-lg bg-panel px-4 py-3 text-sm text-[#ff9c9c]">
              {message}
            </p>
          ),
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-panel px-4 py-3 text-sm whitespace-pre-line text-soft">
          {notice}
        </p>
      )}

      {chosen.length > 0 && (
        <div className="sticky top-2 z-30 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-raised p-3 shadow-lg">
          <p className="mr-auto px-1 text-sm font-medium">
            {chosen.length} {chosen.length === 1 ? "selecionada" : "selecionadas"}
          </p>
          <ExportPgn
            pgn={joinPgns(chosen.map((game) => game.pgn))}
            fileName={chosen.length === 1 ? pgnFileName(chosen[0].headers) : "partidas.pgn"}
          />
          {confirming ? (
            <button
              type="button"
              autoFocus
              onClick={() => removeSelected(chosen.map((game) => game.id))}
              className="rounded-lg bg-[#b53434] px-3 py-2 text-sm font-medium text-white hover:brightness-110"
            >
              Excluir mesmo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-panel"
            >
              Excluir
            </button>
          )}
          <button type="button" onClick={clearSelection} className="px-2 py-2 text-sm hover:underline">
            Cancelar
          </button>
        </div>
      )}

      {games?.length === 0 && (
        <p className="rounded-lg bg-panel px-4 py-16 text-center text-soft">
          Nenhuma partida por aqui. Importe um PGN para ver a análise.
        </p>
      )}
      {visible.length > 0 && (
        <>
          <ul className="divide-y divide-ink overflow-hidden rounded-lg">
            {visible.map((game) => (
              <GameRow
                key={game.id}
                game={game}
                owner={owner}
                selected={selected.has(game.id)}
                onOpen={() => onOpen(game, owner)}
                onToggleFavorite={() => toggleFavorite(game)}
                onToggleSelected={() => toggleSelected(game.id)}
                defaultPreset={preset}
                job={background.jobs.get(game.id)}
                onAnalyze={(target) => background.start({ game, preset: target })}
                onCancelAnalysis={() => background.cancel([game.id])}
              />
            ))}
          </ul>
          <p className="text-xs text-muted">
            As partidas ficam salvas só neste navegador. Limpar os dados do site apaga a lista.
          </p>
        </>
      )}

      {importing && (
        <ImportDialog
          preset={preset}
          onPresetChange={onPresetChange}
          onImport={handleImport}
          onClose={() => setImporting(false)}
        />
      )}
    </div>
  );
}
