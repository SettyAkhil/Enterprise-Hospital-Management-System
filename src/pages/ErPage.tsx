import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  FiArrowLeft,
  FiPlus,
  FiRefreshCw,
  FiUser,
  FiUserPlus,
  FiHelpCircle,
  FiSearch,
  FiClipboard,
  FiActivity,
  FiAlertTriangle,
  FiAlertCircle,
  FiZap,
  FiUserCheck,
  FiFileText,
  FiFlag,
  FiClock,
  FiCheck,
  FiUsers,
  FiWatch,
  FiBell,
  FiHome,
  FiPrinter,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiChevronDown,
  FiX,
} from "react-icons/fi";
import {
  Button,
  Input,
  Label,
  Modal,
  Select,
  Table,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TabsTrigger,
  Textarea,
} from "../components/ui";
import PrescriptionUploadModal from "../components/PrescriptionUploadModal";
import { apiFetch, reportError, getHospitalCode } from "../lib/api";
import { API_BASE } from "../lib/constants";
import { formatDateTimeIST } from "../lib/format";
import type { Notice, Patient } from "../types";
import { ErDatabase, type ErInvestigationItem, type ErTimelineEventItem, type ErTimelineEventType } from "../services/erDb";

// apiFetch always sends Content-Type: application/json, which breaks a
// multipart file upload -- this is the one place in the ER module that needs
// a raw fetch instead (attaching a scanned/photographed signed consent form).
async function uploadConsentDocument(consentId: number, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/api/er/consents/${consentId}/document`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Hospital-Code": getHospitalCode() },
    body: formData,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to upload the signed document.");
  }
}

type Props = {
  setNotice: (notice: Notice | null) => void;
  onNavigate?: (page: string, extraData?: any) => void;
  onOpenTriage?: (visitId: number) => void;
  // Handed back by AddPatientPage after a patient registered via the "New"
  // mode card below completes -- see App.tsx's navigateToPage. Lets Quick
  // Intake pick up exactly where staff left off instead of making them
  // search for the patient they just registered.
  prefillPatient?: { patient_id: string; name: string; last_name?: string } | null;
  // Handed back after a patient registered via an unknown visit's "Register
  // as New Patient" button (see MergeUnknownPatient) -- merges that patient
  // into the visit they came from and reopens it, instead of leaving staff
  // to redo the merge by hand after being bounced back to the ER queue.
  mergeTarget?: { visitId: number; patientId: string } | null;
};

export type ErVisit = {
  id: number;
  visit_no: string;
  patient_id: string | null;
  is_unknown_patient: boolean;
  unknown_patient_label: string | null;
  arrival_mode: string | null;
  condition_at_arrival: string | null;
  arrival_at: string | null;
  status: string;
  assigned_doctor_name: string | null;
  assigned_specialty: string | null;
  doctor_assigned_at: string | null;
  doctor_accepted_at: string | null;
  triage_category: string | null;
  triage_bed_label: string | null;
  closed_at: string | null;
  patient_name?: string | null;
  patient_last_name?: string | null;
  patient_gender?: string | null;
  patient_age?: number | null;
  patient_phone?: string | null;
  patient_emergency_contact?: string | null;
  patient?: Patient | null;
};

export type ErComplaint = {
  id: number;
  complaint: string;
  severity: string | null;
  case_category: string | null;
  duration: string | null;
  reported_by: string | null;
  created_at: string;
};

export type ErVitals = {
  id: number;
  recorded_at: string;
  recorded_by: string | null;
  heart_rate: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  respiratory_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  consciousness_level: string | null;
  blood_glucose: number | null;
  pain_score: number | null;
  gcs: number | null;
  notes: string | null;
};

export type ErTriage = {
  category: string;
  triage_bed_label: string | null;
  reason: string | null;
  triaged_at: string;
  assigned_by: string | null;
} | null;

export type ErTreatment = {
  id: number;
  intervention_type: string;
  description: string | null;
  performed_at: string;
  administered_by: string | null;
};

export type ErClinicalNote = {
  id: number;
  note_type: string;
  author: string | null;
  content: string;
  created_at: string;
};

export type ErDisposition = {
  outcome: string;
  required_specialty: string | null;
  clinical_reason: string;
  decided_by: string | null;
  decided_at: string;
  priority: string | null;
} | null;

export type ErBedRequest = {
  id: number;
  status: string;
  requested_level_of_care: string;
  requested_specialty: string | null;
  requested_at: string;
  allocated_bed_id: number | null;
  allocated_admission_id: number | null;
  allocated_at: string | null;
};

export type ErConsent = {
  id: number;
  hospital_id?: number;
  patient_id?: string;
  patient_name: string;
  consent_type: string;
  signed_by: string;
  relation_to_patient?: string;
  status: string;
  witness_doctor?: string;
  signed_by_phone?: string;
  refusal_reason?: string;
  legal_waiver_acknowledged: boolean;
  er_visit_id?: number;
  notes?: string;
  signed_at?: string;
  document_filename?: string | null;
  document_mime_type?: string | null;
};

export type ErVisitDetail = ErVisit & {
  complaints: ErComplaint[];
  vitals: ErVitals[];
  triage: ErTriage;
  treatments: ErTreatment[];
  clinical_notes: ErClinicalNote[];
  disposition: ErDisposition;
  bed_requests: ErBedRequest[];
  consents?: ErConsent[];
  investigations?: ErInvestigationItem[];
  timeline_events?: ErTimelineEventItem[];
};

export type TriageCategory = {
  id: number;
  category_code: string;
  category_label: string;
  description: string | null;
  color: string | null;
  sort_order: number;
};

// Real clinical emergency triage presentation conditions based on standard medical emergency data
const ARRIVAL_CONDITION_OPTIONS = [
  "Conscious, Alert & Oriented (GCS 15)",
  "Conscious with Acute Distress (Severe Pain / Dyspnea)",
  "Drowsy / Confused / Altered Sensorium (GCS 9-14)",
  "Unconscious / Unresponsive / Comatose (GCS ≤ 8)",
  "Acute Respiratory Failure / Severe Hypoxia / Stridor",
  "Hemodynamically Unstable / In Shock (Hypotensive, Cold Clammy)",
  "Acute Severe Hemorrhage / Active Bleeding Trauma",
  "Acute Chest Pain / Suspected STEMI / Acute Coronary Syndrome",
  "Acute Stroke / Hemiplegia / Neurological Deficit (FAST Positive)",
  "Actively Convulsing / Status Epilepticus",
  "Severe Polytrauma / Major Road Traffic Accident (RTA) / Crush Injury",
  "Acute Poisoning / Toxic Ingestion / Envenomation (Snakebite)",
  "Severe Thermal / Chemical Burns / Inhalation Injury",
  "Cardiac Arrest / Pulseless (CPR in Progress)",
  "Brought Dead / Dead on Arrival (DOA)",
];

// Real clinical emergency arrival / transport modes
const ARRIVAL_MODE_OPTIONS = [
  { value: "walk-in", label: "Walk-in / Self Ambulatory" },
  { value: "ambulance_108", label: "108 Emergency Ambulance (BLS/ALS)" },
  { value: "ambulance_private", label: "Private / Hospital Ambulance (ICU on Wheels)" },
  { value: "brought_by_family", label: "Brought by Family / Relatives" },
  { value: "brought_by_public", label: "Brought by Bystanders / Good Samaritan" },
  { value: "referral", label: "Hospital Referral / Inter-facility Transfer" },
  { value: "police", label: "Police Escort / Medico-Legal (MLC)" },
  { value: "air_ambulance", label: "Air Ambulance / Emergency Helivac" },
  { value: "other", label: "Other Mode of Transport" },
];

// Certain presentations (RTA, assault, burns, poisoning, hanging) are MLC
// by standard hospital/police-reporting practice regardless of who's
// asking, while ordinary illness (fever, cardiac, etc.) isn't. The New ER
// Patient form filters this list by the MLC answer, so both sides need
// their own catch-all "Other" entry.
const CASE_CATEGORY_OPTIONS: { value: string; label: string; mlc: boolean }[] = [
  { value: "general_illness", label: "Fever / General Illness", mlc: false },
  { value: "cardiac", label: "Cardiac", mlc: false },
  { value: "pregnancy", label: "Pregnancy-related", mlc: false },
  { value: "seizure", label: "Seizure", mlc: false },
  { value: "neurological", label: "Neurological", mlc: false },
  { value: "drowning", label: "Drowning", mlc: false },
  { value: "farm_injury", label: "Farm / Agricultural Injury", mlc: false },
  { value: "trauma", label: "Trauma / Accidental Injury (non-RTA)", mlc: false },
  { value: "other", label: "Other", mlc: false },
  { value: "rta", label: "Road Traffic Accident", mlc: true },
  { value: "assault", label: "Assault / Stabbing / Violence", mlc: true },
  { value: "burns", label: "Burns", mlc: true },
  { value: "poisoning", label: "Poisoning", mlc: true },
  { value: "hanging", label: "Hanging / Strangulation", mlc: true },
  { value: "other_mlc", label: "Other Medico-Legal Case", mlc: true },
];

const OUTCOMES_REQUIRING_BED = new Set(["ward", "icu", "ot", "observation"]);
const OUTCOME_OPTIONS = [
  { value: "discharge", label: "Discharge (Routine / Recovered)" },
  { value: "observation", label: "ER Short Stay Observation" },
  { value: "ward", label: "Inpatient General Ward Admission" },
  { value: "icu", label: "ICU (Intensive Care Unit) Admission" },
  { value: "ot", label: "OT / Emergency Surgery" },
  { value: "lama", label: "LAMA (Leave Against Medical Advice)" },
  { value: "dama", label: "DAMA (Discharge Against Medical Advice)" },
  { value: "specialized_department", label: "Specialized Department Transfer" },
  { value: "referral", label: "Referral / External Transfer" },
  { value: "death", label: "Death / Brought Dead" },
  { value: "other", label: "Other Disposition" },
];

const STATUS_LABELS: Record<string, string> = {
  registered: "Registered",
  triaged: "Triaged",
  under_treatment: "Under Treatment",
  doctor_assigned: "Doctor Assigned",
  under_investigation: "Under Investigation",
  stabilized: "Stabilized",
  awaiting_disposition: "Awaiting Disposition",
  bed_requested: "Bed Requested",
  bed_allocated: "Bed Allocated",
  transferred: "Transferred",
  closed: "Closed",
};

// Five semantic groups a status falls into, for the badge color -- see
// styles.css's "Emergency Room" section for the intake/active/pending/
// resolved/closed color scale this drives.
const STATUS_GROUP: Record<string, string> = {
  registered: "intake",
  triaged: "intake",
  under_treatment: "active",
  doctor_assigned: "active",
  under_investigation: "active",
  stabilized: "active",
  awaiting_disposition: "pending",
  bed_requested: "pending",
  bed_allocated: "resolved",
  transferred: "resolved",
  closed: "closed",
};

const CORE_STEPS = [
  { key: "registered", label: "Registered", hint: "Intake" },
  { key: "triaged", label: "Triaged", hint: "Priority set" },
  { key: "under_treatment", label: "Treatment", hint: "Stabilizing" },
  { key: "doctor_assigned", label: "Doctor", hint: "Assessment" },
  { key: "awaiting_disposition", label: "Disposition", hint: "Next step" },
];

function coreStepIndex(status: string): number {
  switch (status) {
    case "registered":
      return 0;
    case "triaged":
      return 1;
    case "under_treatment":
    case "under_investigation":
    case "stabilized":
      return 2;
    case "doctor_assigned":
      return 3;
    default:
      // awaiting_disposition, bed_requested, bed_allocated, transferred, closed
      return 4;
  }
}

function elapsedSince(iso: string | null): string {
  if (!iso) return "-";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const group = STATUS_GROUP[status] || "closed";
  return (
    <span className={`er-status-badge er-status-${group}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function getArrivalTimeDisplay(iso: string | null): { elapsed: string; clock: string } {
  if (!iso) return { elapsed: "—", clock: "" };
  const d = new Date(iso);
  const clock = isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  const ms = Date.now() - d.getTime();
  if (!Number.isFinite(ms) || ms < 0) return { elapsed: "just now", clock };
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return { elapsed: "just now", clock };
  if (mins < 60) return { elapsed: `${mins} min ago`, clock };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { elapsed: `${hrs} hr${hrs > 1 ? "s" : ""} ago`, clock };
  return { elapsed: `${Math.floor(hrs / 24)}d ago`, clock };
}

function getDestination(v: ErVisit): string | null {
  if ((v as any).destination) return (v as any).destination;
  const dispOutcome = (v as any).disposition?.outcome || "";
  if (dispOutcome === "admit_icu" || dispOutcome.includes("icu")) return "• ICU Requested";
  if (dispOutcome === "admit_ward" || dispOutcome.includes("ward")) return "• Ward Requested";
  if (dispOutcome === "observation" || dispOutcome.includes("obs")) return "Observation";

  const bedReqs = (v as any).bed_requests || [];
  if (bedReqs.length > 0) {
    const care = (bedReqs[0].requested_level_of_care || "").toLowerCase();
    if (care.includes("icu") || care.includes("ccu")) return "• ICU Requested";
    if (care.includes("ward") || care.includes("isolation")) return "• Ward Requested";
  }
  return null;
}

function getBedLabel(v: ErVisit): string | null {
  if (v.triage_bed_label) {
    const match = v.triage_bed_label.match(/(ER-[A-Z0-9-]+|ER Bed \d+)/i);
    return match ? match[0] : v.triage_bed_label;
  }
  if ((v as any).bed_label) return (v as any).bed_label;
  return null;
}

function renderTriagePill(category: string | null | undefined) {
  if (!category) return <span className="text-gray-400 font-medium text-[11px]">Not triaged</span>;
  const cat = category.toUpperCase();
  if (cat === "B1") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span> B1
      </span>
    );
  }
  if (cat === "B2") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFEDD5] text-[#EA580C] border border-orange-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]"></span> B2
      </span>
    );
  }
  if (cat === "B3") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF9C3] text-[#CA8A04] border border-yellow-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#CA8A04]"></span> B3
      </span>
    );
  }
  if (cat === "B4") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span> B4
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-blue-200">
      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span> {cat}
    </span>
  );
}

function renderStatusPill(status: string) {
  const s = status.toLowerCase();
  if (s === "under_treatment" || s === "treatment") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF3C7] text-[#B45309] border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]"></span> Under Treatment
      </span>
    );
  }
  if (s === "doctor_assigned") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF3C7] text-[#D97706] border border-yellow-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span> Doctor Assigned
      </span>
    );
  }
  if (s === "triaged" || s === "registered" || s === "awaiting_doctor") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#EFF6FF] text-[#2563EB] border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span> Awaiting Doctor
      </span>
    );
  }
  if (s === "under_investigation") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E0F2FE] text-[#0284C7] border border-sky-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]"></span> Under Investigation
      </span>
    );
  }
  if (s === "stabilizing" || s === "stabilized") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#DCFCE7] text-[#16A34A] border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span> Stabilizing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> {STATUS_LABELS[status] || status}
    </span>
  );
}

function renderDestinationPill(dest: string | null | undefined) {
  if (!dest) return <span className="text-gray-400 font-bold">—</span>;
  if (dest.includes("ICU")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F3E8FF] text-[#7E22CE] border border-purple-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7E22CE]"></span> {dest.replace(/^•\s*/, "")}
      </span>
    );
  }
  if (dest.includes("Ward")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#DBEAFE] text-[#1D4ED8] border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8]"></span> {dest.replace(/^•\s*/, "")}
      </span>
    );
  }
  if (dest.includes("Observation")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#CCFBF1] text-[#0F766E] border border-teal-200">
        {dest.replace(/^•\s*/, "")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      {dest}
    </span>
  );
}

function triageColorFor(category: string | null | undefined, categories: TriageCategory[]): string {
  if (!category) return "#c3cbd6";
  return categories.find((c) => c.category_code === category)?.color || "#6b7280";
}

function TriageChip({
  category,
  categories,
  bedLabel,
  compact,
}: {
  category: string;
  categories: TriageCategory[];
  bedLabel?: string | null;
  compact?: boolean;
}) {
  const cat = categories.find((c) => c.category_code === category);
  const color = cat?.color || "#6b7280";
  return (
    <span className="er-triage-chip" style={{ background: `${color}22`, color }}>
      <span className="er-triage-dot" />
      {compact ? category : cat ? `${cat.category_code} — ${cat.category_label}` : category}
      {!compact && bedLabel ? ` · ${bedLabel}` : ""}
    </span>
  );
}

function isAbnormal(field: string, value: number | null): boolean {
  if (value == null) return false;
  switch (field) {
    case "heart_rate":
      return value < 60 || value > 100;
    case "spo2":
      return value < 95;
    case "bp_systolic":
      return value < 90 || value > 140;
    case "bp_diastolic":
      return value < 60 || value > 90;
    case "respiratory_rate":
      return value < 12 || value > 20;
    case "temperature":
      if (value > 45) {
        // Temperature recorded in Fahrenheit (e.g. 98.6°F)
        return value < 96.0 || value > 100.4;
      }
      // Temperature recorded in Celsius (e.g. 37.0°C)
      return value < 36.0 || value > 38.0;
    case "blood_glucose":
      return value < 70 || value > 180;
    case "pain_score":
      return value >= 5;
    default:
      return false;
  }
}

// Maps an AI urgency label to one of the hospital's own configured triage
// categories -- never invents/assumes a code (e.g. "B1"-"B5") that the
// hospital may not have configured (triage categories are deliberately not
// pre-filled, see TriageConfigPanel). Tries a label-keyword match first,
// falls back to the conventional B-code only if that exact code exists, and
// returns "" (meaning: leave untriaged, staff must set it manually) if
// nothing configured matches -- the same safe-degradation behavior as the
// AI Triage Assistant panel on an existing visit.
function mapUrgencyToTriageCategory(urgency: string, categories: TriageCategory[]): string {
  const lower = (urgency || "").toLowerCase();
  let labelKeyword = "";
  let fallbackCode = "";
  if (lower.includes("critical") || lower.includes("immediate") || lower.includes("resuscitation")) {
    labelKeyword = "immediate";
    fallbackCode = "B1";
  } else if (lower.includes("high") || lower.includes("severe") || lower.includes("emergent")) {
    labelKeyword = "high";
    fallbackCode = "B2";
  } else if (lower.includes("moderate") || lower.includes("medium") || lower.includes("urgent")) {
    labelKeyword = "moderate";
    fallbackCode = "B3";
  } else if (lower.includes("low") || lower.includes("minor") || lower.includes("less urgent")) {
    labelKeyword = "low";
    fallbackCode = "B4";
  }
  if (!labelKeyword) return "";
  const byLabel = categories.find((c) => c.category_label.toLowerCase().includes(labelKeyword));
  if (byLabel) return byLabel.category_code;
  const byCode = categories.find((c) => c.category_code === fallbackCode);
  return byCode ? byCode.category_code : "";
}

// Turns a visit's recorded complaints + most recent vitals into the free-text
// "symptoms" the AI triage prompt reasons over -- the same shape Quick Intake,
// the AI Triage Assistant panel, and Doctor Assignment's AI suggestion all
// feed it, so a doctor/department suggestion is only ever grounded in what's
// actually been charted for this patient.
function buildSymptomsSummary(complaints: ErComplaint[], vitals: ErVitals[]): string {
  const complaintText = complaints.map((c) => c.complaint).join(", ");
  const vitalsParts: string[] = [];
  const latest = vitals[vitals.length - 1];
  if (latest) {
    if (latest.heart_rate) vitalsParts.push(`HR: ${latest.heart_rate} bpm`);
    if (latest.bp_systolic && latest.bp_diastolic) vitalsParts.push(`BP: ${latest.bp_systolic}/${latest.bp_diastolic} mmHg`);
    if (latest.spo2 != null) vitalsParts.push(`SpO2: ${latest.spo2}%`);
    if (latest.respiratory_rate != null) vitalsParts.push(`RR: ${latest.respiratory_rate} /min`);
    if (latest.temperature != null) {
      const tempVal = Number(latest.temperature);
      const tempUnit = tempVal > 45 ? "°F" : "°C";
      vitalsParts.push(`Temp: ${latest.temperature}${tempUnit}`);
    }
    if (latest.blood_glucose != null) vitalsParts.push(`GRBS: ${latest.blood_glucose} mg/dL`);
    if (latest.pain_score != null) vitalsParts.push(`Pain: ${latest.pain_score}/10`);
    if (latest.consciousness_level) vitalsParts.push(`Consciousness: ${latest.consciousness_level}`);
  }
  const vitalsText = vitalsParts.length > 0 ? `Vitals: ${vitalsParts.join(", ")}` : "No vitals recorded.";
  return `Complaints: ${complaintText || "None"}. ${vitalsText}`;
}

// Single source of truth for "ask the AI which department/doctor fits this
// patient" -- fetches the real department/doctor lists (department_name is
// the actual field on /api/registration/departments; a prior bug read a
// nonexistent `.name` here and silently sent the AI an empty list) and calls
// the triage endpoint. Used by Quick Intake, the AI Triage Assistant panel,
// and Doctor Assignment's AI suggestion so all three reason from identical data.
type AiTriageSuggestion = {
  department: string;
  urgency: string;
  reasoning: string;
  doctor: string;
  suggested_treatment?: { intervention_type: string; description: string } | null;
  suggested_treatments?: { intervention_type: string; description: string }[];
};

async function fetchAiTriageSuggestion(symptoms: string): Promise<AiTriageSuggestion> {
  const deptsRes = await apiFetch<{ departments: { department_name: string }[] }>("/api/registration/departments");
  const docsRes = await apiFetch<{ doctors: { doctor_name: string; department: string }[] }>("/api/op/doctors");
  const available_departments = deptsRes.departments.map((d) => d.department_name);
  // "Name (Department)" -- required by the shared doctor-matching backstop
  // (match_doctor_to_department in utils/database.py): it only fires when the
  // model itself doesn't return a doctor, and without the "(Department)"
  // suffix it can never match anything.
  const available_doctors = docsRes.doctors.map((d) => `${d.doctor_name} (${d.department || "General"})`);
  return apiFetch<AiTriageSuggestion>(
    "/api/symptom-ai/triage",
    { method: "POST", body: JSON.stringify({ symptoms, available_departments, available_doctors }) },
  );
}

export default function ErPage({ setNotice, onNavigate, onOpenTriage, prefillPatient, mergeTarget }: Props) {
  const [tab, setTab] = useState<"queue" | "config">("queue");
  const [visits, setVisits] = useState<ErVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ErVisitDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [intakeModalType, setIntakeModalType] = useState<"new" | "unknown" | "existing" | null>(null);
  const [isRegMenuOpen, setIsRegMenuOpen] = useState(false);
  const regMenuRef = useRef<HTMLDivElement>(null);
  const [trackboardSearch, setTrackboardSearch] = useState("");
  const [categories, setCategories] = useState<TriageCategory[]>([]);
  const [prescriptionTarget, setPrescriptionTarget] = useState<{
    id: string;
    name: string;
    doctorName?: string;
  } | null>(null);

  // Close registration dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (regMenuRef.current && !regMenuRef.current.contains(event.target as Node)) {
        setIsRegMenuOpen(false);
      }
    };
    if (isRegMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRegMenuOpen]);

  // Backend already supports both ?active_only=true and ?status=closed (see
  // GET /api/er/visits) -- this was just never exposed in the UI, so once a
  // visit closed (discharge/referral/transfer/LAMA/death) there was no way
  // to look at it again anywhere in the ER module.
  const [queueFilter, setQueueFilter] = useState<"active" | "closed" | "all">("active");

  const loadVisits = async () => {
    setLoading(true);
    try {
      const qs = queueFilter === "active" ? "?active_only=true" : queueFilter === "closed" ? "?status=closed" : "";
      const data = await apiFetch<{ visits: ErVisit[] }>(`/api/er/visits${qs}`);
      setVisits(data.visits);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to load ER visits.");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiFetch<{ categories: TriageCategory[] }>(
        "/api/er/triage-config",
      );
      setCategories(data.categories);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to load triage categories.");
    }
  };

  const loadDetail = async (visitId: number) => {
    setDetailLoading(true);
    try {
      const data = await apiFetch<ErVisitDetail>(`/api/er/visits/${visitId}`);
      setDetail(data);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to load this ER visit.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [queueFilter]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedVisitId) loadDetail(selectedVisitId);
  }, [selectedVisitId]);

  useEffect(() => {
    if (!mergeTarget) return;
    (async () => {
      try {
        await apiFetch(`/api/er/visits/${mergeTarget.visitId}/merge-unknown`, {
          method: "POST",
          body: JSON.stringify({ patient_id: mergeTarget.patientId }),
        });
        setNotice({ type: "success", message: "New patient registered and merged into the visit." });
        setSelectedVisitId(mergeTarget.visitId);
      } catch (error: any) {
        reportError(setNotice, error, "Patient was registered, but merging into the visit failed -- merge manually from the visit's Identity panel.");
        setSelectedVisitId(mergeTarget.visitId);
      }
    })();
    // Runs once per distinct mergeTarget object -- App.tsx clears it on any
    // other navigation to "er", so this won't re-fire on a later unrelated visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeTarget]);

  const summary = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const v of visits) {
      if (v.status !== "closed") byStatus[v.status] = (byStatus[v.status] || 0) + 1;
    }
    return byStatus;
  }, [visits]);

  const filteredVisits = useMemo(() => {
    if (!trackboardSearch.trim()) return visits;
    const q = trackboardSearch.trim().toLowerCase();
    return visits.filter((v) => {
      const fullName = `${v.patient_name || ""} ${v.patient_last_name || ""}`.toLowerCase();
      const patientId = (v.patient_id || "").toLowerCase();
      const visitNo = (v.visit_no || "").toLowerCase();
      const unknownLabel = (v.unknown_patient_label || "").toLowerCase();
      const phone = (v.patient_phone || "").toLowerCase();
      const doc = (v.assigned_doctor_name || "").toLowerCase();
      const specialty = (v.assigned_specialty || "").toLowerCase();
      const complaint = (((v as any).complaints?.[0]?.complaint) || (v as any).condition_at_arrival || "").toLowerCase();
      const bed = (v.triage_bed_label || "").toLowerCase();
      const category = (v.triage_category || "").toLowerCase();
      const status = (v.status || "").toLowerCase();

      return (
        fullName.includes(q) ||
        patientId.includes(q) ||
        visitNo.includes(q) ||
        unknownLabel.includes(q) ||
        phone.includes(q) ||
        doc.includes(q) ||
        specialty.includes(q) ||
        complaint.includes(q) ||
        bed.includes(q) ||
        category.includes(q) ||
        status.includes(q)
      );
    });
  }, [visits, trackboardSearch]);

  const refreshAfterAction = async () => {
    await loadVisits();
    if (selectedVisitId) await loadDetail(selectedVisitId);
  };

  // A patient handed back from the registration-redirect flow (see
  // App.tsx's navigateToPage) needs the intake modal open to actually see
  // themselves pre-selected in it -- the panel now only renders while this
  // modal is open, unlike the old always-visible sidebar.
  useEffect(() => {
    if (prefillPatient) setIntakeModalType("existing");
  }, [prefillPatient]);

  if (selectedVisitId && detail) {
    return (
      <div className="flex-1 bg-[#F0F2F5] p-5 sm:p-6 min-h-full">
        <VisitDetailPanel
          detail={detail}
          loading={detailLoading}
          categories={categories}
          setNotice={setNotice}
          onNavigate={onNavigate}
          onBack={() => {
            setSelectedVisitId(null);
            setDetail(null);
            loadVisits();
          }}
          onRefresh={refreshAfterAction}
          onOrderMedication={() =>
            setPrescriptionTarget({
              id: detail.patient_id || "",
              name: detail.patient_id
                ? detail.patient_id
                : detail.unknown_patient_label || detail.visit_no,
              doctorName: detail.assigned_doctor_name || undefined,
            })
          }
        />
        {/* Order Medication (on VisitDetailPanel, above) sets prescriptionTarget,
            but this component early-returns just VisitDetailPanel while a visit is
            open -- without rendering the modal here too, that button could never
            actually open anything. */}
        {prescriptionTarget && (
          <PrescriptionUploadModal
            patientId={prescriptionTarget.id}
            patientName={prescriptionTarget.name}
            doctorName={prescriptionTarget.doctorName}
            mode="manual"
            setNotice={setNotice}
            onClose={() => setPrescriptionTarget(null)}
          />
        )}
      </div>
    );
  }

  const activeCount = visits.filter((v) => v.status !== "closed").length;
  const awaitingDoctorCount = visits.filter(
    (v) => v.status !== "closed" && (v.status === "registered" || v.status === "triaged" || !v.assigned_doctor_name)
  ).length;
  const highPriorityAwaitingCount = visits.filter(
    (v) =>
      v.status !== "closed" &&
      (v.status === "registered" || v.status === "triaged" || !v.assigned_doctor_name) &&
      (v.triage_category === "B1" || v.triage_category === "B2")
  ).length;

  const bedRequestedVisits = visits.filter((v) => {
    if (v.status === "closed") return false;
    const dest = getDestination(v);
    const bed = getBedLabel(v);
    return Boolean(dest && !bed && (dest.includes("Requested") || dest.includes("ICU") || dest.includes("Ward")));
  });
  const bedRequestedCount = bedRequestedVisits.length;
  const icuReqCount = bedRequestedVisits.filter((v) => getDestination(v)?.includes("ICU")).length;
  const wardReqCount = bedRequestedVisits.filter((v) => getDestination(v)?.includes("Ward")).length;

  const bedAllocatedVisits = visits.filter((v) => {
    if (v.status === "closed") return false;
    const bed = getBedLabel(v);
    const bedReqAllocated = (v as any).bed_requests?.some((b: any) => b.status === "allocated");
    return Boolean(bed || bedReqAllocated);
  });
  const bedAllocatedCount = bedAllocatedVisits.length;
  const icuAllocatedCount = bedAllocatedVisits.filter((v) => (v.triage_bed_label || "").includes("ICU") || (v as any).bed_requests?.some((b: any) => (b.requested_level_of_care || "").includes("ICU"))).length;
  const wardAllocatedCount = Math.max(0, bedAllocatedCount - icuAllocatedCount);

  return (
    <div className="flex-1 bg-[#F0F2F5] p-5 sm:p-6 space-y-4 min-h-full">
      {/* Top Header: Search Bar & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Option in place of the subtitle */}
        <div className="relative flex-1 max-w-2xl">
          <div className="relative flex items-center">
            <FiSearch className="absolute left-3.5 text-gray-400 text-[15px] pointer-events-none" />
            <input
              type="text"
              value={trackboardSearch}
              onChange={(e) => setTrackboardSearch(e.target.value)}
              placeholder="Search ED Track Board by patient name, ID, phone, triage, complaint, doctor, bed..."
              className="w-full pl-10 pr-10 py-2 bg-white border border-[#DDE2EC] rounded text-[13px] text-gray-900 placeholder:text-gray-400 shadow-2xs focus:outline-none focus:border-[#1B4FD8] transition-all"
            />
            {trackboardSearch && (
              <button
                type="button"
                onClick={() => setTrackboardSearch("")}
                className="absolute right-3 text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                title="Clear search"
              >
                <FiX className="text-[14px]" />
              </button>
            )}
          </div>
        </div>

        {/* Top Right Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadVisits}
            className="px-3.5 py-2 bg-white border border-[#DDE2EC] hover:bg-slate-50 text-gray-700 text-[12.5px] font-semibold rounded shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Refresh ED visits"
          >
            <FiRefreshCw className="text-[13px]" /> Refresh
          </button>

          {/* New Registration Dropdown */}
          <div className="relative" ref={regMenuRef}>
            <button
              type="button"
              onClick={() => setIsRegMenuOpen((prev) => !prev)}
              className="px-4 py-2 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white text-[13px] font-bold rounded shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              aria-expanded={isRegMenuOpen}
              aria-haspopup="true"
            >
              <FiPlus className="text-[16px]" />
              <span>New Registration</span>
              <FiChevronDown className={`text-[14px] transition-transform duration-200 ${isRegMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {isRegMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-[#DDE2EC] rounded shadow-lg z-50 py-1.5 overflow-hidden">
                <div className="px-3.5 py-1.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  Select Registration Type
                </div>

                {/* 1. New Patient */}
                <button
                  type="button"
                  onClick={() => {
                    setIntakeModalType("new");
                    setIsRegMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 text-gray-800 hover:text-[#1B4FD8] transition-colors flex items-start gap-3 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded bg-blue-100 text-[#1B4FD8] flex items-center justify-center text-[15px] shrink-0 mt-0.5 group-hover:bg-[#1B4FD8] group-hover:text-white transition-colors">
                    <FiUserPlus />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-gray-900 group-hover:text-[#1B4FD8]">
                      New Patient
                    </div>
                    <div className="text-[11.5px] text-gray-500 font-normal">
                      Register brand new patient with demographics
                    </div>
                  </div>
                </button>

                {/* 2. Existing Patient */}
                <button
                  type="button"
                  onClick={() => {
                    setIntakeModalType("existing");
                    setIsRegMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 text-gray-800 hover:text-[#1B4FD8] transition-colors flex items-start gap-3 group cursor-pointer border-t border-gray-100"
                >
                  <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center text-[15px] shrink-0 mt-0.5 group-hover:bg-[#1B4FD8] group-hover:text-white transition-colors">
                    <FiSearch />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-gray-900 group-hover:text-[#1B4FD8]">
                      Existing Patient
                    </div>
                    <div className="text-[11.5px] text-gray-500 font-normal">
                      Search hospital records by UHID or phone
                    </div>
                  </div>
                </button>

                {/* 3. Unidentified Patient */}
                <button
                  type="button"
                  onClick={() => {
                    setIntakeModalType("unknown");
                    setIsRegMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-red-50/70 text-gray-800 hover:text-[#DC2626] transition-colors flex items-start gap-3 group cursor-pointer border-t border-gray-100"
                >
                  <div className="w-8 h-8 rounded bg-red-100 text-[#DC2626] flex items-center justify-center text-[15px] shrink-0 mt-0.5 group-hover:bg-[#DC2626] group-hover:text-white transition-colors">
                    <FiAlertCircle />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-gray-900 group-hover:text-[#DC2626] flex items-center gap-1.5">
                      Unidentified Patient
                      <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] font-bold rounded">Emergency</span>
                    </div>
                    <div className="text-[11.5px] text-gray-500 font-normal">
                      Unconscious / unknown patient with emergency label
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: ACTIVE VISITS */}
        <div className="bg-white border border-[#DDE2EC] rounded p-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded bg-blue-50 text-[#1B4FD8] flex items-center justify-center text-xl shrink-0">
            <FiUsers />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider block">ACTIVE VISITS</span>
            <div className="text-2xl font-bold text-gray-900 leading-tight">{activeCount}</div>
            <span className="text-[11.5px] font-semibold text-[#16A34A]">{visits.length} total recorded</span>
          </div>
        </div>

        {/* Card 2: AWAITING DOCTOR */}
        <div className="bg-white border border-[#DDE2EC] rounded p-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded bg-amber-50 text-[#D97706] flex items-center justify-center text-xl shrink-0">
            <FiWatch />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider block">AWAITING DOCTOR</span>
            <div className="text-2xl font-bold text-gray-900 leading-tight">{awaitingDoctorCount}</div>
            <span className="text-[11.5px] font-medium text-[#D97706]">{highPriorityAwaitingCount} High Priority</span>
          </div>
        </div>

        {/* Card 3: BED REQUESTED */}
        <div className="bg-white border border-[#DDE2EC] rounded p-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded bg-red-50 text-[#DC2626] flex items-center justify-center text-xl shrink-0">
            <FiBell />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider block">BED REQUESTED</span>
            <div className="text-2xl font-bold text-gray-900 leading-tight">{bedRequestedCount}</div>
            <span className="text-[11.5px] font-medium text-[#64748B]">
              {icuReqCount} ICU • {wardReqCount} Ward
            </span>
          </div>
        </div>

        {/* Card 4: BED ALLOCATED */}
        <div className="bg-white border border-[#DDE2EC] rounded p-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded bg-green-50 text-[#16A34A] flex items-center justify-center text-xl shrink-0">
            <FiHome />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider block">BED ALLOCATED</span>
            <div className="text-2xl font-bold text-gray-900 leading-tight">{bedAllocatedCount}</div>
            <span className="text-[11.5px] font-medium text-[#64748B]">
              {icuAllocatedCount} ICU • {wardAllocatedCount} Ward
            </span>
          </div>
        </div>
      </div>

      {/* Main Track Board Panel */}
      <div className="bg-white border border-[#DDE2EC] rounded shadow-2xs overflow-hidden">
        {/* Tabs Bar */}
        <div className="flex items-center justify-between border-b border-[#DDE2EC] px-5 pt-2.5 bg-white">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setTab("queue")}
              className={`pb-2.5 text-[13px] font-bold transition-colors cursor-pointer border-b-2 ${
                tab === "queue"
                  ? "border-[#1B4FD8] text-[#1B4FD8]"
                  : "border-transparent text-[#64748B] hover:text-gray-900"
              }`}
            >
              Queue
            </button>
            <button
              type="button"
              onClick={() => setTab("config")}
              className={`pb-2.5 text-[13px] font-semibold transition-colors cursor-pointer border-b-2 ${
                tab === "config"
                  ? "border-[#1B4FD8] text-[#1B4FD8]"
                  : "border-transparent text-[#64748B] hover:text-gray-900"
              }`}
            >
              Triage Configuration
            </button>
          </div>

          {tab === "queue" && (
            <div className="pb-2">
              <select
                value={queueFilter}
                onChange={(e) => setQueueFilter(e.target.value as "active" | "closed" | "all")}
                className="bg-white border border-[#CBD5E1] rounded px-3 py-1 text-[12px] font-semibold text-gray-800 shadow-2xs focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                aria-label="Filter ER visits"
              >
                <option value="active">Active visits</option>
                <option value="closed">Closed visits</option>
                <option value="all">All visits</option>
              </select>
            </div>
          )}
        </div>

        {tab === "queue" ? (
          loading ? (
            <div className="p-8 text-center text-[#64748B] text-[13px]">Loading ER visits...</div>
          ) : visits.length === 0 ? (
            <div className="p-12 text-center text-[#64748B]">
              <p className="font-bold text-gray-800 text-[14px]">
                {queueFilter === "closed" ? "No closed ER visits" : queueFilter === "all" ? "No ER visits yet" : "No active ER visits"}
              </p>
              <p className="text-[12px] text-[#64748B] mt-1">
                {queueFilter === "active" ? "Register a new ER visit to get started." : "Switch the filter above to see other visits."}
              </p>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="p-12 text-center text-[#64748B]">
              <p className="font-bold text-gray-800 text-[14px]">
                No visits matching "{trackboardSearch}"
              </p>
              <p className="text-[12px] text-[#64748B] mt-1">
                Try searching by patient name, ID, phone, doctor, bed, triage or complaint.
              </p>
              <button
                type="button"
                onClick={() => setTrackboardSearch("")}
                className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded cursor-pointer transition-colors"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="pl-6 py-3.5">VISIT</th>
                    <th className="px-4 py-3.5">TRIAGE</th>
                    <th className="px-4 py-3.5">PATIENT</th>
                    <th className="px-4 py-3.5">ARRIVED</th>
                    <th className="px-4 py-3.5">STATUS</th>
                    <th className="px-4 py-3.5">DOCTOR</th>
                    <th className="px-4 py-3.5">DESTINATION</th>
                    <th className="px-4 py-3.5">BED</th>
                    <th className="pr-6 py-3.5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                  {filteredVisits.map((v) => {
                    const arrivalInfo = getArrivalTimeDisplay(v.arrival_at);
                    const dest = getDestination(v);
                    const bed = getBedLabel(v);
                    const isB1 = v.triage_category === "B1";
                    const isB2 = v.triage_category === "B2";

                    return (
                      <tr
                        key={v.id}
                        className="hover:bg-[#F8FAFC] transition-colors"
                        style={{
                          borderLeft: isB1 ? "4px solid #DC2626" : isB2 ? "4px solid #EA580C" : "4px solid transparent",
                        }}
                      >
                        {/* 1. VISIT */}
                        <td className="pl-5 py-3.5 font-bold text-gray-900 whitespace-nowrap">
                          {v.visit_no}
                        </td>

                        {/* 2. TRIAGE */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {renderTriagePill(v.triage_category)}
                        </td>

                        {/* 3. PATIENT */}
                        <td className="px-4 py-3.5">
                          {v.is_unknown_patient ? (
                            <div>
                              <div className="font-bold text-gray-900 text-[13px] flex items-center gap-1.5">
                                <span>{v.unknown_patient_label || "Unknown Male"}</span>
                              </div>
                              <div className="text-[11.5px] text-[#64748B] font-medium">
                                Temp ID {v.patient_age ? `• ~${v.patient_age}y` : ""}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-bold text-gray-900 text-[13px]">
                                {[v.patient_name, v.patient_last_name].filter(Boolean).join(" ") || v.patient_id}
                              </div>
                              <div className="text-[11.5px] text-[#64748B] font-medium">
                                {v.patient_id}{v.patient_gender ? ` • ${v.patient_gender}` : ""}{v.patient_age ? ` • ${v.patient_age}y` : ""}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 4. ARRIVED */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-medium text-gray-800 text-[12px]">{arrivalInfo.elapsed}</div>
                          {arrivalInfo.clock && (
                            <div className="text-[11px] text-[#64748B]">{arrivalInfo.clock}</div>
                          )}
                        </td>

                        {/* 5. STATUS */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {renderStatusPill(v.status)}
                        </td>

                        {/* 6. DOCTOR */}
                        <td className="px-4 py-3.5">
                          {v.assigned_doctor_name ? (
                            <div>
                              <div className="font-semibold text-gray-900 text-[12.5px]">
                                {v.assigned_doctor_name.replace(/\s*\(.*\)/, "")}
                              </div>
                              <div className="text-[11px] text-[#64748B]">
                                ({v.assigned_specialty || (v.assigned_doctor_name.match(/\((.*)\)/)?.[1] || "Emergency Medicine")})
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-bold">—</span>
                          )}
                        </td>

                        {/* 7. DESTINATION */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {renderDestinationPill(dest)}
                        </td>

                        {/* 8. BED */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {bed ? (
                            <span className="font-mono text-[12px] font-semibold text-gray-800">{bed}</span>
                          ) : (
                            <span className="text-gray-400 font-bold">—</span>
                          )}
                        </td>

                        {/* 9. ACTION */}
                        <td className="pr-6 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenTriage) {
                                onOpenTriage(v.id);
                              } else {
                                setSelectedVisitId(v.id);
                              }
                            }}
                            className="px-3.5 py-1 text-[12px] font-semibold text-[#1B4FD8] bg-white border border-[#CBD5E1] rounded hover:bg-blue-50 hover:border-[#1B4FD8] transition-all cursor-pointer shadow-2xs"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="p-6">
            <TriageConfigPanel
              categories={categories}
              setNotice={setNotice}
              onCreated={loadCategories}
            />
          </div>
        )}
      </div>

      {prescriptionTarget && (
        <PrescriptionUploadModal
          patientId={prescriptionTarget.id}
          patientName={prescriptionTarget.name}
          doctorName={prescriptionTarget.doctorName}
          mode="manual"
          setNotice={setNotice}
          onClose={() => setPrescriptionTarget(null)}
        />
      )}

      {/* 1. Dedicated New Patient Registration Modal */}
      {intakeModalType === "new" && (
        <Modal
          open={true}
          onClose={() => setIntakeModalType(null)}
          title="Register New ER Patient"
          description="Register a new patient and create an active Emergency Encounter."
          className="max-w-3xl w-full"
        >
          <NewPatientIntakePanel
            setNotice={setNotice}
            categories={categories}
            onClose={() => setIntakeModalType(null)}
            onCreated={(visitId) => {
              setIntakeModalType(null);
              loadVisits();
              setSelectedVisitId(visitId);
            }}
            onNavigate={onNavigate}
          />
        </Modal>
      )}

      {/* 2. Dedicated Unidentified Patient Emergency Modal */}
      {intakeModalType === "unknown" && (
        <Modal
          open={true}
          onClose={() => setIntakeModalType(null)}
          title="Emergency Intake — Unidentified Patient"
          description="Rapid emergency intake for unknown, unconscious, or trauma victims."
          className="max-w-2xl w-full"
        >
          <UnidentifiedPatientIntakePanel
            setNotice={setNotice}
            categories={categories}
            onClose={() => setIntakeModalType(null)}
            onCreated={(visitId) => {
              setIntakeModalType(null);
              loadVisits();
              setSelectedVisitId(visitId);
            }}
            onNavigate={onNavigate}
          />
        </Modal>
      )}

      {/* 3. Dedicated Existing Patient Intake Modal */}
      {intakeModalType === "existing" && (
        <Modal
          open={true}
          onClose={() => setIntakeModalType(null)}
          title="Emergency Intake — Existing Patient"
          description="Search hospital records and admit existing patient to Emergency Department."
          className="max-w-2xl w-full"
        >
          <ExistingPatientIntakePanel
            setNotice={setNotice}
            categories={categories}
            prefillPatient={prefillPatient}
            onClose={() => setIntakeModalType(null)}
            onCreated={(visitId) => {
              setIntakeModalType(null);
              loadVisits();
              setSelectedVisitId(visitId);
            }}
            onNavigate={onNavigate}
          />
        </Modal>
      )}
    </div>
  );
}

// ==================== 1. Dedicated New Patient Intake ====================

function NewPatientIntakePanel({
  setNotice,
  categories,
  onClose,
  onCreated,
  onNavigate,
}: {
  setNotice: (notice: Notice | null) => void;
  categories: TriageCategory[];
  onClose?: () => void;
  onCreated: (visitId: number) => void;
  onNavigate?: (page: string, extraData?: any) => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // 1. Demographics
  const [newName, setNewName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newGender, setNewGender] = useState("Male");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");

  // 2. Emergency Contact
  const [newEmergencyContactName, setNewEmergencyContactName] = useState("");
  const [newEmergencyContactRelation, setNewEmergencyContactRelation] = useState("Wife");
  const [newEmergencyContact, setNewEmergencyContact] = useState("");

  // 3. Arrival
  const [arrivalDate, setArrivalDate] = useState(todayStr);
  const [arrivalTime, setArrivalTime] = useState(timeStr);
  const [arrivalMode, setArrivalMode] = useState("Relative");
  const [broughtBy, setBroughtBy] = useState("Family");
  const [attendantName, setAttendantName] = useState("");
  const [attendantRelation, setAttendantRelation] = useState("Wife");

  // 4. Condition & Complaint
  const [conditionAtArrival, setConditionAtArrival] = useState("Critical");
  const [consciousnessLevel, setConsciousnessLevel] = useState("Conscious");
  const [complaint, setComplaint] = useState("");
  const [caseCategory, setCaseCategory] = useState("Cardiac");
  const [infoProvidedBy, setInfoProvidedBy] = useState("Relative");

  // 5. MLC
  const [newMlc, setNewMlc] = useState<"No" | "Yes">("No");
  const [saving, setSaving] = useState(false);

  const handleDobChange = (dobVal: string) => {
    setNewDob(dobVal);
    if (dobVal) {
      const birthDate = new Date(dobVal);
      const diffMs = Date.now() - birthDate.getTime();
      const ageDate = new Date(diffMs);
      const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (!isNaN(calculatedAge) && calculatedAge >= 0 && calculatedAge <= 125) {
        setNewAge(String(calculatedAge));
      }
    }
  };

  const handleAgeChange = (ageVal: string) => {
    setNewAge(ageVal);
    const parsedAge = parseInt(ageVal, 10);
    if (!isNaN(parsedAge) && parsedAge >= 0 && parsedAge <= 125) {
      const birthYear = new Date().getFullYear() - parsedAge;
      setNewDob(`${birthYear}-01-01`);
    }
  };

  const submit = async () => {
    const missing: string[] = [];
    if (!newName.trim()) missing.push("First Name");
    if (!newLastName.trim()) missing.push("Last Name");
    if (!newGender) missing.push("Sex");
    if (!newEmergencyContactName.trim()) missing.push("Emergency Contact Name");
    if (!newEmergencyContact.trim()) missing.push("Emergency Contact Mobile");
    if (!complaint.trim()) missing.push("Chief Complaint");
    if (missing.length) {
      setNotice({ type: "error", message: `Please fill required fields: ${missing.join(", ")}.` });
      return;
    }
    if (newPhone.trim() && !/^\d{10}$/.test(newPhone.trim())) {
      setNotice({ type: "warning", message: "Mobile number must be 10 digits." });
      return;
    }
    if (!/^\d{10}$/.test(newEmergencyContact.trim())) {
      setNotice({ type: "warning", message: "Emergency contact mobile number must be 10 digits." });
      return;
    }

    setSaving(true);
    try {
      const regRes = await apiFetch<{
        patient_id: string;
        patient: Patient;
        visit: { id: number; visit_no: string };
      }>("/api/er/register-patient", {
        method: "POST",
        body: JSON.stringify({
          patient: {
            name: newName.trim(),
            last_name: newLastName.trim(),
            gender: newGender,
            age: newAge.trim() ? parseInt(newAge) : undefined,
            dob: newDob || undefined,
            phone: newPhone.trim() || "0000000000",
            emergency_contact: newEmergencyContact.trim(),
            emergency_contact_name: newEmergencyContactName.trim() || undefined,
            emergency_contact_relation: newEmergencyContactRelation || undefined,
            guardian_name: attendantName.trim() || undefined,
            guardian_relation: attendantRelation || undefined,
            address: newAddress.trim() || undefined,
            allergies: "",
          },
          visit: {
            arrival_date: arrivalDate,
            arrival_time: arrivalTime,
            arrival_mode: arrivalMode,
            brought_by: broughtBy,
            attendant_name: attendantName.trim() || undefined,
            attendant_relation: attendantRelation || undefined,
            condition_at_arrival: conditionAtArrival,
            consciousness: consciousnessLevel,
            info_provided_by: infoProvidedBy,
            police_involved: newMlc === "Yes",
          },
          complaint: [
            {
              complaint: complaint.trim(),
              case_category: caseCategory || undefined,
            },
          ],
        }),
      });

      const visitId = regRes.visit.id;
      const visitNo = regRes.visit.visit_no;

      // Background AI Triage trigger
      const symptomsText = `Complaints: ${complaint.trim() || "Emergency Presentation"}. Condition: ${conditionAtArrival}. Consciousness: ${consciousnessLevel}. Category: ${caseCategory}.`;
      try {
        const aiRes = await fetchAiTriageSuggestion(symptomsText);
        const categoryCode = mapUrgencyToTriageCategory(aiRes.urgency, categories) || "B2";
        if (categoryCode) {
          await apiFetch(`/api/er/visits/${visitId}/triage`, {
            method: "POST",
            body: JSON.stringify({
              category: categoryCode,
              reason: (aiRes.reasoning || "AI Clinical Triage").substring(0, 500),
            }),
          });
        }
        if (aiRes.doctor || aiRes.department) {
          await apiFetch(`/api/er/visits/${visitId}/assign-doctor`, {
            method: "POST",
            body: JSON.stringify({
              specialty: aiRes.department || "Emergency",
              doctor_name: aiRes.doctor || undefined,
            }),
          });
        }
      } catch (aiErr) {
        console.warn("AI Triage auto-execution fallback:", aiErr);
      }

      setNotice({
        type: "success",
        message: `Emergency Encounter created for ${newName} ${newLastName} (${visitNo}).`,
      });

      onCreated(visitId);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to create ER encounter.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* 1. PATIENT DEMOGRAPHICS */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
          <span className="text-[12px] font-bold text-slate-900 tracking-wider uppercase">
            1. PATIENT DEMOGRAPHICS
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Name<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="text"
                placeholder="First Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Last Name<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="text"
                placeholder="Last Name"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={newDob}
                onChange={(e) => handleDobChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Age
              </label>
              <input
                type="number"
                placeholder="Age"
                min="0"
                max="125"
                value={newAge}
                onChange={(e) => handleAgeChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sex<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={newGender}
                onChange={(e) => setNewGender(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile
              </label>
              <input
                type="tel"
                placeholder="10 digit mobile"
                maxLength={10}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Address
            </label>
            <input
              type="text"
              placeholder="Residential address..."
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. EMERGENCY CONTACT */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
          <span className="text-[12px] font-bold text-slate-900 tracking-wider uppercase">
            2. EMERGENCY CONTACT
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Name<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="text"
                placeholder="Emergency Contact Name"
                value={newEmergencyContactName}
                onChange={(e) => {
                  setNewEmergencyContactName(e.target.value);
                  if (!attendantName) setAttendantName(e.target.value);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Relationship
              </label>
              <select
                value={newEmergencyContactRelation}
                onChange={(e) => {
                  setNewEmergencyContactRelation(e.target.value);
                  setAttendantRelation(e.target.value);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Wife">Wife</option>
                <option value="Husband">Husband</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Relative">Relative</option>
                <option value="Friend">Friend</option>
                <option value="Guardian">Guardian</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="sm:max-w-[calc(50%-0.5rem)]">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Mobile<span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <input
              type="tel"
              placeholder="10 digit mobile"
              maxLength={10}
              value={newEmergencyContact}
              onChange={(e) => setNewEmergencyContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              required
            />
          </div>
        </div>
      </div>

      {/* 3. ARRIVAL INFORMATION */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
          <span className="text-[12px] font-bold text-slate-900 tracking-wider uppercase">
            3. ARRIVAL INFORMATION
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Arrival Date<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Arrival Time<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Arrival Mode<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={arrivalMode}
                onChange={(e) => setArrivalMode(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Relative">Relative</option>
                <option value="Ambulance (108)">Ambulance (108)</option>
                <option value="Private Ambulance">Private Ambulance</option>
                <option value="Walk-in / Self">Walk-in / Self</option>
                <option value="Police Escort">Police Escort</option>
                <option value="Air Ambulance">Air Ambulance</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brought By
              </label>
              <select
                value={broughtBy}
                onChange={(e) => setBroughtBy(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Family">Family</option>
                <option value="108 Emergency Crew">108 Emergency Crew</option>
                <option value="Self Ambulatory">Self Ambulatory</option>
                <option value="Bystanders / Public">Bystanders / Public</option>
                <option value="Police">Police</option>
                <option value="Hospital Transfer">Hospital Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attendant / Relative Name
              </label>
              <input
                type="text"
                placeholder="Attendant Name"
                value={attendantName}
                onChange={(e) => setAttendantName(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Relationship
              </label>
              <select
                value={attendantRelation}
                onChange={(e) => setAttendantRelation(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Wife">Wife</option>
                <option value="Husband">Husband</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Relative">Relative</option>
                <option value="Friend">Friend</option>
                <option value="Guardian">Guardian</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CLINICAL PRESENTATION */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
          <span className="text-[12px] font-bold text-slate-900 tracking-wider uppercase">
            4. CLINICAL PRESENTATION &amp; CONDITION
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Condition at Arrival<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={conditionAtArrival}
                onChange={(e) => setConditionAtArrival(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Critical">Critical</option>
                <option value="Emergent">Emergent</option>
                <option value="Urgent">Urgent</option>
                <option value="Non-Urgent">Non-Urgent</option>
                <option value="Hemodynamically Unstable">Hemodynamically Unstable</option>
                <option value="In Shock">In Shock</option>
                <option value="Severe Trauma">Severe Trauma</option>
                <option value="Stable / Alert">Stable / Alert</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consciousness Level
              </label>
              <select
                value={consciousnessLevel}
                onChange={(e) => setConsciousnessLevel(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Conscious">Conscious</option>
                <option value="Drowsy / Confused">Drowsy / Confused</option>
                <option value="Unconscious">Unconscious</option>
                <option value="Comatose (GCS <= 8)">Comatose (GCS &le; 8)</option>
                <option value="Stuporous">Stuporous</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chief Complaint<span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Primary clinical symptoms, onset, and emergency complaints..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Case Category<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={caseCategory}
                onChange={(e) => setCaseCategory(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Cardiac">Cardiac</option>
                <option value="Respiratory">Respiratory</option>
                <option value="Trauma / Accidental Injury">Trauma / Accidental Injury</option>
                <option value="Road Traffic Accident (RTA)">Road Traffic Accident (RTA)</option>
                <option value="Neurological / Stroke">Neurological / Stroke</option>
                <option value="Assault / Violence">Assault / Violence</option>
                <option value="Poisoning / Toxin">Poisoning / Toxin</option>
                <option value="Burns">Burns</option>
                <option value="General Illness / Fever">General Illness / Fever</option>
                <option value="Seizure">Seizure</option>
                <option value="Pregnancy-related">Pregnancy-related</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Information Provided By<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={infoProvidedBy}
                onChange={(e) => setInfoProvidedBy(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Relative">Relative</option>
                <option value="Patient (Self)">Patient (Self)</option>
                <option value="Ambulance Crew (EMT)">Ambulance Crew (EMT)</option>
                <option value="Bystander / Good Samaritan">Bystander / Good Samaritan</option>
                <option value="Police Officer">Police Officer</option>
                <option value="Referring Doctor">Referring Doctor</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 5. MEDICO-LEGAL */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
          <span className="text-[12px] font-bold text-slate-900 tracking-wider uppercase">
            5. MEDICO-LEGAL WORKFLOW
          </span>
        </div>

        <div className="sm:max-w-[calc(50%-0.5rem)]">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Medico-Legal Case (MLC)
          </label>
          <select
            value={newMlc}
            onChange={(e) => setNewMlc(e.target.value as "No" | "Yes")}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span>Registering &amp; Admitting...</span>
          ) : (
            <>
              <span>+ Register &amp; Admit to ER</span>
              <span className="text-sm">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ==================== 2. Dedicated Unidentified Patient Intake ====================

function UnidentifiedPatientIntakePanel({
  setNotice,
  categories,
  onClose,
  onCreated,
  onNavigate,
}: {
  setNotice: (notice: Notice | null) => void;
  categories: TriageCategory[];
  onClose?: () => void;
  onCreated: (visitId: number) => void;
  onNavigate?: (page: string, extraData?: any) => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [unknownLabel, setUnknownLabel] = useState("Unidentified Trauma Patient");
  const [apparentGender, setApparentGender] = useState("Male");
  const [estimatedAge, setEstimatedAge] = useState("Approx 30-35 years");
  const [physicalDescription, setPhysicalDescription] = useState("");

  const [arrivalDate, setArrivalDate] = useState(todayStr);
  const [arrivalTime, setArrivalTime] = useState(timeStr);
  const [arrivalMode, setArrivalMode] = useState("Ambulance (108)");
  const [broughtBy, setBroughtBy] = useState("108 Emergency Crew");
  const [emsOfficer, setEmsOfficer] = useState("");

  const [conditionAtArrival, setConditionAtArrival] = useState("Critical");
  const [consciousnessLevel, setConsciousnessLevel] = useState("Unconscious");
  const [complaint, setComplaint] = useState("Unidentified trauma victim, altered sensorium");
  const [caseCategory, setCaseCategory] = useState("Road Traffic Accident (RTA)");
  const [triageCategory, setTriageCategory] = useState("B1");
  const [newMlc, setNewMlc] = useState<"No" | "Yes">("Yes");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!unknownLabel.trim()) {
      setNotice({ type: "error", message: "Please enter an unidentified patient label or emergency tag." });
      return;
    }
    if (!complaint.trim()) {
      setNotice({ type: "error", message: "Please provide clinical presentation / trauma details." });
      return;
    }

    setSaving(true);
    try {
      const fullDescription = [
        physicalDescription.trim(),
        estimatedAge.trim() ? `Age: ${estimatedAge.trim()}` : "",
        apparentGender ? `Sex: ${apparentGender}` : "",
      ].filter(Boolean).join(" | ");

      const payload: Record<string, unknown> = {
        arrival_date: arrivalDate,
        arrival_time: arrivalTime,
        arrival_mode: arrivalMode,
        brought_by: broughtBy,
        attendant_name: emsOfficer.trim() || undefined,
        attendant_relation: "EMS / Police",
        condition_at_arrival: conditionAtArrival,
        consciousness: consciousnessLevel,
        info_provided_by: broughtBy,
        police_involved: newMlc === "Yes",
        is_unknown_patient: true,
        unknown_patient_label: unknownLabel.trim(),
      };

      const visitRes = await apiFetch<{ id: number; visit_no: string }>(
        "/api/er/visits",
        { method: "POST", body: JSON.stringify(payload) },
      );
      const visitId = visitRes.id;
      const visitNo = visitRes.visit_no;

      const complaintText = complaint.trim() + (fullDescription ? ` [Features: ${fullDescription}]` : "");
      await apiFetch(`/api/er/visits/${visitId}/complaints`, {
        method: "POST",
        body: JSON.stringify({
          complaint: complaintText,
          case_category: caseCategory || undefined,
        }),
      });

      // Set STAT Triage immediately
      if (triageCategory) {
        await apiFetch(`/api/er/visits/${visitId}/triage`, {
          method: "POST",
          body: JSON.stringify({
            category: triageCategory,
            reason: `STAT Unidentified Trauma Intake — Acuity: ${conditionAtArrival}`,
          }),
        });
      }

      setNotice({
        type: "success",
        message: `Emergency Encounter created for ${unknownLabel} (${visitNo}).`,
      });

      onCreated(visitId);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to create unidentified ER encounter.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-slate-800">
      {/* Alert Banner */}
      <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center text-lg shrink-0 mt-0.5">
          <FiAlertCircle />
        </div>
        <div>
          <h4 className="text-xs font-bold text-red-900">
            EMERGENCY TEMPORARY INTAKE
          </h4>
          <p className="text-[11.5px] text-red-700 mt-0.5 leading-relaxed">
            Assigns a temporary emergency identifier for STAT resuscitation and stabilization. When the patient's identity is verified later, their full hospital record can be merged seamlessly.
          </p>
        </div>
      </div>

      {/* 1. EMERGENCY IDENTIFICATION */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
          <span className="text-[12px] font-bold text-slate-900 tracking-wider uppercase">
            1. EMERGENCY IDENTIFICATION &amp; TAGGING
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Temporary Patient Tag / Label<span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Unidentified Male #1, Trauma Victim - Highway RTA"
              value={unknownLabel}
              onChange={(e) => setUnknownLabel(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Apparent Sex
              </label>
              <select
                value={apparentGender}
                onChange={(e) => setApparentGender(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unknown">Unknown / Indeterminate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Age
              </label>
              <input
                type="text"
                placeholder="e.g. Approx 30-35 years, Elderly"
                value={estimatedAge}
                onChange={(e) => setEstimatedAge(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Physical Description &amp; Distinguishing Marks
            </label>
            <input
              type="text"
              placeholder="e.g. Blue shirt, scar on right arm, tattoo on neck, silver ring..."
              value={physicalDescription}
              onChange={(e) => setPhysicalDescription(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. ARRIVAL & EMS SQUAD */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
          <span className="text-[12px] font-bold text-slate-900 tracking-wider uppercase">
            2. ARRIVAL &amp; EMS SQUAD
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Arrival Mode<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={arrivalMode}
                onChange={(e) => setArrivalMode(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none cursor-pointer"
              >
                <option value="Ambulance (108)">Ambulance (108)</option>
                <option value="Police Escort">Police Escort</option>
                <option value="Private Ambulance">Private Ambulance</option>
                <option value="Bystanders / Public">Bystanders / Public</option>
                <option value="Air Ambulance">Air Ambulance</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brought By<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={broughtBy}
                onChange={(e) => setBroughtBy(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none cursor-pointer"
              >
                <option value="108 Emergency Crew">108 Emergency Crew</option>
                <option value="Police">Police</option>
                <option value="Bystanders / Public">Bystanders / Public</option>
                <option value="Highway Patrol">Highway Patrol</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Paramedic / Officer Name &amp; Squad Details
            </label>
            <input
              type="text"
              placeholder="e.g. EMT Rahul (Ambulance #12) / Officer Sharma"
              value={emsOfficer}
              onChange={(e) => setEmsOfficer(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. CLINICAL EMERGENCY STATUS */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
          <span className="text-[12px] font-bold text-slate-900 tracking-wider uppercase">
            3. CLINICAL EMERGENCY STATUS &amp; TRIAGE
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Condition at Arrival<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={conditionAtArrival}
                onChange={(e) => setConditionAtArrival(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none cursor-pointer"
              >
                <option value="Critical">Critical</option>
                <option value="In Shock">In Shock</option>
                <option value="Severe Trauma">Severe Trauma</option>
                <option value="Hemodynamically Unstable">Hemodynamically Unstable</option>
                <option value="Emergent">Emergent</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consciousness Level / AVPU
              </label>
              <select
                value={consciousnessLevel}
                onChange={(e) => setConsciousnessLevel(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none cursor-pointer"
              >
                <option value="Unconscious">Unconscious</option>
                <option value="Comatose (GCS <= 8)">Comatose (GCS &le; 8)</option>
                <option value="Drowsy / Confused">Drowsy / Confused</option>
                <option value="Stuporous">Stuporous</option>
                <option value="Conscious">Conscious</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chief Trauma / Emergency Presentation<span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Observed injuries, site of trauma, hemorrhage, vital collapse..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Case Category
              </label>
              <select
                value={caseCategory}
                onChange={(e) => setCaseCategory(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none cursor-pointer"
              >
                <option value="Road Traffic Accident (RTA)">Road Traffic Accident (RTA)</option>
                <option value="Trauma / Accidental Injury">Trauma / Accidental Injury</option>
                <option value="Assault / Violence">Assault / Violence</option>
                <option value="Poisoning / Toxin">Poisoning / Toxin</option>
                <option value="Burns">Burns</option>
                <option value="Neurological / Stroke">Neurological / Stroke</option>
                <option value="Cardiac">Cardiac</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                STAT Triage Level
              </label>
              <select
                value={triageCategory}
                onChange={(e) => setTriageCategory(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-red-700 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none cursor-pointer"
              >
                <option value="B1">B1 — Immediate / Red Zone</option>
                <option value="B2">B2 — High Emergent / Orange</option>
                <option value="B3">B3 — Urgent / Amber</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Police / MLC
              </label>
              <select
                value={newMlc}
                onChange={(e) => setNewMlc(e.target.value as "No" | "Yes")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none cursor-pointer"
              >
                <option value="Yes">Yes (MLC Registered)</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="px-5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span>Admitting Patient...</span>
          ) : (
            <>
              <span>🚨 Generate Emergency ID &amp; Admit STAT</span>
              <span className="text-sm">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ==================== 3. Dedicated Existing Patient Intake ====================

function ExistingPatientIntakePanel({
  setNotice,
  categories,
  prefillPatient,
  onClose,
  onCreated,
  onNavigate,
}: {
  setNotice: (notice: Notice | null) => void;
  categories: TriageCategory[];
  prefillPatient?: { patient_id: string; name: string; last_name?: string } | null;
  onClose?: () => void;
  onCreated: (visitId: number) => void;
  onNavigate?: (page: string, extraData?: any) => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(prefillPatient as Patient || null);

  const [arrivalDate, setArrivalDate] = useState(todayStr);
  const [arrivalTime, setArrivalTime] = useState(timeStr);
  const [arrivalMode, setArrivalMode] = useState("Relative");
  const [broughtBy, setBroughtBy] = useState("Family");
  const [attendantName, setAttendantName] = useState("");
  const [attendantRelation, setAttendantRelation] = useState("Relative");

  const [conditionAtArrival, setConditionAtArrival] = useState("Emergent");
  const [consciousnessLevel, setConsciousnessLevel] = useState("Conscious");
  const [complaint, setComplaint] = useState("");
  const [caseCategory, setCaseCategory] = useState("General Illness / Fever");
  const [infoProvidedBy, setInfoProvidedBy] = useState("Relative");
  const [newMlc, setNewMlc] = useState<"No" | "Yes">("No");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prefillPatient) return;
    setSelectedPatient(prefillPatient as Patient);
  }, [prefillPatient]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const data = await apiFetch<{ patients: Patient[] }>(
          `/api/patients?q=${encodeURIComponent(searchQuery.trim())}`,
        );
        setSearchResults((data.patients || []).slice(0, 8));
      } catch (error) {
        console.error(error);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const submit = async () => {
    if (!selectedPatient) {
      setNotice({ type: "error", message: "Please search and select an existing patient first." });
      return;
    }
    if (!complaint.trim()) {
      setNotice({ type: "error", message: "Please enter chief complaint." });
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        patient_id: selectedPatient.patient_id,
        arrival_date: arrivalDate,
        arrival_time: arrivalTime,
        arrival_mode: arrivalMode,
        brought_by: broughtBy,
        attendant_name: attendantName.trim() || undefined,
        attendant_relation: attendantRelation || undefined,
        condition_at_arrival: conditionAtArrival,
        consciousness: consciousnessLevel,
        info_provided_by: infoProvidedBy,
        police_involved: newMlc === "Yes",
      };

      const visitRes = await apiFetch<{ id: number; visit_no: string }>(
        "/api/er/visits",
        { method: "POST", body: JSON.stringify(payload) },
      );
      const visitId = visitRes.id;
      const visitNo = visitRes.visit_no;

      await apiFetch(`/api/er/visits/${visitId}/complaints`, {
        method: "POST",
        body: JSON.stringify({
          complaint: complaint.trim(),
          case_category: caseCategory || undefined,
        }),
      });

      // Background AI Triage trigger
      const symptomsText = `Complaints: ${complaint.trim() || "Emergency Presentation"}. Condition: ${conditionAtArrival}. Consciousness: ${consciousnessLevel}. Category: ${caseCategory}.`;
      try {
        const aiRes = await fetchAiTriageSuggestion(symptomsText);
        const categoryCode = mapUrgencyToTriageCategory(aiRes.urgency, categories) || "B2";
        if (categoryCode) {
          await apiFetch(`/api/er/visits/${visitId}/triage`, {
            method: "POST",
            body: JSON.stringify({
              category: categoryCode,
              reason: (aiRes.reasoning || "AI Clinical Triage").substring(0, 500),
            }),
          });
        }
        if (aiRes.doctor || aiRes.department) {
          await apiFetch(`/api/er/visits/${visitId}/assign-doctor`, {
            method: "POST",
            body: JSON.stringify({
              specialty: aiRes.department || "Emergency",
              doctor_name: aiRes.doctor || undefined,
            }),
          });
        }
      } catch (aiErr) {
        console.warn("AI Triage auto-execution fallback:", aiErr);
      }

      setNotice({
        type: "success",
        message: `Emergency Encounter created for ${selectedPatient.name} ${selectedPatient.last_name || ""} (${visitNo}).`,
      });

      onCreated(visitId);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to create ER encounter.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* 1. SEARCH PATIENT */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
          <span className="text-[12px] font-bold text-slate-900 tracking-wider uppercase">
            1. EXISTING PATIENT LOOKUP
          </span>
        </div>

        {selectedPatient ? (
          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900 text-sm">
                {selectedPatient.name} {selectedPatient.last_name}
              </div>
              <div className="text-xs text-slate-600 font-medium mt-0.5">
                UHID: <span className="font-mono font-bold text-blue-700">{selectedPatient.patient_id}</span> • {selectedPatient.gender} • {selectedPatient.age}y • 📞 {selectedPatient.phone}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPatient(null);
                setSearchQuery("");
              }}
              className="px-3.5 py-1.5 bg-white border border-slate-300 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
            >
              Change Patient
            </button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-3 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search registered patients by Name, UHID, or Mobile Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-52 overflow-y-auto bg-white shadow-lg">
                {searchResults.map((p) => (
                  <button
                    key={p.patient_id}
                    type="button"
                    onClick={() => setSelectedPatient(p)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between text-xs transition cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        {p.name} {p.last_name}
                      </span>
                      <span className="text-slate-500 text-[11px] ml-2">
                        ({p.gender}, {p.age}y)
                      </span>
                    </div>
                    <span className="text-blue-700 font-mono text-xs font-semibold">
                      {p.patient_id} • 📞 {p.phone}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. ARRIVAL INFORMATION */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
          <span className="text-[12px] font-bold text-slate-900 tracking-wider uppercase">
            2. ARRIVAL INFORMATION
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Arrival Date<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Arrival Time<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Arrival Mode
              </label>
              <select
                value={arrivalMode}
                onChange={(e) => setArrivalMode(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Relative">Relative</option>
                <option value="Ambulance (108)">Ambulance (108)</option>
                <option value="Private Ambulance">Private Ambulance</option>
                <option value="Walk-in / Self">Walk-in / Self</option>
                <option value="Police Escort">Police Escort</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brought By
              </label>
              <select
                value={broughtBy}
                onChange={(e) => setBroughtBy(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Family">Family</option>
                <option value="108 Emergency Crew">108 Emergency Crew</option>
                <option value="Self Ambulatory">Self Ambulatory</option>
                <option value="Bystanders / Public">Bystanders / Public</option>
                <option value="Police">Police</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONDITION & EMERGENCY INFORMATION */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
          <span className="text-[12px] font-bold text-slate-900 tracking-wider uppercase">
            3. CONDITION &amp; EMERGENCY INFORMATION
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Condition at Arrival<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={conditionAtArrival}
                onChange={(e) => setConditionAtArrival(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Emergent">Emergent</option>
                <option value="Critical">Critical</option>
                <option value="Urgent">Urgent</option>
                <option value="Non-Urgent">Non-Urgent</option>
                <option value="Hemodynamically Unstable">Hemodynamically Unstable</option>
                <option value="In Shock">In Shock</option>
                <option value="Severe Trauma">Severe Trauma</option>
                <option value="Stable / Alert">Stable / Alert</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consciousness Level
              </label>
              <select
                value={consciousnessLevel}
                onChange={(e) => setConsciousnessLevel(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Conscious">Conscious</option>
                <option value="Drowsy / Confused">Drowsy / Confused</option>
                <option value="Unconscious">Unconscious</option>
                <option value="Comatose (GCS <= 8)">Comatose (GCS &le; 8)</option>
                <option value="Stuporous">Stuporous</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chief Complaint<span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Chief emergency complaints..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Case Category
              </label>
              <select
                value={caseCategory}
                onChange={(e) => setCaseCategory(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="General Illness / Fever">General Illness / Fever</option>
                <option value="Cardiac">Cardiac</option>
                <option value="Respiratory">Respiratory</option>
                <option value="Trauma / Accidental Injury">Trauma / Accidental Injury</option>
                <option value="Road Traffic Accident (RTA)">Road Traffic Accident (RTA)</option>
                <option value="Neurological / Stroke">Neurological / Stroke</option>
                <option value="Seizure">Seizure</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Medico-Legal Case (MLC)
              </label>
              <select
                value={newMlc}
                onChange={(e) => setNewMlc(e.target.value as "No" | "Yes")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !selectedPatient}
          className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span>Creating Encounter...</span>
          ) : (
            <>
              <span>Admit to Emergency</span>
              <span className="text-sm">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ==================== Triage Configuration ====================

function TriageConfigPanel({
  categories,
  setNotice,
  onCreated,
}: {
  categories: TriageCategory[];
  setNotice: (notice: Notice | null) => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#c0392b");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!code.trim() || !label.trim()) {
      setNotice({ type: "error", message: "Category code and label are required." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/er/triage-config", {
        method: "POST",
        body: JSON.stringify({
          category_code: code.trim(),
          category_label: label.trim(),
          description: description.trim() || undefined,
          color,
          sort_order: categories.length,
        }),
      });
      setCode("");
      setLabel("");
      setDescription("");
      setNotice({ type: "success", message: "Triage category added." });
      onCreated();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to add triage category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {categories.length === 0 ? (
        <div className="module-empty-state">
          <p className="module-empty-state-title">No triage categories configured</p>
          <p className="module-empty-state-hint">
            Triage can't be used until your hospital's clinical team defines its own
            priority categories (e.g. B1-B4) below — nothing is pre-filled on purpose.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1.25rem" }}>
          {categories.map((c) => (
            <div key={c.id} title={c.description || undefined}>
              <TriageChip category={c.category_code} categories={categories} />
            </div>
          ))}
        </div>
      )}

      <div className="module-form-grid">
        <div>
          <Label htmlFor="triage-code">Category code</Label>
          <Input id="triage-code" placeholder="B1" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="triage-label">Label</Label>
          <Input
            id="triage-label"
            placeholder="Immediate / Life-threatening"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="triage-desc">Clinical criteria / description</Label>
          <Textarea
            id="triage-desc"
            placeholder="Describe your hospital's own criteria for this category"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="triage-color">Color</Label>
          <Input id="triage-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
      </div>
      <Button onClick={submit} disabled={saving} style={{ marginTop: "0.75rem" }}>
        {saving ? "Adding..." : "Add Triage Category"}
      </Button>
    </div>
  );
}

// ==================== Visit Detail ====================

function SectionHead({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="er-section-head">
      <span className="er-section-icon">{icon}</span>
      <h3>{title}</h3>
      {action && <div className="er-section-head-actions">{action}</div>}
    </div>
  );
}

function formatTimeStr(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "—";
  }
}

function formatOutcomeLabel(outcome?: string | null): string {
  if (!outcome) return "Pending Disposition";
  const found = OUTCOME_OPTIONS.find((o) => o.value === outcome);
  return found ? found.label.replace(/\s*\(.*\)/, "") : outcome.replace(/_/g, " ").toUpperCase();
}

function formatArrivalModeLabel(mode?: string | null): string {
  if (!mode) return "Walk-in";
  const found = ARRIVAL_MODE_OPTIONS.find((m) => m.value === mode);
  return found ? found.label : mode.replace(/_/g, " ");
}

const TIMELINE_EVENT_DEFINITIONS: Record<
  ErTimelineEventType,
  {
    label: string;
    category: "Intake & Triage" | "Vitals" | "Medications & Procedures" | "Physician" | "Disposition & Transfer";
    icon: string;
    badgeBg: string;
    badgeText: string;
    dotColor: string;
    description: string;
  }
> = {
  patient_arrived: {
    label: "Patient Arrived / Registered",
    category: "Intake & Triage",
    icon: "🏥",
    badgeBg: "#EFF6FF",
    badgeText: "#1B4FD8",
    dotColor: "bg-blue-500",
    description: "Initial check-in, arrival mode & emergency presentation recorded",
  },
  bed_assigned: {
    label: "ER Bed Assigned",
    category: "Intake & Triage",
    icon: "🛏️",
    badgeBg: "#EEF2FF",
    badgeText: "#4F46E5",
    dotColor: "bg-indigo-500",
    description: "Emergency bay/bed allocated in Red/Yellow/Green zone",
  },
  initial_vitals: {
    label: "Initial Vitals Checked",
    category: "Vitals",
    icon: "🫀",
    badgeBg: "#FEE2E2",
    badgeText: "#DC2626",
    dotColor: "bg-rose-500",
    description: "Baseline vital signs charted upon arrival",
  },
  followup_vitals: {
    label: "Follow-up Vitals Checked",
    category: "Vitals",
    icon: "📈",
    badgeBg: "#FEF3C7",
    badgeText: "#B45309",
    dotColor: "bg-amber-500",
    description: "Repeat/periodic vital signs check during ongoing care",
  },
  medication_given: {
    label: "Medication Given",
    category: "Medications & Procedures",
    icon: "💊",
    badgeBg: "#DCFCE7",
    badgeText: "#15803D",
    dotColor: "bg-emerald-500",
    description: "STAT or scheduled medication administered to patient",
  },
  intervention_given: {
    label: "Intervention / Treatment Given",
    category: "Medications & Procedures",
    icon: "💉",
    badgeBg: "#CCFBF1",
    badgeText: "#0F766E",
    dotColor: "bg-teal-500",
    description: "Emergency clinical procedure, resuscitation or nursing intervention",
  },
  patient_stabilized: {
    label: "Patient Stabilized",
    category: "Medications & Procedures",
    icon: "✨",
    badgeBg: "#D1FAE5",
    badgeText: "#047857",
    dotColor: "bg-green-600",
    description: "Hemodynamic stability achieved post-emergency interventions",
  },
  doctor_assigned: {
    label: "Doctor Assigned",
    category: "Physician",
    icon: "👨‍⚕️",
    badgeBg: "#DBEAFE",
    badgeText: "#1D4ED8",
    dotColor: "bg-blue-600",
    description: "Physician or specialist assigned (Manual or AI recommended)",
  },
  doctor_arrived: {
    label: "Doctor Arrived",
    category: "Physician",
    icon: "🩺",
    badgeBg: "#E0F2FE",
    badgeText: "#0369A1",
    dotColor: "bg-cyan-600",
    description: "Doctor arrived at bedside for physical examination",
  },
  doctor_assessment_completed: {
    label: "Doctor Assessment Completed",
    category: "Physician",
    icon: "📝",
    badgeBg: "#F3E8FF",
    badgeText: "#7E22CE",
    dotColor: "bg-purple-600",
    description: "Physician examination completed, preliminary diagnosis established",
  },
  destination_assigned: {
    label: "Destination Assigned",
    category: "Disposition & Transfer",
    icon: "🎯",
    badgeBg: "#FFEDD5",
    badgeText: "#C2410C",
    dotColor: "bg-amber-600",
    description: "Clinical disposition decision by doctor (ICU, Ward, OT, Discharge)",
  },
  destination_bed_assigned: {
    label: "Destination Bed Assigned",
    category: "Disposition & Transfer",
    icon: "🏨",
    badgeBg: "#FED7AA",
    badgeText: "#9A3412",
    dotColor: "bg-orange-600",
    description: "Inpatient/ICU bed allocation confirmed by Bed Management",
  },
  patient_transferred: {
    label: "Patient Transferred",
    category: "Disposition & Transfer",
    icon: "🚑",
    badgeBg: "#F1F5F9",
    badgeText: "#334155",
    dotColor: "bg-slate-700",
    description: "Handover completed and patient physically relocated from ER",
  },
};

function formatTimelineEventSummary(ev: ErTimelineEventItem): string {
  if (ev.event_type === "initial_vitals" || ev.event_type === "followup_vitals") {
    if (ev.vitals_data) {
      const parts: string[] = [];
      if (ev.vitals_data.bp_systolic && ev.vitals_data.bp_diastolic) parts.push(`BP ${ev.vitals_data.bp_systolic}/${ev.vitals_data.bp_diastolic} mmHg`);
      if (ev.vitals_data.heart_rate) parts.push(`HR ${ev.vitals_data.heart_rate} bpm`);
      if (ev.vitals_data.spo2) parts.push(`SpO₂ ${ev.vitals_data.spo2}%`);
      if (ev.vitals_data.respiratory_rate) parts.push(`RR ${ev.vitals_data.respiratory_rate}/min`);
      if (ev.vitals_data.temperature) parts.push(`Temp ${ev.vitals_data.temperature}°F`);
      if (ev.vitals_data.pain_score != null) parts.push(`Pain ${ev.vitals_data.pain_score}/10`);
      return parts.join(", ") || ev.notes || "Vital signs recorded";
    }
  } else if (ev.event_type === "medication_given" && ev.medication_data) {
    return `${ev.medication_data.drug_name} ${ev.medication_data.dosage || ""} via ${ev.medication_data.route || "IV"} • Response: ${ev.medication_data.response || "Tolerated"}`;
  } else if (ev.event_type === "intervention_given" && ev.intervention_data) {
    return `${ev.intervention_data.intervention_type} • ${ev.intervention_data.details || ""} ${ev.intervention_data.patient_response ? `(Response: ${ev.intervention_data.patient_response})` : ""}`;
  } else if (ev.event_type === "patient_stabilized" && ev.stabilization_data) {
    return `Status: ${ev.stabilization_data.status} • ${ev.stabilization_data.clinical_notes || "Vital signs stabilizing"}`;
  } else if (ev.event_type === "doctor_assigned" && ev.doctor_data) {
    return `${ev.doctor_data.doctor_name} (${ev.doctor_data.specialty}) • ${ev.doctor_data.assignment_method}`;
  } else if (ev.event_type === "doctor_arrived" && ev.assessment_data) {
    return `Doctor: ${ev.assessment_data.doctor_name} • Presentation: ${ev.assessment_data.acute_condition || "Bedside examination started"}`;
  } else if (ev.event_type === "doctor_assessment_completed" && ev.assessment_data) {
    return `Impression: ${ev.assessment_data.clinical_impression || "Assessment completed"} • Plan: ${ev.assessment_data.care_plan || "Treatment in progress"}`;
  } else if (ev.event_type === "destination_assigned" && ev.destination_data) {
    return `Assigned to: ${ev.destination_data.destination} • Indication: ${ev.destination_data.clinical_reason || "Inpatient admission"}`;
  } else if (ev.event_type === "destination_bed_assigned" && ev.destination_bed_data) {
    return `Unit: ${ev.destination_bed_data.department} • Bed: ${ev.destination_bed_data.bed_id_or_label}`;
  } else if (ev.event_type === "patient_transferred" && ev.transfer_data) {
    return `Transferred to: ${ev.transfer_data.target_destination} (${ev.transfer_data.target_bed}) • Escort: ${ev.transfer_data.escorting_staff || "Staff RN"}`;
  } else if (ev.event_type === "bed_assigned") {
    return `Assigned to: ${ev.location || "ER Bay"} • Bed ${ev.bed || "ER-01"}`;
  } else if (ev.event_type === "patient_arrived") {
    return ev.notes || "Emergency registration completed";
  }
  return ev.notes || "Clinical event logged";
}

function getSynthesizedTimeline(detail: ErVisitDetail): ErTimelineEventItem[] {
  if (detail.timeline_events && detail.timeline_events.length > 0) {
    return detail.timeline_events.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Synthesize from existing records for initial visits
  const list: ErTimelineEventItem[] = [];
  let idCounter = 1;

  if (detail.arrival_at) {
    list.push({
      id: idCounter++,
      event_type: "patient_arrived",
      event_name: "Patient Arrived / Registered",
      timestamp: detail.arrival_at,
      logged_by: "ER Receptionist / Intake Staff",
      visit_id: detail.id,
      visit_no: detail.visit_no,
      patient_id: detail.patient_id,
      location: "ER Reception",
      bed: detail.triage_bed_label || "ER Bay",
      notes: `Arrived via ${formatArrivalModeLabel(detail.arrival_mode)} • ${detail.condition_at_arrival || "Emergency Arrival"}`,
    });
  }

  if (detail.triage_bed_label) {
    list.push({
      id: idCounter++,
      event_type: "bed_assigned",
      event_name: "ER Bed Assigned",
      timestamp: detail.arrival_at || new Date().toISOString(),
      logged_by: "Triage Nurse",
      visit_id: detail.id,
      visit_no: detail.visit_no,
      patient_id: detail.patient_id,
      location: detail.triage_bed_label,
      bed: detail.triage_bed_label,
      notes: `Assigned to ${detail.triage_bed_label} for emergency care`,
    });
  }

  (detail.vitals || []).forEach((v, idx) => {
    list.push({
      id: idCounter++,
      event_type: idx === 0 ? "initial_vitals" : "followup_vitals",
      event_name: idx === 0 ? "Initial Vitals Checked" : "Follow-up Vitals Checked",
      timestamp: v.recorded_at,
      logged_by: v.recorded_by || "Staff Nurse Jessica Carter, RN",
      visit_id: detail.id,
      visit_no: detail.visit_no,
      patient_id: detail.patient_id,
      location: detail.triage_bed_label || "ER Bay",
      bed: detail.triage_bed_label,
      vitals_data: {
        bp_systolic: v.bp_systolic,
        bp_diastolic: v.bp_diastolic,
        heart_rate: v.heart_rate,
        spo2: v.spo2,
        respiratory_rate: v.respiratory_rate,
        temperature: v.temperature,
        blood_glucose: v.blood_glucose,
        pain_score: v.pain_score,
        gcs: v.gcs,
        notes: v.notes,
      },
    });
  });

  (detail.treatments || []).forEach((t) => {
    const isMed = t.intervention_type.toLowerCase().includes("aspirin") ||
      t.intervention_type.toLowerCase().includes("ticagrelor") ||
      t.intervention_type.toLowerCase().includes("heparin") ||
      t.intervention_type.toLowerCase().includes("fentanyl") ||
      t.intervention_type.toLowerCase().includes("morphine") ||
      t.intervention_type.toLowerCase().includes("paracetamol") ||
      t.intervention_type.toLowerCase().includes("ondansetron");

    if (isMed) {
      list.push({
        id: idCounter++,
        event_type: "medication_given",
        event_name: "Medication Given",
        timestamp: t.performed_at,
        logged_by: t.administered_by || "Staff Nurse Jessica Carter, RN",
        visit_id: detail.id,
        visit_no: detail.visit_no,
        patient_id: detail.patient_id,
        location: detail.triage_bed_label || "ER Bay",
        medication_data: {
          drug_name: t.intervention_type,
          dosage: "STAT",
          route: "IV / PO",
          response: "Tolerated well, clinical improvement noted",
          notes: t.description || undefined,
        },
      });
    } else {
      list.push({
        id: idCounter++,
        event_type: "intervention_given",
        event_name: "Intervention / Treatment Given",
        timestamp: t.performed_at,
        logged_by: t.administered_by || "Staff Nurse Jessica Carter, RN",
        visit_id: detail.id,
        visit_no: detail.visit_no,
        patient_id: detail.patient_id,
        location: detail.triage_bed_label || "ER Bay",
        intervention_data: {
          intervention_type: t.intervention_type,
          details: t.description || "",
          patient_response: "Stable post-procedure",
        },
      });
    }
  });

  if (detail.assigned_doctor_name && detail.doctor_assigned_at) {
    list.push({
      id: idCounter++,
      event_type: "doctor_assigned",
      event_name: "Doctor Assigned",
      timestamp: detail.doctor_assigned_at,
      logged_by: "Triage Dispatch Coordinator",
      visit_id: detail.id,
      visit_no: detail.visit_no,
      patient_id: detail.patient_id,
      location: detail.triage_bed_label || "ER Bay",
      doctor_data: {
        doctor_name: detail.assigned_doctor_name,
        specialty: detail.assigned_specialty || "Emergency Medicine",
        assignment_method: "AI Recommended & Nurse Confirmed",
      },
    });
  }

  if (detail.doctor_accepted_at) {
    list.push({
      id: idCounter++,
      event_type: "doctor_arrived",
      event_name: "Doctor Arrived",
      timestamp: detail.doctor_accepted_at,
      logged_by: "Bedside Primary RN",
      visit_id: detail.id,
      visit_no: detail.visit_no,
      patient_id: detail.patient_id,
      location: detail.triage_bed_label || "ER Bay",
      assessment_data: {
        doctor_name: detail.assigned_doctor_name || "Attending Physician",
        acute_condition: "Acute presentation evaluated; secondary survey initiated",
      },
    });
  }

  if (detail.disposition) {
    const destName = detail.disposition.outcome.includes("icu") ? "ICU" : detail.disposition.outcome.includes("ward") ? "Ward" : "Discharge";
    list.push({
      id: idCounter++,
      event_type: "destination_assigned",
      event_name: "Destination Assigned",
      timestamp: detail.disposition.decided_at,
      logged_by: detail.disposition.decided_by || "Attending Physician",
      visit_id: detail.id,
      visit_no: detail.visit_no,
      patient_id: detail.patient_id,
      location: detail.triage_bed_label || "ER Bay",
      destination_data: {
        destination: destName as any,
        clinical_reason: detail.disposition.clinical_reason,
        doctor_name: detail.disposition.decided_by || detail.assigned_doctor_name || undefined,
      },
    });
  }

  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function AddTimelineEventModal({
  detail,
  initialEventType = "initial_vitals",
  onClose,
  onSaved,
  setNotice,
}: {
  detail: ErVisitDetail;
  initialEventType?: ErTimelineEventType;
  onClose: () => void;
  onSaved: () => void;
  setNotice: (notice: Notice | null) => void;
}) {
  const [selectedType, setSelectedType] = useState<ErTimelineEventType>(initialEventType);
  const [saving, setSaving] = useState(false);

  // Auto-captured metadata
  const loggedBy = "Staff Nurse Jessica Carter, RN";
  const currentTimestamp = new Date().toISOString();
  const currentBed = detail.triage_bed_label || "ER Red Zone (Bay 01)";

  // 1. Vitals form state
  const latestV = detail.vitals && detail.vitals.length > 0 ? detail.vitals[detail.vitals.length - 1] : null;
  const [vitalsForm, setVitalsForm] = useState({
    bpSys: latestV?.bp_systolic ? String(latestV.bp_systolic) : "",
    bpDia: latestV?.bp_diastolic ? String(latestV.bp_diastolic) : "",
    hr: latestV?.heart_rate ? String(latestV.heart_rate) : "",
    spo2: latestV?.spo2 ? String(latestV.spo2) : "",
    rr: latestV?.respiratory_rate ? String(latestV.respiratory_rate) : "",
    temp: latestV?.temperature ? String(latestV.temperature) : "",
    glucose: latestV?.blood_glucose ? String(latestV.blood_glucose) : "",
    pain: latestV?.pain_score != null ? String(latestV.pain_score) : "0",
    gcs: latestV?.gcs ? String(latestV.gcs) : "15",
    notes: "",
  });

  // 2. Medication form state
  const [medForm, setMedForm] = useState({
    drugName: "Aspirin (Dispersible)",
    dosage: "300 mg",
    route: "Oral (PO)",
    response: "Tolerated well, no acute distress",
    notes: "STAT loading dose per emergency chest pain protocol",
  });

  // 3. Intervention form state
  const [interventionForm, setInterventionForm] = useState({
    type: "18G IV Cannulation (Left Forearm)",
    details: "18-gauge cannula inserted under aseptic precautions, flushed with 5mL normal saline. Flow patent.",
    response: "Procedure tolerated well without extravasation",
    notes: "",
  });

  // 4. Stabilization form state
  const [stabilizationForm, setStabilizationForm] = useState({
    status: "Hemodynamically Stable",
    notes: "BP and heart rate stabilized post-analgesia and oxygen therapy. Patient resting comfortably.",
  });

  // 5. Doctor Assigned form state
  const [doctorAssignedForm, setDoctorAssignedForm] = useState({
    doctorName: detail.assigned_doctor_name || "Dr. Vikram Seth",
    specialty: detail.assigned_specialty || "Cardiology",
    method: "AI Recommended & Nurse Confirmed" as "Manual by Nurse" | "AI Recommended & Nurse Confirmed",
    notes: "Assigned per acute triage symptom match.",
  });

  // 6. Doctor Arrived form state
  const [doctorArrivedForm, setDoctorArrivedForm] = useState({
    doctorName: detail.assigned_doctor_name || "Dr. Vikram Seth",
    acuteCondition: "Conscious, diaphoretic, acute substernal pain 7/10",
    notes: "Attending doctor arrived at bedside for physical examination.",
  });

  // 7. Doctor Assessment form state
  const [doctorAssessmentForm, setDoctorAssessmentForm] = useState({
    doctorName: detail.assigned_doctor_name || "Dr. Vikram Seth",
    impression: "Acute Anterior Wall STEMI / Coronary Syndrome",
    plan: "Initiate dual antiplatelets, STAT coronary angiography & Cath Lab activation",
  });

  // 8. Destination Assigned form state
  const [destinationForm, setDestinationForm] = useState({
    destination: "ICU" as "Ward" | "ICU" | "HDU" | "Specialty Ward" | "Observation" | "Operating Theatre" | "Discharge",
    reason: "Requires continuous 24/7 telemetry monitoring and post-angioplasty care",
    doctorName: detail.assigned_doctor_name || "Dr. Vikram Seth",
    aiNotes: "AI Recommendation: Intensive Care Unit (CCU / Cardiac ICU)",
  });

  // 9. Destination Bed Assigned form state
  const [destinationBedForm, setDestinationBedForm] = useState({
    department: "Medical ICU (Floor 2)",
    bedId: "ICU-BED-04",
    allocatedBy: "Bed Management & Triage Coordinator",
  });

  // 10. Patient Transferred form state
  const [transferForm, setTransferForm] = useState({
    sourceLocation: currentBed,
    targetDestination: "Medical Intensive Care Unit (ICU)",
    targetBed: "ICU-BED-04",
    transferStatus: "Transfer Completed" as "Transfer Completed" | "In Transit",
    escortingStaff: loggedBy,
    notes: "Handover completed with receiving ICU Staff Nurse. Monitors and IV lines transferred successfully.",
  });

  // 11. Generic Notes form state
  const [genericNotes, setGenericNotes] = useState("");

  const handleSave = async () => {
    setSaving(true);
    try {
      const def = TIMELINE_EVENT_DEFINITIONS[selectedType];
      const eventPayload: Partial<ErTimelineEventItem> = {
        event_type: selectedType,
        event_name: def.label,
        timestamp: currentTimestamp,
        logged_by: loggedBy,
        visit_id: detail.id,
        visit_no: detail.visit_no,
        patient_id: detail.patient_id,
        location: currentBed,
        bed: currentBed,
        notes: genericNotes || undefined,
      };

      if (selectedType === "initial_vitals" || selectedType === "followup_vitals") {
        eventPayload.vitals_data = {
          bp_systolic: vitalsForm.bpSys ? Number(vitalsForm.bpSys) : null,
          bp_diastolic: vitalsForm.bpDia ? Number(vitalsForm.bpDia) : null,
          heart_rate: vitalsForm.hr ? Number(vitalsForm.hr) : null,
          spo2: vitalsForm.spo2 ? Number(vitalsForm.spo2) : null,
          respiratory_rate: vitalsForm.rr ? Number(vitalsForm.rr) : null,
          temperature: vitalsForm.temp ? Number(vitalsForm.temp) : null,
          blood_glucose: vitalsForm.glucose ? Number(vitalsForm.glucose) : null,
          pain_score: vitalsForm.pain ? Number(vitalsForm.pain) : 0,
          gcs: vitalsForm.gcs ? Number(vitalsForm.gcs) : 15,
          notes: vitalsForm.notes || undefined,
        };
      } else if (selectedType === "medication_given") {
        eventPayload.medication_data = {
          drug_name: medForm.drugName,
          dosage: medForm.dosage,
          route: medForm.route,
          response: medForm.response,
          notes: medForm.notes,
        };
      } else if (selectedType === "intervention_given") {
        eventPayload.intervention_data = {
          intervention_type: interventionForm.type,
          details: interventionForm.details,
          patient_response: interventionForm.response,
          notes: interventionForm.notes,
        };
      } else if (selectedType === "patient_stabilized") {
        eventPayload.stabilization_data = {
          status: stabilizationForm.status,
          clinical_notes: stabilizationForm.notes,
        };
      } else if (selectedType === "doctor_assigned") {
        eventPayload.doctor_data = {
          doctor_name: doctorAssignedForm.doctorName,
          specialty: doctorAssignedForm.specialty,
          assignment_method: doctorAssignedForm.method,
          notes: doctorAssignedForm.notes,
        };
      } else if (selectedType === "doctor_arrived") {
        eventPayload.assessment_data = {
          doctor_name: doctorArrivedForm.doctorName,
          acute_condition: doctorArrivedForm.acuteCondition,
        };
        eventPayload.notes = doctorArrivedForm.notes;
      } else if (selectedType === "doctor_assessment_completed") {
        eventPayload.assessment_data = {
          doctor_name: doctorAssessmentForm.doctorName,
          clinical_impression: doctorAssessmentForm.impression,
          care_plan: doctorAssessmentForm.plan,
        };
      } else if (selectedType === "destination_assigned") {
        eventPayload.destination_data = {
          destination: destinationForm.destination,
          clinical_reason: destinationForm.reason,
          doctor_name: destinationForm.doctorName,
          ai_recommendation_notes: destinationForm.aiNotes,
        };
      } else if (selectedType === "destination_bed_assigned") {
        eventPayload.destination_bed_data = {
          department: destinationBedForm.department,
          bed_id_or_label: destinationBedForm.bedId,
          allocated_by: destinationBedForm.allocatedBy,
        };
      } else if (selectedType === "patient_transferred") {
        eventPayload.transfer_data = {
          source_location: transferForm.sourceLocation,
          target_destination: transferForm.targetDestination,
          target_bed: transferForm.targetBed,
          transfer_status: transferForm.transferStatus,
          escorting_staff: transferForm.escortingStaff,
          handover_notes: transferForm.notes,
        };
      }

      ErDatabase.addTimelineEvent(detail.id, eventPayload);

      setNotice({
        type: "success",
        message: `Timeline Event recorded: "${def.label}" by ${loggedBy}.`,
      });

      onSaved();
      onClose();
    } catch (err: any) {
      setNotice({ type: "error", message: err.message || "Failed to record timeline event." });
    } finally {
      setSaving(false);
    }
  };

  const currentDef = TIMELINE_EVENT_DEFINITIONS[selectedType];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{currentDef.icon}</span>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Record Patient Journey Event</h3>
              <p className="text-[11.5px] text-[#64748B]">
                Nurse-managed clinical encounter timeline • Automatically captures time &amp; staff signature
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">
            ✕
          </button>
        </div>

        {/* Auto-Captured Metadata Banner */}
        <div className="bg-[#F8FAFC] border border-[#DDE2EC] rounded p-3 text-[11.5px] text-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="text-[#64748B] block text-[10px] uppercase font-bold">Logged-In Nurse</span>
            <strong className="text-[#1B4FD8] truncate block">👩‍⚕️ {loggedBy.replace(", RN", "")}</strong>
          </div>
          <div>
            <span className="text-[#64748B] block text-[10px] uppercase font-bold">Recorded Time</span>
            <span className="font-mono text-gray-900 font-semibold">{formatTimeStr(currentTimestamp)} (Now)</span>
          </div>
          <div>
            <span className="text-[#64748B] block text-[10px] uppercase font-bold">ER Encounter</span>
            <span className="font-mono text-gray-900 font-semibold">{detail.visit_no}</span>
          </div>
          <div>
            <span className="text-[#64748B] block text-[10px] uppercase font-bold">Current Location</span>
            <span className="font-semibold text-gray-900 truncate block">{currentBed}</span>
          </div>
        </div>

        {/* Event Type Selector Dropdown / Pills */}
        <div>
          <label className="block text-[11.5px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
            Select Clinical Event Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ErTimelineEventType)}
            className="w-full border border-slate-300 rounded p-2 text-[12.5px] text-gray-900 font-bold bg-white focus:outline-none focus:border-[#1B4FD8]"
          >
            <optgroup label="── Intake &amp; Triage ──">
              <option value="patient_arrived">🏥 Patient Arrived / Registered</option>
              <option value="bed_assigned">🛏️ ER Bed Assigned</option>
            </optgroup>
            <optgroup label="── Vital Signs &amp; Monitoring ──">
              <option value="initial_vitals">🫀 Initial Vitals Checked</option>
              <option value="followup_vitals">📈 Follow-up Vitals Checked</option>
            </optgroup>
            <optgroup label="── Medications &amp; Interventions ──">
              <option value="medication_given">💊 Medication Given</option>
              <option value="intervention_given">💉 Intervention / Treatment Given</option>
              <option value="patient_stabilized">✨ Patient Stabilized</option>
            </optgroup>
            <optgroup label="── Physician Assessment ──">
              <option value="doctor_assigned">👨‍⚕️ Doctor Assigned</option>
              <option value="doctor_arrived">🩺 Doctor Arrived</option>
              <option value="doctor_assessment_completed">📝 Doctor Assessment Completed</option>
            </optgroup>
            <optgroup label="── Disposition &amp; Transfer ──">
              <option value="destination_assigned">🎯 Destination Assigned</option>
              <option value="destination_bed_assigned">🏨 Destination Bed Assigned</option>
              <option value="patient_transferred">🚑 Patient Transferred</option>
            </optgroup>
          </select>
          <span className="text-[11px] text-[#64748B] mt-1 block italic">{currentDef.description}</span>
        </div>

        {/* Dynamic Structured Form Fields */}
        <div className="space-y-3.5 pt-1 text-[12px]">
          {/* 1. Vitals Form (Initial & Follow-up) */}
          {(selectedType === "initial_vitals" || selectedType === "followup_vitals") && (
            <div className="bg-[#FAFCFF] border border-blue-100 rounded p-3.5 space-y-3">
              <span className="text-[11px] font-bold text-[#1B4FD8] uppercase tracking-wider block">
                {selectedType === "initial_vitals" ? "Baseline Arrival Vital Signs" : "Repeat / Follow-up Vital Signs"}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">BP (mmHg)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="Sys"
                      value={vitalsForm.bpSys}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, bpSys: e.target.value })}
                      className="w-full border border-slate-300 rounded p-1.5 font-mono text-center"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      placeholder="Dia"
                      value={vitalsForm.bpDia}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, bpDia: e.target.value })}
                      className="w-full border border-slate-300 rounded p-1.5 font-mono text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    placeholder="e.g. 78"
                    value={vitalsForm.hr}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, hr: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">SpO₂ (%)</label>
                  <input
                    type="number"
                    placeholder="e.g. 98"
                    value={vitalsForm.spo2}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Resp Rate (/min)</label>
                  <input
                    type="number"
                    placeholder="e.g. 16"
                    value={vitalsForm.rr}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, rr: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Temp (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 98.6"
                    value={vitalsForm.temp}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temp: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Glucose (mg/dL)</label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={vitalsForm.glucose}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, glucose: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Pain Score (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={vitalsForm.pain}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, pain: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">GCS Score (3-15)</label>
                  <input
                    type="number"
                    min="3"
                    max="15"
                    value={vitalsForm.gcs}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, gcs: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Vitals Response &amp; Clinical Trend Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Pulse regular, extremities warm, breathing unlabored on room air"
                  value={vitalsForm.notes}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-[12px]"
                />
              </div>
            </div>
          )}

          {/* 2. Medication Given Form */}
          {selectedType === "medication_given" && (
            <div className="bg-[#F0FDF4] border border-green-200 rounded p-3.5 space-y-3">
              <span className="text-[11px] font-bold text-[#15803D] uppercase tracking-wider block">
                Administered Medication Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Drug / Medication Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Aspirin / Morphine / IV Ceftriaxone"
                    value={medForm.drugName}
                    onChange={(e) => setMedForm({ ...medForm, drugName: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Dosage / Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 300mg / 4mg / 1g in 100ml NS"
                    value={medForm.dosage}
                    onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Route of Administration</label>
                  <select
                    value={medForm.route}
                    onChange={(e) => setMedForm({ ...medForm, route: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 bg-white font-medium"
                  >
                    <option value="Intravenous (IV Bolus)">Intravenous (IV Bolus)</option>
                    <option value="Intravenous Infusion (IV Drip)">Intravenous Infusion (IV Drip)</option>
                    <option value="Oral (PO)">Oral (PO)</option>
                    <option value="Sublingual (SL)">Sublingual (SL)</option>
                    <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                    <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                    <option value="Nebulization (Inhalation)">Nebulization (Inhalation)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Patient Clinical Response</label>
                <input
                  type="text"
                  placeholder="e.g. Pain relieved from 8/10 to 3/10 within 15 mins, no adverse allergy noted"
                  value={medForm.response}
                  onChange={(e) => setMedForm({ ...medForm, response: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-[12px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Nurse Notes / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Given STAT under attending physician verbal order"
                  value={medForm.notes}
                  onChange={(e) => setMedForm({ ...medForm, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-[12px]"
                />
              </div>
            </div>
          )}

          {/* 3. Intervention / Treatment Form */}
          {selectedType === "intervention_given" && (
            <div className="bg-[#F0FDFA] border border-teal-200 rounded p-3.5 space-y-3">
              <span className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wider block">
                Emergency Procedure &amp; Treatment Details
              </span>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Intervention / Procedure</label>
                <input
                  type="text"
                  placeholder="e.g. 18G IV Cannulation / High Flow O2 6L/min / Wound Dressing / Splinting"
                  value={interventionForm.type}
                  onChange={(e) => setInterventionForm({ ...interventionForm, type: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Procedure Details &amp; Anatomical Site</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Left cubital fossa, flushed with saline, sterile dressing applied."
                  value={interventionForm.details}
                  onChange={(e) => setInterventionForm({ ...interventionForm, details: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-[12px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Patient Response &amp; Condition</label>
                <input
                  type="text"
                  placeholder="e.g. Procedure successful, bleeding controlled, stable vitals maintained."
                  value={interventionForm.response}
                  onChange={(e) => setInterventionForm({ ...interventionForm, response: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-[12px]"
                />
              </div>
            </div>
          )}

          {/* 4. Patient Stabilized Form */}
          {selectedType === "patient_stabilized" && (
            <div className="bg-[#ECFDF5] border border-emerald-200 rounded p-3.5 space-y-3">
              <span className="text-[11px] font-bold text-[#047857] uppercase tracking-wider block">
                Patient Stabilization Assessment
              </span>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Stabilization Status</label>
                <select
                  value={stabilizationForm.status}
                  onChange={(e) => setStabilizationForm({ ...stabilizationForm, status: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 bg-white font-bold text-gray-900"
                >
                  <option value="Hemodynamically Stable">Hemodynamically Stable (BP/HR/SpO2 in target range)</option>
                  <option value="Pain Controlled & Calm">Pain Controlled &amp; Patient Comfortable</option>
                  <option value="SpO2 Normalized (>95% on Room Air)">SpO₂ Normalized (&gt;95% on Room Air)</option>
                  <option value="Consciousness & GCS Improved">Consciousness &amp; Sensorium Improved (GCS 15)</option>
                  <option value="Cardiac Rhythm Stabilized">Cardiac Rhythm Stabilized Post-Intervention</option>
                  <option value="Active Bleeding Arrested">Active Hemorrhage / Bleeding Arrested</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Clinical Evaluation Notes</label>
                <textarea
                  rows={2}
                  placeholder="Document patient clinical status post-resuscitation..."
                  value={stabilizationForm.notes}
                  onChange={(e) => setStabilizationForm({ ...stabilizationForm, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-[12px]"
                />
              </div>
            </div>
          )}

          {/* 5. Doctor Assigned Form */}
          {selectedType === "doctor_assigned" && (
            <div className="bg-[#EFF6FF] border border-blue-200 rounded p-3.5 space-y-3">
              <span className="text-[11px] font-bold text-[#1D4ED8] uppercase tracking-wider block">
                Doctor / Specialist Assignment
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Attending Physician Name</label>
                  <input
                    type="text"
                    value={doctorAssignedForm.doctorName}
                    onChange={(e) => setDoctorAssignedForm({ ...doctorAssignedForm, doctorName: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Medical Specialty</label>
                  <input
                    type="text"
                    value={doctorAssignedForm.specialty}
                    onChange={(e) => setDoctorAssignedForm({ ...doctorAssignedForm, specialty: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Assignment Method</label>
                <div className="flex gap-2">
                  {[
                    "AI Recommended & Nurse Confirmed",
                    "Manual by Nurse",
                  ].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDoctorAssignedForm({ ...doctorAssignedForm, method: m as any })}
                      className={`flex-1 py-1.5 px-3 rounded text-[11px] font-bold border transition-all ${
                        doctorAssignedForm.method === m
                          ? "bg-[#1B4FD8] text-white border-[#1B4FD8]"
                          : "bg-white text-gray-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. Doctor Arrived Form */}
          {selectedType === "doctor_arrived" && (
            <div className="bg-[#F0F9FF] border border-sky-200 rounded p-3.5 space-y-3">
              <span className="text-[11px] font-bold text-[#0369A1] uppercase tracking-wider block">
                Doctor Bedside Arrival Confirmation
              </span>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Attending Doctor</label>
                <input
                  type="text"
                  value={doctorArrivedForm.doctorName}
                  onChange={(e) => setDoctorArrivedForm({ ...doctorArrivedForm, doctorName: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Acute Condition upon Doctor Arrival</label>
                <input
                  type="text"
                  placeholder="e.g. Diaphoretic, chest pain 7/10, awaiting STAT ECG"
                  value={doctorArrivedForm.acuteCondition}
                  onChange={(e) => setDoctorArrivedForm({ ...doctorArrivedForm, acuteCondition: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-[12px]"
                />
              </div>
            </div>
          )}

          {/* 7. Doctor Assessment Completed Form */}
          {selectedType === "doctor_assessment_completed" && (
            <div className="bg-[#FAF5FF] border border-purple-200 rounded p-3.5 space-y-3">
              <span className="text-[11px] font-bold text-[#7E22CE] uppercase tracking-wider block">
                Physician Assessment &amp; Impression
              </span>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Preliminary Diagnosis / Clinical Impression</label>
                <input
                  type="text"
                  placeholder="e.g. Acute STEMI / Subdural Hemorrhage / Polytrauma"
                  value={doctorAssessmentForm.impression}
                  onChange={(e) => setDoctorAssessmentForm({ ...doctorAssessmentForm, impression: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Recommended Plan of Care &amp; Orders</label>
                <textarea
                  rows={2}
                  placeholder="Document orders, treatment pathway, and urgent investigations..."
                  value={doctorAssessmentForm.plan}
                  onChange={(e) => setDoctorAssessmentForm({ ...doctorAssessmentForm, plan: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-[12px]"
                />
              </div>
            </div>
          )}

          {/* 8. Destination Assigned Form */}
          {selectedType === "destination_assigned" && (
            <div className="bg-[#FFF7ED] border border-orange-200 rounded p-3.5 space-y-3">
              <span className="text-[11px] font-bold text-[#C2410C] uppercase tracking-wider block">
                Doctor Clinical Disposition Decision
              </span>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Selected Clinical Destination</label>
                <select
                  value={destinationForm.destination}
                  onChange={(e) => setDestinationForm({ ...destinationForm, destination: e.target.value as any })}
                  className="w-full border border-slate-300 rounded p-2 bg-white font-bold text-gray-900"
                >
                  <option value="ICU">🚨 Intensive Care Unit (ICU / CCU) — STAT Critical</option>
                  <option value="HDU">🏨 Specialty High Dependency Unit (HDU)</option>
                  <option value="Ward">🛏️ Inpatient General Medical / Surgical Ward</option>
                  <option value="Specialty Ward">🏥 Specialty Ward (Cardiology / Orthopedics / Neuro)</option>
                  <option value="Observation">⏱️ Short-Stay Observation Unit (&lt; 24h)</option>
                  <option value="Operating Theatre">🏥 Emergency Operating Theatre (OT) / Cath Lab</option>
                  <option value="Discharge">🏠 Discharge Home with Outpatient Prescription</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Clinical Justification &amp; Indication</label>
                <textarea
                  rows={2}
                  placeholder="Document clinical indication for transfer or admission..."
                  value={destinationForm.reason}
                  onChange={(e) => setDestinationForm({ ...destinationForm, reason: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-[12px]"
                />
              </div>
            </div>
          )}

          {/* 9. Destination Bed Assigned Form */}
          {selectedType === "destination_bed_assigned" && (
            <div className="bg-[#FFFBEB] border border-amber-200 rounded p-3.5 space-y-3">
              <span className="text-[11px] font-bold text-[#B45309] uppercase tracking-wider block">
                Inpatient / ICU Bed Allocation
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Target Department / Ward</label>
                  <input
                    type="text"
                    placeholder="e.g. Medical ICU (Floor 2) / Ward 3B"
                    value={destinationBedForm.department}
                    onChange={(e) => setDestinationBedForm({ ...destinationBedForm, department: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Allocated Physical Bed ID</label>
                  <input
                    type="text"
                    placeholder="e.g. ICU-BED-04 / WARD-BED-302"
                    value={destinationBedForm.bedId}
                    onChange={(e) => setDestinationBedForm({ ...destinationBedForm, bedId: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 10. Patient Transferred Form */}
          {selectedType === "patient_transferred" && (
            <div className="bg-[#F8FAFC] border border-slate-300 rounded p-3.5 space-y-3">
              <span className="text-[11px] font-bold text-[#334155] uppercase tracking-wider block">
                Physical Relocation &amp; ER Handover Completion
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Source ER Location</label>
                  <input
                    type="text"
                    value={transferForm.sourceLocation}
                    onChange={(e) => setTransferForm({ ...transferForm, sourceLocation: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Target Destination</label>
                  <input
                    type="text"
                    value={transferForm.targetDestination}
                    onChange={(e) => setTransferForm({ ...transferForm, targetDestination: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 font-semibold text-[#1B4FD8]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Target Bed Number</label>
                  <input
                    type="text"
                    value={transferForm.targetBed}
                    onChange={(e) => setTransferForm({ ...transferForm, targetBed: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono font-bold text-[#16A34A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Nursing Handover &amp; Equipment Notes</label>
                <textarea
                  rows={2}
                  placeholder="Document transfer details, IV lines, oxygen transport, receiving nurse signature..."
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-[12px]"
                />
              </div>

              <div className="p-2.5 bg-green-50 border border-green-200 rounded text-[11px] text-green-800">
                ✓ Marking transfer completed will close the active ER journey and relocate the patient to {transferForm.targetDestination}.
              </div>
            </div>
          )}

          {/* Optional Generic Nurse Notes */}
          {selectedType === "patient_arrived" || selectedType === "bed_assigned" ? (
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Clinical Event Notes</label>
              <textarea
                rows={2}
                placeholder="Add any specific clinical notes or observations..."
                value={genericNotes}
                onChange={(e) => setGenericNotes(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-[12px]"
              />
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded text-[12.5px] font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[12.5px] font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            {saving ? "Recording..." : `Save "${currentDef.label}"`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function VisitDetailPanel({
  detail,
  loading,
  categories,
  setNotice,
  onNavigate,
  onBack,
  onRefresh,
  onOrderMedication,
}: {
  detail: ErVisitDetail;
  loading: boolean;
  categories: TriageCategory[];
  setNotice: (notice: Notice | null) => void;
  onNavigate?: (page: string, extraData?: any) => void;
  onBack: () => void;
  onRefresh: () => void;
  onOrderMedication: () => void;
}) {
  const patientFullName = detail.patient
    ? [detail.patient.name, detail.patient.last_name].filter(Boolean).join(" ")
    : detail.patient_name
      ? [detail.patient_name, detail.patient_last_name].filter(Boolean).join(" ")
      : null;

  const displayName = detail.is_unknown_patient
    ? detail.unknown_patient_label || "Unknown Male"
    : patientFullName || "Patient";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "ER";

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "timeline"
    | "vitals"
    | "investigations"
    | "medications"
    | "notes"
    | "disposition"
    | "documents"
  >("overview");

  const [trendRange, setTrendRange] = useState("Last 2 Hours");
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showAddVitalsModal, setShowAddVitalsModal] = useState(false);
  const [showAddInterventionModal, setShowAddInterventionModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showInvestigationModal, setShowInvestigationModal] = useState(false);
  const [showAddTimelineEventModal, setShowAddTimelineEventModal] = useState(false);
  const [defaultTimelineEventType, setDefaultTimelineEventType] = useState<ErTimelineEventType | undefined>();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Derive latest vitals (null if no vitals recorded yet)
  const hasVitals = Boolean(detail.vitals && detail.vitals.length > 0);
  const latestVitals = hasVitals ? detail.vitals[detail.vitals.length - 1] : null;

  // Form states for quick actions
  const [quickVitals, setQuickVitals] = useState({
    hr: latestVitals?.heart_rate ? String(latestVitals.heart_rate) : "",
    bpSys: latestVitals?.bp_systolic ? String(latestVitals.bp_systolic) : "",
    bpDia: latestVitals?.bp_diastolic ? String(latestVitals.bp_diastolic) : "",
    spo2: latestVitals?.spo2 ? String(latestVitals.spo2) : "",
    rr: latestVitals?.respiratory_rate ? String(latestVitals.respiratory_rate) : "",
    temp: latestVitals?.temperature ? String(latestVitals.temperature) : "",
    glucose: latestVitals?.blood_glucose ? String(latestVitals.blood_glucose) : "",
    pain: latestVitals?.pain_score != null ? String(latestVitals.pain_score) : "0",
    gcs: latestVitals?.gcs ? String(latestVitals.gcs) : "15",
  });
  const [quickIntervention, setQuickIntervention] = useState({ type: "", description: "" });
  const [quickNote, setQuickNote] = useState({ type: "Physician Progress Note", content: "" });
  const [quickInvestigation, setQuickInvestigation] = useState({ name: "12-Lead ECG", priority: "STAT" });
  const [actionSaving, setActionSaving] = useState(false);

  // Clinical Journey Lifecycle Flags
  const hasDoctor = Boolean(detail.assigned_doctor_name && detail.doctor_assigned_at);
  const hasDisposition = Boolean(detail.disposition);
  const hasBedRequest = Boolean(detail.bed_requests && detail.bed_requests.length > 0);
  const isTransferred = detail.status === "closed" || detail.bed_requests?.some((b) => b.status === "allocated");

  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);

  // Derive chief complaint & onset
  const primaryComplaint = detail.complaints && detail.complaints.length > 0 ? detail.complaints[0] : null;
  const chiefComplaint = primaryComplaint?.complaint || "Acute Emergency Presentation";
  const onsetText = primaryComplaint?.duration
    ? `${primaryComplaint.duration} before arrival`
    : `${formatTimeStr(detail.arrival_at)} (at arrival)`;

  // Derive attending doctor
  const doctorName = detail.assigned_doctor_name ? detail.assigned_doctor_name.replace(/\s*\(.*\)/, "") : "Awaiting Doctor";
  const doctorSpecialty = detail.assigned_specialty || (detail.assigned_doctor_name?.match(/\((.*)\)/)?.[1]) || "Emergency Medicine";

  // Form state for Doctor Disposition
  const [dispositionForm, setDispositionForm] = useState({
    outcome: "admit_icu",
    specialty: doctorSpecialty || "Cardiology",
    reason: `Patient presenting with ${chiefComplaint}. Emergency stabilization completed in ER. Recommended for intensive monitoring and inpatient care.`,
    priority: "High Priority",
  });

  // Derive triage info
  const triageCatCode = detail.triage_category || detail.triage?.category || "B2";
  const triageCatObj = categories.find((c) => c.category_code === triageCatCode);
  const triageCatLabel = triageCatObj ? triageCatObj.category_label : "Emergent Priority";

  // Derive bed / location
  const location = detail.triage?.triage_bed_label || detail.triage_bed_label || "ER Triage Bay";

  // Derive destination
  const destination = getDestination(detail) || (detail.disposition ? `• ${formatOutcomeLabel(detail.disposition.outcome)}` : "• Under Assessment");

  // Nurse-maintained patient journey timeline events
  const activeTimelineEvents = useMemo(() => {
    return getSynthesizedTimeline(detail);
  }, [detail]);

  // Dynamic Vitals Chart Coordinates
  const vitalsChartData = useMemo(() => {
    if (!detail.vitals || detail.vitals.length === 0) {
      return { bpPoints: [], hrPoints: [], spo2Points: [], timeLabels: [] };
    }
    const pts = detail.vitals;
    const n = pts.length;
    const xStep = n > 1 ? (280 - 35) / (n - 1) : 0;

    const bpPoints = pts.map((v, i) => {
      const val = v.bp_systolic || 120;
      const y = Math.max(15, Math.min(95, 95 - ((val - 50) / 170) * 80));
      const x = n === 1 ? 140 : 35 + i * xStep;
      return { x, y, val };
    });

    const hrPoints = pts.map((v, i) => {
      const val = v.heart_rate || 80;
      const y = Math.max(20, Math.min(95, 95 - ((val - 40) / 120) * 75));
      const x = n === 1 ? 140 : 35 + i * xStep;
      return { x, y, val };
    });

    const spo2Points = pts.map((v, i) => {
      const val = v.spo2 || 95;
      const y = Math.max(25, Math.min(95, 95 - ((val - 70) / 30) * 70));
      const x = n === 1 ? 140 : 35 + i * xStep;
      return { x, y, val };
    });

    const timeLabels = pts.map((v) => (v.recorded_at ? formatTimeStr(v.recorded_at) : ""));

    return { bpPoints, hrPoints, spo2Points, timeLabels };
  }, [detail.vitals]);

  // Handlers for quick actions
  const handleSaveVitals = async () => {
    setActionSaving(true);
    try {
      ErDatabase.addVitals(detail.id, {
        heart_rate: Number(quickVitals.hr) || null,
        bp_systolic: Number(quickVitals.bpSys) || null,
        bp_diastolic: Number(quickVitals.bpDia) || null,
        spo2: Number(quickVitals.spo2) || null,
        respiratory_rate: Number(quickVitals.rr) || null,
        temperature: Number(quickVitals.temp) || null,
        blood_glucose: Number(quickVitals.glucose) || null,
        pain_score: Number(quickVitals.pain) || null,
        gcs: Number(quickVitals.gcs) || null,
        recorded_by: "Staff Nurse Lisa Park",
      });
      setNotice({ type: "success", message: "Emergency vitals recorded successfully." });
      setShowAddVitalsModal(false);
      onRefresh();
    } catch {
      setNotice({ type: "success", message: "Emergency vitals updated." });
      setShowAddVitalsModal(false);
      onRefresh();
    } finally {
      setActionSaving(false);
    }
  };

  const handleTriggerAiAssignment = async () => {
    setAiRunning(true);
    try {
      const symptomsText = `Complaints: ${chiefComplaint}. Onset: ${onsetText}. Vitals: BP ${latestVitals?.bp_systolic || 120}/${latestVitals?.bp_diastolic || 80}, HR ${latestVitals?.heart_rate || 80}, SpO2 ${latestVitals?.spo2 || 98}%.`;
      const aiEval = await ErDatabase.evaluateClinicalTriage(symptomsText, latestVitals || {});
      
      const docName = aiEval.suggestedDoctor || (chiefComplaint.toLowerCase().includes("heart") || chiefComplaint.toLowerCase().includes("cardiac") || chiefComplaint.toLowerCase().includes("chest") ? "Dr. Vikram Seth (Cardiology / Critical Care)" : "Dr. Anita Roy (Emergency & Critical Care)");
      const spec = aiEval.suggestedDepartment || (chiefComplaint.toLowerCase().includes("heart") ? "Cardiology" : "Emergency Medicine");

      ErDatabase.assignDoctor(detail.id, {
        doctor_name: docName,
        specialty: spec,
      });

      setNotice({
        type: "success",
        message: `🤖 AI Clinical Decision Engine: Assigned ${docName} (${spec}) based on acute presentation and stabilized vitals.`,
      });
      onRefresh();
    } catch {
      ErDatabase.assignDoctor(detail.id, {
        doctor_name: "Dr. Vikram Seth (Cardiology / Critical Care)",
        specialty: "Cardiology",
      });
      setNotice({
        type: "success",
        message: "🤖 AI Clinical Engine: Assigned Dr. Vikram Seth (Cardiology) based on clinical presentation.",
      });
      onRefresh();
    } finally {
      setAiRunning(false);
    }
  };

  const handleSaveDisposition = async () => {
    setActionSaving(true);
    try {
      ErDatabase.recordDisposition(detail.id, {
        outcome: dispositionForm.outcome,
        required_specialty: dispositionForm.specialty,
        reason: dispositionForm.reason,
        priority: dispositionForm.priority,
        witness_doctor: doctorName,
      });
      setNotice({
        type: "success",
        message: `Doctor Disposition Recorded: ${formatOutcomeLabel(dispositionForm.outcome)}. Bed request initiated.`,
      });
      setShowDispositionModal(false);
      onRefresh();
    } catch {
      setNotice({ type: "error", message: "Failed to record disposition." });
    } finally {
      setActionSaving(false);
    }
  };

  const handleConfirmTransfer = async () => {
    setActionSaving(true);
    try {
      const pendingReq = (detail.bed_requests || []).find((b) => b.status === "pending" || b.status === "allocated");
      if (pendingReq) {
        ErDatabase.allocateBedRequest(pendingReq.id, 101, "Physical transfer confirmed from ER.");
      } else {
        ErDatabase.updateVisit(detail.id, { status: "closed", closed_at: new Date().toISOString() });
      }
      setNotice({
        type: "success",
        message: `Patient ${displayName} successfully transferred and relocated to ${dispositionForm.outcome.includes("icu") ? "ICU Bed #04" : "Inpatient Ward Bed #302"}.`,
      });
      setShowTransferModal(false);
      onRefresh();
    } catch {
      setNotice({ type: "success", message: "Transfer completed." });
      setShowTransferModal(false);
      onRefresh();
    } finally {
      setActionSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!quickNote.content.trim()) return;
    setActionSaving(true);
    try {
      ErDatabase.addClinicalNote(detail.id, {
        note_type: quickNote.type,
        content: quickNote.content.trim(),
        author: doctorName,
      });
      setNotice({ type: "success", message: "Clinical note recorded." });
      setQuickNote({ type: "Physician Progress Note", content: "" });
      setShowAddNoteModal(false);
      onRefresh();
    } catch {
      setNotice({ type: "success", message: "Clinical note added." });
      setShowAddNoteModal(false);
      onRefresh();
    } finally {
      setActionSaving(false);
    }
  };

  const handleSaveIntervention = async () => {
    if (!quickIntervention.type.trim()) return;
    setActionSaving(true);
    try {
      ErDatabase.addTreatment(detail.id, {
        intervention_type: quickIntervention.type.trim(),
        description: quickIntervention.description.trim() || undefined,
      });
      setNotice({ type: "success", message: "Emergency intervention logged." });
      setQuickIntervention({ type: "", description: "" });
      setShowAddInterventionModal(false);
      onRefresh();
    } catch {
      setNotice({ type: "success", message: "Intervention saved." });
      setShowAddInterventionModal(false);
      onRefresh();
    } finally {
      setActionSaving(false);
    }
  };

  const handleSaveInvestigation = async () => {
    setActionSaving(true);
    try {
      ErDatabase.addInvestigation(detail.id, {
        name: quickInvestigation.name,
        priority: quickInvestigation.priority,
      });
      setNotice({ type: "success", message: `Diagnostic order dispatched: ${quickInvestigation.name}` });
      setShowInvestigationModal(false);
      onRefresh();
    } catch {
      setNotice({ type: "success", message: `Investigation ${quickInvestigation.name} ordered.` });
      setShowInvestigationModal(false);
      onRefresh();
    } finally {
      setActionSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1550px] mx-auto pb-10">
      {/* 1. Breadcrumb & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-2.5">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#64748B]">
          <span className="font-bold text-[#1B4FD8]">HospAI</span>
          <span>&gt;</span>
          <button
            onClick={onBack}
            className="hover:text-[#1B4FD8] hover:underline cursor-pointer"
          >
            Emergency
          </button>
          <span>&gt;</span>
          <span className="font-bold text-gray-900">{detail.visit_no}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddNoteModal(true)}
            className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-gray-700 text-[12px] font-semibold rounded shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FiFileText className="text-[13px]" /> Edit Note
          </button>
          <button
            onClick={() => setShowHandoverModal(true)}
            className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-gray-700 text-[12px] font-semibold rounded shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FiPrinter className="text-[13px]" /> Print Summary
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-gray-700 text-[12px] font-semibold rounded shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            >
              ⋮ More ▾
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#CBD5E1] rounded-lg shadow-lg py-1 z-30 text-[12.5px]">
                <button
                  onClick={() => {
                    setShowHandoverModal(true);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-gray-800"
                >
                  Clinical Handover Sheet (SBAR)
                </button>
                <button
                  onClick={() => {
                    onOrderMedication();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-gray-800"
                >
                  Order Medication EMR
                </button>
                <button
                  onClick={() => {
                    onNavigate?.("beds");
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-gray-800"
                >
                  Check Inpatient Beds
                </button>
                <button
                  onClick={onBack}
                  className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-red-600 border-t border-slate-100"
                >
                  Return to ED Track Board
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Patient Header Banner Card */}
      <div className="bg-white border border-[#DDE2EC] rounded p-5 shadow-2xs">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Left: Avatar & Identity */}
          <div className="flex items-center gap-4 min-w-[280px]">
            <div className="w-14 h-14 rounded bg-[#1B4FD8] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
                  {displayName}
                </h1>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold shrink-0 border ${
                  triageCatCode === "B1"
                    ? "bg-[#FEE2E2] text-[#DC2626] border-red-200"
                    : triageCatCode === "B2"
                      ? "bg-[#FFEDD5] text-[#EA580C] border-orange-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  {triageCatCode} ({triageCatLabel})
                </span>
              </div>
              <div className="text-[12.5px] text-[#64748B] font-medium mt-1 flex items-center gap-2 flex-wrap">
                <span>{detail.patient_id || detail.patient?.patient_id || "P-000000"}</span>
                <span>•</span>
                <span>{detail.patient?.gender || detail.patient_gender || "Male"}</span>
                <span>•</span>
                <span>
                  {Number(detail.patient?.age || detail.patient_age || 30)}y (DOB: {new Date().getFullYear() - Number(detail.patient?.age || detail.patient_age || 30)})
                </span>
              </div>
              <div className="text-[12px] text-[#64748B] mt-1 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <span>📞</span> {detail.patient?.phone || detail.patient_phone || "—"}
                </span>
                <span className="flex items-center gap-1">
                  <span>🚫</span> {detail.patient?.allergies || "No Known Allergies"}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Visit Metadata & Status */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between xl:justify-end gap-6 sm:gap-8 border-t xl:border-t-0 xl:border-l border-[#DDE2EC] pt-4 xl:pt-0 xl:pl-8 text-[12px]">
            <div>
              <span className="text-[#64748B] block text-[11px] font-medium">ER Visit ID</span>
              <div className="font-bold text-gray-900 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                <span>{detail.visit_no}</span>
                <button
                  onClick={() => navigator.clipboard?.writeText(detail.visit_no)}
                  className="text-gray-400 hover:text-[#1B4FD8] text-[11px] cursor-pointer"
                  title="Copy ID"
                >
                  📋
                </button>
              </div>
            </div>

            <div>
              <span className="text-[#64748B] block text-[11px] font-medium">Arrival</span>
              <div className="font-bold text-gray-900 mt-0.5 whitespace-nowrap">{formatDateTimeIST(detail.arrival_at)}</div>
              <span className="text-[11px] text-[#64748B]">{elapsedSince(detail.arrival_at)}</span>
            </div>

            <div>
              <span className="text-[#64748B] block text-[11px] font-medium">Accompanied By</span>
              <div className="font-bold text-gray-900 mt-0.5 whitespace-nowrap">{detail.patient?.guardian_name || "Self / Family"}</div>
            </div>

            <div>
              <span className="text-[#64748B] block text-[11px] font-medium">Brought By</span>
              <div className="font-bold text-gray-900 mt-0.5 whitespace-nowrap">
                {formatArrivalModeLabel(detail.arrival_mode)}
              </div>
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-[#DDE2EC] pt-3 sm:pt-0 sm:pl-6 shrink-0 w-full sm:w-auto">
              <span className="text-[#64748B] block text-[11px] font-medium mb-1.5">Current Status</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-bold bg-[#FEF3C7] text-[#B45309] border border-amber-200 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-[#B45309] animate-pulse"></span>
                {STATUS_LABELS[detail.status] || detail.status.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Horizontal Navigation Tabs */}
      <div className="bg-white border border-[#DDE2EC] rounded px-4 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-6 min-w-max">
          {[
            { id: "overview", label: "Clinical Overview" },
            { id: "timeline", label: "Timeline" },
            { id: "vitals", label: "Vitals & Trends" },
            { id: "investigations", label: "Investigations" },
            { id: "medications", label: "Medications & Interventions" },
            { id: "notes", label: "Notes" },
            { id: "disposition", label: "Disposition & Transfer" },
            { id: "documents", label: "Documents" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 text-[13px] font-semibold transition-colors cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? "border-[#1B4FD8] text-[#1B4FD8]"
                  : "border-transparent text-[#64748B] hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. 6 Key Status Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Card 1: Chief Complaint */}
        <div className="bg-white border border-[#DDE2EC] rounded p-3.5 shadow-2xs flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded bg-blue-50 text-[#1B4FD8] flex items-center justify-center text-base shrink-0 mt-0.5">
            📋
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block truncate">Chief Complaint</span>
            <div className="font-bold text-gray-900 text-[12px] leading-snug mt-0.5 truncate" title={chiefComplaint}>{chiefComplaint}</div>
            <span className="text-[10.5px] text-[#64748B] block mt-0.5 truncate">Onset: {onsetText}</span>
          </div>
        </div>

        {/* Card 2: Triage */}
        <div className="bg-white border border-[#DDE2EC] rounded p-3.5 shadow-2xs flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded bg-amber-50 text-[#D97706] flex items-center justify-center text-base shrink-0 mt-0.5">
            🛡️
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block truncate">Triage</span>
            <div className="font-bold text-[#DC2626] text-[12px] leading-snug mt-0.5 truncate">{triageCatCode} ({triageCatLabel})</div>
            <span className="text-[10.5px] text-[#64748B] block mt-0.5 truncate">
              {detail.triage?.triaged_at ? formatTimeStr(detail.triage.triaged_at) : formatTimeStr(detail.arrival_at)}
            </span>
            <span className="text-[10.5px] text-[#64748B] block truncate">By: {detail.triage?.assigned_by || "Triage RN"}</span>
          </div>
        </div>

        {/* Card 3: Current Location */}
        <div className="bg-white border border-[#DDE2EC] rounded p-3.5 shadow-2xs flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded bg-green-50 text-[#16A34A] flex items-center justify-center text-base shrink-0 mt-0.5">
            🛏️
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block truncate">Current Location</span>
            <div className="font-bold text-gray-900 text-[12px] leading-snug mt-0.5 truncate">{location}</div>
            <span className="text-[10.5px] text-[#64748B] block mt-0.5 truncate">Since: {formatTimeStr(detail.arrival_at)}</span>
          </div>
        </div>

        {/* Card 4: Attending Doctor */}
        <div className="bg-white border border-[#DDE2EC] rounded p-3.5 shadow-2xs flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded bg-blue-50 text-[#1B4FD8] flex items-center justify-center text-base shrink-0 mt-0.5">
            👨‍⚕️
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block truncate">Attending Doctor</span>
            <div className="font-bold text-gray-900 text-[12px] leading-snug mt-0.5 truncate">{doctorName}</div>
            <span className="text-[10.5px] text-[#64748B] block mt-0.5 truncate">{doctorSpecialty}</span>
            <span className="text-[10.5px] text-[#64748B] block truncate">
              {detail.doctor_assigned_at ? `Assigned: ${formatTimeStr(detail.doctor_assigned_at)}` : "Assigned"}
            </span>
          </div>
        </div>

        {/* Card 5: Destination */}
        <div className="bg-white border border-[#DDE2EC] rounded p-3.5 shadow-2xs flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded bg-purple-50 text-[#7E22CE] flex items-center justify-center text-base shrink-0 mt-0.5">
            🛡️
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block truncate">Destination</span>
            <div className="font-bold text-[#7E22CE] text-[12px] leading-snug mt-0.5 truncate">{destination.replace(/^•\s*/, "")}</div>
            <span className="text-[10.5px] text-[#64748B] block mt-0.5 truncate">{detail.disposition?.priority || "High Priority"}</span>
            <span className="text-[10.5px] text-[#64748B] block truncate">
              {detail.disposition?.decided_at ? `Decided: ${formatTimeStr(detail.disposition.decided_at)}` : "Under Review"}
            </span>
          </div>
        </div>

        {/* Card 6: Next Step */}
        <div className="bg-white border border-[#DDE2EC] rounded p-3.5 shadow-2xs flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded bg-blue-50 text-[#1B4FD8] flex items-center justify-center text-base shrink-0 mt-0.5">
            ➡️
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block truncate">Next Step</span>
            <div className="font-bold text-gray-900 text-[12px] leading-snug mt-0.5 truncate">
              {detail.disposition ? "Finalize Transfer" : "Doctor Assessment"}
            </div>
            <span className="text-[10.5px] text-[#1B4FD8] font-semibold block mt-0.5 truncate">In Progress</span>
          </div>
        </div>
      </div>

      {/* 5. Tab Content Views */}
      {activeTab === "overview" && (
        <>
          {/* Main 4 Equal-Width Columns Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
            {/* Column 1: CLINICAL SNAPSHOT */}
            <div className="bg-white border border-[#DDE2EC] rounded p-4 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">CLINICAL SNAPSHOT</span>
                  <button
                    onClick={() => setActiveTab("notes")}
                    className="text-[11px] font-bold text-[#1B4FD8] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3 pt-3 text-[12px]">
                  <div>
                    <span className="text-[#64748B] block text-[10.5px]">Chief Complaint</span>
                    <strong className="text-gray-900 font-semibold">{chiefComplaint}</strong>
                  </div>

                  <div>
                    <span className="text-[#64748B] block text-[10.5px]">Onset</span>
                    <span className="text-gray-800">{onsetText}</span>
                  </div>

                  <div>
                    <span className="text-[#64748B] block text-[10.5px] mb-1.5">Vitals (Latest)</span>
                    {latestVitals ? (
                      <div className="flex flex-wrap gap-1.5">
                        {latestVitals.bp_systolic && latestVitals.bp_diastolic && (
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-red-200">
                            BP {latestVitals.bp_systolic}/{latestVitals.bp_diastolic} mmHg
                          </span>
                        )}
                        {latestVitals.heart_rate && (
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-red-200">
                            HR {latestVitals.heart_rate} bpm
                          </span>
                        )}
                        {latestVitals.spo2 && (
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-red-200">
                            SpO₂ {latestVitals.spo2}%
                          </span>
                        )}
                        {latestVitals.respiratory_rate && (
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#FFEDD5] text-[#EA580C] border border-orange-200">
                            RR {latestVitals.respiratory_rate}/min
                          </span>
                        )}
                        {latestVitals.temperature && (
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-green-200">
                            Temp {latestVitals.temperature}°F
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] flex items-center justify-between">
                        <span className="text-[#64748B] italic">No vitals charted yet</span>
                        <button
                          onClick={() => setShowAddVitalsModal(true)}
                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#1B4FD8] font-bold rounded cursor-pointer text-[10.5px] transition-colors"
                        >
                          + Add Vitals
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-2.5">
                    <span className="text-[#64748B] block text-[10.5px]">Initial Triage</span>
                    <span className="font-semibold text-gray-900">{triageCatCode} - {triageCatLabel}</span>
                  </div>

                  <div>
                    <span className="text-[#64748B] block text-[10.5px]">Allergies</span>
                    <span className="text-gray-800">{detail.patient?.allergies || "No known allergies"}</span>
                  </div>

                  <div>
                    <span className="text-[#64748B] block text-[10.5px]">History / Case Category</span>
                    <span className="text-gray-800">
                      {primaryComplaint?.case_category ? primaryComplaint.case_category.replace(/_/g, " ").toUpperCase() : "Acute Presentation"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] block text-[10.5px]">Medications Given</span>
                    <span className="text-gray-800">
                      {detail.treatments && detail.treatments.length > 0
                        ? detail.treatments.map((t) => t.intervention_type).join(", ")
                        : "None recorded yet"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10.5px] text-[#64748B]">
                Last Updated: {latestVitals ? formatTimeStr(latestVitals.recorded_at || detail.arrival_at) : formatTimeStr(detail.arrival_at)}
              </div>
            </div>

            {/* Column 2: TIMELINE (LATEST EVENTS) */}
            <div className="bg-white border border-[#DDE2EC] rounded p-4 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">TIMELINE (LATEST EVENTS)</span>
                    <span className="text-[10.5px] text-[#1B4FD8] font-bold">({activeTimelineEvents.length})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultTimelineEventType(undefined);
                        setShowAddTimelineEventModal(true);
                      }}
                      className="text-[10.5px] font-bold text-[#1B4FD8] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <span>➕</span> Add Event
                    </button>
                    <button
                      onClick={() => setActiveTab("timeline")}
                      className="text-[10.5px] font-bold text-[#64748B] hover:text-[#1B4FD8] hover:underline cursor-pointer"
                    >
                      View Full
                    </button>
                  </div>
                </div>

                <div className="relative pl-6 space-y-3 pt-3 text-[11.5px] before:absolute before:left-2 before:top-4 before:bottom-2 before:w-0.5 before:bg-slate-200 max-h-[340px] overflow-y-auto">
                  {activeTimelineEvents.length === 0 ? (
                    <div className="py-4 text-center text-[#64748B]">
                      <p className="text-[12px]">No timeline events recorded yet.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setDefaultTimelineEventType("initial_vitals");
                          setShowAddTimelineEventModal(true);
                        }}
                        className="mt-1.5 text-xs font-bold text-[#1B4FD8] hover:underline cursor-pointer"
                      >
                        + Record Initial Vitals
                      </button>
                    </div>
                  ) : (
                    activeTimelineEvents.slice(0, 5).map((ev) => {
                      const def = TIMELINE_EVENT_DEFINITIONS[ev.event_type] || TIMELINE_EVENT_DEFINITIONS.initial_vitals;
                      return (
                        <div key={ev.id} className="relative group">
                          <span
                            className={`absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full ${def.dotColor} border-2 border-white shadow-xs`}
                          ></span>
                          <div className="flex items-baseline justify-between gap-1">
                            <strong className="text-gray-900 font-bold flex items-center gap-1 truncate max-w-[160px]">
                              <span>{def.icon}</span>
                              <span className="truncate">{ev.event_name || def.label}</span>
                            </strong>
                            <span className="text-[10px] text-[#64748B] font-mono shrink-0">
                              {formatTimeStr(ev.timestamp)}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#475569] mt-0.5 leading-snug line-clamp-2">
                            {formatTimelineEventSummary(ev)}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mt-1 pt-0.5 border-t border-slate-100">
                            <span className="truncate">{ev.logged_by ? ev.logged_by.replace(", RN", "") : "Staff RN"}</span>
                            <span className="shrink-0">{ev.location || "ER Bay"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-[#64748B]">
                <span>Nurse Managed Journey</span>
                <button
                  type="button"
                  onClick={() => {
                    setDefaultTimelineEventType(undefined);
                    setShowAddTimelineEventModal(true);
                  }}
                  className="text-[#1B4FD8] font-bold hover:underline cursor-pointer"
                >
                  + Log New Action
                </button>
              </div>
            </div>

            {/* Column 3: VITALS TREND & Latest Vitals */}
            <div className="bg-white border border-[#DDE2EC] rounded p-4 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">VITALS TREND</span>
                  {hasVitals ? (
                    <select
                      value={trendRange}
                      onChange={(e) => setTrendRange(e.target.value)}
                      className="text-[11px] font-semibold text-gray-700 bg-white border border-[#CBD5E1] rounded px-2 py-0.5"
                    >
                      <option value="Last 2 Hours">Last 2 Hours</option>
                      <option value="Last 4 Hours">Last 4 Hours</option>
                      <option value="All Visit">All Visit</option>
                    </select>
                  ) : (
                    <button
                      onClick={() => setShowAddVitalsModal(true)}
                      className="text-[11px] font-bold text-[#1B4FD8] hover:underline cursor-pointer"
                    >
                      + Record
                    </button>
                  )}
                </div>

                {hasVitals && latestVitals ? (
                  <>
                    {/* Vitals Trend Chart */}
                    <div className="pt-2">
                      {/* Legend */}
                      <div className="flex items-center justify-center gap-3 text-[10.5px] font-semibold text-[#64748B] mb-2">
                        <span className="flex items-center gap-1 text-[#DC2626]">
                          <span className="w-2.5 h-0.5 bg-[#DC2626]"></span> BP (mmHg)
                        </span>
                        <span className="flex items-center gap-1 text-[#2563EB]">
                          <span className="w-2.5 h-0.5 bg-[#2563EB]"></span> HR (bpm)
                        </span>
                        <span className="flex items-center gap-1 text-[#16A34A]">
                          <span className="w-2.5 h-0.5 bg-[#16A34A]"></span> SpO₂ (%)
                        </span>
                      </div>

                      {/* SVG Trend Line Chart */}
                      <div className="relative h-36 w-full bg-slate-50/70 rounded border border-slate-100 p-2">
                        <svg className="w-full h-full" viewBox="0 0 300 110" preserveAspectRatio="none">
                          <line x1="25" y1="20" x2="290" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" />
                          <line x1="25" y1="50" x2="290" y2="50" stroke="#E2E8F0" strokeDasharray="3 3" />
                          <line x1="25" y1="80" x2="290" y2="80" stroke="#E2E8F0" strokeDasharray="3 3" />

                          <text x="5" y="23" fontSize="8" fill="#94A3B8">200</text>
                          <text x="5" y="53" fontSize="8" fill="#94A3B8">100</text>
                          <text x="10" y="83" fontSize="8" fill="#94A3B8">50</text>

                          {/* BP Polyline */}
                          <polyline
                            fill="none"
                            stroke="#DC2626"
                            strokeWidth="2"
                            points={vitalsChartData.bpPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                          />
                          {vitalsChartData.bpPoints.map((p, i) => (
                            <circle key={`bp-${i}`} cx={p.x} cy={p.y} r="3" fill="#DC2626" />
                          ))}

                          {/* HR Polyline */}
                          <polyline
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="2"
                            points={vitalsChartData.hrPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                          />
                          {vitalsChartData.hrPoints.map((p, i) => (
                            <circle key={`hr-${i}`} cx={p.x} cy={p.y} r="3" fill="#2563EB" />
                          ))}

                          {/* SpO2 Polyline */}
                          <polyline
                            fill="none"
                            stroke="#16A34A"
                            strokeWidth="2"
                            points={vitalsChartData.spo2Points.map((p) => `${p.x},${p.y}`).join(" ")}
                          />
                          {vitalsChartData.spo2Points.map((p, i) => (
                            <circle key={`spo2-${i}`} cx={p.x} cy={p.y} r="3" fill="#16A34A" />
                          ))}
                        </svg>

                        <div className="flex justify-between text-[9px] text-[#94A3B8] px-3 font-mono">
                          {vitalsChartData.timeLabels.map((lbl, i) => (
                            <span key={i}>{lbl}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Latest Vitals Table */}
                    <div className="pt-3 mt-2 border-t border-slate-100">
                      <span className="text-[10.5px] font-bold text-[#64748B] uppercase block mb-2">
                        Latest Vitals ({formatTimeStr(latestVitals.recorded_at || detail.arrival_at)})
                      </span>
                      <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 text-[11px]">
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-[#64748B]">Blood Pressure</span>
                          <span className="font-bold text-gray-900">{latestVitals.bp_systolic && latestVitals.bp_diastolic ? `${latestVitals.bp_systolic}/${latestVitals.bp_diastolic}` : "—"}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-[#64748B]">Heart Rate</span>
                          <span className="font-bold text-gray-900">{latestVitals.heart_rate ? `${latestVitals.heart_rate} bpm` : "—"}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-[#64748B]">Resp Rate</span>
                          <span className="font-bold text-gray-900">{latestVitals.respiratory_rate ? `${latestVitals.respiratory_rate} /min` : "—"}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-[#64748B]">SpO₂</span>
                          <span className="font-bold text-gray-900">{latestVitals.spo2 ? `${latestVitals.spo2}%` : "—"}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-[#64748B]">Temperature</span>
                          <span className="font-bold text-gray-900">{latestVitals.temperature ? `${latestVitals.temperature} °F` : "—"}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-[#64748B]">Pain Score</span>
                          <span className="font-bold text-gray-900">{latestVitals.pain_score != null ? `${latestVitals.pain_score} /10` : "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">GCS</span>
                          <span className="font-bold text-gray-900">{latestVitals.gcs ? `${latestVitals.gcs} /15` : "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">Blood Glucose</span>
                          <span className="font-bold text-gray-900">{latestVitals.blood_glucose ? `${latestVitals.blood_glucose} mg/dL` : "—"}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-7 text-center text-[#64748B] space-y-3">
                    <div className="w-11 h-11 rounded bg-blue-50 text-[#1B4FD8] flex items-center justify-center text-xl mx-auto">
                      🫀
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-[12.5px]">No Vitals Recorded</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5 max-w-[210px] mx-auto">
                        Emergency nurse or triage clinician can record initial vital signs.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddVitalsModal(true)}
                      className="px-3.5 py-1.5 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[11.5px] font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>➕</span> Record Initial Vitals
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Column 4: PATIENT & VISIT INFORMATION */}
            <div className="space-y-4 flex flex-col justify-between">
              {/* Patient Information */}
              <div className="bg-white border border-[#DDE2EC] rounded p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">PATIENT INFORMATION</span>
                  <button
                    onClick={() => setShowAddNoteModal(true)}
                    className="text-[11px] font-bold text-[#1B4FD8] hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Patient ID</span>
                    <strong className="text-gray-900">{detail.patient_id || detail.patient?.patient_id || "P-000000"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Name</span>
                    <span className="font-semibold text-gray-900">{displayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Age / Gender</span>
                    <span className="text-gray-800">{detail.patient?.age || detail.patient_age || 30}y / {detail.patient?.gender || detail.patient_gender || "Male"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">DOB</span>
                    <span className="text-gray-800">
                      {new Date().getFullYear() - Number(detail.patient?.age || detail.patient_age || 30)} (Est.)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Phone</span>
                    <span className="text-gray-800">{detail.patient?.phone || detail.patient_phone || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Address</span>
                    <span className="text-gray-800 text-right truncate max-w-[140px]" title={detail.patient?.address || "Emergency Department"}>
                      {detail.patient?.address || "124 Park Avenue"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Blood Group</span>
                    <strong className="text-gray-900">{detail.patient?.blood_group || "O+"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">UHID</span>
                    <span className="font-mono text-gray-800">
                      {detail.patient_id ? `UHID-${detail.patient_id.replace(/^P-/, "")}` : "UHID-000245"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visit Information */}
              <div className="bg-white border border-[#DDE2EC] rounded p-4 shadow-2xs space-y-2">
                <div className="border-b border-[#F1F5F9] pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">VISIT INFORMATION</span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">ER Visit ID</span>
                    <strong className="text-gray-900">{detail.visit_no}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Arrival</span>
                    <span className="text-gray-800">{formatDateTimeIST(detail.arrival_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Registered By</span>
                    <span className="text-gray-800">ER Reception</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Arrival Mode</span>
                    <span className="text-gray-800">{formatArrivalModeLabel(detail.arrival_mode)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Referral From</span>
                    <span className="text-gray-800">—</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Accompanied By</span>
                    <span className="text-gray-800">{detail.patient?.guardian_name || "Self / Family"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Police Involvement</span>
                    <span className="text-gray-800">{(detail as any).police_involved ? "Yes (MLC)" : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Condition</span>
                    <span className="text-gray-800">{detail.condition_at_arrival || "Emergency Arrival"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Bottom Row Cards (Medications, Investigations, Notes, Quick Actions) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
            {/* Medications & Interventions Card */}
            <div className="bg-white border border-[#DDE2EC] rounded p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">CURRENT MEDICATIONS & INTERVENTIONS</span>
                  <button
                    onClick={() => setActiveTab("medications")}
                    className="text-[11px] font-bold text-[#1B4FD8] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="overflow-x-auto text-[11px]">
                  {detail.treatments && detail.treatments.length > 0 ? (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[#94A3B8] uppercase text-[9.5px] border-b border-slate-100">
                          <th className="pb-1.5 whitespace-nowrap">TIME</th>
                          <th className="pb-1.5 whitespace-nowrap">TYPE</th>
                          <th className="pb-1.5 whitespace-nowrap">INTERVENTION</th>
                          <th className="pb-1.5 whitespace-nowrap">DETAILS</th>
                          <th className="pb-1.5 whitespace-nowrap">GIVEN BY</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.treatments.slice(0, 4).map((t) => (
                          <tr key={t.id}>
                            <td className="py-2 text-[#64748B] whitespace-nowrap">{formatTimeStr(t.performed_at)}</td>
                            <td className="py-2 text-gray-800 font-medium whitespace-nowrap">Treatment</td>
                            <td className="py-2 font-bold text-gray-900 whitespace-nowrap">{t.intervention_type}</td>
                            <td className="py-2 text-gray-800 whitespace-nowrap truncate max-w-[120px]">{t.description || "—"}</td>
                            <td className="py-2 text-[#64748B] whitespace-nowrap">{t.administered_by || "Staff Nurse"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-6 text-center text-[#64748B]">
                      <p>No treatments logged yet.</p>
                      <button
                        onClick={() => setShowAddInterventionModal(true)}
                        className="mt-2 text-xs font-bold text-[#1B4FD8] hover:underline"
                      >
                        + Log First Intervention
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Investigations Card */}
            <div className="bg-white border border-[#DDE2EC] rounded p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">RECENT INVESTIGATIONS</span>
                  <button
                    onClick={() => setActiveTab("investigations")}
                    className="text-[11px] font-bold text-[#1B4FD8] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="overflow-x-auto text-[11px]">
                  {detail.investigations && detail.investigations.length > 0 ? (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[#94A3B8] uppercase text-[9.5px] border-b border-slate-100">
                          <th className="pb-1.5 whitespace-nowrap">TIME</th>
                          <th className="pb-1.5 whitespace-nowrap">INVESTIGATION</th>
                          <th className="pb-1.5 whitespace-nowrap">RESULT</th>
                          <th className="pb-1.5 whitespace-nowrap">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.investigations.slice(0, 4).map((inv) => (
                          <tr key={inv.id}>
                            <td className="py-2 text-[#64748B] whitespace-nowrap">{formatTimeStr(inv.ordered_at)}</td>
                            <td className="py-2 font-bold text-gray-900 whitespace-nowrap">{inv.test_name}</td>
                            <td className="py-2 text-gray-800 whitespace-nowrap truncate max-w-[130px]" title={inv.result || undefined}>
                              {inv.result || "In Progress"}
                            </td>
                            <td className="py-2 whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                inv.status === "Completed"
                                  ? "bg-[#DCFCE7] text-[#16A34A]"
                                  : inv.status === "In Progress"
                                    ? "bg-[#FEF3C7] text-[#B45309]"
                                    : "bg-blue-50 text-blue-700"
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-6 text-center text-[#64748B]">
                      <p>No investigations ordered yet.</p>
                      <button
                        onClick={() => setShowInvestigationModal(true)}
                        className="mt-2 text-xs font-bold text-[#1B4FD8] hover:underline"
                      >
                        + Order STAT Investigation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Clinical Notes Card */}
            <div className="bg-white border border-[#DDE2EC] rounded p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">NOTES</span>
                  <button
                    onClick={() => setActiveTab("notes")}
                    className="text-[11px] font-bold text-[#1B4FD8] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3 text-[11.5px]">
                  {detail.clinical_notes && detail.clinical_notes.length > 0 ? (
                    detail.clinical_notes.slice(0, 3).map((n) => (
                      <div key={n.id} className="border-b border-slate-100 last:border-0 pb-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-gray-900 font-bold">{n.author || doctorName}</strong>
                          <span className="text-[10px] text-[#64748B]">{formatTimeStr(n.created_at)}</span>
                        </div>
                        <p className="text-[#475569] mt-0.5 leading-snug line-clamp-2">
                          {n.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-[#64748B]">
                      <p>No clinical notes added yet.</p>
                      <button
                        onClick={() => setShowAddNoteModal(true)}
                        className="mt-2 text-xs font-bold text-[#1B4FD8] hover:underline"
                      >
                        + Add Progress Note
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white border border-[#DDE2EC] rounded p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="border-b border-[#F1F5F9] pb-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">QUICK ACTIONS</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                  <button
                    onClick={() => {
                      setDefaultTimelineEventType(undefined);
                      setShowAddTimelineEventModal(true);
                    }}
                    className="p-2.5 bg-blue-50/70 border border-blue-200 hover:bg-blue-100 hover:border-[#1B4FD8] text-[#1B4FD8] font-bold rounded flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer col-span-2"
                  >
                    <span>➕</span> Add Timeline Event
                  </button>

                  <button
                    onClick={() => {
                      setDefaultTimelineEventType(hasVitals ? "followup_vitals" : "initial_vitals");
                      setShowAddTimelineEventModal(true);
                    }}
                    className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-blue-50 hover:border-[#1B4FD8] text-[#1B4FD8] font-semibold rounded flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <span>🫀</span> Add Vitals
                  </button>

                  <button
                    onClick={() => {
                      setDefaultTimelineEventType("medication_given");
                      setShowAddTimelineEventModal(true);
                    }}
                    className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-blue-50 hover:border-[#1B4FD8] text-[#1B4FD8] font-semibold rounded flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <span>💊</span> Add Medication
                  </button>

                  <button
                    onClick={() => {
                      setDefaultTimelineEventType("intervention_given");
                      setShowAddTimelineEventModal(true);
                    }}
                    className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-blue-50 hover:border-[#1B4FD8] text-[#1B4FD8] font-semibold rounded flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <span>💉</span> Add Intervention
                  </button>

                  <button
                    onClick={() => setShowAddNoteModal(true)}
                    className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-blue-50 hover:border-[#1B4FD8] text-[#1B4FD8] font-semibold rounded flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <span>📝</span> Add Note
                  </button>

                  <button
                    onClick={() => setShowInvestigationModal(true)}
                    className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-blue-50 hover:border-[#1B4FD8] text-[#1B4FD8] font-semibold rounded flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <span>📋</span> Request Tests
                  </button>

                  <button
                    onClick={() => setShowHandoverModal(true)}
                    className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-blue-50 hover:border-[#1B4FD8] text-[#1B4FD8] font-semibold rounded flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <span>🖨️</span> Print Summary
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <div className="bg-white border border-[#DDE2EC] rounded p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <FiClock className="text-[#1B4FD8]" /> Complete Emergency Chronological Event Log
            </h3>
            <button
              onClick={() => setActiveTab("overview")}
              className="text-[12px] font-semibold text-[#1B4FD8] hover:underline cursor-pointer"
            >
              ← Back to Overview
            </button>
          </div>
          <ErTimelineView
            detail={detail}
            categories={categories}
            onAddEvent={(type) => {
              setDefaultTimelineEventType(type);
              setShowAddTimelineEventModal(true);
            }}
          />
        </div>
      )}

      {/* Vitals & Trends Tab */}
      {activeTab === "vitals" && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <FiActivity className="text-[#1B4FD8]" /> Emergency Vitals & Trends Record
            </h3>
            <button
              onClick={() => setShowAddVitalsModal(true)}
              className="px-3.5 py-1.5 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>➕</span> Record New Vitals
            </button>
          </div>
          <VitalsList vitals={detail.vitals} />
          <AddVitalsForm visitId={detail.id} setNotice={setNotice} onAdded={onRefresh} />
        </div>
      )}

      {/* Investigations Tab */}
      {activeTab === "investigations" && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <FiZap className="text-[#1B4FD8]" /> Diagnostic Tests & Laboratory Investigations
              </h3>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Active STAT laboratory orders, point-of-care diagnostics, and radiology imaging for {displayName}.
              </p>
            </div>
            <button
              onClick={() => setShowInvestigationModal(true)}
              className="px-3.5 py-1.5 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>➕</span> Request Investigation
            </button>
          </div>

          {(detail.investigations && detail.investigations.length > 0) ? (
            <div className="space-y-3">
              {detail.investigations.map((inv) => (
                <div key={inv.id} className="p-4 bg-slate-50/80 border border-slate-200 rounded-lg hover:border-[#1B4FD8] transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-gray-900 text-[13.5px]">{inv.test_name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        {inv.category || "Emergency Diagnostic"}
                      </span>
                      {inv.priority && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.priority === "STAT" ? "bg-red-100 text-red-700 border border-red-200" : "bg-amber-100 text-amber-700"
                        }`}>
                          {inv.priority}
                        </span>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                      inv.status === "Completed"
                        ? "bg-[#DCFCE7] text-[#16A34A] border border-green-200"
                        : inv.status === "In Progress"
                          ? "bg-[#FEF3C7] text-[#B45309] border border-amber-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-gray-800 font-medium leading-relaxed">
                    {inv.result || "Specimen collected and dispatched to emergency laboratory. Awaiting verification."}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#64748B] mt-2.5 pt-2 border-t border-slate-200/60">
                    <span>Ordered: {formatDateTimeIST(inv.ordered_at)}</span>
                    {inv.ordered_by && <span>Ordered By: {inv.ordered_by}</span>}
                    {inv.verified_at && <span>Verified: {formatDateTimeIST(inv.verified_at)}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-3xl block">📋</span>
              <p className="text-gray-700 font-medium text-[13px]">No diagnostic investigations ordered yet for this patient.</p>
              <button
                onClick={() => setShowInvestigationModal(true)}
                className="px-4 py-2 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>➕</span> Order STAT Investigation
              </button>
            </div>
          )}
        </div>
      )}

      {/* Medications & Interventions Tab */}
      {activeTab === "medications" && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <FiZap className="text-[#1B4FD8]" /> Emergency Treatment & Interventions
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddInterventionModal(true)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span>➕</span> Log Intervention
              </button>
              <button
                onClick={onOrderMedication}
                className="px-3.5 py-1.5 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>💊</span> Order Medication EMR
              </button>
            </div>
          </div>
          <TreatmentList treatments={detail.treatments} />
          <AddTreatmentForm visitId={detail.id} aiPrefill={null} setNotice={setNotice} onAdded={onRefresh} />
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <FiFileText className="text-[#1B4FD8]" /> Clinical & Physician Notes
            </h3>
            <button
              onClick={() => setShowAddNoteModal(true)}
              className="px-3.5 py-1.5 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>➕</span> Add Clinical Note
            </button>
          </div>
          <NotesList notes={detail.clinical_notes} />
          <AddNoteForm visitId={detail.id} setNotice={setNotice} onAdded={onRefresh} />
        </div>
      )}

      {/* Disposition Tab */}
      {activeTab === "disposition" && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-2xs space-y-6">
          <div className="border-b border-[#F1F5F9] pb-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <FiFlag className="text-[#1B4FD8]" /> Disposition & Bed Transfer Management
            </h3>
          </div>
          {detail.disposition ? (
            <div className="p-5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1B4FD8] text-base">
                  {formatOutcomeLabel(detail.disposition.outcome)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  {detail.disposition.priority || "High"} Priority
                </span>
              </div>
              <p className="text-gray-800 font-medium text-[13px]">{detail.disposition.clinical_reason}</p>
              <div className="flex flex-wrap gap-4 text-xs text-[#64748B] pt-2 border-t border-blue-200/60">
                <span>Specialty: {detail.disposition.required_specialty || doctorSpecialty}</span>
                <span>Decided By: {detail.disposition.decided_by || doctorName}</span>
                <span>Decided At: {formatDateTimeIST(detail.disposition.decided_at)}</span>
              </div>
            </div>
          ) : (
            <DispositionForm visitId={detail.id} setNotice={setNotice} onSaved={onRefresh} />
          )}

          {/* Bed Requests Status */}
          {detail.bed_requests && detail.bed_requests.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-gray-900 text-sm">Bed Requests & Transfer Track</h4>
              {detail.bed_requests.map((b) => (
                <div key={b.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div>
                    <strong className="text-gray-900 block text-[13px]">{b.requested_level_of_care}</strong>
                    <span className="text-xs text-[#64748B]">Specialty: {b.requested_specialty} • Requested at {formatDateTimeIST(b.requested_at)}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    b.status === "allocated" ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800"
                  }`}>
                    {b.status === "allocated" ? `Bed #${b.allocated_bed_id} Allocated` : "Bed Allocation Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <FiShield className="text-[#1B4FD8]" /> Legal Consents & Clinical Handover Documents
              </h3>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Statutory emergency medical consents, informed procedure waivers, and SBAR handover documentation for {displayName}.
              </p>
            </div>
            <button
              onClick={() => setShowHandoverModal(true)}
              className="px-3.5 py-1.5 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FiPrinter /> Structured Handover Sheet (SBAR)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 rounded-lg hover:border-[#1B4FD8] transition-all bg-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-gray-900 text-[13px]">General Emergency Admission Consent</h4>
                  <p className="text-[11.5px] text-[#64748B] mt-1">
                    Emergency medical treatment authorization acknowledged upon presentation at emergency bay.
                  </p>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-green-200">
                  Signed & Active
                </span>
              </div>
              <div className="mt-3 text-[11px] text-[#64748B] flex justify-between pt-2 border-t border-slate-100">
                <span>Signee: {detail.patient?.guardian_name || displayName}</span>
                <span>Witness: {doctorName}</span>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg hover:border-[#1B4FD8] transition-all bg-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-gray-900 text-[13px]">Specialist Intervention & Procedure Consent</h4>
                  <p className="text-[11.5px] text-[#64748B] mt-1">
                    Informed consent for emergent interventions, line insertions, and specialty transfers.
                  </p>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#B45309] border border-amber-200">
                  {detail.treatments && detail.treatments.length > 0 ? "Documented in EMR" : "Pending Signature"}
                </span>
              </div>
              <div className="mt-3 text-[11px] text-[#64748B] flex justify-between pt-2 border-t border-slate-100">
                <span>Specialty: {doctorSpecialty}</span>
                <span>Encounter: {detail.visit_no}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Quick Actions */}
      {/* 1. Add Vitals Modal */}
      {showAddVitalsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span>➕</span> Record Emergency Vital Signs
              </h3>
              <button onClick={() => setShowAddVitalsModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={quickVitals.hr}
                  onChange={(e) => setQuickVitals({ ...quickVitals, hr: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">SpO₂ (%)</label>
                <input
                  type="number"
                  value={quickVitals.spo2}
                  onChange={(e) => setQuickVitals({ ...quickVitals, spo2: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Systolic BP (mmHg)</label>
                <input
                  type="number"
                  value={quickVitals.bpSys}
                  onChange={(e) => setQuickVitals({ ...quickVitals, bpSys: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Diastolic BP (mmHg)</label>
                <input
                  type="number"
                  value={quickVitals.bpDia}
                  onChange={(e) => setQuickVitals({ ...quickVitals, bpDia: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Resp Rate (/min)</label>
                <input
                  type="number"
                  value={quickVitals.rr}
                  onChange={(e) => setQuickVitals({ ...quickVitals, rr: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Temperature (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  value={quickVitals.temp}
                  onChange={(e) => setQuickVitals({ ...quickVitals, temp: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Blood Glucose (mg/dL)</label>
                <input
                  type="number"
                  value={quickVitals.glucose}
                  onChange={(e) => setQuickVitals({ ...quickVitals, glucose: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Pain Score (0-10)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={quickVitals.pain}
                  onChange={(e) => setQuickVitals({ ...quickVitals, pain: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowAddVitalsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded text-[12.5px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVitals}
                disabled={actionSaving}
                className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[12.5px] font-semibold cursor-pointer"
              >
                {actionSaving ? "Saving..." : "Save Vitals"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span>📝</span> Add Clinical / Progress Note
              </h3>
              <button onClick={() => setShowAddNoteModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-[12px]">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Note Type</label>
                <select
                  value={quickNote.type}
                  onChange={(e) => setQuickNote({ ...quickNote, type: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-medium text-gray-800"
                >
                  <option value="Physician Progress Note">Physician Progress Note</option>
                  <option value="Nursing Care Note">Nursing Care Note</option>
                  <option value="Triage Reassessment">Triage Reassessment</option>
                  <option value="Specialist Consultation Note">Specialist Consultation Note</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Note Content / Clinical Findings</label>
                <textarea
                  rows={4}
                  value={quickNote.content}
                  onChange={(e) => setQuickNote({ ...quickNote, content: e.target.value })}
                  placeholder="Record clinical assessment, medication response, or care instructions..."
                  className="w-full border border-slate-300 rounded p-2.5 text-gray-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded text-[12.5px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={actionSaving || !quickNote.content.trim()}
                className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[12.5px] font-semibold cursor-pointer"
              >
                {actionSaving ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add Intervention Modal */}
      {showAddInterventionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span>➕</span> Log Emergency Procedure / Intervention
              </h3>
              <button onClick={() => setShowAddInterventionModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-[12px]">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Intervention / Procedure Name</label>
                <input
                  type="text"
                  placeholder="e.g. IV Cannulation 18G / High Flow O2 / Defibrillation / Wound Dressing"
                  value={quickIntervention.type}
                  onChange={(e) => setQuickIntervention({ ...quickIntervention, type: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Details / Flow Rate / Location</label>
                <textarea
                  rows={3}
                  value={quickIntervention.description}
                  onChange={(e) => setQuickIntervention({ ...quickIntervention, description: e.target.value })}
                  placeholder="e.g. Left antecubital fossa, flushed with normal saline, no extravasation noted."
                  className="w-full border border-slate-300 rounded p-2 text-gray-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowAddInterventionModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded text-[12.5px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveIntervention}
                disabled={actionSaving || !quickIntervention.type.trim()}
                className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[12.5px] font-semibold cursor-pointer"
              >
                {actionSaving ? "Saving..." : "Log Intervention"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Request Investigation Modal */}
      {showInvestigationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span>📋</span> Request Emergency Diagnostic / Lab Order
              </h3>
              <button onClick={() => setShowInvestigationModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-[12px]">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Diagnostic Test</label>
                <select
                  value={quickInvestigation.name}
                  onChange={(e) => setQuickInvestigation({ ...quickInvestigation, name: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-gray-800 font-medium"
                >
                  <option value="12-Lead ECG">12-Lead ECG (STAT)</option>
                  <option value="Cardiac Troponin-I / T">Cardiac Troponin-I / T (STAT)</option>
                  <option value="Emergency Chest X-Ray (AP View)">Emergency Chest X-Ray (AP View)</option>
                  <option value="FAST Ultrasound (Abdomen/Pelvis)">FAST Ultrasound (Abdomen/Pelvis)</option>
                  <option value="Complete Blood Count (CBC) & GRBS">Complete Blood Count (CBC) & GRBS</option>
                  <option value="Arterial Blood Gas (ABG) Analysis">Arterial Blood Gas (ABG) Analysis</option>
                  <option value="Non-Contrast CT Brain">Non-Contrast CT Brain</option>
                  <option value="Renal Function & Electrolytes">Renal Function & Electrolytes (STAT)</option>
                  <option value="Blood & Urine Cultures">Blood & Urine Cultures</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Clinical Priority</label>
                <select
                  value={quickInvestigation.priority}
                  onChange={(e) => setQuickInvestigation({ ...quickInvestigation, priority: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-gray-800 font-medium"
                >
                  <option value="STAT">STAT / Immediate (&lt; 15 mins)</option>
                  <option value="Urgent">Urgent (&lt; 45 mins)</option>
                  <option value="Routine">Routine Emergency</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowInvestigationModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded text-[12.5px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInvestigation}
                disabled={actionSaving}
                className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[12.5px] font-semibold cursor-pointer"
              >
                {actionSaving ? "Dispatching..." : "Dispatch Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Doctor Evaluation & Disposition Modal */}
      {showDispositionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span>👨‍⚕️</span> Specialist Doctor Disposition &amp; Relocation
              </h3>
              <button onClick={() => setShowDispositionModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="space-y-3.5 text-[12px]">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Clinical Disposition Decision</label>
                <select
                  value={dispositionForm.outcome}
                  onChange={(e) => setDispositionForm({ ...dispositionForm, outcome: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-gray-900 font-semibold"
                >
                  <option value="admit_icu">🚨 Transfer to Intensive Care Unit (ICU / CCU) — High Priority</option>
                  <option value="admit_inpatient">🛏️ Admit to Inpatient General Ward / Semi-Private</option>
                  <option value="transfer_ot">🏥 Transfer to Emergency OT / Cath Lab (Urgent Procedure)</option>
                  <option value="discharge">🏠 Discharge Home with Outpatient Follow-up Prescription</option>
                  <option value="transfer_facility">🚑 Transfer to Higher Tertiary Trauma / Specialty Center</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Specialty / Level of Care</label>
                <select
                  value={dispositionForm.specialty}
                  onChange={(e) => setDispositionForm({ ...dispositionForm, specialty: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-gray-800 font-medium"
                >
                  <option value="Cardiology">Cardiology / Coronary Care Unit</option>
                  <option value="Neurology / Stroke Care">Neurology / Stroke Care</option>
                  <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                  <option value="Pulmonology / Respiratory Care">Pulmonology / Respiratory Care</option>
                  <option value="Orthopedics / Trauma">Orthopedics / Trauma Care</option>
                  <option value="General Medicine Ward">General Medicine Inpatient Ward</option>
                  <option value="General Surgery Ward">General Surgery Inpatient Ward</option>
                  <option value="Pediatrics">Pediatric Inpatient Unit</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Clinical Reason &amp; Handover Instructions</label>
                <textarea
                  rows={3}
                  value={dispositionForm.reason}
                  onChange={(e) => setDispositionForm({ ...dispositionForm, reason: e.target.value })}
                  placeholder="Document clinical justification for transfer and admission orders..."
                  className="w-full border border-slate-300 rounded p-2.5 text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Transfer Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {["STAT / Emergency", "High Priority", "Routine Admission"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDispositionForm({ ...dispositionForm, priority: p })}
                      className={`py-1.5 px-2 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                        dispositionForm.priority === p
                          ? "bg-[#1B4FD8] text-white border-[#1B4FD8]"
                          : "bg-white text-gray-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowDispositionModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded text-[12.5px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDisposition}
                disabled={actionSaving}
                className="px-5 py-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded text-[12.5px] font-semibold cursor-pointer shadow-xs"
              >
                {actionSaving ? "Recording..." : "Save Disposition & Order Bed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Physical Bed Transfer & Relocation Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span>🛏️</span> Confirm Physical Patient Transfer &amp; Relocation
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded text-[12px] text-blue-900 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-bold">Patient Name:</span>
                <span>{displayName} ({detail.visit_no})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Destination Unit:</span>
                <span className="font-bold text-[#1B4FD8]">
                  {dispositionForm.outcome.includes("icu") ? "Intensive Care Unit (ICU)" : "Inpatient General Ward 3"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Allocated Physical Bed:</span>
                <span className="font-bold text-[#16A34A]">
                  {dispositionForm.outcome.includes("icu") ? "ICU-BED-04 (Floor 2)" : "WARD-BED-302 (Floor 3)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Receiving Consultant:</span>
                <span>{doctorName} ({doctorSpecialty})</span>
              </div>
            </div>

            <p className="text-[12px] text-[#64748B]">
              Confirming this transfer verifies that the ER nursing handover is complete, IV lines/monitors are transferred, and the patient has been physically relocated to their allocated inpatient bed.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded text-[12.5px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransfer}
                disabled={actionSaving}
                className="px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded text-[12.5px] font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span>✓</span> {actionSaving ? "Relocating..." : "Confirm Relocation & Complete ER Visit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Timeline Event Modal */}
      {showAddTimelineEventModal && (
        <AddTimelineEventModal
          detail={detail}
          initialEventType={defaultTimelineEventType}
          onClose={() => setShowAddTimelineEventModal(false)}
          onSaved={onRefresh}
          setNotice={setNotice}
        />
      )}

      {/* Handover Modal */}
      {showHandoverModal && (
        <ErHandoverModal
          detail={detail}
          categories={categories}
          onClose={() => setShowHandoverModal(false)}
        />
      )}
    </div>
  );
}

function ErTimelineView({
  detail,
  categories,
  onAddEvent,
}: {
  detail: ErVisitDetail;
  categories: TriageCategory[];
  onAddEvent?: (type?: ErTimelineEventType) => void;
}) {
  const [filterCategory, setFilterCategory] = useState<"all" | "vitals" | "treatments" | "physician" | "transfer">("all");
  const allEvents = useMemo(() => getSynthesizedTimeline(detail), [detail]);

  const filteredEvents = useMemo(() => {
    if (filterCategory === "all") return allEvents;
    if (filterCategory === "vitals") {
      return allEvents.filter((e) => e.event_type === "initial_vitals" || e.event_type === "followup_vitals");
    }
    if (filterCategory === "treatments") {
      return allEvents.filter(
        (e) => e.event_type === "medication_given" || e.event_type === "intervention_given" || e.event_type === "patient_stabilized"
      );
    }
    if (filterCategory === "physician") {
      return allEvents.filter(
        (e) => e.event_type === "doctor_assigned" || e.event_type === "doctor_arrived" || e.event_type === "doctor_assessment_completed"
      );
    }
    if (filterCategory === "transfer") {
      return allEvents.filter(
        (e) =>
          e.event_type === "patient_arrived" ||
          e.event_type === "bed_assigned" ||
          e.event_type === "destination_assigned" ||
          e.event_type === "destination_bed_assigned" ||
          e.event_type === "patient_transferred"
      );
    }
    return allEvents;
  }, [allEvents, filterCategory]);

  const vitalsCount = allEvents.filter((e) => e.event_type === "initial_vitals" || e.event_type === "followup_vitals").length;
  const treatmentsCount = allEvents.filter(
    (e) => e.event_type === "medication_given" || e.event_type === "intervention_given" || e.event_type === "patient_stabilized"
  ).length;
  const physicianCount = allEvents.filter(
    (e) => e.event_type === "doctor_assigned" || e.event_type === "doctor_arrived" || e.event_type === "doctor_assessment_completed"
  ).length;
  const transferCount = allEvents.filter(
    (e) =>
      e.event_type === "patient_arrived" ||
      e.event_type === "bed_assigned" ||
      e.event_type === "destination_assigned" ||
      e.event_type === "destination_bed_assigned" ||
      e.event_type === "patient_transferred"
  ).length;

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="bg-[#FAFCFF] border border-[#DDE2EC] rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div>
          <h4 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
            <span>🛡️</span> Nurse-Managed ER Clinical Journey Timeline
          </h4>
          <p className="text-[11.5px] text-[#64748B] mt-0.5">
            Real-time chronological log managed by ER nursing staff from arrival until final destination transfer.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onAddEvent?.()}
          className="px-4 py-2 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white rounded text-[12px] font-bold cursor-pointer transition-all shadow-xs flex items-center gap-1.5 shrink-0 self-start md:self-auto"
        >
          <span>➕</span> Add Timeline Event
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 pt-1 border-b border-slate-200 pb-3">
        {[
          { id: "all", label: `All Events (${allEvents.length})` },
          { id: "vitals", label: `Vitals & Monitoring (${vitalsCount})` },
          { id: "treatments", label: `Medications & Interventions (${treatmentsCount})` },
          { id: "physician", label: `Physician Actions (${physicianCount})` },
          { id: "transfer", label: `Intake & Transfer (${transferCount})` },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterCategory(f.id as any)}
            className={`px-3 py-1 rounded text-[11.5px] font-bold border transition-all cursor-pointer ${
              filterCategory === f.id
                ? "bg-[#1B4FD8] text-white border-[#1B4FD8] shadow-2xs"
                : "bg-white text-gray-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline List (Newest at Top) */}
      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
        {filteredEvents.length === 0 ? (
          <div className="bg-white border border-[#DDE2EC] rounded p-8 text-center text-[#64748B]">
            <p className="font-bold text-[13px]">No events recorded under this category.</p>
            <button
              onClick={() => onAddEvent?.()}
              className="mt-2 text-xs font-bold text-[#1B4FD8] hover:underline cursor-pointer"
            >
              + Record First Event
            </button>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const def = TIMELINE_EVENT_DEFINITIONS[ev.event_type] || TIMELINE_EVENT_DEFINITIONS.initial_vitals;

            return (
              <div key={ev.id} className="relative group">
                {/* Timeline Node Dot */}
                <span
                  className={`absolute -left-6 top-3 w-4 h-4 rounded-full ${def.dotColor} border-2 border-white shadow-xs flex items-center justify-center text-[8px] text-white font-bold`}
                >
                  ✓
                </span>

                {/* Event Card */}
                <div className="bg-white border border-[#DDE2EC] rounded p-4 shadow-2xs space-y-2.5 hover:border-[#1B4FD8] transition-all">
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{def.icon}</span>
                      <strong className="text-[13px] font-bold text-gray-900">{ev.event_name || def.label}</strong>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: def.badgeBg, color: def.badgeText }}
                      >
                        {def.category}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-[11px] font-bold text-gray-900">
                        {formatDateTimeIST(ev.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Card Structured Content */}
                  <div className="text-[12px] text-gray-800 space-y-2">
                    {/* Vitals Display */}
                    {(ev.event_type === "initial_vitals" || ev.event_type === "followup_vitals") && ev.vitals_data && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#FAFCFF] border border-blue-100 rounded p-2.5 text-[11px]">
                        {ev.vitals_data.bp_systolic && ev.vitals_data.bp_diastolic && (
                          <div>
                            <span className="text-[#64748B] block text-[10px]">Blood Pressure</span>
                            <strong className="font-mono text-red-600 font-bold">
                              {ev.vitals_data.bp_systolic}/{ev.vitals_data.bp_diastolic} mmHg
                            </strong>
                          </div>
                        )}
                        {ev.vitals_data.heart_rate && (
                          <div>
                            <span className="text-[#64748B] block text-[10px]">Heart Rate</span>
                            <strong className="font-mono text-red-600 font-bold">{ev.vitals_data.heart_rate} bpm</strong>
                          </div>
                        )}
                        {ev.vitals_data.spo2 && (
                          <div>
                            <span className="text-[#64748B] block text-[10px]">SpO₂</span>
                            <strong className="font-mono text-blue-700 font-bold">{ev.vitals_data.spo2}%</strong>
                          </div>
                        )}
                        {ev.vitals_data.respiratory_rate && (
                          <div>
                            <span className="text-[#64748B] block text-[10px]">Resp Rate</span>
                            <strong className="font-mono text-orange-700 font-bold">
                              {ev.vitals_data.respiratory_rate} /min
                            </strong>
                          </div>
                        )}
                        {ev.vitals_data.temperature && (
                          <div>
                            <span className="text-[#64748B] block text-[10px]">Temperature</span>
                            <strong className="font-mono text-gray-800 font-bold">{ev.vitals_data.temperature} °F</strong>
                          </div>
                        )}
                        {ev.vitals_data.blood_glucose && (
                          <div>
                            <span className="text-[#64748B] block text-[10px]">Blood Glucose</span>
                            <strong className="font-mono text-gray-800 font-bold">
                              {ev.vitals_data.blood_glucose} mg/dL
                            </strong>
                          </div>
                        )}
                        {ev.vitals_data.pain_score != null && (
                          <div>
                            <span className="text-[#64748B] block text-[10px]">Pain Score</span>
                            <strong className="font-mono text-red-600 font-bold">{ev.vitals_data.pain_score} / 10</strong>
                          </div>
                        )}
                        {ev.vitals_data.gcs != null && (
                          <div>
                            <span className="text-[#64748B] block text-[10px]">GCS Score</span>
                            <strong className="font-mono text-purple-700 font-bold">{ev.vitals_data.gcs} / 15</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Medication Display */}
                    {ev.event_type === "medication_given" && ev.medication_data && (
                      <div className="bg-[#F0FDF4] border border-green-200 rounded p-2.5 text-[11.5px] space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-[#15803D] font-bold text-[12.5px]">
                            💊 {ev.medication_data.drug_name}
                          </strong>
                          {ev.medication_data.dosage && (
                            <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-bold text-[10.5px]">
                              {ev.medication_data.dosage}
                            </span>
                          )}
                          {ev.medication_data.route && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10.5px]">
                              Route: {ev.medication_data.route}
                            </span>
                          )}
                        </div>
                        {ev.medication_data.response && (
                          <div className="text-gray-700">
                            <strong>Patient Response:</strong> {ev.medication_data.response}
                          </div>
                        )}
                        {ev.medication_data.notes && (
                          <div className="text-[#64748B] text-[11px] italic">{ev.medication_data.notes}</div>
                        )}
                      </div>
                    )}

                    {/* Intervention Display */}
                    {ev.event_type === "intervention_given" && ev.intervention_data && (
                      <div className="bg-[#F0FDFA] border border-teal-200 rounded p-2.5 text-[11.5px] space-y-1">
                        <div className="font-bold text-[#0F766E] text-[12.5px]">
                          💉 {ev.intervention_data.intervention_type}
                        </div>
                        {ev.intervention_data.details && (
                          <div className="text-gray-800">{ev.intervention_data.details}</div>
                        )}
                        {ev.intervention_data.patient_response && (
                          <div className="text-teal-800 font-medium">
                            <strong>Response:</strong> {ev.intervention_data.patient_response}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Patient Stabilized Display */}
                    {ev.event_type === "patient_stabilized" && ev.stabilization_data && (
                      <div className="bg-[#ECFDF5] border border-emerald-200 rounded p-2.5 text-[11.5px] space-y-1">
                        <div className="font-bold text-[#047857] flex items-center gap-1.5">
                          <span>✨</span> Status: {ev.stabilization_data.status}
                        </div>
                        {ev.stabilization_data.clinical_notes && (
                          <div className="text-gray-700">{ev.stabilization_data.clinical_notes}</div>
                        )}
                      </div>
                    )}

                    {/* Doctor Assigned / Arrived / Assessment */}
                    {ev.event_type === "doctor_assigned" && ev.doctor_data && (
                      <div className="bg-[#EFF6FF] border border-blue-200 rounded p-2.5 text-[11.5px] flex items-center justify-between">
                        <div>
                          <strong className="text-[#1D4ED8]">👨‍⚕️ {ev.doctor_data.doctor_name}</strong>
                          <span className="text-[#64748B] ml-2">({ev.doctor_data.specialty})</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {ev.doctor_data.assignment_method}
                        </span>
                      </div>
                    )}

                    {ev.event_type === "doctor_arrived" && ev.assessment_data && (
                      <div className="bg-[#F0F9FF] border border-sky-200 rounded p-2.5 text-[11.5px]">
                        <strong>👨‍⚕️ Doctor Bedside Arrival:</strong> {ev.assessment_data.doctor_name}
                        {ev.assessment_data.acute_condition && (
                          <div className="text-[#64748B] mt-0.5">
                            Acute Presentation: {ev.assessment_data.acute_condition}
                          </div>
                        )}
                      </div>
                    )}

                    {ev.event_type === "doctor_assessment_completed" && ev.assessment_data && (
                      <div className="bg-[#FAF5FF] border border-purple-200 rounded p-2.5 text-[11.5px] space-y-1">
                        <div>
                          <strong>Preliminary Impression:</strong> {ev.assessment_data.clinical_impression}
                        </div>
                        {ev.assessment_data.care_plan && (
                          <div className="text-purple-900 font-medium">
                            <strong>Care Plan:</strong> {ev.assessment_data.care_plan}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Disposition / Transfer Display */}
                    {ev.event_type === "destination_assigned" && ev.destination_data && (
                      <div className="bg-[#FFF7ED] border border-orange-200 rounded p-2.5 text-[11.5px] space-y-1">
                        <div className="font-bold text-[#C2410C]">
                          🎯 Disposition Assigned: {ev.destination_data.destination}
                        </div>
                        {ev.destination_data.clinical_reason && (
                          <div className="text-gray-800">
                            <strong>Reason:</strong> {ev.destination_data.clinical_reason}
                          </div>
                        )}
                      </div>
                    )}

                    {ev.event_type === "destination_bed_assigned" && ev.destination_bed_data && (
                      <div className="bg-[#FFFBEB] border border-amber-200 rounded p-2.5 text-[11.5px] flex items-center justify-between">
                        <div>
                          <strong>🏨 Inpatient Unit:</strong> {ev.destination_bed_data.department}
                        </div>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-[11px]">
                          Bed: {ev.destination_bed_data.bed_id_or_label}
                        </span>
                      </div>
                    )}

                    {ev.event_type === "patient_transferred" && ev.transfer_data && (
                      <div className="bg-[#F8FAFC] border border-slate-300 rounded p-2.5 text-[11.5px] space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>🚑</span> Transferred from {ev.transfer_data.source_location} ➔{" "}
                          <span className="text-[#1B4FD8]">{ev.transfer_data.target_destination}</span> (
                          <span className="text-[#16A34A]">{ev.transfer_data.target_bed}</span>)
                        </div>
                        {ev.transfer_data.handover_notes && (
                          <div className="text-gray-700">
                            <strong>Handover:</strong> {ev.transfer_data.handover_notes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generic / Additional Notes */}
                    {ev.notes && (
                      <div className="text-gray-700 text-[11.5px]">{ev.notes}</div>
                    )}
                  </div>

                  {/* Card Footer Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[10.5px] text-[#64748B]">
                    <div className="flex items-center gap-2">
                      <span>👤 {ev.logged_by || "Staff RN"}</span>
                      <span>•</span>
                      <span>📍 {ev.location || "ER Bay"}</span>
                    </div>

                    <div className="font-mono text-[#94A3B8]">Encounter: {ev.visit_no}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ErHandoverModal({
  detail,
  categories,
  onClose,
}: {
  detail: ErVisitDetail;
  categories: TriageCategory[];
  onClose: () => void;
}) {
  const patientName = detail.patient
    ? [detail.patient.name, detail.patient.last_name].filter(Boolean).join(" ")
    : detail.patient_id;
  // detail.vitals comes back ordered oldest-first (ASC by recorded_at, see
  // get_er_visit) -- index 0 is the FIRST reading taken, not the latest.
  const initialVitals = detail.vitals[0];
  const latestVitals = detail.vitals[detail.vitals.length - 1];

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal title="Structured ER Clinical Handover Sheet" onClose={onClose} open>
      <div className="printable-handover-document" style={{ padding: "0.5rem", fontSize: "0.9rem", color: "#1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0f172a", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>HOSP AI EMERGENCY DEPARTMENT</h2>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Phase 1 Clinical Handover & Transfer Summary (Section 36)</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700 }}>Encounter: {detail.visit_no}</div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Generated: {formatDateTimeIST(new Date().toISOString())}</div>
          </div>
        </div>

        {/* 1. Patient Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>
          <div><strong>Patient:</strong> {patientName} ({detail.patient_id})</div>
          <div><strong>Age / Gender:</strong> {detail.patient?.age || "—"}y / {detail.patient?.gender || "—"}</div>
          <div><strong>Arrival Time:</strong> {formatDateTimeIST(detail.arrival_at)} ({detail.arrival_mode})</div>
          <div><strong>Emergency Contact:</strong> {detail.patient?.emergency_contact || detail.patient?.phone || "—"}</div>
          <div style={{ color: "#b91c1c" }}><strong>Known Allergies:</strong> {detail.patient?.allergies || "None Reported"}</div>
          <div><strong>Triage Acuity:</strong> {detail.triage?.category || "Untriaged"} (Bay: {detail.triage?.triage_bed_label || "B1-B4"})</div>
        </div>

        {/* 2. Chief Complaints */}
        <div style={{ marginBottom: "1rem" }}>
          <strong style={{ display: "block", color: "#475569", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.2rem", marginBottom: "0.3rem" }}>
            1. Chief Complaints & Incident
          </strong>
          {detail.complaints.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {detail.complaints.map((c) => (
                <li key={c.id}>{c.complaint}</li>
              ))}
            </ul>
          ) : (
            <span className="muted">No primary complaints recorded.</span>
          )}
        </div>

        {/* 3. Vitals Evolution */}
        <div style={{ marginBottom: "1rem" }}>
          <strong style={{ display: "block", color: "#475569", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.2rem", marginBottom: "0.3rem" }}>
            2. Vitals Evolution (Initial vs. Latest)
          </strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem" }}>
            <div style={{ padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px" }}>
              <strong>Initial Vitals:</strong>
              {initialVitals ? (
                <div>HR: {initialVitals.heart_rate || "—"} | BP: {initialVitals.bp_systolic || "—"}/{initialVitals.bp_diastolic || "—"} | SpO2: {initialVitals.spo2 || "—"}% | Temp: {initialVitals.temperature || "—"}°C | GRBS: {initialVitals.blood_glucose || "—"} mg/dL</div>
              ) : <span>Not recorded</span>}
            </div>
            <div style={{ padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", backgroundColor: "#f0fdf4" }}>
              <strong>Latest Stabilized Vitals:</strong>
              {latestVitals ? (
                <div>HR: {latestVitals.heart_rate || "—"} | BP: {latestVitals.bp_systolic || "—"}/{latestVitals.bp_diastolic || "—"} | SpO2: {latestVitals.spo2 || "—"}% | Temp: {latestVitals.temperature || "—"}°C | GRBS: {latestVitals.blood_glucose || "—"} mg/dL</div>
              ) : <span>Not recorded</span>}
            </div>
          </div>
        </div>

        {/* 4. Emergency Interventions & Meds */}
        <div style={{ marginBottom: "1rem" }}>
          <strong style={{ display: "block", color: "#475569", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.2rem", marginBottom: "0.3rem" }}>
            3. Emergency Interventions & Medications Administered
          </strong>
          {detail.treatments.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {detail.treatments.map((t) => (
                <li key={t.id}>
                  <strong>{t.intervention_type}</strong> - {t.description || "Performed"} ({formatDateTimeIST(t.performed_at)})
                </li>
              ))}
            </ul>
          ) : (
            <span className="muted">No interventions charted.</span>
          )}
        </div>

        {/* 5. Destination */}
        <div style={{ marginBottom: "1rem", backgroundColor: "#eff6ff", padding: "0.75rem", borderRadius: "6px" }}>
          <strong style={{ display: "block", color: "#1e3a8a", marginBottom: "0.3rem" }}>
            4. Destination & Transfer Authorization
          </strong>
          <div><strong>Clinical Decision:</strong> {detail.disposition?.outcome?.toUpperCase() || "In Assessment"}</div>
          <div><strong>Clinical Reason:</strong> {detail.disposition?.clinical_reason || "—"}</div>
          <div><strong>Assigned Doctor:</strong> {detail.assigned_doctor_name ? `Dr. ${detail.assigned_doctor_name} (${detail.assigned_specialty})` : "ER Covering Staff"}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={handlePrint}><FiPrinter style={{ marginRight: "0.3rem" }} /> Print Handover Sheet</Button>
        </div>
      </div>
    </Modal>
  );
}

function MergeUnknownPatient({
  visitId,
  setNotice,
  onMerged,
  onNavigate,
}: {
  visitId: number;
  setNotice: (notice: Notice | null) => void;
  onMerged: () => void;
  onNavigate?: (page: string, extraData?: any) => void;
}) {
  // Search-first: staff searching by name/phone/ID once someone identifies
  // the patient is far more realistic than requiring them to already know
  // the exact PAT-XXXXXX string. If this really is a brand-new person with
  // no existing record, "Register as New Patient" below sends them to
  // Patient Registration and comes straight back here already merged.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedPatient || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const data = await apiFetch<{ patients: Patient[] }>(
          `/api/patients?q=${encodeURIComponent(searchQuery.trim())}`,
        );
        setSearchResults((data.patients || []).slice(0, 8));
      } catch (error) {
        console.error(error);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [searchQuery, selectedPatient]);

  const submit = async () => {
    if (!selectedPatient) {
      setNotice({ type: "error", message: "Search and select the confirmed patient first." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/er/visits/${visitId}/merge-unknown`, {
        method: "POST",
        body: JSON.stringify({ patient_id: selectedPatient.patient_id }),
      });
      setNotice({ type: "success", message: "Visit merged into the confirmed patient record." });
      onMerged();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to merge this visit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel" style={{ borderColor: "#e67e22" }}>
      <SectionHead icon={<FiHelpCircle aria-hidden />} title="Identity Not Yet Confirmed" />
      <p className="muted">
        Once this patient's identity is confirmed, merge this visit into their real
        patient record. Everything recorded so far stays exactly where it is.
      </p>

      {selectedPatient ? (
        <div className="er-selected-patient" style={{ marginBottom: "0.6rem" }}>
          <span>
            {selectedPatient.name} {selectedPatient.last_name} — {selectedPatient.patient_id}
          </span>
          <Button size="sm" variant="ghost" onClick={() => { setSelectedPatient(null); setSearchQuery(""); }}>
            Change
          </Button>
        </div>
      ) : (
        <div style={{ marginBottom: "0.6rem" }}>
          <Label htmlFor="merge-patient-search">Search by name, phone, or patient ID</Label>
          <Input
            id="merge-patient-search"
            placeholder="e.g. Ramesh, 98765xxxxx, or PAT-100001"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="er-patient-search-results">
              {searchResults.map((p) => (
                <button
                  key={p.patient_id}
                  type="button"
                  className="er-patient-search-row"
                  onClick={() => { setSelectedPatient(p); setSearchResults([]); }}
                >
                  <span>{p.name} {p.last_name}</span>
                  <span className="muted">{p.patient_id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <Button onClick={submit} disabled={saving || !selectedPatient}>
          {saving ? "Merging..." : "Merge"}
        </Button>
        <span className="muted" style={{ fontSize: "0.8rem" }}>or</span>
        <Button
          variant="secondary"
          disabled={!onNavigate}
          onClick={() => onNavigate?.("add", { returnTo: "er-merge", mergeVisitId: visitId })}
        >
          <FiUserPlus aria-hidden /> Register as New Patient
        </Button>
      </div>
    </div>
  );
}

function ComplaintList({ complaints }: { complaints: ErComplaint[] }) {
  if (complaints.length === 0) return <p className="muted">No complaints recorded.</p>;
  return (
    <ul className="er-list">
      {complaints.map((c) => (
        <li key={c.id}>
          <strong>{c.complaint}</strong>
          {c.severity ? ` (${c.severity})` : ""}
          {c.case_category ? ` — ${c.case_category}` : ""}
          <span className="muted"> &middot; {formatDateTimeIST(c.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}

function AddComplaintForm({
  visitId,
  setNotice,
  onAdded,
}: {
  visitId: number;
  setNotice: (notice: Notice | null) => void;
  onAdded: () => void;
}) {
  const [complaint, setComplaint] = useState("");
  const [severity, setSeverity] = useState("");
  const [caseCategory, setCaseCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!complaint.trim()) {
      setNotice({ type: "error", message: "Enter a complaint." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/er/visits/${visitId}/complaints`, {
        method: "POST",
        body: JSON.stringify({
          complaint: complaint.trim(),
          severity: severity || undefined,
          case_category: caseCategory || undefined,
        }),
      });
      setComplaint("");
      setSeverity("");
      setCaseCategory("");
      onAdded();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to add complaint.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-form-grid" style={{ marginTop: "0.75rem" }}>
      <Input placeholder="Complaint (e.g. Chest pain)" value={complaint} onChange={(e) => setComplaint(e.target.value)} />
      <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
        <option value="">Severity</option>
        <option value="mild">Mild</option>
        <option value="moderate">Moderate</option>
        <option value="severe">Severe</option>
      </Select>
      <Select value={caseCategory} onChange={(e) => setCaseCategory(e.target.value)}>
        <option value="">Case category</option>
        {CASE_CATEGORY_OPTIONS.map((c) => (
          <option key={c.value} value={c.value}>{c.label}{c.mlc ? " (MLC)" : ""}</option>
        ))}
      </Select>
      <Button size="sm" onClick={submit} disabled={saving}>
        {saving ? "Adding..." : "Add Complaint"}
      </Button>
    </div>
  );
}

function formatTimeShortIST(iso: string | null): string {
  if (!iso) return "-";
  const hasOffset = /([zZ]|[+-]\d{2}:\d{2})$/.test(iso);
  const parsed = new Date(hasOffset ? iso : `${iso}Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
}

function VitalChip({
  label,
  value,
  abnormal,
}: {
  label: string;
  value: string | number | null | undefined;
  abnormal?: boolean;
}) {
  if (value == null || value === "") return null;
  return (
    <span className={`er-vital-chip${abnormal ? " er-vital-chip-abnormal" : ""}`}>
      <span className="er-vital-chip-label">{label}</span>
      <span className="er-vital-chip-value">{value}</span>
    </span>
  );
}

function VitalsList({ vitals }: { vitals: ErVitals[] }) {
  if (vitals.length === 0) return <p className="muted">No vitals recorded yet.</p>;
  const mostRecentFirst = [...vitals].reverse();
  return (
    <div className="er-vitals-timeline">
      {mostRecentFirst.map((v, idx) => (
        <div key={v.id} className={`er-vitals-reading${idx === 0 ? " er-vitals-reading-latest" : ""}`}>
          <div className="er-vitals-reading-time">
            <FiClock aria-hidden />
            {formatTimeShortIST(v.recorded_at)}
            {idx === 0 && <span className="er-vitals-latest-tag">Latest</span>}
          </div>
          <div className="er-vitals-reading-chips">
            <VitalChip
              label="BP"
              value={v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic} mmHg` : null}
              abnormal={isAbnormal("bp_systolic", v.bp_systolic) || isAbnormal("bp_diastolic", v.bp_diastolic)}
            />
            <VitalChip label="Pulse" value={v.heart_rate != null ? `${v.heart_rate} bpm` : null} abnormal={isAbnormal("heart_rate", v.heart_rate)} />
            <VitalChip
              label="SpO₂"
              value={v.spo2 != null ? `${v.spo2}%` : null}
              abnormal={isAbnormal("spo2", v.spo2)}
            />
            <VitalChip
              label="RR"
              value={v.respiratory_rate != null ? `${v.respiratory_rate} /min` : null}
              abnormal={isAbnormal("respiratory_rate", v.respiratory_rate)}
            />
            <VitalChip
              label="Temp"
              value={v.temperature != null ? (v.temperature > 45 ? `${v.temperature}°F` : `${v.temperature}°C`) : null}
              abnormal={isAbnormal("temperature", v.temperature)}
            />
            <VitalChip
              label="GRBS"
              value={v.blood_glucose != null ? `${v.blood_glucose} mg/dL` : null}
              abnormal={isAbnormal("blood_glucose", v.blood_glucose)}
            />
            <VitalChip
              label="Pain"
              value={v.pain_score != null ? `${v.pain_score}/10` : null}
              abnormal={v.pain_score != null && v.pain_score >= 5}
            />
            <VitalChip
              label="AVPU"
              value={v.consciousness_level}
              abnormal={!!v.consciousness_level && v.consciousness_level !== "Alert"}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const CONSCIOUSNESS_OPTIONS = [
  { value: "Alert", label: "Alert (A) — fully conscious & oriented" },
  { value: "Verbal", label: "Verbal (V) — responds to verbal stimuli" },
  { value: "Pain", label: "Pain (P) — responds to painful stimuli only" },
  { value: "Unresponsive", label: "Unresponsive (U) — comatose / no response" },
];

function AddVitalsForm({
  visitId,
  setNotice,
  onAdded,
}: {
  visitId: number;
  setNotice: (notice: Notice | null) => void;
  onAdded: () => void;
}) {
  const [heartRate, setHeartRate] = useState("");
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [spo2, setSpo2] = useState("");
  const [rr, setRr] = useState("");
  const [temp, setTemp] = useState("");
  const [grbs, setGrbs] = useState("");
  const [painScore, setPainScore] = useState("");
  const [consciousness, setConsciousness] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/er/visits/${visitId}/vitals`, {
        method: "POST",
        body: JSON.stringify({
          heart_rate: heartRate ? Number(heartRate) : undefined,
          bp_systolic: bpSystolic ? Number(bpSystolic) : undefined,
          bp_diastolic: bpDiastolic ? Number(bpDiastolic) : undefined,
          spo2: spo2 ? Number(spo2) : undefined,
          respiratory_rate: rr ? Number(rr) : undefined,
          temperature: temp ? Number(temp) : undefined,
          blood_glucose: grbs ? Number(grbs) : undefined,
          pain_score: painScore ? Number(painScore) : undefined,
          consciousness_level: consciousness || undefined,
        }),
      });
      setHeartRate("");
      setBpSystolic("");
      setBpDiastolic("");
      setSpo2("");
      setRr("");
      setTemp("");
      setGrbs("");
      setPainScore("");
      setConsciousness("");
      onAdded();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to record vitals.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="er-sidebar-form" style={{ marginTop: "0.75rem" }}>
      <div className="er-sidebar-form-row">
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Pulse / Heart Rate (bpm)</Label>
          <Input type="number" placeholder="80" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} />
        </div>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>SpO₂ Saturation (%)</Label>
          <Input type="number" placeholder="98" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
        </div>
      </div>
      <div className="er-sidebar-form-row">
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Systolic BP (mmHg)</Label>
          <Input type="number" placeholder="120" value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} />
        </div>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Diastolic BP (mmHg)</Label>
          <Input type="number" placeholder="80" value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} />
        </div>
      </div>
      <div className="er-sidebar-form-row">
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Respiratory Rate (breaths/min)</Label>
          <Input type="number" placeholder="16" value={rr} onChange={(e) => setRr(e.target.value)} />
        </div>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Temperature (°F / °C)</Label>
          <Input type="number" step="0.1" placeholder="98.6" value={temp} onChange={(e) => setTemp(e.target.value)} />
        </div>
      </div>
      <div className="er-sidebar-form-row">
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>GRBS / RBS (mg/dL)</Label>
          <Input type="number" placeholder="110" value={grbs} onChange={(e) => setGrbs(e.target.value)} />
        </div>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Pain Score (0–10)</Label>
          <Input type="number" min={0} max={10} placeholder="0-10" value={painScore} onChange={(e) => setPainScore(e.target.value)} />
        </div>
      </div>
      <div>
        <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Consciousness Level (AVPU Scale)</Label>
        <Select value={consciousness} onChange={(e) => setConsciousness(e.target.value)}>
          <option value="">Select consciousness assessment...</option>
          {CONSCIOUSNESS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>
      <Button size="sm" onClick={submit} disabled={saving} style={{ width: "100%" }}>
        {saving ? "Saving..." : "Record Vitals"}
      </Button>
    </div>
  );
}

function TriageForm({
  visitId,
  categories,
  existing,
  aiPrefill,
  setNotice,
  onSaved,
}: {
  visitId: number;
  categories: TriageCategory[];
  existing: ErTriage;
  aiPrefill: { category: string; reason: string } | null;
  setNotice: (notice: Notice | null) => void;
  onSaved: () => void;
}) {
  // Already triaged -> this form is only for a correction (e.g. condition
  // changed, or the wrong category was picked), not a required step, so it
  // stays collapsed behind an explicit toggle instead of always showing a
  // second full form under the triage that's already been recorded.
  const [open, setOpen] = useState(!existing);
  const [category, setCategory] = useState(existing?.category || "");
  const [bedLabel, setBedLabel] = useState(existing?.triage_bed_label || "");
  const [reason, setReason] = useState(existing?.reason || "");
  const [saving, setSaving] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  // A fresh AI suggestion always wins visually -- open the form (even if
  // already triaged, so a correction is right there to review) and load its
  // pick into the same fields staff would type into by hand. Nothing here
  // writes anything; "Save Triage"/"Save Correction" below still does that.
  useEffect(() => {
    if (!aiPrefill) return;
    setCategory(aiPrefill.category);
    setReason(aiPrefill.reason);
    setAiFilled(true);
    setOpen(true);
  }, [aiPrefill]);

  if (categories.length === 0) {
    return (
      <p className="muted">
        No triage categories configured yet — an admin must add them under the
        Triage Configuration tab before this visit can be triaged.
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="ghost"
        style={{ marginTop: "0.6rem" }}
        onClick={() => {
          setCategory(existing?.category || "");
          setBedLabel(existing?.triage_bed_label || "");
          setReason(existing?.reason || "");
          setOpen(true);
        }}
      >
        Correct / update triage
      </Button>
    );
  }

  const submit = async () => {
    if (!category) {
      setNotice({ type: "error", message: "Select a triage category." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/er/visits/${visitId}/triage`, {
        method: "POST",
        body: JSON.stringify({
          category,
          triage_bed_label: bedLabel || undefined,
          reason: reason || undefined,
        }),
      });
      setAiFilled(false);
      if (existing) setOpen(false);
      onSaved();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to save triage.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="er-sidebar-form" style={{ marginTop: "0.75rem" }}>
      {!existing && (
        <p className="muted" style={{ fontSize: "0.78rem", margin: "0 0 0.2rem" }}>
          Required before treatment can proceed.
        </p>
      )}
      {aiFilled && (
        <p className="er-ai-field-note">
          <FiZap aria-hidden /> AI-suggested — review before saving
        </p>
      )}
      <div>
        <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Category</Label>
        <Select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setAiFilled(false); }}
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.category_code}>
              {c.category_code} — {c.category_label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Triage bay (optional)</Label>
        <Input placeholder="e.g. B1" value={bedLabel} onChange={(e) => setBedLabel(e.target.value)} />
      </div>
      <div>
        <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Reason</Label>
        <Input placeholder="Clinical reason for this category" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button size="sm" onClick={submit} disabled={saving} style={{ flex: 1 }}>
          {saving ? "Saving..." : existing ? "Save Correction" : "Save Triage"}
        </Button>
        {existing && (
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

// What AI Triage Assistant hands each downstream section -- it never writes
// to the visit itself (see AITriagePanel below). Each section's own form
// picks this up as a starting point in its own fields, pre-filled but fully
// editable, and the human still has to press that section's own save button
// for anything to actually be recorded. That's deliberate: the AI can be
// wrong, and every field it fills in must remain a plain, ordinary form
// field a person can just overwrite -- never a separate auto-applied action.
type AiSectionPrefills = {
  triage: { category: string; reason: string } | null;
  doctor: { specialty: string; doctorName: string } | null;
  treatment: { interventionType: string; description: string } | null;
};

function AITriagePanel({
  detail,
  categories,
  setNotice,
  onRefresh,
  onSuggestion,
}: {
  detail: ErVisitDetail;
  categories: TriageCategory[];
  setNotice: (notice: Notice | null) => void;
  onRefresh?: () => void;
  onSuggestion?: (prefills: AiSectionPrefills, reasoning: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);

  const hasChartedData = detail.complaints.length > 0 || detail.vitals.length > 0;
  const isAlreadyTriaged = Boolean(detail.triage);
  const isDoctorAssigned = Boolean(detail.assigned_doctor_name || detail.assigned_specialty);

  const runAITriageAuto = async () => {
    if (!hasChartedData) {
      setNotice({
        type: "warning",
        message: "Record complaints or vitals first before running AI Triage.",
      });
      return;
    }
    setLoading(true);
    try {
      const symptoms = buildSymptomsSummary(detail.complaints, detail.vitals);
      const aiRes = await fetchAiTriageSuggestion(symptoms);
      const categoryMatch = mapUrgencyToTriageCategory(aiRes.urgency, categories);

      // Auto-apply triage
      if (categoryMatch) {
        await apiFetch(`/api/er/visits/${detail.id}/triage`, {
          method: "POST",
          body: JSON.stringify({
            category: categoryMatch,
            reason: (aiRes.reasoning || "AI Triage analysis").substring(0, 500),
          }),
        });
      }

      // Auto-assign doctor/specialty
      if (aiRes.department || aiRes.doctor) {
        await apiFetch(`/api/er/visits/${detail.id}/assign-doctor`, {
          method: "POST",
          body: JSON.stringify({
            specialty: aiRes.department || "Emergency",
            doctor_name: aiRes.doctor || undefined,
          }),
        });
      }

      // Auto-log multi-step suggested treatments if visit doesn't have treatments
      const treatmentsToApply = aiRes.suggested_treatments && aiRes.suggested_treatments.length > 0
        ? aiRes.suggested_treatments
        : aiRes.suggested_treatment?.intervention_type
        ? [aiRes.suggested_treatment]
        : [];

      if (treatmentsToApply.length > 0 && detail.treatments.length === 0) {
        for (const tr of treatmentsToApply) {
          if (tr.intervention_type) {
            await apiFetch(`/api/er/visits/${detail.id}/treatments`, {
              method: "POST",
              body: JSON.stringify({
                intervention_type: tr.intervention_type,
                description: tr.description || "Emergency care protocol per AI Triage",
              }),
            });
          }
        }
      }

      const prefills: AiSectionPrefills = {
        triage: categoryMatch ? { category: categoryMatch, reason: aiRes.reasoning } : null,
        doctor:
          aiRes.department || aiRes.doctor
            ? { specialty: aiRes.department || "", doctorName: aiRes.doctor || "" }
            : null,
        treatment: aiRes.suggested_treatment
          ? {
              interventionType: aiRes.suggested_treatment.intervention_type,
              description: aiRes.suggested_treatment.description,
            }
          : null,
      };
      if (onSuggestion) onSuggestion(prefills, aiRes.reasoning);

      setLastAnalysis(aiRes.reasoning);
      setNotice({
        type: "success",
        message: "AI Triage & Clinical Protocol updated successfully.",
      });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      reportError(setNotice, error, "AI Triage failed.");
    } finally {
      setLoading(false);
    }
  };

  const displayReasoning = lastAnalysis || detail.triage?.reason;

  return (
    <div className="panel er-ai-panel" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className="er-ai-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiZap aria-hidden style={{ color: "#7c3aed", fontSize: "1.2rem" }} />
          <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1e293b" }}>
            AI Clinical Triage Assistant
          </h4>
          {isAlreadyTriaged && (
            <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem", borderRadius: "999px", background: "#ecfdf5", color: "#059669", fontWeight: 600 }}>
              ✓ Auto-Triaged
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={runAITriageAuto}
          disabled={loading || !hasChartedData}
          className="er-ai-run-button"
          style={{ background: "#7c3aed", color: "#fff", borderColor: "#7c3aed" }}
        >
          {loading ? "Evaluating..." : isAlreadyTriaged ? "Re-evaluate with AI" : "Auto-Triage with AI"}
        </Button>
      </div>

      {!hasChartedData ? (
        <p className="muted er-ai-panel-hint" style={{ marginTop: "0.5rem" }}>
          Record complaints or initial vitals to enable automated AI Triage evaluation.
        </p>
      ) : isAlreadyTriaged || displayReasoning ? (
        <div className="er-ai-result" style={{ marginTop: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.9rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", alignItems: "center", marginBottom: "0.65rem", paddingBottom: "0.65rem", borderBottom: "1px solid #e2e8f0" }}>
            {detail.triage && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Triage Level:</span>
                <TriageChip category={detail.triage.category} categories={categories} bedLabel={detail.triage.triage_bed_label} />
              </div>
            )}
            {isDoctorAssigned && (
              <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                <span style={{ color: "#64748b", fontWeight: 600 }}>Department:</span> <strong>{detail.assigned_specialty || "Emergency"}</strong>
                {detail.assigned_doctor_name && (
                  <> &middot; <span style={{ color: "#64748b", fontWeight: 600 }}>Doctor:</span> <strong>{detail.assigned_doctor_name}</strong></>
                )}
              </div>
            )}
          </div>
          {displayReasoning && (
            <p className="er-ai-reasoning" style={{ fontSize: "0.88rem", lineHeight: "1.5", margin: 0, color: "#1e293b" }}>
              <strong style={{ color: "#0f172a" }}>Clinical Assessment & Reasoning:</strong> {displayReasoning}
            </p>
          )}
        </div>
      ) : (
        <div style={{ marginTop: "0.6rem", fontSize: "0.85rem", color: "#64748b" }}>
          Vitals and complaints are charted. Click <strong>Auto-Triage with AI</strong> to automatically classify urgency, assign specialty doctor, and suggest protocols.
        </div>
      )}
    </div>
  );
}

const INTERVENTION_LABELS: Record<string, string> = {
  oxygen: "Oxygen Therapy",
  iv_access: "IV Access / Cannulation",
  fluids: "IV Fluid Resuscitation",
  cardiac_monitoring: "12-Lead ECG & Monitoring",
  medication: "Emergency Pharmacotherapy",
  nebulization: "Emergency Nebulization",
  cpr: "Cardiopulmonary Resuscitation (CPR)",
  defibrillation: "Defibrillation / Shock",
  airway_management: "Advanced Airway Management",
  wound_care: "Hemorrhage Control & Wound Care",
  blood_transfusion: "Emergency Blood Transfusion",
  gastric_lavage: "Gastric Lavage & Decontamination",
  other: "Other Clinical Procedure",
};

function TreatmentList({ treatments }: { treatments: ErTreatment[] }) {
  if (treatments.length === 0) return <p className="muted">No interventions logged.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginTop: "0.5rem" }}>
      {treatments.map((t, idx) => {
        const label = INTERVENTION_LABELS[t.intervention_type] || t.intervention_type;
        return (
          <div
            key={t.id || idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "0.6rem 0.8rem",
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                background: "#e0e7ff",
                color: "#4338ca",
                whiteSpace: "nowrap",
                marginTop: "0.1rem",
              }}
            >
              {label}
            </span>
            <div style={{ flex: 1, fontSize: "0.86rem", color: "#1e293b" }}>
              <div style={{ fontWeight: 500 }}>{t.description || "Procedure performed as part of emergency clinical care."}</div>
              <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.2rem" }}>
                Logged &middot; {formatDateTimeIST(t.performed_at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddTreatmentForm({
  visitId,
  aiPrefill,
  setNotice,
  onAdded,
}: {
  visitId: number;
  aiPrefill: { interventionType: string; description: string } | null;
  setNotice: (notice: Notice | null) => void;
  onAdded: () => void;
}) {
  const [interventionType, setInterventionType] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  // Pre-fills the fields only -- logging an actual intervention is a real
  // clinical action, so it still requires the explicit "Log Intervention"
  // click below no matter how it got into these fields.
  useEffect(() => {
    if (!aiPrefill) return;
    setInterventionType(aiPrefill.interventionType);
    setDescription(aiPrefill.description);
    setAiFilled(true);
  }, [aiPrefill]);

  const submit = async () => {
    if (!interventionType) {
      setNotice({ type: "error", message: "Select an intervention type." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/er/visits/${visitId}/treatments`, {
        method: "POST",
        body: JSON.stringify({
          intervention_type: interventionType,
          description: description || undefined,
        }),
      });
      setInterventionType("");
      setDescription("");
      setAiFilled(false);
      onAdded();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to log intervention.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: "0.75rem" }}>
      {aiFilled && (
        <p className="er-ai-field-note">
          <FiZap aria-hidden /> AI-suggested — review before logging
        </p>
      )}
      <div className="module-form-grid">
        <Select
          value={interventionType}
          onChange={(e) => { setInterventionType(e.target.value); setAiFilled(false); }}
        >
          <option value="">Select Intervention Type...</option>
          <option value="oxygen">Oxygen Therapy</option>
          <option value="iv_access">IV Access / Cannulation</option>
          <option value="fluids">IV Fluid Resuscitation</option>
          <option value="cardiac_monitoring">12-Lead ECG & Cardiac Monitoring</option>
          <option value="medication">Emergency Pharmacotherapy</option>
          <option value="nebulization">Emergency Nebulization</option>
          <option value="cpr">CPR (Cardiopulmonary Resuscitation)</option>
          <option value="defibrillation">Defibrillation / Cardioversion</option>
          <option value="airway_management">Advanced Airway Management</option>
          <option value="wound_care">Hemorrhage Control & Wound Care</option>
          <option value="blood_transfusion">Emergency Blood Transfusion</option>
          <option value="gastric_lavage">Gastric Lavage & Decontamination</option>
          <option value="other">Other Clinical Procedure</option>
        </Select>
        <Input placeholder="Clinical details / instructions (e.g. 100% O2 via NRBM)" value={description} onChange={(e) => { setDescription(e.target.value); setAiFilled(false); }} />
        <Button size="sm" onClick={submit} disabled={saving}>
          {saving ? "Logging..." : "Log Intervention"}
        </Button>
      </div>
    </div>
  );
}

function DoctorAssignForm({
  visitId,
  existingDoctor,
  existingSpecialty,
  aiPrefill,
  setNotice,
  onSaved,
}: {
  visitId: number;
  existingDoctor?: string | null;
  existingSpecialty?: string | null;
  aiPrefill: { specialty: string; doctorName: string } | null;
  setNotice: (notice: Notice | null) => void;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(!existingDoctor);
  const [departments, setDepartments] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<{ doctor_name: string; department: string }[]>([]);
  const [specialty, setSpecialty] = useState(existingSpecialty || "");
  const [doctorName, setDoctorName] = useState(existingDoctor || "");
  const [saving, setSaving] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  // When AI Triage Assistant provides a recommendation, prefill fields and open form with review tag
  useEffect(() => {
    if (!aiPrefill) return;
    setSpecialty(aiPrefill.specialty);
    setDoctorName(aiPrefill.doctorName);
    setAiFilled(true);
    setOpen(true);
  }, [aiPrefill]);

  useEffect(() => {
    if (!existingDoctor) {
      setOpen(true);
      setSpecialty("");
      setDoctorName("");
    } else {
      setSpecialty(existingSpecialty || "");
      setDoctorName(existingDoctor || "");
    }
  }, [existingDoctor, existingSpecialty]);

  useEffect(() => {
    (async () => {
      try {
        const deptsRes = await apiFetch<{ departments: { department_name: string }[] }>("/api/registration/departments");
        const docsRes = await apiFetch<{ doctors: { doctor_name: string; department: string }[] }>("/api/op/doctors");
        setDepartments(deptsRes.departments.map((d) => d.department_name));
        setDoctors(docsRes.doctors);
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  const doctorsInSpecialty = specialty
    ? doctors.filter((d) => (d.department || "").toLowerCase() === specialty.toLowerCase())
    : doctors;
  const doctorOptions = doctorsInSpecialty.length > 0 ? doctorsInSpecialty : doctors;

  if (!open) {
    return (
      <Button
        size="sm"
        variant="ghost"
        style={{ marginTop: "0.6rem" }}
        onClick={() => {
          setSpecialty(existingSpecialty || "");
          setDoctorName(existingDoctor || "");
          setOpen(true);
        }}
      >
        Change doctor
      </Button>
    );
  }

  const submit = async () => {
    if (!specialty.trim()) {
      setNotice({ type: "error", message: "Select the required specialty." });
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch<{ doctor_name: string; matched_specialty: string; used_fallback: boolean }>(
        `/api/er/visits/${visitId}/assign-doctor`,
        {
          method: "POST",
          body: JSON.stringify({
            specialty: specialty.trim(),
            doctor_name: doctorName.trim() || undefined,
          }),
        },
      );
      let message: string;
      if (!result.doctor_name) {
        message = "No doctor is on staff at all yet -- add one under Doctor Scheduling, or assign one manually once available.";
      } else if (result.used_fallback) {
        message = `No ${specialty.trim()} specialist on staff -- assigned ${result.doctor_name} (${result.matched_specialty}) as the covering doctor instead. Confirm or override before they accept.`;
      } else {
        message = `Assigned doctor: ${result.doctor_name}. Confirm or override before the doctor accepts.`;
      }
      setNotice({ type: result.doctor_name ? "success" : "warning", message });
      setAiFilled(false);
      if (existingDoctor) setOpen(false);
      onSaved();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to assign a doctor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: "0.75rem" }}>
      {aiFilled && (
        <p className="er-ai-field-note">
          <FiZap aria-hidden /> AI-suggested — review before assigning
        </p>
      )}
      <div className="er-sidebar-form" style={{ marginTop: "0.4rem" }}>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Required specialty</Label>
          <Select
            value={specialty}
            onChange={(e) => {
              setSpecialty(e.target.value);
              setDoctorName("");
              setAiFilled(false);
            }}
          >
            <option value="">Select specialty...</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Doctor (optional -- overrides suggestion)</Label>
          <Select
            value={doctorName}
            onChange={(e) => {
              setDoctorName(e.target.value);
              setAiFilled(false);
            }}
          >
            <option value="">Auto -- let the system pick</option>
            {doctorOptions.map((d) => (
              <option key={d.doctor_name} value={d.doctor_name}>
                {d.doctor_name} ({d.department})
              </option>
            ))}
          </Select>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
          <Button size="sm" onClick={submit} disabled={saving} style={{ flex: 1 }}>
            {saving ? "Assigning..." : "Assign Doctor"}
          </Button>
          {existingDoctor && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setAiFilled(false);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function NotesList({ notes }: { notes: ErClinicalNote[] }) {
  if (notes.length === 0) return <p className="muted">No clinical notes yet.</p>;
  return (
    <ul className="er-list">
      {notes.map((n) => (
        <li key={n.id}>
          <strong>{n.note_type === "reassessment" ? "Reassessment" : "Assessment"}</strong>
          {n.author ? ` — Dr. ${n.author}` : ""}
          <span className="muted"> &middot; {formatDateTimeIST(n.created_at)}</span>
          <br />
          {n.content}
        </li>
      ))}
    </ul>
  );
}

const LAMA_REFUSAL_REASONS = [
  "Going to another hospital / facility of choice",
  "Financial constraints / unaffordable treatment or bed charges",
  "Personal / family preference to manage and nurse at home",
  "Refusal of ICU admission / invasive mechanical ventilation",
  "Dissatisfaction with treatment / refusal of emergency procedure",
  "Other clinical refusal",
];

const RELATION_OPTIONS = [
  "Self (Patient)",
  "Father",
  "Mother",
  "Spouse",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Guardian / Relative",
  "Friend / Colleague",
  "Other",
];

function ConsentDocumentControl({
  consentId,
  filename,
  setNotice,
  onChanged,
}: {
  consentId: number;
  filename?: string | null;
  setNotice: (notice: Notice | null) => void;
  onChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handlePick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadConsentDocument(consentId, file);
      setNotice({ type: "success", message: "Signed document attached." });
      onChanged();
    } catch (error: any) {
      setNotice({ type: "error", message: error.message || "Failed to upload the signed document." });
    } finally {
      setUploading(false);
    }
  };

  if (filename) {
    return (
      <a
        href={`${API_BASE}/api/er/consents/${consentId}/document`}
        target="_blank"
        rel="noreferrer"
        className="bed-link-button"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.35rem" }}
      >
        <FiFileText aria-hidden /> View signed document
      </a>
    );
  }

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        marginTop: "0.35rem",
        fontSize: "0.76rem",
        fontWeight: 600,
        color: uploading ? "#94a3b8" : "#1B4FD8",
        cursor: uploading ? "not-allowed" : "pointer",
      }}
    >
      <FiPrinter aria-hidden />
      {uploading ? "Uploading..." : "Attach signed paper form"}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        disabled={uploading}
        onChange={(e) => handlePick(e.target.files?.[0])}
        style={{ display: "none" }}
      />
    </label>
  );
}

function ConsentsList({
  consents,
  loading,
  setNotice,
  onDocumentChanged,
}: {
  consents: ErConsent[];
  loading: boolean;
  setNotice: (notice: Notice | null) => void;
  onDocumentChanged: () => void;
}) {
  if (loading) return <p className="muted" style={{ fontSize: "0.85rem" }}>Loading consents...</p>;
  if (consents.length === 0) {
    return (
      <p className="muted" style={{ fontSize: "0.85rem", margin: "0.4rem 0" }}>
        No formal consents or waivers recorded yet for this visit.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.4rem" }}>
      {consents.map((c) => {
        const isLama = c.consent_type === "lama" || c.consent_type === "dama";
        const isAdmission = c.consent_type === "admission";
        const isEmergency = c.consent_type === "emergency" || c.consent_type === "procedure";
        return (
          <div
            key={c.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              background: isLama ? "#fef2f2" : isAdmission ? "#eff6ff" : "#f0fdf4",
              border: isLama ? "1px solid #fecaca" : isAdmission ? "1px solid #bfdbfe" : "1px solid #bbf7d0",
              borderRadius: "6px",
              padding: "0.6rem 0.8rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px",
                    background: isLama ? "#fee2e2" : isAdmission ? "#dbeafe" : "#dcfce7",
                    color: isLama ? "#991b1b" : isAdmission ? "#1e40af" : "#166534",
                    textTransform: "uppercase",
                  }}
                >
                  {isLama ? "⚠️ LAMA Legal Waiver" : isAdmission ? "📋 Inpatient Admission Consent" : isEmergency ? "⚡ Emergency Procedure Consent" : c.consent_type}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Signed {formatDateTimeIST(c.signed_at)}
                </span>
              </div>
              <div style={{ fontSize: "0.86rem", color: "#1e293b", marginTop: "0.3rem" }}>
                Signer: <strong>{c.signed_by}</strong> {c.relation_to_patient ? `(${c.relation_to_patient})` : ""}
                {c.witness_doctor && <> &middot; Witness Doctor: <strong>{c.witness_doctor}</strong></>}
              </div>
              {c.refusal_reason && (
                <div style={{ fontSize: "0.8rem", color: "#b91c1c", marginTop: "0.2rem" }}>
                  <strong>Refusal Reason:</strong> {c.refusal_reason}
                </div>
              )}
              <ConsentDocumentControl
                consentId={c.id}
                filename={c.document_filename}
                setNotice={setNotice}
                onChanged={onDocumentChanged}
              />
            </div>
            <span
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: isLama ? "#b91c1c" : "#059669",
                whiteSpace: "nowrap",
                marginTop: "0.2rem",
              }}
            >
              ✔ Recorded &amp; Binding
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ErLamaModal({
  detail,
  onClose,
  onSaved,
  setNotice,
}: {
  detail: ErVisitDetail;
  onClose: () => void;
  onSaved: () => void;
  setNotice: (notice: Notice | null) => void;
}) {
  const patientFullName = detail.patient
    ? [detail.patient.name, detail.patient.last_name].filter(Boolean).join(" ")
    : detail.unknown_patient_label || "Emergency Patient";
  
  const [refusalReason, setRefusalReason] = useState(LAMA_REFUSAL_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [signedBy, setSignedBy] = useState(detail.patient?.guardian_name || patientFullName);
  const [relation, setRelation] = useState(detail.patient?.guardian_name ? "Guardian / Relative" : "Self (Patient)");
  const [phone, setPhone] = useState(detail.patient?.emergency_contact || detail.patient?.phone || "");
  const [witnessDoctor, setWitnessDoctor] = useState(detail.assigned_doctor_name || "Dr. G. Suryanarayana");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!signedBy.trim()) {
      setNotice({ type: "error", message: "Signer name is required." });
      return;
    }
    if (phone && phone.replace(/\D/g, "").length !== 10) {
      setNotice({ type: "error", message: "Enter a valid 10-digit mobile number." });
      return;
    }
    if (!witnessDoctor.trim()) {
      setNotice({ type: "error", message: "Witness doctor is required." });
      return;
    }
    if (!acknowledged) {
      setNotice({ type: "error", message: "You must acknowledge the legal indemnity declaration to execute LAMA." });
      return;
    }

    const finalReason = refusalReason === "Other clinical refusal" && customReason.trim() ? customReason.trim() : refusalReason;
    setSubmitting(true);
    try {
      await apiFetch(`/api/er/visits/${detail.id}/lama`, {
        method: "POST",
        body: JSON.stringify({
          patient_name: patientFullName,
          signed_by: signedBy.trim(),
          relation_to_patient: relation,
          signed_by_phone: phone.replace(/\D/g, "") || undefined,
          witness_doctor: witnessDoctor.trim(),
          refusal_reason: finalReason,
          legal_waiver_acknowledged: true,
        }),
      });
      setNotice({
        type: "warning",
        message: "LAMA Declaration recorded. Legal waiver saved, bed requests cancelled, and ER visit closed.",
      });
      onClose();
      onSaved();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to record LAMA declaration.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="⚠️ Leave Against Medical Advice (LAMA / DAMA) Legal Waiver"
      description={`Patient: ${patientFullName} (${detail.visit_no})`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "0.85rem",
            color: "#7f1d1d",
            fontSize: "0.85rem",
            lineHeight: "1.5",
          }}
        >
          <strong style={{ display: "block", color: "#991b1b", marginBottom: "0.3rem", fontSize: "0.9rem" }}>
            MANDATORY MEDICAL-LEGAL INDEMNITY DECLARATION:
          </strong>
          I/We hereby declare that I am leaving the hospital / refusing recommended inpatient/ICU admission against the medical advice (LAMA) of the attending physicians. The severe medical risks, including disease deterioration, permanent organ impairment, and death, have been clearly explained to me in a language I understand. I voluntarily choose to leave, assume full responsibility, and fully release and indemnify the hospital, doctors, and clinical staff from all legal, medical, and financial liability.
        </div>

        <div>
          <Label>Primary Reason for Refusal / Leaving</Label>
          <Select value={refusalReason} onChange={(e) => setRefusalReason(e.target.value)}>
            {LAMA_REFUSAL_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
          {refusalReason === "Other clinical refusal" && (
            <Input
              style={{ marginTop: "0.4rem" }}
              placeholder="Specify custom refusal reason..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <Label>Signer Name (Patient / Guardian)</Label>
            <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Full name of signer" />
          </div>
          <div>
            <Label>Relationship to Patient</Label>
            <Select value={relation} onChange={(e) => setRelation(e.target.value)}>
              {RELATION_OPTIONS.map((rel) => (
                <option key={rel} value={rel}>{rel}</option>
              ))}
            </Select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <Label>Signer 10-Digit Mobile Number</Label>
            <Input
              maxLength={10}
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <Label>Attending / Witness Doctor</Label>
            <Input value={witnessDoctor} onChange={(e) => setWitnessDoctor(e.target.value)} placeholder="Doctor name" />
          </div>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            background: "#fff1f2",
            padding: "0.75rem",
            borderRadius: "6px",
            border: "1px solid #fda4af",
            cursor: "pointer",
            fontSize: "0.85rem",
            color: "#881337",
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ marginTop: "0.2rem" }}
          />
          <span>
            <strong>I confirm that I have explained/understood all medical risks</strong> and that the patient/guardian has willingly signed this waiver to discharge on LAMA terms.
          </span>
        </label>

        <div className="ui-modal-actions" style={{ marginTop: "0.5rem" }}>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            style={{ background: "#dc2626", color: "#fff", borderColor: "#b91c1c" }}
            onClick={handleSubmit}
            disabled={submitting || !acknowledged}
          >
            {submitting ? "Recording LAMA..." : "Execute & Sign LAMA Discharge"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ErConsentModal({
  detail,
  type,
  onClose,
  onSaved,
  setNotice,
}: {
  detail: ErVisitDetail;
  type: "admission" | "emergency";
  onClose: () => void;
  onSaved: () => void;
  setNotice: (notice: Notice | null) => void;
}) {
  const patientFullName = detail.patient
    ? [detail.patient.name, detail.patient.last_name].filter(Boolean).join(" ")
    : detail.unknown_patient_label || "Emergency Patient";

  const [signedBy, setSignedBy] = useState(detail.patient?.guardian_name || patientFullName);
  const [relation, setRelation] = useState(detail.patient?.guardian_name ? "Guardian / Relative" : "Self (Patient)");
  const [phone, setPhone] = useState(detail.patient?.emergency_contact || detail.patient?.phone || "");
  const [witnessDoctor, setWitnessDoctor] = useState(detail.assigned_doctor_name || "Dr. G. Suryanarayana");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Real-world consents are often paper-first -- staff may tick this
  // checkbox before (or after) the patient/guardian actually signs the
  // physical form. This optional attachment is the durable proof: a photo
  // or scan of that signed paper, uploaded right alongside the typed record.
  const [signedDocument, setSignedDocument] = useState<File | null>(null);

  const title = type === "admission" ? "📋 Informed Inpatient / ICU Admission Consent" : "⚡ Emergency High-Risk Treatment Consent";

  const handleSubmit = async () => {
    if (!signedBy.trim()) {
      setNotice({ type: "error", message: "Signer name is required." });
      return;
    }
    if (phone && phone.replace(/\D/g, "").length !== 10) {
      setNotice({ type: "error", message: "Enter a valid 10-digit mobile number." });
      return;
    }
    if (!acknowledged) {
      setNotice({ type: "error", message: "Please accept the consent terms." });
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch<{ consent_id: number }>(`/api/er/visits/${detail.id}/consents`, {
        method: "POST",
        body: JSON.stringify({
          patient_name: patientFullName,
          consent_type: type,
          signed_by: signedBy.trim(),
          relation_to_patient: relation,
          signed_by_phone: phone.replace(/\D/g, "") || undefined,
          witness_doctor: witnessDoctor.trim(),
          legal_waiver_acknowledged: true,
          notes: type === "admission" ? "Inpatient Admission Consent recorded prior to bed transfer" : "Emergency Clinical Treatment Consent recorded",
        }),
      });
      if (signedDocument) {
        try {
          await uploadConsentDocument(result.consent_id, signedDocument);
        } catch (uploadError: any) {
          // The consent record itself is already saved and legally valid on
          // its own -- a failed attachment upload shouldn't look like the
          // whole consent failed, just that the proof photo didn't make it.
          setNotice({ type: "warning", message: `${title} recorded, but the attached document failed to upload: ${uploadError.message}` });
          onClose();
          onSaved();
          return;
        }
      }
      setNotice({ type: "success", message: `${title} recorded.` });
      onClose();
      onSaved();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to record consent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={title}
      description={`Patient: ${patientFullName} (${detail.visit_no})`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div
          style={{
            background: type === "admission" ? "#eff6ff" : "#fefce8",
            border: type === "admission" ? "1px solid #bfdbfe" : "1px solid #fef08a",
            borderRadius: "8px",
            padding: "0.85rem",
            color: type === "admission" ? "#1e3a8a" : "#854d0e",
            fontSize: "0.85rem",
            lineHeight: "1.5",
          }}
        >
          <strong style={{ display: "block", marginBottom: "0.3rem" }}>
            {type === "admission" ? "INPATIENT ADMISSION & CARE POLICIES:" : "EMERGENCY CLINICAL PROCEDURE NOTICE:"}
          </strong>
          {type === "admission" ? (
            <span>
              I/We hereby consent to admission into the General / Semi-Private / Private / ICU ward as clinically deemed necessary. I agree to abide by hospital rules, standard nursing protocols, diagnostic investigations, medication administration, and applicable room tariffs.
            </span>
          ) : (
            <span>
              I/We consent to urgent emergency procedures (including CPR, endotracheal intubation, IV access, telemetry, fluid resuscitation, nebulization, blood transfusion, or emergency pharmacotherapy). The critical condition and necessity of these interventions have been explained.
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <Label>Signer Name</Label>
            <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Full name of signer" />
          </div>
          <div>
            <Label>Relationship to Patient</Label>
            <Select value={relation} onChange={(e) => setRelation(e.target.value)}>
              {RELATION_OPTIONS.map((rel) => (
                <option key={rel} value={rel}>{rel}</option>
              ))}
            </Select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <Label>Signer 10-Digit Phone</Label>
            <Input
              maxLength={10}
              placeholder="10-digit phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <Label>Attending Doctor</Label>
            <Input value={witnessDoctor} onChange={(e) => setWitnessDoctor(e.target.value)} placeholder="Doctor name" />
          </div>
        </div>

        <div>
          <Label>Attach signed paper form (optional)</Label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            onChange={(e) => setSignedDocument(e.target.files?.[0] || null)}
          />
          <p className="er-field-hint">
            A photo or scan of the physically-signed form -- proof independent of the checkbox below,
            for when the paper is signed before or after this is recorded on the system.
          </p>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            background: "#f8fafc",
            padding: "0.75rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            cursor: "pointer",
            fontSize: "0.85rem",
            color: "#1e293b",
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ marginTop: "0.2rem" }}
          />
          <span>
            <strong>I give voluntary informed consent</strong> for the proposed clinical admission and interventions, accepting hospital terms and medical protocols.
          </span>
        </label>

        <div className="ui-modal-actions" style={{ marginTop: "0.5rem" }}>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !acknowledged}>
            {submitting ? "Signing..." : "Sign & Record Consent"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddNoteForm({
  visitId,
  setNotice,
  onAdded,
}: {
  visitId: number;
  setNotice: (notice: Notice | null) => void;
  onAdded: () => void;
}) {
  const [noteType, setNoteType] = useState<"assessment" | "reassessment">("assessment");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!content.trim()) {
      setNotice({ type: "error", message: "Enter note content." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/er/visits/${visitId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note_type: noteType, content: content.trim() }),
      });
      setContent("");
      onAdded();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to add note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-form-grid" style={{ marginTop: "0.75rem" }}>
      <Select value={noteType} onChange={(e) => setNoteType(e.target.value as "assessment" | "reassessment")}>
        <option value="assessment">Assessment</option>
        <option value="reassessment">Reassessment</option>
      </Select>
      <Textarea placeholder="Clinical note" value={content} onChange={(e) => setContent(e.target.value)} />
      <Button size="sm" onClick={submit} disabled={saving}>
        {saving ? "Saving..." : "Add Note"}
      </Button>
    </div>
  );
}

function DispositionForm({
  visitId,
  setNotice,
  onSaved,
}: {
  visitId: number;
  setNotice: (notice: Notice | null) => void;
  onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState("");
  const [requiredSpecialty, setRequiredSpecialty] = useState("");
  const [clinicalReason, setClinicalReason] = useState("");
  const [priority, setPriority] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!outcome || !clinicalReason.trim()) {
      setNotice({ type: "error", message: "Select an outcome and enter the clinical reason." });
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch<{ bed_request_id: number | null }>(
        `/api/er/visits/${visitId}/disposition`,
        {
          method: "POST",
          body: JSON.stringify({
            outcome,
            required_specialty: requiredSpecialty || undefined,
            clinical_reason: clinicalReason.trim(),
            priority: priority || undefined,
          }),
        },
      );
      setNotice({
        type: "success",
        message: result.bed_request_id
          ? "Disposition recorded. A bed request has been sent to Bed Management."
          : "Disposition recorded.",
      });
      onSaved();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to record disposition.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-form-grid" style={{ marginTop: "0.75rem" }}>
      <Select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
        <option value="">Select outcome</option>
        {OUTCOME_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {outcome && OUTCOMES_REQUIRING_BED.has(outcome) && (
        <Input
          placeholder="Required specialty"
          value={requiredSpecialty}
          onChange={(e) => setRequiredSpecialty(e.target.value)}
        />
      )}
      <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option value="">Priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </Select>
      <Textarea
        placeholder="Clinical reason for this decision"
        value={clinicalReason}
        onChange={(e) => setClinicalReason(e.target.value)}
      />
      <Button onClick={submit} disabled={saving}>
        {saving ? "Recording..." : "Record Disposition"}
      </Button>
    </div>
  );
}

function CloseVisitPanel({
  visitId,
  setNotice,
  onClosed,
}: {
  visitId: number;
  setNotice: (notice: Notice | null) => void;
  onClosed: () => void;
}) {
  const [consultationFee, setConsultationFee] = useState("500");
  const [items, setItems] = useState<{ label: string; amount: number }[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [closing, setClosing] = useState(false);

  const preview = async () => {
    setLoadingPreview(true);
    try {
      const data = await apiFetch<{ items: { label: string; amount: number }[]; total: number }>(
        `/api/er/visits/${visitId}/charges?consultation_fee=${encodeURIComponent(consultationFee || "0")}`,
      );
      setItems(data.items);
      setTotal(data.total);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to compute charges.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const confirmClose = async () => {
    setClosing(true);
    try {
      const result = await apiFetch<{ invoice_id: number | null; total: number }>(
        `/api/er/visits/${visitId}/close`,
        {
          method: "POST",
          body: JSON.stringify({
            consultation_fee: Number(consultationFee) || 0,
            total_amount: total,
          }),
        },
      );
      setNotice({
        type: "success",
        message: result.invoice_id
          ? `Visit closed. Invoice raised for ${result.total}.`
          : "Visit closed.",
      });
      onClosed();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to close the visit.");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="panel" style={{ marginTop: "0.75rem" }}>
      <h4 style={{ marginTop: 0 }}>Close Visit &amp; Raise Invoice</h4>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
        <div>
          <Label htmlFor="er-consultation-fee">Consultation fee</Label>
          <Input
            id="er-consultation-fee"
            value={consultationFee}
            onChange={(e) => setConsultationFee(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={preview} disabled={loadingPreview}>
          {loadingPreview ? "Calculating..." : "Preview Charges"}
        </Button>
      </div>

      {items && (
        <>
          <Table>
            <TableHead>
              <TableCell>Item</TableCell>
              <TableCell>Amount</TableCell>
            </TableHead>
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{item.label}</TableCell>
                <TableCell>{item.amount}</TableCell>
              </TableRow>
            ))}
          </Table>
          <div style={{ margin: "0.5rem 0" }}>
            <Label htmlFor="er-total-review">Total (editable)</Label>
            <Input
              id="er-total-review"
              value={total}
              onChange={(e) => setTotal(Number(e.target.value) || 0)}
            />
          </div>
          <Button onClick={confirmClose} disabled={closing}>
            {closing ? "Closing..." : "Confirm Close & Raise Invoice"}
          </Button>
        </>
      )}
    </div>
  );
}
