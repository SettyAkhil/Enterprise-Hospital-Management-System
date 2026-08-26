import React, { useEffect, useState } from 'react';
import { Icon } from './icons';
import { apiFetch, reportError } from '../lib/api';
import type { Notice } from '../types';

type Appointment = {
  id: number;
  patient_id: string;
  patient_name: string;
  patient_gender: string | null;
  patient_age: number | null;
  department: string | null;
  doctor_name: string | null;
  token_no: number | null;
  status: string;
  created_at: string;
};

type Doctor = { doctor_name: string; department: string; status: string };

export default function OPManagement() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch<{ appointments: Appointment[] }>("/api/appointments?visit_type=OP"),
      apiFetch<{ doctors: Doctor[] }>("/api/op/doctors"),
    ])
      .then(([apptRes, docRes]) => {
        setAppointments(apptRes.appointments || []);
        setDoctors(docRes.doctors || []);
      })
      .catch((error) => reportError(setNotice, error, "Unable to load OP data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totalVisits = appointments.length;
  const waitingCount = appointments.filter(a => a.status === "scheduled").length;
  const checkedInCount = appointments.filter(a => a.status === "checked_in").length;
  const consultingCount = appointments.filter(a => a.status === "in_consultation").length;
  const completedCount = appointments.filter(a => a.status === "completed").length;
  const assignedCount = appointments.filter(a => a.doctor_name).length;

  const departments = Array.from(new Set([
    ...appointments.map(a => a.department).filter(Boolean),
    ...doctors.map(d => d.department).filter(Boolean),
  ])) as string[];

  const deptRows = departments.map(dept => {
    const load = appointments.filter(a => a.department === dept).length;
    const activeDrs = doctors.filter(d => d.department === dept && d.status === "active").length;
    const pct = totalVisits > 0 ? Math.round((load / totalVisits) * 100) : 0;
    const status = pct > 30 ? "High" : pct > 10 ? "Normal" : "Low";
    return { dept, load, activeDrs, pct, status };
  }).sort((a, b) => b.load - a.load);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">OP Management</h1>
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
              Live Database Connected
            </span>
          </div>
          <p className="text-[12.5px] text-[#64748B]">High-level coordination of outpatient departments, doctors, and live patient flow.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="h-8 px-3 bg-white border border-[#DDE2EC] text-[#1B4FD8] text-[12px] font-medium rounded hover:bg-[#F8FAFC] transition-colors disabled:opacity-50">
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button onClick={() => window.print()} className="h-8 px-3 bg-white border border-[#DDE2EC] text-[#1B4FD8] text-[12px] font-medium rounded hover:bg-[#F8FAFC] transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {notice && (
        <div className={`mx-6 mt-3 p-3 rounded-lg text-[12px] font-medium flex items-center justify-between ${notice.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
          <span>{notice.message}</span>
          <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Top Live Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Total OP Visits", val: totalVisits.toString(), trend: "Live DB", color: "text-blue-600" },
              { label: "Waiting / Scheduled", val: waitingCount.toString(), trend: "Active", color: "text-amber-600" },
              { label: "Checked In", val: checkedInCount.toString(), trend: "Active", color: "text-sky-600" },
              { label: "In Consultation", val: consultingCount.toString(), trend: "Live", color: "text-purple-600" },
              { label: "Completed", val: completedCount.toString(), trend: "Archived", color: "text-green-600" },
            ].map((stat, i) => (
              <div key={i} className="bg-white border-2 border-[#CBD5E1] p-4 rounded-xl shadow-sm">
                <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">{stat.label}</div>
                <div className="flex items-end justify-between">
                  <div className={`text-2xl font-bold ${stat.color}`}>{loading ? "—" : stat.val}</div>
                  <div className="text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                    {stat.trend}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department Load */}
            <div className="lg:col-span-2 bg-white border-2 border-[#CBD5E1] rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
                <h2 className="text-[14px] font-semibold text-gray-900">Department Load</h2>
                <span className="text-[11px] font-medium text-[#64748B]">Share of all OP visits on record</span>
              </div>
              <table className="w-full text-left">
                <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA]">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Department</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Active Drs</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Visit Count</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Load Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {!loading && deptRows.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-[#94A3B8]">No OP visits on record yet.</td></tr>
                  )}
                  {deptRows.map((row) => (
                    <tr key={row.dept} className="hover:bg-[#F8FAFC]">
                      <td className="px-5 py-3 text-[13px] font-semibold text-gray-900">{row.dept}</td>
                      <td className="px-5 py-3 text-[12.5px] text-gray-700">{row.activeDrs}</td>
                      <td className="px-5 py-3 text-[12.5px] font-mono font-bold text-gray-900">{row.load} visits</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-16 px-2 py-0.5 text-[10px] font-bold text-center rounded uppercase tracking-wider ${
                            row.status === 'High' ? 'bg-[#FEF3C7] text-[#92400E]' :
                            row.status === 'Normal' ? 'bg-[#DCFCE7] text-[#15803D]' :
                            'bg-[#F1F5F9] text-[#64748B]'
                          }`}>{row.status}</span>
                          <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div className={`h-full ${row.pct > 30 ? 'bg-[#D97706]' : 'bg-[#16A34A]'}`} style={{ width: `${row.pct}%` }}></div>
                          </div>
                          <span className="text-[10.5px] font-mono text-[#64748B] w-8 text-right">{row.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Workflow Pipeline */}
            <div className="bg-white border-2 border-[#CBD5E1] rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC]">
                <h2 className="text-[14px] font-semibold text-gray-900">OP Workflow Pipeline</h2>
              </div>
              <div className="flex-1 p-5 relative space-y-4">
                <div className="absolute left-9 top-8 bottom-8 w-0.5 bg-[#E2E8F0]"></div>

                {[
                  { label: "1. Scheduled / Registered", val: `${waitingCount} waiting`, icon: <Icon.Patients /> },
                  { label: "2. Checked In", val: `${checkedInCount} checked in`, icon: <Icon.TrendUp /> },
                  { label: "3. Doctor Assigned", val: `${assignedCount} assigned`, icon: <Icon.Stethoscope /> },
                  { label: "4. In Consultation", val: `${consultingCount} in progress`, icon: <Icon.Clinical /> },
                  { label: "5. Completed", val: `${completedCount} finalized`, icon: <Icon.Billing /> },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#1B4FD8] flex items-center justify-center text-[#1B4FD8] z-10 flex-shrink-0">
                      {step.icon}
                    </div>
                    <div className="mt-0.5">
                      <div className="text-[12.5px] font-semibold text-gray-900">{step.label}</div>
                      <div className="text-[11px] font-mono text-[#64748B]">{loading ? "—" : step.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Live Registered Encounters Table */}
          <div className="bg-white border-2 border-[#CBD5E1] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <div>
                <h3 className="text-[13.5px] font-bold text-gray-900">OP Patient Registry</h3>
                <p className="text-[11px] text-[#64748B]">All active and completed outpatient visits currently recorded in the database.</p>
              </div>
              <span className="text-[11.5px] font-mono font-bold text-[#1B4FD8]">Total: {appointments.length} Visits</span>
            </div>
            <table className="w-full text-left">
              <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA]">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient ID</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Token</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient Name</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Gender</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Department</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Assigned Doctor</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                {!loading && appointments.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[#94A3B8]">No OP visits recorded yet.</td></tr>
                )}
                {appointments.slice(0, 8).map((enc) => (
                  <tr key={enc.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-mono font-bold text-[#1B4FD8]">{enc.patient_id}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#D97706]">#{enc.token_no ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{enc.patient_name} {enc.patient_age != null ? `(${enc.patient_age} yrs)` : ""}</td>
                    <td className="px-4 py-3 text-gray-700">{enc.patient_gender || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{enc.department || "—"}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{enc.doctor_name || "Unassigned"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold capitalize ${
                        enc.status === "completed" ? "bg-[#DCFCE7] text-[#15803D] border border-green-200" :
                        enc.status === "scheduled" ? "bg-[#FEF3C7] text-[#B45309] border border-amber-200" :
                        "bg-[#EFF6FF] text-[#1D4ED8] border border-blue-200"
                      }`}>
                        {enc.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
