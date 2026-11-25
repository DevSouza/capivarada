const GAP = 12;
const MARGIN = 8;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(Math.max(min, max), value));

/**
 * Posição fixa na tela para um painel flutuante: ao lado do painel do lance,
 * para não cobrir a lista; sem espaço, acima ou abaixo do elemento.
 */
export function placeNear(target: HTMLElement, size: { width: number; height: number }): { left: number; top: number } {
  const box = target.getBoundingClientRect();
  const panel = (target.closest("[data-preview-panel]") ?? target).getBoundingClientRect();
  const maxTop = window.innerHeight - size.height - MARGIN;
  const left = panel.left - size.width - GAP;
  if (left >= MARGIN) return { left, top: clamp(box.top + box.height / 2 - size.height / 2, MARGIN, maxTop) };
  const above = box.top - size.height - MARGIN;
  return {
    left: clamp(box.left, MARGIN, window.innerWidth - size.width - MARGIN),
    top: above >= MARGIN ? above : clamp(box.bottom + MARGIN, MARGIN, maxTop),
  };
}
