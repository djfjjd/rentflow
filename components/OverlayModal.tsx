"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function OverlayModal({
  children,
  onClose,
  panelClassName = "w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl",
  align = "center",
}: {
  children: ReactNode;
  onClose: () => void;
  panelClassName?: string;
  align?: "center" | "top";
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex bg-black/20 p-4 ${align === "top" ? "items-start justify-center pt-16 sm:pt-20" : "items-center justify-center"}`}
      onClick={onClose}
    >
      <div className={panelClassName} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
