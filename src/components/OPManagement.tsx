import React from 'react';
import { Icon } from './icons';

export default function OPManagement() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Outpatient (OP) Management</h1>
          <p className="text-[12.5px] text-[#64748B]">High-level coordination of outpatient departments, doctors, and patient flow.</p>
        </div>
        <div className="flex gap-2">
          <button className="h-8 px-3 bg-white border border-[#DDE2EC] text-[#1B4FD8] text-[12px] font-medium rounded hover:bg-[#F8FAFC] transition-colors">
            Export Report
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Top Stats */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: "Total OP Visits Today", val: "342", trend: "+12%" },
              { label: "Currently Waiting", val: "48", trend: "-5%" },
              { label: "Avg Wait Time", val: "22m", trend: "+2m" },
              { label: "Doctors Active", val: "24", trend: "0%" },
              { label: "Pharmacy Queue", val: "15", trend: "-10%" },
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
                <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">{stat.label}</div>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold text-gray-900">{stat.val}</div>
                  <div className={`text-[11px] font-semibold mb-1 ${stat.trend.startsWith('+') && stat.trend !== '+0%' ? (stat.label.includes('Wait') ? 'text-red-600' : 'text-green-600') : 'text-gray-500'}`}>
                    {stat.trend}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Department Load */}
            <div className="col-span-2 bg-white border border-[#DDE2EC] rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
                <h2 className="text-[14px] font-semibold text-gray-900">Department Load & Capacity</h2>
              </div>
              <table className="w-full text-left">
                <thead className="border-b border-[#DDE2EC]">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Department</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Active Drs</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Waiting</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Capacity Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {[
                    { dept: "General Medicine", drs: "6 / 8", wait: 18, status: "Normal", load: 65 },
                    { dept: "Cardiology", drs: "3 / 3", wait: 12, status: "High", load: 90 },
                    { dept: "Orthopedics", drs: "4 / 5", wait: 8, status: "Normal", load: 40 },
                    { dept: "Pediatrics", drs: "5 / 5", wait: 24, status: "Overloaded", load: 98 },
                    { dept: "Dermatology", drs: "2 / 2", wait: 3, status: "Low", load: 25 },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC]">
                      <td className="px-5 py-3 text-[13px] font-semibold text-gray-900">{row.dept}</td>
                      <td className="px-5 py-3 text-[12.5px] text-gray-700">{row.drs}</td>
                      <td className="px-5 py-3 text-[12.5px] font-mono text-gray-700">{row.wait}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-20 px-2 py-0.5 text-[10.5px] font-bold text-center rounded uppercase tracking-wider ${
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

            {/* Workflow Pipeline */}
            <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC]">
                <h2 className="text-[14px] font-semibold text-gray-900">OP Workflow Pipeline</h2>
              </div>
              <div className="flex-1 p-5 relative">
                <div className="absolute left-9 top-8 bottom-8 w-0.5 bg-[#E2E8F0]"></div>
                
                {[
                  { label: "Registration Desk", val: "12 processing", icon: <Icon.Patients /> },
                  { label: "Triage / Vitals", val: "8 waiting", icon: <Icon.TrendUp /> },
                  { label: "Doctor Consultations", val: "24 active", icon: <Icon.Stethoscope /> },
                  { label: "Billing", val: "5 pending", icon: <Icon.Billing /> },
                  { label: "Pharmacy Dispensing", val: "15 in queue", icon: <Icon.Pharmacy /> },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-4 mb-6 relative">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#1B4FD8] flex items-center justify-center text-[#1B4FD8] z-10 flex-shrink-0">
                      {step.icon}
                    </div>
                    <div className="mt-1">
                      <div className="text-[13px] font-semibold text-gray-900">{step.label}</div>
                      <div className="text-[11.5px] text-[#64748B]">{step.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
