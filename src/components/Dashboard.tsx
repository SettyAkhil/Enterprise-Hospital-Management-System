import React, { useState } from "react";
import { MetricCard, Card, Table, TR, TD, StatusBadge, AlertBanner, Btn } from "./shared";
import { Icon } from "./icons";

const ALERTS = [
  { type: "critical" as const, title: "Critical Lab Result — John Smith", body: "Potassium 6.2 mmol/L — Requires immediate physician review", action: "Review Now" },
  { type: "warning" as const, title: "ED Capacity Alert", body: "ED census at 38/42 beds. 8 patients waiting > 30 minutes.", action: "View ED" },
];

const QUEUES = [
  { dept: "Emergency", waiting: 8, critical: 3, inCare: 30, available: 4 },
  { dept: "Inpatient 3N", waiting: 0, critical: 2, inCare: 24, available: 2 },
  { dept: "Inpatient 4S", waiting: 0, critical: 1, inCare: 28, available: 4 },
  { dept: "ICU", waiting: 0, critical: 6, inCare: 12, available: 2 },
  { dept: "Surgery OR", waiting: 2, critical: 0, inCare: 3, available: 2 },
];

const APPOINTMENTS = [
  { time: "09:00", patient: "Sarah Connelly", provider: "Dr. Adams", type: "Follow-up", room: "101", status: "Completed" },
  { time: "09:30", patient: "Marcus Webb", provider: "Dr. Lee", type: "New Patient", room: "102", status: "In Progress" },
  { time: "10:00", patient: "Elena Torres", provider: "Dr. Adams", type: "Follow-up", room: "103", status: "Checked In" },
  { time: "10:30", patient: "Robert Kim", provider: "Dr. Patel", type: "Procedure", room: "104", status: "Pending" },
  { time: "11:00", patient: "Jennifer Walsh", provider: "Dr. Lee", type: "Consult", room: "102", status: "Pending" },
  { time: "11:30", patient: "David Chu", provider: "Dr. Adams", type: "Follow-up", room: "101", status: "Pending" },
];

const PENDING_LABS = [
  { patient: "John Smith", mrn: "100245", test: "BMP", ordered: "08:42", status: "Processing" },
  { patient: "Mary Jones", mrn: "100246", test: "CBC w/ diff", ordered: "09:10", status: "Collected" },
  { patient: "Thomas Reed", mrn: "100301", test: "Troponin x2", ordered: "09:28", status: "Critical" },
  { patient: "Anna Weiss", mrn: "100189", test: "Urinalysis", ordered: "09:55", status: "Pending" },
];

export default function Dashboard({ navigate }: { navigate: (m: string, s?: string) => void }) {
  const [_, setRefresh] = useState(0);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      {/* Page header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Hospital Operations Dashboard</h1>
          <p className="text-[11.5px] text-[#64748B]">General Hospital · 3-North Medical · Last updated 10:47 AM</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#64748B]">Aug 23, 2026 · 10:47 AM</span>
          <Btn variant="outline" size="xs" onClick={() => setRefresh(n => n+1)}>
            <Icon.Refresh /> Refresh
          </Btn>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Alerts */}
        <div className="space-y-2">
          {ALERTS.map((a, i) => (
            <AlertBanner
              key={i}
              {...a}
              onAction={() => {
                if (a.action === "View ED") navigate("emergency");
                else if (a.action === "Review Now") navigate("laboratory");
              }}
            />
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <MetricCard label="Patients Today" value="428" sub="↑ 12 from yesterday" trend="↑12" action="View All" onClick={() => navigate("patients")} />
          <MetricCard label="Appointments" value="126" sub="14 remaining today" action="Schedule" onClick={() => navigate("appointments")} />
          <MetricCard label="Admissions" value="38" sub="7 pending bed assignment" trend="↑3" action="Bed Board" onClick={() => navigate("inpatient")} />
          <MetricCard label="Discharges" value="31" sub="6 ready to discharge" action="View" onClick={() => navigate("discharge")} />
          <MetricCard label="ED Waiting" value="8" sub="3 ESI-1 or ESI-2" color="#DC2626" trend="↑4" action="View ED" onClick={() => navigate("emergency")} />
          <MetricCard label="Critical Alerts" value="7" sub="2 unacknowledged" color="#DC2626" action="Review" onClick={() => navigate("emergency")} />
        </div>

        {/* Department Status + Appointments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card title="Department Census" actions={<Btn variant="ghost" size="xs">Full View</Btn>}>
              <Table headers={["Department", "In Care", "Waiting", "Critical", "Available", ""]}>
                {QUEUES.map((q, i) => (
                  <TR key={i}>
                    <TD><span className="font-medium text-gray-800">{q.dept}</span></TD>
                    <TD><span className="font-mono text-[12px]">{q.inCare}</span></TD>
                    <TD><span className="font-mono text-[12px]">{q.waiting > 0 ? <span className="text-[#D97706] font-semibold">{q.waiting}</span> : "—"}</span></TD>
                    <TD><span className="font-mono text-[12px]">{q.critical > 0 ? <span className="text-[#DC2626] font-semibold">{q.critical}</span> : "—"}</span></TD>
                    <TD><span className="font-mono text-[12px] text-[#16A34A]">{q.available}</span></TD>
                    <TD><Btn variant="ghost" size="xs" onClick={() => navigate("inpatient")}>View →</Btn></TD>
                  </TR>
                ))}
              </Table>
            </Card>
          </div>

          <Card title="Today's Appointments" actions={<Btn variant="ghost" size="xs" onClick={() => navigate("appointments")}>All</Btn>}>
            <div className="space-y-1">
              {APPOINTMENTS.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-[#F1F5F9] last:border-0">
                  <span className="font-mono text-[11px] text-[#94A3B8] w-10 flex-shrink-0">{a.time}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-gray-800 truncate">{a.patient}</div>
                    <div className="text-[11px] text-[#64748B] truncate">{a.provider} · {a.type}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Pending Labs + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Pending Lab Results" actions={<Btn variant="ghost" size="xs" onClick={() => navigate("laboratory")}>View All →</Btn>}>
            <Table headers={["Patient", "MRN", "Test", "Ordered", "Status"]}>
              {PENDING_LABS.map((l, i) => (
                <TR key={i}>
                  <TD><span className="font-medium text-gray-800">{l.patient}</span></TD>
                  <TD><span className="font-mono text-[11.5px] text-[#64748B]">{l.mrn}</span></TD>
                  <TD>{l.test}</TD>
                  <TD><span className="font-mono text-[11.5px]">{l.ordered}</span></TD>
                  <TD>
                    {l.status === "Critical" ? (
                      <span className="bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-semibold px-2 py-0.5 rounded border border-[#FECACA]">⚠ Critical</span>
                    ) : <StatusBadge status={l.status} />}
                  </TD>
                </TR>
              ))}
            </Table>
          </Card>

          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "New Patient Registration", icon: "👤", action: () => navigate("patients", "register") },
                { label: "Schedule Appointment", icon: "📅", action: () => navigate("appointments") },
                { label: "View ED Board", icon: "🚨", action: () => navigate("emergency") },
                { label: "Bed Assignment", icon: "🛏", action: () => navigate("inpatient") },
                { label: "Lab Orders", icon: "🧪", action: () => navigate("laboratory") },
                { label: "Pharmacy Queue", icon: "💊", action: () => navigate("pharmacy") },
                { label: "OR Board", icon: "⚕", action: () => navigate("surgery") },
                { label: "Billing Queue", icon: "💳", action: () => navigate("billing") },
              ].map((q, i) => (
                <button key={i} onClick={q.action}
                  className="flex items-center gap-2.5 p-2.5 border border-[#DDE2EC] rounded text-left hover:border-[#1B4FD8] hover:bg-[#EFF6FF] transition-colors group">
                  <span className="text-base">{q.icon}</span>
                  <span className="text-[12px] font-medium text-gray-700 group-hover:text-[#1B4FD8]">{q.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Bed Utilization mini-chart */}
        <Card title="Unit Utilization Overview">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { unit: "3N Medical", total: 32, occupied: 28, color: "#DC2626" },
              { unit: "4S Medical", total: 32, occupied: 24, color: "#D97706" },
              { unit: "ICU", total: 14, occupied: 12, color: "#DC2626" },
              { unit: "Oncology 5W", total: 24, occupied: 18, color: "#D97706" },
              { unit: "Surgery 2E", total: 20, occupied: 10, color: "#16A34A" },
            ].map((u, i) => {
              const pct = Math.round((u.occupied / u.total) * 100);
              return (
                <div key={i} className="text-center">
                  <div className="text-[11.5px] font-medium text-gray-700 mb-1.5">{u.unit}</div>
                  <div className="relative h-2 bg-[#E2E8F0] rounded-full mb-1.5">
                    <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: u.color }} />
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    <span className="font-mono font-semibold" style={{ color: u.color }}>{u.occupied}</span>
                    <span className="text-[#94A3B8]">/{u.total} · {pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
