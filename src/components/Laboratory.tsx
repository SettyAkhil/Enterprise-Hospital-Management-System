import React, { useState, useEffect, useMemo } from "react";
import { QueueTab, Table, TR, TD, StatusBadge, Btn, Card } from "./shared";
import { BillingDatabase, LabOrderRecord } from "../services/billingDb";

const QUEUES = [
  { label: "All Orders", key: "all" },
  { label: "Payment Cleared (Ready)", key: "paid" },
  { label: "Payment Pending (Locked)", key: "unpaid" },
  { label: "Collected", key: "collected" },
  { label: "Processing", key: "processing" },
  { label: "Critical", key: "critical" },
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
  { patient: "John Smith", mrn: "100245", test: "Potassium", value: "6.2 mmol/L", threshold: "> 6.0", provider: "Dr. Anderson", notified: "10:15 AM", paymentStatus: "Paid" },
  { patient: "Thomas Reed", mrn: "100301", test: "Troponin I", value: "1.8 ng/mL", threshold: "> 0.4", provider: "Dr. Shah", notified: "Pending", paymentStatus: "Paid" },
  { patient: "Ann Martinez", mrn: "100088", test: "Lactic Acid", value: "4.2 mmol/L", threshold: "> 4.0", provider: "Dr. Chen", notified: "Pending", paymentStatus: "Paid" },
];

export default function Laboratory() {
  const [activeQueue, setActiveQueue] = useState(0);
  const [labOrders, setLabOrders] = useState<LabOrderRecord[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const refreshData = () => {
    const orders = BillingDatabase.getLabOrders();
    setLabOrders(orders);
  };

  useEffect(() => {
    refreshData();
    const unsub = BillingDatabase.onUpdate(refreshData);
    return () => unsub();
  }, []);

  const filteredOrders = useMemo(() => {
    const queue = QUEUES[activeQueue];
    if (queue.key === "all") return labOrders;
    if (queue.key === "paid") return labOrders.filter((o) => o.paymentStatus === "Paid");
    if (queue.key === "unpaid") return labOrders.filter((o) => o.paymentStatus === "Payment Pending");
    if (queue.key === "collected") return labOrders.filter((o) => o.status === "Collected");
    if (queue.key === "processing") return labOrders.filter((o) => o.status === "Processing");
    return labOrders;
  }, [labOrders, activeQueue]);

  const selectedOrder = filteredOrders[selectedIdx] || labOrders[0];

  const handleCollectSample = (order: LabOrderRecord) => {
    if (order.paymentStatus !== "Paid") {
      showToast(`⚠ Cannot collect sample for ${order.patient}! Payment of ₹${order.price} is pending at Central Billing Counter.`, "error");
      return;
    }

    try {
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      BillingDatabase.updateLabOrder(order.id, {
        status: "Collected",
        collected: now,
      });
      showToast(`✓ Sample collected successfully for ${order.patient} (${order.test})`, "success");
      refreshData();
    } catch {
      showToast("Failed to update order status", "error");
    }
  };

  const handleStartProcessing = (order: LabOrderRecord) => {
    try {
      BillingDatabase.updateLabOrder(order.id, {
        status: "Processing",
      });
      showToast(`✓ Processing initiated for ${order.patient} (${order.test})`, "info");
      refreshData();
    } catch {
      showToast("Failed to update order status", "error");
    }
  };

  const counts = useMemo(() => {
    return {
      all: labOrders.length,
      paid: labOrders.filter((o) => o.paymentStatus === "Paid").length,
      unpaid: labOrders.filter((o) => o.paymentStatus === "Payment Pending").length,
      collected: labOrders.filter((o) => o.status === "Collected").length,
      processing: labOrders.filter((o) => o.status === "Processing").length,
      critical: 3,
    };
  }, [labOrders]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5] text-slate-900">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold border animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-900 text-emerald-100 border-emerald-700"
              : toast.type === "error"
              ? "bg-rose-900 text-rose-100 border-rose-700"
              : "bg-blue-900 text-blue-100 border-blue-700"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "⚠" : "ℹ"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-900">Laboratory &amp; Pathology</h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10.5px] font-bold">
              ● Pre-Paid Clearance Active
            </span>
          </div>
          <p className="text-[11.5px] text-[#64748B]">
            Clinical Laboratory · Requires Central Billing Pre-Payment before sample collection
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm">Accession</Btn>
          <Btn variant="primary" size="sm">+ Manual Entry</Btn>
        </div>
      </div>

      {/* Pre-Payment Financial Policy Notice */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <span className="font-bold">🛡️ Financial Clearance Gate:</span>
          <span>
            Patients advised for blood/pathology tests must settle fees at the <strong>Central Billing Counter</strong> first. Unpaid orders remain locked.
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
          <span className="text-emerald-700">✓ {counts.paid} Cleared</span>
          <span className="text-amber-800">⏳ {counts.unpaid} Payment Pending</span>
        </div>
      </div>

      {/* Critical Results Banner */}
      <div className="bg-[#FEF2F2] border-b border-[#FECACA] px-6 py-2.5 flex items-center gap-3">
        <span className="text-[#B91C1C] font-bold text-sm">⚠</span>
        <span className="text-[12.5px] font-semibold text-[#B91C1C]">3 Critical Results Require Provider Notification</span>
        <Btn variant="danger" size="xs">Review Critical Values</Btn>
      </div>

      {/* Queue Tabs */}
      <div className="bg-white border-b border-[#DDE2EC] flex overflow-x-auto">
        {QUEUES.map((q, i) => {
          const count =
            q.key === "all"
              ? counts.all
              : q.key === "paid"
              ? counts.paid
              : q.key === "unpaid"
              ? counts.unpaid
              : q.key === "collected"
              ? counts.collected
              : q.key === "processing"
              ? counts.processing
              : counts.critical;

          return (
            <QueueTab
              key={i}
              label={q.label}
              count={count}
              active={activeQueue === i}
              onClick={() => {
                setActiveQueue(i);
                setSelectedIdx(0);
              }}
            />
          );
        })}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Order List */}
        <div className="lg:col-span-2 space-y-4">
          {activeQueue === 5 ? (
            <Card title="Critical Values — Requires Immediate Action">
              <div className="space-y-3">
                {CRITICAL_RESULTS.map((c, i) => (
                  <div key={i} className={`border rounded p-3 ${c.notified === "Pending" ? "border-[#FECACA] bg-[#FEF2F2] critical-pulse" : "border-[#DDE2EC]"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13px] text-gray-900">{c.patient}</span>
                          <span className="font-mono text-[11.5px] text-[#64748B]">MRN: {c.mrn}</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            ✓ Paid
                          </span>
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
            <Card
              title="Lab Orders (Pre-Paid Financial Clearance Ledger)"
              actions={
                <div className="flex gap-1.5">
                  <Btn variant="ghost" size="xs">Filter</Btn>
                  <Btn variant="ghost" size="xs">Export</Btn>
                </div>
              }
            >
              <Table headers={["Patient", "MRN", "Test Ordered", "Payment Status", "Sample", "Lab Status", "Provider", "Action"]}>
                {filteredOrders.length === 0 ? (
                  <TR>
                    <TD colSpan={8}>
                      <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                        No lab orders match this queue.
                      </div>
                    </TD>
                  </TR>
                ) : (
                  filteredOrders.map((o, i) => {
                    const isPaid = o.paymentStatus === "Paid";

                    return (
                      <TR
                        key={o.id || i}
                        onClick={() => setSelectedIdx(i)}
                        className={selectedIdx === i ? "bg-blue-50/60" : ""}
                      >
                        <TD>
                          <span className="font-bold text-gray-900">{o.patient}</span>
                        </TD>
                        <TD>
                          <span className="font-mono text-[11.5px] text-[#64748B]">{o.mrn}</span>
                        </TD>
                        <TD>
                          <div className="font-semibold text-slate-800">{o.test}</div>
                          <span className={`text-[10px] font-bold ${o.priority === "STAT" ? "text-rose-600" : "text-slate-400"}`}>
                            {o.priority} Priority · ₹{o.price}
                          </span>
                        </TD>
                        <TD>
                          {isPaid ? (
                            <div>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1 w-fit">
                                <span>✓</span> Paid &amp; Cleared
                              </span>
                              <div className="text-[9.5px] font-mono text-emerald-700 mt-0.5">
                                {o.paidReceiptNo || "RCPT-2026-5501"}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-1 w-fit">
                                <span>🔒</span> Pay at Billing
                              </span>
                              <div className="text-[9.5px] text-amber-700 mt-0.5">
                                ₹{o.price} Due
                              </div>
                            </div>
                          )}
                        </TD>
                        <TD>
                          <span className="font-mono text-[11.5px]">{o.collected || "—"}</span>
                        </TD>
                        <TD>
                          <StatusBadge status={o.status} />
                        </TD>
                        <TD>
                          <span className="text-[#64748B] text-[11.5px]">{o.provider}</span>
                        </TD>
                        <TD>
                          <div className="flex items-center gap-1">
                            {isPaid ? (
                              o.status === "Pending" ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCollectSample(o);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10.5px] cursor-pointer shadow-2xs"
                                >
                                  💉 Collect Sample
                                </button>
                              ) : o.status === "Collected" ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartProcessing(o);
                                  }}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10.5px] cursor-pointer shadow-2xs"
                                >
                                  ⚙ Process
                                </button>
                              ) : (
                                <span className="text-[11px] font-bold text-emerald-700">✓ In Flow</span>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showToast(`🔒 Cannot collect sample: ${o.patient} must pay ₹${o.price} at Central Billing first!`, "error");
                                }}
                                className="px-2 py-1 bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-800 font-bold rounded text-[10px] cursor-not-allowed border border-dashed border-slate-300"
                              >
                                🔒 Locked (Unpaid)
                              </button>
                            )}
                          </div>
                        </TD>
                      </TR>
                    );
                  })
                )}
              </Table>
            </Card>
          )}
        </div>

        {/* Right: Selected Test Detail & Payment Clearance Dossier */}
        <div className="space-y-4">
          {selectedOrder && (
            <Card title="Diagnostic Clearance & Patient Dossier">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">{selectedOrder.patient}</span>
                  <span className="font-mono text-slate-500">MRN: {selectedOrder.mrn}</span>
                </div>
                <div className="text-slate-600">
                  Advised Test: <strong>{selectedOrder.test}</strong>
                </div>
                <div className="text-slate-500">
                  Prescribing Physician: <strong>{selectedOrder.provider}</strong>
                </div>

                {/* Financial Clearance Status Card */}
                <div
                  className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    selectedOrder.paymentStatus === "Paid"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      Financial Clearance Status
                    </span>
                    <div className="font-extrabold text-xs">
                      {selectedOrder.paymentStatus === "Paid"
                        ? "✓ Verified Paid at Billing Desk"
                        : "🔒 Payment Pending at Billing"}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-extrabold">₹{selectedOrder.price}</div>
                    <div className="text-[10px]">
                      {selectedOrder.paymentStatus === "Paid"
                        ? (selectedOrder.paidReceiptNo || "RCPT-2026-5501")
                        : "UNSETTLED"}
                    </div>
                  </div>
                </div>

                {selectedOrder.paymentStatus !== "Paid" && (
                  <div className="p-2 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                    ⚠ <strong>Action Blocked:</strong> Direct the patient to the Central Billing Counter on the Ground Floor to complete payment before sample collection.
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card title="CBC w/ Differential" actions={<Btn variant="ghost" size="xs">Trend</Btn>}>
            <div className="text-[11.5px] text-[#64748B] mb-3">
              <span className="font-medium text-gray-700">John Smith</span> · MRN 100245 · Verified Paid
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
        </div>
      </div>
    </div>
  );
}
