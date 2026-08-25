import React, { useState, useEffect } from "react";
import { Icon } from "./icons";
import { StatusBadge, Btn, Input } from "./shared";
import { db, DBPatient, DBOPEncounter } from "../services/db";

export interface OPPatient {
  id?: string;
  umr: string;
  opNumber: string;
  name: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  phone: string;
  address: string;
  isNew: boolean;
  previousVisits?: { opNumber: string; date: string; doctor: string; diagnosis: string }[];
  symptoms: string[];
  chiefComplaint: string;
  aiSpecialty: string;
  aiDoctor: string;
  aiConfidence: number;
  doctorGenderPref: "Any" | "Male" | "Female";
  assignedDoctor: string;
  doctorStatus: "Available" | "Busy" | "Inactive" | "Absent";
  queueToken: string;
  queuePosition: number;
  room: string;
  diagnosis: string;
  icd10: string;
  prescription: { medicine: string; dosage: string; frequency: string; duration: string }[];
  investigations: string[];
  advice: string;
  vitals: { bp: string; pulse: string; temp: string; spo2: string; weight: string; notes: string };
  billing: { consultationFee: number; labFee: number; total: number; status: "Paid" | "Pending"; mode: string };
  furtherAction: "None" | "Laboratory" | "Pharmacy" | "Radiology" | "Admission" | "Referral";
  status:
    | "Registered"
    | "Symptoms Captured"
    | "AI Recommended"
    | "Awaiting Doctor"
    | "Doctor Assigned"
    | "In Queue"
    | "Under Consultation"
    | "Consultation Completed"
    | "Post-Consultation"
    | "Awaiting Billing"
    | "Billing Completed"
    | "Awaiting Investigation"
    | "OP Completed";
  timestamps: {
    arrival: string;
    registration?: string;
    symptoms?: string;
    doctorAssigned?: string;
    consultationStart?: string;
    consultationEnd?: string;
    vitalsRecorded?: string;
    billingCompleted?: string;
    visitCompleted?: string;
  };
}

const INITIAL_DOCTORS = [
  { id: "D1", name: "Dr. Sarah Jenkins", specialty: "Cardiology", gender: "Female", status: "Available", room: "Room 102", workload: 2 },
  { id: "D2", name: "Dr. Rajesh Sharma", specialty: "Cardiology", gender: "Male", status: "Available", room: "Room 104", workload: 3 },
  { id: "D3", name: "Dr. Michael Chen", specialty: "Pulmonology", gender: "Male", status: "Available", room: "Room 108", workload: 2 },
  { id: "D4", name: "Dr. Maya Lin", specialty: "Pulmonology", gender: "Female", status: "Available", room: "Room 109", workload: 1 },
  { id: "D5", name: "Dr. Anita Desai", specialty: "General Medicine", gender: "Female", status: "Available", room: "Room 101", workload: 3 },
  { id: "D6", name: "Dr. Ramesh Kumar", specialty: "General Medicine", gender: "Male", status: "Available", room: "Room 103", workload: 4 },
  { id: "D7", name: "Dr. David Anderson", specialty: "Orthopedics", gender: "Male", status: "Available", room: "Room 112", workload: 2 },
  { id: "D8", name: "Dr. Elena Vance", specialty: "Orthopedics", gender: "Female", status: "Available", room: "Room 114", workload: 1 },
  { id: "D9", name: "Dr. Priya Patel", specialty: "Pediatrics", gender: "Female", status: "Available", room: "Room 105", workload: 1 },
  { id: "D10", name: "Dr. Amit Verma", specialty: "Pediatrics", gender: "Male", status: "Available", room: "Room 106", workload: 2 },
];

export default function OPWorkflow({ onComplete }: { onComplete?: () => void }) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [dbPatients, setDbPatients] = useState<DBPatient[]>([]);

  // Load patients from DB
  const refreshDbPatients = () => {
    setDbPatients(db.getPatients());
  };

  useEffect(() => {
    refreshDbPatients();
    const unsub = db.subscribe(refreshDbPatients);
    return () => unsub();
  }, []);
  
  // Accurate age calculation from DOB
  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  };

  // New Patient Form State
  const [newPatientForm, setNewPatientForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "1996-05-20",
    age: calculateAge("1996-05-20"),
    sex: "Male" as "Male" | "Female" | "Other",
    phone: "",
  });

  const handleDobChange = (newDob: string) => {
    const age = calculateAge(newDob);
    setNewPatientForm(prev => ({
      ...prev,
      dob: newDob,
      age: age
    }));
  };

  // Patient workflow state
  const [patient, setPatient] = useState<OPPatient>({
    umr: "",
    opNumber: "",
    name: "",
    age: 35,
    sex: "Male",
    phone: "",
    address: "",
    isNew: true,
    previousVisits: [],
    symptoms: ["Chest pain", "Breathing difficulty"],
    chiefComplaint: "Patient complaining of chest tightness and shortness of breath.",
    aiSpecialty: "Cardiology",
    aiDoctor: "Dr. Rajesh Sharma",
    aiConfidence: 96,
    doctorGenderPref: "Any",
    assignedDoctor: "Dr. Rajesh Sharma",
    doctorStatus: "Available",
    queueToken: "C-OP001",
    queuePosition: 1,
    room: "Room 104",
    diagnosis: "Acute Coronary Syndrome Rule-Out / Stable Angina",
    icd10: "I20.9",
    prescription: [
      { medicine: "Aspirin 81mg", dosage: "1 tab", frequency: "OD (Once Daily)", duration: "30 days" },
      { medicine: "Atorvastatin 40mg", dosage: "1 tab", frequency: "HS (Bedtime)", duration: "30 days" }
    ],
    investigations: ["ECG 12-Lead", "Serum Troponin I", "Lipid Profile"],
    advice: "Avoid strenuous exertion. Return immediately if chest pain worsens. Follow low-sodium diet.",
    vitals: { bp: "135/85 mmHg", pulse: "78 bpm", temp: "98.6 °F", spo2: "98%", weight: "74 kg", notes: "Patient alert and oriented. Mild diaphoresis on arrival." },
    billing: { consultationFee: 50, labFee: 40, total: 90, status: "Pending", mode: "Card" },
    furtherAction: "None",
    status: "Registered",
    timestamps: {
      arrival: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  });

  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  // Handlers for Step 1: Patient Identification with Database Sync
  const handleSelectExistingPatient = (existing: DBPatient) => {
    const previousEncounters = db.getEncountersForPatient(existing.umr);
    const newEncounter = db.createRevisitEncounter(existing.umr, {
      dept: patient.aiSpecialty || "General Medicine"
    });

    setPatient({
      ...patient,
      id: newEncounter.id,
      umr: existing.umr, // STRICTLY KEPT UNCHANGED
      opNumber: newEncounter.opNumber, // BRAND NEW VISIT OP NUMBER
      name: existing.name,
      age: existing.age,
      sex: existing.sex,
      phone: existing.phone,
      address: existing.address,
      isNew: false,
      previousVisits: previousEncounters.map(e => ({
        opNumber: e.opNumber,
        date: e.registrationTime,
        doctor: e.assignedDoctor,
        diagnosis: e.diagnosis || e.chiefComplaint
      })),
      status: "Registered",
      timestamps: { ...patient.timestamps, registration: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    });
  };

  const handleRegisterNewPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientForm.firstName.trim() || !newPatientForm.lastName.trim() || !newPatientForm.dob) return;

    const computedAge = calculateAge(newPatientForm.dob);

    const { patient: createdPatient, encounter: createdEncounter } = db.registerNewPatient({
      firstName: newPatientForm.firstName.trim(),
      middleName: newPatientForm.middleName.trim() || undefined,
      lastName: newPatientForm.lastName.trim(),
      dob: newPatientForm.dob,
      age: computedAge,
      sex: newPatientForm.sex,
      phone: newPatientForm.phone || "(617) 555-0192",
      dept: patient.aiSpecialty || "General Medicine",
      chiefComplaint: patient.chiefComplaint
    });

    setPatient({
      ...patient,
      id: createdEncounter.id,
      umr: createdPatient.umr,
      opNumber: createdEncounter.opNumber,
      name: createdPatient.name,
      age: computedAge,
      sex: createdPatient.sex,
      phone: createdPatient.phone,
      isNew: true,
      previousVisits: [],
      status: "Registered",
      timestamps: { ...patient.timestamps, registration: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    });

    setShowNewPatientModal(false);
  };

  // Quick preset loader with DB sync
  const loadPreset = (type: "new" | "revisit") => {
    if (type === "new") {
      const { patient: createdPatient, encounter: createdEncounter } = db.registerNewPatient({
        firstName: "David",
        lastName: "Miller",
        age: 29,
        sex: "Male",
        phone: "(617) 555-8831",
        address: "50 Commonwealth Ave, Boston, MA",
        bloodGroup: "A+",
        dept: "Cardiology",
        chiefComplaint: "Severe chest pain and palpitations"
      });

      setPatient({
        ...patient,
        id: createdEncounter.id,
        umr: createdPatient.umr,
        opNumber: createdEncounter.opNumber,
        name: createdPatient.name,
        age: createdPatient.age,
        sex: createdPatient.sex,
        phone: createdPatient.phone,
        address: createdPatient.address,
        isNew: true,
        previousVisits: [],
        status: "Registered",
        timestamps: { ...patient.timestamps, registration: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      });
    } else {
      const firstPatient = db.getPatients()[0];
      if (firstPatient) {
        handleSelectExistingPatient(firstPatient);
      }
    }
  };

  // Symptom Analysis
  const toggleSymptom = (sym: string) => {
    const nextSymptoms = patient.symptoms.includes(sym)
      ? patient.symptoms.filter(s => s !== sym)
      : [...patient.symptoms, sym];
    
    setPatient({ ...patient, symptoms: nextSymptoms });
  };

  const runAiSymptomAnalysis = () => {
    setAiAnalyzing(true);
    setTimeout(() => {
      let specialty = "General Medicine";
      let recommendedDoc = "";
      let conf = 95;

      // STRICT SAME-GENDER RULE:
      // Male Patient -> Male Doctor
      // Female Patient -> Female Doctor
      const patientGender = patient.sex === "Female" ? "Female" : "Male";

      const symText = patient.symptoms.join(" ").toLowerCase() + " " + patient.chiefComplaint.toLowerCase();
      if (symText.includes("chest") || symText.includes("breath") || symText.includes("sweat") || symText.includes("palpitat") || symText.includes("heart")) {
        specialty = "Cardiology";
        recommendedDoc = patientGender === "Female" ? "Dr. Sarah Jenkins" : "Dr. Rajesh Sharma";
        conf = 98;
      } else if (symText.includes("cough") || symText.includes("wheez") || symText.includes("asthma") || symText.includes("lung")) {
        specialty = "Pulmonology";
        recommendedDoc = patientGender === "Female" ? "Dr. Maya Lin" : "Dr. Michael Chen";
        conf = 92;
      } else if (symText.includes("joint") || symText.includes("back") || symText.includes("fracture") || symText.includes("bone") || symText.includes("knee")) {
        specialty = "Orthopedics";
        recommendedDoc = patientGender === "Female" ? "Dr. Elena Vance" : "Dr. David Anderson";
        conf = 96;
      } else if (symText.includes("child") || symText.includes("baby") || symText.includes("pediatric") || patient.age < 16) {
        specialty = "Pediatrics";
        recommendedDoc = patientGender === "Female" ? "Dr. Priya Patel" : "Dr. Amit Verma";
        conf = 95;
      } else {
        specialty = "General Medicine";
        recommendedDoc = patientGender === "Female" ? "Dr. Anita Desai" : "Dr. Ramesh Kumar";
        conf = 94;
      }

      setPatient(prev => ({
        ...prev,
        doctorGenderPref: patientGender,
        aiSpecialty: specialty,
        aiDoctor: recommendedDoc,
        aiConfidence: conf,
        assignedDoctor: recommendedDoc,
        status: "AI Recommended",
        timestamps: { ...prev.timestamps, symptoms: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      }));
      setAiAnalyzing(false);
    }, 700);
  };

  // Doctor assignment & Queue
  const assignDoctorAndQueue = (doc: typeof INITIAL_DOCTORS[0]) => {
    const isDocAvailable = doc.status === "Available";
    const queueToken = `${doc.specialty.substring(0, 1)}-${patient.opNumber}`;
    const queuePos = isDocAvailable ? 1 : doc.workload + 1;

    setPatient(prev => ({
      ...prev,
      assignedDoctor: doc.name,
      doctorStatus: doc.status as any,
      room: doc.room,
      queueToken: queueToken,
      queuePosition: queuePos,
      status: isDocAvailable ? "Doctor Assigned" : "In Queue",
      timestamps: { ...prev.timestamps, doctorAssigned: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    }));
  };

  const steps = [
    { num: 1, label: "Identification & UMR" },
    { num: 2, label: "OP Book" },
    { num: 3, label: "Symptoms & AI Match" },
    { num: 4, label: "Doctor & Queue" },
    { num: 5, label: "Consultation" },
    { num: 6, label: "Nurse Vitals" },
    { num: 7, label: "Billing & Completion" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F0F2F5]">
      {/* Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-900">Outpatient (OP) Clinical Patient Journey</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] font-mono">
              Keppler OP Specification v1.0
            </span>
          </div>
          <p className="text-[11.5px] text-[#64748B]">
            Unified 11-stage outpatient workflow from arrival, UMR/OP generation, AI doctor matching, consultation to billing.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {patient.umr ? (
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1 rounded text-[12px]">
              <span className="text-[#64748B]">Active Patient:</span>
              <span className="font-mono font-bold text-[#1B4FD8]">{patient.umr}</span>
              <span className="text-gray-300">|</span>
              <span className="font-mono font-bold text-[#D97706]">{patient.opNumber}</span>
              <span className="text-gray-300">|</span>
              <span className="font-semibold text-gray-800">{patient.name}</span>
            </div>
          ) : (
            <div className="text-[12px] text-[#64748B] italic">No active patient loaded</div>
          )}
          <button
            onClick={() => {
              setPatient({ ...patient, umr: "", opNumber: "", name: "" });
              setCurrentStep(1);
            }}
            className="px-3 py-1 bg-white border border-[#DDE2EC] text-[#1B4FD8] hover:bg-[#F8FAFC] rounded text-[12px] font-medium transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-[#0C1524] px-6 py-3 border-b border-[#1E2D42] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 w-full max-w-5xl mx-auto justify-between">
          {steps.map((s, idx) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <React.Fragment key={s.num}>
                <div
                  onClick={() => setCurrentStep(s.num)}
                  className={`flex items-center gap-2 cursor-pointer transition-all ${
                    isCurrent ? "text-white font-semibold" : isCompleted ? "text-[#93C5FD]" : "text-[#64748B]"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono transition-colors ${
                      isCurrent
                        ? "bg-[#1B59F8] text-white ring-2 ring-blue-400/50"
                        : isCompleted
                        ? "bg-[#16A34A] text-white"
                        : "bg-white/10 text-[#94A3B8]"
                    }`}
                  >
                    {isCompleted ? "✓" : s.num}
                  </div>
                  <span className="text-[12px] hidden md:inline">{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded ${isCompleted ? "bg-[#16A34A]" : "bg-white/10"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Step Workspace */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">

        {/* ── STEP 1: PATIENT IDENTIFICATION & UMR GENERATION ──────────── */}
        {currentStep === 1 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">1</span>
                  Patient Identification &amp; UMR Check (FR-001 – FR-006)
                </h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Search hospital database by Patient Name, Phone, or UMR. If found, retrieve existing UMR and generate new OP number. If new, register and generate a new UMR.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => loadPreset("new")}
                  className="px-2.5 py-1 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-[11px] font-bold rounded hover:bg-[#DBEAFE] transition-colors"
                >
                  ⚡ Load Demo New Patient
                </button>
                <button
                  onClick={() => loadPreset("revisit")}
                  className="px-2.5 py-1 bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[11px] font-bold rounded hover:bg-[#FDE68A] transition-colors"
                >
                  ⚡ Load Demo Revisit Patient
                </button>
              </div>
            </div>

            {/* Search Input & Action */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search existing patients by Name, UMR (e.g. UMR10001), or Phone..."
                  icon={<Icon.Search />}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewPatientForm({ ...newPatientForm, name: searchQuery });
                  setShowNewPatientModal(true);
                }}
                className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Icon.Plus /> Register New Patient
              </button>
            </div>

            {/* Existing Records Suggestions */}
            <div>
              <div className="text-[11.5px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                Existing Patient Database (Click to Select for Revisit)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dbPatients.filter(p =>
                  searchQuery === "" ||
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.umr.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.phone.includes(searchQuery)
                ).map((p) => {
                  const pEncounters = db.getEncountersForPatient(p.umr);
                  return (
                    <div
                      key={p.umr}
                      onClick={() => handleSelectExistingPatient(p)}
                      className={`p-3.5 border rounded-lg cursor-pointer transition-all ${
                        patient.umr === p.umr
                          ? "border-[#1B4FD8] bg-[#EFF6FF] ring-2 ring-blue-500/20"
                          : "border-[#DDE2EC] bg-white hover:border-[#94A3B8] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[13px] text-gray-900">{p.name}</span>
                        <span className="font-mono font-bold text-[11px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          {p.umr}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-[#64748B]">{p.age} yrs · {p.sex} · {p.phone}</div>
                      <div className="text-[11px] text-[#16A34A] font-medium mt-1">
                        {pEncounters.length} Previous OP Visits In Database
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Identification Confirmation Banner */}
            {patient.umr && (
              <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex items-center justify-between shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✓</span>
                    <span className="font-bold text-[13.5px] text-[#166534]">
                      {patient.isNew ? "New Patient Identity Created" : "Existing Patient Identified (Revisit Mode)"}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#15803D] flex items-center gap-3">
                    <span>
                      <strong>1. Permanent UMR:</strong>{" "}
                      <span className="font-mono font-bold text-[#166534]">{patient.umr}</span>{" "}
                      {patient.isNew ? "(Newly Generated)" : "(Retained Old Record)"}
                    </span>
                    <span>➔</span>
                    <span>
                      <strong>2. Visit OP Number:</strong>{" "}
                      <span className="font-mono font-bold text-[#D97706]">{patient.opNumber}</span>{" "}
                      {patient.isNew ? "(1st Visit OP-001)" : "(New Encounter Assigned)"}
                    </span>
                    <span>· Patient: <strong>{patient.name}</strong> ({patient.age} yrs, {patient.sex})</span>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  Generate OP Book &amp; Continue →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── NEW PATIENT REGISTRATION MODAL ─────────────────────────── */}
        {showNewPatientModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#DDE2EC] animate-in fade-in">
              <div className="px-6 py-4 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Register New OP Patient</h3>
                  <p className="text-[11.5px] text-[#64748B]">Creates a new permanent UMR and initial OP visit encounter.</p>
                </div>
                <button
                  onClick={() => setShowNewPatientModal(false)}
                  className="text-gray-400 hover:text-gray-700 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRegisterNewPatientSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">First Name *</label>
                    <Input
                      value={newPatientForm.firstName}
                      onChange={v => setNewPatientForm({ ...newPatientForm, firstName: v })}
                      placeholder="e.g. John"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Middle Name</label>
                    <Input
                      value={newPatientForm.middleName}
                      onChange={v => setNewPatientForm({ ...newPatientForm, middleName: v })}
                      placeholder="e.g. Robert (Optional)"
                    />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Last Name *</label>
                    <Input
                      value={newPatientForm.lastName}
                      onChange={v => setNewPatientForm({ ...newPatientForm, lastName: v })}
                      placeholder="e.g. Smith"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Date of Birth (DOB) *</label>
                    <input
                      type="date"
                      value={newPatientForm.dob}
                      onChange={e => handleDobChange(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full border border-[#DDE2EC] rounded-lg px-2.5 py-1.5 text-[12.5px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Age (Years)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={newPatientForm.age}
                        readOnly
                        disabled
                        className="w-full border border-[#DDE2EC] rounded-lg px-2.5 py-1.5 text-[12.5px] bg-[#F1F5F9] text-gray-800 font-bold font-mono cursor-not-allowed"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">yrs</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Gender *</label>
                    <select
                      value={newPatientForm.sex}
                      onChange={e => setNewPatientForm({ ...newPatientForm, sex: e.target.value as "Male" | "Female" | "Other" })}
                      className="w-full border border-[#DDE2EC] rounded-lg px-2.5 py-1.5 text-[12.5px] bg-white focus:outline-none focus:border-[#1B4FD8] text-gray-900 font-medium"
                      required
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Phone Number *</label>
                    <Input
                      value={newPatientForm.phone}
                      onChange={v => setNewPatientForm({ ...newPatientForm, phone: v })}
                      placeholder="e.g. (617) 555-0192"
                      required
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewPatientModal(false)}
                    className="px-4 py-2 text-[12.5px] text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-[12.5px] rounded-lg shadow-sm"
                  >
                    Register OP &amp; Generate UMR
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── STEP 2: DIGITAL OP BOOK & RECORD ─────────────────────────── */}
        {currentStep === 2 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">2</span>
                OP Book / OP Record Generation (FR-007)
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                The OP Book is given to the patient and links their permanent UMR with this specific outpatient visit.
              </p>
            </div>

            {/* OP Book Digital Card (White Color with Shadows and Crisp Border) */}
            <div className="max-w-xl mx-auto bg-white border-2 border-[#CBD5E1] text-gray-900 rounded-2xl p-6 shadow-xl relative overflow-hidden ring-1 ring-black/5">
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1B4FD8]"></div>

              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3.5 mb-4">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="HospAI" className="w-8 h-8 object-contain" />
                  <div>
                    <div className="font-bold text-[14px] text-gray-900">HospAI General Hospital</div>
                    <div className="text-[10px] text-[#64748B]">Official Outpatient (OP) Record Pass</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-[#64748B]">Visit Date</div>
                  <div className="text-[12px] font-mono font-bold text-gray-900">{new Date().toLocaleDateString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-[12.5px]">
                <div>
                  <div className="text-[10px] uppercase text-[#64748B] font-bold tracking-wider">Patient Name</div>
                  <div className="text-[16px] font-bold text-gray-900 mt-0.5">{patient.name}</div>
                  <div className="text-[11.5px] text-gray-600 mt-0.5 font-medium">{patient.age} yrs · {patient.sex} · {patient.phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-[#64748B] font-bold tracking-wider">Permanent UMR</div>
                  <div className="text-[15px] font-mono font-bold text-[#1B4FD8] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 inline-block mt-0.5">
                    {patient.umr}
                  </div>
                  <div className="text-[10px] uppercase text-[#64748B] font-bold tracking-wider mt-2">Visit OP Number</div>
                  <div className="text-[15px] font-mono font-bold text-[#D97706] bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 inline-block mt-0.5">
                    {patient.opNumber}
                  </div>
                </div>
              </div>

              {/* Previous visits chip */}
              {patient.previousVisits && patient.previousVisits.length > 0 && (
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 mb-4 text-[11px]">
                  <div className="text-[#64748B] font-bold mb-1">Previous OP History Associated with {patient.umr}:</div>
                  <div className="space-y-1">
                    {patient.previousVisits.map((pv, i) => (
                      <div key={i} className="flex justify-between text-[#475569]">
                        <span>• {pv.date} ({pv.opNumber}): {pv.diagnosis}</span>
                        <span className="text-[#64748B] font-medium">{pv.doctor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] text-[11px] text-[#64748B]">
                <span>Status: <strong className="text-[#166534] font-mono font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">{patient.status}</strong></span>
                <span className="font-mono text-gray-900 font-bold tracking-wider text-[12px]">Barcode: ||||| | |||| ||| ||||</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setCurrentStep(1)} className="text-[12px] text-[#64748B] hover:text-gray-900 font-medium">
                ← Back to Identification
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                Proceed to Symptom Capture &amp; AI Analysis →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: SYMPTOM CAPTURE & AI SPECIALTY MATCH ─────────────── */}
        {currentStep === 3 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">3</span>
                Patient Symptoms &amp; AI Doctor Recommendation (FR-008, FR-009, FR-010)
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Capture the patient's complaints. The AI component assists authorized staff in recommending the right medical specialty based on symptom patterns.
              </p>
            </div>

            {/* Chief Complaint Input */}
            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 block mb-1.5">
                Chief Complaint / Presenting Narrative
              </label>
              <textarea
                value={patient.chiefComplaint}
                onChange={e => setPatient({ ...patient, chiefComplaint: e.target.value })}
                placeholder="e.g. Patient complaining of severe chest tightness and shortness of breath since yesterday morning..."
                className="w-full h-20 border border-[#DDE2EC] rounded-lg p-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]"
              />
            </div>

            {/* Quick Symptom Checkboxes */}
            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 block mb-2">
                Select Common Symptoms (Multi-select)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Fever", "Headache", "Chest pain", "Breathing difficulty",
                  "Sweating", "Cough", "Abdominal pain", "Back pain",
                  "Joint swelling", "Vomiting", "Dizziness", "Fatigue"
                ].map((sym) => {
                  const active = patient.symptoms.includes(sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleSymptom(sym)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                        active
                          ? "bg-[#1B4FD8] text-white border-[#1B4FD8] shadow-xs"
                          : "bg-white text-gray-700 border-[#DDE2EC] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {active ? "✓ " : "+ "} {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Same-Gender Matching Protocol */}
            <div className="flex items-center justify-between p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-base">🔒</span>
                <span className="text-[12px] font-bold text-gray-900">Same-Gender Clinical Assignment Protocol:</span>
                <span className="text-[11.5px] text-[#1E40AF]">
                  Patient is <strong>{patient.sex}</strong> ➔ Automatically routed to <strong>{patient.sex === "Female" ? "Female" : "Male"}</strong> Specialist
                </span>
              </div>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-[#1B4FD8] border border-blue-300">
                {patient.sex === "Female" ? "♀ Female Doctor Only" : "♂ Male Doctor Only"}
              </span>
            </div>

            {/* Run AI Analysis Button */}
            <div className="flex justify-center">
              <button
                onClick={runAiSymptomAnalysis}
                disabled={aiAnalyzing || (patient.symptoms.length === 0 && !patient.chiefComplaint)}
                className="px-6 py-2.5 bg-gradient-to-r from-[#1E3A8A] to-[#1B4FD8] hover:from-[#1E40AF] hover:to-[#2563EB] text-white text-[13px] font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {aiAnalyzing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>✨</span>
                )}
                {aiAnalyzing ? "Analyzing Symptoms with Clinical AI..." : "Run AI Specialty Recommendation"}
              </button>
            </div>

            {/* AI Recommendation Result Box */}
            {patient.status !== "Registered" && (
              <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-[#1D4ED8] text-white px-2 py-0.5 rounded">
                      AI Recommendation
                    </span>
                    <span className="text-[12px] font-semibold text-[#1E3A8A]">
                      Confidence: {patient.aiConfidence}%
                    </span>
                  </div>
                  <div className="text-base font-bold text-gray-900 mt-1">
                    Specialty: {patient.aiSpecialty} ➔ Doctor: {patient.aiDoctor}
                  </div>
                  <div className="text-[11.5px] text-[#475569] mt-0.5">
                    Based on symptoms: {patient.symptoms.join(", ") || patient.chiefComplaint} with same-gender rule (<strong>{patient.sex === "Female" ? "Female" : "Male"} Doctor</strong>) assigned.
                  </div>
                </div>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  Check Availability &amp; Queue →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: DOCTOR AVAILABILITY & QUEUE PLACEMENT ───────────── */}
        {currentStep === 4 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">4</span>
                Doctor Availability &amp; Real-time Queue (FR-011, FR-012, FR-013, FR-014)
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Check live doctor roster. Filtered to <strong>{patient.sex === "Female" ? "Female" : "Male"}</strong> doctors matching the patient's gender.
              </p>
            </div>

            {/* Doctor Roster Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {INITIAL_DOCTORS.filter(d =>
                (d.specialty === patient.aiSpecialty || patient.aiSpecialty === "General Medicine") &&
                (d.gender === (patient.sex === "Female" ? "Female" : "Male"))
              ).map((doc) => {
                const isSelected = patient.assignedDoctor === doc.name;
                return (
                  <div
                    key={doc.id}
                    onClick={() => assignDoctorAndQueue(doc)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#1B4FD8] bg-[#EFF6FF] ring-2 ring-blue-500/20"
                        : "border-[#DDE2EC] bg-white hover:border-[#94A3B8]"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-[13.5px] text-gray-900">{doc.name}</div>
                        <div className="text-[11.5px] text-[#64748B]">{doc.specialty} · {doc.room}</div>
                      </div>
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded uppercase ${
                        doc.status === "Available"
                          ? "bg-[#DCFCE7] text-[#15803D]"
                          : "bg-[#FEF3C7] text-[#B45309]"
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-[#475569] flex justify-between pt-2 border-t border-[#F1F5F9]">
                      <span>Workload: <strong>{doc.workload} active patients</strong></span>
                      <span>Gender: {doc.gender}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Queue Assignment Summary */}
            {patient.assignedDoctor && (
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-bold text-gray-900">
                    Assignment: {patient.assignedDoctor} ({patient.room})
                  </div>
                  <div className="text-[11.5px] text-[#64748B] mt-0.5">
                    Token: <strong className="font-mono text-[#1B4FD8]">{patient.queueToken}</strong> · Queue Position: <strong className="text-[#D97706]">#{patient.queuePosition}</strong> · Doctor Notified: <span className="text-[#16A34A]">✓ Sent</span>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  Enter Doctor Consultation Workspace →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: DOCTOR CONSULTATION ─────────────────────────────── */}
        {currentStep === 5 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">5</span>
                  Doctor Consultation &amp; Clinical Orders (FR-015 – FR-019)
                </h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Doctor reviews patient history, records clinical assessment, prescribes medications, and orders investigations.
                </p>
              </div>
              <span className="font-mono text-[11px] bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">
                Consulting: {patient.assignedDoctor}
              </span>
            </div>

            {/* Diagnosis and ICD-10 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Clinical Diagnosis</label>
                <Input
                  value={patient.diagnosis || "Acute Coronary Syndrome Rule-Out / Stable Angina"}
                  onChange={v => setPatient({ ...patient, diagnosis: v })}
                  placeholder="Enter diagnosis..."
                />
              </div>
              <div>
                <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">ICD-10 Code</label>
                <Input
                  value={patient.icd10 || "I20.9 (Angina Pectoris)"}
                  onChange={v => setPatient({ ...patient, icd10: v })}
                  placeholder="e.g. I20.9"
                />
              </div>
            </div>

            {/* Prescriptions */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[11.5px] font-semibold text-gray-700">Prescribed Medications</label>
                <button
                  type="button"
                  onClick={() => setPatient({
                    ...patient,
                    prescription: [
                      ...patient.prescription,
                      { medicine: "Aspirin 81mg", dosage: "1 tab", frequency: "OD (Once Daily)", duration: "30 days" }
                    ]
                  })}
                  className="text-[11.5px] font-medium text-[#1B4FD8] hover:underline"
                >
                  + Add Medication
                </button>
              </div>
              <div className="space-y-2">
                {patient.prescription.map((rx, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0] text-[12px]">
                    <span className="font-semibold text-gray-900">{rx.medicine}</span>
                    <span className="text-gray-600">{rx.dosage}</span>
                    <span className="text-gray-600">{rx.frequency}</span>
                    <span className="text-gray-600">{rx.duration}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Advice */}
            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Doctor Advice &amp; Instructions</label>
              <textarea
                value={patient.advice}
                onChange={e => setPatient({ ...patient, advice: e.target.value })}
                className="w-full h-16 border border-[#DDE2EC] rounded-lg p-2.5 text-[12.5px] focus:outline-none focus:border-[#1B4FD8]"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setCurrentStep(4)} className="text-[12px] text-[#64748B] hover:text-gray-900 font-medium">
                ← Back to Queue
              </button>
              <button
                onClick={() => {
                  setPatient({ ...patient, status: "Consultation Completed" });
                  setCurrentStep(6);
                }}
                className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                Complete Consultation ➔ Send to Post-Consult Vitals →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6: POST-CONSULTATION NURSE VITALS ─────────────────── */}
        {currentStep === 6 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">6</span>
                Post-Consultation Processing &amp; Staff Vitals Check (FR-020)
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Staff / Nurse records baseline physiological parameters and observations linked directly to this OP encounter.
              </p>
            </div>

            {/* Vitals Form Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Blood Pressure</label>
                <Input value={patient.vitals.bp} onChange={v => setPatient({ ...patient, vitals: { ...patient.vitals, bp: v } })} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Heart Rate / Pulse</label>
                <Input value={patient.vitals.pulse} onChange={v => setPatient({ ...patient, vitals: { ...patient.vitals, pulse: v } })} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Temperature</label>
                <Input value={patient.vitals.temp} onChange={v => setPatient({ ...patient, vitals: { ...patient.vitals, temp: v } })} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Oxygen SpO2</label>
                <Input value={patient.vitals.spo2} onChange={v => setPatient({ ...patient, vitals: { ...patient.vitals, spo2: v } })} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Weight</label>
                <Input value={patient.vitals.weight} onChange={v => setPatient({ ...patient, vitals: { ...patient.vitals, weight: v } })} />
              </div>
            </div>

            {/* Further Action Selection */}
            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 block mb-1.5">
                Further Action / Department Routing (FR-022)
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {(["None", "Laboratory", "Pharmacy", "Radiology", "Admission", "Referral"] as const).map((act) => (
                  <button
                    key={act}
                    type="button"
                    onClick={() => setPatient({ ...patient, furtherAction: act })}
                    className={`py-2 px-3 rounded-lg text-[12px] font-semibold border transition-all ${
                      patient.furtherAction === act
                        ? "bg-[#1B4FD8] text-white border-[#1B4FD8]"
                        : "bg-white text-gray-700 border-[#DDE2EC] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setCurrentStep(5)} className="text-[12px] text-[#64748B] hover:text-gray-900 font-medium">
                ← Back to Consultation
              </button>
              <button
                onClick={() => {
                  setPatient({ ...patient, status: "Awaiting Billing" });
                  setCurrentStep(7);
                }}
                className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                Proceed to Billing &amp; Encounter Completion →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 7: BILLING & OP VISIT COMPLETION ───────────────────── */}
        {currentStep === 7 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">7</span>
                OP Billing, Payment &amp; Visit Completion (FR-021, FR-023, FR-024)
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Record charges for OP consultation, collect payment, and finalize the outpatient encounter.
              </p>
            </div>

            {/* Billing Receipt Summary */}
            <div className="max-w-md mx-auto bg-[#F8FAFC] border border-[#DDE2EC] rounded-xl p-5 space-y-3 shadow-xs">
              <div className="text-[13px] font-bold text-gray-900 border-b border-[#E2E8F0] pb-2 flex justify-between">
                <span>OP Consultation Invoice</span>
                <span className="font-mono text-[#1B4FD8]">{patient.opNumber}</span>
              </div>
              <div className="flex justify-between text-[12px] text-gray-700">
                <span>OP Doctor Consultation Fee ({patient.assignedDoctor}):</span>
                <span className="font-semibold">${patient.billing.consultationFee}.00</span>
              </div>
              <div className="flex justify-between text-[12px] text-gray-700">
                <span>Service / Nursing Processing Charge:</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <div className="border-t border-[#E2E8F0] pt-2 flex justify-between text-[14px] font-bold text-gray-900">
                <span>Total Amount Due:</span>
                <span className="text-[#16A34A]">${patient.billing.total}.00</span>
              </div>

              {/* Payment Mode Selector */}
              <div className="pt-2 border-t border-[#E2E8F0]">
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Payment Method</label>
                <select
                  value={patient.billing.mode}
                  onChange={e => setPatient({ ...patient, billing: { ...patient.billing, mode: e.target.value } })}
                  className="w-full border border-[#DDE2EC] rounded text-[12px] p-2 bg-white"
                >
                  <option>Card</option>
                  <option>Cash</option>
                  <option>UPI / Digital</option>
                  <option>Insurance Co-Pay</option>
                </select>
              </div>
            </div>

            {/* Final Complete Action */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  setPatient({
                    ...patient,
                    status: "OP Completed",
                    billing: { ...patient.billing, status: "Paid" },
                    timestamps: {
                      ...patient.timestamps,
                      billingCompleted: nowTime,
                      visitCompleted: nowTime
                    }
                  });

                  if (patient.id) {
                    try {
                      db.updateEncounter(patient.id, {
                        diagnosis: patient.diagnosis,
                        icd10: patient.icd10,
                        prescription: patient.prescription,
                        investigations: patient.investigations,
                        advice: patient.advice,
                        vitals: patient.vitals,
                        furtherAction: patient.furtherAction,
                        status: "OP Completed",
                        billing: { ...patient.billing, status: "Paid" },
                        timestamps: {
                          ...patient.timestamps,
                          billingCompleted: nowTime,
                          visitCompleted: nowTime
                        }
                      });
                    } catch (err) {
                      console.warn("DB update:", err);
                    }
                  }
                }}
                className="px-8 py-3 bg-[#16A34A] hover:bg-[#15803D] text-white text-[14px] font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <span>💾</span> Mark OP Visit Completed &amp; Save to Database
              </button>
            </div>

            {/* Visit Completed Success Card */}
            {patient.status === "OP Completed" && (
              <div className="p-5 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl text-center space-y-3">
                <div className="text-3xl">🎉</div>
                <div className="text-base font-bold text-[#166534]">
                  Outpatient Encounter {patient.opNumber} Successfully Completed!
                </div>
                <p className="text-[12px] text-[#15803D] max-w-lg mx-auto">
                  Patient <strong>{patient.name}</strong>'s complete OP record has been archived under permanent <strong>{patient.umr}</strong>. On future visits, this history will be retrieved automatically.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Btn variant="outline" size="sm" onClick={() => window.print()}>
                    <Icon.Download /> Print OP Summary Card
                  </Btn>
                  <Btn variant="primary" size="sm" onClick={() => {
                    setPatient({ ...patient, umr: "", opNumber: "", name: "" });
                    setCurrentStep(1);
                  }}>
                    Start Next OP Patient
                  </Btn>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
