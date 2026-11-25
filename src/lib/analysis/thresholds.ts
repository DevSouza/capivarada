/**
 * Limites superiores (exclusivos) de pontos esperados perdidos. Imprecisão, Erro e
 * Capivara começam nos cortes do Lichess (0,1/0,2/0,3 na escala dele, de -1 a 1).
 */
export const LOSS = {
  good: 0.05,
  inaccuracy: 0.1,
  mistake: 0.15,
} as const;

// Daqui para baixo são aproximações.

export const BRILLIANT = {
  maxLoss: 0.02,
  /** Um pouco pior, mas não perdido. */
  minExpectedAfter: 0.45,
  /** Saldo do que o adversário pode ganhar (em peões): uma peça menor por um peão. */
  maxNetMaterial: -2,
} as const;

export const GREAT = {
  /** Captura rotineira só conta se pune um erro deste tamanho do adversário. */
  minPunishedLoss: 0.1,
  minGap: 0.1,
  minExpectedAfter: 0.2,
  /** Se a segunda opção também ganhava (~ +3), o lance não era decisivo. */
  maxAlternative: 0.75,
} as const;

/** Um lance catalogado que perde isto não é Livro (ex.: mate do louco). */
export const BOOK_MAX_LOSS = 0.1;

export const MISS = {
  minOpponentLoss: 0.1,
  /** Havia algo a aproveitar: em posição perdida, é só mais um erro. */
  minExpectedBefore: 0.45,
  minLoss: 0.1,
} as const;
