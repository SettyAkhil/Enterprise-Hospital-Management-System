import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { Search, Filter, Download, ChevronDown, BookOpen } from "lucide-react";
import PageHeader from "../components/PageHeader";

const typeColors: Record<string, { color: string; bg: string }> = {
  Sale:       { color: "#1B4FD8", bg: "#E8EDF5" },
  Purchase:   { color: "#15803d", bg: "#DCFCE7" },
  Return:     { color: "#7c3aed", bg: "#faf5ff" },
  Transfer:   { color: "#0284c7", bg: "#E8EDF5" },
  Adjustment: { color: "#d97706", bg: "#FEF3C7" },
  Damage:     { color: "#dc2626", bg: "#FEE2E2" },
  Expiry:     { color: "#B91C1C", bg: "#FEE2E2" },
};

interface InventoryLedgerProps { onNavigate: (page: string) => void }

export default function InventoryLedger({ onNavigate }: InventoryLedgerProps) {
  const { stockTransactions, medicines, batches, bills } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const ledgerData: any[] = [];
  const handledBatches = new Set<string>();
  const handledBills = new Set<string>();
  
  stockTransactions.forEach(tx => {
    handledBatches.add(tx.batchId);
    if (tx.billId) handledBills.add(tx.billId);
    
    const med = medicines.find(m => m.id === tx.medicineId);
    let typeName: string = tx.transactionType;
    if (typeName === "PURCHASE_RECEIVED") typeName = "Purchase";
    if (typeName === "DISPENSED") typeName = "Sale";
    if (typeName === "RETURNED") typeName = "Return";
    
    const isIn = ["PURCHASE_RECEIVED", "RETURNED", "TRANSFER_IN", "ADJUSTMENT"].includes(tx.transactionType) && (tx.transactionType !== "ADJUSTMENT" || tx.quantity > 0);
    const isOut = ["DISPENSED", "EXPIRED", "DAMAGED", "TRANSFER_OUT"].includes(tx.transactionType) || (tx.transactionType === "ADJUSTMENT" && tx.quantity < 0);
    
    ledgerData.push({
      date: new Date(tx.date).toLocaleString(),
      ref: tx.billId || tx.reason?.split(":")[1]?.trim() || tx.id.substring(0, 8),
      medicine: med ? med.name : "Unknown",
      batch: tx.batchId,
      type: typeName,
      in: isIn ? Math.abs(tx.quantity) : 0,
      out: isOut ? Math.abs(tx.quantity) : 0,
      user: tx.userId
    });
  });

  // Synthesize legacy data for batches that have no transaction
  batches.forEach(b => {
    if (!handledBatches.has(b.id)) {
      const med = medicines.find(m => m.id === b.medicineId);
      ledgerData.push({
        date: new Date(b.createdAt || new Date()).toLocaleString(),
        ref: b.grnId || "SYS",
        medicine: med ? med.name : "Unknown",
        batch: b.batchNumber,
        type: "Purchase",
        in: b.quantity,
        out: 0,
        user: "SYS"
      });
    }
  });

  // Synthesize legacy data for bills that have no transaction
  bills.forEach(bill => {
    if (!handledBills.has(bill.id)) {
      bill.items.forEach(item => {
        ledgerData.push({
          date: new Date(bill.createdAt).toLocaleString(),
          ref: bill.id,
          medicine: item.medicineName,
          batch: item.batchNumber,
          type: "Sale",
          in: 0,
          out: item.quantity,
          user: bill.pharmacistId
        });
      });
    }
  });

  // Sort by date descending
  ledgerData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const types = ["All", "Sale", "Purchase", "Return", "Transfer", "Adjustment", "Expiry"];
  const filtered = ledgerData.filter(r => {
    const matchSearch = !search || r.medicine.toLowerCase().includes(search.toLowerCase()) || r.ref.includes(search);
    const matchType = typeFilter === "All" || r.type === typeFilter;
    
    const rDate = new Date(r.date);
    const matchFrom = !fromDate || rDate >= new Date(fromDate);
    const matchTo = !toDate || rDate <= new Date(toDate + "T23:59:59");
    
    return matchSearch && matchType && matchFrom && matchTo;
  });

  const handleExport = () => {
    if (filtered.length === 0) return alert("No data to export.");
    const headers = ["Date & Time", "Reference", "Medicine", "Batch", "Type", "IN", "OUT", "User"];
    const rows = [headers.join(",")];
    filtered.forEach(r => {
      rows.push(`"${r.date}","${r.ref}","${r.medicine}","${r.batch}","${r.type}",${r.in},${r.out},"${r.user}"`);
    });
    const blob = new Blob([rows.join("\\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_ledger_${Date.now()}.csv`;
    a.click();
  };

  const totalIn = ledgerData.filter(r => r.type === "Purchase").reduce((sum, r) => sum + r.in, 0);
  const totalOut = ledgerData.filter(r => r.type === "Sale").reduce((sum, r) => sum + r.out, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6F9]">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Stock" }, { label: "Inventory Ledger" }]}
        title="Inventory Ledger"
        description="Complete transaction history for all stock movements and batch reconciliations"
        actions={
          <button 
            onClick={handleExport} 
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-sm transition-colors"
           >
            <Download size={14} className="text-[#64748B]" /> Export CSV
          </button>
        }
        onNavigate={onNavigate}
        icon={BookOpen} iconBg="bg-teal-600"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Summary strip - Dashboard Metric Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Inflow (Units)", value: totalIn.toLocaleString("en-IN") + " units", color: "#16a34a", bg: "bg-emerald-50", border: "border-emerald-200" },
            { label: "Total Outflow (Units)", value: totalOut.toLocaleString("en-IN") + " units", color: "#dc2626", bg: "bg-red-50", border: "border-red-200" },
            { label: "Adjustments Logged", value: "0 entries", color: "#d97706", bg: "bg-amber-50", border: "border-amber-200" },
            { label: "Total Transactions", value: ledgerData.length.toLocaleString("en-IN") + " entries", color: "#1B4FD8", bg: "bg-blue-50", border: "border-blue-200" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">{s.label}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${s.bg} border ${s.border}`} />
              </div>
              <p className="text-[20px] font-bold mt-2 font-mono tracking-tight" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input 
                placeholder="Search medicine name, batch or reference..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E2E8F0] text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#1B4FD8] focus:outline-none transition-all placeholder:text-[#94A3B8]"
              />
            </div>
            <div className="flex items-center gap-2 bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase">Range:</span>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-transparent text-[12px] text-[#334155] focus:outline-none" />
              <span className="text-[#94A3B8] font-mono">→</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-transparent text-[12px] text-[#334155] focus:outline-none" />
            </div>
          </div>

          <div className="flex bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
            {types.map(t => (
              <button 
                key={t} 
                onClick={() => setTypeFilter(t)} 
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                  typeFilter === t 
                    ? "bg-white text-[#0F1624] shadow-sm" 
                    : "text-[#64748B] hover:text-[#0F1624]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table Container */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-[#FAFCFF] border-b border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#475569] uppercase tracking-wider">
              Ledger Transactions ({filtered.length})
            </span>
            <span className="text-[11px] text-[#94A3B8]">Audit Trail Verified</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-emerald-700 text-right">Inflow (+)</th>
                  <th className="px-4 py-3 text-red-700 text-right">Outflow (-)</th>
                  <th className="px-4 py-3 text-right">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[13px]">
                {filtered.map((r, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 text-[12px] text-[#64748B] whitespace-nowrap font-medium">{r.date}</td>
                    <td className="px-4 py-3 font-mono text-[12px] font-bold text-[#1B4FD8]">{r.ref}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F1624]">{r.medicine}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#64748B]">{r.batch}</td>
                    <td className="px-4 py-3">
                      <span 
                        className="text-[11px] font-bold px-2 py-0.5 rounded border" 
                        style={{ 
                          background: typeColors[r.type]?.bg || "#F1F5F9", 
                          color: typeColors[r.type]?.color || "#475569",
                          borderColor: (typeColors[r.type]?.color || "#CBD5E1") + "33"
                        }}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: r.in > 0 ? "#16a34a" : "#94A3B8" }}>
                      {r.in > 0 ? `+${r.in}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: r.out > 0 ? "#dc2626" : "#94A3B8" }}>
                      {r.out > 0 ? `-${r.out}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] text-[#64748B] font-mono">{r.user}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-[#94A3B8] text-[13px]">
                      No transactions found matching your search filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
