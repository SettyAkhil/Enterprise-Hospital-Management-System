import { usePharmacyData } from "../data/usePharmacyData";
import { PharmacyDatabase } from "../../../services/pharmacyDb";
import { useState } from "react";
import { Plus, Download, Eye, Send, Check, X, ChevronDown, Trash2 } from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

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

  const filtered = filter === "All" ? purchaseOrders : purchaseOrders.filter(po => po.status === filter.toLowerCase().replace(" ", "_"));

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
      items: items.map(i => ({ medicineId: i.medicineId, quantity: i.qty, purchasePrice: i.price, taxPercentage: i.gst })),
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
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Purchasing" }, { label: "Purchase Orders" }]}
        title="Purchase Orders"
        description="Manage medicine procurement from suppliers"
        actions={
          <div className="flex gap-2">
            <button onClick={() => { setSupplierId(""); setItems([]); setShowCreate(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-none text-white text-[13px] font-medium" style={{ background: "#4f46e5" }}>
              <Plus size={14} /> Create PO
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {["All", "Draft", "Submitted", "Approved", "Ordered", "Received"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-none text-[12px] font-medium transition-colors"
            style={{ background: filter === f ? "#111827" : "#fff", color: filter === f ? "#fff" : "#6b7280", border: "1px solid #e5e7eb" }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
        <table>
          <thead><tr>
            <th>PO Number</th><th>Supplier</th><th>Order Date</th><th>Expected</th><th>Items</th><th>Total (₹)</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(po => (
              <tr key={po.id}>
                <td className="font-mono text-[12px] font-semibold" style={{ color: "#4f46e5" }}>{po.id}</td>
                <td className="text-[13px] text-[#374151]">{po.supplier}</td>
                <td className="text-[12px] text-[#6b7280]">{po.poDate || po.date}</td>
                <td className="text-[12px] text-[#6b7280]">{po.expectedDeliveryDate || po.expected}</td>
                <td className="text-[13px] font-semibold text-center">{po.items}</td>
                <td className="text-[13px] font-semibold text-[#111827]">₹{(po.total || 0).toLocaleString("en-IN")}</td>
                <td><StatusBadge status={po.status} size="sm" /></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#6b7280] transition-colors" title="View"><Eye size={13} /></button>
                    {po.status === "Draft" && <button className="p-1.5 rounded hover:bg-[#eff6ff] text-[#4f46e5] transition-colors" title="Send"><Send size={13} /></button>}
                    {po.status === "Submitted" && <button onClick={() => handleApprove(po.id)} className="p-1.5 rounded hover:bg-[#f0fdf4] text-[#15803d] transition-colors" title="Approve"><Check size={13} /></button>}
                    {po.status === "Approved" && <button onClick={() => onNavigate("grn")} className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded" style={{ background: "#eff6ff", color: "#4f46e5" }}>Receive</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create PO Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.6)" }}>
          <div className="bg-white rounded-none shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
              <p className="font-bold text-[16px] text-[#111827]">Create Purchase Order</p>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-none hover:bg-[#f3f4f6] text-[#9ca3af]"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Supplier *</label>
                  <select value={supplierId} onChange={e=>setSupplierId(e.target.value)} className="w-full px-3 py-2 rounded-none border border-[#e5e7eb] text-[13px] focus:border-[#4f46e5] focus:outline-none transition-colors">
                    <option value="">Select supplier…</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name || s.supplierName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Order Date</label>
                  <input type="date" value={poDate} onChange={e=>setPoDate(e.target.value)} className="w-full px-3 py-2 rounded-none border border-[#e5e7eb] text-[13px]" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Expected Delivery</label>
                  <input type="date" value={expectedDate} onChange={e=>setExpectedDate(e.target.value)} className="w-full px-3 py-2 rounded-none border border-[#e5e7eb] text-[13px]" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide">Medicines</p>
                </div>
                
                <div className="mb-4 relative">
                  <input value={medicineSearch} onChange={e=>setMedicineSearch(e.target.value)} placeholder="Search medicine to add…" className="w-full px-3 py-2 border border-[#e5e7eb] text-[13px]" />
                  {medicineSearch && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-[#e5e7eb] shadow-xl max-h-48 overflow-y-auto z-10">
                      {medicines.filter(m => m.name.toLowerCase().includes(medicineSearch.toLowerCase())).map(m => (
                        <div key={m.id} onClick={() => addItem(m)} className="px-3 py-2 hover:bg-[#f9fafb] cursor-pointer text-[13px] flex justify-between">
                          <span>{m.name}</span>
                          <span className="text-[#9ca3af]">Stock: {m.stock}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-none border border-[#e5e7eb] overflow-hidden">
                  <table>
                    <thead><tr>
                      <th>Medicine</th><th>Quantity</th><th>Purchase Price (₹)</th><th>GST%</th><th>Total (₹)</th><th></th>
                    </tr></thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="text-[13px] font-semibold">{item.name}</td>
                          <td><input type="number" value={item.qty} onChange={e=>{const newItems=[...items]; newItems[idx].qty=Number(e.target.value); setItems(newItems)}} className="w-20 px-2 py-1 text-[13px] border border-[#e5e7eb]" /></td>
                          <td><input type="number" value={item.price} onChange={e=>{const newItems=[...items]; newItems[idx].price=Number(e.target.value); setItems(newItems)}} className="w-24 px-2 py-1 text-[13px] border border-[#e5e7eb]" /></td>
                          <td><input type="number" value={item.gst} onChange={e=>{const newItems=[...items]; newItems[idx].gst=Number(e.target.value); setItems(newItems)}} className="w-16 px-2 py-1 text-[13px] border border-[#e5e7eb]" /></td>
                          <td className="text-[13px] font-semibold text-[#111827]">₹{(item.qty * item.price * (1 + item.gst/100)).toFixed(2)}</td>
                          <td><button onClick={() => setItems(items.filter((_,i)=>i!==idx))} className="p-1 rounded hover:bg-[#fef2f2] text-[#dc2626]"><Trash2 size={12} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {items.length > 0 && (
                     <div className="p-3 bg-[#f9fafb] border-t border-[#e5e7eb] text-right font-bold text-[14px]">
                        Total: ₹{items.reduce((sum, i) => sum + (i.qty * i.price * (1 + i.gst/100)), 0).toLocaleString("en-IN")}
                     </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-[#e5e7eb] flex gap-3">
              <button onClick={() => handleCreate("Submitted")} className="px-4 py-2.5 rounded-none text-white font-semibold text-[13px]" style={{ background: "#4f46e5" }}>Submit for Approval</button>
              <button onClick={() => handleCreate("Draft")} className="px-4 py-2.5 rounded-none border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors">Save Draft</button>
              <button onClick={() => setShowCreate(false)} className="ml-auto px-4 py-2.5 rounded-none text-[13px] font-medium text-[#9ca3af] hover:text-[#374151] transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
