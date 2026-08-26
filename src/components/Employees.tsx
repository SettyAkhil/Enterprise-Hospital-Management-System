import React, { useEffect, useState } from 'react';
import { Icon } from './icons';
import { apiFetch, reportError } from '../lib/api';
import type { Notice } from '../types';

type Employee = {
  id: number;
  employee_id: string;
  full_name: string;
  department: string | null;
  job_role: string | null;
  status: string;
};

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?";
}

export default function Employees() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch<{ employees: Employee[] }>("/api/employees")
      .then((data) => setEmployees(data.employees || []))
      .catch((error) => reportError(setNotice, error, "Unable to load employees."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter((e) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return e.full_name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q) || (e.department || "").toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Employee Directory</h1>
          <p className="text-[12.5px] text-[#64748B]">Live staff directory from the connected database.</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, or department..." className="pl-8 pr-3 py-1.5 text-[12px] border border-[#DDE2EC] rounded w-64 focus:outline-none focus:border-[#1B4FD8]" />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"><Icon.Search /></span>
          </div>
          <div className="flex bg-[#F1F5F9] p-0.5 rounded border border-[#DDE2EC]">
            <button onClick={() => setView('grid')} className={`p-1 rounded ${view === 'grid' ? 'bg-white shadow-sm' : 'text-[#64748B] hover:text-gray-900'}`}><Icon.Patients /></button>
            <button onClick={() => setView('list')} className={`p-1 rounded ${view === 'list' ? 'bg-white shadow-sm' : 'text-[#64748B] hover:text-gray-900'}`}><Icon.Cmd /></button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mx-6 mt-3 p-3 rounded-lg text-[12px] font-medium flex items-center justify-between flex-shrink-0 bg-red-50 text-red-800 border border-red-200">
          <span>{notice.message}</span>
          <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 flex max-w-7xl mx-auto w-full">
        {!loading && filtered.length === 0 && (
          <div className="w-full text-center py-16 text-[13px] text-[#94A3B8]">No employees found.</div>
        )}

        {loading ? (
          <div className="w-full text-center py-16 text-[13px] text-[#94A3B8]">Loading employees…</div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-4 gap-6 w-full">
            {filtered.map((emp) => (
              <div key={emp.id} className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm overflow-hidden flex flex-col hover:border-[#1B4FD8] cursor-pointer transition-colors">
                <div className="p-5 flex flex-col items-center text-center border-b border-[#DDE2EC]">
                  <div className="w-16 h-16 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center text-xl font-bold mb-3">
                    {initials(emp.full_name)}
                  </div>
                  <h3 className="text-[14px] font-bold text-gray-900">{emp.full_name || "—"}</h3>
                  <div className="text-[12px] text-[#64748B] mb-1">{emp.job_role || "—"}</div>
                  <div className="text-[11px] font-medium text-gray-500">{emp.department || "—"}</div>
                </div>
                <div className="px-5 py-3 bg-[#F8FAFC] flex justify-between items-center text-[11.5px]">
                  <span className="font-mono text-[#64748B]">{emp.employee_id}</span>
                  <span className={`font-semibold flex items-center gap-1.5 capitalize ${emp.status === 'active' ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                    <div className={`w-2 h-2 rounded-full ${emp.status === 'active' ? 'bg-[#16A34A]' : 'bg-[#94A3B8]'}`}></div>
                    {emp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm w-full overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC] border-b border-[#DDE2EC]">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Employee ID</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Department</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#F8FAFC] cursor-pointer">
                    <td className="px-5 py-4 text-[12.5px] font-mono text-[#64748B]">{emp.employee_id}</td>
                    <td className="px-5 py-4 text-[13px] font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center text-[11px] font-bold">
                        {initials(emp.full_name)}
                      </div>
                      {emp.full_name || "—"}
                    </td>
                    <td className="px-5 py-4 text-[12.5px] text-gray-700">{emp.job_role || "—"}</td>
                    <td className="px-5 py-4 text-[12.5px] text-gray-700">{emp.department || "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 text-[10.5px] font-bold rounded uppercase tracking-wider capitalize ${emp.status === 'active' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F1F5F9] text-[#475569]'}`}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
