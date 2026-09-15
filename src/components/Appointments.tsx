import React, { useState, useEffect } from "react";
import { StatusBadge, Btn, Card, Table, TR, TD } from "./shared";
import { Icon } from "./icons";
import { db, DBOPEncounter } from "../services/db";
import { 
  getDoctorMaster, 
  pickDoctorForSpecialty, 
  availabilityOf, 
  getDoctorByName, 
  doctorsForSpecialty,
  MasterDoctor 
} from "../services/doctorMaster";

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

const SYMPTOM_RULES: { pattern: RegExp; specialty: string; urgency: string }[] = [
  { pattern: /\b(chest|heart|palpitat|breathless|cardio|angina|tachycardia|ecg|hypertens|bp\b|pressure)\b/i, specialty: "Cardiology", urgency: "High - Same Day" },
  { pattern: /\b(knee|bone|fractur|joint|sprain|ortho|spine|back pain|arthritis|ligament|swollen ankle|shoulder)\b/i, specialty: "Orthopedics", urgency: "Moderate" },
  { pattern: /\b(pregnan|prenatal|period|menstrua|gynec|pelvic|ovary|uterus|delivery|obstetric)\b/i, specialty: "Gynecology", urgency: "Routine" },
  { pattern: /\b(child|infant|baby|paediatric|pediatric|toddler|newborn|immunis|immuniz|vaccin)\b/i, specialty: "Pediatrics", urgency: "Moderate" },
  { pattern: /\b(ear|nose|throat|sinus|tonsil|hearing|deaf|vertigo|snor|hoarse)\b/i, specialty: "ENT", urgency: "Routine" },
  { pattern: /\b(diabet|sugar|insulin|thyroid|hba1c|glycem)\b/i, specialty: "Diabetology", urgency: "Moderate" },
  { pattern: /\b(tumor|tumour|cancer|oncolog|lump|biopsy|malignan)\b/i, specialty: "Surgical Oncology", urgency: "High - Same Day" },
  { pattern: /\b(hernia|appendic|gallbladder|piles|fistula|abscess|surgical)\b/i, specialty: "General Surgery", urgency: "Moderate" },
  { pattern: /\b(scan|x-ray|xray|mri|ct\b|ultrasound|imaging|radiolog)\b/i, specialty: "Radiology", urgency: "Routine" },
  { pattern: /\b(fever|cold|cough|weakness|fatigue|infect|body pain|chill|viral|malaise|typhoid|malaria|headache|vomit|diarrhea|nausea|dizz)\b/i, specialty: "General Medicine", urgency: "Moderate" },
];

const detectDepartmentFromSymptoms = (
  text: string,
  load: (doctorName: string) => number,
): { dept: string; doc: string; urgency: string; onRequest: boolean; note?: string } | null => {
  if (!text || text.trim().length < 2) return null;

  const matched = SYMPTOM_RULES.find(r => r.pattern.test(text));
  const specialty = matched?.specialty || "General Medicine";
  const urgency = matched?.urgency || "Routine";

  const direct = pickDoctorForSpecialty(specialty, load);
  if (direct) {
    return {
      dept: specialty,
      doc: direct.name,
      urgency,
      onRequest: availabilityOf(direct).onRequest,
    };
  }

  const fallback = pickDoctorForSpecialty("General Medicine", load);
  if (!fallback) return null;
  return {
    dept: "General Medicine",
    doc: fallback.name,
    urgency,
    onRequest: availabilityOf(fallback).onRequest,
    note: `No bookable ${specialty} consultant on the current doctor master -- routed to General Medicine.`,
  };
};

function AppointmentBookingModal({
  initialEncounter,
  onClose,
  onSchedule,
  onGoToBilling
}: {
  initialEncounter?: DBOPEncounter | null;
  onClose: () => void;
  onSchedule: (appt: any) => void;
  onGoToBilling?: () => void;
}) {
  const [bookingMode, setBookingMode] = useState<"direct" | "ai">("direct");
  const [registryType, setRegistryType] = useState<"OP" | "IP">("OP");
  const [patient, setPatient] = useState(initialEncounter?.patientName || "");
  const [age, setAge] = useState(initialEncounter?.age ? String(initialEncounter.age) : "");
  const [gender, setGender] = useState(initialEncounter?.sex || "Male");
  const [phone, setPhone] = useState(initialEncounter?.phone || "");
  const [complaint, setComplaint] = useState(initialEncounter?.chiefComplaint || "");
  const [symptoms, setSymptoms] = useState("");
  const [symptomDuration, setSymptomDuration] = useState("");
  const [symptomSeverity, setSymptomSeverity] = useState("moderate");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Direct Doctor & Specialty Selection
  const allDoctors = getDoctorMaster().filter(d => d.verified);
  const allSpecialties = Array.from(new Set(allDoctors.map(d => d.specialty).filter(Boolean))) as string[];
  
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(
    initialEncounter?.dept && allSpecialties.includes(initialEncounter.dept)
      ? initialEncounter.dept
      : allSpecialties[0] || "General Medicine"
  );
  const [selectedDoctorName, setSelectedDoctorName] = useState<string>("");

  const doctorsForSelectedDept = doctorsForSpecialty(selectedSpecialty);

  useEffect(() => {
    if (doctorsForSelectedDept.length > 0) {
      const match = doctorsForSelectedDept.find(d => d.name === initialEncounter?.assignedDoctor) || doctorsForSelectedDept[0];
      setSelectedDoctorName(match.name);
    } else {
      setSelectedDoctorName("");
    }
  }, [selectedSpecialty]);

  const [result, setResult] = useState<{ dept: string; doc: string; urgency: string; onRequest?: boolean; note?: string } | null>(null);

  // Auto-set result in direct mode
  useEffect(() => {
    if (bookingMode === "direct" && selectedSpecialty && selectedDoctorName) {
      const docObj = getDoctorByName(selectedDoctorName);
      setResult({
        dept: selectedSpecialty,
        doc: selectedDoctorName,
        urgency: "Routine",
        onRequest: docObj ? availabilityOf(docObj).onRequest : false,
      });
    }
  }, [bookingMode, selectedSpecialty, selectedDoctorName]);

  const handleAnalyzeAI = () => {
    if (!symptoms && !complaint) return;
    setIsAnalyzing(true);
    setResult(null);

    setTimeout(() => {
      const combined = `${complaint} ${symptoms}`;
      const open = db.getEncounters().filter(
        e => e.status !== "OP Completed" && e.status !== "Consultation Completed"
      );
      const load = (doctorName: string) => open.filter(e => e.assignedDoctor === doctorName).length;

      const res = detectDepartmentFromSymptoms(combined, load);
      if (!res) {
        setIsAnalyzing(false);
        return;
      }
      if (registryType === "IP") {
         res.urgency = res.urgency === "Routine" ? "Ward Admission" : "ICU Admission";
      }
      setResult(res);
      setIsAnalyzing(false);
    }, 800);
  };

  const handleSchedule = () => {
    if (!result || !patient) return;
    
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    onSchedule({
      encounterId: initialEncounter?.id,
      time,
      patient,
      age: parseInt(age) || 30,
      sex: gender,
      phone,
      complaint: complaint || symptoms || "OP Evaluation",
      dept: result.dept,
      doctor: result.doc,
      registryType,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DDE2EC] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>📅</span> Doctor Appointment &amp; Consultation Booking
            </h2>
            <p className="text-[12px] text-[#64748B]">
              {initialEncounter ? `Booking appointment for registered patient: ${initialEncounter.patientName} (${initialEncounter.umr})` : "Book doctor appointment directly or use AI symptom triage"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
        </div>

        {/* Mode Switcher Banner */}
        <div className="bg-[#EFF6FF] border-b border-blue-200 px-6 py-2.5 flex items-center justify-between gap-4">
          <span className="text-[12px] font-semibold text-[#1B4FD8]">Booking Mode:</span>
          <div className="flex bg-white p-1 rounded border border-blue-200 gap-1">
            <button
              type="button"
              onClick={() => setBookingMode("direct")}
              className={`px-3 py-1 text-[12px] font-bold rounded transition-colors cursor-pointer ${
                bookingMode === "direct" ? "bg-[#1B4FD8] text-white shadow-2xs" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              👨‍⚕️ Direct Doctor Roster
            </button>
            <button
              type="button"
              onClick={() => setBookingMode("ai")}
              className={`px-3 py-1 text-[12px] font-bold rounded transition-colors cursor-pointer ${
                bookingMode === "ai" ? "bg-[#1B4FD8] text-white shadow-2xs" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              ✨ AI Symptom Triage
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Patient Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Patient Full Name*</label>
              <input 
                value={patient} 
                onChange={e => setPatient(e.target.value)} 
                className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" 
                placeholder="e.g. Suresh Bapatla" 
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]"
                placeholder="e.g. 9876543210"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Age</label>
              <input 
                type="number" 
                value={age} 
                onChange={e => setAge(e.target.value)} 
                className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" 
                placeholder="27" 
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value as "Male" | "Female" | "Other")} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]">
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Registry Type</label>
              <div className="flex bg-[#F0F2F5] p-0.5 rounded h-9">
                <button type="button" onClick={() => setRegistryType("OP")} className={`flex-1 text-[11px] font-bold rounded ${registryType === "OP" ? "bg-white text-[#1B4FD8] shadow-xs" : "text-[#64748B]"}`}>OP Clinic</button>
                <button type="button" onClick={() => setRegistryType("IP")} className={`flex-1 text-[11px] font-bold rounded ${registryType === "IP" ? "bg-[#1B4FD8] text-white shadow-xs" : "text-[#64748B]"}`}>IP Admission</button>
              </div>
            </div>
          </div>

          {/* MODE 1: DIRECT DOCTOR SELECTION */}
          {bookingMode === "direct" && (
            <div className="bg-[#F8FAFC] border border-[#DDE2EC] p-4 rounded space-y-4">
              <h3 className="text-[13px] font-bold text-gray-900 border-b border-[#DDE2EC] pb-2 flex items-center justify-between">
                <span>👨‍⚕️ Select Medical Specialty &amp; Attending Doctor</span>
                <span className="text-[11px] text-[#64748B] font-normal">{allDoctors.length} doctors available on roster</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1">Specialty / Department*</label>
                  <select
                    value={selectedSpecialty}
                    onChange={e => setSelectedSpecialty(e.target.value)}
                    className="w-full h-10 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                  >
                    {allSpecialties.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1">Attending Doctor*</label>
                  <select
                    value={selectedDoctorName}
                    onChange={e => setSelectedDoctorName(e.target.value)}
                    className="w-full h-10 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                  >
                    {doctorsForSelectedDept.map(doc => (
                      <option key={doc.id} value={doc.name}>
                        {doc.name} ({doc.qualification}) — {doc.room} [{doc.section}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Doctor Summary Pill */}
              {selectedDoctorName && (
                <div className="bg-white p-3 border border-blue-200 rounded flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-gray-900">{selectedDoctorName}</div>
                    <div className="text-[11.5px] text-[#64748B]">
                      {getDoctorByName(selectedDoctorName)?.qualification} • {getDoctorByName(selectedDoctorName)?.room} ({getDoctorByName(selectedDoctorName)?.section} Consultant)
                    </div>
                  </div>
                  <span className="bg-[#DCFCE7] text-[#15803D] text-[11px] font-bold px-2.5 py-1 rounded border border-emerald-200">
                    Available for Booking
                  </span>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: AI SYMPTOM TRIAGE */}
          {bookingMode === "ai" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1">Chief Complaint / Symptoms Narrative*</label>
                <textarea 
                  rows={2} 
                  value={complaint} 
                  onChange={e => setComplaint(e.target.value)} 
                  className="w-full bg-white border border-[#DDE2EC] rounded p-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" 
                  placeholder="e.g. Sharp chest pain, difficulty breathing, sweating since yesterday..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1">Symptom Duration</label>
                  <input value={symptomDuration} onChange={e => setSymptomDuration(e.target.value)} className="w-full h-9 bg-white border border-[#DDE2EC] rounded px-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" placeholder="e.g. 2 days" />
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
                onClick={handleAnalyzeAI}
                disabled={isAnalyzing || (!symptoms && !complaint)}
                className="w-full h-10 bg-[#EFF6FF] text-[#1B4FD8] font-semibold text-[13px] rounded border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isAnalyzing ? <div className="w-4 h-4 border-2 border-[#1B4FD8] border-t-transparent rounded-full animate-spin"></div> : <span>✨</span>}
                {isAnalyzing ? "Analyzing Symptoms with AI..." : "Run AI Specialty Recommendation"}
              </button>
            </div>
          )}

          {result && (
            <div className="bg-[#F8FAFC] border border-[#DDE2EC] rounded p-4">
              <h3 className="text-[12.5px] font-bold text-gray-900 mb-2 border-b border-[#DDE2EC] pb-1.5 flex items-center justify-between">
                <span>Appointment Allocation Confirmation</span>
                <span className="text-[11px] font-mono text-[#1B4FD8]">{result.dept}</span>
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[11px] text-[#64748B] mb-0.5">Assigned Specialty</div>
                  <div className="text-[13px] font-semibold text-[#1B4FD8]">{result.dept}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B] mb-0.5">Assigned Physician</div>
                  <div className="text-[13px] font-semibold text-gray-900">{result.doc}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B] mb-0.5">Consultation Priority</div>
                  <div className="text-[12px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block border border-emerald-200">
                    {result.urgency}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#DDE2EC] bg-[#F8FAFC] flex items-center justify-between">
          <div>
            {onGoToBilling && (
              <button
                type="button"
                onClick={onGoToBilling}
                className="text-[12px] font-semibold text-[#1B4FD8] hover:underline cursor-pointer"
              >
                Proceed directly to Billing →
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" disabled={!result || !patient} onClick={handleSchedule}>
              Confirm Appointment Booking
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Appointments({
  initialEncounterId,
  onSelect,
  onGoToBilling
}: {
  initialEncounterId?: string | null;
  onSelect?: () => void;
  onGoToBilling?: () => void;
}) {
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [view, setView] = useState<"day" | "week" | "list">("day");
  const [activeDay, setActiveDay] = useState(SELECTED_DAY);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetEncounter, setTargetEncounter] = useState<DBOPEncounter | null>(null);

  // If initialEncounterId is passed, look it up and open modal automatically
  useEffect(() => {
    if (initialEncounterId) {
      const enc = db.getEncounterById(initialEncounterId);
      if (enc) {
        setTargetEncounter(enc);
        setIsModalOpen(true);
      }
    }
  }, [initialEncounterId]);

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
          provider: enc.assignedDoctor || "Unassigned",
          room: enc.room || "Room 103",
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
    return () => {
      unsub();
    };
  }, []);

  const completed = appointments.filter(a => a.status === "Completed").length;
  const inProgress = appointments.filter(a => a.status === "In Progress").length;
  const pending = appointments.filter(a => a.status === "Pending" || a.status === "Checked In").length;

  const handleAddAppointment = (booking: {
    encounterId?: string;
    time: string; 
    patient: string; 
    age: number; 
    sex: string; 
    phone: string;
    complaint: string; 
    dept: string; 
    doctor: string; 
    registryType: "OP" | "IP";
  }) => {
    const sex = booking.sex === "Female" ? "Female" : booking.sex === "Other" ? "Other" : "Male";
    const doctorRoom = getDoctorByName(booking.doctor)?.room;

    if (booking.encounterId) {
      const existing = db.getEncounterById(booking.encounterId);
      db.updateEncounter(booking.encounterId, {
        dept: booking.dept,
        assignedDoctor: booking.doctor,
        room: booking.registryType === "IP" ? "Ward Pending" : doctorRoom || "Room 103",
        queueToken: `${booking.dept.charAt(0).toUpperCase()}-OP${Math.floor(10 + Math.random() * 90)}`,
        status: "Doctor Assigned",
        chiefComplaint: booking.complaint,
        timestamps: { ...(existing?.timestamps || { arrival: new Date().toLocaleTimeString() }), doctorAssigned: booking.time },
      });
    } else {
      // Register new patient and encounter
      const parts = booking.patient.trim().split(" ");
      const { encounter } = db.registerNewPatient({
        firstName: parts[0],
        lastName: parts.slice(1).join(" ") || "Patient",
        age: booking.age,
        sex,
        phone: booking.phone,
        dept: booking.dept,
        chiefComplaint: booking.complaint,
      });

      db.updateEncounter(encounter.id, {
        dept: booking.dept,
        assignedDoctor: booking.doctor,
        room: booking.registryType === "IP" ? "Ward Pending" : doctorRoom || "Room 103",
        queueToken: `${booking.dept.charAt(0).toUpperCase()}-${encounter.opNumber}`,
        status: "Doctor Assigned",
        timestamps: { ...encounter.timestamps, doctorAssigned: booking.time },
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5] relative">
      {isModalOpen && (
        <AppointmentBookingModal 
          initialEncounter={targetEncounter}
          onClose={() => {
            setIsModalOpen(false);
            setTargetEncounter(null);
          }} 
          onSchedule={handleAddAppointment}
          onGoToBilling={onGoToBilling}
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
          <Btn variant="primary" size="sm" onClick={() => {
            setTargetEncounter(null);
            setIsModalOpen(true);
          }}>
            <Icon.Plus /> Book New Appointment
          </Btn>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-2.5 flex items-center gap-6 text-[12.5px] flex-wrap">
        <span><span className="font-mono font-semibold text-[#16A34A]">{completed}</span> Completed</span>
        <span><span className="font-mono font-semibold text-[#0284C7]">{inProgress}</span> In Progress</span>
        <span><span className="font-mono font-semibold text-[#D97706]">{pending}</span> Scheduled / In Queue</span>
        <span className="text-[#64748B]">·</span>
        <span className="text-[#64748B]">Doctor Master Onboarded: {getDoctorMaster().length} Active Consultants</span>
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
                            {a.type} • <strong className="text-[#0F172A]">{a.provider}</strong> ({a.room})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          a.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          a.status === "In Progress" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {a.status}
                        </span>

                        {onSelect && (
                          <button
                            onClick={onSelect}
                            className="text-[11.5px] text-[#1B4FD8] font-semibold hover:underline cursor-pointer"
                          >
                            View Chart →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Doctor Roster Quick Summary */}
            <div className="space-y-4">
              <Card title="Active Doctor Master Roster">
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {getDoctorMaster().filter(d => d.verified).map(doc => (
                    <div key={doc.id} className="p-2.5 border border-[#E2E8F0] rounded bg-white text-[12px]">
                      <div className="font-bold text-[#0F172A] flex items-center justify-between">
                        <span>{doc.name}</span>
                        <span className="text-[10px] font-mono text-[#1B4FD8]">{doc.room}</span>
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        {doc.specialty} • {doc.qualification}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
