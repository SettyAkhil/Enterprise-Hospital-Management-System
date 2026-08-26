import React, { useState, useEffect } from 'react';
import { Icon } from './icons';
import { db, DBOPEncounter } from '../services/db';

export default function OPManagement() {
  const [encounters, setEncounters] = useState<DBOPEncounter[]>([]);

  const refreshFromDb = () => {
    setEncounters(db.getEncounters());
  };

  useEffect(() => {
    refreshFromDb();
    const unsubscribe = db.subscribe(refreshFromDb);
    return () => unsubscribe();
  }, []);

  const totalVisits = encounters.length;
  const waitingCount = encounters.filter(e => ["Registered", "In Queue", "Doctor Assigned", "Awaiting Doctor"].includes(e.status)).length;
  const consultingCount = encounters.filter(e => ["Under Consultation", "Consultation Completed", "Post-Consultation"].includes(e.status)).length;
  const completedCount = encounters.filter(e => ["OP Completed", "Billing Completed"].includes(e.status)).length;
  const billingCount = encounters.filter(e => e.status === "Awaiting Billing").length;

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
          <button onClick={() => window.print()} className="h-8 px-3 bg-white border border-[#DDE2EC] text-[#1B4FD8] text-[12px] font-medium rounded hover:bg-[#F8FAFC] transition-colors">
            Export Report
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Top Live Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Total OP Encounters", val: totalVisits.toString(), trend: "Live DB", color: "text-blue-600" },
              { label: "Currently Waiting / Queue", val: waitingCount.toString(), trend: "Active", color: "text-amber-600" },
              { label: "In Consultation", val: consultingCount.toString(), trend: "Live", color: "text-purple-600" },
              { label: "Awaiting Billing", val: billingCount.toString(), trend: "Pending", color: "text-orange-600" },
              { label: "OP Completed Visits", val: completedCount.toString(), trend: "Archived", color: "text-green-600" },
            ].map((stat, i) => (
              <div key={i} className="bg-white border-2 border-[#CBD5E1] p-4 rounded-xl shadow-sm">
                <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">{stat.label}</div>
                <div className="flex items-end justify-between">
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.val}</div>
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
                <h2 className="text-[14px] font-semibold text-gray-900">Department Capacity &amp; Live Load</h2>
                <span className="text-[11px] font-medium text-[#64748B]">Real-time OPD Allocation</span>
              </div>
              <table className="w-full text-left">
                <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA]">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Department</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Active Drs</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">DB Patient Load</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Capacity Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {[
                    { dept: "General Medicine", drs: "2 Doctors (♂/♀)", wait: encounters.filter(e => e.dept === "General Medicine").length, status: "Normal", load: 60 },
                    { dept: "Cardiology", drs: "2 Doctors (♂/♀)", wait: encounters.filter(e => e.dept === "Cardiology").length, status: "High", load: 85 },
                    { dept: "Pulmonology", drs: "2 Doctors (♂/♀)", wait: encounters.filter(e => e.dept === "Pulmonology").length, status: "Normal", load: 45 },
                    { dept: "Orthopedics", drs: "2 Doctors (♂/♀)", wait: encounters.filter(e => e.dept === "Orthopedics").length, status: "Normal", load: 40 },
                    { dept: "Pediatrics", drs: "2 Doctors (♂/♀)", wait: encounters.filter(e => e.dept === "Pediatrics").length, status: "Low", load: 25 },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC]">
                      <td className="px-5 py-3 text-[13px] font-semibold text-gray-900">{row.dept}</td>
                      <td className="px-5 py-3 text-[12.5px] text-gray-700">{row.drs}</td>
                      <td className="px-5 py-3 text-[12.5px] font-mono font-bold text-gray-900">{row.wait} records</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-20 px-2 py-0.5 text-[10px] font-bold text-center rounded uppercase tracking-wider ${
                            row.status === 'Overloaded' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                            row.status === 'High' ? 'bg-[#FEF3C7] text-[#92400E]' :
                            'bg-[#DCFCE7] text-[#15803D]'
                          }`}>{row.status}</span>
                          <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div className={`h-full ${row.load > 80 ? 'bg-[#D97706]' : 'bg-[#16A34A]'}`} style={{width: `${row.load}%`}}></div>
                          </div>
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
                <h2 className="text-[14px] font-semibold text-gray-900">OP Workflow Pipeline Tracking</h2>
              </div>
              <div className="flex-1 p-5 relative space-y-4">
                <div className="absolute left-9 top-8 bottom-8 w-0.5 bg-[#E2E8F0]"></div>
                
                {[
                  { label: "1. OP Registration & UMR Check", val: `${encounters.filter(e => e.status === "Registered").length} registered`, icon: <Icon.Patients /> },
                  { label: "2. Symptoms & AI Triage Match", val: `${encounters.filter(e => e.status === "AI Recommended").length} analyzed`, icon: <Icon.TrendUp /> },
                  { label: "3. Doctor Assigned / In Queue", val: `${encounters.filter(e => e.status === "Doctor Assigned" || e.status === "In Queue").length} queued`, icon: <Icon.Stethoscope /> },
                  { label: "4. Consultation & Vitals", val: `${consultingCount} in progress`, icon: <Icon.Clinical /> },
                  { label: "5. Billing & OP Completed", val: `${completedCount} finalized`, icon: <Icon.Billing /> },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#1B4FD8] flex items-center justify-center text-[#1B4FD8] z-10 flex-shrink-0">
                      {step.icon}
                    </div>
                    <div className="mt-0.5">
                      <div className="text-[12.5px] font-semibold text-gray-900">{step.label}</div>
                      <div className="text-[11px] font-mono text-[#64748B]">{step.val}</div>
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
                <h3 className="text-[13.5px] font-bold text-gray-900">Live Database OP Patient Registry</h3>
                <p className="text-[11px] text-[#64748B]">All active and completed outpatient encounters currently recorded in the database.</p>
              </div>
              <span className="text-[11.5px] font-mono font-bold text-[#1B4FD8]">Total: {encounters.length} Encounters</span>
            </div>
            <table className="w-full text-left">
              <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA]">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Permanent UMR</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Visit OP No</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient Name</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Gender</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Department</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Assigned Doctor</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Queue Token</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                {encounters.slice(0, 8).map((enc, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-mono font-bold text-[#1B4FD8]">{enc.umr}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#D97706]">{enc.opNumber}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{enc.patientName} ({enc.age} yrs)</td>
                    <td className="px-4 py-3 text-gray-700">{enc.sex}</td>
                    <td className="px-4 py-3 text-gray-700">{enc.dept}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{enc.assignedDoctor || "Unassigned"}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-[#1B4FD8]">{enc.queueToken || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                        enc.status === "OP Completed" ? "bg-[#DCFCE7] text-[#15803D] border border-green-200" :
                        enc.status === "In Queue" ? "bg-[#FEF3C7] text-[#B45309] border border-amber-200" :
                        "bg-[#EFF6FF] text-[#1D4ED8] border border-blue-200"
                      }`}>
                        {enc.status}
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

