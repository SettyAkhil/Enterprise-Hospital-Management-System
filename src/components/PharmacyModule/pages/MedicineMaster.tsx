import { usePharmacyData } from "../data/usePharmacyData";
import { PharmacyDatabase } from "../../../services/pharmacyDb";
import { useState } from "react";
import { Search, Plus, Upload, Download, Edit2, Trash2, Eye, X, Database } from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { Btn } from "../../shared";

interface MedicineMasterProps { onNavigate: (page: string) => void }

export default function MedicineMaster({ onNavigate }: MedicineMasterProps) {
  const { medicines, refresh } = usePharmacyData();
  const [search, setSearch] = useState("");
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
        const batchId = "INIT" + Date.now();
        PharmacyDatabase.addBatch({
          medicineId: newMed.id,
          batchNumber: batchId,
          expiryDate: "2026-12-31",
          quantity: editingMedicine.stock,
          availableQuantity: editingMedicine.stock,
          mrp: editingMedicine.mrp || 0,
          purchasePrice: (editingMedicine.mrp || 0) * 0.6,
          grnId: "INIT"
        });

        PharmacyDatabase.addTransaction({
          id: "TXN" + Math.floor(Math.random() * 100000),
          date: new Date().toISOString(),
          medicineId: newMed.id,
          batchId: batchId,
          quantity: editingMedicine.stock,
          transactionType: "PURCHASE_RECEIVED",
          userId: "SYS",
          reason: "Initial Stock"
        });
      }
    }
    setShowModal(false);
    setEditingMedicine(null);
    refresh();
  };
  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
        ["Medicine Name,Generic Name,Manufacturer,Stock,MRP,Status"].join(",") + "\n" +
        filtered.map(m => `${m.name},${m.generic},${m.manufacturer},${m.stock},${m.mrp},${m.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "medicines_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.dispatchEvent(new CustomEvent("hospai_pharmacy_toast", { detail: { message: "Medicines exported successfully!" } }));
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx";
    input.onchange = () => {
        window.dispatchEvent(new CustomEvent("hospai_pharmacy_toast", { detail: { message: "Medicines imported successfully!" } }));
    };
    input.click();
  };

  const filtered = medicines.filter(m => {
    return !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.generic.toLowerCase().includes(search.toLowerCase()) || m.sku.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6F9]">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Catalog & Master Data" }]}
        title="Medicine Formulary & Catalog"
        badge="FORMULARY MASTER"
        description={`${medicines.length} total pharmaceutical items · ${medicines.filter(m => m.status === "active").length} active in dispensary`}
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={handleImport} className="shadow-xs">
              <Upload size={13} /> Import
            </Btn>
            <Btn variant="outline" size="sm" onClick={handleExport} className="shadow-xs">
              <Download size={13} /> Export
            </Btn>
            <Btn variant="primary" size="sm" onClick={openAddModal} className="shadow-xs">
              <Plus size={14} /> Add Medicine
            </Btn>
          </div>
        }
        onNavigate={onNavigate}
        icon={Database} iconBg="bg-emerald-600"
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-[1600px] w-full mx-auto">
        {/* Filters */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-[#DDE2EC] rounded-lg px-3 py-1.5 w-80 shadow-xs focus-within:border-[#2563EB]">
            <Search size={14} className="text-[#94A3B8] flex-shrink-0" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by brand, generic, or SKU..." 
              className="text-[13px] outline-none text-[#0F1624] placeholder:text-[#94A3B8] w-full bg-transparent" 
            />
            {search && <button onClick={() => setSearch("")} className="cursor-pointer"><X size={12} className="text-[#94A3B8]" /></button>}
          </div>

          <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
            <span>Showing <strong className="text-gray-900 font-mono">{filtered.length}</strong> of <strong className="text-gray-900 font-mono">{medicines.length}</strong> items</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <table>
            <thead><tr>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Medicine</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Generic Name</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Strength</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Form</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Manufacturer</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Stock</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-right">MRP (₹)</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-right">Price (₹)</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Status</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-center">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-[13px] text-gray-900">{m.name}</p>
                      <p className="text-[11px] text-[#94A3B8] font-mono">SKU: {m.sku}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-[#334155]">{m.generic}</td>
                  <td className="px-4 py-3 text-[12.5px] font-medium text-[#334155]">{m.strength}</td>
                  <td className="px-4 py-3 text-[12px] text-[#64748B]">{m.form}</td>
                  <td className="px-4 py-3 text-[12.5px] text-[#334155]">{m.manufacturer}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 font-mono text-[11.5px] font-bold px-2 py-0.5 rounded-full ${
                      m.stock === 0 
                        ? "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]" 
                        : m.stock < m.reorderLevel 
                        ? "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]" 
                        : "bg-[#DCFCE7] text-[#16A34A]"
                    }`}>
                      {m.stock}
                    </span>
                    {m.prescription && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#FAF5FF] text-[#7C3AED] border border-[#E9D5FF]">Rx</span>}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] font-semibold text-gray-900 font-mono text-right">₹{m.mrp.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[12.5px] text-gray-700 font-mono text-right">₹{m.price.toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setSelected(m)} className="p-1 rounded hover:bg-[#F1F5F9] text-[#64748B] transition-colors cursor-pointer" title="View"><Eye size={14} /></button>
                      <button onClick={() => handleEdit(m)} className="p-1 rounded hover:bg-[#EFF6FF] text-[#2563EB] transition-colors cursor-pointer" title="Edit"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(m.id)} className="p-1 rounded hover:bg-[#FEF2F2] text-[#DC2626] transition-colors cursor-pointer" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#94A3B8] text-[13px]">
                    No medicines found in master catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Medicine Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-[#E2E8F0]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#FAFCFF]">
              <div>
                <p className="font-bold text-[16px] text-gray-900">{selected.name}</p>
                <p className="text-[12px] text-[#64748B]">{selected.generic} · SKU: {selected.sku}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#94A3B8] transition-colors cursor-pointer"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <Grid title="Basic Information" rows={[
                ["Medicine Name", selected.name], ["Generic Name", selected.generic],
                ["Manufacturer", selected.manufacturer], ["SKU", selected.sku],
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-[#E2E8F0]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#FAFCFF]">
              <p className="font-bold text-[15px] text-gray-900">Add New Medicine</p>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#94A3B8] cursor-pointer"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Medicine Name</label><input value={editingMedicine?.name || ""} onChange={e=>setEditingMedicine({...editingMedicine, name: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Generic Name</label><input value={editingMedicine?.generic || ""} onChange={e=>setEditingMedicine({...editingMedicine, generic: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Strength</label><input value={editingMedicine?.strength || ""} onChange={e=>setEditingMedicine({...editingMedicine, strength: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Dosage Form</label><input value={editingMedicine?.form || ""} onChange={e=>setEditingMedicine({...editingMedicine, form: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Manufacturer</label><input value={editingMedicine?.manufacturer || ""} onChange={e=>setEditingMedicine({...editingMedicine, manufacturer: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">MRP</label><input type="number" value={editingMedicine?.mrp || ""} onChange={e=>setEditingMedicine({...editingMedicine, mrp: parseFloat(e.target.value)})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Initial Stock</label><input type="number" value={editingMedicine?.stock || ""} onChange={e=>setEditingMedicine({...editingMedicine, stock: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" disabled={!!editingMedicine?.id} /></div>
              </div>
              <div className="flex gap-2.5 pt-2">
                <Btn variant="primary" size="md" onClick={handleSave} className="flex-1 justify-center shadow-xs">Save Medicine</Btn>
                <Btn variant="outline" size="md" onClick={() => setShowModal(false)} className="flex-1 justify-center">Cancel</Btn>
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
      <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="p-3 rounded bg-[#F5F7FA]">
            <p className="text-[11px] text-[#94A3B8]">{label}</p>
            <p className="text-[13px] font-semibold text-[#0F1624] mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
