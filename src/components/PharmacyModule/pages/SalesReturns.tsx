import { useState } from "react";
import { Search, Download, Printer, RefreshCcw, Eye, X } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import InvoicePrintModal from "../components/InvoicePrintModal";
import { usePharmacyData } from "../data/usePharmacyData";

interface SalesReturnsProps { onNavigate: (page: string) => void }

export default function SalesReturns({ onNavigate }: SalesReturnsProps) {
  const { bills } = usePharmacyData();
  const [view, setView] = useState<"sales" | "returns">("sales");
  const [selectedInv, setSelectedInv] = useState<any | null>(null);
  const [printInv, setPrintInv] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  const filtered = bills.filter(inv =>
    !search || inv.billNumber.includes(search) || inv.patientName.toLowerCase().includes(search.toLowerCase())
  );
  
  const todayRevenue = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const avgBill = bills.length > 0 ? (todayRevenue / bills.length) : 0;

  return (
    <div className="p-6 space-y-5 relative">
      {printInv && <InvoicePrintModal bill={printInv} onClose={() => setPrintInv(null)} />}
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
          { label: "Total Revenue", value: "₹" + todayRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 }), color: "#1B4FD8" },
          { label: "Transactions", value: bills.length.toString(), color: "#16a34a" },
          { label: "Refunds", value: "₹0", color: "#dc2626" },
          { label: "Avg. Bill Value", value: "₹" + avgBill.toLocaleString("en-IN", { maximumFractionDigits: 0 }), color: "#7c3aed" },
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
                  <td className="font-mono text-[12px] font-semibold" style={{ color: "#1B4FD8" }}>{inv.billNumber}</td>
                  <td className="text-[12px] text-[#64748B] whitespace-nowrap">{new Date((inv as any).date || (inv as any).createdAt || (inv as any).billDate || Date.now()).toLocaleString()}</td>
                  <td className="font-medium text-[13px] text-[#0F1624]">{inv.patientName}</td>
                  <td className="text-[13px] text-[#334155]">{inv.doctorName}</td>
                  <td className="text-[13px] text-center">{inv.items ? inv.items.length : 0}</td>
                  <td>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: "#F0F2F5", color: "#475569" }}>
                      {inv.paymentMode || "Cash"}
                    </span>
                  </td>
                  <td className="text-[13px] font-semibold text-[#0F1624]">₹{(inv.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td><StatusBadge status="completed" size="sm" /></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedInv(inv)} className="p-1.5 rounded hover:bg-[#F0F2F5] text-[#64748B] transition-colors"><Eye size={13} /></button>
                      <button onClick={() => setPrintInv(inv)} className="p-1.5 rounded hover:bg-[#F0F2F5] text-[#64748B] transition-colors"><Printer size={13} /></button>
                      <button onClick={() => alert("Refunds are out of scope for this demo")} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded" style={{ background: "#faf5ff", color: "#7c3aed" }}>
                        <RefreshCcw size={10} /> Return
                      </button>
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
                <p className="font-bold text-[16px] text-[#0F1624]">{selectedInv.billNumber}</p>
                <p className="text-[12px] text-[#64748B]">{new Date(selectedInv.createdAt || selectedInv.date).toLocaleString()} · {selectedInv.patientName}</p>
              </div>
              <button onClick={() => setSelectedInv(null)} className="p-2 rounded hover:bg-[#F0F2F5] text-[#94A3B8]"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4 border-b border-[#F0F2F5] grid grid-cols-2 gap-3 text-[13px]">
                <div><span className="text-[#94A3B8]">Pharmacist</span><p className="font-medium text-[#0F1624]">{selectedInv.createdBy || "Pharmacist"}</p></div>
                <div><span className="text-[#94A3B8]">Payment</span><p className="font-medium text-[#0F1624]">{selectedInv.paymentMode || "Cash"}</p></div>
                <div><span className="text-[#94A3B8]">Items</span><p className="font-medium text-[#0F1624]">{selectedInv.items?.length || 0}</p></div>
                <div><span className="text-[#94A3B8]">Status</span><StatusBadge status="completed" size="sm" /></div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase">Medicine</th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase">Qty</th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase">MRP</th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase">Disc%</th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {(selectedInv.items || []).map((item: any, i: number) => {
                    const qty = item.qty || item.quantity || 0;
                    const mrp = item.mrp || item.unitPrice || 0;
                    const discount = item.discount || 0;
                    const total = (qty * mrp) * (1 - discount/100);
                    return (
                    <tr key={i}>
                      <td className="px-5 py-3 text-[13px] font-medium text-[#0F1624]">{item.medicine || item.medicineName}</td>
                      <td className="px-5 py-3 text-[13px]">{qty}</td>
                      <td className="px-5 py-3 text-[13px]">₹{mrp.toFixed(2)}</td>
                      <td className="px-5 py-3 text-[13px] text-[#d97706]">{discount}%</td>
                      <td className="px-5 py-3 text-[13px] font-semibold text-right">₹{total.toFixed(2)}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-5 py-4 border-t border-[#F0F2F5] flex justify-end">
                <div className="text-right">
                  <p className="text-[12px] text-[#64748B]">Grand Total</p>
                  <p className="text-[20px] font-bold text-[#0F1624]">₹{(selectedInv.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-[#DDE2EC] flex gap-3">
              <button onClick={() => { setPrintInv(selectedInv); setSelectedInv(null); }} className="flex items-center gap-1.5 flex-1 py-2.5 rounded border border-[#DDE2EC] text-[13px] font-medium text-[#334155] hover:bg-[#F5F7FA] transition-colors justify-center"><Printer size={13} /> Print / Download</button>
              {selectedInv.status === "completed" && <button onClick={() => alert("Refunds are out of scope for this demo")} className="flex-1 py-2.5 rounded text-white font-semibold text-[13px]" style={{ background: "#7c3aed" }}>Process Return</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
