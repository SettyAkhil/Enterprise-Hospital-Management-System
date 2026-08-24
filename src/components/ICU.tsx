import React, { useState } from "react";
import { Card, Btn, AlertBanner } from "./shared";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const ICU_PATIENTS = [
  {
    bed: "ICU-1", name: "Thomas Reed", mrn: "100301", age: 68, sex: "M",
    dx: "STEMI — Anterior wall, s/p PCI",
    provider: "Dr. Shah", nurse: "RN Murphy",
    los: "1d 4h", code: "Full Code",
    vitals: { bp: "98/62", hr: "112", rr: "22", temp: "38.6°C", spo2: "91%", cvp: "12" },
    vent: { mode: "A/C-VC", fio2: "60%", peep: "8", tv: "480mL", rr: "18", pip: "32" },
    infusions: [
      { drug: "Norepinephrine", rate: "0.12 mcg/kg/min", concentration: "8mg/250mL" },
      { drug: "Heparin Drip", rate: "1,200 u/hr", concentration: "25,000u/250mL" },
      { drug: "Propofol", rate: "20 mcg/kg/min", concentration: "10mg/mL" },
    ],
    alerts: ["⚠ BP trending down — 3 readings < 100 systolic", "🧪 Troponin rising — peak 18.4 ng/mL"],
    score: { sofa: 9, apache: 22, rass: -2 },
    hrTrend: [{ t: "07", v: 104 }, { t: "08", v: 108 }, { t: "09", v: 112 }, { t: "10", v: 118 }, { t: "11", v: 112 }],
    bpTrend: [{ t: "07", v: 105 }, { t: "08", v: 100 }, { t: "09", v: 98 }, { t: "10", v: 96 }, { t: "11", v: 98 }],
  },
  {
    bed: "ICU-2", name: "Ann Martinez", mrn: "100088", age: 52, sex: "F",
    dx: "Septic shock — Klebsiella pneumonia",
    provider: "Dr. Shah", nurse: "RN Davis",
    los: "2d 12h", code: "Full Code",
    vitals: { bp: "104/68", hr: "98", rr: "20", temp: "38.2°C", spo2: "94%", cvp: "9" },
    vent: { mode: "A/C-VC", fio2: "45%", peep: "6", tv: "420mL", rr: "16", pip: "28" },
    infusions: [
      { drug: "Norepinephrine", rate: "0.06 mcg/kg/min", concentration: "8mg/250mL" },
      { drug: "Vancomycin", rate: "1g Q12H", concentration: "1g/200mL" },
      { drug: "Pip-Tazo", rate: "3.375g Q6H", concentration: "3.375g/100mL" },
    ],
    alerts: ["✓ Improving: BP stable > 6h", "🧪 Blood culture pending 36h"],
    score: { sofa: 7, apache: 18, rass: -1 },
    hrTrend: [{ t: "07", v: 118 }, { t: "08", v: 112 }, { t: "09", v: 108 }, { t: "10", v: 102 }, { t: "11", v: 98 }],
    bpTrend: [{ t: "07", v: 88 }, { t: "08", v: 92 }, { t: "09", v: 98 }, { t: "10", v: 102 }, { t: "11", v: 104 }],
  },
];

function MiniTrend({ data, color }: { data: { t: string; v: number }[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        <Tooltip contentStyle={{ fontSize: 10, padding: "2px 6px" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function VitalCell({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={`text-center p-2 rounded border ${alert ? "border-[#FECACA] bg-[#FEF2F2]" : "border-[#DDE2EC] bg-[#F8FAFC]"}`}>
      <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`font-mono font-bold text-[13px] ${alert ? "text-[#DC2626]" : "text-gray-900"}`}>{value}</div>
      {sub && <div className="text-[10px] text-[#94A3B8]">{sub}</div>}
    </div>
  );
}

export default function ICU() {
  const [selectedBed, setSelectedBed] = useState(0);
  const pt = ICU_PATIENTS[selectedBed];

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Medical ICU</h1>
          <p className="text-[11.5px] text-[#64748B]">12 beds · 10 occupied · 2 available · General Hospital</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm">Flowsheet View</Btn>
          <Btn variant="primary" size="sm">+ New Order</Btn>
        </div>
      </div>

      {/* ICU census bar */}
      <div className="bg-[#0C1524] border-b border-[#1E2D42] px-6 py-2 flex items-center gap-4 overflow-x-auto">
        {[...ICU_PATIENTS, ...Array(4).fill(null).map((_, i) => ({
          bed: `ICU-${i + 3}`, name: i < 2 ? ["James Liu", "Elena Park"][i] : null,
          vitals: i < 2 ? { spo2: i === 0 ? "96%" : "98%", hr: i === 0 ? "88" : "72" } : null,
          alerts: [] as string[], dx: i < 2 ? ["Post-op monitoring", "DKA management"][i] : null,
        }))].map((p, i) => (
          <div key={i} onClick={() => p.name && i < 2 && setSelectedBed(i)}
            className={`flex-shrink-0 w-36 rounded border p-2.5 cursor-pointer transition-colors
              ${!p.name ? "border-[#1E2D42] bg-[#0F1F30]" : selectedBed === i ? "border-[#1B4FD8] bg-[#1B4FD8]/20" : "border-[#1E2D42] bg-[#0F2040] hover:border-[#334155]"}`}>
            <div className="text-[10.5px] font-semibold text-[#64748B] mb-0.5">{p.bed}</div>
            {p.name ? (
              <>
                <div className="text-[12px] font-semibold text-white truncate">{p.name}</div>
                <div className="text-[10.5px] text-[#64748B] truncate">{p.dx}</div>
                {p.vitals && (
                  <div className="flex gap-2 mt-1">
                    <span className={`font-mono text-[11px] font-semibold ${parseFloat(p.vitals.spo2) < 93 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                      SpO₂ {p.vitals.spo2}
                    </span>
                    <span className="font-mono text-[11px] text-[#94A3B8]">HR {p.vitals.hr}</span>
                  </div>
                )}
                {p.alerts && p.alerts.length > 0 && <div className="w-2 h-2 rounded-full bg-[#DC2626] mt-1" />}
              </>
            ) : (
              <div className="text-[11px] text-[#334155] mt-0.5">Available</div>
            )}
          </div>
        ))}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Patient info + vitals */}
        <div className="space-y-3">
          {/* Patient header */}
          <div className="bg-white border border-[#DDE2EC] rounded p-3.5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[14px] font-bold text-gray-900">{pt.name}</div>
                <div className="text-[11.5px] text-[#64748B]">{pt.age}y {pt.sex === "M" ? "Male" : "Female"} · MRN {pt.mrn}</div>
                <div className="text-[11.5px] font-medium text-gray-700 mt-0.5">{pt.dx}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-semibold px-2 py-0.5 rounded">ICU</span>
                <span className="text-[10.5px] text-[#64748B]">{pt.bed}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[11.5px]">
              {[
                { l: "LOS", v: pt.los }, { l: "Code", v: pt.code }, { l: "Provider", v: pt.provider },
                { l: "Nurse", v: pt.nurse }, { l: "SOFA", v: `${pt.score.sofa}/24` }, { l: "APACHE II", v: pt.score.apache },
              ].map(({ l, v }) => (
                <div key={l}>
                  <div className="text-[#94A3B8] text-[10px] uppercase tracking-wide">{l}</div>
                  <div className="font-semibold text-gray-800">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          {pt.alerts.map((a, i) => (
            <div key={i} className={`text-[12px] px-3 py-2 rounded border font-medium
              ${a.startsWith("⚠") ? "bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]" : "bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]"}`}>
              {a}
            </div>
          ))}

          {/* Current vitals */}
          <div className="bg-white border border-[#DDE2EC] rounded p-3.5">
            <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Current Vitals</div>
            <div className="grid grid-cols-3 gap-1.5">
              <VitalCell label="BP" value={pt.vitals.bp} alert={parseInt(pt.vitals.bp) < 100} />
              <VitalCell label="HR" value={pt.vitals.hr} sub="bpm" alert={parseInt(pt.vitals.hr) > 110} />
              <VitalCell label="RR" value={pt.vitals.rr} sub="/min" />
              <VitalCell label="SpO₂" value={pt.vitals.spo2} alert={parseFloat(pt.vitals.spo2) < 93} />
              <VitalCell label="Temp" value={pt.vitals.temp} alert={parseFloat(pt.vitals.temp) > 38.5} />
              <VitalCell label="CVP" value={pt.vitals.cvp} sub="mmHg" />
            </div>
            <div className="text-[10.5px] text-[#94A3B8] text-right mt-2">Updated 10:47 AM</div>
          </div>

          {/* RASS */}
          <Card title="Sedation — RASS Score">
            <div className="flex items-center justify-between">
              {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4].map(score => (
                <div key={score}
                  className={`w-7 h-7 rounded text-[11px] font-bold flex items-center justify-center
                    ${pt.score.rass === score ? "bg-[#1B4FD8] text-white" : score < 0 ? "bg-[#F1F5F9] text-[#94A3B8]" : "bg-[#FEF3C7] text-[#B45309]"}`}>
                  {score}
                </div>
              ))}
            </div>
            <div className="text-[11px] text-[#64748B] mt-2">
              RASS {pt.score.rass} — {pt.score.rass === -2 ? "Light sedation" : pt.score.rass <= -3 ? "Moderate–deep sedation" : "Alert"}
              {" · Target: -1 to -2"}
            </div>
          </Card>
        </div>

        {/* Center: Trends + Ventilator */}
        <div className="space-y-3">
          {/* HR Trend */}
          <Card title="Heart Rate Trend — Last 5h">
            <MiniTrend data={pt.hrTrend} color="#DC2626" />
            <div className="flex justify-between text-[11px] text-[#94A3B8] mt-1">
              <span>Min: {Math.min(...pt.hrTrend.map(d => d.v))} bpm</span>
              <span>Max: {Math.max(...pt.hrTrend.map(d => d.v))} bpm</span>
              <span>Current: {pt.vitals.hr} bpm</span>
            </div>
          </Card>

          {/* BP Trend */}
          <Card title="Blood Pressure (Systolic) Trend">
            <MiniTrend data={pt.bpTrend} color="#0284C7" />
            <div className="flex justify-between text-[11px] text-[#94A3B8] mt-1">
              <span>Min: {Math.min(...pt.bpTrend.map(d => d.v))} mmHg</span>
              <span>Max: {Math.max(...pt.bpTrend.map(d => d.v))} mmHg</span>
              <span>Current: {pt.vitals.bp.split("/")[0]} mmHg</span>
            </div>
          </Card>

          {/* Ventilator */}
          <Card title="Mechanical Ventilation">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { l: "Mode", v: pt.vent.mode },
                { l: "FiO₂", v: pt.vent.fio2 },
                { l: "PEEP", v: `${pt.vent.peep} cmH₂O` },
                { l: "Tidal Vol", v: pt.vent.tv },
                { l: "Set RR", v: `${pt.vent.rr}/min` },
                { l: "PIP", v: `${pt.vent.pip} cmH₂O` },
              ].map(({ l, v }) => (
                <div key={l} className="bg-[#F8FAFC] rounded p-2 text-center">
                  <div className="text-[10px] text-[#94A3B8] uppercase tracking-wide mb-0.5">{l}</div>
                  <div className="font-mono font-semibold text-[12px] text-gray-900">{v}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Btn variant="outline" size="xs">Vent Settings</Btn>
              <Btn variant="outline" size="xs">SBT Protocol</Btn>
            </div>
          </Card>

          {/* I&O */}
          <Card title="Intake / Output — 24h">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wide mb-1.5">Intake</div>
                {[
                  { label: "IV Fluids", v: "2,840 mL" },
                  { label: "Medications", v: "380 mL" },
                  { label: "Blood Products", v: "2 units PRBCs" },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between text-[12px] py-0.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">{r.label}</span>
                    <span className="font-mono font-medium">{r.v}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[12px] pt-1 font-semibold">
                  <span>Total In</span><span className="font-mono text-[#1B4FD8]">3,220 mL</span>
                </div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wide mb-1.5">Output</div>
                {[
                  { label: "Urine", v: "880 mL" },
                  { label: "NG Tube", v: "120 mL" },
                  { label: "Drains", v: "—" },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between text-[12px] py-0.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">{r.label}</span>
                    <span className="font-mono font-medium">{r.v}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[12px] pt-1 font-semibold">
                  <span>Total Out</span><span className="font-mono text-[#DC2626]">1,000 mL</span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-center text-[12px] font-semibold">
              <span className="text-[#64748B]">Net Balance: </span>
              <span className="font-mono text-[#D97706]">+2,220 mL</span>
            </div>
          </Card>
        </div>

        {/* Right: Infusions + Labs */}
        <div className="space-y-3">
          {/* Infusions */}
          <Card title="Active Infusions" actions={<Btn variant="primary" size="xs">+ Add Drip</Btn>}>
            {pt.infusions.map((inf, i) => (
              <div key={i} className="py-2.5 border-b border-[#F1F5F9] last:border-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[12.5px] font-semibold text-gray-900">{inf.drug}</div>
                    <div className="font-mono text-[11.5px] text-[#DC2626] font-bold mt-0.5">{inf.rate}</div>
                    <div className="text-[10.5px] text-[#94A3B8]">{inf.concentration}</div>
                  </div>
                  <div className="flex gap-1">
                    <Btn variant="outline" size="xs">Adjust</Btn>
                    <Btn variant="ghost" size="xs">D/C</Btn>
                  </div>
                </div>
              </div>
            ))}
          </Card>

          {/* Recent Labs */}
          <Card title="Critical Labs" actions={<Btn variant="primary" size="xs">+ Order</Btn>}>
            {[
              { test: "Troponin I", val: "18.4 ng/mL", ref: "< 0.04", flag: "HH", time: "10:02" },
              { test: "Lactic Acid", val: "4.2 mmol/L", ref: "0.5–2.2", flag: "HH", time: "09:45" },
              { test: "WBC", val: "18.4 K/μL", ref: "4.5–11.0", flag: "H", time: "09:10" },
              { test: "Creatinine", val: "2.1 mg/dL", ref: "0.7–1.3", flag: "H", time: "09:10" },
              { test: "Hemoglobin", val: "8.2 g/dL", ref: "13.5–17.5", flag: "L", time: "09:10" },
              { test: "pH (ABG)", val: "7.28", ref: "7.35–7.45", flag: "L", time: "08:55" },
              { test: "pO₂ (ABG)", val: "68 mmHg", ref: "80–100", flag: "L", time: "08:55" },
            ].map((l, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC] last:border-0">
                <span className="text-[12px] text-gray-700 w-28">{l.test}</span>
                <span className={`font-mono font-bold text-[12px] ${l.flag === "HH" ? "text-[#B91C1C] bg-[#FEE2E2] px-1.5 py-0.5 rounded" : l.flag === "H" ? "text-[#D97706]" : "text-[#0284C7]"}`}>
                  {l.val}
                </span>
                <span className="text-[10.5px] text-[#94A3B8] font-mono">{l.time}</span>
              </div>
            ))}
          </Card>

          {/* Consults */}
          <Card title="Consults & Teams">
            {[
              { team: "Cardiology", doc: "Dr. Patel", status: "Active", note: "Cath lab post-PCI monitoring" },
              { team: "Pulm/Critical Care", doc: "Dr. Shah", status: "Active", note: "Primary ICU team" },
              { team: "Nephrology", doc: "Dr. Wong", status: "Pending", note: "AKI — creatinine rising" },
              { team: "Pharmacy ICU", doc: "PharmD Lee", status: "Active", note: "Vasoactive titration protocol" },
            ].map((c, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2 border-b border-[#F1F5F9] last:border-0">
                <div className="w-7 h-7 rounded-full bg-[#E8EDF5] flex items-center justify-center text-[10px] font-bold text-[#1E3A6E] flex-shrink-0">
                  {c.team[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-gray-800">{c.team}</div>
                  <div className="text-[11px] text-[#64748B]">{c.doc} · {c.note}</div>
                </div>
                <span className={`text-[11px] font-semibold ${c.status === "Active" ? "text-[#16A34A]" : "text-[#D97706]"}`}>{c.status}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
