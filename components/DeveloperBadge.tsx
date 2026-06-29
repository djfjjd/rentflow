"use client";

import { useEffect, useState } from "react";

type AuthMeResponse = {
  user?: {
    isDeveloper?: boolean;
  } | null;
};

export function DeveloperBadge({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }

    let active = true;
    async function loadDeveloperStatus() {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) return null;
      return (await response.json()) as AuthMeResponse;
    }

    loadDeveloperStatus()
      .then((data) => {
        if (active) setVisible(Boolean(data?.user?.isDeveloper));
      })
      .catch(() => {
        if (active) setVisible(false);
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  if (!enabled || !visible) return null;

  return (
    <span className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 sm:text-sm">
      <span aria-hidden="true">🔴</span>
      <span className="ml-1 whitespace-nowrap">개발자 로그인 중</span>
    </span>
  );
}
