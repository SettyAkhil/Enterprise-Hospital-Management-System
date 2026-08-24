import React, { useState } from "react";
import { QueueTab, Table, TR, TD, StatusBadge, Btn, Card } from "./shared";

const QUEUES = [
  { label: "Pending", count: 18 },
  { label: "Collected", count: 12 },
  { label: "Processing", count: 9 },
  { label: "Completed", count: 47 },
  { label: "Critical", count: 3 },
];

const LAB_ORDERS = [
  { patient: "Thomas Reed", mrn: "100301", test: "Troponin I", priority: "STAT", collected: "09:28", status: "Processing", provider: "Dr. Shah" },
  { patient: "John Smith", mrn: "100245", test: "BMP", priority: "Routine", collected: "08:42", status: "Completed", provider: "Dr. Anderson" },
  { patient: "Mary Jones", mrn: "100246", test: "CBC w/ Diff", priority: "Routine", collected: "09:10", status: "Collected", provider: "Dr. Lee" },
  { patient: "Ann Martinez", mrn: "100088", test: "Lactic Acid", priority: "STAT", collected: "10:02", status: "Processing", provider: "Dr. Chen" },
  { patient: "Patricia Okonkwo", mrn: "100149", test: "X-Match T&S", priority: "STAT", collected: "10:15", status: "Pending", provider: "Dr. Williams" },
  { patient: "Elena Vasquez", mrn: "100198", test: "UA w/ Culture", priority: "Routine", collected: "09:45", status: "Pending", provider: "Dr. Chen" },
  { patient: "Marcus Kim", mrn: "100377", test: "TSH", priority: "Routine", collected: "—", status: "Pending", provider: "Dr. Park" },
];

const RESULTS_DETAIL = [
  { component: "WBC", value: "14.2", unit: "K/μL", ref: "4.5–11.0", flag: "H" },
  { component: "RBC", value: "4.81", unit: "M/μL", ref: "4.5–5.9", flag: "" },
  { component: "Hemoglobin", value: "13.4", unit: "g/dL", ref: "13.5–17.5", flag: "L" },
  { component: "Hematocrit", value: "40.2", unit: "%", ref: "41–53", flag: "L" },
  { component: "MCV", value: "83.6", unit: "fL", ref: "80–100", flag: "" },
  { component: "Platelets", value: "218", unit: "K/μL", ref: "150–400", flag: "" },
  { component: "Neutrophils", value: "78.4", unit: "%", ref: "50–70", flag: "H" },
  { component: "Lymphocytes", value: "14.2", unit: "%", ref: "20–40", flag: "L" },
];

const CRITICAL_RESULTS = [
  { patient: "John Smith", mrn: "100245", test: "Potassium", value: "6.2 mmol/L", threshold: "> 6.0", provider: "Dr. Anderson", notified: "10:15 AM" },
  { patient: "Thomas Reed", mrn: "100301", test: "Troponin I", value: "1.8 ng/mL", threshold: "> 0.4", provider: "Dr. Shah", notified: "Pending" },
  { patient: "Ann Martinez", mrn: "100088", test: "Lactic Acid", value: "4.2 mmol/L", threshold: "> 4.0", provider: "Dr. Chen", notified: "Pending" },
];

export default function Laboratory() {
  const [activeQueue, setActiveQueue] = useState(0);
  const [selected, setSelected] = useState(1);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Laboratory</h1>
          <p className="text-[11.5px] text-[#64748B]">Clinical Laboratory · General Hospital · 89 orders today</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm">Accession</Btn>
          <Btn variant="primary" size="sm">+ Manual Entry</Btn>
        </div>
      </div>

      {/* Critical Results Banner */}
      <div className="bg-[#FEF2F2] border-b border-[#FECACA] px-6 py-2.5 flex items-center gap-3">
        <span className="text-[#B91C1C] font-bold text-sm">⚠</span>
        <span className="text-[12.5px] font-semibold text-[#B91C1C]">3 Critical Results Require Provider Notification</span>
        <Btn variant="danger" size="xs">Review Critical Values</Btn>
      </div>

      {/* Queue Tabs */}
      <div className="bg-white border-b border-[#DDE2EC] flex">
        {QUEUES.map((q, i) => (
          <QueueTab key={i} label={q.label} count={q.count} active={activeQueue === i} onClick={() => setActiveQueue(i)} />
        ))}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Order List */}
        <div className="lg:col-span-2 space-y-4">
          {activeQueue === 4 ? (
            <Card title="Critical Values — Requires Immediate Action">
              <div className="space-y-3">
                {CRITICAL_RESULTS.map((c, i) => (
                  <div key={i} className={`border rounded p-3 ${c.notified === "Pending" ? "border-[#FECACA] bg-[#FEF2F2] critical-pulse" : "border-[#DDE2EC]"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13px] text-gray-900">{c.patient}</span>
                          <span className="font-mono text-[11.5px] text-[#64748B]">MRN: {c.mrn}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[12px]">
                          <span className="font-medium text-[#B91C1C]">{c.test}: <span className="font-mono">{c.value}</span></span>
                          <span className="text-[#64748B]">Threshold: {c.threshold}</span>
                          <span className="text-[#64748B]">Provider: {c.provider}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.notified === "Pending" ? (
                          <Btn variant="danger" size="xs">Notify Provider</Btn>
                        ) : (
                          <span className="text-[11.5px] text-[#16A34A] font-medium">✓ Notified {c.notified}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card title="Lab Orders" actions={
              <div className="flex gap-1.5">
                <Btn variant="ghost" size="xs">Filter</Btn>
                <Btn variant="ghost" size="xs">Export</Btn>
              </div>
            }>
              <Table headers={["Patient", "MRN", "Test", "Priority", "Collected", "Status", "Provider", ""]}>
                {LAB_ORDERS.map((o, i) => (
                  <TR key={i} onClick={() => setSelected(i)}>
                    <TD><span className="font-semibold text-gray-800">{o.patient}</span></TD>
                    <TD><span className="font-mono text-[11.5px] text-[#64748B]">{o.mrn}</span></TD>
                    <TD><span className="font-medium">{o.test}</span></TD>
                    <TD>
                      <span className={`text-[11.5px] font-semibold ${o.priority === "STAT" ? "text-[#DC2626]" : "text-[#64748B]"}`}>{o.priority}</span>
                    </TD>
                    <TD><span className="font-mono text-[11.5px]">{o.collected}</span></TD>
                    <TD><StatusBadge status={o.status} /></TD>
                    <TD><span className="text-[#64748B] text-[11.5px]">{o.provider}</span></TD>
                    <TD>
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="xs">Result</Btn>
                        <Btn variant="ghost" size="xs">Flag</Btn>
                      </div>
                    </TD>
                  </TR>
                ))}
              </Table>
            </Card>
          )}
        </div>

        {/* Right: Result Detail */}
        <div className="space-y-4">
          <Card title="CBC w/ Differential" actions={<Btn variant="ghost" size="xs">Trend</Btn>}>
            <div className="text-[11.5px] text-[#64748B] mb-3">
              <span className="font-medium text-gray-700">John Smith</span> · MRN 100245 · Collected 09:10 AM
            </div>
            <div className="space-y-0.5">
              {RESULTS_DETAIL.map((r, i) => (
                <div key={i} className={`flex items-center justify-between py-1.5 border-b border-[#F8FAFC] last:border-0 rounded px-1
                  ${r.flag === "H" || r.flag === "HH" ? "bg-[#FFFBEB]" : r.flag === "L" ? "bg-[#EFF6FF]" : ""}`}>
                  <span className="text-[12px] text-gray-700 w-28">{r.component}</span>
                  <span className={`font-mono font-semibold text-[12px] ${r.flag === "H" || r.flag === "HH" ? "text-[#D97706]" : r.flag === "L" ? "text-[#0284C7]" : "text-gray-800"}`}>
                    {r.value}
                  </span>
                  <span className="text-[11px] text-[#94A3B8] font-mono w-12 text-right">{r.unit}</span>
                  <span className="text-[10.5px] text-[#94A3B8] w-16 text-right hidden md:block">{r.ref}</span>
                  <span className={`w-5 text-right font-mono font-bold text-[11.5px] ${r.flag === "H" ? "text-[#D97706]" : r.flag === "L" ? "text-[#0284C7]" : ""}`}>{r.flag}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Btn variant="primary" size="xs">Verify Result</Btn>
              <Btn variant="outline" size="xs">Add Comment</Btn>
              <Btn variant="outline" size="xs">Notify</Btn>
            </div>
          </Card>

          <Card title="Turnaround Time">
            <div className="space-y-2 text-[12px]">
              {[
                { test: "Troponin", target: "60m", actual: "45m", ok: true },
                { test: "CBC", target: "90m", actual: "88m", ok: true },
                { test: "BMP", target: "90m", actual: "72m", ok: true },
                { test: "Blood Culture", target: "24h", actual: "Pending", ok: true },
              ].map((t, i) => (
                <div key={i} className="flex justify-between items-center py-0.5 border-b border-[#F8FAFC] last:border-0">
                  <span className="text-gray-700">{t.test}</span>
                  <span className="text-[#94A3B8] text-[11px]">Target: {t.target}</span>
                  <span className={`font-mono font-semibold text-[11.5px] ${t.ok ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{t.actual}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
