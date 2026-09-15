import { useState } from "react";
import { Search, Download, Printer, RefreshCcw, Eye, X } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

const invoices: any[] = []

const invoiceItems: any[] = []

interface SalesReturnsProps { onNavigate: (page: string) => void }

export default function SalesReturns({ onNavigate }: SalesReturnsProps) {
  const [view, setView] = useState<"sales" | "returns">("sales");
  const [selectedInv, setSelectedInv] = useState<typeof invoices[0] | null>(null);
  const [search, setSearch] = useState("");

  const filtered = invoices.filter(inv =>
    !search || inv.id.includes(search) || inv.patient.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Sales" }, { label: "Sales & Returns" }]}
        title="Sales & Returns"
        description="Transaction history and return management"
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded border border-[#DDE2EC] bg-white text-[13px] text-[#334155] hover:bg-[#F5F7FA] transition-colors">
              <Download size={13} /> Export
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today's Revenue", value: "₹0", color: "#1B4FD8" },
          { label: "Transactions", value: "0", color: "#16a34a" },
          { label: "Refunds", value: "₹0", color: "#dc2626" },
          { label: "Avg. Bill Value", value: "₹0", color: "#7c3aed" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded p-4 border border-[#DDE2EC]">
            <p className="text-[11px] text-[#64748B] font-medium">{s.label}</p>
            <p className="text-[20px] font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab switch */}
      <div className="flex items-center gap-4">
        <div className="flex rounded border border-[#DDE2EC] overflow-hidden text-[13px]">
          {(["sales", "returns"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className="px-5 py-2 font-medium transition-colors" style={{ background: view === v ? "#0F1624" : "#fff", color: view === v ? "#fff" : "#64748B" }}>
              {v === "sales" ? "Sales History" : "Returns"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#DDE2EC] rounded px-3 py-2 ml-auto">
          <Search size={14} className="text-[#94A3B8]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice, patient…" className="text-[13px] outline-none text-[#0F1624] placeholder:text-[#94A3B8] w-44" />
        </div>
        <div className="flex items-center gap-2">
          <input type="date" defaultValue="2026-09-12" className="px-3 py-2 rounded border border-[#DDE2EC] text-[13px] bg-white focus:border-[#1B4FD8] focus:outline-none" />
        </div>
      </div>

      {view === "sales" ? (
        <div className="bg-white rounded border border-[#DDE2EC] overflow-hidden">
          <table>
            <thead><tr>
              <th>Invoice</th><th>Date & Time</th><th>Patient</th><th>Pharmacist</th><th>Items</th><th>Payment</th><th>Total (₹)</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td className="font-mono text-[12px] font-semibold" style={{ color: "#1B4FD8" }}>{inv.id}</td>
                  <td className="text-[12px] text-[#64748B] whitespace-nowrap">{inv.date}</td>
                  <td className="font-medium text-[13px] text-[#0F1624]">{inv.patient}</td>
                  <td className="text-[13px] text-[#334155]">{inv.pharmacist}</td>
                  <td className="text-[13px] text-center">{inv.items}</td>
                  <td>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: "#F0F2F5", color: "#475569" }}>
                      {inv.payment}
                    </span>
                  </td>
                  <td className="text-[13px] font-semibold text-[#0F1624]">₹{inv.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td><StatusBadge status={inv.status} size="sm" /></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedInv(inv)} className="p-1.5 rounded hover:bg-[#F0F2F5] text-[#64748B] transition-colors"><Eye size={13} /></button>
                      <button className="p-1.5 rounded hover:bg-[#F0F2F5] text-[#64748B] transition-colors"><Printer size={13} /></button>
                      {inv.status === "completed" && (
                        <button onClick={() => setView("returns")} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded" style={{ background: "#faf5ff", color: "#7c3aed" }}>
                          <RefreshCcw size={10} /> Return
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded border border-[#DDE2EC] p-6 space-y-4">
          <h3 className="font-semibold text-[15px] text-[#0F1624]">Process Return</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">Invoice Number *</label>
              <div className="flex gap-2">
                <input placeholder="INV-2026-XXXX" className="flex-1 px-3 py-2 rounded border border-[#DDE2EC] text-[13px] focus:border-[#1B4FD8] focus:outline-none" />
                <button className="px-4 py-2 rounded text-white text-[13px] font-medium" style={{ background: "#1B4FD8" }}>Fetch</button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">Return Reason *</label>
              <select className="w-full px-3 py-2 rounded border border-[#DDE2EC] text-[13px] focus:border-[#1B4FD8] focus:outline-none">
                <option>Patient not using</option>
                <option>Wrong medicine dispensed</option>
                <option>Adverse reaction</option>
                <option>Doctor changed prescription</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="p-4 rounded border border-dashed border-[#DDE2EC] text-center">
            <p className="text-[13px] text-[#94A3B8]">Enter an invoice number above and click Fetch to load medicines for return</p>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.6)" }} onClick={() => setSelectedInv(null)}>
          <div className="bg-white rounded shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F2F5]">
              <div>
                <p className="font-bold text-[16px] text-[#0F1624]">{selectedInv.id}</p>
                <p className="text-[12px] text-[#64748B]">{selectedInv.date} · {selectedInv.patient}</p>
              </div>
              <button onClick={() => setSelectedInv(null)} className="p-2 rounded hover:bg-[#F0F2F5] text-[#94A3B8]"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4 border-b border-[#F0F2F5] grid grid-cols-2 gap-3 text-[13px]">
                <div><span className="text-[#94A3B8]">Pharmacist</span><p className="font-medium text-[#0F1624]">{selectedInv.pharmacist}</p></div>
                <div><span className="text-[#94A3B8]">Payment</span><p className="font-medium text-[#0F1624]">{selectedInv.payment}</p></div>
                <div><span className="text-[#94A3B8]">Items</span><p className="font-medium text-[#0F1624]">{selectedInv.items}</p></div>
                <div><span className="text-[#94A3B8]">Status</span><StatusBadge status={selectedInv.status} size="sm" /></div>
              </div>
              <table>
                <thead><tr><th>Medicine</th><th>Qty</th><th>MRP</th><th>Disc%</th><th>Total</th></tr></thead>
                <tbody>
                  {invoiceItems.slice(0, selectedInv.items).map((item, i) => (
                    <tr key={i}>
                      <td className="text-[13px] font-medium text-[#0F1624]">{item.medicine}</td>
                      <td className="text-[13px]">{item.qty}</td>
                      <td className="text-[13px]">₹{item.mrp}</td>
                      <td className="text-[13px] text-[#d97706]">{item.discount}%</td>
                      <td className="text-[13px] font-semibold">₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-4 border-t border-[#F0F2F5] flex justify-end">
                <div className="text-right">
                  <p className="text-[12px] text-[#64748B]">Grand Total</p>
                  <p className="text-[20px] font-bold text-[#0F1624]">₹{selectedInv.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-[#DDE2EC] flex gap-3">
              <button className="flex items-center gap-1.5 flex-1 py-2.5 rounded border border-[#DDE2EC] text-[13px] font-medium text-[#334155] hover:bg-[#F5F7FA] transition-colors justify-center"><Printer size={13} /> Print</button>
              <button className="flex items-center gap-1.5 flex-1 py-2.5 rounded border border-[#DDE2EC] text-[13px] font-medium text-[#334155] hover:bg-[#F5F7FA] transition-colors justify-center"><Download size={13} /> PDF</button>
              {selectedInv.status === "completed" && <button className="flex-1 py-2.5 rounded text-white font-semibold text-[13px]" style={{ background: "#7c3aed" }}>Process Return</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
