"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

const pullThreshold = 70;

export function PullToRefresh({ children }: { children: ReactNode }) {
  const startY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    cleanRefreshParam();

    if (!isTouchDevice()) return;

    function onTouchStart(event: TouchEvent) {
      if (window.scrollY !== 0 || shouldBlockPullToRefresh(event.target)) {
        startY.current = null;
        return;
      }
      startY.current = event.touches[0]?.clientY ?? null;
    }

    function onTouchMove(event: TouchEvent) {
      if (startY.current === null || shouldBlockPullToRefresh(event.target)) return;
      const currentY = event.touches[0]?.clientY ?? 0;
      const distance = Math.max(0, currentY - startY.current);
      if (distance <= 0) return;

      const nextDistance = Math.min(distance, 110);
      setPullDistance(nextDistance);
      setReady(nextDistance >= pullThreshold);
    }

    function onTouchEnd() {
      const shouldRefresh = ready;
      startY.current = null;
      setPullDistance(0);
      setReady(false);

      if (shouldRefresh) {
        hardRefresh();
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [ready]);

  return (
    <>
      {pullDistance > 8 ? (
        <div
          className="fixed left-1/2 top-3 z-[10000] -translate-x-1/2 rounded-full bg-[#116149] px-4 py-2 text-sm font-black text-white shadow-lg"
          style={{ transform: `translate(-50%, ${Math.min(pullDistance / 3, 28)}px)` }}
        >
          {ready ? "놓으면 새로고침" : "당겨서 새로고침"}
        </div>
      ) : null}
      {children}
    </>
  );
}

function hardRefresh() {
  const url = new URL(window.location.href);
  url.searchParams.set("_rf", Date.now().toString());
  window.location.replace(url.toString());
}

function cleanRefreshParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("_rf")) return;
  url.searchParams.delete("_rf");
  window.history.replaceState({}, "", url.toString());
}

function isTouchDevice() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

function shouldBlockPullToRefresh(target: EventTarget | null) {
  const active = document.activeElement;
  if (isFormElement(active)) return true;
  if (document.querySelector("[data-overlay-modal='true']")) return true;

  const element = target instanceof Element ? target : null;
  if (!element) return false;
  if (element.closest("input, textarea, select")) return true;
  if (element.closest("[data-overlay-modal='true']")) return true;
  if (element.closest("[data-horizontal-scroll='true']")) return true;

  return false;
}

function isFormElement(element: Element | null) {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
}
