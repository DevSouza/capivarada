"use client";

import { useEffect, useState, type ReactNode } from "react";

function download(pgn: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([pgn, "\n"], { type: "application/x-chess-pgn" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface Props {
  pgn: string;
  fileName: string;
  /** Só ícones, com o nome no título e para leitores de tela. */
  iconOnly?: boolean;
}

export function ExportPgn({ pgn, fileName, iconOnly = false }: Props) {
  const [copied, setCopied] = useState<"ok" | "error" | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pgn);
      setCopied("ok");
    } catch {
      setCopied("error");
    }
  }

  const copyLabel = copied === "ok" ? "Copiado" : copied === "error" ? "Não copiou" : "Copiar PGN";
  const style = iconOnly
    ? "flex size-10 items-center justify-center rounded-lg bg-panel text-soft hover:bg-raised hover:text-text"
    : "rounded-lg border border-line px-3 py-2 text-sm hover:bg-raised";

  return (
    <>
      <button type="button" onClick={copy} title={iconOnly ? copyLabel : undefined} className={style}>
        {iconOnly && (copied === "ok" ? <CheckIcon /> : copied === "error" ? <ErrorIcon /> : <CopyIcon />)}
        <span aria-live="polite" className={iconOnly ? "sr-only" : undefined}>
          {copyLabel}
        </span>
      </button>
      <button
        type="button"
        onClick={() => download(pgn, fileName)}
        title={iconOnly ? "Baixar PGN" : undefined}
        className={style}
      >
        {iconOnly && <DownloadIcon />}
        <span className={iconOnly ? "sr-only" : undefined}>Baixar PGN</span>
      </button>
    </>
  );
}

function Icon({ color = "currentColor", children }: { color?: string; children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const CopyIcon = () => (
  <Icon>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v1" />
  </Icon>
);

const CheckIcon = () => (
  <Icon color="#86c04f">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

const ErrorIcon = () => (
  <Icon color="#ff9c9c">
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

const DownloadIcon = () => (
  <Icon>
    <path d="M12 4v11M7 10.5l5 5 5-5M4 20h16" />
  </Icon>
);
