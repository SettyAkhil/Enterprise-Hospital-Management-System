import React, { useState, useEffect } from "react";
import { StatusBadge, Btn, Card, Table, TR, TD } from "./shared";
import { Icon } from "./icons";
import { db, DBOPEncounter } from "../services/db";

const INITIAL_APPOINTMENTS = [
  { time: "08:00", patient: "Harold Thompson", age: 68, type: "Post-op Follow-up", provider: "Dr. Sanjay Kapoor", room: "Room 116", duration: "30m", status: "Completed", mrn: "100401" },
  { time: "08:30", patient: "Sandra Brown", age: 44, type: "Follow-up", provider: "Dr. Vikram Malhotra", room: "Room 111", duration: "20m", status: "Completed", mrn: "100331" },
  { time: "09:00", patient: "Sarah Connelly", age: 35, type: "Annual Physical", provider: "Dr. Ramesh Kumar", room: "Room 103", duration: "45m", status: "Completed", mrn: "100289" },
  { time: "09:30", patient: "Marcus Webb", age: 43, type: "New Patient", provider: "Dr. Arjun Mehta", room: "Room 107", duration: "60m", status: "In Progress", mrn: "100500" },
  { time: "10:00", patient: "Elena Torres", age: 57, type: "Diabetes Follow-up", provider: "Dr. Anita Desai", room: "Room 101", duration: "30m", status: "Checked In", mrn: "100198" },
  { time: "10:30", patient: "Robert Kim", age: 52, type: "Cardiac Consult", provider: "Dr. Rajesh Sharma", room: "Room 104", duration: "45m", status: "Pending", mrn: "100377" },
  { time: "11:00", patient: "Jennifer Walsh", age: 29, type: "GYN Consult", provider: "Dr. Priya Patel", room: "Room 105", duration: "30m", status: "Pending", mrn: "100511" },
  { time: "11:30", patient: "David Chu", age: 61, type: "Hypertension", provider: "Dr. Ramesh Kumar", room: "Room 103", duration: "20m", status: "Pending", mrn: "100289" },
  { time: "13:00", patient: "Helen Park", age: 72, type: "Post-discharge", provider: "Dr. Michael Chen", room: "Room 108", duration: "30m", status: "Pending", mrn: "100402" },
  { time: "13:30", patient: "Frank Torres", age: 55, type: "Lab Review", provider: "Dr. David Anderson", room: "Room 112", duration: "20m", status: "Pending", mrn: "100501" },
];

const DAYS = ["Mon\nAug 19", "Tue\nAug 20", "Wed\nAug 21", "Thu\nAug 22", "Fri\nAug 23", "Sat\nAug 24", "Sun\nAug 25"];
const SELECTED_DAY = 4;

const detectDepartmentFromSymptoms = (text: string): { dept: string, doc: string, urgency: string } | null => {
  if (!text || text.trim().length < 2) return null;
  const lower = text.toLowerCase();
  
  if (/\b(chest|heart|palpitat|breathless|cardio|angina|tachycardia|ecg|hypertens|bp\b|pressure)\b/i.test(lower)) {
    return { dept: "Cardiology", doc: "Dr. Arjun Mehta", urgency: "High - Same Day" };
  }
  if (/\b(knee|bone|fractur|joint|sprain|ortho|spine|back pain|arthritis|ligament|swollen ankle|shoulder)\b/i.test(lower)) {
    return { dept: "Orthopedics", doc: "Dr. Sanjay Kapoor", urgency: "Moderate" };
  }
  if (/\b(pregnan|prenatal|period|menstrua|gynec|pelvic|ovary|uterus|cramp|delivery)\b/i.test(lower)) {
    return { dept: "Gynecology", doc: "Dr. Sunita Rao", urgency: "Routine" };
  }
  if (/\b(fever|cold|cough|weakness|fatigue|infect|body pain|chill|viral|malaise|typhoid|malaria|diabet|headache|vomit|diarrhea|nausea|dizz)\b/i.test(lower)) {
    return { dept: "General Medicine", doc: "Dr. Vikram Malhotra", urgency: "Moderate" };
  }
  return { dept: "General Medicine", doc: "Dr. Ramesh Kumar", urgency: "Routine" };
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

    setTimeout(() => {
      const combined = `${complaint} ${symptoms}`;
      const res = detectDepartmentFromSymptoms(combined) || { dept: "General Medicine", doc: "Dr. Vikram Malhotra", urgency: "Routine" };
      if (registryType === "IP") {
         res.urgency = res.urgency === "Routine" ? "Ward Admission" : "ICU Admission";
      }
      setResult(res);
      setIsAnalyzing(false);
    }, 1000);
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
      room: registryType === "IP" ? "Ward Pending" : "Room 103",
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
              <Icon.FlaskConical /> AI-Assisted Appointment Booking
            </h2>
            <p className="text-[12px] text-[#64748B]">Triage symptoms to recommend specialist &amp; allocate consultation slot</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Patient Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Patient Name*</label>
              <input value={patient} onChange={e => setPatient(e.target.value)} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" placeholder="(555) 000-0000" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Age</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" placeholder="45" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]">
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Registry Type</label>
              <div className="flex bg-[#F0F2F5] p-0.5 rounded h-9">
                <button type="button" onClick={() => setRegistryType("OP")} className={`flex-1 text-[11px] font-bold rounded ${registryType === "OP" ? "bg-white text-[#1B4FD8] shadow-xs" : "text-[#64748B]"}`}>OP (Clinic)</button>
                <button type="button" onClick={() => setRegistryType("IP")} className={`flex-1 text-[11px] font-bold rounded ${registryType === "IP" ? "bg-[#1B4FD8] text-white shadow-xs" : "text-[#64748B]"}`}>IP (Admission)</button>
              </div>
            </div>
          </div>

          {/* Chief Complaints */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-1">Chief Complaint / Symptoms*</label>
            <textarea 
              rows={2} 
              value={complaint} 
              onChange={e => setComplaint(e.target.value)} 
              className="w-full bg-white border border-[#DDE2EC] rounded p-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" 
              placeholder="e.g. Sharp chest pain radiating to left arm, shortness of breath on exertion..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            className="w-full h-10 bg-[#EFF6FF] text-[#1B4FD8] font-semibold text-[13px] rounded border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzing ? <div className="w-4 h-4 border-2 border-[#1B4FD8] border-t-transparent rounded-full animate-spin"></div> : <Icon.TrendUp />}
            {isAnalyzing ? "Analyzing Symptoms with AI..." : "Run AI Recommendation"}
          </button>

          {result && (
            <div className="bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-[12.5px] font-bold text-gray-900 mb-3 border-b border-[#DDE2EC] pb-2">AI Clinical Recommendation</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[11px] text-[#64748B] mb-0.5">{registryType === "IP" ? "Admitting Specialty" : "Recommended Specialty"}</div>
                  <div className="text-[13px] font-semibold text-[#1B4FD8]">{result.dept}</div>
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

  // Sync with live database encounters
  useEffect(() => {
    const syncWithDb = () => {
      const dbEncs = db.getEncounters();
      if (dbEncs.length > 0) {
        const liveAppts = dbEncs.map((enc) => ({
          time: enc.registrationTime.includes(" ") ? enc.registrationTime.split(" ")[1] : "09:30",
          patient: enc.patientName,
          age: enc.age,
          type: enc.chiefComplaint || enc.dept,
          provider: enc.assignedDoctor || "Dr. Sanjay Kapoor",
          room: enc.room || "Room 116",
          duration: "30m",
          status: enc.status === "OP Completed" ? "Completed" : enc.status === "Under Consultation" ? "In Progress" : "Checked In",
          mrn: enc.umr.replace("UMR", "")
        }));

        setAppointments(prev => {
          const liveNames = new Set(liveAppts.map(a => a.patient));
          const filteredSeed = INITIAL_APPOINTMENTS.filter(a => !liveNames.has(a.patient));
          return [...liveAppts, ...filteredSeed];
        });
      }
    };

    syncWithDb();
    const unsub = db.subscribe(() => {
      syncWithDb();
    });
    return () => unsub();
  }, []);

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
          <h1 className="text-base font-semibold text-gray-900">Appointments Schedule &amp; Assigned Doctors</h1>
          <p className="text-[11.5px] text-[#64748B]">{appointments.length} active appointments in database</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[#DDE2EC] rounded overflow-hidden">
            {(["day", "week", "list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-[12px] font-medium capitalize transition-colors cursor-pointer ${view === v ? "bg-[#1B4FD8] text-white" : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"}`}>
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
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-2.5 flex items-center gap-6 text-[12.5px] flex-wrap">
        <span><span className="font-mono font-semibold text-[#16A34A]">{completed}</span> Completed</span>
        <span><span className="font-mono font-semibold text-[#0284C7]">{inProgress}</span> In Progress</span>
        <span><span className="font-mono font-semibold text-[#D97706]">{pending}</span> Scheduled / In Queue</span>
        <span className="text-[#64748B]">·</span>
        <span className="text-[#64748B]">Active Physicians: Dr. Sanjay Kapoor, Dr. Vikram Malhotra, Dr. Arjun Mehta, Dr. Ramesh Kumar, Dr. Anita Desai</span>
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
            <div className="h-32 flex items-center justify-center text-[#94A3B8] text-[12px]">
              Weekly calendar schedule
            </div>
          </div>
        )}

        {(view === "day" || view === "week") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card title={`All Booked Appointments (${appointments.length})`} actions={
                <div className="flex gap-2">
                  <Btn variant="ghost" size="xs"><Icon.Filter /> Filter</Btn>
                  <Btn variant="ghost" size="xs">Provider</Btn>
                </div>
              }>
                <div className="space-y-1">
                  {appointments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 text-center">
                          <span className="font-mono text-[12px] font-bold text-gray-900">{a.time}</span>
                        </div>
                        <div>
                          <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-2">
                            <span>{a.patient}</span>
                            <span className="text-[11px] text-[#64748B] font-normal">({a.age} yrs)</span>
                          </div>
                          <div className="text-[11.5px] text-[#64748B] mt-0.5">
                            {a.type}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-[12.5px] text-[#1B4FD8] flex items-center gap-1 justify-end">
                            <span>👨‍⚕️</span> {a.provider}
                          </div>
                          <div className="text-[11px] text-[#64748B]">{a.room}</div>
                        </div>
                        <StatusBadge status={a.status as any} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div>
              <Card title="Physician Schedule Overview">
                <div className="space-y-3">
                  {[
                    { name: "Dr. Sanjay Kapoor", specialty: "Orthopedics", room: "Room 116", count: appointments.filter(a => a.provider.includes("Kapoor")).length || 2, status: "Available" },
                    { name: "Dr. Vikram Malhotra", specialty: "General Medicine", room: "Room 111", count: appointments.filter(a => a.provider.includes("Malhotra")).length || 2, status: "Available" },
                    { name: "Dr. Arjun Mehta", specialty: "Cardiology", room: "Room 107", count: appointments.filter(a => a.provider.includes("Mehta")).length || 2, status: "Available" },
                    { name: "Dr. Ramesh Kumar", specialty: "General Medicine", room: "Room 103", count: appointments.filter(a => a.provider.includes("Ramesh")).length || 3, status: "Available" },
                    { name: "Dr. David Anderson", specialty: "Orthopedics", room: "Room 112", count: appointments.filter(a => a.provider.includes("Anderson")).length || 3, status: "Available" },
                  ].map((doc, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center text-[12px]">
                      <div>
                        <div className="font-bold text-gray-900">{doc.name}</div>
                        <div className="text-[11px] text-[#64748B]">{doc.specialty} · {doc.room}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[#1B4FD8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 block">
                          {doc.count} Appts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {view === "list" && (
          <Card title={`All Appointments List (${appointments.length})`}>
            <Table headers={["Time", "Patient", "Age", "Chief Complaint / Type", "Assigned Doctor", "Room", "Status"]}>
              {appointments.map((a, i) => (
                <TR key={i}>
                  <TD><span className="font-mono font-bold">{a.time}</span></TD>
                  <TD><span className="font-semibold text-gray-900">{a.patient}</span></TD>
                  <TD>{a.age} yrs</TD>
                  <TD>{a.type}</TD>
                  <TD><span className="font-bold text-[#1B4FD8]">👨‍⚕️ {a.provider}</span></TD>
                  <TD>{a.room}</TD>
                  <TD><StatusBadge status={a.status as any} /></TD>
                </TR>
              ))}
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
