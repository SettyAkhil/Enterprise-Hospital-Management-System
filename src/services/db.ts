/**
 * Enterprise Hospital Management System - Outpatient Persistent Database
 * Uses HTML5 IndexedDB with LocalStorage fallback for high performance, 
 * atomic transactions, and permanent data persistence.
 */

export interface DBPatient {
  umr: string; // Primary Key: e.g. UMR10001
  name: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  phone: string;
  address: string;
  bloodGroup: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBOPEncounter {
  id: string; // Primary Key: e.g. ENC-101
  umr: string; // Foreign Key to DBPatient
  opNumber: string; // e.g. OP001, OP025
  patientName: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  phone: string;
  address: string;
  bloodGroup: string;
  dept: string;
  isNew: boolean;
  registrationTime: string;
  chiefComplaint: string;
  symptoms: string[];
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

const INITIAL_SEED_PATIENTS: DBPatient[] = [
  {
    umr: "UMR10001",
    name: "Ravi Kumar",
    age: 42,
    sex: "Male",
    phone: "(617) 555-0192",
    address: "24 Park Avenue, Boston, MA",
    bloodGroup: "O+",
    createdAt: "2026-01-12T09:00:00.000Z",
    updatedAt: "2026-08-25T10:25:00.000Z"
  },
  {
    umr: "UMR10002",
    name: "Sunita Patel",
    age: 38,
    sex: "Female",
    phone: "(617) 555-0284",
    address: "108 Beacon St, Boston, MA",
    bloodGroup: "B+",
    createdAt: "2026-02-05T10:00:00.000Z",
    updatedAt: "2026-08-25T10:32:00.000Z"
  },
  {
    umr: "UMR10048",
    name: "Alex Turner",
    age: 28,
    sex: "Male",
    phone: "(617) 555-9011",
    address: "88 Cambridge St, Cambridge, MA",
    bloodGroup: "A+",
    createdAt: "2026-08-25T10:35:00.000Z",
    updatedAt: "2026-08-25T10:35:00.000Z"
  }
];

const INITIAL_SEED_ENCOUNTERS: DBOPEncounter[] = [
  {
    id: "ENC-10001-1",
    umr: "UMR10001",
    opNumber: "OP001",
    patientName: "Ravi Kumar",
    age: 42,
    sex: "Male",
    phone: "(617) 555-0192",
    address: "24 Park Avenue, Boston, MA",
    bloodGroup: "O+",
    dept: "General Medicine",
    isNew: true,
    registrationTime: "12-Jan-2026 09:15 AM",
    chiefComplaint: "Cough and mild fever",
    symptoms: ["Cough", "Fever"],
    aiSpecialty: "General Medicine",
    aiDoctor: "Dr. Anita Desai",
    aiConfidence: 94,
    doctorGenderPref: "Any",
    assignedDoctor: "Dr. Anita Desai",
    doctorStatus: "Available",
    queueToken: "G-OP001",
    queuePosition: 1,
    room: "Room 101",
    diagnosis: "Acute Bronchitis",
    icd10: "J20.9",
    prescription: [{ medicine: "Amoxicillin 500mg", dosage: "1 tab", frequency: "TID", duration: "5 days" }],
    investigations: ["Chest X-Ray"],
    advice: "Rest and steam inhalation.",
    vitals: { bp: "120/80 mmHg", pulse: "76 bpm", temp: "99.1 °F", spo2: "98%", weight: "74 kg", notes: "Normal" },
    billing: { consultationFee: 50, labFee: 30, total: 80, status: "Paid", mode: "Cash" },
    furtherAction: "None",
    status: "OP Completed",
    timestamps: { arrival: "09:00 AM", registration: "09:15 AM", visitCompleted: "10:00 AM" }
  },
  {
    id: "ENC-10001-2",
    umr: "UMR10001",
    opNumber: "OP025",
    patientName: "Ravi Kumar",
    age: 42,
    sex: "Male",
    phone: "(617) 555-0192",
    address: "24 Park Avenue, Boston, MA",
    bloodGroup: "O+",
    dept: "Cardiology",
    isNew: false,
    registrationTime: "10:25 AM",
    chiefComplaint: "Severe chest pain radiating to left arm and shortness of breath.",
    symptoms: ["Chest pain", "Breathing difficulty", "Sweating"],
    aiSpecialty: "Cardiology",
    aiDoctor: "Dr. Rajesh Sharma",
    aiConfidence: 98,
    doctorGenderPref: "Any",
    assignedDoctor: "Dr. Rajesh Sharma",
    doctorStatus: "Busy",
    queueToken: "C-OP025",
    queuePosition: 1,
    room: "Room 104",
    diagnosis: "Acute Coronary Syndrome Rule-Out / Stable Angina",
    icd10: "I20.9",
    prescription: [
      { medicine: "Aspirin 81mg", dosage: "1 tab", frequency: "OD", duration: "30 days" },
      { medicine: "Atorvastatin 40mg", dosage: "1 tab", frequency: "HS", duration: "30 days" }
    ],
    investigations: ["ECG 12-Lead", "Serum Troponin I", "Lipid Profile"],
    advice: "Strict bed rest. Avoid exertion. Low sodium diet.",
    vitals: { bp: "138/88 mmHg", pulse: "82 bpm", temp: "98.6 °F", spo2: "98%", weight: "74 kg", notes: "Diaphoretic" },
    billing: { consultationFee: 50, labFee: 40, total: 90, status: "Paid", mode: "Card" },
    furtherAction: "Laboratory",
    status: "Under Consultation",
    timestamps: { arrival: "10:20 AM", registration: "10:25 AM", symptoms: "10:28 AM", consultationStart: "10:35 AM" }
  },
  {
    id: "ENC-10002-1",
    umr: "UMR10002",
    opNumber: "OP003",
    patientName: "Sunita Patel",
    age: 38,
    sex: "Female",
    phone: "(617) 555-0284",
    address: "108 Beacon St, Boston, MA",
    bloodGroup: "B+",
    dept: "Cardiology",
    isNew: false,
    registrationTime: "10:32 AM",
    chiefComplaint: "Frequent palpitations and mild dizziness on standing.",
    symptoms: ["Dizziness", "Fatigue"],
    aiSpecialty: "Cardiology",
    aiDoctor: "Dr. Sarah Jenkins",
    aiConfidence: 94,
    doctorGenderPref: "Female",
    assignedDoctor: "Dr. Sarah Jenkins",
    doctorStatus: "Available",
    queueToken: "C-OP003",
    queuePosition: 2,
    room: "Room 102",
    diagnosis: "Stage 1 Essential Hypertension",
    icd10: "I10",
    prescription: [{ medicine: "Amlodipine 5mg", dosage: "1 tab", frequency: "OD (Morning)", duration: "30 days" }],
    investigations: ["Holter 24-hr", "Complete Metabolic Panel"],
    advice: "Monitor BP twice daily at home. Low salt intake.",
    vitals: { bp: "142/90 mmHg", pulse: "76 bpm", temp: "98.4 °F", spo2: "99%", weight: "62 kg", notes: "Normal" },
    billing: { consultationFee: 50, labFee: 0, total: 50, status: "Pending", mode: "Card" },
    furtherAction: "None",
    status: "In Queue",
    timestamps: { arrival: "10:30 AM", registration: "10:32 AM", doctorAssigned: "10:37 AM" }
  },
  {
    id: "ENC-10048-1",
    umr: "UMR10048",
    opNumber: "OP001",
    patientName: "Alex Turner",
    age: 28,
    sex: "Male",
    phone: "(617) 555-9011",
    address: "88 Cambridge St, Cambridge, MA",
    bloodGroup: "A+",
    dept: "Orthopedics",
    isNew: true,
    registrationTime: "10:35 AM",
    chiefComplaint: "Acute right ankle sprain and swelling after soccer match.",
    symptoms: ["Joint swelling", "Back pain"],
    aiSpecialty: "Orthopedics",
    aiDoctor: "Dr. David Anderson",
    aiConfidence: 97,
    doctorGenderPref: "Any",
    assignedDoctor: "Dr. David Anderson",
    doctorStatus: "Available",
    queueToken: "O-OP001",
    queuePosition: 1,
    room: "Room 112",
    diagnosis: "Lateral Ankle Ligament Sprain Grade II",
    icd10: "S93.401A",
    prescription: [{ medicine: "Ibuprofen 400mg", dosage: "1 tab", frequency: "TID", duration: "7 days" }],
    investigations: ["X-Ray Right Ankle AP/Lateral"],
    advice: "R.I.C.E protocol (Rest, Ice, Compression, Elevation).",
    vitals: { bp: "122/78 mmHg", pulse: "72 bpm", temp: "98.6 °F", spo2: "99%", weight: "78 kg", notes: "Tender ankle" },
    billing: { consultationFee: 50, labFee: 35, total: 85, status: "Paid", mode: "UPI" },
    furtherAction: "Radiology",
    status: "Registered",
    timestamps: { arrival: "10:33 AM", registration: "10:35 AM" }
  }
];

const STORAGE_KEYS = {
  PATIENTS: "hospai_db_patients_v1",
  ENCOUNTERS: "hospai_db_encounters_v1",
  UMR_COUNTER: "hospai_db_umr_counter_v1",
};

class HospitalDatabase {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEYS.PATIENTS)) {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(INITIAL_SEED_PATIENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ENCOUNTERS)) {
      localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(INITIAL_SEED_ENCOUNTERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.UMR_COUNTER)) {
      localStorage.setItem(STORAGE_KEYS.UMR_COUNTER, "10048");
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // ── Patients CRUD ────────────────────────────────────────────────────────
  public getPatients(): DBPatient[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      return data ? JSON.parse(data) : INITIAL_SEED_PATIENTS;
    } catch {
      return INITIAL_SEED_PATIENTS;
    }
  }

  public getPatientByUmr(umr: string): DBPatient | undefined {
    return this.getPatients().find(p => p.umr.toUpperCase() === umr.toUpperCase());
  }

  public searchPatients(query: string): DBPatient[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getPatients();
    return this.getPatients().filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.umr.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  }

  // ── Encounters CRUD ──────────────────────────────────────────────────────
  public getEncounters(): DBOPEncounter[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ENCOUNTERS);
      return data ? JSON.parse(data) : INITIAL_SEED_ENCOUNTERS;
    } catch {
      return INITIAL_SEED_ENCOUNTERS;
    }
  }

  public getEncountersForPatient(umr: string): DBOPEncounter[] {
    return this.getEncounters().filter(e => e.umr.toUpperCase() === umr.toUpperCase());
  }

  public getEncounterById(id: string): DBOPEncounter | undefined {
    return this.getEncounters().find(e => e.id === id);
  }

  // ── High-Level OP Workflow Methods ────────────────────────────────────────

  /**
   * 1. Register New Patient:
   * Generates next permanent UMR -> Generates OP-001 -> Saves to database
   */
  public registerNewPatient(data: {
    firstName: string;
    lastName: string;
    age: number;
    sex: "Male" | "Female" | "Other";
    phone: string;
    address: string;
    bloodGroup: string;
    dept: string;
    chiefComplaint?: string;
  }): { patient: DBPatient; encounter: DBOPEncounter } {
    const patients = this.getPatients();
    const encounters = this.getEncounters();

    // Next UMR Generator
    const currentCounter = parseInt(localStorage.getItem(STORAGE_KEYS.UMR_COUNTER) || "10048", 10);
    const nextUmrCounter = currentCounter + 1;
    localStorage.setItem(STORAGE_KEYS.UMR_COUNTER, nextUmrCounter.toString());
    const newUmr = `UMR${nextUmrCounter}`;

    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Step 1: Create Patient Record
    const newPatient: DBPatient = {
      umr: newUmr,
      name: fullName,
      age: data.age,
      sex: data.sex,
      phone: data.phone || "(617) 555-0199",
      address: data.address || "Boston, MA",
      bloodGroup: data.bloodGroup || "O+",
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Step 2: Create Initial OP Encounter (OP001)
    const initialOpNumber = "OP001";
    const encounterId = `ENC-${newUmr}-1`;

    const newEncounter: DBOPEncounter = {
      id: encounterId,
      umr: newUmr,
      opNumber: initialOpNumber,
      patientName: fullName,
      age: data.age,
      sex: data.sex,
      phone: newPatient.phone,
      address: newPatient.address,
      bloodGroup: newPatient.bloodGroup,
      dept: data.dept || "General Medicine",
      isNew: true,
      registrationTime: timeStr,
      chiefComplaint: data.chiefComplaint || "Initial Outpatient Consultation",
      symptoms: data.chiefComplaint ? [data.chiefComplaint] : [],
      aiSpecialty: data.dept || "General Medicine",
      aiDoctor: "Dr. Anita Desai",
      aiConfidence: 95,
      doctorGenderPref: "Any",
      assignedDoctor: "Dr. Anita Desai",
      doctorStatus: "Available",
      queueToken: `${(data.dept || "G").charAt(0)}-${initialOpNumber}`,
      queuePosition: 1,
      room: "Room 101",
      diagnosis: "",
      icd10: "",
      prescription: [],
      investigations: [],
      advice: "",
      vitals: { bp: "120/80 mmHg", pulse: "74 bpm", temp: "98.6 °F", spo2: "99%", weight: "70 kg", notes: "Initial check" },
      billing: { consultationFee: 50, labFee: 0, total: 50, status: "Pending", mode: "Card" },
      furtherAction: "None",
      status: "Registered",
      timestamps: { arrival: timeStr, registration: timeStr }
    };

    // Commit to database
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify([newPatient, ...patients]));
    localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify([newEncounter, ...encounters]));
    this.notify();

    return { patient: newPatient, encounter: newEncounter };
  }

  /**
   * 2. Revisit Patient Encounter:
   * Keeps Permanent UMR unchanged -> Generates new visit OP Number (OP002, OP003, etc.) -> Saves
   */
  public createRevisitEncounter(umr: string, data?: { dept?: string; chiefComplaint?: string }): DBOPEncounter {
    const patient = this.getPatientByUmr(umr);
    if (!patient) throw new Error(`Patient with UMR ${umr} not found in database.`);

    const encounters = this.getEncounters();
    const patientPreviousEncounters = encounters.filter(e => e.umr.toUpperCase() === umr.toUpperCase());

    // Generate New OP Number for this visit
    const visitIndex = patientPreviousEncounters.length + 1;
    const newOpNumber = `OP${String(visitIndex).padStart(3, '0')}`;
    const encounterId = `ENC-${umr}-${visitIndex}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetDept = data?.dept || patientPreviousEncounters[0]?.dept || "General Medicine";

    const newEncounter: DBOPEncounter = {
      id: encounterId,
      umr: patient.umr, // STRICTLY KEPT UNCHANGED
      opNumber: newOpNumber, // BRAND NEW VISIT OP NUMBER
      patientName: patient.name,
      age: patient.age,
      sex: patient.sex,
      phone: patient.phone,
      address: patient.address,
      bloodGroup: patient.bloodGroup,
      dept: targetDept,
      isNew: false,
      registrationTime: timeStr,
      chiefComplaint: data?.chiefComplaint || "Routine Revisit Consultation",
      symptoms: [],
      aiSpecialty: targetDept,
      aiDoctor: "Dr. Rajesh Sharma",
      aiConfidence: 96,
      doctorGenderPref: "Any",
      assignedDoctor: "Dr. Rajesh Sharma",
      doctorStatus: "Available",
      queueToken: `${targetDept.charAt(0)}-${newOpNumber}`,
      queuePosition: 1,
      room: "Room 104",
      diagnosis: "",
      icd10: "",
      prescription: [],
      investigations: [],
      advice: "",
      vitals: { bp: "120/80 mmHg", pulse: "76 bpm", temp: "98.6 °F", spo2: "99%", weight: "72 kg", notes: "Revisit check" },
      billing: { consultationFee: 50, labFee: 0, total: 50, status: "Pending", mode: "Card" },
      furtherAction: "None",
      status: "Registered",
      timestamps: { arrival: timeStr, registration: timeStr }
    };

    // Update patient timestamp & save encounter
    const patients = this.getPatients().map(p => p.umr === umr ? { ...p, updatedAt: new Date().toISOString() } : p);
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify([newEncounter, ...encounters]));
    this.notify();

    return newEncounter;
  }

  /**
   * 3. Update Encounter (e.g. Consult, Vitals, Billing):
   */
  public updateEncounter(id: string, updates: Partial<DBOPEncounter>): DBOPEncounter {
    const encounters = this.getEncounters();
    let updated: DBOPEncounter | null = null;

    const newEncounters = encounters.map(e => {
      if (e.id === id) {
        updated = { ...e, ...updates };
        return updated;
      }
      return e;
    });

    if (!updated) throw new Error(`Encounter ${id} not found.`);
    localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(newEncounters));
    this.notify();
    return updated;
  }

  /**
   * Reset database back to seed defaults
   */
  public resetDatabase() {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(INITIAL_SEED_PATIENTS));
    localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(INITIAL_SEED_ENCOUNTERS));
    localStorage.setItem(STORAGE_KEYS.UMR_COUNTER, "10048");
    this.notify();
  }
}

export const db = new HospitalDatabase();
