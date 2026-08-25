import React, { useState } from "react";
import { StatusBadge, Btn, Card, Table, TR, TD } from "./shared";
import { Icon } from "./icons";

const INITIAL_APPOINTMENTS = [
  { time: "08:00", patient: "Harold Thompson", age: 68, type: "Post-op Follow-up", provider: "Dr. Adams", room: "Ortho 1", duration: "30m", status: "Completed", mrn: "100401" },
  { time: "08:30", patient: "Sandra Brown", age: 44, type: "Follow-up", provider: "Dr. Williams", room: "Surg 2", duration: "20m", status: "Completed", mrn: "100331" },
  { time: "09:00", patient: "Sarah Connelly", age: 35, type: "Annual Physical", provider: "Dr. Adams", room: "101", duration: "45m", status: "Completed", mrn: "100289" },
  { time: "09:30", patient: "Marcus Webb", age: 43, type: "New Patient", provider: "Dr. Lee", room: "102", duration: "60m", status: "In Progress", mrn: "100500" },
  { time: "10:00", patient: "Elena Torres", age: 57, type: "Diabetes Follow-up", provider: "Dr. Adams", room: "103", duration: "30m", status: "Checked In", mrn: "100198" },
  { time: "10:30", patient: "Robert Kim", age: 52, type: "Cardiac Consult", provider: "Dr. Patel", room: "Card 1", duration: "45m", status: "Pending", mrn: "100377" },
  { time: "11:00", patient: "Jennifer Walsh", age: 29, type: "GYN Consult", provider: "Dr. Lee", room: "102", duration: "30m", status: "Pending", mrn: "100511" },
  { time: "11:30", patient: "David Chu", age: 61, type: "Hypertension", provider: "Dr. Adams", room: "101", duration: "20m", status: "Pending", mrn: "100289" },
  { time: "13:00", patient: "Helen Park", age: 72, type: "Post-discharge", provider: "Dr. Chen", room: "104", duration: "30m", status: "Pending", mrn: "100402" },
  { time: "13:30", patient: "Frank Torres", age: 55, type: "Lab Review", provider: "Dr. Anderson", room: "105", duration: "20m", status: "Pending", mrn: "100501" },
  { time: "14:00", patient: "Mia Thompson", age: 31, type: "Pre-op Visit", provider: "Dr. Park", room: "Eye 1", duration: "45m", status: "Pending", mrn: "100312" },
  { time: "15:00", patient: "Diane Walsh", age: 80, type: "Follow-up", provider: "Dr. Anderson", room: "103", duration: "30m", status: "Pending", mrn: "100142" },
];

const DAYS = ["Mon\nAug 19", "Tue\nAug 20", "Wed\nAug 21", "Thu\nAug 22", "Fri\nAug 23", "Sat\nAug 24", "Sun\nAug 25"];
const SELECTED_DAY = 4;

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

function AIAppointmentModal({ onClose, onSchedule }: { onClose: () => void, onSchedule: (appt: any) => void }) {
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

    // Simulate AI delay
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
    
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    onSchedule({
      time: time,
      patient: patient,
      age: parseInt(age) || 30,
      type: registryType === "IP" ? "IP Admission" : (complaint || "New Patient"),
      provider: result.doc,
      room: registryType === "IP" ? "Ward Pending" : "Triage 1",
      duration: registryType === "IP" ? "Admitted" : "30m",
      status: "Checked In",
      mrn: `100${Math.floor(Math.random() * 900) + 100}`
    });
    onClose();
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
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [view, setView] = useState<"day" | "week" | "list">("day");
  const [activeDay, setActiveDay] = useState(SELECTED_DAY);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const completed = appointments.filter(a => a.status === "Completed").length;
  const inProgress = appointments.filter(a => a.status === "In Progress").length;
  const pending = appointments.filter(a => a.status === "Pending" || a.status === "Checked In").length;

  const handleAddAppointment = (appt: any) => {
    setAppointments(prev => {
      const updated = [...prev, appt];
      updated.sort((a, b) => a.time.localeCompare(b.time));
      return updated;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5] relative">
      {isModalOpen && (
        <AIAppointmentModal 
          onClose={() => setIsModalOpen(false)} 
          onSchedule={handleAddAppointment} 
        />
      )}

      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Appointments</h1>
          <p className="text-[11.5px] text-[#64748B]">{appointments.length} appointments today · Aug 23, 2026</p>
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
          <Btn variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Icon.Plus /> New Appointment (AI)
          </Btn>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-2.5 flex items-center gap-6 text-[12.5px]">
        <span><span className="font-mono font-semibold text-[#16A34A]">{completed}</span> Completed</span>
        <span><span className="font-mono font-semibold text-[#0284C7]">{inProgress}</span> In Progress</span>
        <span><span className="font-mono font-semibold text-[#D97706]">{pending}</span> Remaining</span>
        <span className="text-[#64748B]">·</span>
        <span className="text-[#64748B]">Providers: Dr. Adams, Dr. Lee, Dr. Patel, Dr. Anderson, Dr. Park, Dr. Chen</span>
      </div>

      <div className="p-5">
        {view === "week" && (
          <div className="bg-white border border-[#DDE2EC] rounded overflow-hidden mb-4">
            <div className="grid border-b border-[#DDE2EC]" style={{ gridTemplateColumns: "80px repeat(7, 1fr)" }}>
              <div className="bg-[#F8FAFC] border-r border-[#DDE2EC]" />
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => { setActiveDay(i); setView("day"); }}
                  className={`px-2 py-2.5 text-center border-r border-[#DDE2EC] last:border-r-0 transition-colors
                    ${i === activeDay ? "bg-[#EFF6FF] text-[#1B4FD8]" : "hover:bg-[#F8FAFC] text-[#64748B]"}`}>
                  <div className="text-[11px] font-semibold whitespace-pre-line">{d}</div>
                  {i === SELECTED_DAY && <div className="w-1.5 h-1.5 bg-[#1B4FD8] rounded-full mx-auto mt-1" />}
                </button>
              ))}
            </div>
            <div className="h-48 flex items-center justify-center text-[#94A3B8] text-[12px]">
              Weekly calendar grid — Click a day to view appointments
            </div>
          </div>
        )}

        {(view === "day" || view === "week") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card title={`Aug 23, 2026 — All Appointments (${appointments.length})`} actions={
                <div className="flex gap-2">
                  <Btn variant="ghost" size="xs"><Icon.Filter /> Filter</Btn>
                  <Btn variant="ghost" size="xs">Provider</Btn>
                </div>
              }>
                <div className="space-y-1">
                  {appointments.map((a, i) => (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded border transition-colors cursor-pointer
                      ${a.status === "In Progress" ? "border-[#BFDBFE] bg-[#EFF6FF]" : a.status === "Completed" ? "border-transparent bg-[#F8FAFC]" : "border-[#F1F5F9] hover:border-[#DDE2EC] hover:bg-[#F8FAFC]"}`}
                      onClick={onSelect}>
                      <span className="font-mono text-[11px] text-[#94A3B8] w-10 flex-shrink-0">{a.time}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-semibold text-gray-800">{a.patient}</span>
                          <span className="text-[11px] text-[#94A3B8]">{a.age}y</span>
                          <span className={`text-[11px] font-medium ${a.type.includes("New") ? "text-[#7C3AED]" : "text-[#64748B]"}`}>{a.type}</span>
                        </div>
                        <div className="text-[11.5px] text-[#64748B]">{a.provider} · Room {a.room} · {a.duration}</div>
                      </div>
                      <StatusBadge status={a.status} />
                      <div className="flex gap-1">
                        {a.status === "Pending" && <Btn variant="primary" size="xs" onClick={(e) => { e.stopPropagation(); }}>Check In</Btn>}
                        {a.status === "Checked In" && <Btn variant="primary" size="xs" onClick={(e) => { e.stopPropagation(); }}>Start Visit</Btn>}
                        <Btn variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); }}>More</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="space-y-4">
              <Card title="Waiting Room">
                {appointments.filter(a => a.status === "Checked In").map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2 border-b border-[#F1F5F9] last:border-0">
                    <div className="w-7 h-7 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[10px] font-bold text-[#0284C7]">
                      {a.patient.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-gray-800">{a.patient}</div>
                      <div className="text-[11px] text-[#64748B]">{a.time} · {a.provider}</div>
                    </div>
                    <Btn variant="primary" size="xs" className="ml-auto">Start</Btn>
                  </div>
                ))}
                {appointments.filter(a => a.status === "Checked In").length === 0 && (
                  <div className="text-center py-4 text-[12px] text-[#94A3B8]">No patients currently waiting</div>
                )}
              </Card>
              <Card title="Unscheduled Requests">
                <div className="space-y-2 text-[12px]">
                  {[
                    { patient: "New referral from Dr. Wong", type: "Cardiology", urgency: "Routine" },
                    { patient: "Walk-in: sore throat", type: "Urgent Care", urgency: "Same Day" },
                    { patient: "Callback: prescription refill ×2", type: "Phone", urgency: "Today" },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9] last:border-0">
                      <div>
                        <div className="font-medium text-gray-700">{r.patient}</div>
                        <div className="text-[11px] text-[#64748B]">{r.type}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#D97706] font-medium">{r.urgency}</span>
                        <Btn variant="outline" size="xs">Schedule</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {view === "list" && (
          <Card title="All Appointments — Aug 23, 2026" actions={<Btn variant="ghost" size="xs"><Icon.Download /> Export</Btn>}>
            <Table headers={["Time", "Patient", "MRN", "Type", "Provider", "Room", "Duration", "Status", ""]}>
              {appointments.map((a, i) => (
                <TR key={i} onClick={onSelect}>
                  <TD><span className="font-mono text-[11.5px]">{a.time}</span></TD>
                  <TD><span className="font-semibold text-gray-800">{a.patient}</span></TD>
                  <TD><span className="font-mono text-[11.5px] text-[#64748B]">{a.mrn}</span></TD>
                  <TD>{a.type}</TD>
                  <TD><span className="text-[#64748B]">{a.provider}</span></TD>
                  <TD><span className="font-mono text-[11.5px]">{a.room}</span></TD>
                  <TD><span className="text-[#64748B]">{a.duration}</span></TD>
                  <TD><StatusBadge status={a.status} /></TD>
                  <TD>
                    <div className="flex gap-1.5">
                      <Btn variant="outline" size="xs" onClick={(e) => {
                        e.stopPropagation();
                        if (onSelect) onSelect();
                      }}>
                        Check-in OP ➔
                      </Btn>
                      <Btn variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); }}>Chart</Btn>
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
