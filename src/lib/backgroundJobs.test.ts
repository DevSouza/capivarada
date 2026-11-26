import { describe, expect, it, vi } from "vitest";
import { BackgroundJobs, type JobRequest, type Jobs } from "./backgroundJobs";
import { AnalysisCancelled } from "./engine/pool";
import { parsePgn } from "./pgn";
import { toSavedGame } from "./savedGame";

const request = (id: string): JobRequest => ({
  game: { ...toSavedGame(parsePgn("1. e4"), 0), id },
  preset: "deep",
});

/** Trabalhos que só terminam quando o teste manda. */
function setup() {
  const started: { id: string; finish: () => void; fail: (error: Error) => void; progress: (done: number) => void }[] = [];
  let jobs: Jobs = new Map();
  const onFinished = vi.fn();
  const background = new BackgroundJobs(
    ({ game }, signal, onProgress) =>
      new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(new AnalysisCancelled()));
        started.push({ id: game.id, finish: resolve, fail: reject, progress: (done) => onProgress(done, 10) });
      }),
    { onChange: (next) => (jobs = next), onFinished },
  );
  const settle = () => new Promise((resolve) => setTimeout(resolve));
  return { background, started, onFinished, settle, states: () => [...jobs].map(([id, { state }]) => `${id}:${state}`), get: (id: string) => jobs.get(id) };
}

describe("BackgroundJobs", () => {
  it("roda uma partida por vez, na ordem, e informa o progresso", async () => {
    const { background, started, onFinished, settle, states, get } = setup();
    background.add(request("a"));
    background.add(request("b"));
    background.add(request("a"));
    expect(states()).toEqual(["a:running", "b:waiting"]);
    started[0].progress(4);
    expect(get("a")).toEqual({ state: "running", done: 4, total: 10 });
    started[0].finish();
    await settle();
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(states()).toEqual(["b:running"]);
  });

  it("cancela o que roda e o que espera", async () => {
    const { background, started, onFinished, settle, states } = setup();
    for (const id of ["a", "b", "c"]) background.add(request(id));
    background.cancel(["a", "b"]);
    await settle();
    expect(started.map(({ id }) => id)).toEqual(["a", "c"]);
    expect(states()).toEqual(["c:running"]);
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("cancelada e pedida de novo, roda outra vez", async () => {
    const { background, started, settle, states } = setup();
    background.add(request("a"));
    background.cancel(["a"]);
    background.add(request("a"));
    await settle();
    expect(started).toHaveLength(2);
    expect(states()).toEqual(["a:running"]);
  });

  it("mostra a falha, segue com a fila e aceita tentar de novo", async () => {
    const { background, started, settle, states, get } = setup();
    background.add(request("a"));
    background.add(request("b"));
    started[0].fail(new Error("sem rede"));
    await settle();
    expect(get("a")).toEqual({ state: "failed", message: "sem rede" });
    expect(states()).toEqual(["a:failed", "b:running"]);
    background.add(request("a"));
    expect(states()).toEqual(["a:waiting", "b:running"]);
  });
});
