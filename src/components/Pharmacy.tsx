import React, { useState } from "react";
import { QueueTab, Table, TR, TD, StatusBadge, Btn, Card, AlertBanner } from "./shared";

const QUEUES = [
  { label: "New Rx", count: 14 },
  { label: "Verification", count: 8 },
  { label: "Filling", count: 6 },
  { label: "Ready", count: 11 },
  { label: "Dispensed", count: 34 },
];

const ORDERS = [
  { patient: "Ann Martinez", mrn: "100088", drug: "Vancomycin", dose: "1g", route: "IV", freq: "Q12H", priority: "STAT", prescriber: "Dr. Chen", status: "Verification", flag: "Renally adjust" },
  { patient: "John Smith", mrn: "100245", drug: "Insulin Lispro", dose: "4 units", route: "SC", freq: "AC meals", priority: "Routine", prescriber: "Dr. Anderson", status: "Filling", flag: "" },
  { patient: "Thomas Reed", mrn: "100301", drug: "Heparin Drip", dose: "1000u/hr", route: "IV", freq: "Continuous", priority: "STAT", prescriber: "Dr. Shah", status: "New Rx", flag: "Weight-based" },
  { patient: "Mary Jones", mrn: "100246", drug: "Metoprolol", dose: "25mg", route: "PO", freq: "BID", priority: "Routine", prescriber: "Dr. Lee", status: "Ready", flag: "" },
  { patient: "Patricia Okonkwo", mrn: "100149", drug: "Morphine", dose: "2mg", route: "IV", freq: "Q4H PRN", priority: "Urgent", prescriber: "Dr. Williams", status: "New Rx", flag: "Controlled substance" },
  { patient: "George Watts", mrn: "100212", drug: "Labetalol", dose: "20mg", route: "IV", freq: "Q10min PRN", priority: "STAT", prescriber: "Dr. Chen", status: "Dispensed", flag: "" },
  { patient: "Sandra Brown", mrn: "100331", drug: "Sumatriptan", dose: "6mg", route: "SC", freq: "PRN", priority: "Routine", prescriber: "Dr. Williams", status: "Ready", flag: "" },
  { patient: "Elena Vasquez", mrn: "100198", drug: "Ciprofloxacin", dose: "400mg", route: "IV", freq: "Q12H", priority: "Routine", prescriber: "Dr. Chen", status: "Filling", flag: "" },
];

const MAR_ENTRIES = [
  { time: "07:30", drug: "Metformin 1000mg PO BID", status: "Given", nurse: "RN Carter" },
  { time: "07:30", drug: "Lisinopril 10mg PO Daily", status: "Given", nurse: "RN Carter" },
  { time: "07:30", drug: "Metoprolol Succinate 50mg PO Daily", status: "Given", nurse: "RN Carter" },
  { time: "07:30", drug: "Atorvastatin 40mg PO QHS", status: "Due", nurse: "—" },
  { time: "08:00", drug: "Normal Saline 0.9% 125mL/hr IV", status: "Running", nurse: "RN Carter" },
  { time: "11:00", drug: "Metformin 1000mg PO BID", status: "Due", nurse: "—" },
  { time: "21:00", drug: "Atorvastatin 40mg PO QHS", status: "Scheduled", nurse: "—" },
];

export default function Pharmacy() {
  const [activeQueue, setActiveQueue] = useState(0);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Pharmacy</h1>
          <p className="text-[11.5px] text-[#64748B]">Inpatient Pharmacy · General Hospital · 73 orders today</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm">Drug Reference</Btn>
          <Btn variant="primary" size="sm">+ Manual Order</Btn>
        </div>
      </div>

      {/* Queue Tabs */}
      <div className="bg-white border-b border-[#DDE2EC] flex">
        {QUEUES.map((q, i) => (
          <QueueTab key={i} label={q.label} count={q.count} active={activeQueue === i} onClick={() => setActiveQueue(i)} />
        ))}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AlertBanner type="warning" title="Drug Interaction Alert"
            body="Vancomycin + Furosemide for Ann Martinez — Increased nephrotoxicity risk. Review renal function." action="Review" />

          <Card title="Medication Orders" actions={
            <div className="flex gap-1.5">
              <Btn variant="ghost" size="xs">Filter</Btn>
              <Btn variant="ghost" size="xs">Export</Btn>
            </div>
          }>
            <Table headers={["Patient", "Medication", "Dose", "Route", "Freq", "Priority", "Prescriber", "Status", ""]}>
              {ORDERS.map((o, i) => (
                <TR key={i}>
                  <TD>
                    <div>
                      <div className="font-semibold text-gray-800 text-[12.5px]">{o.patient}</div>
                      <div className="font-mono text-[10.5px] text-[#94A3B8]">{o.mrn}</div>
                    </div>
                  </TD>
                  <TD>
                    <div>
                      <div className="font-medium text-gray-800">{o.drug}</div>
                      {o.flag && <div className="text-[11px] text-[#D97706] font-medium">⚠ {o.flag}</div>}
                    </div>
                  </TD>
                  <TD><span className="font-mono text-[12px]">{o.dose}</span></TD>
                  <TD><span className="font-mono text-[11.5px] text-[#64748B]">{o.route}</span></TD>
                  <TD><span className="text-[11.5px]">{o.freq}</span></TD>
                  <TD>
                    <span className={`text-[11.5px] font-semibold ${o.priority === "STAT" ? "text-[#DC2626]" : o.priority === "Urgent" ? "text-[#D97706]" : "text-[#64748B]"}`}>
                      {o.priority}
                    </span>
                  </TD>
                  <TD><span className="text-[#64748B] text-[11.5px]">{o.prescriber}</span></TD>
                  <TD><StatusBadge status={o.status.replace(" ", "")} /></TD>
                  <TD>
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="xs">Verify</Btn>
                      <Btn variant="ghost" size="xs">DUR</Btn>
                    </div>
                  </TD>
                </TR>
              ))}
            </Table>
          </Card>
        </div>

        {/* MAR */}
        <div className="space-y-4">
          <Card title="MAR — John Smith" actions={<Btn variant="ghost" size="xs">Full MAR</Btn>}>
            <div className="text-[11px] text-[#64748B] mb-2.5">MRN 100245 · Aug 23, 2026</div>
            <div className="space-y-1">
              {MAR_ENTRIES.map((e, i) => (
                <div key={i} className={`flex items-start gap-2.5 p-2 rounded border ${e.status === "Given" ? "border-[#BBF7D0] bg-[#F0FDF4]" : e.status === "Running" ? "border-[#BAE6FD] bg-[#F0F9FF]" : e.status === "Due" ? "border-[#FDE68A] bg-[#FFFBEB]" : "border-[#F1F5F9] bg-[#F8FAFC]"}`}>
                  <span className="font-mono text-[11px] text-[#94A3B8] w-10 flex-shrink-0">{e.time}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-gray-800 leading-tight">{e.drug}</div>
                    <div className="text-[10.5px] text-[#64748B] mt-0.5">{e.nurse}</div>
                  </div>
                  <span className={`text-[11px] font-semibold flex-shrink-0 ${e.status === "Given" ? "text-[#16A34A]" : e.status === "Running" ? "text-[#0284C7]" : e.status === "Due" ? "text-[#D97706]" : "text-[#94A3B8]"}`}>
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Pharmacy Workload">
            <div className="space-y-2 text-[12px]">
              {[
                { label: "Orders to verify", value: "8", color: "#D97706" },
                { label: "Fill queue", value: "6", color: "#0284C7" },
                { label: "Ready for pickup", value: "11", color: "#16A34A" },
                { label: "STAT orders", value: "3", color: "#DC2626" },
                { label: "Controlled substances", value: "5", color: "#7C3AED" },
              ].map((w, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-[#F8FAFC] last:border-0">
                  <span className="text-[#64748B]">{w.label}</span>
                  <span className="font-mono font-semibold text-[14px]" style={{ color: w.color }}>{w.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
