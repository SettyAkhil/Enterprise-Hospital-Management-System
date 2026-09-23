import { usePharmacyData } from "../data/usePharmacyData";
import { PharmacyDatabase } from "../../../services/pharmacyDb";
import { useState } from "react";
import { Plus, Eye, Edit2, Phone, Mail, X, Building2, CreditCard, Trash2, Truck } from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { Btn } from "../../shared";

interface SuppliersProps { onNavigate: (page: string) => void }

export default function Suppliers({ onNavigate }: SuppliersProps) {
  const { suppliers, refresh } = usePharmacyData();
  const [selected, setSelected] = useState<typeof suppliers[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ supplierName: "", contactInformation: "", phone: "", email: "", address: "", gstInformation: "", licenseDetails: "", paymentTerms: "", status: "Active" as any });

  const handleEdit = (s: typeof suppliers[0]) => {
    setEditingId(s.id);
    setForm({ supplierName: s.supplierName || s.name, contactInformation: s.contactInformation || s.contact, phone: s.phone || "", email: s.email || "", address: s.address, gstInformation: s.gstInformation || s.gstin, licenseDetails: s.licenseDetails || s.drugLicense || "", paymentTerms: s.paymentTerms, status: s.status as any });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm({ supplierName: "", contactInformation: "", phone: "", email: "", address: "", gstInformation: "", licenseDetails: "", paymentTerms: "Net 30", status: "Active" });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingId) {
      PharmacyDatabase.updateSupplier(editingId, form);
    } else {
      PharmacyDatabase.addSupplier({ id: "SUP" + Date.now(), ...form, createdAt: new Date().toISOString() });
    }
    refresh();
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete supplier?")) {
      PharmacyDatabase.deleteSupplier(id);
      refresh();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6F9]">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Procurement" }, { label: "Suppliers" }]}
        title="Supplier Directory & Vendors"
        badge="SUPPLIERS"
        description={`${suppliers.length} active pharmaceutical vendors and authorized distributors`}
        actions={
          <Btn variant="primary" size="sm" onClick={handleAdd} className="shadow-xs">
            <Plus size={14} /> Add Supplier
          </Btn>
        }
        onNavigate={onNavigate}
        icon={Truck} iconBg="bg-cyan-600"
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <table>
            <thead><tr>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Supplier</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Contact Person</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Phone / Email</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">GSTIN</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Status</th>
              <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-center">Actions</th>
            </tr></thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[13px] text-gray-900">{s.supplierName || s.name}</p>
                    <p className="text-[11px] text-[#94A3B8]">{s.address}</p>
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-[#334155]">{s.contactInformation || s.contact}</td>
                  <td className="px-4 py-3">
                    <p className="text-[12px] flex items-center gap-1 text-[#334155] font-mono"><Phone size={11} className="text-[#64748B]" /> {s.phone || "N/A"}</p>
                    <p className="text-[11.5px] flex items-center gap-1 text-[#64748B] mt-0.5"><Mail size={11} /> {s.email || "N/A"}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11.5px] text-[#64748B]">{s.gstInformation || s.gstin}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setSelected(s)} className="p-1 rounded hover:bg-[#F1F5F9] text-[#64748B] transition-colors cursor-pointer" title="View"><Eye size={14} /></button>
                      <button onClick={() => handleEdit(s)} className="p-1 rounded hover:bg-[#EFF6FF] text-[#2563EB] transition-colors cursor-pointer" title="Edit"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-[#FEF2F2] text-[#DC2626] transition-colors cursor-pointer" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#94A3B8] text-[13px]">
                    No suppliers found in directory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex bg-black/50" onClick={() => setSelected(null)}>
          <div className="flex-1" />
          <div className="w-[440px] bg-white shadow-2xl border-l border-[#E2E8F0] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#FAFCFF]">
              <div>
                <p className="font-bold text-[15px] text-gray-900">{selected.supplierName || selected.name}</p>
                <p className="text-[11.5px] text-[#64748B]">Supplier Profile</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#94A3B8] cursor-pointer"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <Section icon={<Building2 size={14} />} title="Company Information">
                <Row label="Supplier Name" value={selected.supplierName || selected.name} />
                <Row label="Address" value={selected.address} />
                <Row label="GSTIN" value={selected.gstInformation || selected.gstin} mono />
                <Row label="Drug License" value={selected.licenseDetails || selected.drugLicense} mono />
              </Section>
              <Section icon={<Phone size={14} />} title="Contact Information">
                <Row label="Contact Person" value={selected.contactInformation || selected.contact} />
                <Row label="Phone" value={selected.phone || "N/A"} mono />
                <Row label="Email" value={selected.email || "N/A"} />
              </Section>
              <Section icon={<CreditCard size={14} />} title="Financial Terms">
                <Row label="Payment Terms" value={selected.paymentTerms} />
                <Row label="Status" value={<StatusBadge status={selected.status} />} />
              </Section>
            </div>
            <div className="p-4 border-t border-[#E2E8F0] bg-[#FAFCFF] flex gap-2.5">
              <Btn variant="primary" size="md" onClick={() => { const curr = selected; setSelected(null); handleEdit(curr); }} className="flex-1 justify-center shadow-xs">
                <Edit2 size={13} /> Edit Supplier
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-[#E2E8F0]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#FAFCFF]">
              <p className="font-bold text-[15px] text-gray-900">{editingId ? "Edit Supplier" : "Add New Supplier"}</p>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#94A3B8] cursor-pointer"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Supplier Name *</label><input value={form.supplierName} onChange={e=>setForm({...form, supplierName: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Contact Person</label><input value={form.contactInformation} onChange={e=>setForm({...form, contactInformation: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Phone</label><input value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Email</label><input value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div className="col-span-2"><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Address</label><input value={form.address} onChange={e=>setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">GSTIN</label><input value={form.gstInformation} onChange={e=>setForm({...form, gstInformation: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Drug License</label><input value={form.licenseDetails} onChange={e=>setForm({...form, licenseDetails: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Payment Terms</label><input value={form.paymentTerms} onChange={e=>setForm({...form, paymentTerms: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none" /></div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Status</label>
                  <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="w-full px-3 py-2 border border-[#DDE2EC] rounded-lg text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2.5 pt-2">
                <Btn variant="primary" size="md" onClick={handleSave} className="flex-1 justify-center shadow-xs">Save Supplier</Btn>
                <Btn variant="outline" size="md" onClick={() => setShowModal(false)} className="flex-1 justify-center">Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900 uppercase tracking-wider">
        {icon} {title}
      </p>
      <div className="space-y-2 border-l-2 border-[#E2E8F0] pl-3 ml-1">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string | React.ReactNode; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[12px] font-medium text-[#64748B]">{label}</span>
      <span className={`text-[12.5px] text-right ${mono ? 'font-mono' : ''} ${highlight ? 'font-bold text-[#D97706]' : 'font-semibold text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}
