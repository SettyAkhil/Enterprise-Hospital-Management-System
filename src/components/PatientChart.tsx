import React, { useState } from "react";
import { PatientBanner, TabBar, Card, StatusBadge, Table, TR, TD, TimelineItem, Btn, AlertBanner } from "./shared";
import { Icon } from "./icons";
import { NursingDatabase } from "../services/nursingWorkflowDb";

const TABS = ["Summary", "Timeline", "Problems", "Medications", "Allergies", "Vitals", "Notes", "Labs", "Imaging", "Orders", "Documents", "Billing"];

const PROBLEMS = [
  { code: "I10", name: "Essential Hypertension", onset: "03/2018", status: "Active", provider: "Dr. Anderson" },
  { code: "E11.9", name: "Type 2 Diabetes Mellitus", onset: "07/2019", status: "Active", provider: "Dr. Anderson" },
  { code: "I25.10", name: "Atherosclerotic Heart Disease", onset: "11/2021", status: "Active", provider: "Dr. Patel" },
  { code: "E78.5", name: "Hyperlipidemia", onset: "03/2018", status: "Active", provider: "Dr. Anderson" },
  { code: "J45.20", name: "Mild Intermittent Asthma", onset: "06/2005", status: "Active", provider: "Dr. Chen" },
  { code: "Z87.39", name: "Personal History of Nephrolithiasis", onset: "2014", status: "Historical", provider: "Dr. Smith" },
];

const MEDICATIONS = [
  { name: "Metformin", dose: "1000mg", route: "PO", freq: "BID", start: "07/2019", status: "Active", prescriber: "Dr. Anderson" },
  { name: "Lisinopril", dose: "10mg", route: "PO", freq: "Daily", start: "03/2018", status: "Active", prescriber: "Dr. Anderson" },
  { name: "Atorvastatin", dose: "40mg", route: "PO", freq: "QHS", start: "03/2018", status: "Active", prescriber: "Dr. Anderson" },
  { name: "Aspirin", dose: "81mg", route: "PO", freq: "Daily", start: "11/2021", status: "Active", prescriber: "Dr. Patel" },
  { name: "Albuterol HFA", dose: "90mcg", route: "INH", freq: "PRN", start: "06/2005", status: "Active", prescriber: "Dr. Chen" },
  { name: "Metoprolol Succinate", dose: "50mg", route: "PO", freq: "Daily", start: "11/2021", status: "Active", prescriber: "Dr. Patel" },
];

const VITALS = [
  { time: "10:30", bp: "134/86", hr: "78", rr: "16", temp: "98.2°F", spo2: "97%", pain: "3/10", wt: "194 lb" },
  { time: "08:00", bp: "138/90", hr: "82", rr: "18", temp: "98.6°F", spo2: "96%", pain: "4/10", wt: "194 lb" },
  { time: "00:00", bp: "142/92", hr: "85", rr: "17", temp: "98.4°F", spo2: "96%", pain: "5/10", wt: "—" },
];

const LABS = [
  { test: "CBC", component: "WBC", value: "14.2", unit: "K/μL", ref: "4.5–11.0", flag: "H", time: "09:10" },
  { test: "CBC", component: "Hemoglobin", value: "13.4", unit: "g/dL", ref: "13.5–17.5", flag: "L", time: "09:10" },
  { test: "CBC", component: "Platelets", value: "218", unit: "K/μL", ref: "150–400", flag: "", time: "09:10" },
  { test: "BMP", component: "Glucose", value: "186", unit: "mg/dL", ref: "70–100", flag: "H", time: "08:42" },
  { test: "BMP", component: "Creatinine", value: "1.1", unit: "mg/dL", ref: "0.7–1.3", flag: "", time: "08:42" },
  { test: "BMP", component: "Potassium", value: "6.2", unit: "mmol/L", ref: "3.5–5.0", flag: "HH", time: "08:42" },
  { test: "BMP", component: "Sodium", value: "138", unit: "mmol/L", ref: "136–145", flag: "", time: "08:42" },
];

const TIMELINE_EVENTS = [
  { time: "10:42 AM", type: "clinical", title: "Physician Encounter", detail: "Dr. Anderson — Assessment and plan updated. DM management adjusted." },
  { time: "10:15 AM", type: "lab", title: "Critical Lab Result", detail: "Potassium 6.2 mmol/L — CRITICAL. Provider notified." },
  { time: "09:55 AM", type: "medication", title: "Medication Administered", detail: "Metformin 1000mg PO BID — Administered by RN Carter" },
  { time: "09:28 AM", type: "lab", title: "Laboratory Order", detail: "BMP ordered by Dr. Anderson" },
  { time: "08:45 AM", type: "clinical", title: "Nursing Assessment", detail: "Routine morning assessment completed. Pain 4/10." },
  { time: "08:00 AM", type: "clinical", title: "Vital Signs", detail: "BP 138/90 · HR 82 · Temp 98.6°F · SpO₂ 96%" },
  { time: "07:30 AM", type: "medication", title: "Morning Medications", detail: "Lisinopril 10mg, Metoprolol 50mg, Atorvastatin 40mg — Administered" },
  { time: "Yesterday 3:00 PM", type: "clinical", title: "Admission", detail: "Admitted for hyperglycemia management and hypertensive urgency" },
  { time: "Yesterday 2:10 PM", type: "billing", title: "Insurance Verification", detail: "BlueCross PPO verified — Prior auth obtained for admission" },
];

const ORDERS = [
  { type: "Lab", name: "Basic Metabolic Panel", priority: "Routine", status: "Completed", provider: "Dr. Anderson", time: "08:42" },
  { type: "Lab", name: "CBC w/ Differential", priority: "Routine", status: "Completed", provider: "Dr. Anderson", time: "09:10" },
  { type: "Lab", name: "Hemoglobin A1c", priority: "Routine", status: "Pending", provider: "Dr. Anderson", time: "10:45" },
  { type: "Medication", name: "Normal Saline 0.9% 1L IV", priority: "Routine", status: "Active", provider: "Dr. Anderson", time: "08:30" },
  { type: "Imaging", name: "Chest X-Ray PA/Lateral", priority: "Routine", status: "In Progress", provider: "Dr. Patel", time: "09:50" },
  { type: "Consult", name: "Cardiology Consult", priority: "Urgent", status: "Pending", provider: "Dr. Anderson", time: "10:42" },
  { type: "Nursing", name: "Vital Signs Q4H", priority: "Routine", status: "Active", provider: "Dr. Anderson", time: "Yesterday" },
];

export default function PatientChart({ onBack, openOrder }: { onBack: () => void; openOrder: () => void }) {
  const [tab, setTab] = useState("Summary");
  const [timelineFilter, setTimelineFilter] = useState("All");
  const [chartNoteModalOpen, setChartNoteModalOpen] = useState(false);
  const [chartMessageModalOpen, setChartMessageModalOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Patient Banner */}
      <PatientBanner
        onAction={(a) => {
          if (a === "order") openOrder();
          if (a === "note") setChartNoteModalOpen(true);
          if (a === "message") setChartMessageModalOpen(true);
        }}
      />
      {/* Tab Bar */}
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="flex-1 overflow-y-auto bg-[#F0F2F5] p-5">
        {tab === "Summary" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4">
              <AlertBanner type="critical" title="Critical Value — Potassium 6.2 mmol/L"
                body="Above critical threshold (>6.0). ECG monitoring recommended. Provider notified 10:15 AM." action="Acknowledge" />

              <div className="grid grid-cols-2 gap-4">
                <Card title="Active Problems" actions={<Btn variant="ghost" size="xs">+ Add</Btn>}>
                  <div className="space-y-1.5">
                    {PROBLEMS.filter(p => p.status === "Active").slice(0, 5).map((p, i) => (
                      <div key={i} className="flex items-start gap-2 py-1 border-b border-[#F1F5F9] last:border-0">
                        <span className="font-mono text-[10.5px] text-[#94A3B8] mt-0.5 w-14 flex-shrink-0">{p.code}</span>
                        <span className="text-[12.5px] text-gray-800">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Allergies" actions={<Btn variant="ghost" size="xs">+ Add</Btn>}>
                  <div className="space-y-2">
                    {[
                      { name: "Penicillin", reaction: "Anaphylaxis", severity: "Severe" },
                      { name: "Sulfonamides", reaction: "Rash", severity: "Moderate" },
                      { name: "NKDA to contrast", reaction: "—", severity: "—" },
                    ].map((a, i) => (
                      <div key={i} className="pb-1.5 border-b border-[#F1F5F9] last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[12.5px] text-[#B91C1C]">{a.name}</span>
                          <span className={`text-[11px] px-1.5 py-px rounded font-medium ${a.severity === "Severe" ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#FEF3C7] text-[#B45309]"}`}>{a.severity}</span>
                        </div>
                        <div className="text-[11.5px] text-[#64748B]">{a.reaction}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card title="Current Medications">
                  <div className="space-y-1">
                    {MEDICATIONS.slice(0, 5).map((m, i) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-[#F1F5F9] last:border-0">
                        <div>
                          <div className="text-[12.5px] font-medium text-gray-800">{m.name}</div>
                          <div className="text-[11px] text-[#64748B] font-mono">{m.dose} {m.route} {m.freq}</div>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Recent Vitals">
                  <div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {[
                        { label: "Blood Pressure", value: "134/86", unit: "mmHg", flag: "H" },
                        { label: "Heart Rate", value: "78", unit: "bpm" },
                        { label: "Resp Rate", value: "16", unit: "/min" },
                        { label: "Temperature", value: "98.2", unit: "°F" },
                        { label: "SpO₂", value: "97", unit: "%" },
                        { label: "Pain Score", value: "3", unit: "/10" },
                        { label: "Weight", value: "194", unit: "lb" },
                        { label: "BMI", value: "27.8", unit: "kg/m²", flag: "H" },
                      ].map((v, i) => (
                        <div key={i} className="flex items-baseline justify-between py-0.5">
                          <span className="text-[11.5px] text-[#64748B]">{v.label}</span>
                          <span className="font-mono text-[12px] font-semibold">
                            {v.value}
                            <span className="text-[10px] font-normal text-[#94A3B8] ml-0.5">{v.unit}</span>
                            {v.flag && <span className="ml-1 text-[10.5px] font-bold text-[#DC2626]">{v.flag}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-[11px] text-[#94A3B8]">Last recorded: 10:30 AM · RN Carter</div>
                  </div>
                </Card>
              </div>

              <Card title="Recent Lab Results">
                <Table headers={["Test", "Component", "Value", "Unit", "Reference", "Flag", "Time"]}>
                  {LABS.map((l, i) => (
                    <TR key={i}>
                      <TD><span className="font-medium text-gray-700">{l.test}</span></TD>
                      <TD>{l.component}</TD>
                      <TD>
                        <span className={`font-mono font-semibold ${l.flag === "HH" ? "text-[#B91C1C]" : l.flag === "H" ? "text-[#D97706]" : l.flag === "L" ? "text-[#0284C7]" : ""}`}>
                          {l.value}
                        </span>
                      </TD>
                      <TD><span className="text-[#64748B] font-mono text-[11.5px]">{l.unit}</span></TD>
                      <TD><span className="text-[#94A3B8] font-mono text-[11.5px]">{l.ref}</span></TD>
                      <TD>
                        {l.flag && (
                          <span className={`font-mono font-bold text-[11.5px] ${l.flag === "HH" ? "text-[#B91C1C]" : l.flag === "H" ? "text-[#D97706]" : "text-[#0284C7]"}`}>
                            {l.flag}
                          </span>
                        )}
                      </TD>
                      <TD><span className="font-mono text-[11px] text-[#94A3B8]">{l.time}</span></TD>
                    </TR>
                  ))}
                </Table>
              </Card>
            </div>

            {/* Right Column — Context Panel */}
            <div className="space-y-4">
              <Card title="Care Team">
                {[
                  { role: "Attending", name: "Dr. M. Anderson", dept: "Internal Medicine" },
                  { role: "Consulting", name: "Dr. R. Patel", dept: "Cardiology" },
                  { role: "Primary RN", name: "Jessica Carter RN", dept: "3N Nursing" },
                  { role: "Case Mgr", name: "Lisa Park MSW", dept: "Social Work" },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-[#F1F5F9] last:border-0">
                    <div className="w-7 h-7 rounded-full bg-[#E8EDF5] flex items-center justify-center text-[10px] font-bold text-[#1E3A6E]">
                      {c.name.split(" ")[1]?.[0]}{c.name.split(" ")[2]?.[0]}
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-gray-800">{c.name}</div>
                      <div className="text-[11px] text-[#64748B]">{c.role} · {c.dept}</div>
                    </div>
                  </div>
                ))}
              </Card>

              <Card title="Encounter Info">
                <div className="space-y-1.5 text-[12px]">
                  {[
                    { l: "Admit Date", v: "Aug 22, 2026 · 2:10 PM" },
                    { l: "Admit Reason", v: "Hyperglycemic urgency" },
                    { l: "LOS", v: "1 day 20 hrs" },
                    { l: "Expected DC", v: "Aug 24, 2026" },
                    { l: "Unit", v: "3N Medical" },
                    { l: "Bed", v: "204-A" },
                    { l: "Diet", v: "ADA 1800 cal/day" },
                    { l: "Code Status", v: "Full Code" },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex justify-between py-0.5 border-b border-[#F8FAFC] last:border-0">
                      <span className="text-[#64748B]">{l}</span>
                      <span className="font-medium text-gray-800 text-right ml-2">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Insurance">
                <div className="space-y-1.5 text-[12px]">
                  {[
                    { l: "Primary", v: "BlueCross PPO" },
                    { l: "ID", v: "BCB-28847291" },
                    { l: "Group", v: "EMR-44102" },
                    { l: "Auth #", v: "AUTH-2026-18845" },
                    { l: "Auth Status", v: "✓ Approved" },
                    { l: "Copay", v: "$250 inpatient" },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex justify-between py-0.5 border-b border-[#F8FAFC] last:border-0">
                      <span className="text-[#64748B]">{l}</span>
                      <span className="font-medium text-gray-800">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === "Timeline" && (
          <div className="max-w-2xl">
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
              {["All", "Clinical", "Lab", "Imaging", "Medication", "Billing"].map(f => (
                <button key={f} onClick={() => setTimelineFilter(f)}
                  className={`px-3 py-1 text-[11.5px] font-medium rounded-full border transition-colors
                    ${timelineFilter === f ? "bg-[#1B4FD8] text-white border-[#1B4FD8]" : "bg-white text-[#64748B] border-[#DDE2EC] hover:border-[#94A3B8]"}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="bg-white border border-[#DDE2EC] rounded p-4">
              {TIMELINE_EVENTS
                .filter(e => timelineFilter === "All" || e.type === timelineFilter.toLowerCase())
                .map((e, i, arr) => (
                  <TimelineItem key={i} {...e} isLast={i === arr.length - 1} />
                ))}
            </div>
          </div>
        )}

        {tab === "Problems" && (
          <Card title="Problem List" actions={<Btn variant="primary" size="xs">+ Add Problem</Btn>}>
            <Table headers={["ICD-10", "Problem", "Onset", "Status", "Provider", ""]}>
              {PROBLEMS.map((p, i) => (
                <TR key={i}>
                  <TD><span className="font-mono text-[11.5px] text-[#64748B]">{p.code}</span></TD>
                  <TD><span className="font-medium text-gray-800">{p.name}</span></TD>
                  <TD><span className="font-mono text-[11.5px]">{p.onset}</span></TD>
                  <TD><StatusBadge status={p.status} /></TD>
                  <TD><span className="text-[#64748B]">{p.provider}</span></TD>
                  <TD><Btn variant="ghost" size="xs">Edit</Btn></TD>
                </TR>
              ))}
            </Table>
          </Card>
        )}

        {tab === "Medications" && (
          <Card title="Medication List" actions={
            <div className="flex gap-2">
              <Btn variant="outline" size="xs"><Icon.Download /> Reconcile</Btn>
              <Btn variant="primary" size="xs">+ Add Medication</Btn>
            </div>
          }>
            <Table headers={["Medication", "Dose", "Route", "Frequency", "Start Date", "Prescriber", "Status", ""]}>
              {MEDICATIONS.map((m, i) => (
                <TR key={i}>
                  <TD><span className="font-medium text-gray-800">{m.name}</span></TD>
                  <TD><span className="font-mono text-[12px]">{m.dose}</span></TD>
                  <TD><span className="font-mono text-[11.5px] text-[#64748B]">{m.route}</span></TD>
                  <TD>{m.freq}</TD>
                  <TD><span className="font-mono text-[11.5px]">{m.start}</span></TD>
                  <TD><span className="text-[#64748B]">{m.prescriber}</span></TD>
                  <TD><StatusBadge status={m.status} /></TD>
                  <TD>
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="xs">Edit</Btn>
                      <Btn variant="ghost" size="xs">D/C</Btn>
                    </div>
                  </TD>
                </TR>
              ))}
            </Table>
          </Card>
        )}

        {tab === "Labs" && (
          <Card title="Laboratory Results" actions={
            <div className="flex gap-2">
              <Btn variant="outline" size="xs"><Icon.Filter /> Filter</Btn>
              <Btn variant="primary" size="xs" onClick={openOrder}>+ Order Lab</Btn>
            </div>
          }>
            <Table headers={["Panel", "Component", "Value", "Unit", "Reference Range", "Flag", "Ordered", ""]}>
              {LABS.map((l, i) => (
                <TR key={i}>
                  <TD><span className="font-medium text-gray-700">{l.test}</span></TD>
                  <TD>{l.component}</TD>
                  <TD>
                    <span className={`font-mono font-semibold ${l.flag === "HH" ? "text-[#B91C1C] bg-[#FEE2E2] px-1.5 py-0.5 rounded" : l.flag === "H" ? "text-[#D97706]" : l.flag === "L" ? "text-[#0284C7]" : ""}`}>
                      {l.value}
                    </span>
                  </TD>
                  <TD><span className="text-[#64748B] font-mono text-[11.5px]">{l.unit}</span></TD>
                  <TD><span className="text-[#94A3B8] font-mono text-[11.5px]">{l.ref}</span></TD>
                  <TD>
                    {l.flag && (
                      <span className={`font-mono font-bold text-[12px] ${l.flag === "HH" ? "text-[#B91C1C]" : l.flag === "H" ? "text-[#D97706]" : "text-[#0284C7]"}`}>
                        {l.flag}
                      </span>
                    )}
                  </TD>
                  <TD><span className="font-mono text-[11px] text-[#94A3B8]">{l.time}</span></TD>
                  <TD><Btn variant="ghost" size="xs">Trend</Btn></TD>
                </TR>
              ))}
            </Table>
          </Card>
        )}

        {tab === "Orders" && (
          <Card title="Active & Recent Orders" actions={
            <div className="flex gap-2">
              <Btn variant="outline" size="xs"><Icon.Filter /> Filter</Btn>
              <Btn variant="primary" size="xs" onClick={openOrder}>+ New Order</Btn>
            </div>
          }>
            <Table headers={["Type", "Order", "Priority", "Status", "Provider", "Time", ""]}>
              {ORDERS.map((o, i) => (
                <TR key={i}>
                  <TD>
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide
                      ${o.type === "Lab" ? "bg-[#EDE9FE] text-[#6D28D9]" : o.type === "Imaging" ? "bg-[#E0F2FE] text-[#0369A1]" : o.type === "Medication" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#374151]"}`}>
                      {o.type}
                    </span>
                  </TD>
                  <TD><span className="font-medium text-gray-800">{o.name}</span></TD>
                  <TD>
                    <span className={`text-[11.5px] font-medium ${o.priority === "Urgent" ? "text-[#DC2626]" : "text-[#64748B]"}`}>{o.priority}</span>
                  </TD>
                  <TD><StatusBadge status={o.status} /></TD>
                  <TD><span className="text-[#64748B] text-[11.5px]">{o.provider}</span></TD>
                  <TD><span className="font-mono text-[11px] text-[#94A3B8]">{o.time}</span></TD>
                  <TD>
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="xs">View</Btn>
                      <Btn variant="ghost" size="xs">D/C</Btn>
                    </div>
                  </TD>
                </TR>
              ))}
            </Table>
          </Card>
        )}

        {tab === "Notes" && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Clinical Nurse Progress Notes Timeline</h3>
                <p className="text-[11.5px] text-[#64748B]">Audited nursing observations for John Smith (MRN: 100245 · Bed 204-A)</p>
              </div>
              <Btn variant="primary" size="sm" onClick={() => setChartNoteModalOpen(true)}>+ Add Nurse Note</Btn>
            </div>

            <div className="space-y-4">
              {NursingDatabase.getNotes("P-100245").map((note: any) => (
                <div key={note.id} className={`bg-white border rounded-lg p-4 shadow-sm ${note.isAddendum ? "border-l-4 border-l-[#7C3AED] bg-[#FCFAFF]" : "border-[#DDE2EC]"}`}>
                  <div className="flex items-start justify-between border-b border-[#F1F5F9] pb-2 mb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold bg-[#EFF6FF] text-[#1B4FD8] px-2 py-0.5 rounded border border-[#BFDBFE]">
                        {note.id}
                      </span>
                      <span className="text-[12px] font-bold px-2 py-0.5 bg-[#F1F5F9] text-gray-800 rounded">
                        {note.noteType}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${note.patientCondition === "Stable" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}>
                        Condition: {note.patientCondition}
                      </span>
                    </div>
                    <div className="text-right text-[11px]">
                      <span className="font-bold text-gray-900">{note.nurseName}</span>
                      <span className="text-[#64748B] font-mono ml-2">
                        {new Date(note.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {note.shift}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-[12px]">
                    <div>
                      <strong className="text-[11px] uppercase tracking-wide text-gray-700 block mb-0.5">👁 Observations:</strong>
                      <p className="text-gray-800 bg-[#F8FAFC] p-2.5 rounded border border-[#F1F5F9]">{note.clinicalObservations}</p>
                    </div>

                    {note.vitalSigns && note.vitalSigns.bp && (
                      <div className="flex items-center gap-3 bg-[#EFF6FF] p-2 rounded text-[11px] font-mono flex-wrap">
                        <span className="font-bold text-[#1E3A8A]">Vitals:</span>
                        <span>BP: {note.vitalSigns.bp}</span>
                        <span>HR: {note.vitalSigns.hr} bpm</span>
                        <span>SpO₂: {note.vitalSigns.spo2}%</span>
                        <span>Temp: {note.vitalSigns.temp}</span>
                      </div>
                    )}

                    <div>
                      <strong className="text-[11px] uppercase tracking-wide text-gray-700 block mb-0.5">💉 Interventions Performed:</strong>
                      <p className="text-gray-800">{note.interventions}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-[#F1F5F9] text-[11.5px]">
                      <div><strong>Patient Response:</strong> {note.patientResponse}</div>
                      <div><strong>Follow-up Plan:</strong> {note.followUpPlan}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(tab !== "Summary" && tab !== "Timeline" && tab !== "Problems" && tab !== "Medications" && tab !== "Labs" && tab !== "Orders" && tab !== "Notes") && (
          <div className="bg-white border border-[#DDE2EC] rounded p-12 text-center">
            <div className="text-[#94A3B8] text-3xl mb-2">📋</div>
            <div className="text-sm font-semibold text-gray-700 mb-1">{tab}</div>
            <div className="text-[12px] text-[#64748B]">Content for this section is available in the full implementation.</div>
          </div>
        )}
      </div>

      {/* Chart Nurse Note Modal */}
      {chartNoteModalOpen && (
        <ChartNoteQuickModal
          onClose={() => setChartNoteModalOpen(false)}
          onSaved={() => setChartNoteModalOpen(false)}
        />
      )}

      {/* Care Team Message Modal */}
      {chartMessageModalOpen && (
        <CareTeamMessageModal
          onClose={() => setChartMessageModalOpen(false)}
        />
      )}
    </div>
  );
}

function ChartNoteQuickModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [noteType, setNoteType] = useState<any>("Shift Assessment");
  const [obs, setObs] = useState("");
  const [interventions, setInterventions] = useState("");
  const currentStaff = NursingDatabase.getAuthenticatedStaff();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obs.trim() || !interventions.trim()) {
      alert("Please provide Observations and Interventions.");
      return;
    }
    NursingDatabase.addNote("P-100245", {
      noteType: noteType,
      clinicalObservations: obs.trim(),
      patientCondition: "Stable",
      interventions: interventions.trim(),
      patientResponse: "Patient resting comfortably.",
      followUpPlan: "Continue scheduled monitoring.",
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-[#DDE2EC] w-full max-w-lg overflow-hidden">
        <div className="bg-[#1B4FD8] text-white px-5 py-3.5 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[14px]">Chart Clinical Note — John Smith (Rm 204)</h3>
            <p className="text-[11px] text-white/80">Author: {currentStaff.name} ({currentStaff.activeShift})</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-lg">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3 text-[12px]">
          <div>
            <label className="font-bold block mb-1">Note Type</label>
            <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className="w-full border p-2 rounded bg-white">
              <option value="Shift Assessment">Shift Assessment</option>
              <option value="Vital Sign Observation">Vital Sign Observation</option>
              <option value="Medication Administration">Medication Administration</option>
              <option value="Critical Condition Change">Critical Condition Change</option>
            </select>
          </div>
          <div>
            <label className="font-bold block mb-1">Clinical Observations *</label>
            <textarea rows={3} placeholder="Enter clinical assessment..." value={obs} onChange={(e) => setObs(e.target.value)} className="w-full border p-2 rounded" required />
          </div>
          <div>
            <label className="font-bold block mb-1">Interventions Performed *</label>
            <textarea rows={2} placeholder="Enter nursing interventions..." value={interventions} onChange={(e) => setInterventions(e.target.value)} className="w-full border p-2 rounded" required />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" className="px-4 py-1.5 bg-[#1B4FD8] text-white font-bold rounded">✓ Save to Chart</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CareTeamMessageModal({ onClose }: { onClose: () => void }) {
  const [msg, setMsg] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const currentStaff = NursingDatabase.getAuthenticatedStaff();
  const msgs = NursingDatabase.getMessages("P-100245");

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    NursingDatabase.sendMessage("P-100245", msg.trim(), "Clinical Update", isUrgent);
    setMsg("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-[#DDE2EC] w-full max-w-lg h-[500px] flex flex-col overflow-hidden">
        <div className="bg-[#0C1524] text-white px-5 py-3.5 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[14px]">Care Team Intercom — John Smith (Rm 204)</h3>
            <p className="text-[11px] text-[#94A3B8]">Connected: Dr. M. Anderson ↔ Jessica Carter, RN</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#F8FAFC]">
          {msgs.map((m: any) => (
            <div key={m.id} className={`p-2.5 rounded-lg text-[12px] ${m.senderRole === "Doctor" ? "bg-white border text-gray-900 mr-8" : "bg-[#EFF6FF] border border-[#BFDBFE] text-gray-900 ml-8"}`}>
              <div className="flex justify-between font-bold text-[11px] mb-1">
                <span>{m.senderName} ({m.senderRole})</span>
                <span className="text-[#94A3B8] font-mono">{new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p>{m.messageText}</p>
            </div>
          ))}
        </div>

        <form onSubmit={send} className="p-3 border-t bg-white flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-gray-700">Sending as: {currentStaff.name}</span>
            <label className="text-[#DC2626] font-bold flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="accent-[#DC2626]" />
              ⚠ Urgent
            </label>
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="Type care team message..." value={msg} onChange={(e) => setMsg(e.target.value)} className="flex-1 border p-2 rounded text-[12px]" />
            <button type="submit" className="px-4 py-2 bg-[#1B4FD8] text-white font-bold rounded text-[12px]">Send</button>
          </div>
        </form>
      </div>
    </div>
  );
}
