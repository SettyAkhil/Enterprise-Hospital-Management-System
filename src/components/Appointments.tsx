import React, { useState } from "react";
import { StatusBadge, Btn, Card, Table, TR, TD } from "./shared";
import { Icon } from "./icons";

const APPOINTMENTS = [
  { time: "08:00", patient: "Harold Thompson", age: 68, type: "Post-op Follow-up", provider: "Dr. Adams", room: "Ortho 1", duration: "30m", status: "Completed", mrn: "100401" },
  { time: "08:30", patient: "Sandra Brown", age: 44, type: "Follow-up", provider: "Dr. Williams", room: "Surg 2", duration: "20m", status: "Completed", mrn: "100331" },
  { time: "09:00", patient: "Sarah Connelly", age: 35, type: "Annual Physical", provider: "Dr. Adams", room: "101", duration: "45m", status: "Completed", mrn: "100289" },
  { time: "09:30", patient: "Marcus Webb", age: 43, type: "New Patient", provider: "Dr. Lee", room: "102", duration: "60m", status: "In Progress", mrn: "100500" },
  { time: "10:00", patient: "Elena Torres", age: 57, type: "Diabetes Follow-up", provider: "Dr. Adams", room: "103", duration: "30m", status: "Checked In", mrn: "100198" },
  { time: "10:30", patient: "Robert Kim", age: 52, type: "Cardiac Consult", provider: "Dr. Patel", room: "Card 1", duration: "45m", status: "Pending", mrn: "100377" },
  { time: "11:00", patient: "Jennifer Walsh", age: 29, type: "GYN Consult", provider: "Dr. Lee", room: "102", duration: "30m", status: "Pending", mrn: "100511" },
  { time: "11:30", patient: "David Chu", age: 61, type: "Hypertension", provider: "Dr. Adams", room: "101", duration: "20m", status: "Pending", mrn: "100289" },
  { time: "13:00", patient: "Helen Park", age: 72, type: "Post-discharge", provider: "Dr. Chen", room: "104", duration: "30m", status: "Pending", mrn: "100402" },
  { time: "13:30", patient: "Frank Torres", age: 55, type: "Lab Review", provider: "Dr. Anderson", room: "105", duration: "20m", status: "Pending", mrn: "100501" },
  { time: "14:00", patient: "Mia Thompson", age: 31, type: "Pre-op Visit", provider: "Dr. Park", room: "Eye 1", duration: "45m", status: "Pending", mrn: "100312" },
  { time: "15:00", patient: "Diane Walsh", age: 80, type: "Follow-up", provider: "Dr. Anderson", room: "103", duration: "30m", status: "Pending", mrn: "100142" },
];

const DAYS = ["Mon\nAug 19", "Tue\nAug 20", "Wed\nAug 21", "Thu\nAug 22", "Fri\nAug 23", "Sat\nAug 24", "Sun\nAug 25"];
const SELECTED_DAY = 4;

export default function Appointments({ onSelect }: { onSelect?: () => void }) {
  const [view, setView] = useState<"day" | "week" | "list">("day");
  const [activeDay, setActiveDay] = useState(SELECTED_DAY);

  const completed = APPOINTMENTS.filter(a => a.status === "Completed").length;
  const inProgress = APPOINTMENTS.filter(a => a.status === "In Progress").length;
  const pending = APPOINTMENTS.filter(a => a.status === "Pending" || a.status === "Checked In").length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Appointments</h1>
          <p className="text-[11.5px] text-[#64748B]">{APPOINTMENTS.length} appointments today · Aug 23, 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[#DDE2EC] rounded overflow-hidden">
            {(["day", "week", "list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-[12px] font-medium capitalize transition-colors ${view === v ? "bg-[#1B4FD8] text-white" : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                {v}
              </button>
            ))}
          </div>
          <Btn variant="primary" size="sm"><Icon.Plus /> New Appointment</Btn>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-2.5 flex items-center gap-6 text-[12.5px]">
        <span><span className="font-mono font-semibold text-[#16A34A]">{completed}</span> Completed</span>
        <span><span className="font-mono font-semibold text-[#0284C7]">{inProgress}</span> In Progress</span>
        <span><span className="font-mono font-semibold text-[#D97706]">{pending}</span> Remaining</span>
        <span className="text-[#64748B]">·</span>
        <span className="text-[#64748B]">Providers: Dr. Adams (4), Dr. Lee (3), Dr. Patel (2), Dr. Anderson (2), Dr. Park (1)</span>
      </div>

      <div className="p-5">
        {view === "week" && (
          <div className="bg-white border border-[#DDE2EC] rounded overflow-hidden mb-4">
            <div className="grid border-b border-[#DDE2EC]" style={{ gridTemplateColumns: "80px repeat(7, 1fr)" }}>
              <div className="bg-[#F8FAFC] border-r border-[#DDE2EC]" />
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => { setActiveDay(i); setView("day"); }}
                  className={`px-2 py-2.5 text-center border-r border-[#DDE2EC] last:border-r-0 transition-colors
                    ${i === activeDay ? "bg-[#EFF6FF] text-[#1B4FD8]" : "hover:bg-[#F8FAFC] text-[#64748B]"}`}>
                  <div className="text-[11px] font-semibold whitespace-pre-line">{d}</div>
                  {i === SELECTED_DAY && <div className="w-1.5 h-1.5 bg-[#1B4FD8] rounded-full mx-auto mt-1" />}
                </button>
              ))}
            </div>
            <div className="h-48 flex items-center justify-center text-[#94A3B8] text-[12px]">
              Weekly calendar grid — Click a day to view appointments
            </div>
          </div>
        )}

        {(view === "day" || view === "week") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card title={`Aug 23, 2026 — All Appointments (${APPOINTMENTS.length})`} actions={
                <div className="flex gap-2">
                  <Btn variant="ghost" size="xs"><Icon.Filter /> Filter</Btn>
                  <Btn variant="ghost" size="xs">Provider</Btn>
                </div>
              }>
                <div className="space-y-1">
                  {APPOINTMENTS.map((a, i) => (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded border transition-colors cursor-pointer
                      ${a.status === "In Progress" ? "border-[#BFDBFE] bg-[#EFF6FF]" : a.status === "Completed" ? "border-transparent bg-[#F8FAFC]" : "border-[#F1F5F9] hover:border-[#DDE2EC] hover:bg-[#F8FAFC]"}`}
                      onClick={onSelect}>
                      <span className="font-mono text-[11px] text-[#94A3B8] w-10 flex-shrink-0">{a.time}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-semibold text-gray-800">{a.patient}</span>
                          <span className="text-[11px] text-[#94A3B8]">{a.age}y</span>
                          <span className={`text-[11px] font-medium ${a.type.includes("New") ? "text-[#7C3AED]" : "text-[#64748B]"}`}>{a.type}</span>
                        </div>
                        <div className="text-[11.5px] text-[#64748B]">{a.provider} · Room {a.room} · {a.duration}</div>
                      </div>
                      <StatusBadge status={a.status} />
                      <div className="flex gap-1">
                        {a.status === "Pending" && <Btn variant="primary" size="xs" onClick={() => {}}>Check In</Btn>}
                        {a.status === "Checked In" && <Btn variant="primary" size="xs" onClick={() => {}}>Start Visit</Btn>}
                        <Btn variant="ghost" size="xs" onClick={() => {}}>More</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="space-y-4">
              <Card title="Waiting Room">
                {APPOINTMENTS.filter(a => a.status === "Checked In").map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2 border-b border-[#F1F5F9] last:border-0">
                    <div className="w-7 h-7 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[10px] font-bold text-[#0284C7]">
                      {a.patient.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-gray-800">{a.patient}</div>
                      <div className="text-[11px] text-[#64748B]">{a.time} · {a.provider}</div>
                    </div>
                    <Btn variant="primary" size="xs" className="ml-auto">Start</Btn>
                  </div>
                ))}
                {APPOINTMENTS.filter(a => a.status === "Checked In").length === 0 && (
                  <div className="text-center py-4 text-[12px] text-[#94A3B8]">No patients currently waiting</div>
                )}
              </Card>
              <Card title="Unscheduled Requests">
                <div className="space-y-2 text-[12px]">
                  {[
                    { patient: "New referral from Dr. Wong", type: "Cardiology", urgency: "Routine" },
                    { patient: "Walk-in: sore throat", type: "Urgent Care", urgency: "Same Day" },
                    { patient: "Callback: prescription refill ×2", type: "Phone", urgency: "Today" },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9] last:border-0">
                      <div>
                        <div className="font-medium text-gray-700">{r.patient}</div>
                        <div className="text-[11px] text-[#64748B]">{r.type}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#D97706] font-medium">{r.urgency}</span>
                        <Btn variant="outline" size="xs">Schedule</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {view === "list" && (
          <Card title="All Appointments — Aug 23, 2026" actions={<Btn variant="ghost" size="xs"><Icon.Download /> Export</Btn>}>
            <Table headers={["Time", "Patient", "MRN", "Type", "Provider", "Room", "Duration", "Status", ""]}>
              {APPOINTMENTS.map((a, i) => (
                <TR key={i} onClick={onSelect}>
                  <TD><span className="font-mono text-[11.5px]">{a.time}</span></TD>
                  <TD><span className="font-semibold text-gray-800">{a.patient}</span></TD>
                  <TD><span className="font-mono text-[11.5px] text-[#64748B]">{a.mrn}</span></TD>
                  <TD>{a.type}</TD>
                  <TD><span className="text-[#64748B]">{a.provider}</span></TD>
                  <TD><span className="font-mono text-[11.5px]">{a.room}</span></TD>
                  <TD><span className="text-[#64748B]">{a.duration}</span></TD>
                  <TD><StatusBadge status={a.status} /></TD>
                  <TD>
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="xs">Chart</Btn>
                      <Btn variant="ghost" size="xs">Edit</Btn>
                    </div>
                  </TD>
                </TR>
              ))}
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
