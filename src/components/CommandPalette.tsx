import React, { useState, useEffect, useRef } from "react";
import { Icon } from "./icons";

const COMMANDS = [
  { group: "Navigation", items: [
    { label: "Dashboard", key: "dashboard", icon: "🏠" },
    { label: "Patient Search", key: "patients", icon: "🔍" },
    { label: "Appointments", key: "appointments", icon: "📅" },
    { label: "Emergency Room", key: "er", icon: "🚨" },
    { label: "Inpatient / Bed Board", key: "inpatient", icon: "🛏" },
    { label: "Laboratory", key: "laboratory", icon: "🧪" },
    { label: "Pharmacy", key: "pharmacy", icon: "💊" },
    { label: "Surgery / OR Board", key: "surgery", icon: "⚕" },
    { label: "Billing & Claims", key: "billing", icon: "💳" },
  ]},
  { group: "Quick Actions", items: [
    { label: "Register New Patient", key: "register", icon: "👤" },
    { label: "New Appointment", key: "newappt", icon: "➕" },
    { label: "New Order — John Smith", key: "order", icon: "📋" },
    { label: "Open ED Board", key: "er", icon: "🚑" },
    { label: "Assign Bed", key: "inpatient", icon: "🏥" },
  ]},
  { group: "Recent Patients", items: [
    { label: "John Smith · MRN 100245", key: "chart", icon: "👤" },
    { label: "Thomas Reed · MRN 100301", key: "chart", icon: "👤" },
    { label: "Mary Jones · MRN 100246", key: "chart", icon: "👤" },
  ]},
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (key: string) => void;
}

export default function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const allItems = COMMANDS.flatMap(g => g.items);
  const filtered = q
    ? allItems.filter(i => i.label.toLowerCase().includes(q.toLowerCase()))
    : allItems;

  const groups = q
    ? [{ group: "Results", items: filtered }]
    : COMMANDS;

  const allFiltered = groups.flatMap(g => g.items);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, allFiltered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
      if (e.key === "Enter") {
        const item = allFiltered[cursor];
        if (item) { onNavigate(item.key); onClose(); }
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, cursor, allFiltered, onClose, onNavigate]);

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[560px] bg-white rounded-lg shadow-2xl border border-[#DDE2EC] overflow-hidden z-10">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#DDE2EC]">
          <Icon.Search />
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setCursor(0); }}
            placeholder="Search patients, navigate, create..."
            className="flex-1 text-[14px] text-gray-900 placeholder:text-[#94A3B8] focus:outline-none" />
          <div className="flex items-center gap-1">
            <kbd className="bg-[#F1F5F9] border border-[#DDE2EC] rounded text-[10px] px-1.5 py-0.5 text-[#64748B] font-mono">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">
          {groups.map((group) => (
            <div key={group.group}>
              <div className="px-4 py-2 text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-wider bg-[#F8FAFC] border-b border-[#F1F5F9]">
                {group.group}
              </div>
              {group.items.map(item => {
                const idx = globalIdx++;
                const active = idx === cursor;
                return (
                  <button key={`${group.group}-${item.key}-${item.label}`}
                    onClick={() => { onNavigate(item.key); onClose(); }}
                    onMouseEnter={() => setCursor(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                      ${active ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"}`}>
                    <span className="text-base w-5">{item.icon}</span>
                    <span className={`text-[13px] ${active ? "text-[#1B4FD8] font-medium" : "text-gray-700"}`}>{item.label}</span>
                    <span className="ml-auto">
                      {active && <Icon.ChevronRight />}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-[#94A3B8]">
              No results for "{q}"
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-[#DDE2EC] flex items-center gap-4 text-[11px] text-[#94A3B8] bg-[#F8FAFC]">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
          <span className="ml-auto">Ctrl+K to open</span>
        </div>
      </div>
    </div>
  );
}
