import React from 'react';
import { Icon } from './icons';

interface OPManagementProps {
  onStartWorkflow?: () => void;
  onNavigateQueue?: () => void;
  onNavigateAppointments?: () => void;
}

export default function OPManagement({ onStartWorkflow, onNavigateQueue, onNavigateAppointments }: OPManagementProps) {
  const recentEncounters = [
    { umr: "UMR10001", op: "OP025", name: "Ravi Kumar", age: 42, sex: "M", dept: "Cardiology", doctor: "Dr. Rajesh Sharma", status: "Under Consultation", time: "10:25 AM", queue: "#1" },
    { umr: "UMR10002", op: "OP003", name: "Sunita Patel", age: 38, sex: "F", dept: "Cardiology", doctor: "Dr. Sarah Jenkins", status: "In Queue", time: "10:32 AM", queue: "#2" },
    { umr: "UMR10003", op: "OP008", name: "John Smith", age: 55, sex: "M", dept: "General Medicine", doctor: "Dr. Anita Desai", status: "Post-Consultation", time: "10:14 AM", queue: "Done" },
    { umr: "UMR10004", op: "OP041", name: "Elena Vasquez", age: 57, sex: "F", dept: "Pulmonology", doctor: "Dr. Michael Chen", status: "Awaiting Billing", time: "10:05 AM", queue: "Done" },
    { umr: "UMR10005", op: "OP012", name: "Marcus Kim", age: 43, sex: "M", dept: "Orthopedics", doctor: "Dr. David Anderson", status: "OP Completed", time: "09:48 AM", queue: "Done" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-900">Outpatient (OP) Department Dashboard</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] font-mono">
              Live Operations
            </span>
          </div>
          <p className="text-[11.5px] text-[#64748B] mt-0.5">
            Real-time outpatient coordination, UMR/OP encounter tracking, doctor capacity, and connected patient workflow.
          </p>
        </div>
        <div className="flex gap-2">
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
          
          {/* Top Operational Stats from PDF (Section 27) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
            {[
              { label: "Total OP Patients", val: "40", sub: "Today's census", color: "text-gray-900" },
              { label: "New Patients", val: "12", sub: "New UMRs created", color: "text-[#1B4FD8]" },
              { label: "Existing Patients", val: "28", sub: "Revisit encounters", color: "text-[#6366F1]" },
              { label: "In Consultation", val: "6", sub: "Active doctors", color: "text-[#D97706]" },
              { label: "Awaiting / Queue", val: "10", sub: "In OP queue", color: "text-[#DC2626]" },
              { label: "Completed Visits", val: "34", sub: "Encounter closed", color: "text-[#16A34A]" },
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-[#DDE2EC] p-3.5 rounded-xl shadow-xs">
                <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">{stat.label}</div>
                <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.val}</div>
                <div className="text-[10.5px] text-[#94A3B8] mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Department Capacity & Active Pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Department Load */}
            <div className="col-span-2 bg-white border border-[#DDE2EC] rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
                <h2 className="text-[13.5px] font-semibold text-gray-900">Department Load &amp; Doctor Roster</h2>
                <span className="text-[11.5px] text-[#64748B]">7 Doctors Available · 5 Busy</span>
              </div>
              <table className="w-full text-left">
                <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA]">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Specialty</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Active Drs</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Queue</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Capacity Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                  {[
                    { dept: "Cardiology", drs: "3 / 3 Active", wait: 12, status: "High", load: 88 },
                    { dept: "General Medicine", drs: "6 / 8 Active", wait: 8, status: "Normal", load: 55 },
                    { dept: "Pulmonology", drs: "2 / 2 Active", wait: 4, status: "Normal", load: 45 },
                    { dept: "Orthopedics", drs: "4 / 5 Active", wait: 6, status: "Normal", load: 60 },
                    { dept: "Pediatrics", drs: "5 / 5 Active", wait: 14, status: "Overloaded", load: 95 },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-2.5 font-semibold text-gray-900">{row.dept}</td>
                      <td className="px-4 py-2.5 text-gray-700">{row.drs}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-700">{row.wait} in queue</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className={`w-20 px-1.5 py-0.5 text-[10px] font-bold text-center rounded uppercase ${
                            row.status === 'Overloaded' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                            row.status === 'High' ? 'bg-[#FEF3C7] text-[#92400E]' :
                            'bg-[#DCFCE7] text-[#15803D]'
                          }`}>{row.status}</span>
                          <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div className={`h-full ${row.load > 90 ? 'bg-[#DC2626]' : row.load > 75 ? 'bg-[#D97706]' : 'bg-[#16A34A]'}`} style={{width: `${row.load}%`}}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Connected OP Workflow Banner */}
            <div className="bg-gradient-to-br from-[#0C1524] to-[#1E2D42] text-white border border-[#334155] rounded-xl shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🩺</span>
                  <div className="font-bold text-[14px]">Keppler OP Clinical Journey</div>
                </div>
                <p className="text-[12px] text-[#94A3B8] leading-relaxed mb-4">
                  Experience the full 11-step outpatient pipeline matching the official requirements specification.
                </p>
                <div className="space-y-2 text-[11.5px] text-[#CBD5E1]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#60A5FA]">✓</span> Permanent UMR vs Per-Visit OP Number
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#60A5FA]">✓</span> AI Symptom Analysis &amp; Doctor Recommendation
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#60A5FA]">✓</span> Gender-Based Doctor Preference Rules
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#60A5FA]">✓</span> Real-time OP Queue &amp; Consultation
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#60A5FA]">✓</span> Nurse Vitals &amp; Billing Checkout
                  </div>
                </div>
              </div>
              {onStartWorkflow && (
                <button
                  onClick={onStartWorkflow}
                  className="w-full mt-5 py-2.5 bg-[#1B59F8] hover:bg-[#2563EB] text-white font-bold text-[12.5px] rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  Launch OP Patient Journey →
                </button>
              )}
            </div>
          </div>

          {/* Recent OP Encounters Table */}
          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <h2 className="text-[13.5px] font-semibold text-gray-900">Today's Outpatient Encounters</h2>
              <span className="text-[11.5px] text-[#64748B]">Real-time Status Tracking</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA]">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">UMR</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">OP Number</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient Name</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Department</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Assigned Doctor</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Queue</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Encounter Status</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                  {recentEncounters.map((enc, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC] cursor-pointer">
                      <td className="px-4 py-3 font-mono font-bold text-[#1B4FD8]">{enc.umr}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#D97706]">{enc.op}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{enc.name} ({enc.age} {enc.sex})</td>
                      <td className="px-4 py-3 text-gray-700">{enc.dept}</td>
                      <td className="px-4 py-3 text-gray-800">{enc.doctor}</td>
                      <td className="px-4 py-3 font-mono text-[12px] font-bold text-gray-700">{enc.queue}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10.5px] font-bold rounded uppercase ${
                          enc.status === 'Under Consultation' ? 'bg-[#DBEAFE] text-[#1E40AF]' :
                          enc.status === 'In Queue' ? 'bg-[#FEF3C7] text-[#B45309]' :
                          enc.status === 'Post-Consultation' ? 'bg-[#E0E7FF] text-[#4338CA]' :
                          enc.status === 'Awaiting Billing' ? 'bg-[#FCE7F3] text-[#9D174D]' :
                          'bg-[#DCFCE7] text-[#15803D]'
                        }`}>
                          {enc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500 text-[11.5px]">{enc.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
