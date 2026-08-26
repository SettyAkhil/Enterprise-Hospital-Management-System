import React, { useEffect, useState } from 'react';
import { Icon } from './icons';
import { apiFetch, reportError } from '../lib/api';
import type { Notice } from '../types';

interface QueueManagementProps {
  onStartConsultation?: () => void;
}

type QueueEntry = {
  id: number;
  patient_id: string;
  patient_name: string;
  doctor_name: string | null;
  department: string | null;
  status: string;
  token_no: number | null;
  appointment_date: string;
  symptom_severity: string | null;
};

function getStatusBadge(status: string) {
  switch (status) {
    case 'in_consultation': return <span className="bg-[#DBEAFE] text-[#1E3A8A] text-[10px] font-bold px-2 py-0.5 rounded uppercase">In Consult</span>;
    case 'checked_in': return <span className="bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold px-2 py-0.5 rounded uppercase">Checked In</span>;
    case 'scheduled': return <span className="bg-[#F1F5F9] text-[#475569] text-[10px] font-bold px-2 py-0.5 rounded uppercase">Waiting</span>;
    default: return <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{status}</span>;
  }
}

function waitTime(appointmentDate: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(appointmentDate).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function QueueManagement({ onStartConsultation }: QueueManagementProps) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch<{ queue: QueueEntry[] }>("/api/queue")
      .then((data) => setQueue(data.queue || []))
      .catch((error) => reportError(setNotice, error, "Unable to load queue."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const departments = Array.from(new Set(queue.map((q) => q.department).filter(Boolean))) as string[];
  const filtered = queue.filter((q) => {
    if (selectedDept !== "All Departments" && q.department !== selectedDept) return false;
    if (search.trim() && !q.patient_name.toLowerCase().includes(search.trim().toLowerCase()) && !String(q.token_no).includes(search.trim())) return false;
    return true;
  });

  const waiting = queue.filter((q) => q.status === "scheduled").length;
  const inConsult = queue.filter((q) => q.status === "in_consultation").length;
  const avgWait = queue.length > 0
    ? Math.round(queue.reduce((sum, q) => sum + (Date.now() - new Date(q.appointment_date).getTime()) / 60000, 0) / queue.length)
    : 0;
  const nowCalling = queue.find((q) => q.status === "in_consultation") || queue.find((q) => q.status === "checked_in");

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      await apiFetch(`/api/appointments/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
      load();
      onStartConsultation?.();
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to update queue entry.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Queue Management</h1>
          <p className="text-[12.5px] text-[#64748B]">Live outpatient queue from the connected database.</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8]"
          >
            <option>All Departments</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
          <button onClick={load} disabled={loading} className="px-4 py-1.5 bg-[#1B4FD8] text-white text-[13px] font-medium rounded hover:bg-[#1740B4] transition-colors flex items-center gap-2 disabled:opacity-50">
            <Icon.Refresh /> {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {notice && (
        <div className={`p-3 mx-6 mt-3 rounded-lg text-[12px] font-medium flex items-center justify-between ${notice.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
          <span>{notice.message}</span>
          <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 flex gap-6 max-w-7xl mx-auto w-full">
        {/* Left Side: Active Queue */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
              <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Waiting</div>
              <div className="text-2xl font-bold text-gray-900">{loading ? "—" : waiting}</div>
            </div>
            <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
              <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">In Consult</div>
              <div className="text-2xl font-bold text-[#1B4FD8]">{loading ? "—" : inConsult}</div>
            </div>
            <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
              <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Avg Wait Time</div>
              <div className="text-2xl font-bold text-gray-900">{loading ? "—" : `${avgWait}m`}</div>
            </div>
          </div>

          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <h2 className="text-[14px] font-semibold text-gray-900">Current Queue — {selectedDept}</h2>
              <div className="relative">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search token or patient..." className="pl-8 pr-3 py-1 text-[12px] border border-[#DDE2EC] rounded bg-white focus:outline-none focus:border-[#1B4FD8]" />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"><Icon.Search /></span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-[#DDE2EC] sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Token</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Doctor</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Severity</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Wait</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-[#94A3B8] text-[12.5px]">No patients in queue.</td></tr>
                  )}
                  {filtered.map((row) => {
                    const urgent = row.symptom_severity === "severe" || row.symptom_severity === "critical";
                    return (
                      <tr key={row.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-5 py-3 text-[13px] font-bold text-gray-900">#{row.token_no ?? "—"}</td>
                        <td className="px-5 py-3 text-[13px] font-medium text-gray-800">{row.patient_name}</td>
                        <td className="px-5 py-3 text-[12.5px] text-gray-600">{row.doctor_name || "Unassigned"}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[11.5px] flex items-center gap-1 capitalize ${urgent ? 'text-[#DC2626] font-semibold' : 'text-gray-600'}`}>
                            {urgent && <Icon.Alert />} {row.symptom_severity || "moderate"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[12.5px] text-gray-600">{waitTime(row.appointment_date)}</td>
                        <td className="px-5 py-3">{getStatusBadge(row.status)}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {row.status === 'scheduled' && (
                              <button
                                onClick={() => void updateStatus(row.id, "checked_in")}
                                disabled={updating === row.id}
                                className="text-[11px] font-semibold text-white bg-[#1B4FD8] hover:bg-[#1740B4] px-2.5 py-1 rounded shadow-xs disabled:opacity-50"
                              >
                                Call ➔
                              </button>
                            )}
                            {row.status === 'checked_in' && (
                              <button
                                onClick={() => void updateStatus(row.id, "in_consultation")}
                                disabled={updating === row.id}
                                className="text-[11px] font-semibold text-white bg-[#D97706] hover:bg-[#B45309] px-2.5 py-1 rounded shadow-xs disabled:opacity-50"
                              >
                                Consult ➔
                              </button>
                            )}
                            {row.status === 'in_consultation' && (
                              <button
                                onClick={() => onStartConsultation?.()}
                                className="text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-2.5 py-1 rounded"
                              >
                                Active ➔
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Now Calling Display */}
        <div className="w-80 flex flex-col gap-6">
          <div className="bg-[#0F172A] rounded-xl shadow-xl overflow-hidden flex flex-col">
             <div className="bg-[#1E293B] p-3 text-center border-b border-white/10">
               <h3 className="text-white text-[13px] font-semibold tracking-widest uppercase">Waiting Room Display</h3>
             </div>
             <div className="p-6 text-center text-white">
                <div className="text-[12px] text-[#94A3B8] uppercase tracking-wider mb-2">Now Calling</div>
                {nowCalling ? (
                  <>
                    <div className="text-5xl font-bold text-[#38BDF8] mb-2">#{nowCalling.token_no ?? "—"}</div>
                    <div className="text-[15px] font-medium text-white mb-6">{nowCalling.patient_name}</div>
                  </>
                ) : (
                  <div className="text-[13px] text-[#64748B] mb-6">No one currently called</div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
