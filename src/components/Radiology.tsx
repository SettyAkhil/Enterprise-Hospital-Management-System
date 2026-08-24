import React, { useState } from "react";
import { QueueTab, Table, TR, TD, StatusBadge, Btn, Card } from "./shared";
import { Icon } from "./icons";

const QUEUES = [
  { label: "Orders", count: 12 },
  { label: "Scheduled", count: 8 },
  { label: "In Progress", count: 4 },
  { label: "Images Ready", count: 9 },
  { label: "Reporting", count: 6 },
  { label: "Final", count: 34 },
];

const STUDIES = [
  { patient: "John Smith", mrn: "100245", study: "Chest X-Ray PA/Lateral", modality: "XR", ordered: "09:50", priority: "Routine", provider: "Dr. Patel", status: "Images Ready", room: "XR-2" },
  { patient: "Thomas Reed", mrn: "100301", study: "CT Head w/o Contrast", modality: "CT", ordered: "10:02", priority: "STAT", provider: "Dr. Shah", status: "In Progress", room: "CT-1" },
  { patient: "Mary Jones", mrn: "100246", study: "CT Abdomen/Pelvis", modality: "CT", ordered: "08:30", priority: "Routine", provider: "Dr. Lee", status: "Final", room: "CT-2" },
  { patient: "Patricia Okonkwo", mrn: "100149", study: "X-Ray R Hip AP/Lat", modality: "XR", ordered: "10:15", priority: "STAT", provider: "Dr. Williams", status: "Scheduled", room: "XR-1" },
  { patient: "Ann Martinez", mrn: "100088", study: "Ultrasound Abdomen", modality: "US", ordered: "09:28", priority: "Routine", provider: "Dr. Chen", status: "Reporting", room: "US-1" },
  { patient: "Sandra Brown", mrn: "100331", study: "MRI Brain w/ & w/o", modality: "MR", ordered: "08:15", priority: "Routine", provider: "Dr. Williams", status: "Final", room: "MR-1" },
  { patient: "Marcus Kim", mrn: "100377", study: "Echocardiogram", modality: "US", ordered: "11:00", priority: "Routine", provider: "Dr. Park", status: "Scheduled", room: "Echo-1" },
  { patient: "Diane Walsh", mrn: "100142", study: "Bone Density (DEXA)", modality: "XR", ordered: "Yesterday", priority: "Elective", provider: "Dr. Anderson", status: "Orders", room: "—" },
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
  const [selectedStudy, setSelectedStudy] = useState(0);
  const study = STUDIES[selectedStudy];

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Radiology</h1>
          <p className="text-[11.5px] text-[#64748B]">Imaging Services · General Hospital · 73 studies today</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm">PACS Viewer</Btn>
          <Btn variant="primary" size="sm">+ New Order</Btn>
        </div>
      </div>

      {/* Modality status bar */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-2 flex items-center gap-6">
        {[
          { label: "CT Scanner 1", status: "In Use", color: "#DC2626" },
          { label: "CT Scanner 2", status: "Available", color: "#16A34A" },
          { label: "MRI Suite 1", status: "In Use", color: "#DC2626" },
          { label: "X-Ray 1", status: "In Use", color: "#DC2626" },
          { label: "X-Ray 2", status: "Available", color: "#16A34A" },
          { label: "Ultrasound 1", status: "In Use", color: "#DC2626" },
          { label: "Echo Suite", status: "Available", color: "#16A34A" },
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11.5px]">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-[#64748B]">{m.label}</span>
            <span className="font-medium" style={{ color: m.color }}>{m.status}</span>
          </div>
        ))}
      </div>

      {/* Queue tabs */}
      <div className="bg-white border-b border-[#DDE2EC] flex">
        {QUEUES.map((q, i) => (
          <QueueTab key={i} label={q.label} count={q.count} active={activeQueue === i} onClick={() => setActiveQueue(i)} />
        ))}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Study list */}
        <div className="lg:col-span-2">
          <Card title="Studies" actions={
            <div className="flex gap-1.5">
              <Btn variant="ghost" size="xs"><Icon.Filter /> Filter</Btn>
            </div>
          }>
            <div className="space-y-1 -mx-4 -mb-4">
              {STUDIES.map((s, i) => {
                const mc = MODALITY_COLORS[s.modality] || { bg: "#F1F5F9", text: "#374151" };
                return (
                  <div key={i} onClick={() => setSelectedStudy(i)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-[#F1F5F9] last:border-0 cursor-pointer transition-colors
                      ${selectedStudy === i ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"}`}>
                    <div style={{ backgroundColor: mc.bg, color: mc.text }}
                      className="w-9 h-9 rounded flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      {s.modality}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-semibold text-gray-900 truncate">{s.patient}</span>
                        <span className={`text-[11px] font-semibold flex-shrink-0 ${s.priority === "STAT" ? "text-[#DC2626]" : "text-[#64748B]"}`}>
                          {s.priority}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-gray-700 truncate">{s.study}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10.5px] text-[#94A3B8]">{s.mrn}</span>
                        <span className="text-[#94A3B8]">·</span>
                        <span className="font-mono text-[10.5px] text-[#94A3B8]">{s.ordered}</span>
                        <span className="text-[#94A3B8]">·</span>
                        <StatusBadge status={s.status.replace(/\s/g, "")} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Report workspace */}
        <div className="lg:col-span-3 space-y-3">
          {/* Study header */}
          <div className="bg-white border border-[#DDE2EC] rounded p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded`}
                    style={{ backgroundColor: MODALITY_COLORS[study.modality]?.bg, color: MODALITY_COLORS[study.modality]?.text }}>
                    {study.modality}
                  </span>
                  <span className="font-semibold text-[13.5px] text-gray-900">{study.study}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                    REPORT_CONTENT.status === "FINAL" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3C7] text-[#B45309]"
                  }`}>{REPORT_CONTENT.status}</span>
                </div>
                <div className="text-[11.5px] text-[#64748B]">{REPORT_CONTENT.patient}</div>
                <div className="text-[11.5px] text-[#64748B]">{REPORT_CONTENT.date}</div>
              </div>
              <div className="flex gap-1.5">
                <Btn variant="outline" size="xs">Compare</Btn>
                <Btn variant="outline" size="xs"><Icon.Download /> PDF</Btn>
                <Btn variant="primary" size="xs">Open PACS</Btn>
              </div>
            </div>
          </div>

          {/* Image placeholder */}
          <div className="bg-[#0C1524] rounded border border-[#1E2D42] h-40 flex items-center justify-center relative">
            <div className="text-center">
              <div className="text-[#334155] text-4xl mb-2">⬛</div>
              <div className="text-[#64748B] text-[12px]">PACS Viewer — Chest PA View</div>
              <div className="text-[#334155] text-[11px] mt-1">Click "Open PACS" to launch full DICOM viewer</div>
            </div>
            <div className="absolute top-3 left-3 text-[10.5px] text-[#475569] font-mono space-y-0.5">
              <div>John Smith · MRN 100245</div>
              <div>Aug 23, 2026 · 09:52</div>
              <div>Chest PA · GH Main Campus</div>
            </div>
            <div className="absolute top-3 right-3 text-[10.5px] text-[#475569] font-mono space-y-0.5 text-right">
              <div>kV: 120 · mAs: 4</div>
              <div>SID: 180cm</div>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex justify-between text-[10px] text-[#334155] font-mono">
              <span>W: 2048 / L: 1024</span>
              <span>Series 1/1 · Image 1/2</span>
            </div>
          </div>

          {/* Report */}
          <div className="bg-white border border-[#DDE2EC] rounded">
            <div className="px-4 py-2.5 border-b border-[#DDE2EC] flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Radiology Report</span>
              <div className="flex gap-1.5">
                <Btn variant="ghost" size="xs">Edit</Btn>
                <Btn variant="ghost" size="xs">Addendum</Btn>
              </div>
            </div>

            <div className="p-4 space-y-4 text-[12.5px]">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  { l: "Radiologist", v: REPORT_CONTENT.radiologist },
                  { l: "Comparison", v: REPORT_CONTENT.comparison },
                  { l: "Clinical Indication", v: REPORT_CONTENT.indication },
                  { l: "Technique", v: REPORT_CONTENT.technique },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <div className="text-[10.5px] font-semibold text-[#64748B] uppercase tracking-wide mb-0.5">{l}</div>
                    <div className="text-gray-700">{v}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-[10.5px] font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Findings</div>
                <ul className="space-y-1">
                  {REPORT_CONTENT.findings.map((f, i) => (
                    <li key={i} className="text-gray-700 flex gap-2">
                      <span className="text-[#94A3B8] flex-shrink-0">·</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded p-3">
                <div className="text-[10.5px] font-bold text-[#15803D] uppercase tracking-wide mb-1.5">Impression</div>
                <ol className="space-y-0.5">
                  {REPORT_CONTENT.impression.map((imp, i) => (
                    <li key={i} className="text-[#15803D] font-medium">{imp}</li>
                  ))}
                </ol>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#DDE2EC] text-[11.5px] text-[#64748B]">
                <span>Finalized: Aug 23, 2026 · 11:02 AM · Dr. L. Kim</span>
                <div className="flex gap-2">
                  <Btn variant="outline" size="xs">Notify Provider</Btn>
                  <Btn variant="primary" size="xs">✓ Acknowledge</Btn>
                </div>
              </div>
            </div>
          </div>

          {/* Previous Studies */}
          <Card title="Prior Studies — John Smith">
            <Table headers={["Date", "Study", "Modality", "Radiologist", "Result", ""]}>
              {[
                { date: "03/14/2025", study: "Chest X-Ray PA/Lat", mod: "XR", rad: "Dr. Kim", result: "No acute process" },
                { date: "11/08/2024", study: "CT Abdomen/Pelvis", mod: "CT", rad: "Dr. Patel", result: "Nephrolithiasis resolved" },
                { date: "06/22/2024", study: "Echocardiogram", mod: "US", rad: "Dr. Wu", result: "EF 55–60%, normal" },
              ].map((s, i) => (
                <TR key={i}>
                  <TD><span className="font-mono text-[11.5px]">{s.date}</span></TD>
                  <TD>{s.study}</TD>
                  <TD>
                    <span style={{ backgroundColor: MODALITY_COLORS[s.mod]?.bg, color: MODALITY_COLORS[s.mod]?.text }}
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded">{s.mod}</span>
                  </TD>
                  <TD><span className="text-[#64748B]">{s.rad}</span></TD>
                  <TD><span className="text-[11.5px] text-[#16A34A] font-medium">{s.result}</span></TD>
                  <TD><Btn variant="ghost" size="xs">View</Btn></TD>
                </TR>
              ))}
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
