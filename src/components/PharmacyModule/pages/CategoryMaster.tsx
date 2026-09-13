import { usePharmacyData } from "../data/usePharmacyData";
import { PharmacyDatabase } from "../../../services/pharmacyDb";
import { useState } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

interface CategoryMasterProps { onNavigate: (page: string) => void }

export default function CategoryMaster({ onNavigate }: CategoryMasterProps) {
  const {  categories, refresh } = usePharmacyData();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStatus, setNewStatus] = useState("Active");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const toggle = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if(cat) {
      PharmacyDatabase.updateCategory(id, { status: cat.status === "active" ? "Inactive" : "Active" });
      refresh();
    }
  };
  
  const remove = (id: string) => { 
    PharmacyDatabase.deleteCategory(id);
    refresh();
    setDeleteConfirm(null); 
  };

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Inventory" }, { label: "Category Master" }]}
        title="Category Master"
        description={`${categories.length} categories · ${categories.filter(c => c.status === "active").length} active`}
        actions={
          <button onClick={() => { setEditingId(null); setNewName(""); setNewDesc(""); setNewStatus("Active"); setShowModal(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-none text-white text-[13px] font-medium" style={{ background: "#4f46e5" }}>
            <Plus size={14} /> Add Category
          </button>
        }
        onNavigate={onNavigate}
      />

      <div className="bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
        <table>
          <thead><tr>
            <th>Category Name</th><th>Description</th><th>Medicines</th><th>Status</th><th>Created</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id}>
                <td className="font-semibold text-[13px] text-[#111827]">{c.name}</td>
                <td className="text-[13px] text-[#6b7280]">{c.description}</td>
                <td>
                  <span className="font-semibold text-[13px] text-[#111827]">{c.medicines}</span>
                  <span className="text-[12px] text-[#9ca3af] ml-1">items</span>
                </td>
                <td><StatusBadge status={c.status} size="sm" /></td>
                <td className="text-[12px] text-[#6b7280]">{c.created}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingId(c.id); setNewName(c.name); setNewDesc(c.description); setNewStatus(c.status === "active" ? "Active" : "Inactive"); setShowModal(true); }} className="p-1.5 rounded hover:bg-[#eff6ff] text-[#4f46e5] transition-colors" title="Edit"><Edit2 size={13} /></button>
                    <button onClick={() => toggle(c.id)} className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#6b7280] transition-colors" title="Toggle status">
                      {c.status === "active" ? <ToggleRight size={14} style={{ color: "#16a34a" }} /> : <ToggleLeft size={14} />}
                    </button>
                    <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 rounded hover:bg-[#fef2f2] text-[#dc2626] transition-colors" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.6)" }}>
          <div className="bg-white rounded-none shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
              <p className="font-bold text-[16px] text-[#111827]">Add Category</p>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-none hover:bg-[#f3f4f6] text-[#9ca3af]"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Category Name *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 rounded-none border border-[#e5e7eb] text-[13px] focus:border-[#4f46e5] focus:outline-none transition-colors" placeholder="e.g. Antifungal" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-none border border-[#e5e7eb] text-[13px] focus:border-[#4f46e5] focus:outline-none transition-colors resize-none" placeholder="Brief description of this category" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full px-3 py-2 rounded-none border border-[#e5e7eb] text-[13px] focus:border-[#4f46e5] focus:outline-none transition-colors">
                  <option value="Active">Active</option><option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    if (editingId) {
                      PharmacyDatabase.updateCategory(editingId, { categoryName: newName, description: newDesc, status: newStatus as any });
                    } else {
                      PharmacyDatabase.addCategory({ id: "CAT" + Date.now(), categoryName: newName, description: newDesc, status: newStatus as any, createdAt: new Date().toISOString() });
                    }
                    refresh();
                    setShowModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-none text-white font-semibold text-[13px]" style={{ background: "#4f46e5" }}>
                  {editingId ? "Save Changes" : "Add Category"}
                </button>
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-none border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.6)" }}>
          <div className="bg-white rounded-none shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="w-12 h-12 rounded-none flex items-center justify-center mb-4" style={{ background: "#fef2f2" }}>
              <Trash2 size={20} style={{ color: "#dc2626" }} />
            </div>
            <p className="font-bold text-[16px] text-[#111827] mb-1">Delete Category</p>
            <p className="text-[13px] text-[#6b7280] mb-5">
              This will permanently delete <strong>{cats.find(c => c.id === deleteConfirm)?.name}</strong>. Medicines in this category will need to be reassigned.
            </p>
            <div className="flex gap-3">
              <button onClick={() => remove(deleteConfirm)} className="flex-1 py-2.5 rounded-none text-white font-semibold text-[13px]" style={{ background: "#dc2626" }}>Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-none border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
