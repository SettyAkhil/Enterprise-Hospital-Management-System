import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { Plus, ArrowRight, Check, X, Truck, Package, ArrowRightLeft } from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

interface StockTransfersProps { onNavigate: (page: string) => void }

const workflowSteps = ["Draft", "Requested", "Approved", "In Transit", "Received"];

export default function StockTransfers({ onNavigate }: StockTransfersProps) {
  const {  stockTransfers  } = usePharmacyData();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6F9]">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Stock" }, { label: "Stock Transfers" }]}
        title="Stock Transfers"
        description="Inter-branch inventory movement and chain logistics management"
        actions={
          <button 
            onClick={() => setShowCreate(true)} 
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-[13px] font-semibold shadow-sm hover:bg-blue-700 transition-colors" 
            style={{ background: "#1B4FD8" }}
          >
            <Plus size={14} /> Create Transfer
          </button>
        }
        onNavigate={onNavigate}
        icon={ArrowRightLeft} iconBg="bg-fuchsia-600"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Workflow steps */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-4">Transfer Lifecycle Workflow</p>
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {workflowSteps.map((step, i) => (
              <div key={step} className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold font-mono border border-blue-200/60" style={{ background: "#E8EDF5", color: "#1B4FD8" }}>
                    {i + 1}
                  </div>
                  <span className="text-[13px] font-semibold text-[#334155]">{step}</span>
                </div>
                {i < workflowSteps.length - 1 && <ArrowRight size={14} className="text-[#94A3B8]" />}
              </div>
            ))}
          </div>
        </div>

        {/* Transfers table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-[#FAFCFF] border-b border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#475569] uppercase tracking-wider">
              Branch Transfer Records ({stockTransfers.length})
            </span>
            <span className="text-[11px] text-[#94A3B8]">Inter-facility Tracked</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="px-4 py-3">Transfer ID</th>
                  <th className="px-4 py-3">From Branch</th>
                  <th className="px-4 py-3">To Branch</th>
                  <th className="px-4 py-3 text-center">Medicines</th>
                  <th className="px-4 py-3">Requested By</th>
                  <th className="px-4 py-3">Approved By</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[13px]">
                {stockTransfers.map(t => (
                  <tr key={t.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold text-[#1B4FD8]">{t.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 border border-blue-200/60" style={{ background: "#E8EDF5" }}>
                          <Package size={12} style={{ color: "#1B4FD8" }} />
                        </div>
                        <span className="font-semibold text-[#0F1624]">{t.from}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 border border-emerald-200/60" style={{ background: "#DCFCE7" }}>
                          <Package size={12} style={{ color: "#15803d" }} />
                        </div>
                        <span className="font-semibold text-[#0F1624]">{t.to}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold font-mono text-[#0F1624]">{t.medicines}</td>
                    <td className="px-4 py-3 text-[#334155]">{t.requestedBy}</td>
                    <td className="px-4 py-3 text-[#64748B]">{t.approvedBy ?? <span className="text-[#94A3B8] italic">Pending</span>}</td>
                    <td className="px-4 py-3 text-[12px] text-[#64748B] whitespace-nowrap">{t.date}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={t.status} size="sm" /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.status === "requested" && (
                          <button 
                            onClick={() => window.dispatchEvent(new CustomEvent("hospai_pharmacy_toast", { detail: { message: "Transfer Approved!" } }))} 
                            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <Check size={11} /> Approve
                          </button>
                        )}
                        {t.status === "in_transit" && (
                          <button 
                            onClick={() => window.dispatchEvent(new CustomEvent("hospai_pharmacy_toast", { detail: { message: "Transfer Received!" } }))} 
                            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <Truck size={11} /> Receive
                          </button>
                        )}
                        {t.status === "received" && (
                          <span className="text-[11px] font-medium text-[#94A3B8]">Completed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Transfer Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.6)" }}>
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F2F5] bg-[#FAFCFF]">
              <p className="font-bold text-[16px] text-[#0F1624]">Create Stock Transfer</p>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-[#F0F2F5] text-[#94A3B8] transition-colors"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {["From Pharmacy", "To Pharmacy"].map(l => (
                  <div key={l}>
                    <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">{l} *</label>
                    <select className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-[13px] focus:border-[#1B4FD8] focus:outline-none transition-all">
                      <option>Main Branch</option>
                      <option>Branch 2</option>
                      <option>Branch 3</option>
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Transfer Date</label>
                  <input type="date" defaultValue="2026-09-12" className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-[13px] focus:border-[#1B4FD8] focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Reason</label>
                  <select className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-[13px] focus:border-[#1B4FD8] focus:outline-none transition-all">
                    <option>Stock rebalancing</option>
                    <option>Emergency supply</option>
                    <option>Branch request</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Medicines to Transfer</p>
                  <button onClick={() => window.dispatchEvent(new CustomEvent("hospai_pharmacy_toast", { detail: { message: "Medicine line added!" } }))} className="flex items-center gap-1 text-[12px] font-bold" style={{ color: "#1B4FD8" }}><Plus size={13} /> Add Medicine</button>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Medicine</th>
                        <th className="px-4 py-2.5">Batch</th>
                        <th className="px-4 py-2.5 text-center">Available</th>
                        <th className="px-4 py-2.5 text-right">Transfer Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] text-[13px]">
                      {[1,2].map(i => (
                        <tr key={i} className="hover:bg-[#F8FAFC]">
                          <td className="px-4 py-2.5"><input placeholder="Search medicine..." className="w-full text-[13px] outline-none text-[#0F1624] placeholder:text-[#94A3B8] bg-transparent" /></td>
                          <td className="px-4 py-2.5"><input placeholder="Batch No" className="w-24 text-[12px] outline-none font-mono text-[#64748B] bg-transparent" /></td>
                          <td className="px-4 py-2.5 text-center font-mono text-[#64748B]">—</td>
                          <td className="px-4 py-2.5 text-right"><input type="number" defaultValue={50} className="w-20 px-2 py-1 rounded border border-[#E2E8F0] text-[13px] font-mono text-right focus:border-[#1B4FD8] focus:outline-none" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-[#E2E8F0] flex gap-3 bg-[#F8FAFC]">
              <button onClick={() => { setShowCreate(false); window.dispatchEvent(new CustomEvent("hospai_pharmacy_toast", { detail: { message: "Stock Transfer Requested successfully!" } })); }} className="flex-1 py-2.5 rounded-lg text-white font-semibold text-[13px] shadow-sm hover:bg-blue-700 transition-colors" style={{ background: "#1B4FD8" }}>Submit Request</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
