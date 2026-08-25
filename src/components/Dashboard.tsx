import React, { useState } from "react";
import { Icon } from "./icons";

const QUEUES = [
  { dept: "Emergency", inCare: 30, waiting: 8, critical: 3, available: 4 },
  { dept: "Inpatient 3N", inCare: 24, waiting: 0, critical: 2, available: 2 },
  { dept: "Inpatient 4S", inCare: 28, waiting: 0, critical: 1, available: 4 },
  { dept: "ICU", inCare: 12, waiting: 0, critical: 6, available: 2 },
  { dept: "Surgery OR", inCare: 3, waiting: 2, critical: 0, available: 2 },
];

const APPOINTMENTS = [
  { time: "09:00", patient: "Sarah Connelly", provider: "Dr. Adams · Follow-up", status: "Completed", type: "completed" },
  { time: "09:30", patient: "Marcus Webb", provider: "Dr. Lee · New Patient", status: "In Progress", type: "in_progress" },
  { time: "10:00", patient: "Elena Torres", provider: "Dr. Adams · Follow-up", status: "Checked In", type: "checked_in" },
];

export default function Dashboard({ navigate }: { navigate: (m: string, s?: string) => void }) {
  const [_, setRefresh] = useState(0);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F6F9] min-w-0 p-5 space-y-4 text-gray-900" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Dashboard Title Row ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold text-[#0F172A] tracking-tight">Hospital Operations Dashboard</h1>
          <p className="text-[12px] text-[#64748B] mt-0.5">General Hospital · 3-North Medical · Last updated 10:47 AM</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#64748B]">Aug 23, 2026 · 10:47 AM</span>
          <button
            onClick={() => setRefresh(n => n + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#DDE2EC] rounded-lg text-[12px] font-medium text-gray-700 hover:bg-[#F8FAFC] shadow-xs transition-colors">
            <Icon.Refresh /> Refresh
          </button>
        </div>
      </div>

      {/* ── Alert Banners ───────────────────────────────────────── */}
      <div className="space-y-2.5">
        {/* Critical Alert */}
        <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-lg px-4 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-[#DC2626] text-base"><Icon.Alert /></span>
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-bold text-[#DC2626]">Critical Lab Result — John Smith</span>
              <span className="text-[12px] text-[#475569]">Potassium 6.2 mmol/L — Requires immediate physician review</span>
            </div>
          </div>
          <button
            onClick={() => navigate("laboratory")}
            className="text-[12.5px] font-bold text-[#DC2626] hover:underline cursor-pointer">
            Review Now
          </button>
        </div>

        {/* Warning Alert */}
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-4 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-[#D97706] text-base"><Icon.Alert /></span>
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-bold text-[#D97706]">ED Capacity Alert</span>
              <span className="text-[12px] text-[#475569]">ED census at 38/42 beds. 8 patients waiting &gt; 30 minutes.</span>
            </div>
          </div>
          <button
            onClick={() => navigate("emergency")}
            className="text-[12.5px] font-bold text-[#D97706] hover:underline cursor-pointer">
            View ED
          </button>
        </div>
      </div>

      {/* ── 6-Column KPI Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1 */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between hover:border-[#2563EB] transition-colors">
          <div>
            <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider">PATIENTS TODAY</div>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-[24px] font-extrabold text-[#0F172A] leading-tight">428</span>
              <span className="text-[11.5px] font-bold text-[#DC2626]">↑12</span>
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-0.5">↑ 12 from yesterday</div>
          </div>
          <button onClick={() => navigate("patients")} className="text-[11.5px] font-semibold text-[#2563EB] hover:underline mt-3 text-left">
            View All →
          </button>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between hover:border-[#2563EB] transition-colors">
          <div>
            <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider">APPOINTMENTS</div>
            <div className="mt-1.5">
              <span className="text-[24px] font-extrabold text-[#0F172A] leading-tight">126</span>
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-0.5">14 remaining today</div>
          </div>
          <button onClick={() => navigate("appointments")} className="text-[11.5px] font-semibold text-[#2563EB] hover:underline mt-3 text-left">
            Schedule →
          </button>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between hover:border-[#2563EB] transition-colors">
          <div>
            <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider">ADMISSIONS</div>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-[24px] font-extrabold text-[#0F172A] leading-tight">38</span>
              <span className="text-[11.5px] font-bold text-[#DC2626]">↑3</span>
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-0.5">7 pending bed assignment</div>
          </div>
          <button onClick={() => navigate("inpatient")} className="text-[11.5px] font-semibold text-[#2563EB] hover:underline mt-3 text-left">
            Bed Board →
          </button>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between hover:border-[#2563EB] transition-colors">
          <div>
            <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider">DISCHARGES</div>
            <div className="mt-1.5">
              <span className="text-[24px] font-extrabold text-[#0F172A] leading-tight">31</span>
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-0.5">6 ready to discharge</div>
          </div>
          <button onClick={() => navigate("discharge")} className="text-[11.5px] font-semibold text-[#2563EB] hover:underline mt-3 text-left">
            View →
          </button>
        </div>

        {/* Card 5 */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between hover:border-[#2563EB] transition-colors">
          <div>
            <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider">ED WAITING</div>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-[24px] font-extrabold text-[#DC2626] leading-tight">8</span>
              <span className="text-[11.5px] font-bold text-[#DC2626]">↑4</span>
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-0.5">3 ESI-1 or ESI-2</div>
          </div>
          <button onClick={() => navigate("emergency")} className="text-[11.5px] font-semibold text-[#2563EB] hover:underline mt-3 text-left">
            View ED →
          </button>
        </div>

        {/* Card 6 */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between hover:border-[#2563EB] transition-colors">
          <div>
            <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider">CRITICAL ALERTS</div>
            <div className="mt-1.5">
              <span className="text-[24px] font-extrabold text-[#DC2626] leading-tight">7</span>
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-0.5">2 unacknowledged</div>
          </div>
          <button onClick={() => navigate("laboratory")} className="text-[11.5px] font-semibold text-[#2563EB] hover:underline mt-3 text-left">
            Review →
          </button>
        </div>
      </div>

      {/* ── Main Section: Department Census & Today's Appointments ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-4">
        {/* Department Census */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-1">
            <span className="text-[12.5px] font-bold text-[#0F172A] tracking-wider uppercase">DEPARTMENT CENSUS</span>
            <button onClick={() => navigate("inpatient")} className="text-[12px] font-semibold text-[#64748B] hover:text-[#2563EB]">
              Full View
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F1F5F9] text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="py-2.5 px-2">DEPARTMENT</th>
                  <th className="py-2.5 px-2">IN CARE</th>
                  <th className="py-2.5 px-2">WAITING</th>
                  <th className="py-2.5 px-2">CRITICAL</th>
                  <th className="py-2.5 px-2">AVAILABLE</th>
                  <th className="py-2.5 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                {QUEUES.map((q, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-2 font-bold text-[#0F172A]">{q.dept}</td>
                    <td className="py-3 px-2 font-medium text-[#334155]">{q.inCare}</td>
                    <td className="py-3 px-2">
                      {q.waiting > 0 ? (
                        <span className="font-bold text-[#EA580C]">{q.waiting}</span>
                      ) : (
                        <span className="text-[#94A3B8] font-medium">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {q.critical > 0 ? (
                        <span className="font-bold text-[#DC2626]">{q.critical}</span>
                      ) : (
                        <span className="text-[#94A3B8] font-medium">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2 font-bold text-[#16A34A]">{q.available}</td>
                    <td className="py-3 px-2 text-right">
                      <button onClick={() => navigate("inpatient")} className="text-[12px] font-semibold text-[#2563EB] hover:underline">
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-3">
              <span className="text-[12.5px] font-bold text-[#0F172A] tracking-wider uppercase">TODAY'S APPOINTMENTS</span>
              <button onClick={() => navigate("appointments")} className="text-[12px] font-semibold text-[#64748B] hover:text-[#2563EB]">
                All
              </button>
            </div>

            <div className="space-y-4">
              {APPOINTMENTS.map((a, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-[12px] text-[#64748B] font-medium mt-0.5 w-10 flex-shrink-0">{a.time}</span>
                    <div>
                      <div className="text-[13px] font-bold text-[#0F172A] leading-tight">{a.patient}</div>
                      <div className="text-[11.5px] text-[#64748B] mt-0.5">{a.provider}</div>
                    </div>
                  </div>

                  <div>
                    {a.type === "completed" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#475569]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
                        Completed
                      </span>
                    )}
                    {a.type === "in_progress" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                        In Progress
                      </span>
                    )}
                    {a.type === "checked_in" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                        Checked In
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => navigate("appointments")} className="text-[12px] font-semibold text-[#2563EB] hover:underline mt-6 text-left block">
            View Full Schedule →
          </button>
        </div>
      </div>
    </div>
  );
}
