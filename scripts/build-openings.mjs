// Gera public/openings.json a partir de lichess-org/chess-openings (CC0).
// Formato: { epd: "ECO Nome" | "" } — "" marca prefixos de linhas sem nome próprio.
import { writeFile } from "node:fs/promises";
import { Chess } from "chess.js";

const COMMIT = "48a8c0e733facfdc9a3723fe882e51ec28014074";
const book = {};
const epd = (chess) => chess.fen().split(" ").slice(0, 4).join(" ");

for (const volume of "abcde") {
  const url = `https://raw.githubusercontent.com/lichess-org/chess-openings/${COMMIT}/${volume}.tsv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  for (const line of (await res.text()).trim().split(/\r?\n/).slice(1)) {
    const [eco, name, pgn] = line.split("\t");
    const chess = new Chess();
    for (const token of pgn.split(/\s+/)) {
      const san = token.replace(/^\d+\.+/, "");
      if (!san) continue;
      chess.move(san);
      book[epd(chess)] ??= "";
    }
    book[epd(chess)] = `${eco} ${name}`;
  }
}

await writeFile(new URL("../public/openings.json", import.meta.url), JSON.stringify(book));
console.log(`${Object.keys(book).length} posições`);
