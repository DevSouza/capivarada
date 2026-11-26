const OWNER_KEY = "capivarada:usuario";

/** Nome (em minúsculas) de quem usa o site; null se ainda não foi escolhido. */
export function loadOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

export function saveOwner(name: string): void {
  try {
    localStorage.setItem(OWNER_KEY, name);
  } catch {
    // Sem armazenamento, a escolha vale só até recarregar.
  }
}
