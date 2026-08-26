import React, { useEffect, useState } from "react";
import { Icon } from "./icons";
import { Btn, Input } from "./shared";
import { apiFetch, reportError } from "../lib/api";
import type { Notice } from "../types";

export interface OPPatient {
  id?: number; // real appointment_id once identified
  umr: string; // patient_id
  opNumber: string; // token_no / op_number, display only
  name: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  phone: string;
  isNew: boolean;
  previousVisits?: { opNumber: string; date: string; doctor: string; diagnosis: string }[];
  symptoms: string[];
  chiefComplaint: string;
  aiSpecialty: string;
  aiDoctor: string;
  aiConfidence: number;
  aiReasoning?: string;
  aiDoctorRationale?: string;
  doctorGenderPref: "Any" | "Male" | "Female";
  assignedDoctor: string;
  doctorStatus: "available" | "busy" | "leave" | string;
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
    | "Doctor Assigned"
    | "In Queue"
    | "Consultation Completed"
    | "Awaiting Billing"
    | "OP Completed";
  timestamps: {
    arrival: string;
    registration?: string;
    symptoms?: string;
    doctorAssigned?: string;
    consultationEnd?: string;
    vitalsRecorded?: string;
    billingCompleted?: string;
    visitCompleted?: string;
  };
}

type PatientMatch = {
  patient_id: string;
  full_name: string;
  phone: string;
  gender: string;
  age: number | null;
  total_op_visits: number;
};

type EligibleDoctor = {
  id: number;
  doctor_name: string;
  department: string;
  gender: string;
  consultation_fee: number;
  status: string;
  current_workload: number;
  department_matches: boolean;
  gender_matches: boolean;
  is_available: boolean;
};

const EMPTY_PATIENT: OPPatient = {
  umr: "",
  opNumber: "",
  name: "",
  age: 0,
  sex: "Male",
  phone: "",
  isNew: true,
  previousVisits: [],
  symptoms: [],
  chiefComplaint: "",
  aiSpecialty: "",
  aiDoctor: "",
  aiConfidence: 0,
  doctorGenderPref: "Any",
  assignedDoctor: "",
  doctorStatus: "available",
  queueToken: "",
  queuePosition: 1,
  room: "",
  diagnosis: "",
  icd10: "",
  prescription: [],
  investigations: [],
  advice: "",
  vitals: { bp: "", pulse: "", temp: "", spo2: "", weight: "", notes: "" },
  billing: { consultationFee: 0, labFee: 0, total: 0, status: "Pending", mode: "Card" },
  furtherAction: "None",
  status: "Registered",
  timestamps: { arrival: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
};

const calculateAge = (dobString: string): number => {
  if (!dobString) return 0;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return Math.max(0, age);
};

function detectSpecialty(text: string, age: number): { specialty: string; reasoning: string } {
  const t = text.toLowerCase();
  if (/chest|breath|sweat|palpitat|heart/.test(t)) {
    return { specialty: "Cardiology", reasoning: "Acute thoracic complaints (chest discomfort, shortness of breath, palpitations) represent significant cardiovascular risk. Immediate Cardiology assessment is indicated for ACS rule-out, 12-lead ECG, and cardiac biomarker evaluation." };
  }
  if (/cough|wheez|asthma|lung/.test(t)) {
    return { specialty: "Pulmonology", reasoning: "Persistent respiratory symptoms with cough/wheezing indicate lower airway bronchospasm or respiratory tract infection requiring Pulmonology diagnostic correlation." };
  }
  if (/joint|back|fracture|bone|knee/.test(t)) {
    return { specialty: "Orthopedics", reasoning: "Localized musculoskeletal pain, joint swelling, or spinal discomfort warrants Orthopedic examination and radiologic correlation." };
  }
  if (/child|baby|pediatric/.test(t) || age < 16) {
    return { specialty: "Pediatrics", reasoning: "Pediatric profile and presenting symptoms require specialized developmental and child-care medical assessment." };
  }
  return { specialty: "General Medicine", reasoning: "Presenting symptoms require comprehensive internal medicine evaluation and screening before specialist referral." };
}

export default function OPWorkflow({ onComplete }: { onComplete?: () => void }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientMatch[]>([]);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [eligibleDoctors, setEligibleDoctors] = useState<EligibleDoctor[]>([]);

  const [newPatientForm, setNewPatientForm] = useState({
    firstName: "", middleName: "", lastName: "", dob: "", age: 0,
    sex: "" as "Male" | "Female" | "Other" | "", phone: "",
  });

  const [patient, setPatient] = useState<OPPatient>(EMPTY_PATIENT);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  // Live search as staff types a name/ID/phone
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(() => {
      apiFetch<{ matches: PatientMatch[] }>(`/api/op/patients/check-match?q=${encodeURIComponent(searchQuery)}`)
        .then((data) => setSearchResults(data.matches || []))
        .catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const applyVisit = (res: { appointment_id: number; op_number: number; patient_id: string; patient_name: string }, extra: Partial<OPPatient>) => {
    setPatient((prev) => ({
      ...prev,
      ...extra,
      id: res.appointment_id,
      umr: res.patient_id,
      opNumber: String(res.op_number),
      name: res.patient_name,
      status: "Registered",
      timestamps: { ...prev.timestamps, registration: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    }));
  };

  const handleSelectExistingPatient = async (existing: PatientMatch) => {
    setBusy(true);
    try {
      const [visitRes, historyRes] = await Promise.all([
        apiFetch<{ appointment_id: number; op_number: number; patient_id: string; patient_name: string }>("/api/op/visits", {
          method: "POST",
          body: JSON.stringify({ patient_id: existing.patient_id, appointment: {} }),
        }),
        apiFetch<{ visits: any[] }>(`/api/op/patients/${existing.patient_id}/history`).catch(() => ({ visits: [] })),
      ]);
      applyVisit(visitRes, {
        age: existing.age || 0,
        sex: (existing.gender as any) || "Male",
        phone: existing.phone,
        isNew: false,
        previousVisits: (historyRes.visits || []).map((v: any) => ({
          opNumber: String(v.token_no ?? ""),
          date: v.appointment_date ? new Date(v.appointment_date).toLocaleDateString() : "",
          doctor: v.doctor_name || "Unassigned",
          diagnosis: v.chief_complaint || v.department || "",
        })),
      });
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to start revisit encounter.");
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterNewPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientForm.firstName.trim() || !newPatientForm.lastName.trim() || !newPatientForm.dob) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ appointment_id: number; op_number: number; patient_id: string; patient_name: string }>("/api/op/visits", {
        method: "POST",
        body: JSON.stringify({
          patient: {
            name: newPatientForm.firstName.trim(),
            middle_name: newPatientForm.middleName.trim(),
            last_name: newPatientForm.lastName.trim(),
            dob: newPatientForm.dob,
            age: newPatientForm.age,
            gender: newPatientForm.sex || "Other",
            phone: newPatientForm.phone.trim(),
          },
          appointment: {},
        }),
      });
      applyVisit(res, {
        age: newPatientForm.age,
        sex: (newPatientForm.sex || "Male") as any,
        phone: newPatientForm.phone.trim(),
        isNew: true,
        previousVisits: [],
      });
      setShowNewPatientModal(false);
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to register patient.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSymptom = (sym: string) => {
    setPatient((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(sym) ? prev.symptoms.filter((s) => s !== sym) : [...prev.symptoms, sym],
    }));
  };

  const runAiSymptomAnalysis = async () => {
    setAiAnalyzing(true);
    const combined = `${patient.chiefComplaint} ${patient.symptoms.join(" ")}`;
    const { specialty, reasoning } = detectSpecialty(combined, patient.age);
    const genderPref = patient.sex === "Female" ? "Female" : "Male";

    try {
      const eligible = await apiFetch<{ doctors: EligibleDoctor[]; recommended_doctor: EligibleDoctor | null }>(
        `/api/op/doctors/eligible?department=${encodeURIComponent(specialty)}&patient_gender=${patient.sex}&doctor_gender_preference=${genderPref}`,
      );
      const recommended = eligible.recommended_doctor;
      const conf = recommended ? Math.min(99, 70 + recommended.current_workload * -2 + (recommended.department_matches ? 20 : 0) + (recommended.gender_matches ? 10 : 0)) : 80;
      const rationale = recommended
        ? `${recommended.doctor_name} (${recommended.department}) is currently ${recommended.status}, with ${recommended.current_workload} active patient${recommended.current_workload === 1 ? "" : "s"} in queue today.`
        : "No eligible doctor currently on record for this department.";

      if (patient.id) {
        await apiFetch(`/api/op/visits/${patient.id}/symptoms`, {
          method: "PUT",
          body: JSON.stringify({
            chief_complaint: patient.chiefComplaint,
            symptoms: patient.symptoms.join(", "),
            ai_recommendation: `${specialty} — ${recommended?.doctor_name || "Unassigned"}`,
          }),
        });
      }

      setPatient((prev) => ({
        ...prev,
        doctorGenderPref: genderPref,
        aiSpecialty: specialty,
        aiDoctor: recommended?.doctor_name || "",
        aiConfidence: Math.max(0, Math.round(conf)),
        aiReasoning: reasoning,
        aiDoctorRationale: rationale,
        assignedDoctor: recommended?.doctor_name || "",
        status: "AI Recommended",
        timestamps: { ...prev.timestamps, symptoms: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      }));
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to run specialty analysis.");
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Load eligible doctors when entering step 4
  useEffect(() => {
    if (currentStep !== 4 || !patient.aiSpecialty) return;
    apiFetch<{ doctors: EligibleDoctor[] }>(
      `/api/op/doctors/eligible?department=${encodeURIComponent(patient.aiSpecialty)}&patient_gender=${patient.sex}&doctor_gender_preference=${patient.doctorGenderPref}`,
    )
      .then((data) => setEligibleDoctors(data.doctors || []))
      .catch((error) => reportError(setNotice, error, "Unable to load eligible doctors."));
  }, [currentStep, patient.aiSpecialty, patient.sex, patient.doctorGenderPref]);

  const assignDoctorAndQueue = async (doc: EligibleDoctor) => {
    if (!patient.id) return;
    setBusy(true);
    try {
      await apiFetch(`/api/op/visits/${patient.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ doctor_name: doc.doctor_name }),
      });
      const queueToken = `${doc.department.substring(0, 1)}-${patient.opNumber}`;
      const queuePos = doc.is_available ? 1 : doc.current_workload + 1;
      setPatient((prev) => ({
        ...prev,
        assignedDoctor: doc.doctor_name,
        doctorStatus: doc.status,
        room: doc.department,
        queueToken,
        queuePosition: queuePos,
        billing: { ...prev.billing, consultationFee: doc.consultation_fee || prev.billing.consultationFee, total: doc.consultation_fee || prev.billing.total },
        status: doc.is_available ? "Doctor Assigned" : "In Queue",
        timestamps: { ...prev.timestamps, doctorAssigned: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      }));
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to assign doctor.");
    } finally {
      setBusy(false);
    }
  };

  const completeConsultation = async () => {
    if (!patient.id) return;
    setBusy(true);
    try {
      await apiFetch(`/api/op/visits/${patient.id}/consultation`, {
        method: "PUT",
        body: JSON.stringify({
          diagnosis: patient.diagnosis,
          advice: patient.advice,
          medicines: patient.prescription.map((rx) => ({ name: rx.medicine, dosage: rx.dosage, frequency: rx.frequency, duration: rx.duration, quantity: 1 })),
          tests: patient.investigations,
          further_action: "none",
        }),
      });
      setPatient((prev) => ({ ...prev, status: "Consultation Completed", timestamps: { ...prev.timestamps, consultationEnd: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) } }));
      setCurrentStep(6);
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to save consultation.");
    } finally {
      setBusy(false);
    }
  };

  const completeVitalsAndAction = async () => {
    if (!patient.id) return;
    setBusy(true);
    try {
      await apiFetch(`/api/op/visits/${patient.id}/vitals`, {
        method: "POST",
        body: JSON.stringify({
          bp: patient.vitals.bp || undefined,
          pulse: patient.vitals.pulse || undefined,
          temperature: patient.vitals.temp || undefined,
          spo2: patient.vitals.spo2 || undefined,
          weight: patient.vitals.weight || undefined,
          notes: patient.vitals.notes || undefined,
        }),
      });
      await apiFetch(`/api/op/visits/${patient.id}/further-action`, {
        method: "POST",
        body: JSON.stringify({ action: patient.furtherAction.toLowerCase(), notes: "" }),
      });
      setPatient((prev) => ({ ...prev, status: "Awaiting Billing", timestamps: { ...prev.timestamps, vitalsRecorded: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) } }));
      setCurrentStep(7);
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to record vitals.");
    } finally {
      setBusy(false);
    }
  };

  const completeBilling = async () => {
    if (!patient.id) return;
    setBusy(true);
    try {
      const invoiceRes = await apiFetch<{ invoice_id: number; invoice_no: string }>("/api/billing/invoices", {
        method: "POST",
        body: JSON.stringify({
          patient_id: patient.umr,
          module: "OP",
          doctor_name: patient.assignedDoctor,
          total_amount: patient.billing.total || patient.billing.consultationFee,
          paid_amount: patient.billing.total || patient.billing.consultationFee,
          payment_status: "paid",
          appointment_id: patient.id,
        }),
      });
      await apiFetch(`/api/billing/invoices/${invoiceRes.invoice_id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount: patient.billing.total || patient.billing.consultationFee, payment_mode: patient.billing.mode.toLowerCase().includes("upi") ? "upi" : patient.billing.mode.toLowerCase().includes("card") ? "card" : "cash" }),
      });
      const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setPatient((prev) => ({
        ...prev,
        status: "OP Completed",
        billing: { ...prev.billing, status: "Paid" },
        timestamps: { ...prev.timestamps, billingCompleted: nowTime, visitCompleted: nowTime },
      }));
      setNotice({ type: "success", message: `Invoice ${invoiceRes.invoice_no} created and paid.` });
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to complete billing.");
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    { num: 1, label: "Identification" },
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
          <h1 className="text-base font-semibold text-gray-900">OP Management — Clinical Patient Journey</h1>
          <p className="text-[11.5px] text-[#64748B]">Live outpatient workflow from arrival through billing, backed by the connected database.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {patient.umr ? (
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1 rounded text-[12px]">
              <span className="text-[#64748B]">Active Patient:</span>
              <span className="font-mono font-bold text-[#1B4FD8]">{patient.umr}</span>
              <span className="text-gray-300">|</span>
              <span className="font-mono font-bold text-[#D97706]">#{patient.opNumber}</span>
              <span className="text-gray-300">|</span>
              <span className="font-semibold text-gray-800">{patient.name}</span>
            </div>
          ) : (
            <div className="text-[12px] text-[#64748B] italic">No active patient loaded</div>
          )}
          <button
            onClick={() => { setPatient(EMPTY_PATIENT); setCurrentStep(1); onComplete?.(); }}
            className="px-3 py-1 bg-white border border-[#DDE2EC] text-[#1B4FD8] hover:bg-[#F8FAFC] rounded text-[12px] font-medium transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {notice && (
        <div className={`mx-6 mt-3 p-3 rounded-lg text-[12px] font-medium flex items-center justify-between flex-shrink-0 ${notice.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : notice.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
          <span>{notice.message}</span>
          <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      {/* Stepper Progress Bar */}
      <div className="bg-[#0C1524] px-6 py-3 border-b border-[#1E2D42] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 w-full max-w-5xl mx-auto justify-between">
          {steps.map((s, idx) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <React.Fragment key={s.num}>
                <div onClick={() => setCurrentStep(s.num)} className={`flex items-center gap-2 cursor-pointer transition-all ${isCurrent ? "text-white font-semibold" : isCompleted ? "text-[#93C5FD]" : "text-[#64748B]"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono transition-colors ${isCurrent ? "bg-[#1B59F8] text-white ring-2 ring-blue-400/50" : isCompleted ? "bg-[#16A34A] text-white" : "bg-white/10 text-[#94A3B8]"}`}>
                    {isCompleted ? "✓" : s.num}
                  </div>
                  <span className="text-[12px] hidden md:inline">{s.label}</span>
                </div>
                {idx < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 rounded ${isCompleted ? "bg-[#16A34A]" : "bg-white/10"}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Step Workspace */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">

        {/* STEP 1: IDENTIFICATION */}
        {currentStep === 1 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">1</span>
                Patient Identification
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Search the live database by Patient Name, Phone, or Patient ID. If found, a new visit token is generated under the existing patient ID. If new, register to generate a new patient ID.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <Input value={searchQuery} onChange={setSearchQuery} placeholder="Search existing patients by Name, Patient ID, or Phone..." icon={<Icon.Search />} />
              </div>
              <button type="button" onClick={() => { setNewPatientForm({ ...newPatientForm, firstName: searchQuery }); setShowNewPatientModal(true); }}
                className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs">
                <Icon.Plus /> Register New Patient
              </button>
            </div>

            <div>
              <div className="text-[11.5px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">Search Results (Click to Select for Revisit)</div>
              {searchQuery.trim().length < 2 && (
                <div className="text-[12px] text-[#94A3B8] py-4 text-center">Type at least 2 characters to search the patient database.</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {searchResults.map((p) => (
                  <div key={p.patient_id} onClick={() => void handleSelectExistingPatient(p)}
                    className={`p-3.5 border rounded-lg cursor-pointer transition-all ${patient.umr === p.patient_id ? "border-[#1B4FD8] bg-[#EFF6FF] ring-2 ring-blue-500/20" : "border-[#DDE2EC] bg-white hover:border-[#94A3B8] hover:bg-[#F8FAFC]"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[13px] text-gray-900">{p.full_name}</span>
                      <span className="font-mono font-bold text-[11px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{p.patient_id}</span>
                    </div>
                    <div className="text-[11.5px] text-[#64748B]">{p.age ?? "—"} yrs · {p.gender} · {p.phone || "—"}</div>
                    <div className="text-[11px] text-[#16A34A] font-medium mt-1">{p.total_op_visits} Previous OP Visits In Database</div>
                  </div>
                ))}
              </div>
            </div>

            {patient.umr && (
              <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex items-center justify-between shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✓</span>
                    <span className="font-bold text-[13.5px] text-[#166534]">{patient.isNew ? "New Patient Identity Created" : "Existing Patient Identified (Revisit Mode)"}</span>
                  </div>
                  <div className="text-[12px] text-[#15803D] flex items-center gap-3 flex-wrap">
                    <span><strong>Patient ID:</strong> <span className="font-mono font-bold text-[#166534]">{patient.umr}</span></span>
                    <span>➔</span>
                    <span><strong>Visit Token:</strong> <span className="font-mono font-bold text-[#D97706]">#{patient.opNumber}</span></span>
                    <span>· Patient: <strong>{patient.name}</strong> ({patient.age} yrs, {patient.sex})</span>
                  </div>
                </div>
                <button onClick={() => setCurrentStep(2)} className="px-5 py-2.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                  Generate OP Book &amp; Continue →
                </button>
              </div>
            )}
          </div>
        )}

        {/* NEW PATIENT MODAL */}
        {showNewPatientModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#DDE2EC]">
              <div className="px-6 py-4 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Register New OP Patient</h3>
                  <p className="text-[11.5px] text-[#64748B]">Creates a new permanent patient ID and initial OP visit.</p>
                </div>
                <button onClick={() => setShowNewPatientModal(false)} className="text-gray-400 hover:text-gray-700 text-lg font-bold">✕</button>
              </div>

              <form onSubmit={(e) => void handleRegisterNewPatientSubmit(e)} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">First Name *</label>
                    <Input value={newPatientForm.firstName} onChange={v => setNewPatientForm({ ...newPatientForm, firstName: v })} placeholder="e.g. John" />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Middle Name</label>
                    <Input value={newPatientForm.middleName} onChange={v => setNewPatientForm({ ...newPatientForm, middleName: v })} placeholder="e.g. Robert (Optional)" />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Last Name *</label>
                    <Input value={newPatientForm.lastName} onChange={v => setNewPatientForm({ ...newPatientForm, lastName: v })} placeholder="e.g. Smith" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Date of Birth (DOB) *</label>
                    <input type="date" value={newPatientForm.dob} onChange={e => setNewPatientForm({ ...newPatientForm, dob: e.target.value, age: calculateAge(e.target.value) })} max={new Date().toISOString().split("T")[0]}
                      className="w-full border border-[#DDE2EC] rounded-lg px-2.5 py-1.5 text-[12.5px] bg-white focus:outline-none focus:border-[#1B4FD8]" required />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Age (Years)</label>
                    <div className="relative">
                      <input type="number" value={newPatientForm.age} readOnly disabled className="w-full border border-[#DDE2EC] rounded-lg px-2.5 py-1.5 text-[12.5px] bg-[#F1F5F9] text-gray-800 font-bold font-mono cursor-not-allowed" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">yrs</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Gender *</label>
                    <select value={newPatientForm.sex} onChange={e => setNewPatientForm({ ...newPatientForm, sex: e.target.value as "Male" | "Female" | "Other" })}
                      className="w-full border border-[#DDE2EC] rounded-lg px-2.5 py-1.5 text-[12.5px] bg-white focus:outline-none focus:border-[#1B4FD8] text-gray-900 font-medium" required>
                      <option value="" disabled>Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Phone Number *</label>
                    <Input value={newPatientForm.phone} onChange={v => setNewPatientForm({ ...newPatientForm, phone: v })} placeholder="e.g. (617) 555-0192" />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
                  <button type="button" onClick={() => setShowNewPatientModal(false)} className="px-4 py-2 text-[12.5px] text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button type="submit" disabled={busy} className="px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-[12.5px] rounded-lg shadow-sm disabled:opacity-50">
                    {busy ? "Registering…" : "Register OP & Generate Patient ID"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STEP 2: OP BOOK */}
        {currentStep === 2 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">2</span>
                Digital OP Book &amp; Record
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">The OP Book links the patient's permanent ID with this specific outpatient visit.</p>
            </div>

            <div className="max-w-xl mx-auto bg-white border-2 border-[#CBD5E1] text-gray-900 rounded-2xl p-6 shadow-xl relative overflow-hidden ring-1 ring-black/5">
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
                  <div className="text-[10px] uppercase text-[#64748B] font-bold tracking-wider">Permanent Patient ID</div>
                  <div className="text-[15px] font-mono font-bold text-[#1B4FD8] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 inline-block mt-0.5">{patient.umr}</div>
                  <div className="text-[10px] uppercase text-[#64748B] font-bold tracking-wider mt-2">Visit Token</div>
                  <div className="text-[15px] font-mono font-bold text-[#D97706] bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 inline-block mt-0.5">#{patient.opNumber}</div>
                </div>
              </div>

              {patient.previousVisits && patient.previousVisits.length > 0 && (
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 mb-4 text-[11px]">
                  <div className="text-[#64748B] font-bold mb-1">Previous OP History for {patient.umr}:</div>
                  <div className="space-y-1">
                    {patient.previousVisits.map((pv, i) => (
                      <div key={i} className="flex justify-between text-[#475569]">
                        <span>• {pv.date} (#{pv.opNumber}): {pv.diagnosis || "—"}</span>
                        <span className="text-[#64748B] font-medium">{pv.doctor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] text-[11px] text-[#64748B]">
                <span>Status: <strong className="text-[#166534] font-mono font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">{patient.status}</strong></span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setCurrentStep(1)} className="text-[12px] text-[#64748B] hover:text-gray-900 font-medium">← Back to Identification</button>
              <button onClick={() => setCurrentStep(3)} className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                Proceed to Symptom Capture &amp; AI Analysis →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SYMPTOMS & AI MATCH */}
        {currentStep === 3 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">3</span>
                Patient Symptoms &amp; AI Doctor Recommendation
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">Capture the patient's complaints, then match against the real eligible-doctors roster for this specialty and gender.</p>
            </div>

            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 block mb-1.5">Chief Complaint / Presenting Narrative</label>
              <textarea value={patient.chiefComplaint} onChange={e => setPatient({ ...patient, chiefComplaint: e.target.value })}
                placeholder="e.g. Patient complaining of severe chest tightness and shortness of breath since yesterday morning..."
                className="w-full h-20 border border-[#DDE2EC] rounded-lg p-3 text-[13px] focus:outline-none focus:border-[#1B4FD8]" />
            </div>

            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 block mb-2">Select Common Symptoms (Multi-select)</label>
              <div className="flex flex-wrap gap-2">
                {["Fever", "Headache", "Chest pain", "Breathing difficulty", "Sweating", "Cough", "Abdominal pain", "Back pain", "Joint swelling", "Vomiting", "Dizziness", "Fatigue"].map((sym) => {
                  const active = patient.symptoms.includes(sym);
                  return (
                    <button key={sym} type="button" onClick={() => toggleSymptom(sym)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${active ? "bg-[#1B4FD8] text-white border-[#1B4FD8] shadow-xs" : "bg-white text-gray-700 border-[#DDE2EC] hover:bg-[#F8FAFC]"}`}>
                      {active ? "✓ " : "+ "} {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button onClick={() => void runAiSymptomAnalysis()} disabled={aiAnalyzing || (patient.symptoms.length === 0 && !patient.chiefComplaint) || !patient.id}
                className="px-7 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#1B4FD8] hover:from-[#1E40AF] hover:to-[#2563EB] text-white text-[13px] font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50">
                {aiAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>✨</span>}
                {aiAnalyzing ? "Matching Specialty & Doctor..." : "Run Specialty & Doctor Recommendation"}
              </button>
            </div>

            {patient.status !== "Registered" && patient.aiSpecialty && (
              <div className="bg-[#F8FAFC] border-2 border-[#93C5FD] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-[#1D4ED8] text-white px-2.5 py-1 rounded-md">✨ Clinical Recommendation</span>
                    <span className="text-[12px] font-semibold text-[#1E3A8A] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">Confidence: {patient.aiConfidence}%</span>
                  </div>
                  <button onClick={() => setCurrentStep(4)} className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                    Check Availability &amp; Queue →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] space-y-1.5">
                    <div className="text-[11px] uppercase font-bold text-[#64748B] tracking-wider flex items-center gap-1.5"><span>🏥</span> Recommended Department</div>
                    <div className="text-[16px] font-bold text-[#1B4FD8]">{patient.aiSpecialty}</div>
                    <div className="text-[12px] text-gray-700 leading-relaxed pt-1">{patient.aiReasoning}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] space-y-1.5">
                    <div className="text-[11px] uppercase font-bold text-[#64748B] tracking-wider flex items-center gap-1.5"><span>👨‍⚕️</span> Matched Physician</div>
                    <div className="text-[16px] font-bold text-gray-900">{patient.aiDoctor || "No eligible doctor found"}</div>
                    <div className="text-[12px] text-gray-700 leading-relaxed pt-1">{patient.aiDoctorRationale}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: DOCTOR & QUEUE */}
        {currentStep === 4 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">4</span>
                Doctor Availability &amp; Real-time Queue
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Live doctor roster for <strong>{patient.aiSpecialty || "any department"}</strong>, filtered to <strong>{patient.sex === "Female" ? "Female" : "Male"}</strong> doctors matching the patient's gender.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {eligibleDoctors.length === 0 && (
                <div className="col-span-3 text-center text-[12.5px] text-[#94A3B8] py-8">No eligible doctors on record for this department.</div>
              )}
              {eligibleDoctors.map((doc) => {
                const isSelected = patient.assignedDoctor === doc.doctor_name;
                return (
                  <div key={doc.id} onClick={() => void assignDoctorAndQueue(doc)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${isSelected ? "border-[#1B4FD8] bg-[#EFF6FF] ring-2 ring-blue-500/20" : "border-[#DDE2EC] bg-white hover:border-[#94A3B8]"}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-[13.5px] text-gray-900">{doc.doctor_name}</div>
                        <div className="text-[11.5px] text-[#64748B]">{doc.department}</div>
                      </div>
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded uppercase ${doc.is_available ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3C7] text-[#B45309]"}`}>{doc.status}</span>
                    </div>
                    <div className="text-[11.5px] text-[#475569] flex justify-between pt-2 border-t border-[#F1F5F9]">
                      <span>Workload: <strong>{doc.current_workload} active patients</strong></span>
                      <span>Gender: {doc.gender}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {patient.assignedDoctor && (
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-bold text-gray-900">Assignment: {patient.assignedDoctor} ({patient.room})</div>
                  <div className="text-[11.5px] text-[#64748B] mt-0.5">
                    Token: <strong className="font-mono text-[#1B4FD8]">{patient.queueToken}</strong> · Queue Position: <strong className="text-[#D97706]">#{patient.queuePosition}</strong>
                  </div>
                </div>
                <button onClick={() => setCurrentStep(5)} className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                  Enter Doctor Consultation Workspace →
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: CONSULTATION */}
        {currentStep === 5 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">5</span>
                  Doctor Consultation &amp; Clinical Orders
                </h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">Record clinical assessment, prescribe medications, and order investigations.</p>
              </div>
              <span className="font-mono text-[11px] bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">Consulting: {patient.assignedDoctor}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Clinical Diagnosis</label>
                <Input value={patient.diagnosis} onChange={v => setPatient({ ...patient, diagnosis: v })} placeholder="Enter diagnosis..." />
              </div>
              <div>
                <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">ICD-10 Code</label>
                <Input value={patient.icd10} onChange={v => setPatient({ ...patient, icd10: v })} placeholder="e.g. I20.9" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[11.5px] font-semibold text-gray-700">Prescribed Medications</label>
                <button type="button" onClick={() => setPatient({ ...patient, prescription: [...patient.prescription, { medicine: "", dosage: "", frequency: "", duration: "" }] })}
                  className="text-[11.5px] font-medium text-[#1B4FD8] hover:underline">+ Add Medication</button>
              </div>
              <div className="space-y-2">
                {patient.prescription.map((rx, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
                    <Input value={rx.medicine} onChange={v => setPatient({ ...patient, prescription: patient.prescription.map((r, i) => i === idx ? { ...r, medicine: v } : r) })} placeholder="Medicine" />
                    <Input value={rx.dosage} onChange={v => setPatient({ ...patient, prescription: patient.prescription.map((r, i) => i === idx ? { ...r, dosage: v } : r) })} placeholder="Dosage" />
                    <Input value={rx.frequency} onChange={v => setPatient({ ...patient, prescription: patient.prescription.map((r, i) => i === idx ? { ...r, frequency: v } : r) })} placeholder="Frequency" />
                    <Input value={rx.duration} onChange={v => setPatient({ ...patient, prescription: patient.prescription.map((r, i) => i === idx ? { ...r, duration: v } : r) })} placeholder="Duration" />
                  </div>
                ))}
                {patient.prescription.length === 0 && <div className="text-[11.5px] text-[#94A3B8] py-2">No medications added yet.</div>}
              </div>
            </div>

            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Investigations Ordered (comma-separated)</label>
              <Input value={patient.investigations.join(", ")} onChange={v => setPatient({ ...patient, investigations: v.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="e.g. ECG 12-Lead, Lipid Profile" />
            </div>

            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Doctor Advice &amp; Instructions</label>
              <textarea value={patient.advice} onChange={e => setPatient({ ...patient, advice: e.target.value })} className="w-full h-16 border border-[#DDE2EC] rounded-lg p-2.5 text-[12.5px] focus:outline-none focus:border-[#1B4FD8]" />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setCurrentStep(4)} className="text-[12px] text-[#64748B] hover:text-gray-900 font-medium">← Back to Queue</button>
              <button onClick={() => void completeConsultation()} disabled={busy || (!patient.diagnosis && !patient.advice && patient.prescription.length === 0)}
                className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                {busy ? "Saving…" : "Complete Consultation ➔ Send to Post-Consult Vitals →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: NURSE VITALS */}
        {currentStep === 6 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">6</span>
                Post-Consultation Vitals &amp; Routing
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">Staff / Nurse records baseline physiological parameters and routes the patient onward.</p>
            </div>

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

            <div>
              <label className="text-[11.5px] font-semibold text-gray-700 block mb-1.5">Further Action / Department Routing</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {(["None", "Laboratory", "Pharmacy", "Radiology", "Admission", "Referral"] as const).map((act) => (
                  <button key={act} type="button" onClick={() => setPatient({ ...patient, furtherAction: act })}
                    className={`py-2 px-3 rounded-lg text-[12px] font-semibold border transition-all ${patient.furtherAction === act ? "bg-[#1B4FD8] text-white border-[#1B4FD8]" : "bg-white text-gray-700 border-[#DDE2EC] hover:bg-[#F8FAFC]"}`}>
                    {act}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setCurrentStep(5)} className="text-[12px] text-[#64748B] hover:text-gray-900 font-medium">← Back to Consultation</button>
              <button onClick={() => void completeVitalsAndAction()} disabled={busy}
                className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                {busy ? "Saving…" : "Proceed to Billing & Encounter Completion →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: BILLING */}
        {currentStep === 7 && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-bold">7</span>
                OP Billing, Payment &amp; Visit Completion
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">Record charges for the OP consultation, collect payment, and finalize the outpatient encounter.</p>
            </div>

            <div className="max-w-md mx-auto bg-[#F8FAFC] border border-[#DDE2EC] rounded-xl p-5 space-y-3 shadow-xs">
              <div className="text-[13px] font-bold text-gray-900 border-b border-[#E2E8F0] pb-2 flex justify-between">
                <span>OP Consultation Invoice</span>
                <span className="font-mono text-[#1B4FD8]">#{patient.opNumber}</span>
              </div>
              <div className="flex justify-between text-[12px] text-gray-700">
                <span>OP Doctor Consultation Fee ({patient.assignedDoctor}):</span>
                <Input value={String(patient.billing.consultationFee)} onChange={v => setPatient({ ...patient, billing: { ...patient.billing, consultationFee: Number(v) || 0, total: Number(v) || 0 } })} className="w-24 text-right" />
              </div>
              <div className="border-t border-[#E2E8F0] pt-2 flex justify-between text-[14px] font-bold text-gray-900">
                <span>Total Amount Due:</span>
                <span className="text-[#16A34A]">${patient.billing.total.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-[#E2E8F0]">
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Payment Method</label>
                <select value={patient.billing.mode} onChange={e => setPatient({ ...patient, billing: { ...patient.billing, mode: e.target.value } })} className="w-full border border-[#DDE2EC] rounded text-[12px] p-2 bg-white">
                  <option>Card</option>
                  <option>Cash</option>
                  <option>UPI / Digital</option>
                </select>
              </div>
            </div>

            <div className="flex justify-center">
              <button onClick={() => void completeBilling()} disabled={busy || patient.status === "OP Completed"}
                className="px-8 py-3 bg-[#16A34A] hover:bg-[#15803D] text-white text-[14px] font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50">
                <span>💾</span> {busy ? "Processing…" : "Mark OP Visit Completed & Save to Database"}
              </button>
            </div>

            {patient.status === "OP Completed" && (
              <div className="p-5 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl text-center space-y-3">
                <div className="text-3xl">🎉</div>
                <div className="text-base font-bold text-[#166534]">Outpatient Encounter #{patient.opNumber} Successfully Completed!</div>
                <p className="text-[12px] text-[#15803D] max-w-lg mx-auto">
                  Patient <strong>{patient.name}</strong>'s invoice has been recorded and paid, and their record is archived under permanent <strong>{patient.umr}</strong>.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Btn variant="outline" size="sm" onClick={() => window.print()}><Icon.Download /> Print OP Summary</Btn>
                  <Btn variant="primary" size="sm" onClick={() => { setPatient(EMPTY_PATIENT); setCurrentStep(1); }}>Start Next OP Patient</Btn>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
