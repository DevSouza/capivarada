import type { CSSProperties } from "react";
import type { Color } from "@/lib/types";
import { Capybara } from "./Capybara";
import { PieceIcon } from "./PieceIcon";

/** Medidas em em: o tamanho da letra define a escala da cena. */
const em = (value: number) => `${value}em`;

const TILE = 4;
const ZOOM = 1.8;
const LENS = { left: 19.6, top: 9.6, size: 7.2 };
const STRIP = { left: 17.6, top: 11.2, width: 15.4 };

/** Um período da faixa; os tons das casas se alternam, então a quantidade é par. */
const PIECES: [string, Color][] = [
  ["n", "w"],
  ["p", "b"],
  ["q", "w"],
  ["r", "b"],
  ["b", "w"],
  ["k", "b"],
];

/** Casas com peças que passam sem parar; a lente mostra a mesma faixa, ampliada. */
function Strip({ zoom, style }: { zoom: number; style: CSSProperties }) {
  const tile = em(TILE * zoom);
  return (
    <div
      className="conveyor absolute flex"
      style={{ ...style, "--shift": em(-TILE * zoom * PIECES.length) } as CSSProperties}
    >
      {[...PIECES, ...PIECES].map(([piece, color], i) => (
        <span
          key={i}
          className="shrink-0"
          style={{ width: tile, height: tile, backgroundColor: i % 2 ? "#7b8da6" : "#e3dccd" }}
        >
          <PieceIcon piece={piece} color={color} />
        </span>
      ))}
    </div>
  );
}

/** A capivara examina as peças com uma lupa enquanto a análise roda. `size`: largura em px. */
export function Detective({ size }: { size: number }) {
  return (
    <div
      aria-hidden
      className="relative mx-auto"
      style={{ fontSize: size / 33, width: em(33), height: em(17) }}
    >
      <div
        className="absolute overflow-hidden"
        style={{
          left: em(STRIP.left),
          top: em(STRIP.top),
          width: em(STRIP.width),
          height: em(TILE),
          maskImage: "linear-gradient(90deg, transparent, #000 15%, #000 70%, transparent)",
        }}
      >
        <Strip zoom={1} style={{ left: 0, top: 0 }} />
      </div>

      <div className="sniff absolute inset-0">
        <div className="absolute" style={{ left: 0, top: em(1.2), width: em(18.2), color: "#c98f4e" }}>
          <Capybara className="block w-full" />
        </div>
        {/* Cabo: da boca até a lente. */}
        <div
          className="absolute rounded-full bg-[#8a5a2b]"
          style={{
            left: em(16.6),
            top: em(6.2),
            width: em(5.6),
            height: em(0.9),
            transformOrigin: "0 50%",
            transform: "rotate(42deg)",
          }}
        />
        <div
          className="absolute overflow-hidden rounded-full bg-raised"
          style={{ left: em(LENS.left), top: em(LENS.top), width: em(LENS.size), height: em(LENS.size) }}
        >
          <Strip
            zoom={ZOOM}
            style={{
              left: em(LENS.size / 2 + ZOOM * (STRIP.left - LENS.left - LENS.size / 2)),
              top: em(LENS.size / 2 + ZOOM * (STRIP.top - LENS.top - LENS.size / 2)),
            }}
          />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,#ffffff66,transparent_38%)]" />
          <div className="absolute inset-0 rounded-full border-solid border-accent" style={{ borderWidth: em(0.6) }} />
        </div>
      </div>
    </div>
  );
}
