import React, { useState, useEffect } from 'react';
import { Icon } from './icons';
import { db, DBOPEncounter } from '../services/db';

interface OPManagementProps {
  onStartWorkflow?: () => void;
  onNavigateQueue?: () => void;
  onNavigateAppointments?: () => void;
  onNavigateRegistration?: () => void;
}

export default function OPManagement({
  onStartWorkflow,
  onNavigateQueue,
  onNavigateAppointments,
  onNavigateRegistration
}: OPManagementProps) {
  const [encounters, setEncounters] = useState<DBOPEncounter[]>([]);

  const refresh = () => {
    setEncounters(db.getEncounters());
  };

  useEffect(() => {
    refresh();
    const unsub = db.subscribe(refresh);
    return () => unsub();
  }, []);

  const totalPatients = encounters.length;
  const newPatientsCount = encounters.filter(e => e.isNew).length;
  const revisitCount = encounters.filter(e => !e.isNew).length;
  const inConsultCount = encounters.filter(e => e.status === "Under Consultation").length;
  const inQueueCount = encounters.filter(e => e.status === "In Queue" || e.status === "Registered").length;
  const completedCount = encounters.filter(e => e.status === "OP Completed").length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-900">Outpatient (OP) Department Dashboard</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
              Live Database Sync
            </span>
          </div>
          <p className="text-[11.5px] text-[#64748B] mt-0.5">
            Real-time outpatient coordination, UMR/OP encounter tracking, doctor capacity, and connected patient workflow.
          </p>
        </div>
        <div className="flex gap-2">
          {onNavigateRegistration && (
            <button
              onClick={onNavigateRegistration}
              className="h-8 px-3 bg-white border border-[#DDE2EC] text-[#16A34A] text-[12px] font-semibold rounded-lg hover:bg-[#F8FAFC] transition-colors flex items-center gap-1.5"
            >
              <Icon.Plus /> + Register OP Patient
            </button>
          )}
          {onNavigateQueue && (
            <button
              onClick={onNavigateQueue}
              className="h-8 px-3 bg-white border border-[#DDE2EC] text-[#1B4FD8] text-[12px] font-semibold rounded-lg hover:bg-[#F8FAFC] transition-colors flex items-center gap-1.5"
            >
              <Icon.Clock /> Live Queue Board
            </button>
          )}
          {onStartWorkflow && (
            <button
              onClick={onStartWorkflow}
              className="h-8 px-4 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12px] font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Icon.Plus /> Start New OP Patient Journey
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Top Operational Stats from Database */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
            {[
              { label: "Total OP Patients", val: totalPatients.toString(), sub: "Database encounters", color: "text-gray-900" },
              { label: "New Patients", val: newPatientsCount.toString(), sub: "New UMRs created", color: "text-[#1B4FD8]" },
              { label: "Existing Patients", val: revisitCount.toString(), sub: "Revisit encounters", color: "text-[#6366F1]" },
              { label: "In Consultation", val: inConsultCount.toString(), sub: "Active doctors", color: "text-[#D97706]" },
              { label: "Awaiting / Queue", val: inQueueCount.toString(), sub: "In OP queue", color: "text-[#DC2626]" },
              { label: "Completed Visits", val: completedCount.toString(), sub: "Encounter closed", color: "text-[#16A34A]" },
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-[#DDE2EC] p-3.5 rounded-xl shadow-xs">
                <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">{stat.label}</div>
                <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.val}</div>
                <div className="text-[10.5px] text-[#94A3B8] mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Department Capacity & Active Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Department Load */}
            <div className="bg-white border border-[#DDE2EC] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-[#F1F5F9] pb-3">
                <h2 className="text-[13.5px] font-bold text-gray-900">OP Department Load (FR-011)</h2>
                <span className="text-[11px] text-[#64748B]">Capacity %</span>
              </div>
              <div className="space-y-3.5">
                {[
                  { name: "Cardiology", current: 8, max: 10, pct: 80, color: "bg-[#DC2626]" },
                  { name: "General Medicine", current: 14, max: 20, pct: 70, color: "bg-[#D97706]" },
                  { name: "Orthopedics", current: 5, max: 10, pct: 50, color: "bg-[#16A34A]" },
                  { name: "Pulmonology", current: 4, max: 8, pct: 50, color: "bg-[#16A34A]" },
                  { name: "Pediatrics", current: 3, max: 10, pct: 30, color: "bg-[#1B4FD8]" },
                ].map((dept, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[12px]">
                      <span className="font-medium text-gray-800">{dept.name}</span>
                      <span className="font-mono text-[#64748B]">{dept.current} / {dept.max} ({dept.pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${dept.color}`} style={{ width: `${dept.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Doctor Roster & Status */}
            <div className="bg-white border border-[#DDE2EC] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-[#F1F5F9] pb-3">
                <h2 className="text-[13.5px] font-bold text-gray-900">Consulting Roster (FR-012)</h2>
                <span className="text-[11px] text-[#16A34A] font-bold">5 On Duty</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { name: "Dr. Rajesh Sharma", spec: "Cardiology", room: "Room 104", status: "Busy", queue: 4 },
                  { name: "Dr. Sarah Jenkins", spec: "Cardiology", room: "Room 102", status: "Available", queue: 1 },
                  { name: "Dr. Anita Desai", spec: "Gen Medicine", room: "Room 101", status: "Available", queue: 2 },
                  { name: "Dr. Michael Chen", spec: "Pulmonology", room: "Room 108", status: "Available", queue: 0 },
                  { name: "Dr. David Anderson", spec: "Orthopedics", room: "Room 112", status: "Busy", queue: 3 },
                ].map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[12px]">
                    <div>
                      <div className="font-semibold text-gray-900">{doc.name}</div>
                      <div className="text-[11px] text-[#64748B]">{doc.spec} · {doc.room}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        doc.status === "Available" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3C7] text-[#B45309]"
                      }`}>
                        {doc.status}
                      </span>
                      <div className="text-[10.5px] text-[#64748B] font-mono mt-0.5">Queue: {doc.queue}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Flow Actions */}
            <div className="bg-gradient-to-br from-[#0C1524] to-[#1E2D42] text-white rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono text-[#93C5FD] uppercase font-bold tracking-wider mb-1">
                  Keppler Healthcare Spec
                </div>
                <h3 className="text-base font-bold mb-2">Connected Outpatient Clinical Journey</h3>
                <p className="text-[12px] text-[#94A3B8] leading-relaxed mb-4">
                  Step-by-step 11-stage workflow managing UMR permanent IDs, visit OP numbers, symptom NLP matching, doctor assignment, vitals and billing.
                </p>
                <div className="space-y-1.5 text-[11.5px] text-[#CBD5E1]">
                  <div className="flex items-center gap-2"><span>✓</span> 1 Permanent UMR Across Lifetime Visits</div>
                  <div className="flex items-center gap-2"><span>✓</span> Unique Per-Visit OP Number Generated</div>
                  <div className="flex items-center gap-2"><span>✓</span> AI Doctor Recommendation with Gender Pref</div>
                  <div className="flex items-center gap-2"><span>✓</span> Permanent Database Storage &amp; Audit Logs</div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/10 flex gap-2">
                {onStartWorkflow && (
                  <button
                    onClick={onStartWorkflow}
                    className="flex-1 py-2.5 bg-[#1B59F8] hover:bg-[#1546CC] text-white text-[12.5px] font-bold rounded-lg shadow-sm transition-all text-center"
                  >
                    Open OP Journey Wizard →
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Today's Outpatient Encounters Table */}
          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <div>
                <h2 className="text-[13.5px] font-bold text-gray-900">Today's Database Outpatient Encounters</h2>
                <p className="text-[11.5px] text-[#64748B]">All active visits across hospital departments with permanent UMR mapping.</p>
              </div>
              <span className="text-[11.5px] text-[#1B4FD8] font-semibold font-mono">
                {encounters.length} Total Encounters
              </span>
            </div>

            <table className="w-full text-left">
              <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA]">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Permanent UMR</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Visit OP No</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient Name</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Department</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Doctor</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Time</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                {encounters.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#1B4FD8]">{row.umr}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#D97706]">{row.opNumber}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.patientName} ({row.age} {row.sex})</td>
                    <td className="px-4 py-3 text-gray-700">{row.dept}</td>
                    <td className="px-4 py-3 text-gray-700">{row.assignedDoctor}</td>
                    <td className="px-4 py-3 font-mono text-gray-500">{row.registrationTime}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                        row.status === "Under Consultation" ? "bg-[#DBEAFE] text-[#1E3A8A]" :
                        row.status === "In Queue" ? "bg-[#FEF3C7] text-[#92400E]" :
                        row.status === "OP Completed" ? "bg-[#DCFCE7] text-[#15803D]" :
                        "bg-[#F1F5F9] text-gray-700"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={onStartWorkflow}
                        className="text-[11.5px] font-semibold text-[#1B4FD8] hover:underline"
                      >
                        Open Journey ➔
                      </button>
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
