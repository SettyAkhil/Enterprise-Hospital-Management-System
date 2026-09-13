import { useState, useEffect, useRef } from "react";
import { Search, Pill, ClipboardList, FileText, Truck, ShoppingBag, Package, ArrowLeftRight, X } from "lucide-react";

interface GlobalSearchProps {
  onClose: () => void;
  onNavigate: (page: string) => void;
}

const searchResults = [
  { group: "Medicines", icon: Pill, items: [
    { label: "Paracetamol 500mg", sub: "Cipla Ltd · Stock: 840", page: "medicines" },
    { label: "Azithromycin 500mg", sub: "Cipla Ltd · Stock: 156", page: "medicines" },
    { label: "Metformin 500mg", sub: "Dr. Reddy's · Stock: 18 ⚠ Low", page: "medicines" },
  ]},
  { group: "Prescriptions", icon: ClipboardList, items: [
    { label: "RX-2026-1042", sub: "Lakshmi Devi · Dr. Rajan Pillai · Processing", page: "prescriptions" },
    { label: "RX-2026-1046", sub: "Kavya Nambiar · Dr. Priya Menon · Pending", page: "prescriptions" },
  ]},
  { group: "Invoices", icon: FileText, items: [
    { label: "INV-2026-8845", sub: "Arjun Sharma · ₹1,240 · 12 Sep 2026", page: "sales-returns" },
    { label: "INV-2026-8821", sub: "Suresh Babu · ₹780 · 12 Sep 2026 · Cancelled", page: "sales-returns" },
  ]},
  { group: "Suppliers", icon: Truck, items: [
    { label: "Medline Distributors", sub: "GSTIN: 29AABCM1234A1Z5", page: "suppliers" },
  ]},
  { group: "Purchase Orders", icon: ShoppingBag, items: [
    { label: "PO-2026-0892", sub: "Medline Distributors · ₹1,24,500 · Ordered", page: "purchase-orders" },
  ]},
];

export default function GlobalSearch({ onClose, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered = query.trim().length > 0
    ? searchResults.map(g => ({
        ...g,
        items: g.items.filter(i =>
          i.label.toLowerCase().includes(query.toLowerCase()) ||
          i.sub.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter(g => g.items.length > 0)
    : searchResults;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl mx-4 bg-white rounded-none shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#e5e7eb]">
          <Search size={18} className="text-[#6b7280] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search medicines, patients, prescriptions, invoices…"
            className="flex-1 text-[15px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
          />
          <button onClick={onClose} className="p-1 rounded hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-[#111827] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.map(group => (
            <div key={group.group} className="mb-1">
              <div className="flex items-center gap-2 px-5 py-2">
                <group.icon size={13} className="text-[#9ca3af]" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">{group.group}</p>
              </div>
              {group.items.map(item => (
                <button
                  key={item.label}
                  onClick={() => { onNavigate(item.page); onClose(); }}
                  className="w-full flex items-start px-5 py-2.5 hover:bg-[#f3f4f6] text-left transition-colors gap-4"
                >
                  <div>
                    <p className="text-[14px] font-medium text-[#111827]">{item.label}</p>
                    <p className="text-[12px] text-[#6b7280] mt-0.5">{item.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p className="text-[14px] text-[#9ca3af]">No results for "<span className="text-[#111827] font-medium">{query}</span>"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#f3f4f6] flex items-center gap-4 text-[11px] text-[#9ca3af]">
          <span><kbd className="px-1.5 py-0.5 rounded border border-[#e5e7eb] bg-[#f9fafb] text-[10px]">↵</kbd> to select</span>
          <span><kbd className="px-1.5 py-0.5 rounded border border-[#e5e7eb] bg-[#f9fafb] text-[10px]">↑↓</kbd> navigate</span>
          <span><kbd className="px-1.5 py-0.5 rounded border border-[#e5e7eb] bg-[#f9fafb] text-[10px]">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
