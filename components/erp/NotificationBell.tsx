"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { notifications } from "@/lib/erp-data";

export function NotificationBell() {
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        showNotifications &&
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <>
      <button
        ref={bellRef}
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-primary shadow-sm transition-colors hover:bg-slate-50"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
      </button>

      {showNotifications && (
        <div
          ref={popupRef}
          className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="border-b border-line bg-field/50 px-4 py-3">
            <h2 className="text-sm font-black text-ink">최근 알림</h2>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2 text-left">
            {notifications.map((item) => (
              <article key={item.id} className="rounded-lg p-3 hover:bg-field transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-primary uppercase tracking-wider">{item.type}</p>
                  <span className="text-[10px] font-medium text-gray-400">{item.createdAt}</span>
                </div>
                <p className="mt-1 text-sm font-black text-ink">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">{item.message}</p>
              </article>
            ))}
            {notifications.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm font-bold text-gray-400">알림이 없습니다.</p>
              </div>
            )}
          </div>
          <div className="border-t border-line p-2">
            <Link
              href="/admin/notifications"
              onClick={() => setShowNotifications(false)}
              className="flex h-10 w-full items-center justify-center rounded-lg text-xs font-black text-gray-500 hover:bg-field"
            >
              알림센터 전체보기
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
