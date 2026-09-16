import { useEffect, useMemo, useRef, useState } from "react";
import { Btn } from "./shared";
import { db, DBOPEncounter } from "../services/db";
import { useStickyState } from "../hooks/useStickyState";

/**
 * OP nurse station -- the step between reception and the consulting room.
 *
 * The outpatient flow is: reception registers the patient, books the
 * appointment (symptom triage picks the doctor), and sends them to billing.
 * The patient then arrives in the OP department, where the nurse takes baseline
 * observations and only then hands them to the doctor.
 *
 * That middle step had no screen. Booking put the visit straight into the
 * doctor's queue, so doctors were called to patients nobody had weighed or taken
 * a blood pressure from, and the vitals panel on the admit card was always
 * blank. Booking now stops at "Doctor Assigned" and `db.recordVitals` is the
 * only thing that moves a patient to "In Queue".
 */

/** Waiting for the nurse. */
const AWAITING_VITALS: DBOPEncounter["status"][] = [
  "Registered",
  "Symptoms Captured",
  "AI Recommended",
  "Awaiting Doctor",
  "Doctor Assigned",
];

const EMPTY_VITALS: DBOPEncounter["vitals"] = {
  bp: "", pulse: "", temp: "", spo2: "", weight: "", notes: "",
};

type Field = { key: keyof DBOPEncounter["vitals"]; label: string; unit: string; placeholder: string };

const FIELDS: Field[] = [
  { key: "bp", label: "Blood pressure", unit: "mmHg", placeholder: "120/80" },
  { key: "pulse", label: "Pulse", unit: "bpm", placeholder: "78" },
  { key: "temp", label: "Temperature", unit: "°F", placeholder: "98.6" },
  { key: "spo2", label: "SpO₂", unit: "%", placeholder: "98" },
  { key: "weight", label: "Weight", unit: "kg", placeholder: "70" },
];

/**
 * Ranges that make a reading worth a second look. Deliberately wide -- this
 * flags for the nurse's attention, it does not diagnose, and nothing here
 * blocks sending the patient through.
 */
function flagFor(key: keyof DBOPEncounter["vitals"], raw: string): string | null {
  const n = parseFloat(raw);
  if (!raw.trim() || Number.isNaN(n)) return null;
  switch (key) {
    case "pulse": return n < 50 ? "Low" : n > 120 ? "High" : null;
    case "temp": return n >= 100.4 ? "Febrile" : n < 95 ? "Low" : null;
    case "spo2": return n < 92 ? "Low" : null;
    case "bp": {
      const sys = parseFloat(raw.split("/")[0]);
      if (Number.isNaN(sys)) return null;
      return sys >= 140 ? "High" : sys < 90 ? "Low" : null;
    }
    default: return null;
  }
}

export default function NurseStation({ nurseName = "OP Nurse" }: { nurseName?: string }) {
  const [encounters, setEncounters] = useState<DBOPEncounter[]>(() => db.getEncounters());
  // Draft-backed: the screen unmounts when the nurse navigates away, and a set of
  // half-entered observations is not something to retype from memory.
  const [selectedId, setSelectedId] = useStickyState<string | null>("nurse_selected", null);
  const [vitals, setVitals, clearVitalsDraft] = useStickyState<DBOPEncounter["vitals"]>("nurse_vitals", EMPTY_VITALS);
  const [sent, setSent] = useState<{ name: string; doctor: string } | null>(null);

  useEffect(() => {
    const unsub = db.subscribe(() => setEncounters(db.getEncounters()));
    return () => { unsub(); };
  }, []);

  const waiting = useMemo(
    () => encounters
      .filter(e => AWAITING_VITALS.includes(e.status))
      .sort((a, b) => (a.timestamps?.arrival || "").localeCompare(b.timestamps?.arrival || "")),
    [encounters],
  );

  const readyForDoctor = useMemo(
    () => encounters.filter(e => e.status === "In Queue"),
    [encounters],
  );

  // Ticks so the wait times on screen stay honest without a reload.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const waitMinutes = (e: DBOPEncounter) => {
    const t = Date.parse(e.timestamps?.arrival || "");
    return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((now - t) / 60000));
  };
  const longestWait = waiting.reduce((m, e) => Math.max(m, waitMinutes(e)), 0);

  const selected = waiting.find(e => e.id === selectedId) || null;

  // Patients booked since this screen was opened. Reception triages and
  // allocates the doctor, then sends the patient over -- this is the OP
  // department's side of that handover, so the nurse is not relying on
  // noticing a new row appear.
  const seenRef = useRef<Set<string> | null>(null);
  const [arrivals, setArrivals] = useState<DBOPEncounter[]>([]);
  useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = new Set(waiting.map(e => e.id));
      return;
    }
    const fresh = waiting.filter(e => !seenRef.current!.has(e.id));
    if (fresh.length) {
      fresh.forEach(e => seenRef.current!.add(e.id));
      setArrivals(prev => [...fresh, ...prev].slice(0, 4));
    }
  }, [waiting]);

  const select = (e: DBOPEncounter) => {
    setSelectedId(e.id);
    setSent(null);
    // Pre-fill anything already on record so a correction is an edit, not a retype.
    setVitals({ ...EMPTY_VITALS, ...(e.vitals ?? {}) });
  };

  const anyRecorded = FIELDS.some(f => vitals[f.key]?.trim());

  const sendToDoctor = () => {
    if (!selected) return;
    db.recordVitals(selected.id, vitals, nurseName);
    setSent({ name: selected.patientName, doctor: selected.assignedDoctor || "the duty doctor" });
    setSelectedId(null);
    clearVitalsDraft();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">OP Nurse Station</h1>
          <p className="text-[11.5px] text-[#64748B]">
            Take baseline vitals, then send the patient in to their doctor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: "Waiting", value: waiting.length, tone: "text-[#B45309]", bg: "bg-[#FFFBEB] border-[#FDE68A]" },
            { label: "Longest wait", value: longestWait, tone: "text-[#B91C1C]", bg: "bg-white border-[#DDE2EC]", suffix: "m" },
            { label: "Sent in today", value: readyForDoctor.length, tone: "text-[#15803D]", bg: "bg-[#F0FDF4] border-[#BBF7D0]" },
          ].map(st => (
            <div key={st.label} className={`px-3.5 py-1.5 rounded border ${st.bg} text-center min-w-[92px]`}>
              <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#64748B]">{st.label}</p>
              <p className={`text-[17px] font-black font-mono leading-tight ${st.tone}`}>
                {st.value}{st.suffix || ""}
              </p>
            </div>
          ))}
        </div>
      </div>

      {sent && (
        <div className="mx-6 mt-4 px-4 py-2.5 rounded bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-between">
          <p className="text-[12.5px] text-[#15803D]">
            <strong>{sent.name}</strong> sent in to <strong>{sent.doctor}</strong>. They are now in that doctor's queue.
          </p>
          <button onClick={() => setSent(null)} className="text-[11px] font-semibold text-[#15803D]">Dismiss</button>
        </div>
      )}

      {arrivals.length > 0 && (
        <div className="mx-6 mt-4 space-y-2">
          {arrivals.map(a => (
            <div key={a.id} className="px-4 py-2.5 rounded bg-[#E8EDF5] border border-[#BFD3F2] flex items-center justify-between gap-3">
              <p className="text-[12.5px] text-[#1E3A6E]">
                <strong>{a.patientName}</strong> sent over from reception
                {a.assignedDoctor ? <> for <strong>{a.assignedDoctor}</strong></> : null}
                {a.dept ? <> · {a.dept}</> : null} — vitals needed
              </p>
              <button
                onClick={() => { select(a); setArrivals(p => p.filter(x => x.id !== a.id)); }}
                className="text-[11.5px] font-semibold text-[#1B4FD8] whitespace-nowrap"
              >
                Take vitals →
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 flex min-h-0 gap-4 p-6 pt-4">
        {/* Waiting list */}
        <aside className="w-[340px] flex-shrink-0 bg-white border border-[#DDE2EC] rounded flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-[#DDE2EC]">
            <h2 className="text-[12.5px] font-bold text-gray-900">Waiting for vitals ({waiting.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {waiting.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-2xl mb-2">🩺</div>
                <p className="text-[12.5px] font-semibold text-[#334155]">Nobody waiting</p>
                <p className="text-[11.5px] text-[#94A3B8] mt-1">
                  Patients appear here once reception has booked their appointment.
                </p>
              </div>
            ) : waiting.map(e => {
              const active = e.id === selectedId;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => select(e)}
                  className={`w-full text-left px-4 py-3 border-b border-[#F1F5F9] transition-colors border-l-[3px] ${
                    active ? "bg-[#E8EDF5] border-l-[#1B4FD8]" : "hover:bg-[#F8FAFC] border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-[13px] text-gray-900 truncate">{e.patientName}</span>
                    <span
                      className={`text-[10.5px] font-mono font-semibold flex-shrink-0 ${
                        waitMinutes(e) >= 30 ? "text-[#B91C1C]" : waitMinutes(e) >= 15 ? "text-[#B45309]" : "text-[#94A3B8]"
                      }`}
                    >
                      {waitMinutes(e)}m
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                    {e.umr} · {e.opNumber} · {e.age}{e.sex?.[0]}
                  </div>
                  <p className="text-[11.5px] text-[#475569] mt-1 line-clamp-2">
                    {e.chiefComplaint || "No chief complaint recorded"}
                  </p>
                  <div className="mt-1.5 text-[11px]">
                    {e.assignedDoctor ? (
                      <span className="text-[#1B4FD8] font-medium">→ {e.assignedDoctor}</span>
                    ) : (
                      <span className="text-[#B45309]">No doctor booked yet</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Vitals form */}
        <section className="flex-1 min-w-0 overflow-y-auto">
          {!selected ? (
            <div className="space-y-4">
              <div className="bg-white border border-[#DDE2EC] rounded p-6 text-center">
                <div className="text-3xl mb-2">👩‍⚕️</div>
                <h3 className="text-[14px] font-bold text-gray-900">
                  {waiting.length > 0 ? "Pick a patient to start" : "Nobody is waiting"}
                </h3>
                <p className="text-[12.5px] text-[#64748B] mt-1.5 max-w-md mx-auto">
                  {waiting.length > 0
                    ? "Choose someone from the waiting list to record their observations and send them in to their doctor."
                    : "Patients appear on the left the moment reception books their appointment."}
                </p>
                {waiting.length > 0 && (
                  <button
                    type="button"
                    onClick={() => select(waiting[0])}
                    className="mt-4 px-4 py-2 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded transition-colors cursor-pointer"
                  >
                    Start with {waiting[0].patientName} ({waitMinutes(waiting[0])}m waiting) →
                  </button>
                )}
              </div>

              {/* Already handed over -- so the nurse can see her own work and spot
                  anyone she sent in who is still sitting in the waiting room. */}
              <div className="bg-white border border-[#DDE2EC] rounded">
                <div className="px-4 py-2.5 border-b border-[#DDE2EC]">
                  <h3 className="text-[12.5px] font-bold text-gray-900">
                    Sent in to a doctor ({readyForDoctor.length})
                  </h3>
                </div>
                {readyForDoctor.length === 0 ? (
                  <p className="p-5 text-center text-[12px] text-[#94A3B8]">Nobody sent in yet.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {readyForDoctor.map(e => (
                      <div key={e.id} className="px-4 py-2.5 border-b border-[#F1F5F9] last:border-b-0 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-gray-900 truncate">{e.patientName}</p>
                          <p className="text-[11px] font-mono text-[#64748B]">
                            {e.umr} · {e.assignedDoctor || "No doctor"} · {e.room || "—"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[11px] font-mono text-[#15803D]">
                            {e.vitals?.bp || "--"} · {e.vitals?.pulse || "--"}
                          </p>
                          <p className="text-[10px] text-[#94A3B8]">
                            {e.timestamps?.vitalsRecorded ? `sent ${e.timestamps.vitalsRecorded}` : "vitals on file"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white border border-[#DDE2EC] rounded p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-900">{selected.patientName}</h3>
                    <p className="text-[11.5px] font-mono text-[#64748B] mt-0.5">
                      {selected.umr} · {selected.opNumber} · {selected.age} yrs {selected.sex} · {selected.dept}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#64748B]">Booked with</p>
                    <p className="text-[12.5px] font-semibold text-[#1B4FD8]">
                      {selected.assignedDoctor || "Not assigned"}
                    </p>
                    {selected.room && <p className="text-[11px] font-mono text-[#94A3B8]">{selected.room}</p>}
                  </div>
                </div>
                <p className="text-[12.5px] text-[#334155] mt-3 pt-3 border-t border-[#F1F5F9]">
                  <span className="text-[#64748B]">Complaint: </span>
                  {selected.chiefComplaint || "None recorded"}
                </p>
              </div>

              <div className="bg-white border border-[#DDE2EC] rounded">
                <div className="px-4 py-3 border-b border-[#DDE2EC]">
                  <h3 className="text-[13px] font-bold text-gray-900">Baseline observations</h3>
                  <p className="text-[11.5px] text-[#64748B] mt-0.5">
                    Leave anything you did not measure blank -- a blank reading is recorded as not taken, never as normal.
                  </p>
                </div>
                <div className="p-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {FIELDS.map(f => {
                    const flag = flagFor(f.key, vitals[f.key] || "");
                    return (
                      <label key={f.key} className="block">
                        <span className="flex items-center justify-between text-[11px] font-semibold text-[#475569] mb-1">
                          {f.label} <span className="font-normal text-[#94A3B8]">{f.unit}</span>
                        </span>
                        <input
                          value={vitals[f.key] || ""}
                          placeholder={f.placeholder}
                          onChange={e => setVitals(v => ({ ...v, [f.key]: e.target.value }))}
                          className={`w-full border rounded px-2.5 py-1.5 text-[13px] ${
                            flag ? "border-[#FCA5A5] bg-[#FEF2F2]" : "border-[#DDE2EC]"
                          }`}
                        />
                        {flag && <span className="text-[10.5px] text-[#B91C1C] mt-0.5 inline-block">{flag} — check</span>}
                      </label>
                    );
                  })}
                </div>
                <div className="px-4 pb-4">
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-[#475569] mb-1">Nurse note</span>
                    <textarea
                      rows={2}
                      value={vitals.notes || ""}
                      placeholder="Anything the doctor should know before seeing the patient"
                      onChange={e => setVitals(v => ({ ...v, notes: e.target.value }))}
                      className="w-full border border-[#DDE2EC] rounded px-2.5 py-1.5 text-[13px]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11.5px] text-[#64748B]">
                  {anyRecorded
                    ? `Recorded by ${nurseName}`
                    : "No readings entered yet — you can still send the patient in."}
                </p>
                <Btn variant="primary" size="sm" onClick={sendToDoctor}>
                  Send in to {selected.assignedDoctor || "doctor"} →
                </Btn>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
