import { describe, expect, it, vi } from "vitest";
import type { PositionEval } from "../types";
import { SearchQueue, type Engine, type QueuedSearch } from "./queue";

const RESULT: PositionEval = { score: { kind: "cp", cp: 0 }, lines: [], depth: 1 };

const search = (key: string): QueuedSearch => ({
  key,
  request: { startFen: "", moves: [key], turn: "w", nodes: 1, multiPv: 1 },
});

/** Motores que só respondem quando o teste manda. */
function setup(size: number) {
  const pending = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();
  const engines: Engine[] = [];
  const onResult = vi.fn();
  const onError = vi.fn();
  const queue = new SearchQueue(
    size,
    () => {
      const engine: Engine = {
        init: async () => {},
        search: ({ moves }) =>
          new Promise((resolve, reject) => pending.set(moves[0], { resolve: () => resolve(RESULT), reject })),
        terminate: vi.fn(),
      };
      engines.push(engine);
      return engine;
    },
    { onResult, onError },
  );
  const settle = () => new Promise((resolve) => setTimeout(resolve));
  return { queue, pending, engines, onResult, onError, settle };
}

describe("SearchQueue", () => {
  it("cria motores sob demanda, até o limite, e os reaproveita", async () => {
    const { queue, pending, engines, onResult, settle } = setup(2);
    expect(engines).toHaveLength(0);
    queue.replace([search("a"), search("b"), search("c")]);
    await settle();
    expect([...pending.keys()]).toEqual(["a", "b"]);
    pending.get("b")!.resolve();
    await settle();
    expect(onResult).toHaveBeenCalledWith("b", RESULT);
    expect([...pending.keys()]).toEqual(["a", "b", "c"]);
    expect(engines).toHaveLength(2);
  });

  it("descarta o que saiu da fila e não repete o que está rodando", async () => {
    const { queue, pending, onResult, settle } = setup(1);
    queue.replace([search("a"), search("b")]);
    await settle();
    queue.replace([search("a"), search("c")]);
    pending.get("a")!.resolve();
    await settle();
    expect([...pending.keys()]).toEqual(["a", "c"]);
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it("depois de uma falha, o próximo pedido usa um motor novo", async () => {
    const { queue, pending, engines, onError, onResult, settle } = setup(1);
    queue.replace([search("a")]);
    await settle();
    pending.get("a")!.reject(new Error("falhou"));
    await settle();
    expect(onError).toHaveBeenCalledWith(new Error("falhou"));
    expect(engines[0].terminate).toHaveBeenCalled();

    queue.replace([search("a")]);
    await settle();
    pending.get("a")!.resolve();
    await settle();
    expect(engines).toHaveLength(2);
    expect(onResult).toHaveBeenCalledWith("a", RESULT);
  });

  it("encerrada, não avisa mais nada", async () => {
    const { queue, pending, engines, onError, onResult, settle } = setup(1);
    queue.replace([search("a")]);
    await settle();
    queue.terminate();
    pending.get("a")!.reject(new Error("Motor encerrado."));
    await settle();
    queue.replace([search("b")]);
    expect(engines).toHaveLength(1);
    expect(onError).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });
});
