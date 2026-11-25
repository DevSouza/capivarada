// Baixa o Stockfish 19 lite single-threaded (GPL-3.0) para public/engine.
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const RELEASE = "https://github.com/nmrugg/stockfish.js/releases/download/v19.0.1";
const FILES = [
  ["stockfish-19-lite-single.js", `${RELEASE}/stockfish-19-lite-single.js`, "ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a"],
  ["stockfish-19-lite-single.wasm", `${RELEASE}/stockfish-19-lite-single.wasm`, "ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de"],
  ["COPYING.txt", "https://raw.githubusercontent.com/nmrugg/stockfish.js/v19.0.1/Copying.txt", "0b383d5a63da644f628d99c33976ea6487ed89aaa59f0b3257992deac1171e6b"],
];
const outDir = new URL("../public/engine/", import.meta.url);

await mkdir(outDir, { recursive: true });
for (const [name, url, sha256] of FILES) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== sha256) throw new Error(`${name}: SHA-256 inesperado (${actual})`);
  await writeFile(new URL(name, outDir), bytes);
  console.log(`${name}: ${bytes.length} bytes`);
}
