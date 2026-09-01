import React, { useState, useEffect } from "react";
import { Icon } from "./icons";
import { Btn, Input, StatusBadge } from "./shared";
import { db, DBOPEncounter, DBPatient } from "../services/db";

interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  room: string;
}

const DOCTORS_LIST: DoctorProfile[] = [
  { id: "doc-1", name: "Dr. Arjun Mehta", specialty: "Cardiology", room: "Room 107" },
  { id: "doc-4", name: "Dr. Rajesh Sharma", specialty: "Cardiology", room: "Room 104" },
  { id: "doc-6", name: "Dr. Priya Patel", specialty: "Cardiology", room: "Room 105" },
  { id: "doc-8", name: "Dr. Sarah Jenkins", specialty: "Cardiology", room: "Room 102" },
  { id: "doc-5", name: "Dr. David Anderson", specialty: "Orthopedics", room: "Room 112" },
  { id: "doc-2", name: "Dr. Sanjay Kapoor", specialty: "Orthopedics", room: "Room 116" },
  { id: "doc-3", name: "Dr. Vikram Malhotra", specialty: "General Medicine", room: "Room 111" },
  { id: "doc-7", name: "Dr. Anita Desai", specialty: "General Medicine", room: "Room 101" },
  { id: "doc-9", name: "Dr. Ramesh Kumar", specialty: "General Medicine", room: "Room 103" },
  { id: "all", name: "All Doctors (Combined Hospital Queue)", specialty: "All Departments", room: "All Rooms" },
];

export const DUMMY_PRESCRIPTION_TEMPLATES = [
  {
    id: "cardio",
    name: "🫀 Cardiology / Angina",
    dept: "Cardiology",
    diagnosis: "Acute Coronary Syndrome Rule-Out / Stable Angina",
    icd10: "I20.9",
    assessment: "Patient evaluated for chest tightness and dyspnea. Hemodynamically stable. Resting ECG evaluated. Cardioprotective therapy initiated.",
    medications: [
      { medicine: "Aspirin 81mg", dosage: "1 tab", frequency: "OD (Once Daily)", duration: "30 days", instructions: "Take after breakfast" },
      { medicine: "Atorvastatin 40mg", dosage: "1 tab", frequency: "HS (Bedtime)", duration: "30 days", instructions: "Take at bedtime" },
      { medicine: "Metoprolol Succinate 25mg", dosage: "1 tab", frequency: "OD (Once Daily)", duration: "30 days", instructions: "Take in the morning" },
      { medicine: "Nitroglycerin 0.4mg Sublingual", dosage: "1 tab", frequency: "PRN (As Needed)", duration: "10 days", instructions: "Dissolve under tongue for acute chest pain" }
    ],
    investigations: ["ECG 12-Lead", "Serum Troponin I", "Lipid Profile", "Complete Blood Count (CBC)"],
    advice: "Avoid strenuous physical exertion. Follow strict low-sodium heart-healthy diet. Return immediately if chest discomfort radiates or intensifies."
  },
  {
    id: "ortho",
    name: "🦴 Orthopedics / Joint Strain",
    dept: "Orthopedics",
    diagnosis: "Acute Musculoskeletal Lumbar Strain & Joint Inflammation",
    icd10: "M54.5",
    assessment: "Patient presents with acute joint/lumbar discomfort following physical exertion. Range of motion limited by pain. No focal neurological deficit.",
    medications: [
      { medicine: "Aceclofenac 100mg + Paracetamol 325mg", dosage: "1 tab", frequency: "BD (Twice Daily)", duration: "5 days", instructions: "Take after meals" },
      { medicine: "Thiocolchicoside 4mg", dosage: "1 cap", frequency: "BD (Twice Daily)", duration: "5 days", instructions: "Muscle relaxant after food" },
      { medicine: "Pantoprazole 40mg", dosage: "1 tab", frequency: "OD (Once Daily)", duration: "7 days", instructions: "Take 30 min before breakfast" },
      { medicine: "Calcium Carbonate 500mg + Vit D3", dosage: "1 tab", frequency: "OD (Once Daily)", duration: "30 days", instructions: "Take after dinner" }
    ],
    investigations: ["X-Ray Spine / Joint", "Serum Uric Acid", "Complete Blood Count (CBC)"],
    advice: "Rest affected area. Hot fermentation for 15 minutes twice daily. Avoid heavy lifting and sudden twisting movements."
  },
  {
    id: "general",
    name: "🩺 General Medicine / Fever",
    dept: "General Medicine",
    diagnosis: "Acute Upper Respiratory Tract Infection with Viral Pyrexia",
    icd10: "J06.9",
    assessment: "Patient presents with fever, productive cough, and malaise. Pharynx congested. Bilateral air entry clear without adventitious sounds.",
    medications: [
      { medicine: "Paracetamol 650mg", dosage: "1 tab", frequency: "TDS (Thrice Daily)", duration: "5 days", instructions: "Take for fever > 100°F" },
      { medicine: "Azithromycin 500mg", dosage: "1 tab", frequency: "OD (Once Daily)", duration: "3 days", instructions: "Take 1 hour before food" },
      { medicine: "Levocetirizine 5mg", dosage: "1 tab", frequency: "HS (Bedtime)", duration: "5 days", instructions: "Take at night for runny nose/cough" },
      { medicine: "Vitamin C 500mg + Zinc", dosage: "1 tab", frequency: "OD (Once Daily)", duration: "15 days", instructions: "Immune support" }
    ],
    investigations: ["Complete Blood Count (CBC)", "C-Reactive Protein (CRP)", "Urine Routine & Microscopy"],
    advice: "Drink plenty of warm fluids. Steam inhalation twice daily. Adequate rest and return for review if fever does not subside in 48 hours."
  },
  {
    id: "pulmo",
    name: "🫁 Pulmonology / Asthma",
    dept: "Pulmonology",
    diagnosis: "Bronchial Asthma Flare / Acute Bronchospasm",
    icd10: "J45.9",
    assessment: "Patient experiencing episodic breathlessness, wheezing, and nocturnal dry cough. Auscultation reveals bilateral expiratory wheeze.",
    medications: [
      { medicine: "Duolin Inhaler (Levosalbutamol + Ipratropium)", dosage: "2 puffs", frequency: "TDS (Thrice Daily)", duration: "14 days", instructions: "Rinse mouth after inhalation" },
      { medicine: "Montelukast 10mg + Levocetirizine 5mg", dosage: "1 tab", frequency: "HS (Bedtime)", duration: "14 days", instructions: "Take every night" },
      { medicine: "Amoxicillin + Clavulanate 625mg", dosage: "1 tab", frequency: "BD (Twice Daily)", duration: "5 days", instructions: "Take after food" }
    ],
    investigations: ["X-Ray Chest PA View", "Spirometry / Peak Flow", "Complete Blood Count (CBC)"],
    advice: "Avoid cold exposure, dust, and pollen. Always carry rescue inhaler. Return immediately if breathlessness worsens at rest."
  }
];

export default function DoctorWorkflow({
  onNavigateToOPWorkflow
}: {
  onNavigateToOPWorkflow?: (encounterId?: string) => void;
}) {
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile>(DOCTORS_LIST[0]);
  const [encounters, setEncounters] = useState<DBOPEncounter[]>([]);
  const [patients, setPatients] = useState<DBPatient[]>([]);
  const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null);

  // Consultation Form State
  const [clinicalAssessment, setClinicalAssessment] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [icd10, setIcd10] = useState("");
  const [medications, setMedications] = useState<
    { medicine: string; dosage: string; frequency: string; duration: string; instructions?: string }[]
  >([
    { medicine: "Aspirin 81mg", dosage: "1 tab", frequency: "OD (Once Daily)", duration: "30 days", instructions: "Take after breakfast" },
    { medicine: "Atorvastatin 40mg", dosage: "1 tab", frequency: "HS (Bedtime)", duration: "30 days", instructions: "Take at bedtime" }
  ]);
  const [investigations, setInvestigations] = useState<string[]>([
    "ECG 12-Lead",
    "Complete Blood Count (CBC)",
    "Serum Electrolytes"
  ]);
  const [advice, setAdvice] = useState(
    "Avoid strenuous physical exertion. Follow low-sodium diet. Return immediately if chest discomfort recurs."
  );

  const [submittedAlert, setSubmittedAlert] = useState<{
    patientName: string;
    umr: string;
    opNumber: string;
    medCount: number;
  } | null>(null);

  const handleApplyTemplate = (templateId: string) => {
    const tmpl = DUMMY_PRESCRIPTION_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    setDiagnosis(tmpl.diagnosis);
    setIcd10(tmpl.icd10);
    setClinicalAssessment(tmpl.assessment);
    setMedications(tmpl.medications);
    setInvestigations(tmpl.investigations);
    setAdvice(tmpl.advice);
  };

  const [submitSuccess, setSubmitSuccess] = useState(false);
  const alertRef = React.useRef<HTMLDivElement>(null);

  // Sync with DB
  const refreshDb = (forceReload = false) => {
    const encs = db.getEncounters();
    const pats = db.getPatients();
    setEncounters(encs);
    setPatients(pats);

    const docQueue = selectedDoctor.id === "all"
      ? encs
      : encs.filter(e => e.assignedDoctor === selectedDoctor.name);

    if (docQueue.length > 0) {
      const match = docQueue.find(e => e.id === activeEncounterId) || docQueue[0];
      if (forceReload || !activeEncounterId) {
        setActiveEncounterId(match.id);
        loadEncounterData(match);
      }
    } else {
      setActiveEncounterId(null);
    }
  };

  useEffect(() => {
    setSubmittedAlert(null);
    setSubmitSuccess(false);
    refreshDb(true);
    const unsub = db.subscribe(() => {
      refreshDb(false);
    });
    return () => unsub();
  }, [selectedDoctor]);

  const loadEncounterData = (enc: DBOPEncounter) => {
    setClinicalAssessment(enc.assessment || `Patient presents with ${enc.chiefComplaint || enc.symptoms.join(", ") || "presenting symptoms"}. Vitals stable on evaluation.`);
    setDiagnosis(enc.diagnosis || (enc.dept === "Cardiology" ? "Stable Angina / Rule-out ACS" : "Musculoskeletal Lumbar Strain"));
    setIcd10(enc.icd10 || (enc.dept === "Cardiology" ? "I20.9" : "M54.5"));
    if (enc.prescription && enc.prescription.length > 0) {
      setMedications(enc.prescription);
    }
    if (enc.investigations && enc.investigations.length > 0) {
      setInvestigations(enc.investigations);
    }
    if (enc.advice) {
      setAdvice(enc.advice);
    }
  };

  // Filter doctor queue strictly by assigned doctor
  const doctorQueue = selectedDoctor.id === "all"
    ? encounters
    : encounters.filter(e => e.assignedDoctor === selectedDoctor.name);

  const activeEncounter = doctorQueue.find(e => e.id === activeEncounterId) || doctorQueue[0] || null;
  const activePatientRecord = activeEncounter ? patients.find(p => p.umr === activeEncounter.umr) : null;
  const previousEncounters = activeEncounter
    ? encounters.filter(e => e.umr === activeEncounter.umr && e.id !== activeEncounter.id)
    : [];

  const handleSelectPatient = (enc: DBOPEncounter) => {
    setSubmittedAlert(null);
    setSubmitSuccess(false);
    setActiveEncounterId(enc.id);
    loadEncounterData(enc);

    // If currently waiting, set to Under Consultation
    if (enc.status === "Awaiting Doctor" || enc.status === "Doctor Assigned" || enc.status === "In Queue") {
      db.updateEncounter(enc.id, { status: "Under Consultation" });
    }
  };

  const handleAddMedication = () => {
    setMedications(prev => [
      ...prev,
      { medicine: "Pantoprazole 40mg", dosage: "1 tab", frequency: "OD (Before Food)", duration: "14 days", instructions: "Before breakfast" }
    ]);
  };

  const handleRemoveMedication = (idx: number) => {
    setMedications(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleInvestigation = (test: string) => {
    setInvestigations(prev =>
      prev.includes(test) ? prev.filter(t => t !== test) : [...prev, test]
    );
  };

  // Submit Consultation Handler (Source of Truth)
  const handleSubmitConsultation = () => {
    if (!activeEncounter) {
      alert("No active patient selected from queue.");
      return;
    }
    if (!diagnosis.trim()) {
      alert("Please enter a Clinical Diagnosis before completing the consultation.");
      return;
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      db.updateEncounter(activeEncounter.id, {
        assessment: clinicalAssessment,
        diagnosis: diagnosis,
        icd10: icd10,
        prescription: medications,
        investigations: investigations,
        advice: advice,
        status: "Consultation Completed",
        timestamps: {
          ...activeEncounter.timestamps,
          consultationEnd: nowTime
        }
      });

      setSubmittedAlert({
        patientName: activeEncounter.patientName,
        umr: activeEncounter.umr,
        opNumber: activeEncounter.opNumber,
        medCount: medications.length
      });
      setSubmitSuccess(true);

      setTimeout(() => {
        alertRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err: any) {
      console.error("Failed to submit consultation:", err);
      alert(`Error saving consultation: ${err?.message || "Please try again."}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden">
      {/* ── TOP DOCTOR PORTAL HEADER ── */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1E3A8A] to-[#1B4FD8] text-white flex items-center justify-center text-lg font-bold shadow-xs">
            👨‍⚕️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">Doctor Portal &amp; Consultation Workspace</h1>
              <span className="text-[10px] font-mono font-bold bg-blue-100 text-[#1B4FD8] px-2 py-0.5 rounded border border-blue-200 uppercase">
                Clinical Authority
              </span>
            </div>
            <p className="text-[12px] text-[#64748B]">
              Primary clinical data-entry portal · All consultation records link to permanent UMR + OP Number.
            </p>
          </div>
        </div>

        {/* Doctor Switch Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-1.5 rounded-xl">
            <span className="text-[11.5px] font-semibold text-[#64748B]">Logged in as:</span>
            <select
              value={selectedDoctor.name}
              onChange={(e) => {
                const doc = DOCTORS_LIST.find(d => d.name === e.target.value);
                if (doc) {
                  setSelectedDoctor(doc);
                  const matchingEnc = doc.id === "all"
                    ? encounters[0]
                    : encounters.find(enc => enc.assignedDoctor === doc.name || enc.dept === doc.specialty);
                  if (matchingEnc) {
                    setActiveEncounterId(matchingEnc.id);
                    loadEncounterData(matchingEnc);
                  } else {
                    setActiveEncounterId(null);
                  }
                }
              }}
              className="text-[12.5px] font-bold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
            >
              {DOCTORS_LIST.map(d => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.specialty} · {d.room})
                </option>
              ))}
            </select>
          </div>

          {onNavigateToOPWorkflow && (
            <button
              type="button"
              onClick={() => onNavigateToOPWorkflow(activeEncounter?.id)}
              className="px-3.5 py-1.5 bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-[#1B4FD8] text-[12px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>📋</span> OP Journey Summary →
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 overflow-hidden p-5 flex gap-5 max-w-7xl mx-auto w-full">
        {/* ── LEFT COLUMN: DOCTOR'S LIVE QUEUE ── */}
        <div className="w-80 flex flex-col gap-4 flex-shrink-0">
          <div className="bg-white border border-[#DDE2EC] rounded-2xl shadow-xs flex flex-col h-full overflow-hidden">
            <div className="px-4 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <div>
                <h2 className="text-[13px] font-bold text-gray-900">My Consultation Queue</h2>
                <div className="text-[11px] text-[#64748B]">{selectedDoctor.specialty} · {selectedDoctor.room}</div>
              </div>
              <span className="text-[11px] font-mono font-bold bg-[#DBEAFE] text-[#1B4FD8] px-2 py-0.5 rounded">
                {doctorQueue.length} Patients
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] p-2 space-y-1.5">
              {doctorQueue.length === 0 ? (
                <div className="p-6 text-center text-gray-500 space-y-2">
                  <div className="text-3xl">☕</div>
                  <div className="text-[13px] font-bold text-gray-700">No Patients in Queue</div>
                  <div className="text-[11px] text-[#64748B]">
                    No patients currently assigned to {selectedDoctor.name}.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allDoc = DOCTORS_LIST.find(d => d.id === "all");
                      if (allDoc) setSelectedDoctor(allDoc);
                    }}
                    className="mt-2 text-[11.5px] font-semibold text-[#1B4FD8] bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    View All Hospital Patients →
                  </button>
                </div>
              ) : (
                doctorQueue.map((enc, idx) => {
                  const isSelected = activeEncounter?.id === enc.id;
                  const isCompleted = enc.status === "Consultation Completed" || enc.status === "OP Completed";
                  return (
                    <div
                      key={enc.id}
                      onClick={() => handleSelectPatient(enc)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-[#EFF6FF] border-[#1B4FD8] ring-2 ring-blue-500/20 shadow-xs"
                          : "bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-mono text-[11px] font-bold text-[#1B4FD8] bg-blue-50 px-1.5 py-0.5 rounded">
                          #{idx + 1} · {enc.queueToken || enc.opNumber}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isCompleted
                            ? "bg-green-100 text-[#15803D]"
                            : enc.status === "Under Consultation"
                            ? "bg-blue-100 text-[#1D4ED8] animate-pulse"
                            : "bg-amber-100 text-[#B45309]"
                        }`}>
                          {isCompleted ? "Completed" : enc.status === "Under Consultation" ? "In Consult" : "Waiting"}
                        </span>
                      </div>
                      <div className="font-bold text-[13px] text-gray-900">{enc.patientName}</div>
                      <div className="text-[11.5px] text-[#64748B]">
                        {enc.age} yrs · {enc.sex} · UMR: {enc.umr}
                      </div>
                      {enc.assignedDoctor && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                          <span>👨‍⚕️</span> {enc.assignedDoctor} ({enc.dept})
                        </div>
                      )}
                      <div className="text-[11px] text-gray-600 truncate mt-1 bg-white/80 p-1 rounded border border-gray-200">
                        {enc.chiefComplaint || enc.symptoms.join(", ") || "OP Consultation"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: PRIMARY CLINICAL CONSULTATION FORM ── */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
          {activeEncounter ? (
            <div className="space-y-4">
              {/* Submission Success Alert */}
              {submittedAlert && (
                <div ref={alertRef} className="bg-[#F0FDF4] border-2 border-[#86EFAC] rounded-2xl p-4.5 text-center space-y-2 shadow-sm animate-in fade-in">
                  <div className="text-xl">✓</div>
                  <div className="text-[15px] font-bold text-[#166534]">
                    Consultation Submitted Successfully!
                  </div>
                  <p className="text-[12px] text-[#15803D]">
                    Consultation recorded and linked to permanent <strong>{submittedAlert.umr}</strong> with visit encounter <strong>{submittedAlert.opNumber}</strong>. Summary is now ready in the OP Clinical Journey.
                  </p>
                  {onNavigateToOPWorkflow && (
                    <button
                      type="button"
                      onClick={() => onNavigateToOPWorkflow(activeEncounter.id)}
                      className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-[12px] font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer mt-1"
                    >
                      <span>📋</span> View Summary in OP Clinical Journey →
                    </button>
                  )}
                </div>
              )}

              {/* 1. Patient Information & Current Complaints Card */}
              <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-blue-100 text-[#1B4FD8] flex items-center justify-center font-bold text-base">
                      {activeEncounter.patientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-[16px] text-gray-900 flex items-center gap-2">
                        <span>{activeEncounter.patientName}</span>
                        <span className="text-[12px] text-[#64748B] font-normal">({activeEncounter.age} yrs, {activeEncounter.sex})</span>
                      </div>
                      <div className="text-[12px] text-[#64748B] flex items-center gap-2 mt-0.5">
                        <span>Permanent UMR: <strong className="text-gray-900 font-mono">{activeEncounter.umr}</strong></span>
                        <span>•</span>
                        <span>Visit OP No: <strong className="text-[#1B4FD8] font-mono">{activeEncounter.opNumber}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] font-mono font-bold bg-blue-50 text-[#1B4FD8] border border-blue-200 px-2.5 py-1 rounded-lg">
                      Token: {activeEncounter.queueToken || activeEncounter.opNumber}
                    </span>
                    <span className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-lg ${
                      activeEncounter.status === "Consultation Completed"
                        ? "bg-green-100 text-[#15803D]"
                        : "bg-amber-100 text-[#B45309]"
                    }`}>
                      {activeEncounter.status}
                    </span>
                  </div>
                </div>

                {/* Chief Complaints & Presenting Symptoms */}
                <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0] text-[12.5px] space-y-1">
                  <div className="text-[11px] uppercase font-bold text-[#64748B] tracking-wider">Chief Complaint / Triage Narrative</div>
                  <div className="text-gray-800 font-medium">{activeEncounter.chiefComplaint || "Routine consultation requested."}</div>
                  {activeEncounter.symptoms && activeEncounter.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeEncounter.symptoms.map(s => (
                        <span key={s} className="text-[11px] bg-blue-50 text-[#1B4FD8] px-2 py-0.5 rounded font-medium border border-blue-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Previous Patient History (Read-Only Preview from permanent UMR) */}
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4.5 space-y-2.5 shadow-2xs">
                <div className="flex justify-between items-center">
                  <div className="text-[12.5px] font-bold text-gray-900 flex items-center gap-1.5">
                    <span>📜</span> Previous OP History (Permanent UMR: {activeEncounter.umr})
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#1B4FD8]">
                    {previousEncounters.length} Previous Encounters
                  </span>
                </div>

                {previousEncounters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
                    {previousEncounters.map((pe) => (
                      <div key={pe.id} className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-2xs">
                        <div className="flex justify-between items-start font-bold">
                          <span className="text-[#1B4FD8] font-mono">{pe.opNumber}</span>
                          <span className="text-gray-500 font-normal text-[11px]">{pe.registrationTime}</span>
                        </div>
                        <div className="text-gray-800 font-medium mt-1 truncate">
                          Diagnosis: {pe.diagnosis || "General Evaluation"}
                        </div>
                        <div className="text-[11px] text-[#64748B]">Attending: {pe.assignedDoctor || "Physician"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11.5px] text-[#64748B] italic bg-white p-2.5 rounded-xl border border-[#E2E8F0]">
                    First outpatient visit for this permanent UMR. No previous historical encounters.
                  </div>
                )}
              </div>

              {/* 2. Nurse-Recorded Vital Signs (Pre-Consultation Assessment) */}
              <div className="bg-white border-2 border-[#93C5FD] rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#1B4FD8] flex items-center justify-center font-bold text-lg">
                      🩺
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-bold text-gray-900 flex items-center gap-2">
                        Pre-Consultation Nurse Vital Signs
                      </h3>
                      <p className="text-[11.5px] text-[#64748B]">
                        Verified physiological vitals recorded by nursing triage prior to physician examination.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold bg-green-50 text-[#166534] border border-green-200 px-2.5 py-1 rounded-lg flex items-center gap-1 self-start sm:self-auto">
                    <span>✓</span> Verified by Nursing Triage
                  </span>
                </div>

                {/* Vitals Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[12px]">
                  <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-xl">
                    <span className="text-[#64748B] block text-[10.5px] uppercase font-bold">Blood Pressure</span>
                    <span className="text-[16px] font-mono font-bold text-gray-900 block mt-0.5">
                      {activeEncounter.vitals?.bp || "120/80 mmHg"}
                    </span>
                    <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded inline-block mt-1">
                      Recorded BP
                    </span>
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-xl">
                    <span className="text-[#64748B] block text-[10.5px] uppercase font-bold">Heart Rate / Pulse</span>
                    <span className="text-[16px] font-mono font-bold text-gray-900 block mt-0.5">
                      {activeEncounter.vitals?.pulse || "76 bpm"}
                    </span>
                    <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded inline-block mt-1">
                      Pulse Rate
                    </span>
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-xl">
                    <span className="text-[#64748B] block text-[10.5px] uppercase font-bold">Temperature</span>
                    <span className="text-[16px] font-mono font-bold text-gray-900 block mt-0.5">
                      {activeEncounter.vitals?.temp || "98.6 °F"}
                    </span>
                    <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded inline-block mt-1">
                      Body Temp
                    </span>
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-xl">
                    <span className="text-[#64748B] block text-[10.5px] uppercase font-bold">Oxygen SpO2</span>
                    <span className="text-[16px] font-mono font-bold text-gray-900 block mt-0.5">
                      {activeEncounter.vitals?.spo2 || "99%"}
                    </span>
                    <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded inline-block mt-1">
                      Room Air
                    </span>
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-xl">
                    <span className="text-[#64748B] block text-[10.5px] uppercase font-bold">Body Weight</span>
                    <span className="text-[16px] font-mono font-bold text-gray-900 block mt-0.5">
                      {activeEncounter.vitals?.weight || "74 kg"}
                    </span>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-1">
                      Triage Weight
                    </span>
                  </div>
                </div>

                {/* Nurse Triage Observation Notes */}
                {activeEncounter.vitals?.notes && (
                  <div className="bg-[#F0FDF4] border border-green-200 p-3 rounded-xl text-[12px] text-[#166534] flex items-center gap-2">
                    <span className="font-bold">👩‍⚕️ Nurse Assessment Note:</span>
                    <span>{activeEncounter.vitals.notes}</span>
                  </div>
                )}
              </div>

              {/* 3. Clinical Consultation Form Pad */}
              <div className="bg-white border-2 border-[#93C5FD] rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                      <span>🩺</span> Clinical Examination &amp; Consultation
                    </h3>
                    <p className="text-[12px] text-[#64748B]">Enter diagnosis, prescribed medications, diagnostic orders, and advice.</p>
                  </div>
                  <span className="text-[10.5px] font-mono font-bold bg-blue-100 text-[#1B4FD8] px-2.5 py-1 rounded border border-blue-200 uppercase self-start sm:self-auto">
                    Live Rx Pad
                  </span>
                </div>

                {/* 1-Click Dummy / Clinical Presets */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-[11.5px] font-bold text-[#1E3A8A] flex items-center gap-1.5">
                      <span>⚡</span> Quick Load Prescription &amp; Clinical Order Template:
                    </span>
                    <span className="text-[10px] text-[#64748B] font-medium">1-Click to pre-fill dummy Rx &amp; Diagnosis</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {DUMMY_PRESCRIPTION_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl.id)}
                        className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-[#93C5FD] hover:border-[#1B4FD8] text-[#1B4FD8] text-[11.5px] font-bold rounded-lg shadow-2xs transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1"
                      >
                        {tmpl.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clinical Assessment */}
                <div>
                  <label className="text-[12px] font-bold text-gray-800 block mb-1">
                    Clinical Assessment Notes
                  </label>
                  <textarea
                    rows={2}
                    value={clinicalAssessment}
                    onChange={e => setClinicalAssessment(e.target.value)}
                    placeholder="Enter objective assessment, examination findings, and clinical reasoning..."
                    className="w-full border border-[#CBD5E1] rounded-xl p-3 text-[13px] text-gray-900 focus:outline-none focus:border-[#1B4FD8] bg-white font-medium"
                  />
                </div>

                {/* Diagnosis & ICD-10 Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] font-bold text-gray-800 block mb-1">
                      Clinical Diagnosis <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={diagnosis}
                      onChange={setDiagnosis}
                      placeholder="e.g. Stable Angina / Acute Coronary Syndrome Rule-Out"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-gray-800 block mb-1">
                      ICD-10 Code
                    </label>
                    <Input
                      value={icd10}
                      onChange={setIcd10}
                      placeholder="e.g. I20.9"
                    />
                  </div>
                </div>

                {/* Prescribed Medications Pad */}
                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[12px] font-bold text-gray-800">
                      Prescribed Medications (Rx Pad)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddMedication}
                      className="text-[12px] font-semibold text-[#1B4FD8] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      + Add Medication
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {medications.map((med, idx) => (
                      <div key={idx} className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-center text-[12px]">
                        <div className="sm:col-span-2">
                          <span className="text-[10px] uppercase font-bold text-[#64748B] block">Medicine Name</span>
                          <input
                            value={med.medicine}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMedications(prev => prev.map((m, i) => i === idx ? { ...m, medicine: val } : m));
                            }}
                            placeholder="Medicine Name (e.g. Aspirin 81mg)"
                            className="w-full bg-white border border-[#DDE2EC] rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold focus:outline-none focus:border-[#1B4FD8]"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#64748B] block">Dosage</span>
                          <input
                            value={med.dosage}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMedications(prev => prev.map((m, i) => i === idx ? { ...m, dosage: val } : m));
                            }}
                            placeholder="1 tab"
                            className="w-full bg-white border border-[#DDE2EC] rounded-lg px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:border-[#1B4FD8]"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#64748B] block">Frequency</span>
                          <select
                            value={med.frequency}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMedications(prev => prev.map((m, i) => i === idx ? { ...m, frequency: val } : m));
                            }}
                            className="w-full bg-white border border-[#DDE2EC] rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-[#1B4FD8]"
                          >
                            <option>OD (Once Daily)</option>
                            <option>BD (Twice Daily)</option>
                            <option>TDS (Thrice Daily)</option>
                            <option>QID (Four Times Daily)</option>
                            <option>HS (Bedtime)</option>
                            <option>PRN (As Needed)</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <span className="text-[10px] uppercase font-bold text-[#64748B] block">Duration</span>
                            <input
                              value={med.duration}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMedications(prev => prev.map((m, i) => i === idx ? { ...m, duration: val } : m));
                              }}
                              placeholder="30 days"
                              className="w-full bg-white border border-[#DDE2EC] rounded-lg px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:border-[#1B4FD8]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(idx)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded text-sm mt-3.5 cursor-pointer"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Investigations / Diagnostic Orders */}
                <div className="space-y-2 pt-1">
                  <label className="text-[12px] font-bold text-gray-800 block">
                    Diagnostic Investigations &amp; Lab Orders
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "ECG 12-Lead",
                      "Complete Blood Count (CBC)",
                      "Serum Electrolytes",
                      "X-Ray Chest PA",
                      "MRI Spine / Joint",
                      "Lipid Profile",
                      "Ultrasound Abdomen",
                      "Blood Sugar Fasting"
                    ].map((test) => {
                      const isChecked = investigations.includes(test);
                      return (
                        <button
                          key={test}
                          type="button"
                          onClick={() => toggleInvestigation(test)}
                          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-[#1B4FD8] text-white border-[#1B4FD8] shadow-xs"
                              : "bg-white text-gray-700 border-[#CBD5E1] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          {isChecked ? "✓ " : "+ "} {test}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Doctor Advice & Instructions */}
                <div>
                  <label className="text-[12px] font-bold text-gray-800 block mb-1">
                    Doctor Advice &amp; Lifestyle Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={advice}
                    onChange={e => setAdvice(e.target.value)}
                    placeholder="Enter lifestyle recommendations, follow-up timeline, precaution warnings..."
                    className="w-full border border-[#CBD5E1] rounded-xl p-3 text-[13px] text-gray-900 focus:outline-none focus:border-[#1B4FD8] bg-white font-medium"
                  />
                </div>

                {/* Submit Action Button */}
                <div className="pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[11.5px] text-[#64748B]">
                    Saving links this consultation to <strong>{activeEncounter.umr}</strong> + <strong>{activeEncounter.opNumber}</strong>.
                  </div>

                  <div className="flex items-center gap-2.5">
                    {submitSuccess && (
                      <span className="text-[12px] font-bold text-[#166534] bg-green-100 border border-green-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-in fade-in">
                        <span>✓</span> Consultation Saved &amp; Synced!
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleSubmitConsultation}
                      className="px-7 py-3 bg-gradient-to-r from-[#16A34A] to-[#15803D] hover:from-[#15803D] hover:to-[#166534] text-white text-[13.5px] font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>✓</span> Complete &amp; Submit Consultation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white border border-[#DDE2EC] rounded-2xl p-8 text-center text-[#64748B]">
              <div>
                <span className="text-3xl block mb-2">👨‍⚕️</span>
                <span className="text-[14px] font-semibold">Select a patient from your queue to begin consultation</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
