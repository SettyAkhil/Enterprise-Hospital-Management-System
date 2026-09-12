import React, { useEffect, useMemo, useState } from "react";
import { QueueTab, Table, TR, TD, StatusBadge, Btn, Card } from "./shared";
import { LabOrder, LabOrderDatabase, LabOrderTest } from "../services/labOrdersDb";
import { AuditDatabase } from "../services/auditDb";

/**
 * Laboratory worklist.
 *
 * Orders reach this screen from the doctor portal, but only after reception has
 * billed them -- `LabOrderDatabase.getLabWorklist()` excludes anything still
 * awaiting payment, so an unpaid investigation is invisible here by design.
 *
 * The static sample below is the original demo content; it is shown only while
 * no real order exists, so a fresh install still has something to look at.
 */

const SAMPLE_ORDERS = [
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

type WorklistQueue = "Billed" | "Sample Collected" | "In Progress" | "Completed";

const QUEUE_ORDER: WorklistQueue[] = ["Billed", "Sample Collected", "In Progress", "Completed"];
const QUEUE_LABELS: Record<WorklistQueue, string> = {
  Billed: "Paid · Awaiting Sample",
  "Sample Collected": "Sample Collected",
  "In Progress": "Processing",
  Completed: "Completed",
};

export default function Laboratory({ technician = "Laboratory" }: { technician?: string }) {
  const [tick, setTick] = useState(0);
  const [activeQueue, setActiveQueue] = useState<WorklistQueue>("Billed");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [sampleSelected, setSampleSelected] = useState(1);
  const [resultDrafts, setResultDrafts] = useState<Record<string, { value: string; unit: string; ref: string; flag: LabOrderTest["flag"] }>>({});

  useEffect(() => LabOrderDatabase.subscribe(() => setTick(t => t + 1)), []);

  const worklist = useMemo(() => LabOrderDatabase.getLabWorklist(), [tick]);
  const queued = useMemo(() => worklist.filter(order => order.status === activeQueue), [worklist, activeQueue]);
  const selected = useMemo(
    () => worklist.find(order => order.id === selectedOrderId) || queued[0],
    [worklist, queued, selectedOrderId]
  );

  const criticalCount = useMemo(
    () => worklist.filter(order => order.tests.some(test => test.flag === "Critical")).length,
    [worklist]
  );
  const statCount = useMemo(
    () => worklist.filter(order => order.status !== "Completed" && order.tests.some(test => test.urgency === "STAT")).length,
    [worklist]
  );

  const advance = (order: LabOrder, status: LabOrder["status"]) => {
    LabOrderDatabase.advanceStatus(order.id, status, technician);
    AuditDatabase.logEvent(
      "Lab Order Updated",
      "Laboratory",
      `${order.id} for ${order.patientName} (${order.umr}) moved to ${status}.`,
      "Success"
    );
  };

  const saveResult = (order: LabOrder, test: LabOrderTest) => {
    const draft = resultDrafts[`${order.id}:${test.id}`];
    if (!draft?.value.trim()) return;
    LabOrderDatabase.recordResult(
      order.id,
      test.id,
      { value: draft.value.trim(), unit: draft.unit, referenceRange: draft.ref, flag: draft.flag },
      technician
    );
    setResultDrafts(previous => {
      const next = { ...previous };
      delete next[`${order.id}:${test.id}`];
      return next;
    });
  };

  const draftFor = (order: LabOrder, test: LabOrderTest) =>
    resultDrafts[`${order.id}:${test.id}`] || { value: "", unit: test.resultUnit || "", ref: test.referenceRange || "", flag: "" as LabOrderTest["flag"] };

  const setDraft = (order: LabOrder, test: LabOrderTest, patch: Partial<{ value: string; unit: string; ref: string; flag: LabOrderTest["flag"] }>) =>
    setResultDrafts(previous => ({
      ...previous,
      [`${order.id}:${test.id}`]: { ...draftFor(order, test), ...patch },
    }));

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Laboratory</h1>
          <p className="text-[11.5px] text-[#64748B]">
            Clinical Laboratory · {worklist.length} billed order(s) from the doctor portal
            {statCount > 0 ? ` · ${statCount} STAT` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm">Accession</Btn>
          <Btn variant="primary" size="sm">+ Manual Entry</Btn>
        </div>
      </div>

      {(criticalCount > 0 || worklist.length === 0) && (
        <div className="bg-[#FEF2F2] border-b border-[#FECACA] px-6 py-2.5 flex items-center gap-3">
          <span className="text-[#B91C1C] font-bold text-sm">⚠</span>
          <span className="text-[12.5px] font-semibold text-[#B91C1C]">
            {criticalCount > 0
              ? `${criticalCount} order(s) with critical values require provider notification`
              : "3 Critical Results Require Provider Notification"}
          </span>
          <Btn variant="danger" size="xs">Review Critical Values</Btn>
        </div>
      )}

      {/* ── Live worklist from the doctor portal ─────────────────────────── */}
      <div className="bg-white border-b border-[#DDE2EC] flex overflow-x-auto">
        {QUEUE_ORDER.map(queue => (
          <QueueTab
            key={queue}
            label={QUEUE_LABELS[queue]}
            count={worklist.filter(order => order.status === queue).length}
            active={activeQueue === queue}
            onClick={() => {
              setActiveQueue(queue);
              setSelectedOrderId(null);
            }}
          />
        ))}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card title={`Orders — ${QUEUE_LABELS[activeQueue]}`}>
            {queued.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-2xl mb-2">🧪</div>
                <p className="text-[12.5px] font-semibold text-[#334155]">Nothing in this queue</p>
                <p className="text-[11.5px] text-[#94A3B8] mt-1">
                  Doctor-ordered investigations arrive here once reception has collected payment for them.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {queued.map(order => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left px-1 py-3 transition-colors ${
                      selected?.id === order.id ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap px-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[13px] text-gray-900">{order.patientName}</span>
                          <span className="text-[11px] font-mono text-[#64748B]">
                            {order.umr} · {order.opNumber} · {order.age}
                            {order.sex?.[0]}
                          </span>
                          {order.tests.some(test => test.urgency === "STAT") && (
                            <span className="text-[10px] font-bold bg-[#FEE2E2] text-[#B91C1C] px-1.5 py-0.5 rounded border border-[#FECACA]">
                              STAT
                            </span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-[#64748B] mt-0.5">
                          {order.doctorName} · {order.department}
                          {order.diagnosis ? ` · ${order.diagnosis}` : ""}
                        </div>
                        <div className="text-[11.5px] text-[#475569] mt-1">
                          {order.tests.map(test => test.name).join(" · ")}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[10.5px] font-mono text-[#94A3B8]">{order.id}</div>
                        <div className="mt-1"><StatusBadge status={order.status} /></div>
                        <div className="text-[10.5px] text-[#15803D] mt-1">
                          Paid ₹{order.billing.total.toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {worklist.length === 0 && (
            <Card
              title="Sample worklist"
              actions={<span className="text-[10.5px] text-[#94A3B8]">Demo data — replaced by real orders</span>}
            >
              <Table headers={["Patient", "MRN", "Test", "Priority", "Collected", "Status", "Provider", ""]}>
                {SAMPLE_ORDERS.map((order, index) => (
                  <TR key={index} onClick={() => setSampleSelected(index)}>
                    <TD><span className="font-semibold text-gray-800">{order.patient}</span></TD>
                    <TD><span className="font-mono text-[11.5px] text-[#64748B]">{order.mrn}</span></TD>
                    <TD><span className="font-medium">{order.test}</span></TD>
                    <TD>
                      <span className={`text-[11.5px] font-semibold ${order.priority === "STAT" ? "text-[#DC2626]" : "text-[#64748B]"}`}>
                        {order.priority}
                      </span>
                    </TD>
                    <TD><span className="font-mono text-[11.5px]">{order.collected}</span></TD>
                    <TD><StatusBadge status={order.status} /></TD>
                    <TD><span className="text-[#64748B] text-[11.5px]">{order.provider}</span></TD>
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

        <div className="space-y-4">
          {selected ? (
            <Card
              title={selected.patientName}
              actions={<span className="text-[10.5px] font-mono text-[#94A3B8]">{selected.id}</span>}
            >
              <div className="text-[11.5px] text-[#64748B] mb-3">
                {selected.umr} · {selected.opNumber} · ordered by {selected.doctorName} on{" "}
                {new Date(selected.createdAt).toLocaleDateString()}
              </div>

              <div className="space-y-3">
                {selected.tests.map(test => (
                  <div key={test.id} className="border border-[#E2E8F0] rounded p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-gray-900">{test.name}</span>
                      <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded ${
                        test.status === "Completed" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#475569]"
                      }`}>
                        {test.status}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-[#94A3B8] mt-0.5">
                      {test.category} · {test.urgency}
                    </div>

                    {test.status === "Completed" ? (
                      <div className="mt-2 flex items-center justify-between text-[12px]">
                        <span className={`font-mono font-semibold ${
                          test.flag === "Critical" ? "text-[#B91C1C]" : test.flag === "H" ? "text-[#D97706]" : test.flag === "L" ? "text-[#0284C7]" : "text-gray-900"
                        }`}>
                          {test.result} {test.resultUnit}
                        </span>
                        <span className="text-[10.5px] text-[#94A3B8]">{test.referenceRange || "no range"}</span>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-1.5">
                        <div className="grid grid-cols-3 gap-1.5">
                          <input
                            value={draftFor(selected, test).value}
                            onChange={event => setDraft(selected, test, { value: event.target.value })}
                            placeholder="Result"
                            className="border border-[#DDE2EC] rounded px-2 py-1 text-[11.5px] font-mono focus:outline-none focus:border-[#1B4FD8]"
                          />
                          <input
                            value={draftFor(selected, test).unit}
                            onChange={event => setDraft(selected, test, { unit: event.target.value })}
                            placeholder="Unit"
                            className="border border-[#DDE2EC] rounded px-2 py-1 text-[11.5px] focus:outline-none focus:border-[#1B4FD8]"
                          />
                          <select
                            value={draftFor(selected, test).flag || ""}
                            onChange={event => setDraft(selected, test, { flag: event.target.value as LabOrderTest["flag"] })}
                            className="border border-[#DDE2EC] rounded px-2 py-1 text-[11.5px] focus:outline-none focus:border-[#1B4FD8]"
                          >
                            <option value="">Normal</option>
                            <option value="H">High</option>
                            <option value="L">Low</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            value={draftFor(selected, test).ref}
                            onChange={event => setDraft(selected, test, { ref: event.target.value })}
                            placeholder="Reference range"
                            className="flex-1 border border-[#DDE2EC] rounded px-2 py-1 text-[11.5px] focus:outline-none focus:border-[#1B4FD8]"
                          />
                          <Btn variant="primary" size="xs" onClick={() => saveResult(selected, test)}>
                            Save
                          </Btn>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {selected.status === "Billed" && (
                  <Btn variant="primary" size="xs" onClick={() => advance(selected, "Sample Collected")}>
                    Mark sample collected
                  </Btn>
                )}
                {selected.status === "Sample Collected" && (
                  <Btn variant="primary" size="xs" onClick={() => advance(selected, "In Progress")}>
                    Start processing
                  </Btn>
                )}
                {selected.status === "Completed" && (
                  <span className="text-[11.5px] font-semibold text-[#15803D]">✓ All results verified</span>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                <div className="text-[10.5px] uppercase tracking-wide text-[#94A3B8] font-bold mb-1.5">Order trail</div>
                <div className="space-y-1">
                  {selected.history.map((event, index) => (
                    <div key={index} className="text-[11px] text-[#64748B]">
                      <span className="font-mono text-[#94A3B8]">{new Date(event.at).toLocaleString()}</span> ·{" "}
                      <span className="font-semibold text-[#475569]">{event.action}</span>
                      {event.detail ? ` — ${event.detail}` : ""}
                      <span className="text-[#94A3B8]"> ({event.actor})</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <Card title="CBC w/ Differential" actions={<Btn variant="ghost" size="xs">Trend</Btn>}>
              <div className="text-[11.5px] text-[#64748B] mb-3">
                <span className="font-medium text-gray-700">{SAMPLE_ORDERS[sampleSelected]?.patient || "John Smith"}</span> ·
                MRN {SAMPLE_ORDERS[sampleSelected]?.mrn || "100245"} · Collected 09:10 AM
              </div>
              <div className="space-y-0.5">
                {RESULTS_DETAIL.map((row, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between py-1.5 border-b border-[#F8FAFC] last:border-0 rounded px-1
                      ${row.flag === "H" ? "bg-[#FFFBEB]" : row.flag === "L" ? "bg-[#EFF6FF]" : ""}`}
                  >
                    <span className="text-[12px] text-gray-700 w-28">{row.component}</span>
                    <span className={`font-mono font-semibold text-[12px] ${row.flag === "H" ? "text-[#D97706]" : row.flag === "L" ? "text-[#0284C7]" : "text-gray-800"}`}>
                      {row.value}
                    </span>
                    <span className="text-[11px] text-[#94A3B8] font-mono w-12 text-right">{row.unit}</span>
                    <span className="text-[10.5px] text-[#94A3B8] w-16 text-right hidden md:block">{row.ref}</span>
                    <span className={`w-5 text-right font-mono font-bold text-[11.5px] ${row.flag === "H" ? "text-[#D97706]" : row.flag === "L" ? "text-[#0284C7]" : ""}`}>
                      {row.flag}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Btn variant="primary" size="xs">Verify Result</Btn>
                <Btn variant="outline" size="xs">Add Comment</Btn>
                <Btn variant="outline" size="xs">Notify</Btn>
              </div>
            </Card>
          )}

          {worklist.length === 0 && (
            <Card title="Critical Values — Requires Immediate Action">
              <div className="space-y-3">
                {CRITICAL_RESULTS.map((critical, index) => (
                  <div key={index} className={`border rounded p-3 ${critical.notified === "Pending" ? "border-[#FECACA] bg-[#FEF2F2]" : "border-[#DDE2EC]"}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-gray-900">{critical.patient}</span>
                      <span className="font-mono text-[11.5px] text-[#64748B]">MRN: {critical.mrn}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[12px] flex-wrap">
                      <span className="font-medium text-[#B91C1C]">
                        {critical.test}: <span className="font-mono">{critical.value}</span>
                      </span>
                      <span className="text-[#64748B]">Threshold: {critical.threshold}</span>
                      <span className="text-[#64748B]">Provider: {critical.provider}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Turnaround Time">
            <div className="space-y-2 text-[12px]">
              {[
                { test: "Troponin", target: "60m", actual: "45m", ok: true },
                { test: "CBC", target: "90m", actual: "88m", ok: true },
                { test: "BMP", target: "90m", actual: "72m", ok: true },
                { test: "Blood Culture", target: "24h", actual: "Pending", ok: true },
              ].map((row, index) => (
                <div key={index} className="flex justify-between items-center py-0.5 border-b border-[#F8FAFC] last:border-0">
                  <span className="text-gray-700">{row.test}</span>
                  <span className="text-[#94A3B8] text-[11px]">Target: {row.target}</span>
                  <span className={`font-mono font-semibold text-[11.5px] ${row.ok ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                    {row.actual}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
