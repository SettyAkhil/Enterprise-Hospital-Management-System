import { usePharmacyData } from "../data/usePharmacyData";
import { Fragment, useState, useEffect } from "react";
import { Search, Download, ChevronDown, Shield, ChevronLeft, ChevronRight, History } from "lucide-react";

import PageHeader from "../components/PageHeader";

const actionColors: Record<string, string> = {
  Verified:  "#16a34a",
  Adjusted:  "#d97706",
  Rejected:  "#dc2626",
  Cancelled: "#dc2626",
  Approved:  "#15803d",
  Updated:   "#1B4FD8",
  Created:   "#15803d",
  Deleted:   "#dc2626",
};

interface AuditLogProps { onNavigate: (page: string) => void }

export default function AuditLog({ onNavigate }: AuditLogProps) {
  const {  auditLogs  } = usePharmacyData();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const modules = ["All", "Prescription", "Inventory", "Billing", "Purchase", "Medicine", "User"];
  const filtered = auditLogs.filter(log => {
    const matchSearch = !search || log.user.toLowerCase().includes(search.toLowerCase()) || log.record.includes(search) || log.action.toLowerCase().includes(search.toLowerCase());
    const matchModule = moduleFilter === "All" || log.module === moduleFilter;
    return matchSearch && matchModule;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedLogs = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, moduleFilter, auditLogs.length]);

  const handleExport = () => {
    if (filtered.length === 0) {
      alert("No logs to export.");
      return;
    }
    const headers = ["Timestamp", "User", "Module", "Action", "Record", "IP/Device", "Details"];
    const csvRows = [headers.join(",")];
    
    for (const log of filtered) {
      const row = [
        `"${log.timestamp}"`,
        `"${log.user}"`,
        `"${log.module}"`,
        `"${log.action}"`,
        `"${log.record}"`,
        `"${log.ip ?? ""}"`,
        `"${log.details.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    }
    
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `audit_log_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6F9]">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Administration" }, { label: "Audit Log" }]}
        title={
          <div className="flex items-center gap-2" >
            Audit Log
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Live
            </span>
          </div>
        }
        description="Complete tamper-evident audit trail of all pharmacy transactions and user actions"
        actions={
          <button 
            onClick={handleExport} 
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-sm transition-colors"
          >
            <Download size={14} className="text-[#64748B]" /> Export CSV
          </button>
        }
        onNavigate={onNavigate}
        icon={History} iconBg="bg-slate-600"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search user, record ID, or action..." 
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E2E8F0] text-[13px] bg-[#F8FAFC] focus:bg-white focus:border-[#1B4FD8] focus:outline-none transition-all placeholder:text-[#94A3B8]" 
            />
          </div>
          <div className="flex bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
            {modules.map(m => (
              <button 
                key={m} 
                onClick={() => setModuleFilter(m)} 
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                  moduleFilter === m 
                    ? "bg-white text-[#0F1624] shadow-sm" 
                    : "text-[#64748B] hover:text-[#0F1624]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Log Table Container */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-[#FAFCFF] border-b border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#475569] uppercase tracking-wider">
              Audit Events ({filtered.length})
            </span>
            <span className="text-[11px] text-[#94A3B8]">Immutable Log</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Record ID</th>
                  <th className="px-4 py-3">IP / Device</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[13px]">
                {paginatedLogs.map((log, i) => (
                  <Fragment key={log.id}>
                    <tr onClick={() => setExpanded(expanded === i ? null : i)} className="cursor-pointer hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-[#64748B] whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold font-mono border border-blue-200/60" style={{ background: "#E8EDF5", color: "#1B4FD8" }}>
                            {log.user[0]}
                          </div>
                          <span className="font-semibold text-[#0F1624]">{log.user}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-[#334155]">{log.module}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] font-bold" style={{ color: actionColors[log.action] ?? "#334155" }}>{log.action}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] font-bold text-[#1B4FD8]">{log.record}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#94A3B8]">{log.ip ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="inline-flex items-center gap-1 text-[12px] font-bold text-[#1B4FD8]">
                          Details <ChevronDown size={13} style={{ transform: expanded === i ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
                        </button>
                      </td>
                    </tr>
                    {expanded === i && (
                      <tr>
                        <td colSpan={7} className="p-0 bg-[#F8FAFC]">
                          <div className="px-6 py-4 flex items-start gap-3 border-y border-[#E2E8F0]">
                            <Shield size={16} className="text-[#7c3aed] mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[12px] font-bold text-[#0F1624] uppercase tracking-wider mb-1">Audit Record Payload</p>
                              <p className="text-[13px] text-[#475569] font-mono bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-inner">{log.details}</p>
                              <p className="text-[11px] text-[#94A3B8] mt-1.5 font-mono">Recorded at {log.timestamp} · IP: {log.ip ?? "unknown"}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-[13px] text-[#64748B]">
            <span>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] disabled:opacity-50 transition-colors shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 font-semibold text-[#0F1624]">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] disabled:opacity-50 transition-colors shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
