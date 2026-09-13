import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { Search, Download, ChevronDown, Shield } from "lucide-react";

import PageHeader from "../components/PageHeader";

const actionColors: Record<string, string> = {
  Verified:  "#16a34a",
  Adjusted:  "#d97706",
  Rejected:  "#dc2626",
  Cancelled: "#dc2626",
  Approved:  "#15803d",
  Updated:   "#4f46e5",
  Created:   "#15803d",
  Deleted:   "#dc2626",
};

interface AuditLogProps { onNavigate: (page: string) => void }

export default function AuditLog({ onNavigate }: AuditLogProps) {
  const {  auditLogs  } = usePharmacyData();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");

  const modules = ["All", "Prescription", "Inventory", "Billing", "Purchase", "Medicine", "User"];
  const filtered = auditLogs.filter(log => {
    const matchSearch = !search || log.user.toLowerCase().includes(search.toLowerCase()) || log.record.includes(search) || log.action.toLowerCase().includes(search.toLowerCase());
    const matchModule = moduleFilter === "All" || log.module === moduleFilter;
    return matchSearch && matchModule;
  });

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Administration" }, { label: "Audit Log" }]}
        title="Audit Log"
        description="Complete trail of all system actions and changes"
        actions={
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-none border border-[#e5e7eb] bg-white text-[13px] text-[#374151] hover:bg-[#f9fafb] transition-colors">
            <Download size={13} /> Export
          </button>
        }
        onNavigate={onNavigate}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-none px-3 py-2">
          <Search size={14} className="text-[#9ca3af]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, record, action…" className="text-[13px] outline-none text-[#111827] placeholder:text-[#9ca3af] w-48" />
        </div>
        <div className="flex gap-1">
          {modules.map(m => (
            <button key={m} onClick={() => setModuleFilter(m)} className="px-3 py-1.5 rounded-none text-[12px] font-medium transition-colors border border-[#e5e7eb]" style={{ background: moduleFilter === m ? "#111827" : "#fff", color: moduleFilter === m ? "#fff" : "#6b7280" }}>
              {m}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <input type="date" defaultValue="2026-09-12" className="px-3 py-2 rounded-none border border-[#e5e7eb] text-[13px] bg-white focus:border-[#4f46e5] focus:outline-none" />
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
        <table>
          <thead><tr>
            <th>Timestamp</th><th>User</th><th>Module</th><th>Action</th><th>Record</th><th>IP / Device</th><th>Details</th>
          </tr></thead>
          <tbody>
            {filtered.map((log, i) => (
              <>
                <tr key={i} onClick={() => setExpanded(expanded === i ? null : i)} className="cursor-pointer">
                  <td className="font-mono text-[11px] text-[#6b7280] whitespace-nowrap">{log.timestamp}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-none flex items-center justify-center text-[10px] font-bold" style={{ background: "#eff6ff", color: "#4f46e5" }}>{log.user[0]}</div>
                      <span className="text-[13px] font-medium text-[#111827]">{log.user}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-none" style={{ background: "#f9fafb", color: "#374151" }}>{log.module}</span>
                  </td>
                  <td>
                    <span className="text-[12px] font-bold" style={{ color: actionColors[log.action] ?? "#374151" }}>{log.action}</span>
                  </td>
                  <td className="font-mono text-[12px] font-semibold" style={{ color: "#4f46e5" }}>{log.record}</td>
                  <td className="font-mono text-[11px] text-[#9ca3af]">{log.ip}</td>
                  <td>
                    <button className="flex items-center gap-1 text-[12px] font-medium" style={{ color: "#4f46e5" }}>
                      Details <ChevronDown size={12} style={{ transform: expanded === i ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
                    </button>
                  </td>
                </tr>
                {expanded === i && (
                  <tr key={`exp-${i}`}>
                    <td colSpan={7} style={{ background: "#f9fafb", padding: 0 }}>
                      <div className="px-14 py-3 flex items-start gap-3">
                        <Shield size={13} className="text-[#7c3aed] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[12px] font-medium text-[#111827] mb-1">Change Details</p>
                          <p className="text-[12px] text-[#6b7280]">{log.details}</p>
                          <p className="text-[11px] text-[#9ca3af] mt-1">Recorded at {log.timestamp} · IP: {log.ip}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
