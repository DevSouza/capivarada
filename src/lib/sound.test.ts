import { describe, expect, it } from "vitest";
import { soundsOf } from "./sound";

describe("soundsOf", () => {
  it.each([
    ["e4", ["move"]], ["O-O", ["move"]], ["e8=Q", ["move"]], ["exd5", ["capture"]], ["exd8=N", ["capture"]],
    ["Bb5+", ["move", "check"]], ["O-O+", ["move", "check"]], ["Qxf7+", ["capture", "check"]],
    ["Nd5#", ["move", "check"]], ["Qxf2#", ["capture", "check"]],
  ])("%s -> %j", (san, expected) => {
    expect(soundsOf(san)).toEqual(expected);
  });
});
