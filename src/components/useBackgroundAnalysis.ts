"use client";

import { useEffect, useRef, useState } from "react";
import { BackgroundJobs, type JobRequest, type Jobs } from "@/lib/backgroundJobs";
import { AnalysisCancelled, backgroundPoolSize } from "@/lib/engine/pool";
import { saveAnalysis } from "@/lib/library";
import { parsePgn } from "@/lib/pgn";
import { reviewGame } from "@/lib/review";

async function analyzeAndSave(
  { game, preset }: JobRequest,
  signal: AbortSignal,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const review = await reviewGame(parsePgn(game.pgn), preset, signal, onProgress, backgroundPoolSize());
  if (signal.aborted) throw new AnalysisCancelled();
  await saveAnalysis(review, preset).catch(() => {
    throw new Error("Não consegui salvar a análise no navegador.");
  });
}

/** Análises que seguem enquanto o usuário navega entre a lista e as revisões. */
export function useBackgroundAnalysis() {
  const [jobs, setJobs] = useState<Jobs>(new Map());
  /** Muda a cada análise pronta: a lista precisa ser relida. */
  const [revision, setRevision] = useState(0);
  const background = useRef<BackgroundJobs | null>(null);

  useEffect(() => {
    const created = new BackgroundJobs(analyzeAndSave, {
      onChange: setJobs,
      onFinished: () => setRevision((current) => current + 1),
    });
    background.current = created;
    return () => created.close();
  }, []);

  return {
    jobs,
    revision,
    start: (request: JobRequest) => background.current?.add(request),
    cancel: (ids: string[]) => background.current?.cancel(ids),
  };
}
