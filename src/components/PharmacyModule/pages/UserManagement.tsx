import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { Plus, Edit2, ToggleRight, ToggleLeft, Shield, X } from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

const permMatrix = [
  { module: "Billing",    view: true,  create: true,  edit: true,  delete: false, approve: false },
  { module: "Medicines",  view: true,  create: true,  edit: true,  delete: true,  approve: false },
  { module: "Purchase",   view: true,  create: true,  edit: true,  delete: false, approve: true  },
  { module: "Inventory",  view: true,  create: true,  edit: true,  delete: false, approve: true  },
  { module: "Reports",    view: true,  create: false, edit: false, delete: false, approve: false },
  { module: "Users",      view: true,  create: false, edit: false, delete: false, approve: false },
];

interface UserManagementProps { onNavigate: (page: string) => void }

export default function UserManagement({ onNavigate }: UserManagementProps) {
  const {  users  } = usePharmacyData();
  const [tab, setTab] = useState<"users" | "permissions">("users");
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Administration" }, { label: "User Management" }]}
        title="User Management"
        description={`${users.length} users · ${users.filter(u=>u.status==="active").length} active`}
        actions={
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-none text-white text-[13px] font-medium" style={{ background: "#4f46e5" }}>
            <Plus size={14} /> Add User
          </button>
        }
        onNavigate={onNavigate}
      />

      {/* Tabs */}
      <div className="flex rounded-none border border-[#e5e7eb] overflow-hidden w-fit text-[13px]">
        {(["users", "permissions"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className="px-5 py-2.5 font-medium capitalize transition-colors" style={{ background: tab === t ? "#111827" : "#fff", color: tab === t ? "#fff" : "#6b7280" }}>
            {t === "users" ? "Users" : "Permission Matrix"}
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <>
          {/* Role legend */}
          <div className="flex items-center gap-2 flex-wrap">
            {["Super Admin", "Pharmacy Manager", "Pharmacist", "Billing Operator", "Inventory Manager", "Store Keeper"].map(role => (
              <span key={role} className="text-[11px] font-medium px-2.5 py-1 rounded-none border border-[#e5e7eb] bg-white text-[#374151]">{role}</span>
            ))}
          </div>

          <div className="bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
            <table>
              <thead><tr><th>User</th><th>Role</th><th>Branch</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-none flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: "#eff6ff", color: "#4f46e5" }}>{u.avatar}</div>
                        <div>
                          <p className="font-semibold text-[13px] text-[#111827]">{u.name}</p>
                          <p className="text-[11px] text-[#9ca3af]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-[12px] font-medium px-2.5 py-1 rounded-none" style={{ background: "#f9fafb", color: "#374151" }}>{u.role}</span>
                    </td>
                    <td className="text-[13px] text-[#374151]">{u.branch}</td>
                    <td className="text-[12px] text-[#6b7280]">{u.lastLogin}</td>
                    <td><StatusBadge status={u.status} size="sm" /></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded hover:bg-[#eff6ff] text-[#4f46e5] transition-colors" title="Edit"><Edit2 size={13} /></button>
                        <button className="p-1.5 rounded hover:bg-[#faf5ff] text-[#7c3aed] transition-colors" title="Permissions"><Shield size={13} /></button>
                        <button className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#6b7280] transition-colors" title="Toggle">
                          {u.status === "active" ? <ToggleRight size={14} style={{ color: "#16a34a" }} /> : <ToggleLeft size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f3f4f6] flex items-center gap-3">
            <Shield size={16} className="text-[#7c3aed]" />
            <p className="font-semibold text-[14px] text-[#111827]">Pharmacist Role Permissions</p>
            <select className="ml-auto text-[13px] px-3 py-1.5 rounded-none border border-[#e5e7eb] focus:border-[#4f46e5] focus:outline-none">
              <option>Pharmacist</option><option>Pharmacy Manager</option><option>Billing Operator</option>
              <option>Inventory Manager</option><option>Store Keeper</option>
            </select>
          </div>
          <table>
            <thead><tr>
              <th>Module</th>
              {["View", "Create", "Edit", "Delete", "Approve"].map(p => <th key={p} className="text-center">{p}</th>)}
            </tr></thead>
            <tbody>
              {permMatrix.map(row => (
                <tr key={row.module}>
                  <td className="font-semibold text-[13px] text-[#111827]">{row.module}</td>
                  {(["view", "create", "edit", "delete", "approve"] as const).map(perm => (
                    <td key={perm} className="text-center">
                      <span className="text-[15px]" style={{ color: row[perm] ? "#15803d" : "#e5e7eb" }}>
                        {row[perm] ? "✓" : "—"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.6)" }}>
          <div className="bg-white rounded-none shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
              <p className="font-bold text-[16px] text-[#111827]">Add New User</p>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-none hover:bg-[#f3f4f6] text-[#9ca3af]"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {["Full Name", "Email Address", "Phone Number"].map(l => (
                <div key={l}>
                  <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">{l} *</label>
                  <input className="w-full px-3 py-2 rounded-none border border-[#e5e7eb] text-[13px] focus:border-[#4f46e5] focus:outline-none transition-colors" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Role *</label>
                  <select className="w-full px-3 py-2 rounded-none border border-[#e5e7eb] text-[13px] focus:border-[#4f46e5] focus:outline-none">
                    <option>Pharmacist</option><option>Pharmacy Manager</option><option>Billing Operator</option><option>Inventory Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Branch *</label>
                  <select className="w-full px-3 py-2 rounded-none border border-[#e5e7eb] text-[13px] focus:border-[#4f46e5] focus:outline-none">
                    <option>Main Branch</option><option>Branch 2</option><option>All Branches</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="flex-1 py-2.5 rounded-none text-white font-semibold text-[13px]" style={{ background: "#4f46e5" }}>Create User</button>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-none border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
