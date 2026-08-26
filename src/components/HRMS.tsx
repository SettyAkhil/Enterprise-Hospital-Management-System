import React, { useEffect, useState } from 'react';
import { Icon } from './icons';
import { Input, Select, Modal } from './ui';
import { Btn } from './shared';
import { apiFetch, reportError } from '../lib/api';
import type { Notice } from '../types';

type Employee = {
  id: number;
  employee_id: string;
  full_name: string;
  department: string | null;
  job_role: string | null;
  status: string;
  email: string | null;
  phone: string | null;
};

type Stats = { total: number; active: number; inactive: number };
type LeaveRequest = { id: number; employee_id: string; leave_type: string; status: string; start_date: string; end_date: string };

function isDoctor(role: string | null) {
  return (role || "").toLowerCase().includes("doctor");
}
function isNurse(role: string | null) {
  return (role || "").toLowerCase().includes("nurse");
}

function AddEmployeeModal({ onClose, onSaved, setNotice }: { onClose: () => void; onSaved: () => void; setNotice: (n: Notice | null) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!username.trim() || password.length < 8 || !fullName.trim()) {
      setNotice({ type: "warning", message: "Username, full name, and an 8+ character password are required." });
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ success: boolean; message?: string }>("/api/employees", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password, full_name: fullName.trim(), job_role: jobRole, department, email, phone }),
      });
      if (!res.success) {
        setNotice({ type: "error", message: res.message || "Unable to create employee." });
        return;
      }
      setNotice({ type: "success", message: `${fullName} added.` });
      onSaved();
      onClose();
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to create employee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Add Employee">
      <div className="flex flex-col gap-3 p-1">
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">Full Name<Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">Username<Input value={username} onChange={(e) => setUsername(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">Password (8+ chars)<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">Job Role<Input value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="e.g. Doctor, Nurse, Pharmacist" /></label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">Department<Input value={department} onChange={(e) => setDepartment(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">Email<Input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">Phone<Input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <div className="flex justify-end gap-2 mt-2">
          <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn variant="primary" onClick={() => void submit()} disabled={saving}>{saving ? "Saving..." : "Add Employee"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function HRMS() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch<{ employees: Employee[] }>("/api/employees"),
      apiFetch<Stats>("/api/employees/stats"),
      apiFetch<{ leaves: LeaveRequest[] }>("/api/hr/leaves"),
    ])
      .then(([empRes, statsRes, leaveRes]) => {
        setEmployees(empRes.employees || []);
        setStats(statsRes);
        setLeaves(leaveRes.leaves || []);
      })
      .catch((error) => reportError(setNotice, error, "Unable to load HR data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[];
  const deptRows = departments.map((dept) => {
    const staff = employees.filter((e) => e.department === dept);
    return {
      dept,
      doctors: staff.filter((e) => isDoctor(e.job_role)).length,
      nurses: staff.filter((e) => isNurse(e.job_role)).length,
      support: staff.filter((e) => !isDoctor(e.job_role) && !isNurse(e.job_role)).length,
      total: staff.length,
    };
  }).sort((a, b) => b.total - a.total);

  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      {addOpen && <AddEmployeeModal onClose={() => setAddOpen(false)} onSaved={load} setNotice={setNotice} />}

      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Human Resources Management System (HRMS)</h1>
          <p className="text-[12.5px] text-[#64748B]">Live staff, department, and leave data from the connected database.</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="h-8 px-3 bg-[#1B4FD8] text-white text-[12px] font-medium rounded hover:bg-[#1740B4] transition-colors flex items-center gap-2">
          <Icon.Plus /> Add Employee
        </button>
      </div>

      {notice && (
        <div className={`mx-6 mt-3 p-3 rounded-lg text-[12px] font-medium flex items-center justify-between flex-shrink-0 ${notice.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : notice.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
          <span>{notice.message}</span>
          <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Employees", val: stats?.total ?? "—", sub: `${departments.length} departments` },
            { label: "Active", val: stats?.active ?? "—", sub: "Currently active accounts" },
            { label: "Inactive", val: stats?.inactive ?? "—", sub: "Deactivated accounts" },
            { label: "Pending Leave Requests", val: pendingLeaves, sub: `${leaves.length} total requests on file` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
              <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">{stat.label}</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{loading ? "—" : stat.val}</div>
              <div className="text-[11px] text-gray-500">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          <div className="flex-1 bg-white border border-[#DDE2EC] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC]">
              <h2 className="text-[14px] font-semibold text-gray-900">Staff by Department</h2>
            </div>
            <table className="w-full text-left">
              <thead className="border-b border-[#DDE2EC]">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Department</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Doctors</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Nurses</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Other Staff</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {!loading && deptRows.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-[#94A3B8]">No employees with a department on record yet.</td></tr>
                )}
                {deptRows.map((row) => (
                  <tr key={row.dept} className="hover:bg-[#F8FAFC]">
                    <td className="px-5 py-3 text-[13px] font-semibold text-gray-900">{row.dept}</td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-700">{row.doctors}</td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-700">{row.nurses}</td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-700">{row.support}</td>
                    <td className="px-5 py-3 text-[12.5px] font-bold text-gray-900">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="w-80 flex flex-col gap-6">
            <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm p-4">
              <h3 className="text-[13px] font-semibold text-gray-900 mb-3">Leave Requests</h3>
              {leaves.length === 0 ? (
                <div className="text-[12px] text-[#94A3B8] py-2">No leave requests on file.</div>
              ) : (
                <div className="space-y-2">
                  {leaves.slice(0, 6).map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-[#F1F5F9] last:border-0">
                      <div>
                        <div className="font-medium text-gray-800">{l.employee_id}</div>
                        <div className="text-[11px] text-[#64748B]">{l.leave_type} · {l.start_date} – {l.end_date}</div>
                      </div>
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded uppercase ${l.status === "approved" ? "bg-[#DCFCE7] text-[#15803D]" : l.status === "rejected" ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-[#FEF3C7] text-[#92400E]"}`}>{l.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
