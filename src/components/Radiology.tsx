import React, { useState, useEffect, useMemo } from "react";
import { QueueTab, Table, TR, TD, StatusBadge, Btn, Card } from "./shared";
import { Icon } from "./icons";
import { BillingDatabase, RadiologyStudyRecord } from "../services/billingDb";

const QUEUES = [
  { label: "All Studies", key: "all" },
  { label: "Payment Cleared (Ready)", key: "paid" },
  { label: "Payment Pending (Locked)", key: "unpaid" },
  { label: "In Progress", key: "in_progress" },
  { label: "Images Ready", key: "images_ready" },
  { label: "Final Reports", key: "final" },
];

const MODALITY_COLORS: Record<string, { bg: string; text: string }> = {
  CT: { bg: "#EDE9FE", text: "#6D28D9" },
  MR: { bg: "#E0F2FE", text: "#0369A1" },
  XR: { bg: "#F0FDF4", text: "#15803D" },
  US: { bg: "#FEF3C7", text: "#B45309" },
  NM: { bg: "#FEE2E2", text: "#B91C1C" },
};

const REPORT_CONTENT = {
  study: "Chest X-Ray PA/Lateral",
  patient: "John Smith · MRN 100245 · 41y Male",
  date: "Aug 23, 2026 · 09:52 AM",
  radiologist: "Dr. Laura Kim, MD · Board-Certified Radiologist",
  indication: "Hypertensive urgency, rule out pulmonary congestion",
  technique: "PA and lateral chest radiographs were obtained.",
  findings: [
    "Heart size: Normal cardiac silhouette. Cardiothoracic ratio 0.48.",
    "Lungs: Lungs are clear bilaterally. No focal consolidation, pleural effusion, or pneumothorax identified.",
    "Mediastinum: Normal mediastinal contour. No widening.",
    "Bony structures: No acute osseous abnormality. Mild degenerative changes of the thoracic spine.",
    "Soft tissues: Unremarkable.",
  ],
  impression: [
    "1. No acute cardiopulmonary process.",
    "2. Mild degenerative changes of the thoracic spine, chronic.",
  ],
  comparison: "Chest X-Ray dated 03/14/2025 — No significant interval change.",
  status: "FINAL",
};

export default function Radiology() {
  const [activeQueue, setActiveQueue] = useState(0);
  const [studies, setStudies] = useState<RadiologyStudyRecord[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const refreshData = () => {
    const data = BillingDatabase.getRadiologyStudies();
    setStudies(data);
  };

  useEffect(() => {
    refreshData();
    const unsub = BillingDatabase.onUpdate(refreshData);
    return () => unsub();
  }, []);

  const filteredStudies = useMemo(() => {
    const queue = QUEUES[activeQueue];
    if (queue.key === "all") return studies;
    if (queue.key === "paid") return studies.filter((s) => s.paymentStatus === "Paid");
    if (queue.key === "unpaid") return studies.filter((s) => s.paymentStatus === "Payment Pending");
    if (queue.key === "in_progress") return studies.filter((s) => s.status === "In Progress");
    if (queue.key === "images_ready") return studies.filter((s) => s.status === "Images Ready");
    if (queue.key === "final") return studies.filter((s) => s.status === "Final");
    return studies;
  }, [studies, activeQueue]);

  const selectedStudy = filteredStudies[selectedIdx] || studies[0];

  const handleStartScan = (study: RadiologyStudyRecord) => {
    if (study.paymentStatus !== "Paid") {
      showToast(`⚠ Cannot start scan for ${study.patient}! Payment of ₹${study.price} is pending at Central Billing Counter.`, "error");
      return;
    }

    try {
      BillingDatabase.updateRadiologyStudy(study.id, {
        status: "In Progress",
      });
      showToast(`⚡ Imaging scan started for ${study.patient} (${study.study} in Room ${study.room})`, "info");
      refreshData();
    } catch {
      showToast("Failed to update study status", "error");
    }
  };

  const handleCompleteScan = (study: RadiologyStudyRecord) => {
    try {
      BillingDatabase.updateRadiologyStudy(study.id, {
        status: "Images Ready",
      });
      showToast(`✓ Images acquired & ready for radiologist review: ${study.patient}`, "success");
      refreshData();
    } catch {
      showToast("Failed to update study status", "error");
    }
  };

  const counts = useMemo(() => {
    return {
      all: studies.length,
      paid: studies.filter((s) => s.paymentStatus === "Paid").length,
      unpaid: studies.filter((s) => s.paymentStatus === "Payment Pending").length,
      in_progress: studies.filter((s) => s.status === "In Progress").length,
      images_ready: studies.filter((s) => s.status === "Images Ready").length,
      final: studies.filter((s) => s.status === "Final").length,
    };
  }, [studies]);

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
            <h1 className="text-base font-bold text-gray-900">Radiology &amp; Imaging Services</h1>
            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10.5px] font-bold">
              ● Pre-Paid Scan Clearance Active
            </span>
          </div>
          <p className="text-[11.5px] text-[#64748B]">
            Diagnostic Imaging · Requires Central Billing Pre-Payment before scanning &amp; PACS upload
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm">PACS Viewer</Btn>
          <Btn variant="primary" size="sm">+ New Order</Btn>
        </div>
      </div>

      {/* Pre-Payment Financial Policy Notice */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <span className="font-bold">🛡️ Financial Clearance Gate:</span>
          <span>
            Patients advised for X-Ray, CT, MRI, and Ultrasound must settle fees at the <strong>Central Billing Counter</strong> first. Unpaid scans remain locked.
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
          <span className="text-emerald-700">✓ {counts.paid} Cleared</span>
          <span className="text-amber-800">⏳ {counts.unpaid} Payment Pending</span>
        </div>
      </div>

      {/* Modality Status Bar */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-2 flex items-center gap-6 overflow-x-auto">
        {[
          { label: "CT Scanner 1", status: "In Use", color: "#DC2626" },
          { label: "CT Scanner 2", status: "Available", color: "#16A34A" },
          { label: "MRI Suite 1", status: "In Use", color: "#DC2626" },
          { label: "X-Ray 1", status: "In Use", color: "#DC2626" },
          { label: "X-Ray 2", status: "Available", color: "#16A34A" },
          { label: "Ultrasound 1", status: "In Use", color: "#DC2626" },
          { label: "Echo Suite", status: "Available", color: "#16A34A" },
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11.5px] whitespace-nowrap">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-[#64748B]">{m.label}</span>
            <span className="font-medium" style={{ color: m.color }}>{m.status}</span>
          </div>
        ))}
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
              : q.key === "in_progress"
              ? counts.in_progress
              : q.key === "images_ready"
              ? counts.images_ready
              : counts.final;

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

      <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Study List (2 cols) */}
        <div className="lg:col-span-2">
          <Card
            title="Imaging Studies (Pre-Payment Clearance Queue)"
            actions={
              <div className="flex gap-1.5">
                <Btn variant="ghost" size="xs"><Icon.Filter /> Filter</Btn>
              </div>
            }
          >
            <div className="space-y-1 -mx-4 -mb-4">
              {filteredStudies.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  No imaging studies match this queue.
                </div>
              ) : (
                filteredStudies.map((s, i) => {
                  const mc = MODALITY_COLORS[s.modality] || { bg: "#F1F5F9", text: "#374151" };
                  const isPaid = s.paymentStatus === "Paid";
                  const isSelected = selectedIdx === i;

                  return (
                    <div
                      key={s.id || i}
                      onClick={() => setSelectedIdx(i)}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-[#F1F5F9] last:border-0 cursor-pointer transition-colors ${
                        isSelected ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <div
                        style={{ backgroundColor: mc.bg, color: mc.text }}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 shadow-2xs"
                      >
                        {s.modality}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12.5px] font-bold text-gray-900 truncate">{s.patient}</span>
                          <span
                            className={`text-[10.5px] font-bold flex-shrink-0 ${
                              s.priority === "STAT" ? "text-[#DC2626]" : "text-[#64748B]"
                            }`}
                          >
                            {s.priority}
                          </span>
                        </div>

                        <div className="text-[11.5px] text-gray-800 font-semibold truncate mt-0.5">
                          {s.study}
                        </div>

                        {/* Payment Clearance Badge */}
                        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100 text-[10.5px]">
                          <div className="flex items-center gap-1.5 font-mono text-[#64748B]">
                            <span>{s.mrn}</span>
                            <span>·</span>
                            <span>Room: {s.room}</span>
                          </div>

                          {isPaid ? (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[9.5px]">
                              ✓ Paid ({s.paidReceiptNo || "RCPT-5501"})
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[9.5px]">
                              🔒 ₹{s.price} Unpaid
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right: Selected Study Report & Action Panel (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          {selectedStudy ? (
            <>
              {/* Study Header & Payment Clearance Card */}
              <div className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: MODALITY_COLORS[selectedStudy.modality]?.bg,
                          color: MODALITY_COLORS[selectedStudy.modality]?.text,
                        }}
                      >
                        {selectedStudy.modality}
                      </span>
                      <span className="font-extrabold text-sm text-gray-900">{selectedStudy.study}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {selectedStudy.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#64748B] font-semibold">
                      Patient: <strong className="text-slate-900">{selectedStudy.patient}</strong> (MRN: {selectedStudy.mrn})
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Ordered by: <strong>{selectedStudy.provider}</strong> · Room: {selectedStudy.room}
                    </div>
                  </div>

                  {/* Financial Status Badge */}
                  <div className="text-right">
                    {selectedStudy.paymentStatus === "Paid" ? (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-right">
                        <span className="text-[10px] font-bold uppercase">Pre-Payment Cleared</span>
                        <div className="font-extrabold font-mono text-xs">₹{selectedStudy.price} PAID</div>
                        <div className="text-[9.5px] font-mono text-emerald-700">{selectedStudy.paidReceiptNo || "RCPT-2026-5501"}</div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-right">
                        <span className="text-[10px] font-bold uppercase">Payment Pending</span>
                        <div className="font-extrabold font-mono text-xs text-rose-700">₹{selectedStudy.price} DUE</div>
                        <div className="text-[9.5px] text-amber-800">Unsettled at Billing</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Row */}
                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                  {selectedStudy.paymentStatus === "Paid" ? (
                    <div className="flex items-center gap-2">
                      {selectedStudy.status === "Orders" || selectedStudy.status === "Scheduled" ? (
                        <button
                          type="button"
                          onClick={() => handleStartScan(selectedStudy)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          <span>⚡</span> Start Imaging Scan
                        </button>
                      ) : selectedStudy.status === "In Progress" ? (
                        <button
                          type="button"
                          onClick={() => handleCompleteScan(selectedStudy)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          <span>✓</span> Mark Images Ready
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <span>✓</span> Images Captured &amp; Uploaded to PACS
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-rose-700 font-bold">
                      <span>🔒 Scan Locked:</span>
                      <span className="text-slate-600 font-normal">
                        Direct patient to Central Billing Counter to pay ₹{selectedStudy.price} before scanning.
                      </span>
                    </div>
                  )}

                  <div className="flex gap-1.5">
                    <Btn variant="outline" size="xs">Compare</Btn>
                    <Btn variant="outline" size="xs"><Icon.Download /> PDF</Btn>
                    <Btn variant="primary" size="xs">Open PACS</Btn>
                  </div>
                </div>
              </div>

              {/* PACS Image Viewer Simulation */}
              <div className="bg-[#0C1524] rounded-xl border border-[#1E2D42] h-44 flex items-center justify-center relative overflow-hidden shadow-sm">
                <div className="text-center">
                  <div className="text-blue-400 text-3xl mb-1">🩻</div>
                  <div className="text-slate-200 text-xs font-bold">PACS Viewer — {selectedStudy.study}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {selectedStudy.paymentStatus === "Paid"
                      ? "Click 'Open PACS' to launch full multi-slice DICOM viewer"
                      : "Preview Locked: Awaiting financial clearance"}
                  </div>
                </div>
                <div className="absolute top-3 left-3 text-[10.5px] text-[#94A3B8] font-mono space-y-0.5">
                  <div>{selectedStudy.patient} · MRN {selectedStudy.mrn}</div>
                  <div>Modality: {selectedStudy.modality} · Room: {selectedStudy.room}</div>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>Resolution: 2048 x 1024</span>
                  <span>
                    Status: {selectedStudy.paymentStatus === "Paid" ? "CLEARED" : "LOCKED"}
                  </span>
                </div>
              </div>

              {/* Radiology Diagnostic Report */}
              <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#DDE2EC] bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Radiology Diagnostic Impression &amp; Findings
                  </span>
                  <div className="flex gap-1.5">
                    <Btn variant="ghost" size="xs">Edit</Btn>
                    <Btn variant="ghost" size="xs">Addendum</Btn>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  <div>
                    <h5 className="font-bold text-slate-900 mb-1">Findings:</h5>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11.5px]">
                      {REPORT_CONTENT.findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <h5 className="font-bold text-slate-900 mb-1">Impression:</h5>
                    <div className="p-2.5 bg-slate-50 rounded-lg text-slate-800 font-medium text-[11.5px]">
                      1. No acute cardiopulmonary process.<br />
                      2. Mild degenerative changes of the thoracic spine, chronic.
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              Select a study from the left queue to review diagnostic images and clearance status.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
