"use client";

import { settingsMenuItems, type SettingsSection } from "./settings-menu";

export function SettingsSidebar({
  active,
  onChange,
}: {
  active: SettingsSection;
  onChange: (section: SettingsSection) => void;
}) {
  return (
    <aside className="panel shrink-0 p-2 md:w-[220px]">
      <nav className="flex gap-2 overflow-x-auto md:grid md:overflow-visible">
        {settingsMenuItems.map((item) => {
          const selected = active === item.id;
          return (
            <button
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-left text-sm font-black transition md:w-full ${
                selected ? "bg-[#116149] text-white" : "bg-white text-[#25342e] hover:bg-[#eef4ed]"
              }`}
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
