import React, { useState, useEffect, useMemo } from "react";
import { Btn, Card, AlertBanner } from "./shared";
import { Icon } from "./icons";
import { apiFetch, reportError } from "../lib/api";
import type { Notice } from "../types";

const ESI_GUIDE = [
  { level: 1, label: "Immediate", color: "#0F1624", bg: "#1F2937", desc: "Requires immediate life-saving intervention", examples: "Cardiac arrest, respiratory failure" },
  { level: 2, label: "Emergent", color: "#fff", bg: "#DC2626", desc: "High-risk situation or severe pain/distress", examples: "Chest pain, altered mental status, BP > 180/120" },
  { level: 3, label: "Urgent", color: "#fff", bg: "#D97706", desc: "Stable, may require multiple resources", examples: "Abdominal pain, asthma, minor trauma" },
  { level: 4, label: "Less Urgent", color: "#fff", bg: "#16A34A", desc: "Stable, one resource needed", examples: "Laceration, UTI, uncomplicated sprain" },
  { level: 5, label: "Non-Urgent", color: "#fff", bg: "#1B4FD8", desc: "Stable, no resources anticipated", examples: "Cold/flu, prescription refill, minor rash" },
];

export default function Triage({ setNotice, onNavigate }: { setNotice?: (notice: Notice | null) => void, onNavigate?: (module: string) => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [esi, setEsi] = useState<number | null>(null);
  const [vitals, setVitals] = useState({ bpSys: "", bpDia: "", hr: "", rr: "", temp: "", spo2: "", pain: "" });
  const [cc, setCc] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [visitsRes, catsRes] = await Promise.all([
        apiFetch<{ visits: any[] }>("/api/er/visits?active_only=true"),
        apiFetch<{ categories: any[] }>("/api/er/triage-config")
      ]);
      const untriaged = visitsRes.visits.filter(v => v.status === "registered" || !v.triage_category);
      setVisits(untriaged);
      setCategories(catsRes.categories);
      if (untriaged.length > 0 && !selectedId) {
        setSelectedId(untriaged[0].id);
      } else if (untriaged.length === 0) {
        setSelectedId(null);
      }
    } catch (error: any) {
      if (setNotice) reportError(setNotice, error, "Failed to load triage data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pt = visits.find(v => v.id === selectedId);

  // When patient changes, reset form
  useEffect(() => {
    setVitals({ bpSys: "", bpDia: "", hr: "", rr: "", temp: "", spo2: "", pain: "" });
    setCc("");
    setEsi(null);
  }, [selectedId]);

  const submit = async () => {
    if (!pt) return;
    if (!esi) {
      if (setNotice) setNotice({ type: "error", message: "Select an ESI level." });
      return;
    }

    try {
      if (cc.trim()) {
        await apiFetch(`/api/er/visits/${pt.id}/complaints`, {
          method: "POST",
          body: JSON.stringify({ complaint: cc.trim(), case_category: "other" }),
        });
      }

      const vBody: Record<string, any> = {};
      if (vitals.hr.trim()) vBody.heart_rate = parseInt(vitals.hr);
      if (vitals.bpSys.trim()) vBody.bp_systolic = parseInt(vitals.bpSys);
      if (vitals.bpDia.trim()) vBody.bp_diastolic = parseInt(vitals.bpDia);
      if (vitals.spo2.trim()) vBody.spo2 = parseFloat(vitals.spo2);
      if (vitals.rr.trim()) vBody.respiratory_rate = parseInt(vitals.rr);
      if (vitals.temp.trim()) vBody.temperature = parseFloat(vitals.temp);
      if (vitals.pain.trim()) vBody.pain_score = parseInt(vitals.pain);

      if (Object.keys(vBody).length > 0) {
        await apiFetch(`/api/er/visits/${pt.id}/vitals`, {
          method: "POST",
          body: JSON.stringify(vBody),
        });
      }

      const categoryCode = `B${esi}`; // ESI 1 -> B1, ESI 2 -> B2
      await apiFetch(`/api/er/visits/${pt.id}/triage`, {
        method: "POST",
        body: JSON.stringify({ category: categoryCode }),
      });

      setSubmitted(true);
      if (setNotice) setNotice({ type: "success", message: `Triage completed for ${pt.patient_name || pt.unknown_patient_label}. Assigned ESI ${esi}.` });
      
      setTimeout(() => {
        setSubmitted(false);
        loadData();
      }, 1500);

    } catch (error: any) {
      if (setNotice) reportError(setNotice, error, "Failed to submit triage.");
    }
  };

  const getPatientName = (v: any) => {
    if (v.is_unknown_patient) return v.unknown_patient_label || "Unidentified Trauma Patient";
    return [v.patient_name, v.patient_last_name].filter(Boolean).join(" ") || v.patient_id;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Triage</h1>
          <p className="text-[11.5px] text-[#64748B]">Emergency Department · {visits.length} patients awaiting triage</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="outline" size="sm" onClick={loadData}><Icon.Refresh /> Refresh</Btn>
          <Btn variant="primary" size="sm" onClick={() => onNavigate?.("emergency")}><Icon.Plus /> ER Queue</Btn>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Triage queue */}
        <div className="flex flex-col gap-4">
          <Card title="Awaiting Triage" actions={<span className="text-[11px] text-[#DC2626] font-semibold">{visits.length} Total</span>}>
            {loading ? (
              <p className="text-[12px] text-gray-500 p-4">Loading queue...</p>
            ) : visits.length === 0 ? (
              <p className="text-[12px] text-gray-500 p-4">No patients awaiting triage.</p>
            ) : (
              <div className="space-y-1 -mx-4 -mb-4 max-h-[400px] overflow-y-auto border-t border-[#DDE2EC]">
                {visits.map((p) => {
                  return (
                    <div key={p.id} onClick={() => setSelectedId(p.id)}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-[#F1F5F9] last:border-0 cursor-pointer transition-colors
                        ${selectedId === p.id ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"}`}>
                      <div className="w-8 h-8 rounded flex items-center justify-center text-gray-600 bg-gray-100 text-[11px] font-bold flex-shrink-0">
                        ?
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-semibold text-gray-900">{getPatientName(p)}</div>
                        <div className="text-[11.5px] text-[#64748B] truncate">{p.condition_at_arrival || "No arrival condition"}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                          <span className="font-mono text-[#94A3B8]">{p.visit_no}</span>
                          {p.patient_age && <><span className="text-[#94A3B8]">·</span><span className="text-[#94A3B8]">{p.patient_age}y</span></>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* ESI Guide */}
          <div className="bg-white border border-[#DDE2EC] rounded shadow-sm">
            <div className="px-4 py-2.5 border-b border-[#DDE2EC]">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">ESI Quick Reference</span>
            </div>
            <div className="divide-y divide-[#F1F5F9] max-h-[300px] overflow-y-auto">
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
          {!pt ? (
            <div className="bg-white border border-[#DDE2EC] rounded p-12 text-center text-[#64748B]">
              Select a patient from the queue to begin triage.
            </div>
          ) : (
            <>
              {/* Patient header */}
              <div className="bg-white border border-[#DDE2EC] rounded p-4 shadow-sm flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1B4FD8] flex items-center justify-center text-white font-semibold">
                    {getPatientName(pt)[0]}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-gray-900">{getPatientName(pt)}</div>
                    <div className="text-[11.5px] text-[#64748B]">
                      {pt.patient_age ? `${pt.patient_age} yrs · ` : ""}
                      {pt.patient_id ? `MRN ${pt.patient_id} · ` : ""}
                      Visit {pt.visit_no}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-[#64748B]">Arrival Mode</div>
                  <div className="text-[12px] font-medium text-gray-800 mt-0.5">{pt.arrival_mode || "Walk-in"}</div>
                </div>
              </div>

              {/* Chief Complaint */}
              <Card title="Chief Complaint & History">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Chief Complaint</label>
                    <input value={cc} onChange={e => setCc(e.target.value)}
                      placeholder="Patient's chief complaint in their own words..."
                      className="w-full border border-[#DDE2EC] rounded text-[12.5px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]" />
                  </div>
                </div>
              </Card>

              {/* Vitals */}
              <Card title="Vital Signs">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Blood Pressure</label>
                    <div className="flex items-center gap-1">
                      <input value={vitals.bpSys} onChange={e => setVitals(v => ({ ...v, bpSys: e.target.value }))}
                        placeholder="Sys" className="w-full border border-[#DDE2EC] rounded text-[13px] font-mono px-2 py-1.5 focus:outline-none focus:border-[#1B4FD8]" />
                      <span className="text-[#94A3B8]">/</span>
                      <input value={vitals.bpDia} onChange={e => setVitals(v => ({ ...v, bpDia: e.target.value }))}
                        placeholder="Dia" className="w-full border border-[#DDE2EC] rounded text-[13px] font-mono px-2 py-1.5 focus:outline-none focus:border-[#1B4FD8]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Heart Rate</label>
                    <div className="relative">
                      <input value={vitals.hr} onChange={e => setVitals(v => ({ ...v, hr: e.target.value }))}
                        placeholder="72" className="w-full border border-[#DDE2EC] rounded text-[13px] font-mono px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8]" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] text-[#94A3B8]">bpm</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Resp Rate</label>
                    <div className="relative">
                      <input value={vitals.rr} onChange={e => setVitals(v => ({ ...v, rr: e.target.value }))}
                        placeholder="16" className="w-full border border-[#DDE2EC] rounded text-[13px] font-mono px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8]" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] text-[#94A3B8]">/min</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Temperature</label>
                    <div className="relative">
                      <input value={vitals.temp} onChange={e => setVitals(v => ({ ...v, temp: e.target.value }))}
                        placeholder="98.6" className="w-full border border-[#DDE2EC] rounded text-[13px] font-mono px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8]" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] text-[#94A3B8]">°F</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] mb-1">SpO₂</label>
                    <div className="relative">
                      <input value={vitals.spo2} onChange={e => setVitals(v => ({ ...v, spo2: e.target.value }))}
                        placeholder="98" className="w-full border border-[#DDE2EC] rounded text-[13px] font-mono px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8]" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] text-[#94A3B8]">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Pain Score</label>
                    <div className="relative">
                      <input value={vitals.pain} onChange={e => setVitals(v => ({ ...v, pain: e.target.value }))}
                        placeholder="0-10" className="w-full border border-[#DDE2EC] rounded text-[13px] font-mono px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8]" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] text-[#94A3B8]">/10</span>
                    </div>
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
                {esi && (
                  <div className={`text-[12.5px] font-medium p-3 rounded text-white`}
                    style={{ backgroundColor: ESI_GUIDE[esi - 1].bg }}>
                    ESI {esi} — {ESI_GUIDE[esi - 1].label}: {ESI_GUIDE[esi - 1].desc}
                  </div>
                )}
              </Card>

              {/* Immediate alerts */}
              {esi && esi <= 2 && (
                <AlertBanner type="critical" title={`ESI ${esi} — IMMEDIATE ATTENTION REQUIRED`}
                  body="Notify attending physician immediately. Assign to resuscitation or high-acuity bay." action="Notify Provider" />
              )}

              <div className="flex justify-end gap-3 mt-4">
                <Btn variant="outline" size="md" onClick={() => setSelectedId(null)}>Cancel</Btn>
                <Btn variant="primary" size="md" onClick={submit} disabled={!esi || submitted}>
                  {submitted ? "Saving..." : esi ? `Complete Triage — Assign ESI ${esi}` : "Select ESI to Complete"}
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
