import { usePharmacyData } from "../data/usePharmacyData";
import { PharmacyDatabase } from "../../../services/pharmacyDb";
import { useState } from "react";
import { Search, Plus, Upload, Download, Filter, Edit2, Trash2, Eye, ChevronDown, X } from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

interface MedicineMasterProps { onNavigate: (page: string) => void }

export default function MedicineMaster({ onNavigate }: MedicineMasterProps) {
  const {  medicines, refresh  } = usePharmacyData();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<typeof medicines[0] | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);

  const handleEdit = (m: any) => {
    setEditingMedicine(m);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this medicine?")) {
      PharmacyDatabase.deleteMedicine(id);
      refresh();
    }
  };

  const openAddModal = () => {
    setEditingMedicine({ name: "", generic: "", strength: "", form: "", manufacturer: "", category: "", mrp: 0, price: 0, stock: 0 });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!editingMedicine.name) return alert("Name is required");
    
    if (editingMedicine.id) {
      PharmacyDatabase.updateMedicine(editingMedicine.id, {
        brandName: editingMedicine.name,
        medicineName: editingMedicine.name,
        genericName: editingMedicine.generic,
        strength: editingMedicine.strength,
        dosageForm: editingMedicine.form,
        manufacturer: editingMedicine.manufacturer,
        taxPercentage: editingMedicine.gst || 12,
        hsnCode: editingMedicine.sku || "",
        barcode: editingMedicine.barcode || "",
        scheduleType: editingMedicine.schedule || "H",
        controlledSubstanceFlag: editingMedicine.prescription || false,
        categoryId: editingMedicine.category || "General",
        reorderLevel: editingMedicine.reorderLevel || 10
      });
    } else {
      const newMed = {
        id: "MED" + Date.now(),
        brandName: editingMedicine.name,
        medicineName: editingMedicine.name,
        genericName: editingMedicine.generic,
        strength: editingMedicine.strength,
        dosageForm: editingMedicine.form,
        manufacturer: editingMedicine.manufacturer,
        taxPercentage: editingMedicine.gst || 12,
        activeStatus: "Active",
        hsnCode: editingMedicine.sku || "",
        barcode: editingMedicine.barcode || "",
        scheduleType: editingMedicine.schedule || "H",
        controlledSubstanceFlag: editingMedicine.prescription || false,
        categoryId: editingMedicine.category || "General",
        reorderLevel: editingMedicine.reorderLevel || 10
      };
      PharmacyDatabase.addMedicine(newMed as any);
      
      if (editingMedicine.stock > 0) {
        PharmacyDatabase.addBatch({
          medicineId: newMed.id,
          batchNumber: "INIT" + Date.now(),
          expiryDate: "2026-12-31",
          quantity: editingMedicine.stock,
          availableQuantity: editingMedicine.stock,
          mrp: editingMedicine.mrp || 0,
          purchasePrice: (editingMedicine.mrp || 0) * 0.6,
          grnId: "INIT"
        });
      }
    }
    setShowModal(false);
    setEditingMedicine(null);
    refresh();
  };

  const categories = ["All", ...Array.from(new Set(medicines.map(m => m.category)))];
  const filtered = medicines.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.generic.toLowerCase().includes(search.toLowerCase()) || m.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "All" || m.category === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Inventory" }, { label: "Medicine Master" }]}
        title="Medicine Master"
        description={`${medicines.length} medicines · ${medicines.filter(m => m.status === "active").length} active`}
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-none border border-[#e5e7eb] bg-white text-[13px] text-[#374151] hover:bg-[#f9fafb] transition-colors">
              <Upload size={13} /> Import
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-none border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors">
              <Download size={14} /> Export
            </button>
            <button onClick={openAddModal} className="flex items-center gap-2 px-3 py-1.5 rounded-none text-white font-medium text-[13px] transition-colors" style={{ background: "#4f46e5" }}>
              <Plus size={14} /> Add Medicine
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-none px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-[#9ca3af] flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, generic, SKU…" className="text-[13px] outline-none text-[#111827] placeholder:text-[#9ca3af] w-full" />
          {search && <button onClick={() => setSearch("")}><X size={12} className="text-[#9ca3af]" /></button>}
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-none px-3 py-2">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="text-[13px] outline-none text-[#374151] bg-transparent pr-6">
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <ChevronDown size={13} className="text-[#9ca3af] -ml-5 pointer-events-none" />
        </div>
        <div className="ml-auto flex items-center gap-2 text-[13px] text-[#6b7280]">
          <span className="font-medium text-[#111827]">{filtered.length}</span> results
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
        <table>
          <thead><tr>
            <th>Medicine</th><th>Generic Name</th><th>Strength</th><th>Form</th><th>Manufacturer</th><th>Stock</th><th>MRP (₹)</th><th>Price (₹)</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id}>
                <td>
                  <div>
                    <p className="font-semibold text-[13px] text-[#111827]">{m.name}</p>
                    <p className="text-[11px] text-[#9ca3af]">SKU: {m.sku}</p>
                  </div>
                </td>
                <td className="text-[13px] text-[#374151]">{m.generic}</td>
                <td className="text-[13px] font-medium text-[#374151]">{m.strength}</td>
                <td className="text-[12px] text-[#6b7280]">{m.form}</td>
                <td className="text-[13px] text-[#374151]">{m.manufacturer}</td>
                <td>
                  <span className="font-semibold text-[13px]" style={{ color: m.stock === 0 ? "#dc2626" : m.stock < m.reorderLevel ? "#d97706" : "#15803d" }}>
                    {m.stock}
                  </span>
                  {m.prescription && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: "#faf5ff", color: "#7c3aed" }}>Rx</span>}
                </td>
                <td className="text-[13px] font-medium text-[#111827]">₹{m.mrp.toFixed(2)}</td>
                <td className="text-[13px] text-[#374151]">₹{m.price.toFixed(2)}</td>
                <td><StatusBadge status={m.status} size="sm" /></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelected(m)} className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#6b7280] transition-colors" title="View"><Eye size={13} /></button>
                    <button onClick={() => handleEdit(m)} className="p-1.5 rounded hover:bg-[#eff6ff] text-[#4f46e5] transition-colors" title="Edit"><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded hover:bg-[#fef2f2] text-[#dc2626] transition-colors" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Medicine Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.6)" }} onClick={() => setSelected(null)}>
          <div className="bg-white rounded-none shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
              <div>
                <p className="font-bold text-[16px] text-[#111827]">{selected.name}</p>
                <p className="text-[12px] text-[#6b7280]">{selected.generic} · SKU: {selected.sku}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-none hover:bg-[#f3f4f6] text-[#9ca3af] transition-colors"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              <Grid title="Basic Information" rows={[
                ["Medicine Name", selected.name], ["Generic Name", selected.generic],
                ["Manufacturer", selected.manufacturer], ["Category", selected.category],
              ]} />
              <Grid title="Product Information" rows={[
                ["Dosage Form", selected.form], ["Strength", selected.strength],
                ["Barcode", selected.barcode], ["Schedule", selected.schedule],
                ["Prescription Required", selected.prescription ? "Yes" : "No"],
              ]} />
              <Grid title="Pricing" rows={[
                ["MRP", `₹${selected.mrp.toFixed(2)}`], ["Selling Price", `₹${selected.price.toFixed(2)}`],
                ["GST", `${selected.gst}%`],
              ]} />
              <Grid title="Inventory" rows={[
                ["Current Stock", selected.stock.toString()], ["Reorder Level", selected.reorderLevel.toString()],
              ]} />
            </div>
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.6)" }} onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-none shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
              <p className="font-bold text-[16px] text-[#111827]">Add New Medicine</p>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-none hover:bg-[#f3f4f6] text-[#9ca3af]"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Medicine Name</label><input value={editingMedicine?.name || ""} onChange={e=>setEditingMedicine({...editingMedicine, name: e.target.value})} className="w-full px-3 py-2 border border-[#e5e7eb] text-[13px]" /></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Generic Name</label><input value={editingMedicine?.generic || ""} onChange={e=>setEditingMedicine({...editingMedicine, generic: e.target.value})} className="w-full px-3 py-2 border border-[#e5e7eb] text-[13px]" /></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Strength</label><input value={editingMedicine?.strength || ""} onChange={e=>setEditingMedicine({...editingMedicine, strength: e.target.value})} className="w-full px-3 py-2 border border-[#e5e7eb] text-[13px]" /></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Dosage Form</label><input value={editingMedicine?.form || ""} onChange={e=>setEditingMedicine({...editingMedicine, form: e.target.value})} className="w-full px-3 py-2 border border-[#e5e7eb] text-[13px]" /></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Manufacturer</label><input value={editingMedicine?.manufacturer || ""} onChange={e=>setEditingMedicine({...editingMedicine, manufacturer: e.target.value})} className="w-full px-3 py-2 border border-[#e5e7eb] text-[13px]" /></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Category</label><input value={editingMedicine?.category || ""} onChange={e=>setEditingMedicine({...editingMedicine, category: e.target.value})} className="w-full px-3 py-2 border border-[#e5e7eb] text-[13px]" /></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">MRP</label><input type="number" value={editingMedicine?.mrp || ""} onChange={e=>setEditingMedicine({...editingMedicine, mrp: parseFloat(e.target.value)})} className="w-full px-3 py-2 border border-[#e5e7eb] text-[13px]" /></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Initial Stock</label><input type="number" value={editingMedicine?.stock || ""} onChange={e=>setEditingMedicine({...editingMedicine, stock: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-[#e5e7eb] text-[13px]" disabled={!!editingMedicine?.id} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} className="flex-1 py-2.5 rounded-none text-white font-semibold text-[13px]" style={{ background: "#4f46e5" }}>Save Medicine</button>
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-none border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Grid({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="p-3 rounded-none bg-[#f9fafb]">
            <p className="text-[11px] text-[#9ca3af]">{label}</p>
            <p className="text-[13px] font-semibold text-[#111827] mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
