import React, { useState } from "react";
import { Btn, Card, AlertBanner } from "./shared";
import { Icon } from "./icons";

const TRIAGE_QUEUE = [
  { name: "Ann Martinez", mrn: "100088", age: 52, arrived: "10:02", cc: "Altered mental status, fever", initial: "ESI 2", nurse: "RN Chen" },
  { name: "Kevin Park", mrn: "100422", age: 28, arrived: "10:18", cc: "Laceration R hand, glass injury", initial: "ESI 3", nurse: "—" },
  { name: "Isabel Cruz", mrn: "100511", age: 19, arrived: "10:31", cc: "Right ankle pain after fall", initial: "ESI 4", nurse: "—" },
  { name: "Harold Bloom", mrn: "100388", age: 77, arrived: "10:45", cc: "Urinary frequency, dysuria", initial: "ESI 4", nurse: "—" },
];

const ESI_GUIDE = [
  { level: 1, label: "Immediate", color: "#0F1624", bg: "#1F2937", desc: "Requires immediate life-saving intervention", examples: "Cardiac arrest, respiratory failure" },
  { level: 2, label: "Emergent", color: "#fff", bg: "#DC2626", desc: "High-risk situation or severe pain/distress", examples: "Chest pain, altered mental status, BP > 180/120" },
  { level: 3, label: "Urgent", color: "#fff", bg: "#D97706", desc: "Stable, may require multiple resources", examples: "Abdominal pain, asthma, minor trauma" },
  { level: 4, label: "Less Urgent", color: "#fff", bg: "#16A34A", desc: "Stable, one resource needed", examples: "Laceration, UTI, uncomplicated sprain" },
  { level: 5, label: "Non-Urgent", color: "#fff", bg: "#1B4FD8", desc: "Stable, no resources anticipated", examples: "Cold/flu, prescription refill, minor rash" },
];

export default function Triage() {
  const [selected, setSelected] = useState(0);
  const [esi, setEsi] = useState(3);
  const [vitals, setVitals] = useState({ bp: "", hr: "", rr: "", temp: "", spo2: "", pain: "" });
  const [cc, setCc] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const pt = TRIAGE_QUEUE[selected];

  const submit = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Triage</h1>
          <p className="text-[11.5px] text-[#64748B]">Emergency Department · {TRIAGE_QUEUE.length} patients awaiting triage</p>
        </div>
        <Btn variant="primary" size="sm"><Icon.Plus /> Walk-in Registration</Btn>
      </div>

      {submitted && (
        <div className="bg-[#F0FDF4] border-b border-[#BBF7D0] px-6 py-2.5 flex items-center gap-2 text-[#15803D]">
          <span className="font-semibold">✓</span>
          <span className="text-[12.5px] font-medium">Triage completed for {pt.name} — ESI {esi} assigned. Patient moved to ED board.</span>
        </div>
      )}

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Triage queue */}
        <div>
          <Card title="Awaiting Triage" actions={<span className="text-[11px] text-[#DC2626] font-semibold">{TRIAGE_QUEUE.filter(p => p.initial === "ESI 2").length} ESI-2</span>}>
            <div className="space-y-1 -mx-4 -mb-4">
              {TRIAGE_QUEUE.map((p, i) => {
                const esiNum = parseInt(p.initial.replace("ESI ", ""));
                const esiColors: Record<number, string> = { 1: "#0F1624", 2: "#DC2626", 3: "#D97706", 4: "#16A34A", 5: "#1B4FD8" };
                return (
                  <div key={i} onClick={() => setSelected(i)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-[#F1F5F9] last:border-0 cursor-pointer transition-colors
                      ${selected === i ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"}`}>
                    <div className="w-8 h-8 rounded flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                      style={{ backgroundColor: esiColors[esiNum] }}>
                      {esiNum}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold text-gray-900">{p.name}</div>
                      <div className="text-[11.5px] text-[#64748B] truncate">{p.cc}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                        <span className="font-mono text-[#94A3B8]">{p.mrn}</span>
                        <span className="text-[#94A3B8]">·</span>
                        <span className="text-[#94A3B8]">Arrived {p.arrived}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ESI Guide */}
          <div className="mt-4 bg-white border border-[#DDE2EC] rounded">
            <div className="px-4 py-2.5 border-b border-[#DDE2EC]">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">ESI Quick Reference</span>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {ESI_GUIDE.map((e) => (
                <div key={e.level} className="flex items-start gap-2.5 px-3 py-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: e.bg, color: e.color }}>
                    {e.level}
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-gray-800">{e.label}</div>
                    <div className="text-[11px] text-[#64748B]">{e.desc}</div>
                    <div className="text-[10.5px] text-[#94A3B8] italic">{e.examples}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Triage workspace */}
        <div className="lg:col-span-2 space-y-4">
          {/* Patient header */}
          <div className="bg-white border border-[#DDE2EC] rounded p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1B4FD8] flex items-center justify-center text-white font-semibold">
                  {pt.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <div className="text-[14px] font-bold text-gray-900">{pt.name}</div>
                  <div className="text-[11.5px] text-[#64748B]">{pt.age} yrs · MRN {pt.mrn} · Arrived {pt.arrived}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[#64748B]">Initial acuity</div>
                <div className={`text-[13px] font-bold px-3 py-1 rounded mt-1 inline-block text-white`}
                  style={{ backgroundColor: pt.initial === "ESI 2" ? "#DC2626" : pt.initial === "ESI 3" ? "#D97706" : "#16A34A" }}>
                  {pt.initial}
                </div>
              </div>
            </div>
          </div>

          {/* Vitals */}
          <Card title="Vital Signs">
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "bp", label: "Blood Pressure", placeholder: "120/80", unit: "mmHg" },
                { key: "hr", label: "Heart Rate", placeholder: "72", unit: "bpm" },
                { key: "rr", label: "Resp Rate", placeholder: "16", unit: "/min" },
                { key: "temp", label: "Temperature", placeholder: "98.6", unit: "°F" },
                { key: "spo2", label: "SpO₂", placeholder: "98", unit: "%" },
                { key: "pain", label: "Pain Score", placeholder: "0–10", unit: "/10" },
              ].map(({ key, label, placeholder, unit }) => (
                <div key={key}>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">{label}</label>
                  <div className="relative">
                    <input value={vitals[key as keyof typeof vitals]}
                      onChange={e => setVitals(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] font-mono px-3 py-2 focus:outline-none focus:border-[#1B4FD8] pr-10" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] text-[#94A3B8]">{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Chief Complaint */}
          <Card title="Chief Complaint & History">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Chief Complaint <span className="text-[#DC2626]">*</span></label>
                <input value={cc} onChange={e => setCc(e.target.value)}
                  defaultValue={pt.cc}
                  placeholder="Patient's chief complaint in their own words..."
                  className="w-full border border-[#DDE2EC] rounded text-[12.5px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Onset", placeholder: "e.g., 2 hours ago" },
                  { label: "Duration", placeholder: "e.g., 2 hours" },
                  { label: "Severity", placeholder: "Mild / Mod / Severe" },
                ].map(({ label, placeholder }) => (
                  <div key={label}>
                    <label className="block text-[11px] font-semibold text-[#64748B] mb-1">{label}</label>
                    <input placeholder={placeholder} className="w-full border border-[#DDE2EC] rounded text-[12.5px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Additional History / Notes</label>
                <textarea rows={3} placeholder="Relevant history, medications, allergies reported by patient..."
                  className="w-full border border-[#DDE2EC] rounded text-[12.5px] px-3 py-2 resize-none focus:outline-none focus:border-[#1B4FD8]" />
              </div>
            </div>
          </Card>

          {/* ESI Assignment */}
          <Card title="ESI Acuity Assignment">
            <div className="flex gap-2 mb-3">
              {ESI_GUIDE.map((e) => (
                <button key={e.level} onClick={() => setEsi(e.level)}
                  className={`flex-1 py-3 rounded border-2 font-bold text-[13px] transition-colors
                    ${esi === e.level ? "border-transparent text-white" : "border-[#DDE2EC] text-gray-500 hover:border-gray-300 bg-white"}`}
                  style={esi === e.level ? { backgroundColor: e.bg } : {}}>
                  {e.level}
                </button>
              ))}
            </div>
            <div className={`text-[12.5px] font-medium p-3 rounded text-white`}
              style={{ backgroundColor: ESI_GUIDE[esi - 1].bg }}>
              ESI {esi} — {ESI_GUIDE[esi - 1].label}: {ESI_GUIDE[esi - 1].desc}
            </div>
          </Card>

          {/* Immediate alerts */}
          {esi <= 2 && (
            <AlertBanner type="critical" title={`ESI ${esi} — IMMEDIATE ATTENTION REQUIRED`}
              body="Notify attending physician immediately. Assign to resuscitation or high-acuity bay." action="Notify Provider" />
          )}

          <div className="flex justify-end gap-3">
            <Btn variant="outline" size="md">Save Draft</Btn>
            <Btn variant="primary" size="md" onClick={submit}>
              Complete Triage — Assign ESI {esi}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
