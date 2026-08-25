// Centralized Outpatient Department State Store for Keppler Healthcare Specification
export interface OPEncounter {
  id: string;
  umr: string;
  opNumber: string;
  name: string;
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
  previousVisits?: { opNumber: string; date: string; doctor: string; diagnosis: string }[];
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

export const INITIAL_OP_ENCOUNTERS: OPEncounter[] = [
  {
    id: "ENC-101",
    umr: "UMR10001",
    opNumber: "OP025",
    name: "Ravi Kumar",
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
    diagnosis: "Acute Coronary Syndrome Rule-Out",
    icd10: "I20.9",
    prescription: [
      { medicine: "Aspirin 81mg", dosage: "1 tab", frequency: "OD (Once daily)", duration: "30 days" },
      { medicine: "Atorvastatin 40mg", dosage: "1 tab", frequency: "HS (Bedtime)", duration: "30 days" }
    ],
    investigations: ["ECG 12-Lead", "Serum Troponin I", "Lipid Profile"],
    advice: "Strict bed rest. Avoid exertion. Low sodium diet.",
    vitals: { bp: "138/88 mmHg", pulse: "82 bpm", temp: "98.6 °F", spo2: "98%", weight: "74 kg", notes: "Diaphoretic, alert." },
    billing: { consultationFee: 50, labFee: 40, total: 90, status: "Paid", mode: "Card" },
    furtherAction: "Laboratory",
    status: "Under Consultation",
    previousVisits: [
      { opNumber: "OP001", date: "12-Jan-2026", doctor: "Dr. Anita Desai", diagnosis: "Acute Bronchitis" },
      { opNumber: "OP014", date: "28-May-2026", doctor: "Dr. Michael Chen", diagnosis: "Seasonal Allergic Rhinitis" }
    ],
    timestamps: {
      arrival: "10:20 AM",
      registration: "10:25 AM",
      symptoms: "10:28 AM",
      doctorAssigned: "10:30 AM",
      consultationStart: "10:35 AM"
    }
  },
  {
    id: "ENC-102",
    umr: "UMR10002",
    opNumber: "OP003",
    name: "Sunita Patel",
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
    prescription: [
      { medicine: "Amlodipine 5mg", dosage: "1 tab", frequency: "OD (Morning)", duration: "30 days" }
    ],
    investigations: ["Holter 24-hr", "Complete Metabolic Panel"],
    advice: "Monitor BP twice daily at home. Low salt intake.",
    vitals: { bp: "142/90 mmHg", pulse: "76 bpm", temp: "98.4 °F", spo2: "99%", weight: "62 kg", notes: "Normal neurological exam." },
    billing: { consultationFee: 50, labFee: 0, total: 50, status: "Pending", mode: "Card" },
    furtherAction: "None",
    status: "In Queue",
    previousVisits: [
      { opNumber: "OP003", date: "05-Feb-2026", doctor: "Dr. Sarah Jenkins", diagnosis: "Hypertension Initial Check" }
    ],
    timestamps: {
      arrival: "10:30 AM",
      registration: "10:32 AM",
      symptoms: "10:35 AM",
      doctorAssigned: "10:37 AM"
    }
  },
  {
    id: "ENC-103",
    umr: "UMR10048",
    opNumber: "OP001",
    name: "Alex Turner",
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
    prescription: [
      { medicine: "Ibuprofen 400mg", dosage: "1 tab", frequency: "TID with food", duration: "7 days" },
      { medicine: "Diclofenac Gel", dosage: "Apply topically", frequency: "TID", duration: "10 days" }
    ],
    investigations: ["X-Ray Right Ankle AP/Lateral"],
    advice: "R.I.C.E protocol (Rest, Ice, Compression, Elevation). Ankle brace support for 2 weeks.",
    vitals: { bp: "122/78 mmHg", pulse: "72 bpm", temp: "98.6 °F", spo2: "99%", weight: "78 kg", notes: "Tender anterior talofibular ligament." },
    billing: { consultationFee: 50, labFee: 35, total: 85, status: "Paid", mode: "UPI" },
    furtherAction: "Radiology",
    status: "Registered",
    previousVisits: [],
    timestamps: {
      arrival: "10:33 AM",
      registration: "10:35 AM"
    }
  }
];
