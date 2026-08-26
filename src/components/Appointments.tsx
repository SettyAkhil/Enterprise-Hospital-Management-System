import React, { useEffect, useState } from "react";
import { StatusBadge, Btn, Card, Table, TR, TD } from "./shared";
import { Icon } from "./icons";
import { apiFetch, reportError } from "../lib/api";
import type { Notice } from "../types";

type Appointment = {
  id: number;
  patient_name: string;
  patient_id: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  patient_phone: string | null;
  department: string | null;
  doctor_name: string | null;
  appointment_date: string;
  status: string;
  token_no: number | null;
  visit_type: string;
  chief_complaint: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Pending",
  checked_in: "Checked In",
  in_consultation: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

function statusLabel(status: string) {
  return STATUS_LABEL[status] || status;
}

function last7Days() {
  const days: { label: string; iso: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: `${d.toLocaleDateString(undefined, { weekday: "short" })}\n${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
      iso: d.toISOString().slice(0, 10),
    });
  }
  return days;
}

const detectDepartmentFromSymptoms = (text: string): { dept: string, doc: string, urgency: string } | null => {
  if (!text || text.trim().length < 2) return null;
  const lower = text.toLowerCase();

  if (/\b(chest|heart|palpitat|breathless|cardio|angina|tachycardia|ecg|hypertens|bp\b|pressure)\b/i.test(lower)) {
    return { dept: "Cardiology", doc: "Dr. Patel", urgency: "High - Same Day" };
  }
  if (/\b(knee|bone|fractur|joint|sprain|ortho|spine|back pain|arthritis|ligament|swollen ankle|shoulder)\b/i.test(lower)) {
    return { dept: "Orthopedics", doc: "Dr. Adams", urgency: "Moderate" };
  }
  if (/\b(pregnan|prenatal|period|menstrua|gynec|pelvic|ovary|uterus|cramp|delivery)\b/i.test(lower)) {
    return { dept: "Gynecology", doc: "Dr. Lee", urgency: "Routine" };
  }
  if (/\b(fever|cold|cough|weakness|fatigue|infect|body pain|chill|viral|malaise|typhoid|malaria|diabet|headache|vomit|diarrhea|nausea|dizz)\b/i.test(lower)) {
    return { dept: "General Medicine", doc: "Dr. Anderson", urgency: "Moderate" };
  }
  return { dept: "General Medicine", doc: "Dr. Chen", urgency: "Routine" };
};

type NewAppointmentPayload = {
  patient_name: string;
  visit_type: string;
  appointment_date: string;
  department?: string;
  doctor_name?: string;
  patient_age?: number;
  patient_gender?: string;
  patient_phone?: string;
  chief_complaint?: string;
  symptoms?: string;
  symptom_duration?: string;
  symptom_severity?: string;
};

function AIAppointmentModal({ onClose, onSchedule }: { onClose: () => void, onSchedule: (payload: NewAppointmentPayload) => void }) {
  const [registryType, setRegistryType] = useState<"OP" | "IP">("OP");
  const [patient, setPatient] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [visitType, setVisitType] = useState("OP");
  const [complaint, setComplaint] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [symptomDuration, setSymptomDuration] = useState("");
  const [symptomSeverity, setSymptomSeverity] = useState("moderate");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ dept: string, doc: string, urgency: string } | null>(null);

  const handleAnalyze = () => {
    if (!symptoms && !complaint) return;
    setIsAnalyzing(true);
    setResult(null);

    // Client-side keyword heuristic -- not a real AI call, just a quick department suggestion.
    setTimeout(() => {
      const combined = `${complaint} ${symptoms}`;
      const res = detectDepartmentFromSymptoms(combined) || { dept: "General Medicine", doc: "Dr. Chen", urgency: "Routine" };
      if (registryType === "IP") {
         res.urgency = res.urgency === "Routine" ? "Ward Admission" : "ICU Admission";
      }
      setResult(res);
      setIsAnalyzing(false);
    }, 1200);
  };

  const handleSchedule = () => {
    if (!result || !patient) return;

    onSchedule({
      patient_name: patient,
      visit_type: registryType === "IP" ? "IP" : visitType,
      appointment_date: new Date().toISOString(),
      department: result.dept,
      doctor_name: result.doc,
      patient_age: age ? parseInt(age, 10) : undefined,
      patient_gender: gender,
      patient_phone: phone || undefined,
      chief_complaint: complaint || undefined,
      symptoms: symptoms || undefined,
      symptom_duration: symptomDuration || undefined,
      symptom_severity: symptomSeverity,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="px-6 py-4 border-b border-[#DDE2EC] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Icon.FlaskConical /> AI-Assisted Appointment
            </h2>
            <p className="text-[12.5px] text-[#64748B]">Intelligent triage and specialist assignment based on symptoms.</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-gray-900">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* IP / OP Toggle */}
          <div className="flex bg-[#F1F5F9] p-1 rounded-lg">
            <button
              onClick={() => { setRegistryType("OP"); setVisitType("OP"); }}
              className={`flex-1 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${registryType === "OP" ? "bg-white text-[#1B4FD8] shadow-sm" : "text-[#64748B] hover:text-gray-900"}`}
            >
              Outpatient (OP)
            </button>
            <button
              onClick={() => { setRegistryType("IP"); setVisitType("Admission"); }}
              className={`flex-1 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${registryType === "IP" ? "bg-white text-[#1B4FD8] shadow-sm" : "text-[#64748B] hover:text-gray-900"}`}
            >
              Inpatient (IP) Admission
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Patient Name</label>
              <input value={patient} onChange={e => setPatient(e.target.value)} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Age</label>
              <input value={age} onChange={e => setAge(e.target.value)} type="number" className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" placeholder="e.g. 45" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" placeholder="e.g. 555-0199" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Visit Type</label>
              <select value={visitType} onChange={e => setVisitType(e.target.value)} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]">
                {registryType === "OP" ? (
                  <>
                    <option value="OP">Outpatient (OP)</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Consultation">Consultation</option>
                  </>
                ) : (
                  <>
                    <option value="Admission">New Admission</option>
                    <option value="Transfer">Transfer</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">{registryType === "IP" ? "Primary Diagnosis / Reason" : "Chief Complaint"}</label>
              <input value={complaint} onChange={e => setComplaint(e.target.value)} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" placeholder={registryType === "IP" ? "e.g. Acute Appendicitis" : "e.g. Severe chest pain"} />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-1">Detailed Symptoms (for AI Analysis)</label>
            <textarea
              value={symptoms} onChange={e => setSymptoms(e.target.value)}
              className="w-full h-20 bg-white border border-[#DDE2EC] rounded p-3 text-[13px] focus:outline-none focus:border-[#1B4FD8] resize-none"
              placeholder="Describe symptoms in detail..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Symptom Duration</label>
              <input value={symptomDuration} onChange={e => setSymptomDuration(e.target.value)} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" placeholder="e.g. 2 days, 1 week" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Severity</label>
              <select value={symptomSeverity} onChange={e => setSymptomSeverity(e.target.value)} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]">
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!symptoms && !complaint)}
            className="w-full h-10 bg-[#EFF6FF] text-[#1B4FD8] font-semibold text-[13px] rounded border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? <div className="w-4 h-4 border-2 border-[#1B4FD8] border-t-transparent rounded-full animate-spin"></div> : <Icon.TrendUp />}
            {isAnalyzing ? "Analyzing Symptoms..." : "Analyze Symptoms"}
          </button>

          {result && (
            <div className="bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-[12.5px] font-bold text-gray-900 mb-3 border-b border-[#DDE2EC] pb-2">AI Recommendation</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[11px] text-[#64748B] mb-0.5">{registryType === "IP" ? "Admitting Specialty" : "Recommended Specialty"}</div>
                  <div className="text-[13px] font-semibold text-gray-900">{result.dept}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B] mb-0.5">{registryType === "IP" ? "Admitting Physician" : "Assigned Provider"}</div>
                  <div className="text-[13px] font-semibold text-gray-900">{result.doc}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B] mb-0.5">{registryType === "IP" ? "Suggested Unit" : "Urgency"}</div>
                  <div className={`text-[12px] font-semibold px-2 py-0.5 rounded inline-block ${result.urgency.includes("ICU") || result.urgency.includes("High") ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#FEF3C7] text-[#B45309]"}`}>
                    {result.urgency}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#DDE2EC] bg-[#F8FAFC] flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!result || !patient} onClick={handleSchedule}>Schedule Appointment</Btn>
        </div>
      </div>
    </div>
  );
}

export default function Appointments({ onSelect }: { onSelect?: () => void }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"day" | "week" | "list">("day");
  const [activeDay, setActiveDay] = useState(6);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const days = last7Days();

  const loadAppointments = () => {
    setLoading(true);
    apiFetch<{ appointments: Appointment[] }>("/api/appointments")
      .then((data) => setAppointments(data.appointments || []))
      .catch((error) => reportError(setNotice, error, "Unable to load appointments."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const completed = appointments.filter((a) => a.status === "completed").length;
  const inProgress = appointments.filter((a) => a.status === "in_consultation").length;
  const pending = appointments.filter((a) => a.status === "scheduled" || a.status === "checked_in").length;
  const providers = Array.from(new Set(appointments.map((a) => a.doctor_name).filter(Boolean))) as string[];

  const handleAddAppointment = async (payload: NewAppointmentPayload) => {
    setScheduling(true);
    try {
      await apiFetch("/api/appointments", { method: "POST", body: JSON.stringify(payload) });
      setIsModalOpen(false);
      loadAppointments();
      setNotice({ type: "success", message: `Appointment scheduled for ${payload.patient_name}.` });
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to schedule appointment.");
    } finally {
      setScheduling(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/api/appointments/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
      loadAppointments();
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to update appointment.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5] relative">
      {isModalOpen && (
        <AIAppointmentModal
          onClose={() => setIsModalOpen(false)}
          onSchedule={handleAddAppointment}
        />
      )}

      {notice && (
        <div className={`p-3 mx-6 mt-3 rounded-lg text-[12px] font-medium flex items-center justify-between ${notice.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : notice.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
          <span>{notice.message}</span>
          <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Appointments</h1>
          <p className="text-[11.5px] text-[#64748B]">{loading ? "Loading…" : `${appointments.length} appointments on record`}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[#DDE2EC] rounded overflow-hidden">
            {(["day", "week", "list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-[12px] font-medium capitalize transition-colors ${view === v ? "bg-[#1B4FD8] text-white" : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                {v}
              </button>
            ))}
          </div>
          <Btn variant="primary" size="sm" onClick={() => setIsModalOpen(true)} disabled={scheduling}>
            <Icon.Plus /> New Appointment (AI)
          </Btn>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-2.5 flex items-center gap-6 text-[12.5px] flex-wrap">
        <span><span className="font-mono font-semibold text-[#16A34A]">{completed}</span> Completed</span>
        <span><span className="font-mono font-semibold text-[#0284C7]">{inProgress}</span> In Progress</span>
        <span><span className="font-mono font-semibold text-[#D97706]">{pending}</span> Remaining</span>
        {providers.length > 0 && (
          <>
            <span className="text-[#64748B]">·</span>
            <span className="text-[#64748B]">Providers: {providers.join(", ")}</span>
          </>
        )}
      </div>

      <div className="p-5">
        {view === "week" && (
          <div className="bg-white border border-[#DDE2EC] rounded overflow-hidden mb-4">
            <div className="grid border-b border-[#DDE2EC]" style={{ gridTemplateColumns: "80px repeat(7, 1fr)" }}>
              <div className="bg-[#F8FAFC] border-r border-[#DDE2EC]" />
              {days.map((d, i) => (
                <button key={d.iso} onClick={() => { setActiveDay(i); setView("day"); }}
                  className={`px-2 py-2.5 text-center border-r border-[#DDE2EC] last:border-r-0 transition-colors
                    ${i === activeDay ? "bg-[#EFF6FF] text-[#1B4FD8]" : "hover:bg-[#F8FAFC] text-[#64748B]"}`}>
                  <div className="text-[11px] font-semibold whitespace-pre-line">{d.label}</div>
                  {i === 6 && <div className="w-1.5 h-1.5 bg-[#1B4FD8] rounded-full mx-auto mt-1" />}
                </button>
              ))}
            </div>
            <div className="h-24 flex items-center justify-center text-[#94A3B8] text-[12px]">
              Click a day to filter, then switch to Day view
            </div>
          </div>
        )}

        {(view === "day" || view === "week") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card title={`All Appointments (${appointments.length})`}>
                <div className="space-y-1">
                  {!loading && appointments.length === 0 && (
                    <div className="text-center py-8 text-[12.5px] text-[#94A3B8]">No appointments yet. Schedule one to get started.</div>
                  )}
                  {appointments.map((a) => (
                    <div key={a.id} className={`flex items-center gap-3 p-2.5 rounded border transition-colors cursor-pointer
                      ${a.status === "in_consultation" ? "border-[#BFDBFE] bg-[#EFF6FF]" : a.status === "completed" ? "border-transparent bg-[#F8FAFC]" : "border-[#F1F5F9] hover:border-[#DDE2EC] hover:bg-[#F8FAFC]"}`}
                      onClick={onSelect}>
                      <span className="font-mono text-[11px] text-[#94A3B8] w-14 flex-shrink-0">
                        {new Date(a.appointment_date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-semibold text-gray-800">{a.patient_name}</span>
                          {a.patient_age != null && <span className="text-[11px] text-[#94A3B8]">{a.patient_age}y</span>}
                          <span className="text-[11px] font-medium text-[#64748B]">{a.chief_complaint || a.visit_type}</span>
                        </div>
                        <div className="text-[11.5px] text-[#64748B]">
                          {a.doctor_name || "Unassigned"} · {a.department || "No department"} · Token #{a.token_no ?? "—"}
                        </div>
                      </div>
                      <StatusBadge status={statusLabel(a.status)} />
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {a.status === "scheduled" && (
                          <Btn variant="primary" size="xs" onClick={() => void updateStatus(a.id, "checked_in")}>Check In</Btn>
                        )}
                        {a.status === "checked_in" && (
                          <Btn variant="primary" size="xs" onClick={() => void updateStatus(a.id, "in_consultation")}>Start Visit</Btn>
                        )}
                        <Btn variant="ghost" size="xs" onClick={() => onSelect?.()}>Chart</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="space-y-4">
              <Card title="Waiting Room">
                {appointments.filter(a => a.status === "checked_in").map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 py-2 border-b border-[#F1F5F9] last:border-0">
                    <div className="w-7 h-7 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[10px] font-bold text-[#0284C7]">
                      {a.patient_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-gray-800">{a.patient_name}</div>
                      <div className="text-[11px] text-[#64748B]">
                        {new Date(a.appointment_date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · {a.doctor_name || "Unassigned"}
                      </div>
                    </div>
                    <Btn variant="primary" size="xs" className="ml-auto" onClick={() => void updateStatus(a.id, "in_consultation")}>Start</Btn>
                  </div>
                ))}
                {appointments.filter(a => a.status === "checked_in").length === 0 && (
                  <div className="text-center py-4 text-[12px] text-[#94A3B8]">No patients currently waiting</div>
                )}
              </Card>
            </div>
          </div>
        )}

        {view === "list" && (
          <Card title="All Appointments" actions={<Btn variant="ghost" size="xs"><Icon.Download /> Export</Btn>}>
            <Table headers={["Date/Time", "Patient", "Patient ID", "Type", "Provider", "Department", "Token", "Status", ""]}>
              {appointments.map((a) => (
                <TR key={a.id} onClick={onSelect}>
                  <TD><span className="font-mono text-[11.5px]">{new Date(a.appointment_date).toLocaleString()}</span></TD>
                  <TD><span className="font-semibold text-gray-800">{a.patient_name}</span></TD>
                  <TD><span className="font-mono text-[11.5px] text-[#64748B]">{a.patient_id || "—"}</span></TD>
                  <TD>{a.chief_complaint || a.visit_type}</TD>
                  <TD><span className="text-[#64748B]">{a.doctor_name || "Unassigned"}</span></TD>
                  <TD><span className="text-[#64748B]">{a.department || "—"}</span></TD>
                  <TD><span className="font-mono text-[11.5px]">{a.token_no ?? "—"}</span></TD>
                  <TD><StatusBadge status={statusLabel(a.status)} /></TD>
                  <TD>
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {a.status === "scheduled" && (
                        <Btn variant="outline" size="xs" onClick={() => void updateStatus(a.id, "checked_in")}>
                          Check-in OP ➔
                        </Btn>
                      )}
                      <Btn variant="ghost" size="xs" onClick={() => onSelect?.()}>Chart</Btn>
                    </div>
                  </TD>
                </TR>
              ))}
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
