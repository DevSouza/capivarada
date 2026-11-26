"use client";

import { useEffect, useRef, useState } from "react";
import { AnalysisCancelled } from "@/lib/engine/pool";
import { ownerColor } from "@/lib/gameInfo";
import { loadAnalysis, saveAnalysis, saveGame } from "@/lib/library";
import { loadOwner, saveOwner } from "@/lib/owner";
import { parsePgn, splitGames } from "@/lib/pgn";
import { knownName } from "@/lib/players";
import { reviewGame, type Preset } from "@/lib/review";
import { isCurrent, restoreReview, type SavedGame } from "@/lib/savedGame";
import type { Color, GameReview, ParsedGame } from "@/lib/types";
import { Home, type ImportOutcome } from "./Home";
import { OwnerDialog } from "./OwnerDialog";
import { Progress } from "./Progress";
import { Review } from "./Review";

type Stage =
  | { name: "home"; error: string | null }
  | { name: "running"; done: number; total: number }
  | { name: "review"; review: GameReview; preset: Preset; notice: string | null; flipped: boolean };

const NOT_SAVED = "Não consegui salvar esta partida no navegador. Exporte o PGN se quiser guardá-la.";

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Algo deu errado. Tente de novo.";

/** Análise salva da partida, se ainda valer; falha de leitura só leva a refazer. */
async function loadReview(game: ParsedGame, saved: SavedGame): Promise<GameReview | null> {
  if (!isCurrent(saved.analysis)) return null;
  try {
    const analysis = await loadAnalysis(saved.id);
    return analysis && restoreReview(game, analysis);
  } catch {
    return null;
  }
}

/** A primeira partida que dá para ler. */
function firstGame(pgns: string[]): ParsedGame | null {
  for (const pgn of pgns) {
    try {
      return parsePgn(pgn);
    } catch {
      // As falhas são contadas na importação.
    }
  }
  return null;
}

/** Salva várias partidas na lista, sem analisar. */
async function importMany(pgns: string[], onProgress: (message: string) => void): Promise<ImportOutcome> {
  const failures: string[] = [];
  for (const [i, pgn] of pgns.entries()) {
    onProgress(`Importando ${i + 1} de ${pgns.length}…`);
    // Deixa a tela atualizar: ler um PGN é síncrono.
    await new Promise((resolve) => setTimeout(resolve));
    try {
      const game = parsePgn(pgn);
      await saveGame(game).catch(() => {
        throw new Error("não consegui salvar no navegador.");
      });
    } catch (error) {
      failures.push(`Partida ${i + 1}: ${messageOf(error)}`);
    }
  }
  const imported = pgns.length - failures.length;
  if (imported === 0) return { error: `Nenhuma partida foi importada. ${failures[0]}` };
  const summary = `${imported} ${imported === 1 ? "partida importada" : "partidas importadas"}.`;
  return { notice: [summary, ...failures].join("\n") };
}

export function Analyzer() {
  const [preset, setPreset] = useState<Preset>("normal");
  const [stage, setStage] = useState<Stage>({ name: "home", error: null });
  const [owner, setOwner] = useState(loadOwner);
  /** Pergunta em aberto: quem é o usuário nesta partida. */
  const [question, setQuestion] = useState<{ headers: ParsedGame["headers"]; answer: (side: Color | null) => void } | null>(
    null,
  );
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  /** O lado do usuário na partida; pergunta enquanto não souber o nome dele. */
  async function identify({ headers }: ParsedGame): Promise<Color | null> {
    if (owner) return ownerColor(headers, owner);
    // Sem nomes, a resposta não serviria para as próximas.
    if (!knownName(headers, "w") && !knownName(headers, "b")) return null;
    const side = await new Promise<Color | null>((answer) => setQuestion({ headers, answer }));
    setQuestion(null);
    const name = side && knownName(headers, side)?.toLowerCase();
    if (name) {
      saveOwner(name);
      setOwner(name);
    }
    return side;
  }

  /** Mostra a análise guardada da partida ou faz uma nova. */
  async function open(parsed: ParsedGame, side: Color | null, canReuse: (saved: SavedGame) => boolean) {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const update = (next: Stage) => {
      if (!abort.signal.aborted) setStage(next);
    };
    try {
      let notice: string | null = null;
      const saved = await saveGame(parsed).catch(() => {
        notice = NOT_SAVED;
        return null;
      });
      if (abort.signal.aborted) return;
      const game = saved ? parsePgn(saved.pgn) : parsed;

      // A análise salva pode ter sido feita com outra profundidade.
      let usedPreset = saved?.analysis?.preset ?? preset;
      let review = saved && canReuse(saved) ? await loadReview(game, saved) : null;
      if (!review) {
        usedPreset = preset;
        update({ name: "running", done: 0, total: game.plies.length + 1 });
        review = await reviewGame(game, preset, abort.signal, (done, total) =>
          update({ name: "running", done, total }),
        );
        if (saved) {
          await saveAnalysis(review, preset).catch(() => {
            notice = NOT_SAVED;
          });
        }
      }
      update({ name: "review", review, preset: usedPreset, notice, flipped: side === "b" });
    } catch (error) {
      if (error instanceof AnalysisCancelled) return;
      update({ name: "home", error: messageOf(error) });
    }
  }

  async function importText(text: string, onProgress: (message: string) => void): Promise<ImportOutcome> {
    const pgns = splitGames(text);
    if (pgns.length > 1) {
      const first = firstGame(pgns);
      if (first) await identify(first);
      return importMany(pgns, onProgress);
    }
    let game: ParsedGame;
    try {
      game = parsePgn(text);
    } catch (error) {
      return { error: messageOf(error) };
    }
    // Colar de novo com outra profundidade refaz a análise; abrir da lista, não.
    await open(game, await identify(game), (saved) => saved.analysis?.preset === preset);
    return {};
  }

  function backHome() {
    controller.current?.abort();
    setStage({ name: "home", error: null });
  }

  if (stage.name === "running") return <Progress done={stage.done} total={stage.total} onCancel={backHome} />;
  if (stage.name === "review") {
    return (
      <Review
        review={stage.review}
        preset={stage.preset}
        notice={stage.notice}
        startFlipped={stage.flipped}
        onBack={backHome}
      />
    );
  }
  return (
    <>
      <Home
        chosenOwner={owner}
        preset={preset}
        error={stage.error}
        onPresetChange={setPreset}
        onImport={importText}
        onOpen={(saved, player) => open(parsePgn(saved.pgn), ownerColor(saved.headers, player), () => true)}
      />
      {question && <OwnerDialog headers={question.headers} onChoose={question.answer} />}
    </>
  );
}
