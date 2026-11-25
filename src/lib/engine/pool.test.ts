import { describe, expect, it } from "vitest";
import { poolSize } from "./pool";

describe("poolSize", () => {
  it.each([
    [1, false, 1], [2, false, 1], [4, false, 3], [12, false, 11], [32, false, 12],
    [8, true, 4], [4, true, 3], [2, true, 1],
  ])("%i threads, celular %s -> %i motores", (threads, mobile, expected) => {
    expect(poolSize(threads, mobile)).toBe(expected);
  });
});
