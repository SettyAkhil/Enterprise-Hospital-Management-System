import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { Search, Filter, Download, ChevronDown } from "lucide-react";
import PageHeader from "../components/PageHeader";

const typeColors: Record<string, { color: string; bg: string }> = {
  Sale:       { color: "#4f46e5", bg: "#eff6ff" },
  Purchase:   { color: "#15803d", bg: "#f0fdf4" },
  Return:     { color: "#7c3aed", bg: "#faf5ff" },
  Transfer:   { color: "#0284c7", bg: "#f0f9ff" },
  Adjustment: { color: "#d97706", bg: "#fffbeb" },
  Damage:     { color: "#dc2626", bg: "#fef2f2" },
  Expiry:     { color: "#9f1239", bg: "#fff1f2" },
};

interface InventoryLedgerProps { onNavigate: (page: string) => void }

export default function InventoryLedger({ onNavigate }: InventoryLedgerProps) {
  const { batches, bills, medicines } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  // Synthesize ledger data from batches (Purchases) and bills (Sales)
  const ledgerData: any[] = [];
  
  batches.forEach(b => {
    const med = medicines.find(m => m.id === b.medicineId);
    ledgerData.push({
      date: new Date(b.createdAt || new Date()).toLocaleString(),
      ref: b.grnId || "SYS",
      medicine: med ? med.name : "Unknown",
      batch: b.batchNumber,
      type: "Purchase",
      opening: 0,
      in: b.quantity,
      out: 0,
      balance: b.quantity,
      user: "SYS"
    });
  });

  bills.forEach(bill => {
    bill.items.forEach(item => {
      ledgerData.push({
        date: new Date(bill.billDate).toLocaleString(),
        ref: bill.id,
        medicine: item.medicineName,
        batch: item.batchNumber,
        type: "Sale",
        opening: 0,
        in: 0,
        out: item.quantity,
        balance: 0,
        user: bill.pharmacistId
      });
    });
  });

  // Sort by date descending
  ledgerData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const types = ["All", "Sale", "Purchase", "Return", "Transfer", "Adjustment", "Expiry"];
  const filtered = ledgerData.filter(r => {
    const matchSearch = !search || r.medicine.toLowerCase().includes(search.toLowerCase()) || r.ref.includes(search);
    const matchType = typeFilter === "All" || r.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalIn = ledgerData.filter(r => r.type === "Purchase").reduce((sum, r) => sum + r.in, 0);
  const totalOut = ledgerData.filter(r => r.type === "Sale").reduce((sum, r) => sum + r.out, 0);

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Stock" }, { label: "Inventory Ledger" }]}
        title="Inventory Ledger"
        description="Complete transaction history for all stock movements"
        actions={
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-none border border-[#e5e7eb] bg-white text-[13px] text-[#374151] hover:bg-[#f9fafb] transition-colors">
            <Download size={13} /> Export
          </button>
        }
        onNavigate={onNavigate}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total IN (All Time)", value: totalIn + " units", color: "#15803d" },
          { label: "Total OUT (All Time)", value: totalOut + " units", color: "#dc2626" },
          { label: "Adjustments", value: "0 entries", color: "#d97706" },
          { label: "Transactions Logged", value: ledgerData.length + " entries", color: "#4f46e5" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-none p-4 border border-[#e5e7eb]">
            <p className="text-[11px] text-[#6b7280] font-medium">{s.label}</p>
            <p className="text-[18px] font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input 
            placeholder="Search medicine or ref…" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-64 rounded-none border border-[#e5e7eb] text-[13px] focus:border-[#4f46e5] focus:outline-none transition-colors"
          />
        </div>
        <div className="flex bg-white rounded-none border border-[#e5e7eb] p-1">
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className="px-4 py-1.5 rounded-none text-[12px] font-medium transition-colors" style={{
              background: typeFilter === t ? "#f3f4f6" : "transparent",
              color: typeFilter === t ? "#111827" : "#6b7280"
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
        <table>
          <thead><tr>
            <th>Date & Time</th><th>Reference</th><th>Medicine</th><th>Batch</th><th>Type</th><th className="text-emerald-600">IN</th><th className="text-red-600">OUT</th><th>User</th>
          </tr></thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                <td className="text-[12px] text-[#6b7280] whitespace-nowrap">{r.date}</td>
                <td className="font-mono text-[12px] font-semibold" style={{ color: "#4f46e5" }}>{r.ref}</td>
                <td className="font-medium text-[13px] text-[#111827]">{r.medicine}</td>
                <td className="font-mono text-[11px] text-[#6b7280]">{r.batch}</td>
                <td>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-none" style={{ background: typeColors[r.type]?.bg, color: typeColors[r.type]?.color }}>
                    {r.type}
                  </span>
                </td>
                <td className="text-[13px] font-semibold" style={{ color: r.in > 0 ? "#15803d" : "#9ca3af" }}>{r.in > 0 ? "+" + r.in : "-"}</td>
                <td className="text-[13px] font-semibold" style={{ color: r.out > 0 ? "#dc2626" : "#9ca3af" }}>{r.out > 0 ? "-" + r.out : "-"}</td>
                <td className="text-[12px] text-[#6b7280]">{r.user}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-[#6b7280] text-[13px]">No transactions found matching your criteria.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
