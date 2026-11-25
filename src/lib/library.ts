import { sortGames } from "./gameInfo";
import { parsePgn } from "./pgn";
import type { Preset } from "./review";
import { GAME_SCHEMA, toSavedAnalysis, toSavedGame, type SavedAnalysis, type SavedGame } from "./savedGame";
import type { GameReview, ParsedGame } from "./types";

const DB_NAME = "chess-analises";
const DB_VERSION = 1;
const GAMES = "games";
const ANALYSES = "analyses";

let connection: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(GAMES, { keyPath: "id" });
      request.result.createObjectStore(ANALYSES, { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      const reset = () => (connection = null);
      db.onclose = reset;
      db.onversionchange = () => {
        db.close();
        reset();
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  }).catch((error) => {
    connection = null;
    throw error;
  });
  return connection;
}

/** Roda `work` numa transação e só resolve depois que ela foi gravada. */
async function transact<T>(
  mode: IDBTransactionMode,
  work: (games: IDBObjectStore, analyses: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction([GAMES, ANALYSES], mode);
    let result: T;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Gravação interrompida."));
    work(tx.objectStore(GAMES), tx.objectStore(ANALYSES), (value) => (result = value));
  });
}

/** Atualiza uma partida que ainda exista; excluída em outra aba, não ressuscita. */
function updateGame(
  games: IDBObjectStore,
  id: string,
  change: (game: SavedGame) => SavedGame,
  then?: () => void,
): void {
  const existing: IDBRequest<SavedGame | undefined> = games.get(id);
  existing.onsuccess = () => {
    if (!existing.result) return;
    games.put(change(existing.result));
    then?.();
  };
}

/** Salva ou atualiza a partida, preservando a análise e o PGN mais completo. */
export function saveGame(game: ParsedGame): Promise<SavedGame> {
  return transact("readwrite", (games, _analyses, done) => {
    const record = toSavedGame(game, Date.now());
    const existing: IDBRequest<SavedGame | undefined> = games.get(record.id);
    existing.onsuccess = () => {
      const old = existing.result;
      // Recolar sem relógio ou comentários não apaga os que já estavam salvos.
      const keepOld = old?.schema === GAME_SCHEMA && old.pgn.length > record.pgn.length;
      const saved: SavedGame = {
        ...record,
        pgn: keepOld ? old.pgn : record.pgn,
        headers: keepOld ? old.headers : record.headers,
        addedAt: old?.addedAt ?? record.addedAt,
        favorite: old?.favorite ?? false,
        analysis: old?.analysis ?? null,
      };
      games.put(saved);
      done(saved);
    };
  });
}

export function saveAnalysis(review: GameReview, preset: Preset): Promise<void> {
  return transact("readwrite", (games, analyses) => {
    const analysis = toSavedAnalysis(review);
    const { version, accuracy, opening } = analysis;
    updateGame(
      games,
      analysis.id,
      (game) => ({ ...game, analysis: { version, preset, accuracy, opening } }),
      () => analyses.put(analysis),
    );
  });
}

export function setFavorite(id: string, favorite: boolean): Promise<void> {
  return transact("readwrite", (games) => updateGame(games, id, (game) => ({ ...game, favorite })));
}

export function loadAnalysis(id: string): Promise<SavedAnalysis | null> {
  return transact("readonly", (_games, analyses, done) => {
    const request: IDBRequest<SavedAnalysis | undefined> = analyses.get(id);
    request.onsuccess = () => done(request.result ?? null);
  });
}

/** Refaz um registro de formato antigo; null se o PGN não puder mais ser lido. */
function upgrade(old: SavedGame & { usedAt?: number }): SavedGame | null {
  try {
    const fresh = toSavedGame(parsePgn(old.pgn), old.addedAt ?? old.usedAt ?? Date.now());
    return { ...fresh, id: old.id, favorite: old.favorite ?? false, analysis: old.analysis };
  } catch {
    return null;
  }
}

export async function listGames(): Promise<SavedGame[]> {
  const stored = await transact<SavedGame[]>("readonly", (games, _analyses, done) => {
    const request: IDBRequest<SavedGame[]> = games.getAll();
    request.onsuccess = () => done(request.result);
  });
  const upgraded = stored.filter((game) => game.schema !== GAME_SCHEMA).flatMap((game) => upgrade(game) ?? []);
  if (upgraded.length > 0) {
    await transact<void>("readwrite", (games) => {
      for (const game of upgraded) games.put(game);
    });
  }
  return sortGames([...stored.filter((game) => game.schema === GAME_SCHEMA), ...upgraded]);
}

export function deleteGames(ids: string[]): Promise<void> {
  return transact("readwrite", (games, analyses) => {
    for (const id of ids) {
      games.delete(id);
      analyses.delete(id);
    }
  });
}
