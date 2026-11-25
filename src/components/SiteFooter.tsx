export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-4 py-6 text-xs leading-relaxed text-muted sm:px-6">
      A análise roda no seu navegador com{" "}
      <a className="underline" href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1">
        Stockfish.js 19
      </a>{" "}
      (
      <a className="underline" href="/engine/COPYING.txt">
        GPL-3.0
      </a>
      ). Aberturas de{" "}
      <a className="underline" href="https://github.com/lichess-org/chess-openings">
        lichess-org/chess-openings
      </a>{" "}
      (CC0). Capivara de{" "}
      <a className="underline" href="https://game-icons.net/1x1/caro-asercion/capybara.html">
        Caro Asercion
      </a>{" "}
      (
      <a className="underline" href="https://creativecommons.org/licenses/by/3.0/deed.pt-br">
        CC BY 3.0
      </a>
      , recolorida e recortada). Sons “SFX” de{" "}
      <a className="underline" href="https://github.com/lichess-org/lila/tree/3e5aeef9b54c9a3a6637b57650420f67da26f57e/public/sound/sfx">
        Enigmahack, do Lichess
      </a>{" "}
      (
      <a className="underline" href="/sounds/sfx/LICENSE.txt">
        AGPL-3.0+
      </a>
      ). As classificações são aproximações próprias, sem vínculo com nenhum site de xadrez.
    </footer>
  );
}
