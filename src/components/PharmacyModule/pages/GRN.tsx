import { useState } from "react";
import { AlertTriangle, CheckCircle, Save, Printer, X, Info, Plus, Search } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { usePharmacyData } from "../data/usePharmacyData";
import { PharmacyDatabase } from "../../../services/pharmacyDb";

interface GRNProps { onNavigate: (page: string) => void }

export default function GRN({ onNavigate }: GRNProps) {
  const { medicines, refresh } = usePharmacyData();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const updateItem = (idx: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      const issues = updated.received < updated.ordered ? "short" : updated.damaged > 0 ? "damaged" : "ok";
      return { ...updated, status: issues };
    }));
  };

  const handlePost = () => {
    if (items.length === 0) return alert("Add items to receive.");
    items.forEach(item => {
      PharmacyDatabase.addBatch({
        medicineId: item.medicineId,
        batchNumber: item.batch || ("B" + Date.now()),
        expiryDate: item.expiry || "2026-12-31",
        quantity: item.received,
        availableQuantity: item.received - item.damaged,
        mrp: item.mrp || 0,
        purchasePrice: item.price || 0,
        grnId: "GRN" + Date.now()
      });
    });
    alert("Stock posted successfully!");
    setItems([]);
    refresh();
  };

  const addMedicine = (med: any) => {
    setItems([...items, {
      medicineId: med.id, medicine: med.name, ordered: 0, received: 0, damaged: 0, 
      batch: "", mfg: "", expiry: "", price: med.price, mrp: med.mrp, status: "short"
    }]);
    setSearch("");
  };

  const searchResults = search.length > 1 ? medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase())) : [];

  const statusIcon = (s: string) => {
    if (s === "ok") return <CheckCircle size={14} className="text-emerald-500" />;
    if (s === "short") return <Info size={14} className="text-amber-500" />;
    return <AlertTriangle size={14} className="text-red-500" />;
  };

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Purchasing" }, { label: "GRN / Receiving" }]}
        title="Goods Received Note"
        description="Record and verify stock received from suppliers"
        onNavigate={onNavigate}
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded border border-[#DDE2EC] bg-white text-[13px] text-[#334155] hover:bg-[#F5F7FA] transition-colors">
              <Printer size={13} /> Print GRN
            </button>
            <button onClick={handlePost} className="flex items-center gap-1.5 px-4 py-2 rounded text-white text-[13px] font-medium hover:opacity-90" style={{ background: "#16a34a" }}>
              <CheckCircle size={14} /> Post to Inventory
            </button>
          </div>
        }
      />

      {/* GRN Header */}
      <div className="bg-white rounded border border-[#DDE2EC] p-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "GRN Number", value: "-", editable: false },
            { label: "Purchase Order", value: "-", editable: false },
            { label: "Supplier", value: "-", editable: false },
            { label: "Invoice Number", value: "", editable: true, placeholder: "Enter invoice no." },
            { label: "Invoice Date", value: "", editable: true, type: "date" },
            { label: "Received Date", value: "-", editable: true, type: "date" },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">{f.label}</label>
              {f.editable
                ? <input type={(f as any).type ?? "text"} defaultValue={f.value} placeholder={(f as any).placeholder} className="w-full px-3 py-2 rounded border border-[#DDE2EC] text-[13px] focus:border-[#1B4FD8] focus:outline-none transition-colors bg-[#F5F7FA] focus:bg-white" />
                : <p className="px-3 py-2 rounded bg-[#F5F7FA] text-[13px] font-medium text-[#0F1624]">{f.value}</p>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: Info, label: "Short Delivery", count: items.filter(i=>i.status==="short").length, color: "#d97706", bg: "#FEF3C7" },
          { icon: AlertTriangle, label: "Damaged Items", count: items.filter(i=>i.status==="damaged").length, color: "#dc2626", bg: "#FEE2E2" },
          { icon: CheckCircle, label: "Items OK", count: items.filter(i=>i.status==="ok").length, color: "#15803d", bg: "#DCFCE7" },
        ].map(a => (
          <div key={a.label} className="flex items-center gap-3 p-4 rounded border" style={{ background: a.bg, borderColor: a.bg }}>
            <a.icon size={18} style={{ color: a.color }} />
            <div>
              <p className="text-[20px] font-bold" style={{ color: a.color }}>{a.count}</p>
              <p className="text-[12px]" style={{ color: a.color }}>{a.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Receiving Table */}
      <div className="bg-white rounded border border-[#DDE2EC] overflow-visible">
        <div className="px-5 py-3 border-b border-[#F0F2F5] flex items-center justify-between relative">
          <p className="font-semibold text-[14px] text-[#0F1624]">Receiving Details</p>
          <div className="relative">
            <div className="flex items-center gap-2 border border-[#DDE2EC] px-3 py-1.5 w-64 bg-white">
              <Search size={14} className="text-[#94A3B8]" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search medicine to add..." className="w-full text-[13px] outline-none" />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute top-full right-0 w-80 bg-white border border-[#DDE2EC] shadow-xl z-50 max-h-64 overflow-y-auto">
                {searchResults.map(m => (
                  <div key={m.id} onClick={() => addMedicine(m)} className="p-3 border-b hover:bg-[#F5F7FA] cursor-pointer flex justify-between items-center">
                    <div>
                      <p className="text-[13px] font-medium text-[#0F1624]">{m.name}</p>
                      <p className="text-[11px] text-[#64748B]">{m.generic}</p>
                    </div>
                    <Plus size={14} className="text-[#1B4FD8]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr>
              <th>Medicine</th><th>Ordered</th><th>Received</th><th>Damaged</th><th>Batch No.</th><th>Mfg. Date</th><th>Expiry Date</th><th>Purchase Price</th><th>MRP (₹)</th><th>Status</th>
            </tr></thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="font-medium text-[13px] text-[#0F1624]">{item.medicine}</td>
                  <td className="text-[13px] text-[#334155]">{item.ordered}</td>
                  <td>
                    <input
                      type="number"
                      value={item.received}
                      onChange={e => updateItem(idx, "received", +e.target.value)}
                      className="w-20 px-2 py-1 rounded border border-[#DDE2EC] text-[13px] focus:border-[#1B4FD8] focus:outline-none text-center"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.damaged}
                      onChange={e => updateItem(idx, "damaged", +e.target.value)}
                      className="w-16 px-2 py-1 rounded border border-[#DDE2EC] text-[13px] focus:border-[#1B4FD8] focus:outline-none text-center"
                    />
                  </td>
                  <td><input value={item.batch} onChange={e=>updateItem(idx,"batch",e.target.value)} placeholder="Batch" className="w-24 px-2 py-1 rounded border border-[#DDE2EC] text-[12px] font-mono focus:border-[#1B4FD8] focus:outline-none" /></td>
                  <td><input type="date" value={item.mfg} onChange={e=>updateItem(idx,"mfg",e.target.value)} className="w-32 px-2 py-1 rounded border border-[#DDE2EC] text-[12px] focus:border-[#1B4FD8] focus:outline-none" /></td>
                  <td>
                    <input
                      type="date"
                      value={item.expiry}
                      onChange={e=>updateItem(idx,"expiry",e.target.value)}
                      className="w-32 px-2 py-1 rounded border border-[#DDE2EC] text-[12px] focus:border-[#1B4FD8] focus:outline-none"
                    />
                  </td>
                  <td><input type="number" value={item.price} onChange={e=>updateItem(idx,"price",+e.target.value)} className="w-20 px-2 py-1 rounded border border-[#DDE2EC] text-[13px]" /></td>
                  <td><input type="number" value={item.mrp} onChange={e=>updateItem(idx,"mrp",+e.target.value)} className="w-20 px-2 py-1 rounded border border-[#DDE2EC] text-[13px]" /></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(item.status)}
                      <span className="text-[12px] font-medium" style={{ color: item.status === "ok" ? "#15803d" : item.status === "short" ? "#d97706" : "#dc2626" }}>
                        {item.status === "ok" ? "OK" : item.status === "short" ? "Short" : "Damaged"}
                      </span>
                      <button onClick={()=>setItems(items.filter((_, i) => i !== idx))}><X size={14} className="text-[#94A3B8] hover:text-red-500 ml-2" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded border border-[#DDE2EC] p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-[11px] text-[#64748B] uppercase font-semibold tracking-wide">Total Ordered</p>
            <p className="text-[20px] font-bold text-[#0F1624]">{items.reduce((s,i)=>s+i.ordered,0)} units</p>
          </div>
          <div>
            <p className="text-[11px] text-[#64748B] uppercase font-semibold tracking-wide">Total Received</p>
            <p className="text-[20px] font-bold text-[#0F1624]">{items.reduce((s,i)=>s+i.received,0)} units</p>
          </div>
          <div>
            <p className="text-[11px] text-[#64748B] uppercase font-semibold tracking-wide">Invoice Value</p>
            <p className="text-[20px] font-bold text-[#0F1624]">
              ₹{items.reduce((s,i)=>s+(i.received*i.price*(1+i.gst/100)),0).toLocaleString("en-IN", {minimumFractionDigits:2})}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
