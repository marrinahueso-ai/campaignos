"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Mount Team & Access overlays on document.body.
 * Settings Ease `settings-ease-rise` (and header backdrop-filter) create a
 * containing block, so `position: fixed` otherwise anchors to the tall
 * settings column instead of the viewport.
 */
export function TeamAccessBodyPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(children, document.body);
}
