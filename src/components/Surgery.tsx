import React from "react";
import { StatusBadge, Btn, Card, Table, TR, TD } from "./shared";

const OR_SCHEDULE = [
  {
    or: "OR 1",
    cases: [
      { time: "07:30–09:45", procedure: "Total Knee Replacement R", patient: "Harold Thompson, 68", surgeon: "Dr. Adams", anesthesia: "Dr. Rodriguez", status: "Completed", duration: "2h 15m" },
      { time: "11:00–13:30", procedure: "Appendectomy (Laparoscopic)", patient: "Isabel Cruz, 19", surgeon: "Dr. Williams", anesthesia: "Dr. Kim", status: "In Progress", duration: "Est 2h 30m" },
      { time: "15:00–16:30", procedure: "Cataract Extraction + IOL", patient: "Mia Thompson, 74", surgeon: "Dr. Park", anesthesia: "Dr. Rodriguez", status: "Scheduled", duration: "Est 1h 30m" },
    ]
  },
  {
    or: "OR 2",
    cases: [
      { time: "08:00–10:30", procedure: "Cholecystectomy (Laparoscopic)", patient: "Sandra Brown, 44", surgeon: "Dr. Chen", anesthesia: "Dr. Kim", status: "Completed", duration: "2h 30m" },
      { time: "12:00–15:00", procedure: "CABG ×3", patient: "George Watts, 60", surgeon: "Dr. Patel", anesthesia: "Dr. Rodriguez", status: "Scheduled", duration: "Est 3h 00m" },
    ]
  },
  {
    or: "OR 3",
    cases: [
      { time: "09:00–12:00", procedure: "Hip Replacement L", patient: "Diane Walsh, 80", surgeon: "Dr. Adams", anesthesia: "Dr. Kim", status: "In Progress", duration: "Est 3h" },
      { time: "14:00–15:30", procedure: "Hernia Repair (Inguinal)", patient: "Marcus Webb, 43", surgeon: "Dr. Williams", anesthesia: "Dr. Rodriguez", status: "Scheduled", duration: "Est 1h 30m" },
    ]
  },
  {
    or: "OR 4 — Available",
    cases: []
  },
];

const STATUS_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  "Completed": { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  "In Progress": { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  "Scheduled": { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
};

export default function Surgery() {
  const now = "11:12 AM";

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Surgical Services — OR Board</h1>
          <p className="text-[11.5px] text-[#64748B]">General Hospital · Aug 23, 2026 · Current time: {now}</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm">Add Case</Btn>
          <Btn variant="primary" size="sm">+ Schedule Case</Btn>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 grid grid-cols-5 gap-4">
        {[
          { label: "Total Cases Today", value: "8", color: "#0F1624" },
          { label: "Completed", value: "3", color: "#16A34A" },
          { label: "In Progress", value: "2", color: "#1B4FD8" },
          { label: "Scheduled", value: "3", color: "#7C3AED" },
          { label: "Available ORs", value: "1", color: "#16A34A" },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-xl font-semibold font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] text-[#64748B]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {/* OR Timeline */}
        {OR_SCHEDULE.map((or, oi) => (
          <div key={oi} className="bg-white border border-[#DDE2EC] rounded overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#DDE2EC] bg-[#F8FAFC] flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{or.or}</span>
              <div className="flex items-center gap-3 text-[11.5px] text-[#64748B]">
                <span>{or.cases.length} case{or.cases.length !== 1 ? "s" : ""}</span>
                <Btn variant="ghost" size="xs">Block Time</Btn>
              </div>
            </div>
            {or.cases.length === 0 ? (
              <div className="p-6 text-center text-[#94A3B8] text-[12px]">
                No cases scheduled · Room available
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {or.cases.map((c, ci) => {
                  const s = STATUS_COLOR[c.status] || STATUS_COLOR["Scheduled"];
                  return (
                    <div key={ci} style={{ borderLeftColor: s.text }}
                      className="flex items-center gap-4 px-4 py-3 border-l-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <div className="w-28 flex-shrink-0">
                        <span className="font-mono text-[11.5px] text-[#64748B]">{c.time}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold text-gray-900">{c.procedure}</span>
                          <span style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
                            className="border text-[11px] font-semibold px-2 py-0.5 rounded">
                            {c.status}
                          </span>
                        </div>
                        <div className="text-[11.5px] text-[#64748B] mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>👤 {c.patient}</span>
                          <span>Surgeon: {c.surgeon}</span>
                          <span>Anesthesia: {c.anesthesia}</span>
                          <span>⏱ {c.duration}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Btn variant="ghost" size="xs">Chart</Btn>
                        {c.status === "Scheduled" && <Btn variant="outline" size="xs">Ready</Btn>}
                        {c.status === "In Progress" && <Btn variant="primary" size="xs">Update</Btn>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Upcoming Cases + On Call */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Pre-Op Queue">
            <Table headers={["Patient", "Procedure", "Time", "Status", ""]}>
              {[
                { patient: "Isabel Cruz", procedure: "Appendectomy", time: "11:00", status: "In Pre-Op" },
                { patient: "George Watts", procedure: "CABG ×3", time: "12:00", status: "Pending Consent" },
                { patient: "Mia Thompson", procedure: "Cataract", time: "15:00", status: "Not Arrived" },
                { patient: "Marcus Webb", procedure: "Hernia Repair", time: "14:00", status: "Awaiting Lab" },
              ].map((p, i) => (
                <TR key={i}>
                  <TD><span className="font-semibold text-gray-800">{p.patient}</span></TD>
                  <TD><span className="text-[#64748B]">{p.procedure}</span></TD>
                  <TD><span className="font-mono text-[11.5px]">{p.time}</span></TD>
                  <TD><StatusBadge status={p.status.replace(/\s/g, "")} /></TD>
                  <TD><Btn variant="ghost" size="xs">Checklist</Btn></TD>
                </TR>
              ))}
            </Table>
          </Card>

          <Card title="On-Call Team">
            <div className="space-y-2">
              {[
                { role: "Attending Surgeon", name: "Dr. E. Adams", pager: "3142", specialty: "Orthopedic" },
                { role: "Attending Surgeon", name: "Dr. R. Williams", pager: "3148", specialty: "General Surgery" },
                { role: "Anesthesiologist", name: "Dr. K. Rodriguez", pager: "3210", specialty: "Cardiac Anesthesia" },
                { role: "Anesthesiologist", name: "Dr. J. Kim", pager: "3211", specialty: "General Anesthesia" },
                { role: "Scrub Tech", name: "Michael Torres", pager: "3320", specialty: "Circulating" },
                { role: "Charge RN", name: "Patricia Moore RN", pager: "3301", specialty: "OR Nursing" },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[#F1F5F9] last:border-0">
                  <div className="w-7 h-7 rounded-full bg-[#E8EDF5] flex items-center justify-center text-[10px] font-bold text-[#1E3A6E] flex-shrink-0">
                    {m.name.split(" ")[1]?.[0]}{m.name.split(" ")[2]?.[0] || ""}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-gray-800 truncate">{m.name}</div>
                    <div className="text-[11px] text-[#64748B]">{m.role} · {m.specialty}</div>
                  </div>
                  <span className="font-mono text-[11.5px] text-[#64748B]">p.{m.pager}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
