/**
 * Enterprise Hospital Management System - Emergency Room & Bed Management Persistent Store
 * Provides full offline/local storage fallback and data persistence for ER & Bed workflows.
 */

export interface ErPatient {
  patient_id: string;
  name: string;
  last_name: string;
  gender: string;
  age: number;
  phone: string;
  emergency_contact: string;
  guardian_name?: string;
  address?: string;
  allergies?: string;
  blood_group?: string;
  created_at: string;
}

export interface ErComplaintItem {
  id: number;
  complaint: string;
  severity: string | null;
  case_category: string | null;
  duration: string | null;
  reported_by: string | null;
  created_at: string;
}

export interface ErVitalsItem {
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
}

export interface ErTriageItem {
  category: string;
  triage_bed_label: string | null;
  reason: string | null;
  triaged_at: string;
  assigned_by: string | null;
}

export interface ErTreatmentItem {
  id: number;
  intervention_type: string;
  description: string | null;
  performed_at: string;
  administered_by: string | null;
}

export interface ErClinicalNoteItem {
  id: number;
  note_type: string;
  author: string | null;
  content: string;
  created_at: string;
}

export interface ErDispositionItem {
  outcome: string;
  required_specialty: string | null;
  clinical_reason: string;
  decided_by: string | null;
  decided_at: string;
  priority: string | null;
}

export interface ErBedRequestItem {
  id: number;
  status: string;
  requested_level_of_care: string;
  requested_specialty: string | null;
  requested_at: string;
  allocated_bed_id: number | null;
  allocated_admission_id: number | null;
  allocated_at: string | null;
}

export interface ErConsentItem {
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
}

export interface ErVisitRecord {
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
  police_involved?: boolean;
  patient_name?: string | null;
  patient_last_name?: string | null;
  patient_gender?: string | null;
  patient_age?: number | null;
  patient_phone?: string | null;
  patient_emergency_contact?: string | null;
  complaints: ErComplaintItem[];
  vitals: ErVitalsItem[];
  triage: ErTriageItem | null;
  treatments: ErTreatmentItem[];
  clinical_notes: ErClinicalNoteItem[];
  disposition: ErDispositionItem | null;
  bed_requests: ErBedRequestItem[];
  consents: ErConsentItem[];
}

export interface TriageCategoryConfig {
  id: number;
  category_code: string;
  category_label: string;
  description: string | null;
  color: string | null;
  sort_order: number;
}

const DEFAULT_TRIAGE_CATEGORIES: TriageCategoryConfig[] = [
  { id: 1, category_code: "B1", category_label: "Immediate / Resuscitation", description: "Life-threatening condition requiring immediate medical intervention", color: "#DC2626", sort_order: 1 },
  { id: 2, category_code: "B2", category_label: "High / Emergent", description: "Potentially life-threatening condition; assessment within 10-15 minutes", color: "#EA580C", sort_order: 2 },
  { id: 3, category_code: "B3", category_label: "Moderate / Urgent", description: "Serious condition requiring medical evaluation within 30-60 minutes", color: "#D97706", sort_order: 3 },
  { id: 4, category_code: "B4", category_label: "Low / Less Urgent", description: "Stable condition, routine emergency evaluation", color: "#16A34A", sort_order: 4 },
  { id: 5, category_code: "B5", category_label: "Non-Urgent", description: "Minor presentation, can be managed electively or referred to OP", color: "#2563EB", sort_order: 5 },
];

const INITIAL_PATIENTS: ErPatient[] = [
  {
    patient_id: "P-100245",
    name: "John",
    last_name: "Smith",
    gender: "Male",
    age: 41,
    phone: "9876543210",
    emergency_contact: "9876543211",
    guardian_name: "Mary Smith",
    address: "124 Park Avenue, South Block, Metro City",
    allergies: "Penicillin",
    blood_group: "O+",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    patient_id: "P-100246",
    name: "Mary",
    last_name: "Jones",
    gender: "Female",
    age: 53,
    phone: "9845123456",
    emergency_contact: "9845123457",
    guardian_name: "Robert Jones",
    address: "88 Lakeview Road, Metro City",
    allergies: "Sulfa drugs",
    blood_group: "A+",
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    patient_id: "P-100301",
    name: "Thomas",
    last_name: "Reed",
    gender: "Male",
    age: 68,
    phone: "9712345678",
    emergency_contact: "9712345679",
    guardian_name: "Helen Reed",
    address: "12 Pine Ridge, Metro City",
    allergies: "None",
    blood_group: "B+",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

const INITIAL_VISITS: ErVisitRecord[] = [
  {
    id: 101,
    visit_no: "ER-2026-00101",
    patient_id: "P-100245",
    is_unknown_patient: false,
    unknown_patient_label: null,
    arrival_mode: "ambulance_108",
    condition_at_arrival: "Acute Chest Pain / Suspected STEMI / Acute Coronary Syndrome",
    arrival_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "under_treatment",
    assigned_doctor_name: "Dr. Vikram Seth (Cardiology)",
    assigned_specialty: "Cardiology",
    doctor_assigned_at: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    doctor_accepted_at: new Date(Date.now() - 3600000 * 1.7).toISOString(),
    triage_category: "B1",
    triage_bed_label: "ER Bed 01 (Red Zone)",
    closed_at: null,
    police_involved: false,
    patient_name: "John",
    patient_last_name: "Smith",
    patient_gender: "Male",
    patient_age: 41,
    patient_phone: "9876543210",
    patient_emergency_contact: "9876543211",
    complaints: [
      {
        id: 1,
        complaint: "Severe crushing retrosternal chest pain radiating to left jaw and shoulder with diaphoresis",
        severity: "Severe",
        case_category: "cardiac",
        duration: "45 mins",
        reported_by: "Patient",
        created_at: new Date(Date.now() - 3600000 * 1.9).toISOString(),
      },
    ],
    vitals: [
      {
        id: 1,
        recorded_at: new Date(Date.now() - 3600000 * 1.9).toISOString(),
        recorded_by: "Staff Nurse Priya",
        heart_rate: 112,
        bp_systolic: 155,
        bp_diastolic: 95,
        respiratory_rate: 22,
        spo2: 94,
        temperature: 98.6,
        consciousness_level: "Alert (A)",
        blood_glucose: 142,
        pain_score: 9,
        gcs: 15,
        notes: "ECG shows ST elevations in leads V1-V4. High priority cardiology alert triggered.",
      },
    ],
    triage: {
      category: "B1",
      triage_bed_label: "ER Bed 01 (Red Zone)",
      reason: "Acute STEMI presentation with hemodynamic distress. Immediate thrombolysis / cath lab alert.",
      triaged_at: new Date(Date.now() - 3600000 * 1.9).toISOString(),
      assigned_by: "AI Triage & Dr. Mehra",
    },
    treatments: [
      {
        id: 1,
        intervention_type: "IV Access & High Flow O2",
        description: "Wide bore 18G IV cannulation left antecubital, O2 at 4L/min via nasal cannula",
        performed_at: new Date(Date.now() - 3600000 * 1.7).toISOString(),
        administered_by: "Nurse Priya",
      },
      {
        id: 2,
        intervention_type: "Emergency Cardiac Loading Dose",
        description: "Aspirin 300mg + Clopidogrel 300mg + Atorvastatin 80mg stat PO given",
        performed_at: new Date(Date.now() - 3600000 * 1.6).toISOString(),
        administered_by: "Dr. Vikram Seth",
      },
    ],
    clinical_notes: [
      {
        id: 1,
        note_type: "Physician Assessment",
        author: "Dr. Vikram Seth",
        content: "Patient presented with acute anterior wall STEMI. Troponin-I sent. Cath Lab activated. Preparing for primary PCI.",
        created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      },
    ],
    disposition: null,
    bed_requests: [
      {
        id: 1,
        status: "pending",
        requested_level_of_care: "ICU (Intensive Care Unit)",
        requested_specialty: "Cardiology",
        requested_at: new Date(Date.now() - 3600000 * 1.2).toISOString(),
        allocated_bed_id: null,
        allocated_admission_id: null,
        allocated_at: null,
      },
    ],
    consents: [
      {
        id: 1,
        patient_name: "John Smith",
        consent_type: "Emergency Coronary Angiography & Primary PCI",
        signed_by: "Mary Smith (Spouse)",
        relation_to_patient: "Spouse",
        status: "Signed",
        witness_doctor: "Dr. Vikram Seth",
        signed_by_phone: "9876543211",
        legal_waiver_acknowledged: true,
        signed_at: new Date(Date.now() - 3600000 * 1.4).toISOString(),
      },
    ],
  },
  {
    id: 102,
    visit_no: "ER-2026-00102",
    patient_id: "P-100301",
    is_unknown_patient: false,
    unknown_patient_label: null,
    arrival_mode: "brought_by_family",
    condition_at_arrival: "Conscious with Acute Distress (Severe Pain / Dyspnea)",
    arrival_at: new Date(Date.now() - 3600000 * 1.1).toISOString(),
    status: "doctor_assigned",
    assigned_doctor_name: "Dr. Anita Roy (Pulmonology)",
    assigned_specialty: "Pulmonology",
    doctor_assigned_at: new Date(Date.now() - 3600000 * 0.9).toISOString(),
    doctor_accepted_at: new Date(Date.now() - 3600000 * 0.8).toISOString(),
    triage_category: "B2",
    triage_bed_label: "ER Bed 04 (Yellow Zone)",
    closed_at: null,
    police_involved: false,
    patient_name: "Thomas",
    patient_last_name: "Reed",
    patient_gender: "Male",
    patient_age: 68,
    patient_phone: "9712345678",
    patient_emergency_contact: "9712345679",
    complaints: [
      {
        id: 2,
        complaint: "Acute exacerbation of COPD, progressive breathlessness and productive cough",
        severity: "Moderate",
        case_category: "general_illness",
        duration: "2 days",
        reported_by: "Patient",
        created_at: new Date(Date.now() - 3600000 * 1.0).toISOString(),
      },
    ],
    vitals: [
      {
        id: 2,
        recorded_at: new Date(Date.now() - 3600000 * 1.0).toISOString(),
        recorded_by: "Staff Nurse Arjun",
        heart_rate: 98,
        bp_systolic: 138,
        bp_diastolic: 84,
        respiratory_rate: 26,
        spo2: 89,
        temperature: 99.2,
        consciousness_level: "Alert (A)",
        blood_glucose: 128,
        pain_score: 3,
        gcs: 15,
        notes: "Bilateral wheeze present. SpO2 89% on room air.",
      },
    ],
    triage: {
      category: "B2",
      triage_bed_label: "ER Bed 04 (Yellow Zone)",
      reason: "Hypoxia with COPD exacerbation and tachypnea.",
      triaged_at: new Date(Date.now() - 3600000 * 1.0).toISOString(),
      assigned_by: "AI Triage Assistant",
    },
    treatments: [
      {
        id: 3,
        intervention_type: "Duolin + Budecort Nebulization",
        description: "Ipratropium + Levosalbutamol with Budesonide nebulized stat",
        performed_at: new Date(Date.now() - 3600000 * 0.7).toISOString(),
        administered_by: "Nurse Arjun",
      },
    ],
    clinical_notes: [],
    disposition: null,
    bed_requests: [],
    consents: [],
  },
];

const ER_STORAGE_KEY_PATIENTS = "hospai_er_patients_v2";
const ER_STORAGE_KEY_VISITS = "hospai_er_visits_v2";
const ER_STORAGE_KEY_CATEGORIES = "hospai_er_categories_v2";

export class ErDatabase {
  private static load<T>(key: string, fallback: T): T {
    try {
      if (typeof window === "undefined") return fallback;
      const data = window.localStorage.getItem(key);
      if (!data) {
        window.localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
      }
      return JSON.parse(data);
    } catch {
      return fallback;
    }
  }

  private static save<T>(key: string, data: T): void {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {
      console.error("ErDatabase save error:", e);
    }
  }

  // Patients
  static getPatients(): ErPatient[] {
    return this.load<ErPatient[]>(ER_STORAGE_KEY_PATIENTS, INITIAL_PATIENTS);
  }

  static searchPatients(query: string): ErPatient[] {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return this.getPatients().filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q) ||
        p.patient_id.toLowerCase().includes(q) ||
        p.phone.includes(q)
    );
  }

  static addPatient(p: Partial<ErPatient>): ErPatient {
    const list = this.getPatients();
    const newId = `P-${Math.floor(100000 + Math.random() * 900000)}`;
    const fullPatient: ErPatient = {
      patient_id: p.patient_id || newId,
      name: p.name || "Patient",
      last_name: p.last_name || "",
      gender: p.gender || "Male",
      age: p.age || 30,
      phone: p.phone || "0000000000",
      emergency_contact: p.emergency_contact || "0000000000",
      guardian_name: p.guardian_name || "",
      address: p.address || "",
      allergies: p.allergies || "",
      blood_group: p.blood_group || "O+",
      created_at: new Date().toISOString(),
    };
    list.unshift(fullPatient);
    this.save(ER_STORAGE_KEY_PATIENTS, list);
    return fullPatient;
  }

  // Triage Categories
  static getCategories(): TriageCategoryConfig[] {
    return this.load<TriageCategoryConfig[]>(ER_STORAGE_KEY_CATEGORIES, DEFAULT_TRIAGE_CATEGORIES);
  }

  static saveCategory(cat: Partial<TriageCategoryConfig>): TriageCategoryConfig {
    const list = this.getCategories();
    const idx = list.findIndex((c) => c.category_code === cat.category_code || c.id === cat.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...cat };
      this.save(ER_STORAGE_KEY_CATEGORIES, list);
      return list[idx];
    } else {
      const newCat: TriageCategoryConfig = {
        id: list.length + 1,
        category_code: cat.category_code || `B${list.length + 1}`,
        category_label: cat.category_label || "New Category",
        description: cat.description || null,
        color: cat.color || "#16A34A",
        sort_order: cat.sort_order || list.length + 1,
      };
      list.push(newCat);
      this.save(ER_STORAGE_KEY_CATEGORIES, list);
      return newCat;
    }
  }

  // Visits
  static getVisits(filter?: "active" | "closed" | "all"): ErVisitRecord[] {
    const visits = this.load<ErVisitRecord[]>(ER_STORAGE_KEY_VISITS, INITIAL_VISITS);
    if (filter === "active") return visits.filter((v) => v.status !== "closed");
    if (filter === "closed") return visits.filter((v) => v.status === "closed");
    return visits;
  }

  static getVisit(id: number): ErVisitRecord | null {
    const visits = this.getVisits("all");
    const v = visits.find((item) => item.id === Number(id));
    return v || null;
  }

  static createVisit(visitData: {
    patientId?: string;
    patientDetails?: Partial<ErPatient>;
    isUnknown?: boolean;
    unknownLabel?: string;
    arrivalMode?: string;
    conditionAtArrival?: string;
    policeInvolved?: boolean;
    complaintText?: string;
    caseCategory?: string;
    vitals?: Partial<ErVitalsItem>;
  }): { visit: ErVisitRecord; patient: ErPatient | null } {
    let patient: ErPatient | null = null;

    if (visitData.patientDetails && (visitData.patientDetails.name || visitData.patientDetails.phone)) {
      patient = this.addPatient(visitData.patientDetails);
    } else if (visitData.patientId) {
      patient = this.getPatients().find((p) => p.patient_id === visitData.patientId) || null;
    }

    const visits = this.getVisits("all");
    const nextId = visits.length > 0 ? Math.max(...visits.map((v) => v.id)) + 1 : 101;
    const visitNo = `ER-${new Date().getFullYear()}-${String(nextId).padStart(5, "0")}`;

    const now = new Date().toISOString();

    const complaintsList: ErComplaintItem[] = [];
    if (visitData.complaintText && visitData.complaintText.trim()) {
      complaintsList.push({
        id: 1,
        complaint: visitData.complaintText.trim(),
        severity: "Moderate",
        case_category: visitData.caseCategory || "general_illness",
        duration: "Immediate",
        reported_by: "Intake Nurse / EMS",
        created_at: now,
      });
    }

    const vitalsList: ErVitalsItem[] = [];
    if (visitData.vitals && Object.keys(visitData.vitals).length > 0) {
      vitalsList.push({
        id: 1,
        recorded_at: now,
        recorded_by: "Triage Staff",
        heart_rate: visitData.vitals.heart_rate || null,
        bp_systolic: visitData.vitals.bp_systolic || null,
        bp_diastolic: visitData.vitals.bp_diastolic || null,
        respiratory_rate: visitData.vitals.respiratory_rate || null,
        spo2: visitData.vitals.spo2 || null,
        temperature: visitData.vitals.temperature || null,
        consciousness_level: visitData.vitals.consciousness_level || "Alert (A)",
        blood_glucose: visitData.vitals.blood_glucose || null,
        pain_score: visitData.vitals.pain_score || null,
        gcs: visitData.vitals.gcs || 15,
        notes: visitData.vitals.notes || null,
      });
    }

    // Run smart clinical triage logic
    const triageCalc = this.evaluateClinicalTriage(visitData.complaintText || "", visitData.vitals || {});

    const newRecord: ErVisitRecord = {
      id: nextId,
      visit_no: visitNo,
      patient_id: patient?.patient_id || (visitData.isUnknown ? null : visitData.patientId || null),
      is_unknown_patient: !!visitData.isUnknown,
      unknown_patient_label: visitData.unknownLabel || null,
      arrival_mode: visitData.arrivalMode || "walk-in",
      condition_at_arrival: visitData.conditionAtArrival || null,
      arrival_at: now,
      status: "registered",
      assigned_doctor_name: triageCalc.suggestedDoctor || null,
      assigned_specialty: triageCalc.suggestedDepartment || "Emergency",
      doctor_assigned_at: triageCalc.suggestedDoctor ? now : null,
      doctor_accepted_at: null,
      triage_category: triageCalc.categoryCode,
      triage_bed_label: triageCalc.triageBedLabel,
      closed_at: null,
      police_involved: !!visitData.policeInvolved,
      patient_name: patient?.name || (visitData.isUnknown ? "Unidentified Patient" : "Patient"),
      patient_last_name: patient?.last_name || "",
      patient_gender: patient?.gender || "Unknown",
      patient_age: patient?.age || null,
      patient_phone: patient?.phone || "",
      patient_emergency_contact: patient?.emergency_contact || "",
      complaints: complaintsList,
      vitals: vitalsList,
      triage: {
        category: triageCalc.categoryCode,
        triage_bed_label: triageCalc.triageBedLabel,
        reason: triageCalc.reasoning,
        triaged_at: now,
        assigned_by: "AI Triage Assistant",
      },
      treatments: triageCalc.suggestedTreatments.map((t, idx) => ({
        id: idx + 1,
        intervention_type: t.intervention_type,
        description: t.description,
        performed_at: now,
        administered_by: "ER Rapid Response Team",
      })),
      clinical_notes: [],
      disposition: null,
      bed_requests: [],
      consents: [],
    };

    visits.unshift(newRecord);
    this.save(ER_STORAGE_KEY_VISITS, visits);
    return { visit: newRecord, patient };
  }

  static updateVisit(id: number, updates: Partial<ErVisitRecord>): ErVisitRecord {
    const visits = this.getVisits("all");
    const idx = visits.findIndex((v) => v.id === Number(id));
    if (idx >= 0) {
      visits[idx] = { ...visits[idx], ...updates };
      this.save(ER_STORAGE_KEY_VISITS, visits);
      return visits[idx];
    }
    throw new Error(`Visit ${id} not found`);
  }

  static addComplaint(visitId: number, complaint: { complaint: string; case_category?: string }): ErComplaintItem {
    const visit = this.getVisit(visitId);
    if (!visit) throw new Error("Visit not found");
    const newItem: ErComplaintItem = {
      id: visit.complaints.length + 1,
      complaint: complaint.complaint,
      severity: "Moderate",
      case_category: complaint.case_category || null,
      duration: "Current",
      reported_by: "Clinical Staff",
      created_at: new Date().toISOString(),
    };
    visit.complaints.push(newItem);
    this.updateVisit(visitId, { complaints: visit.complaints });
    return newItem;
  }

  static addVitals(visitId: number, vitals: Partial<ErVitalsItem>): ErVitalsItem {
    const visit = this.getVisit(visitId);
    if (!visit) throw new Error("Visit not found");
    const newItem: ErVitalsItem = {
      id: visit.vitals.length + 1,
      recorded_at: new Date().toISOString(),
      recorded_by: "Triage Nurse",
      heart_rate: vitals.heart_rate ?? null,
      bp_systolic: vitals.bp_systolic ?? null,
      bp_diastolic: vitals.bp_diastolic ?? null,
      respiratory_rate: vitals.respiratory_rate ?? null,
      spo2: vitals.spo2 ?? null,
      temperature: vitals.temperature ?? null,
      consciousness_level: vitals.consciousness_level ?? "Alert (A)",
      blood_glucose: vitals.blood_glucose ?? null,
      pain_score: vitals.pain_score ?? null,
      gcs: vitals.gcs ?? 15,
      notes: vitals.notes ?? null,
    };
    visit.vitals.push(newItem);
    this.updateVisit(visitId, { vitals: visit.vitals });
    return newItem;
  }

  static setTriage(visitId: number, triage: { category: string; reason?: string; bedLabel?: string }): ErTriageItem {
    const visit = this.getVisit(visitId);
    if (!visit) throw new Error("Visit not found");
    const newTriage: ErTriageItem = {
      category: triage.category,
      triage_bed_label: triage.bedLabel || (triage.category === "B1" ? "ER Red Zone" : triage.category === "B2" ? "ER Yellow Zone" : "ER Green Zone"),
      reason: triage.reason || "Clinical Assessment",
      triaged_at: new Date().toISOString(),
      assigned_by: "ED Medical Officer",
    };
    this.updateVisit(visitId, {
      triage: newTriage,
      triage_category: triage.category,
      triage_bed_label: newTriage.triage_bed_label,
      status: visit.status === "registered" ? "triaged" : visit.status,
    });
    return newTriage;
  }

  static assignDoctor(visitId: number, data: { doctor_name?: string; specialty?: string }): void {
    const visit = this.getVisit(visitId);
    if (!visit) throw new Error("Visit not found");
    this.updateVisit(visitId, {
      assigned_doctor_name: data.doctor_name || visit.assigned_doctor_name || "Dr. Vikram Seth",
      assigned_specialty: data.specialty || visit.assigned_specialty || "Emergency",
      doctor_assigned_at: new Date().toISOString(),
      status: "doctor_assigned",
    });
  }

  static acceptDoctor(visitId: number): void {
    this.updateVisit(visitId, {
      doctor_accepted_at: new Date().toISOString(),
      status: "under_treatment",
    });
  }

  static addTreatment(visitId: number, data: { intervention_type: string; description?: string }): ErTreatmentItem {
    const visit = this.getVisit(visitId);
    if (!visit) throw new Error("Visit not found");
    const newItem: ErTreatmentItem = {
      id: visit.treatments.length + 1,
      intervention_type: data.intervention_type,
      description: data.description || null,
      performed_at: new Date().toISOString(),
      administered_by: "ER Attending Staff",
    };
    visit.treatments.push(newItem);
    this.updateVisit(visitId, {
      treatments: visit.treatments,
      status: "under_treatment",
    });
    return newItem;
  }

  static addClinicalNote(visitId: number, data: { note_type?: string; author?: string; content: string }): ErClinicalNoteItem {
    const visit = this.getVisit(visitId);
    if (!visit) throw new Error("Visit not found");
    const newItem: ErClinicalNoteItem = {
      id: visit.clinical_notes.length + 1,
      note_type: data.note_type || "Clinical Note",
      author: data.author || "Attending Physician",
      content: data.content,
      created_at: new Date().toISOString(),
    };
    visit.clinical_notes.push(newItem);
    this.updateVisit(visitId, { clinical_notes: visit.clinical_notes });
    return newItem;
  }

  static createBedRequest(visitId: number, data: { requested_level_of_care?: string; requested_specialty?: string }): ErBedRequestItem {
    const visit = this.getVisit(visitId);
    if (!visit) throw new Error("Visit not found");
    const newItem: ErBedRequestItem = {
      id: visit.bed_requests.length + 1,
      status: "pending",
      requested_level_of_care: data.requested_level_of_care || "Inpatient General Ward",
      requested_specialty: data.requested_specialty || visit.assigned_specialty || "General Medicine",
      requested_at: new Date().toISOString(),
      allocated_bed_id: null,
      allocated_admission_id: null,
      allocated_at: null,
    };
    visit.bed_requests.push(newItem);
    this.updateVisit(visitId, {
      bed_requests: visit.bed_requests,
      status: "bed_requested",
    });
    return newItem;
  }

  static addConsent(visitId: number, data: any): ErConsentItem {
    const visit = this.getVisit(visitId);
    if (!visit) throw new Error("Visit not found");
    const newItem: ErConsentItem = {
      id: (visit.consents || []).length + 1,
      patient_name: data.patient_name || `${visit.patient_name} ${visit.patient_last_name}`,
      consent_type: data.consent_type || "General Emergency Treatment",
      signed_by: data.signed_by || "Self",
      relation_to_patient: data.relation_to_patient || "Self",
      status: "Signed",
      witness_doctor: data.witness_doctor || visit.assigned_doctor_name || "Dr. Vikram Seth",
      signed_by_phone: data.signed_by_phone || visit.patient_phone || "",
      legal_waiver_acknowledged: true,
      signed_at: new Date().toISOString(),
      notes: data.notes,
    };
    const updated = [...(visit.consents || []), newItem];
    this.updateVisit(visitId, { consents: updated });
    return newItem;
  }

  static recordLama(visitId: number, data: any): void {
    const visit = this.getVisit(visitId);
    if (!visit) throw new Error("Visit not found");
    this.updateVisit(visitId, {
      disposition: {
        outcome: data.is_dama ? "dama" : "lama",
        required_specialty: null,
        clinical_reason: data.reason || "Patient left against medical advice after signing liability waiver.",
        decided_by: data.witness_doctor || "Dr. Vikram Seth",
        decided_at: new Date().toISOString(),
        priority: "High",
      },
      closed_at: new Date().toISOString(),
      status: "closed",
    });
  }

  static recordDisposition(visitId: number, data: any): ErDispositionItem {
    const visit = this.getVisit(visitId);
    if (!visit) throw new Error("Visit not found");
    const disp: ErDispositionItem = {
      outcome: data.outcome || "discharge",
      required_specialty: data.required_specialty || null,
      clinical_reason: data.clinical_reason || "Patient stabilized and cleared for discharge.",
      decided_by: data.decided_by || visit.assigned_doctor_name || "Attending Physician",
      decided_at: new Date().toISOString(),
      priority: data.priority || "Routine",
    };
    this.updateVisit(visitId, {
      disposition: disp,
      status: data.outcome === "discharge" || data.outcome === "death" ? "closed" : "awaiting_disposition",
      closed_at: data.outcome === "discharge" || data.outcome === "death" ? new Date().toISOString() : null,
    });
    return disp;
  }

  static closeVisit(visitId: number, consultationFee?: number): { invoice_id: number; total: number } {
    const visit = this.getVisit(visitId);
    if (!visit) throw new Error("Visit not found");
    const baseFee = consultationFee || 850;
    const treatFee = (visit.treatments || []).length * 450;
    const total = baseFee + treatFee;
    this.updateVisit(visitId, {
      status: "closed",
      closed_at: new Date().toISOString(),
    });
    return { invoice_id: 1000 + visitId, total };
  }

  // Clinical Rule-Based Smart AI Triage Engine
  static evaluateClinicalTriage(
    complaints: string,
    vitals: Partial<ErVitalsItem>
  ): {
    categoryCode: string;
    urgency: string;
    reasoning: string;
    suggestedDepartment: string;
    suggestedDoctor: string;
    triageBedLabel: string;
    suggestedTreatments: { intervention_type: string; description: string }[];
  } {
    const c = (complaints || "").toLowerCase();
    const hr = vitals.heart_rate || 0;
    const sys = vitals.bp_systolic || 0;
    const dia = vitals.bp_diastolic || 0;
    const spo2 = vitals.spo2 || 100;
    const rr = vitals.respiratory_rate || 16;
    const temp = vitals.temperature || 98.6;
    const gcs = vitals.gcs || 15;
    const grbs = vitals.blood_glucose || 100;
    const pain = vitals.pain_score || 0;
    const cons = (vitals.consciousness_level || "").toLowerCase();

    // Critical Priority (B1 - Red)
    if (
      spo2 < 85 ||
      sys < 80 ||
      hr > 140 ||
      hr < 40 ||
      gcs < 9 ||
      cons.includes("unresponsive") ||
      cons.includes("comatose") ||
      c.includes("cardiac arrest") ||
      c.includes("unconscious") ||
      c.includes("stemi") ||
      c.includes("crushing chest pain") ||
      c.includes("severe hemorrhage") ||
      c.includes("active bleeding") ||
      c.includes("anaphylaxis")
    ) {
      return {
        categoryCode: "B1",
        urgency: "Immediate / Resuscitation",
        reasoning: "Critical presentation detected (Severe hemodynamic instability / hypoxia / acute coronary syndrome / altered consciousness). Immediate resuscitation protocol activated.",
        suggestedDepartment: c.includes("trauma") ? "Trauma Surgery" : c.includes("chest") || c.includes("heart") ? "Cardiology" : "Emergency Medicine",
        suggestedDoctor: "Dr. Vikram Seth (Cardiology / Critical Care)",
        triageBedLabel: "ER Bed 01 (Red Zone - Resuscitation)",
        suggestedTreatments: [
          { intervention_type: "Immediate IV Resuscitation & High Flow O2", description: "Wide bore IV lines, O2 at 6-8 L/min, continuous ECG and SpO2 monitoring" },
          { intervention_type: "Emergency Cardiac / Airway Protocol", description: "Stat ECG, cardiac loading doses / airway standby" },
        ],
      };
    }

    // High Emergent Priority (B2 - Orange)
    if (
      spo2 < 92 ||
      sys > 190 ||
      dia > 115 ||
      hr > 115 ||
      rr > 26 ||
      pain >= 8 ||
      grbs > 350 ||
      grbs < 55 ||
      c.includes("chest pain") ||
      c.includes("stroke") ||
      c.includes("weakness") ||
      c.includes("rta") ||
      c.includes("accident") ||
      c.includes("seizure") ||
      c.includes("poisoning") ||
      c.includes("burn") ||
      c.includes("fracture") ||
      c.includes("dyspnea")
    ) {
      return {
        categoryCode: "B2",
        urgency: "High / Emergent",
        reasoning: "High emergent acuity (Significant vital abnormality, severe pain, or acute neurological/trauma presentation). Rapid physician assessment within 10 minutes required.",
        suggestedDepartment: c.includes("rta") || c.includes("trauma") || c.includes("fracture") ? "Orthopedics / Trauma" : c.includes("stroke") ? "Neurology" : c.includes("chest") ? "Cardiology" : "Emergency Medicine",
        suggestedDoctor: "Dr. Anita Roy (Emergency & Critical Care)",
        triageBedLabel: "ER Bed 03 (Yellow Zone - High Care)",
        suggestedTreatments: [
          { intervention_type: "Vital Stabilization & IV Access", description: "IV Line secured, 0.9% Normal Saline slow infusion, continuous multi-para monitoring" },
          { intervention_type: "Targeted Analgesia / Nebulization", description: "Immediate symptomatic relief per protocol" },
        ],
      };
    }

    // Moderate Urgent (B3 - Yellow)
    if (
      temp > 102 ||
      pain >= 5 ||
      hr > 100 ||
      sys > 150 ||
      c.includes("fever") ||
      c.includes("vomiting") ||
      c.includes("abdominal pain") ||
      c.includes("infection") ||
      c.includes("laceration") ||
      c.includes("asthma")
    ) {
      return {
        categoryCode: "B3",
        urgency: "Moderate / Urgent",
        reasoning: "Moderate acuity condition requiring structured evaluation and symptomatic emergency stabilization within 30 minutes.",
        suggestedDepartment: c.includes("abdominal") || c.includes("vomiting") ? "General Surgery / Gastroenterology" : "General Medicine",
        suggestedDoctor: "Dr. Rajesh Sharma (General Medicine)",
        triageBedLabel: "ER Bed 06 (Yellow Zone - Observation)",
        suggestedTreatments: [
          { intervention_type: "Antipyretic / IV Antiemetic", description: "IV Paracetamol 1g / Ondansetron 4mg for acute symptom control" },
        ],
      };
    }

    // Standard / Low (B4 - Green)
    return {
      categoryCode: "B4",
      urgency: "Low / Less Urgent",
      reasoning: "Hemodynamically stable presentation. Routine emergency care and outpatient/day-care management indicated.",
      suggestedDepartment: "General Medicine",
      suggestedDoctor: "Dr. Rajesh Sharma (General Medicine)",
      triageBedLabel: "ER Bed 08 (Green Zone - Ambulatory)",
      suggestedTreatments: [
        { intervention_type: "Clinical Evaluation & Basic Vitals Review", description: "Standard clinical evaluation and vitals monitoring" },
      ],
    };
  }
}
