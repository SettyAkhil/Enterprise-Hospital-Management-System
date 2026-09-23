import { usePharmacyData } from "../data/usePharmacyData";
import { PharmacyDatabase } from "../../../services/pharmacyDb";
import { useState } from "react";
import { Plus, Eye, Send, Check, X, Trash2, IndianRupee } from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { Btn } from "../../shared";

interface PurchaseOrdersProps { onNavigate: (page: string) => void }

export default function PurchaseOrders({ onNavigate }: PurchaseOrdersProps) {
  const { purchaseOrders, suppliers, medicines, refresh } = usePharmacyData();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("All");

  // Form State
  const [supplierId, setSupplierId] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDate, setExpectedDate] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [medicineSearch, setMedicineSearch] = useState("");

  const filtered = filter === "All" ? purchaseOrders : purchaseOrders.filter(po => po.status === filter);

  const addItem = (med: any) => {
    setItems(prev => [...prev, { medicineId: med.id, name: med.name, qty: 100, price: med.price, gst: med.gst }]);
    setMedicineSearch("");
  };

  const handleCreate = (status: "Draft" | "Submitted") => {
    if (!supplierId || items.length === 0) return alert("Please select a supplier and add items.");
    
    const newPo = {
      id: "PO" + Date.now(),
      supplierId,
      poDate,
      expectedDeliveryDate: expectedDate,
      status: status,
      items: items.map(i => {
        const itemTotal = i.qty * i.price * (1 + i.gst/100);
        return { medicineId: i.medicineId, quantity: i.qty, purchasePrice: i.price, taxPercentage: i.gst, discount: 0, totalAmount: itemTotal };
      }),
      totalOrderValue: items.reduce((sum, i) => sum + (i.qty * i.price * (1 + i.gst/100)), 0),
      createdAt: new Date().toISOString(),
      createdBy: "SYS"
    };

    PharmacyDatabase.addPurchaseOrder(newPo as any);
    refresh();
    setShowCreate(false);
  };

  const handleApprove = (id: string) => {
    PharmacyDatabase.updatePurchaseOrder(id, { status: "Approved" } as any);
    refresh();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6F9]">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Procurement" }, { label: "Purchase Orders" }]}
        title="Purchase Orders & Procurement"
        badge="PO WORKLIST"
        description="Vendor purchase orders, fulfillment tracking, and invoice matching"
        actions={
          <Btn variant="primary" size="sm" onClick={() => { setSupplierId(""); setItems([]); setShowCreate(true); }} className="shadow-xs">
            <Plus size={14} /> Create Purchase Order
          </Btn>
        }
        onNavigate={onNavigate}
        icon={IndianRupee} iconBg="bg-violet-600"
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-[1600px] w-full mx-auto">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border border-[#DDE2EC] overflow-hidden bg-white text-[12px] shadow-xs">
            {["All", "Draft", "Submitted", "Approved", "Ordered", "Received"].map(f => {
              const count = f === "All" ? purchaseOrders.length : purchaseOrders.filter(po => po.status === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 font-semibold transition-colors border-r last:border-r-0 border-[#DDE2EC] cursor-pointer ${
                    filter === f ? "bg-[#1E293B] text-white" : "text-[#64748B] hover:bg-[#F1F5F9]"
                  }`}
                >
                  {f} <span className="opacity-75 font-mono ml-1 text-[11px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <table>
            <thead><tr>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">PO Number</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Supplier</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Order Date</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Expected Delivery</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-center">Items</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-right">Total Value (₹)</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Status</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-center">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(po => (
                <tr key={po.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                      {po.id}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[13px] text-gray-900">{po.supplier}</td>
                  <td className="px-4 py-3 text-[12px] text-[#64748B] font-mono">{po.poDate || po.date}</td>
                  <td className="px-4 py-3 text-[12px] text-[#64748B] font-mono">{po.expectedDeliveryDate || po.expected || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-[12px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {po.itemsCount} items
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[13px] text-gray-900">
                    ₹{(po.total || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => window.dispatchEvent(new CustomEvent("hospai_pharmacy_toast", { detail: { message: "Opened PO Details!" } }))} className="p-1 rounded hover:bg-[#F1F5F9] text-[#64748B] transition-colors cursor-pointer" title="View"><Eye size={14} /></button>
                      {po.status === "Draft" && (
                        <button onClick={() => { handleApprove(po.id); window.dispatchEvent(new CustomEvent("hospai_pharmacy_toast", { detail: { message: "PO Sent to Supplier!" } })); }} className="p-1 rounded hover:bg-[#EFF6FF] text-[#2563EB] transition-colors cursor-pointer" title="Send to Supplier"><Send size={14} /></button>
                      )}
                      {po.status === "Submitted" && (
                        <button onClick={() => handleApprove(po.id)} className="p-1 rounded hover:bg-[#DCFCE7] text-[#16A34A] transition-colors cursor-pointer" title="Approve"><Check size={14} /></button>
                      )}
                      {po.status === "Approved" && (
                        <button onClick={() => onNavigate("grn")} className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] transition-colors cursor-pointer">
                          Receive (GRN)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#94A3B8] text-[13px]">
                    No purchase orders found for filter "{filter}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-[#E2E8F0]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#FAFCFF]">
              <p className="font-bold text-[15px] text-gray-900">Create Purchase Order</p>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#94A3B8] cursor-pointer"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Supplier *</label>
                  <select value={supplierId} onChange={e=>setSupplierId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#DDE2EC] text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none">
                    <option value="">Select supplier…</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name || s.supplierName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Order Date</label>
                  <input type="date" value={poDate} onChange={e=>setPoDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#DDE2EC] text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Expected Delivery</label>
                  <input type="date" value={expectedDate} onChange={e=>setExpectedDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#DDE2EC] text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Add Medicines</p>
                </div>
                
                <div className="mb-3 relative">
                  <input value={medicineSearch} onChange={e=>setMedicineSearch(e.target.value)} placeholder="Type medicine name to add to PO…" className="w-full px-3 py-2 rounded-lg border border-[#DDE2EC] text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" />
                  {medicineSearch && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-[#DDE2EC] shadow-xl rounded-lg max-h-48 overflow-y-auto z-10 mt-1">
                      {medicines.filter(m => m.name.toLowerCase().includes(medicineSearch.toLowerCase())).map(m => (
                        <div key={m.id} onClick={() => addItem(m)} className="px-3 py-2 hover:bg-[#F8FAFC] cursor-pointer text-[13px] flex justify-between border-b border-[#F1F5F9] last:border-0">
                          <span className="font-semibold text-gray-900">{m.name}</span>
                          <span className="text-[#94A3B8] font-mono">Stock: {m.stock}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
                  <table>
                    <thead><tr>
                      <th className="px-3 py-2 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Medicine</th>
                      <th className="px-3 py-2 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Quantity</th>
                      <th className="px-3 py-2 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Price (₹)</th>
                      <th className="px-3 py-2 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">GST%</th>
                      <th className="px-3 py-2 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-right">Total (₹)</th>
                      <th className="px-3 py-2 bg-[#FAFCFF] border-b border-[#E2E8F0]"></th>
                    </tr></thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className="border-b border-[#F1F5F9] last:border-0">
                          <td className="px-3 py-2 text-[12.5px] font-semibold text-gray-900">{item.name}</td>
                          <td className="px-3 py-2"><input type="number" value={item.qty} onChange={e=>{const newItems=[...items]; newItems[idx].qty=Number(e.target.value); setItems(newItems)}} className="w-20 px-2 py-1 text-[12.5px] border border-[#DDE2EC] rounded font-mono" /></td>
                          <td className="px-3 py-2"><input type="number" value={item.price} onChange={e=>{const newItems=[...items]; newItems[idx].price=Number(e.target.value); setItems(newItems)}} className="w-24 px-2 py-1 text-[12.5px] border border-[#DDE2EC] rounded font-mono" /></td>
                          <td className="px-3 py-2"><input type="number" value={item.gst} onChange={e=>{const newItems=[...items]; newItems[idx].gst=Number(e.target.value); setItems(newItems)}} className="w-16 px-2 py-1 text-[12.5px] border border-[#DDE2EC] rounded font-mono" /></td>
                          <td className="px-3 py-2 text-[12.5px] font-bold font-mono text-gray-900 text-right">₹{(item.qty * item.price * (1 + item.gst/100)).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right"><button onClick={() => setItems(items.filter((_,i)=>i!==idx))} className="p-1 rounded hover:bg-[#FEE2E2] text-[#DC2626] cursor-pointer"><Trash2 size={13} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {items.length > 0 && (
                     <div className="p-3 bg-[#FAFCFF] border-t border-[#E2E8F0] text-right font-bold text-[13.5px] font-mono text-gray-900">
                        Total Order Value: ₹{items.reduce((sum, i) => sum + (i.qty * i.price * (1 + i.gst/100)), 0).toLocaleString("en-IN")}
                     </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-[#E2E8F0] bg-[#FAFCFF] flex gap-2.5">
              <Btn variant="primary" size="md" onClick={() => handleCreate("Submitted")} className="shadow-xs">Submit for Approval</Btn>
              <Btn variant="outline" size="md" onClick={() => handleCreate("Draft")}>Save Draft</Btn>
              <Btn variant="ghost" size="md" onClick={() => setShowCreate(false)} className="ml-auto">Cancel</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
