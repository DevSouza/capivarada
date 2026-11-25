// Conjunto "SFX" do Lichess, de Enigmahack (AGPL-3.0 ou posterior): public/sounds/sfx.
const FILES = { move: "move.mp3", capture: "capture.mp3", check: "check.mp3" } as const;

export type Sound = keyof typeof FILES;

/** Sons de um lance a partir da SAN em inglês, na ordem em que tocam (como no Lichess). */
export function soundsOf(san: string): Sound[] {
  const base: Sound = san.includes("x") ? "capture" : "move";
  // No conjunto SFX, o mate usa o som do xeque.
  return /[+#]$/.test(san) ? [base, "check"] : [base];
}

const VOLUME = 0.7;
/** A batida coincide com o fim da animação da peça no tabuleiro. */
const LANDING_SECONDS = 0.1;
/** Intervalo entre os sons de um mesmo lance. */
const GAP_SECONDS = 0.1;

let context: AudioContext | null = null;
const downloads = new Map<Sound, Promise<ArrayBuffer>>();
const buffers = new Map<Sound, Promise<AudioBuffer>>();

function download(sound: Sound): Promise<ArrayBuffer> {
  let pending = downloads.get(sound);
  if (!pending) {
    pending = fetch(`/sounds/sfx/${FILES[sound]}`).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.arrayBuffer();
    });
    // Falhou (sem rede, por exemplo): tenta de novo no próximo lance.
    pending.catch(() => downloads.delete(sound));
    downloads.set(sound, pending);
  }
  return pending;
}

function decode(ctx: AudioContext, sound: Sound): Promise<AudioBuffer> {
  let pending = buffers.get(sound);
  if (!pending) {
    pending = download(sound).then((data) => ctx.decodeAudioData(data.slice(0)));
    pending.catch(() => buffers.delete(sound));
    buffers.set(sound, pending);
  }
  return pending;
}

/** Baixa os sons antes de precisar, para o primeiro lance já sair na hora. */
export function preloadSounds(): void {
  for (const sound of Object.keys(FILES) as Sound[]) download(sound).catch(() => {});
}

/** Toca os sons; sem suporte a áudio, rede ou permissão, não faz nada. */
export async function playSounds(sounds: Sound[]): Promise<void> {
  try {
    context ??= new AudioContext();
    const ctx = context;
    // O navegador só libera o áudio depois de uma interação.
    if (ctx.state === "suspended") await ctx.resume();
    const loaded = await Promise.all(sounds.map((sound) => decode(ctx, sound)));
    const start = ctx.currentTime + LANDING_SECONDS;
    loaded.forEach((buffer, i) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = VOLUME;
      source.connect(gain).connect(ctx.destination);
      source.start(start + i * GAP_SECONDS);
    });
  } catch {
    // O som é um extra: nunca atrapalha a revisão.
  }
}

const MUTED_KEY = "capivarada:mudo";

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
  } catch {
    // Sem armazenamento, a escolha vale só até recarregar.
  }
}
