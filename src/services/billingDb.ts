/**
 * Enterprise Hospital Management System - UMR-Centered Universal / Central Billing Database
 * 
 * CORE PRINCIPLE:
 * The patient's UMR (Unique Medical Record) is the permanent central financial anchor for all
 * clinical encounters, hospital stays, departments, services, charges, invoices, payments,
 * insurance claims, and outstanding balances.
 * 
 * Hierarchy:
 * Patient → UMR → Encounter / Hospital Stay → Department → Service / Order → Charge → UMR Ledger → Central Billing → Invoice → Payment / Claim → Receipt → Settled
 * 
 * Clinical departments (OP, ER, Inpatient, ICU, Surgery, Laboratory, Radiology) digitize orders
 * & care delivery without paper OP books, ER slips, or physical K-Sheets.
 * Finalized charges flow directly to Central Billing for verification, invoicing, and settlement.
 * 
 * All financial amounts formatted in Indian Rupees (₹ - INR).
 */

import { BillingRbacManager } from "./billingRbac";
import { db, DBPatient, DBOPEncounter } from "./db";
import { ErDatabase, ErVisitRecord } from "./erDb";
import { BedDatabase, BedRecord } from "./bedDb";

export type DepartmentType =
  | "Emergency"
  | "Inpatient"
  | "ICU"
  | "Outpatient"
  | "Radiology"
  | "Laboratory"
  | "Surgery";

export interface InvoiceItem {
  id: string;
  description: string;
  category:
  | "Consultation"
  | "Room / Bed Charges"
  | "Nursing"
  | "Procedure / Surgery"
  | "Laboratory"
  | "Radiology / Imaging"
  | "Consumables";
  cptCode: string;
  quantity: number;
  unitPrice: number;
  total: number;
  insuranceCovered: number;
  patientPayable: number;
  orderedBy?: string;
  orderedAt?: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  receiptNo: string;
  amount: number;
  paymentDate: string;
  paymentMethod: "Cash" | "Credit Card" | "Debit Card" | "Insurance Copay" | "UPI / Digital" | "Bank Transfer" | "Cheque";
  transactionRef?: string;
  collectedBy: string;
  notes?: string;
}

export type ClaimStatus =
  | "Draft"
  | "Ready"
  | "Submitted"
  | "Accepted"
  | "Rejected"
  | "Denied"
  | "Appeal"
  | "Paid"
  | "Voided";

export interface ClaimRecord {
  id: string; // e.g. "CLM-8921"
  invoiceNo: string; // e.g. "INV-2026-0811"
  patientId: string; // UMR e.g. "UMR100501" or "UMR10001"
  patientName: string;
  mrn: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  department: DepartmentType;
  carePathway?: string; // e.g. "ER → ICU → 3N Ward Consolidated Stay" or "OP Consultation & Diagnostics"
  dateOfService: string;
  encounterId?: string;
  hospitalStayId?: string;
  admissionId?: number;
  bedId?: number;
  insuranceProvider: string; // "Star Health", "HDFC ERGO", "ICICI Lombard", "Care Health", "Bajaj Allianz", "PM-JAY (Ayushman Bharat)", "Self-Pay"
  policyNumber: string;
  preAuthCode?: string;
  status: ClaimStatus;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  insurancePortion: number;
  patientPortion: number;
  amountPaid: number;
  balanceDue: number;
  payments: PaymentRecord[];
  denialReason?: string;
  appealNotes?: string;
  diagnosisCodes: string[]; // ICD-10 codes
  attendingDoctor: string;
  finalizedByNurse?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Department Charge Record (Clinical Running Ledger / Digital K-Sheet) ─────
export interface DepartmentChargeRecord {
  id: string; // e.g. "DCHG-2026-101"
  patientId: string; // UMR e.g. "UMR100501"
  mrn: string; // "100501"
  patientName: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  encounterId: string; // e.g. "ENC-OP-100501" or "ER-2026-00001" or "IP-BED-204"
  hospitalStayId?: string; // e.g. "STAY-2026-881" for multi-department continuous stay
  department: DepartmentType;
  carePathway?: string; // e.g. "ER → ICU → 3N Ward Consolidated Stay"
  dateOfService: string;
  insuranceProvider: string;
  policyNumber: string;
  preAuthCode?: string;
  attendingDoctor: string;
  diagnosisCodes: string[];
  items: InvoiceItem[];
  subtotal: number;
  totalAmount: number;
  status: "Accumulating Charges" | "Pending Dept Verification" | "Finalized by Dept" | "Invoiced in Central Billing";
  verifiedByNurse?: string;
  finalizedAt?: string;
  invoiceId?: string;
  createdAt: string;
  notes?: string;
}

// ── UMR Financial Ledger Summary Models ─────────────────────────────────────
export interface EncounterChargeSummary {
  encounterId: string;
  encounterType: "Outpatient" | "Emergency" | "Inpatient Ward" | "ICU" | "Surgery" | "Laboratory" | "Radiology";
  department: DepartmentType;
  date: string;
  doctor: string;
  status: string;
  items: InvoiceItem[];
  totalCharges: number;
  isFinalized: boolean;
  isInvoiced: boolean;
  invoiceId?: string;
  invoiceNo?: string;
}

export interface UmrFinancialLedger {
  umr: string;
  patientName: string;
  mrn: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  insuranceProvider: string;
  policyNumber: string;
  totalHistoricalCharges: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  insurancePending: number;
  encounters: EncounterChargeSummary[];
  invoices: ClaimRecord[];
  payments: PaymentRecord[];
  activeHospitalStayId?: string;
}

export interface FinancialMetrics {
  totalChargesMtd: number;
  insurancePending: number;
  patientBalance: number;
  deniedCount: number;
  deniedAmount: number;
  collectionsRate: number;
  daysInAr: number;
  firstPassRate: number;
  avgClaimValue: number;
  paidCount: number;
  totalClaimsCount: number;
}

export interface PayerMixItem {
  payer: string;
  claimCount: number;
  totalAmount: number;
  pct: number;
  color: string;
}

export interface ArAgingItem {
  bucket: string;
  amount: number;
  pct: number;
  color: string;
  count: number;
}

// ── Diagnostic Order Interfaces with Pre-Payment Clearance ──────────────────
export interface LabOrderRecord {
  id: string;
  patient: string;
  mrn: string;
  test: string;
  priority: "STAT" | "Routine";
  collected: string;
  status: "Pending" | "Collected" | "Processing" | "Completed" | "Critical";
  provider: string;
  price: number;
  paymentStatus: "Paid" | "Payment Pending";
  paidReceiptNo?: string;
  paidAt?: string;
}

export interface RadiologyStudyRecord {
  id: string;
  patient: string;
  mrn: string;
  study: string;
  modality: "XR" | "CT" | "MR" | "US" | "NM";
  priority: "STAT" | "Routine" | "Elective";
  ordered: string;
  provider: string;
  status: "Orders" | "Scheduled" | "In Progress" | "Images Ready" | "Reporting" | "Final";
  room: string;
  price: number;
  paymentStatus: "Paid" | "Payment Pending";
  paidReceiptNo?: string;
  paidAt?: string;
}

const STORAGE_KEY_CLAIMS = "hosp_billing_claims_inr_v11";
const STORAGE_KEY_DEPT_CHARGES = "hosp_billing_dept_charges_v11";
const STORAGE_KEY_LAB_ORDERS = "hosp_lab_orders_v1";
const STORAGE_KEY_RAD_STUDIES = "hosp_rad_studies_v1";
const BILLING_UPDATE_EVENT = "hospital_billing_updated";

export const INITIAL_LAB_ORDERS: LabOrderRecord[] = [
  { id: "LAB-101", patient: "Thomas Reed", mrn: "100301", test: "Troponin I", priority: "STAT", collected: "09:28", status: "Processing", provider: "Dr. Shah", price: 150, paymentStatus: "Paid", paidReceiptNo: "RCPT-2026-5501" },
  { id: "LAB-102", patient: "John Smith", mrn: "100245", test: "BMP (Basic Metabolic Panel)", priority: "Routine", collected: "08:42", status: "Completed", provider: "Dr. Anderson", price: 100, paymentStatus: "Paid", paidReceiptNo: "RCPT-2026-5502" },
  { id: "LAB-103", patient: "Mary Jones", mrn: "100246", test: "CBC w/ Diff", priority: "Routine", collected: "09:10", status: "Collected", provider: "Dr. Lee", price: 80, paymentStatus: "Paid", paidReceiptNo: "RCPT-2026-5503" },
  { id: "LAB-104", patient: "Ann Martinez", mrn: "100088", test: "Lactic Acid", priority: "STAT", collected: "10:02", status: "Processing", provider: "Dr. Chen", price: 120, paymentStatus: "Paid", paidReceiptNo: "RCPT-2026-5504" },
  { id: "LAB-105", patient: "Patricia Okonkwo", mrn: "100149", test: "X-Match T&S", priority: "STAT", collected: "—", status: "Pending", provider: "Dr. Williams", price: 140, paymentStatus: "Payment Pending" },
  { id: "LAB-106", patient: "Elena Vasquez", mrn: "100198", test: "UA w/ Culture", priority: "Routine", collected: "—", status: "Pending", provider: "Dr. Chen", price: 90, paymentStatus: "Payment Pending" },
  { id: "LAB-107", patient: "Marcus Kim", mrn: "100377", test: "TSH (Thyroid)", priority: "Routine", collected: "—", status: "Pending", provider: "Dr. Park", price: 110, paymentStatus: "Payment Pending" },
];

export const INITIAL_RAD_STUDIES: RadiologyStudyRecord[] = [
  { id: "RAD-201", patient: "John Smith", mrn: "100245", study: "Chest X-Ray PA/Lateral", modality: "XR", ordered: "09:50", priority: "Routine", provider: "Dr. Patel", status: "Images Ready", room: "XR-2", price: 120, paymentStatus: "Paid", paidReceiptNo: "RCPT-2026-5502" },
  { id: "RAD-202", patient: "Thomas Reed", mrn: "100301", study: "CT Head w/o Contrast", modality: "CT", ordered: "10:02", priority: "STAT", provider: "Dr. Shah", status: "In Progress", room: "CT-1", price: 350, paymentStatus: "Paid", paidReceiptNo: "RCPT-2026-5501" },
  { id: "RAD-203", patient: "Mary Jones", mrn: "100246", study: "CT Abdomen/Pelvis", modality: "CT", ordered: "08:30", priority: "Routine", provider: "Dr. Lee", status: "Final", room: "CT-2", price: 400, paymentStatus: "Paid", paidReceiptNo: "RCPT-2026-5503" },
  { id: "RAD-204", patient: "Patricia Okonkwo", mrn: "100149", study: "X-Ray R Hip AP/Lat", modality: "XR", ordered: "10:15", priority: "STAT", provider: "Dr. Williams", status: "Orders", room: "XR-1", price: 130, paymentStatus: "Payment Pending" },
  { id: "RAD-205", patient: "Ann Martinez", mrn: "100088", study: "Ultrasound Abdomen", modality: "US", ordered: "09:28", priority: "Routine", provider: "Dr. Chen", status: "Reporting", room: "US-1", price: 200, paymentStatus: "Paid", paidReceiptNo: "RCPT-2026-5504" },
  { id: "RAD-206", patient: "Sandra Brown", mrn: "100331", study: "MRI Brain w/ & w/o", modality: "MR", ordered: "08:15", priority: "Routine", provider: "Dr. Williams", status: "Final", room: "MR-1", price: 600, paymentStatus: "Paid", paidReceiptNo: "RCPT-2026-5505" },
  { id: "RAD-207", patient: "Marcus Kim", mrn: "100377", study: "Echocardiogram", modality: "US", ordered: "11:00", priority: "Routine", provider: "Dr. Park", status: "Orders", room: "Echo-1", price: 250, paymentStatus: "Payment Pending" },
  { id: "RAD-208", patient: "Diane Walsh", mrn: "100142", study: "Bone Density (DEXA)", modality: "XR", ordered: "Yesterday", priority: "Elective", provider: "Dr. Anderson", status: "Orders", room: "—", price: 150, paymentStatus: "Payment Pending" },
];

// ── Department Tariff & Service Catalogs (Streamlined Small Amounts) ──────────
export const DEPARTMENT_TARIFF_CATALOG: Record<
  DepartmentType,
  { category: InvoiceItem["category"]; description: string; cpt: string; price: number }[]
> = {
  Outpatient: [
    { category: "Consultation", description: "Specialist Comprehensive Outpatient Consultation", cpt: "99205", price: 150 },
    { category: "Consultation", description: "General OPD Medical Consultation", cpt: "99203", price: 100 },
    { category: "Consultation", description: "Follow-up Consultation / Review", cpt: "99213", price: 50 },
    { category: "Procedure / Surgery", description: "Minor OPD Dressing & Suture Removal", cpt: "12001", price: 40 },
    { category: "Consumables", description: "OPD Diagnostic & Clinical Supplies Kit", cpt: "A4649", price: 30 },
  ],
  Emergency: [
    { category: "Consultation", description: "Emergency Resuscitation & High-Acuity Triage (Level B1)", cpt: "99285", price: 250 },
    { category: "Consultation", description: "Emergency Acute Evaluation & Stabilization (Level B2)", cpt: "99284", price: 150 },
    { category: "Consultation", description: "Urgent Care Minor Trauma Assessment (Level B3)", cpt: "99283", price: 100 },
    { category: "Procedure / Surgery", description: "Complex Multi-Layer Wound Suture & Hemostasis", cpt: "12002", price: 120 },
    { category: "Procedure / Surgery", description: "Emergency Intubation & Airway Stabilization", cpt: "31500", price: 200 },
    { category: "Nursing", description: "STAT Emergency Nursing & IV Cannulation Protocol", cpt: "99505", price: 50 },
    { category: "Consumables", description: "Emergency Trauma Procedure Pack & Sterile Trays", cpt: "A4649", price: 60 },
  ],
  Inpatient: [
    { category: "Room / Bed Charges", description: "General Medical Ward Daily Bed Rate (per day)", cpt: "99222", price: 100 },
    { category: "Room / Bed Charges", description: "Semi-Private Ward Daily Bed Rate (per day)", cpt: "99223", price: 150 },
    { category: "Room / Bed Charges", description: "Private Deluxe Room Daily Rate (per day)", cpt: "99224", price: 250 },
    { category: "Consultation", description: "Attending Inpatient Physician Daily Rounds (per day)", cpt: "99233", price: 50 },
    { category: "Nursing", description: "24-Hour Continuous Inpatient Nursing & Vitals Care (per day)", cpt: "99505", price: 40 },
    { category: "Procedure / Surgery", description: "Inpatient Bedside Paracentesis / Thoracentesis", cpt: "49082", price: 120 },
    { category: "Consumables", description: "Inpatient Infusion & Sterile Nursing Consumables Pack", cpt: "A4649", price: 50 },
  ],
  ICU: [
    { category: "Room / Bed Charges", description: "ICU Intensive Care Daily Bed Rate (per day)", cpt: "99291", price: 350 },
    { category: "Consultation", description: "Critical Care Specialist Daily Comprehensive Management", cpt: "99292", price: 100 },
    { category: "Nursing", description: "1:1 Continuous Critical Care Specialized Nursing Care", cpt: "99505", price: 80 },
    { category: "Procedure / Surgery", description: "Emergency Endotracheal Intubation & Ventilator Setup", cpt: "31500", price: 200 },
    { category: "Procedure / Surgery", description: "Arterial Line & Central Venous Line Placement", cpt: "36556", price: 180 },
    { category: "Procedure / Surgery", description: "Continuous Mechanical Ventilation Management (24h)", cpt: "94002", price: 120 },
    { category: "Consumables", description: "ICU High-Acuity Hemodynamic & Airway Consumables", cpt: "A4649", price: 100 },
  ],
  Surgery: [
    { category: "Procedure / Surgery", description: "Laparoscopic Cholecystectomy / Abdominal Surgery", cpt: "47562", price: 800 },
    { category: "Procedure / Surgery", description: "Emergency Appendectomy Procedure", cpt: "44970", price: 600 },
    { category: "Room / Bed Charges", description: "Major Operation Theatre (OT) Infrastructure Rate", cpt: "99291", price: 300 },
    { category: "Consultation", description: "Chief Operating Surgeon Professional Fee", cpt: "99205", price: 400 },
    { category: "Consultation", description: "Consultant Anesthesiologist Pre-Op & Intra-Op Care", cpt: "00840", price: 200 },
    { category: "Nursing", description: "PACU Post-Anesthesia Recovery Care & Monitoring", cpt: "99505", price: 80 },
    { category: "Consumables", description: "Sterile Surgical Laparoscopic Disposable Pack & Drapes", cpt: "A4649", price: 150 },
  ],
  Laboratory: [
    { category: "Laboratory", description: "Complete Blood Count w/ Differential (CBC)", cpt: "85025", price: 50 },
    { category: "Laboratory", description: "Comprehensive Metabolic Panel (CMP / LFT + KFT)", cpt: "80053", price: 120 },
    { category: "Laboratory", description: "Lipid Profile Panel (Cholesterol, HDL, LDL, Triglycerides)", cpt: "80061", price: 80 },
    { category: "Laboratory", description: "Liver Function Tests (LFT Complete)", cpt: "80076", price: 70 },
    { category: "Laboratory", description: "Renal Function Tests / Kidney Panel (KFT)", cpt: "80069", price: 60 },
    { category: "Laboratory", description: "STAT High-Sensitivity Cardiac Troponin-I POCT", cpt: "84484", price: 100 },
    { category: "Laboratory", description: "Arterial Blood Gas Analysis (ABG with Electrolytes)", cpt: "82803", price: 80 },
    { category: "Laboratory", description: "Glycated Hemoglobin (HbA1c Assay)", cpt: "83036", price: 60 },
    { category: "Laboratory", description: "Blood & Wound Culture with Antibiotic Sensitivity", cpt: "87070", price: 90 },
    { category: "Laboratory", description: "Routine Urinalysis & Microscopy", cpt: "81001", price: 30 },
  ],
  Radiology: [
    { category: "Radiology / Imaging", description: "Digital Chest X-Ray (PA & Lateral Views)", cpt: "71046", price: 60 },
    { category: "Radiology / Imaging", description: "Contrast-Enhanced CT Scan - Chest / Abdomen / Pelvis", cpt: "74177", price: 250 },
    { category: "Radiology / Imaging", description: "Brain MRI with & without Contrast Study", cpt: "70553", price: 350 },
    { category: "Radiology / Imaging", description: "Whole Abdomen & Pelvis Ultrasound (USG)", cpt: "76700", price: 100 },
    { category: "Radiology / Imaging", description: "2D Echocardiography with Color Doppler", cpt: "93306", price: 200 },
    { category: "Radiology / Imaging", description: "Digital Lumbo-Sacral Spine X-Ray (AP & Lateral)", cpt: "72100", price: 70 },
    { category: "Radiology / Imaging", description: "Bedside Point-of-Care Ultrasound (POCUS)", cpt: "93308", price: 90 },
  ],
};

const STANDARD_SERVICES = [
  ...DEPARTMENT_TARIFF_CATALOG.Outpatient,
  ...DEPARTMENT_TARIFF_CATALOG.Emergency,
  ...DEPARTMENT_TARIFF_CATALOG.Inpatient,
  ...DEPARTMENT_TARIFF_CATALOG.ICU,
  ...DEPARTMENT_TARIFF_CATALOG.Surgery,
  ...DEPARTMENT_TARIFF_CATALOG.Laboratory,
  ...DEPARTMENT_TARIFF_CATALOG.Radiology,
];

// ── INITIAL SEED DEPARTMENT CHARGES (Streamlined Small Amounts) ─────────────
const INITIAL_DEPARTMENT_CHARGES: DepartmentChargeRecord[] = [
  // 1. OP Consultation & Diagnostic Encounter (Rahul Sharma - OP Finalized)
  {
    id: "DCHG-2026-101",
    patientId: "UMR100501",
    mrn: "100501",
    patientName: "Rahul Sharma",
    age: 38,
    gender: "Male",
    phone: "+91 98234 56789",
    encounterId: "ENC-OP-100501",
    department: "Outpatient",
    carePathway: "OP Consultation + Lab (CBC) + Radiology (Chest X-Ray)",
    dateOfService: "2026-08-31",
    insuranceProvider: "Star Health",
    policyNumber: "SH-7892341",
    attendingDoctor: "Dr. Rajesh Sharma",
    diagnosisCodes: ["R05", "J06.9"],
    items: [
      { id: "IT-1", description: "Specialist Comprehensive Outpatient Consultation", category: "Consultation", cptCode: "99205", quantity: 1, unitPrice: 150, total: 150, insuranceCovered: 120, patientPayable: 30 },
      { id: "IT-2", description: "Complete Blood Count w/ Differential (CBC)", category: "Laboratory", cptCode: "85025", quantity: 1, unitPrice: 50, total: 50, insuranceCovered: 40, patientPayable: 10 },
      { id: "IT-3", description: "Digital Chest X-Ray (PA & Lateral Views)", category: "Radiology / Imaging", cptCode: "71046", quantity: 1, unitPrice: 60, total: 60, insuranceCovered: 48, patientPayable: 12 },
    ],
    subtotal: 260,
    totalAmount: 260,
    status: "Finalized by Dept",
    verifiedByNurse: "Nurse Priya Nair (OPD Lead)",
    finalizedAt: "2026-08-31T11:45:00Z",
    createdAt: "2026-08-31T10:00:00Z",
    notes: "Patient completed OPD consultation. Doctor ordered CBC and Chest X-Ray. Reports uploaded and verified. All department charges finalized.",
  },

  // 2. ER → ICU → 3N Ward Continuous Hospital Stay (Vikram Singhania - Single Consolidated Stay)
  {
    id: "DCHG-2026-102",
    patientId: "UMR100490",
    mrn: "100490",
    patientName: "Vikram Singhania",
    age: 56,
    gender: "Male",
    phone: "+91 98451 99887",
    encounterId: "STAY-2026-881",
    hospitalStayId: "STAY-2026-881",
    department: "Inpatient",
    carePathway: "Continuous Stay: ER Arrival → ICU Critical Care (3 Days) → 3N Medical Ward (4 Days)",
    dateOfService: "2026-08-25",
    insuranceProvider: "Star Health",
    policyNumber: "SH-9921045",
    preAuthCode: "AUTH-SH-88190",
    attendingDoctor: "Dr. Gregory Vance & Dr. Sarah Mitchell",
    diagnosisCodes: ["I21.0", "R57.0", "I50.9"],
    items: [
      // ER Charges
      { id: "IT-1", description: "ER High-Acuity Resuscitation & Triage (B1 Level)", category: "Consultation", cptCode: "99285", quantity: 1, unitPrice: 250, total: 250, insuranceCovered: 200, patientPayable: 50 },
      { id: "IT-2", description: "STAT High-Sensitivity Cardiac Troponin-I POCT", category: "Laboratory", cptCode: "84484", quantity: 1, unitPrice: 100, total: 100, insuranceCovered: 80, patientPayable: 20 },
      { id: "IT-3", description: "STAT 12-Lead Electrocardiogram (ECG)", category: "Laboratory", cptCode: "93005", quantity: 1, unitPrice: 50, total: 50, insuranceCovered: 40, patientPayable: 10 },
      // ICU Charges
      { id: "IT-4", description: "ICU Intensive Care Daily Bed Rate (3 Days)", category: "Room / Bed Charges", cptCode: "99291", quantity: 3, unitPrice: 350, total: 1050, insuranceCovered: 840, patientPayable: 210 },
      { id: "IT-5", description: "Critical Care Specialist Daily Evaluation (3 Days)", category: "Consultation", cptCode: "99292", quantity: 3, unitPrice: 100, total: 300, insuranceCovered: 240, patientPayable: 60 },
      { id: "IT-6", description: "Emergency Endotracheal Intubation & Ventilator Setup", category: "Procedure / Surgery", cptCode: "31500", quantity: 1, unitPrice: 200, total: 200, insuranceCovered: 160, patientPayable: 40 },
      { id: "IT-7", description: "Arterial Line & Central Venous Line Placement", category: "Procedure / Surgery", cptCode: "36556", quantity: 1, unitPrice: 180, total: 180, insuranceCovered: 144, patientPayable: 36 },
      { id: "IT-8", description: "Serial Arterial Blood Gas Panels (ABG x3)", category: "Laboratory", cptCode: "82803", quantity: 3, unitPrice: 80, total: 240, insuranceCovered: 192, patientPayable: 48 },
      // 3N Ward Charges
      { id: "IT-9", description: "3N General Medical Ward Daily Bed Rate (4 Days)", category: "Room / Bed Charges", cptCode: "99222", quantity: 4, unitPrice: 100, total: 400, insuranceCovered: 320, patientPayable: 80 },
      { id: "IT-10", description: "Attending Inpatient Physician Daily Rounds (4 Days)", category: "Consultation", cptCode: "99233", quantity: 4, unitPrice: 50, total: 200, insuranceCovered: 160, patientPayable: 40 },
      { id: "IT-11", description: "24-Hour Continuous Inpatient Nursing Care (4 Days)", category: "Nursing", cptCode: "99505", quantity: 4, unitPrice: 40, total: 160, insuranceCovered: 128, patientPayable: 32 },
    ],
    subtotal: 3130,
    totalAmount: 3130,
    status: "Finalized by Dept",
    verifiedByNurse: "Charge Nurse Sunita Rao (3N Floor & ICU Transition Lead)",
    finalizedAt: "2026-08-30T17:30:00Z",
    createdAt: "2026-08-25T08:00:00Z",
    notes: "Patient admitted via ER for acute STEMI, stabilized in ICU for 3 days, transitioned to 3N Ward for 4 days, successfully discharged. All ER, ICU, and Inpatient ward charges verified and consolidated into single hospital stay packet.",
  },

  // 3. Surgery & OT Workflow (Ananya Desai - Laparoscopic Cholecystectomy)
  {
    id: "DCHG-2026-103",
    patientId: "UMR100412",
    mrn: "100412",
    patientName: "Ananya Desai",
    age: 42,
    gender: "Female",
    phone: "+91 97112 33445",
    encounterId: "ENC-SURG-2026-44",
    hospitalStayId: "STAY-SURG-441",
    department: "Surgery",
    carePathway: "Surgery: Pre-Op Assessment → Major OT → PACU → Post-Op Ward Stay (2 Days)",
    dateOfService: "2026-08-28",
    insuranceProvider: "HDFC ERGO",
    policyNumber: "HDFC-SURG-9912",
    preAuthCode: "AUTH-HDFC-6621",
    attendingDoctor: "Dr. Vikram Seth (Chief Surgeon) & Dr. Marcus Brody",
    diagnosisCodes: ["K80.20"],
    items: [
      { id: "IT-1", description: "Pre-Operative Assessment & Surgical Clearance", category: "Consultation", cptCode: "99205", quantity: 1, unitPrice: 100, total: 100, insuranceCovered: 80, patientPayable: 20 },
      { id: "IT-2", description: "Laparoscopic Cholecystectomy / Abdominal Surgery", category: "Procedure / Surgery", cptCode: "47562", quantity: 1, unitPrice: 800, total: 800, insuranceCovered: 640, patientPayable: 160 },
      { id: "IT-3", description: "Major Operation Theatre (OT) Infrastructure Rate (2 Hours)", category: "Room / Bed Charges", cptCode: "99291", quantity: 1, unitPrice: 300, total: 300, insuranceCovered: 240, patientPayable: 60 },
      { id: "IT-4", description: "Chief Operating Surgeon Professional Fee", category: "Consultation", cptCode: "99205", quantity: 1, unitPrice: 400, total: 400, insuranceCovered: 320, patientPayable: 80 },
      { id: "IT-5", description: "Consultant Anesthesiologist Pre-Op & Intra-Op Care", category: "Consultation", cptCode: "00840", quantity: 1, unitPrice: 200, total: 200, insuranceCovered: 160, patientPayable: 40 },
      { id: "IT-6", description: "Sterile Surgical Laparoscopic Disposable Pack & Drapes", category: "Consumables", cptCode: "A4649", quantity: 1, unitPrice: 150, total: 150, insuranceCovered: 120, patientPayable: 30 },
      { id: "IT-7", description: "PACU Post-Anesthesia Recovery Care & Monitoring", category: "Nursing", cptCode: "99505", quantity: 1, unitPrice: 80, total: 80, insuranceCovered: 64, patientPayable: 16 },
      { id: "IT-8", description: "Post-Op Surgical Ward Daily Bed Stay (2 Days)", category: "Room / Bed Charges", cptCode: "99222", quantity: 2, unitPrice: 100, total: 200, insuranceCovered: 160, patientPayable: 40 },
    ],
    subtotal: 2230,
    totalAmount: 2230,
    status: "Finalized by Dept",
    verifiedByNurse: "Staff Nurse Rajeshwari (OT / Surgical Suite Lead)",
    finalizedAt: "2026-08-30T14:00:00Z",
    createdAt: "2026-08-28T07:30:00Z",
    notes: "Elective laparoscopic surgery completed uneventfully. OT, anesthesia, surgical consumables, PACU, and post-op ward stay charges verified and finalized.",
  },

  // 4. ER Discharged Encounter (Maria Garcia - Suture & Trauma)
  {
    id: "DCHG-2026-104",
    patientId: "UMR100512",
    mrn: "100512",
    patientName: "Maria Garcia",
    age: 29,
    gender: "Female",
    phone: "+91 98451 23456",
    encounterId: "ER-2026-00004",
    department: "Emergency",
    carePathway: "ER Urgent Care → Wound Suture & Dressing → Discharged",
    dateOfService: "2026-08-24",
    insuranceProvider: "Self-Pay",
    policyNumber: "N/A - Self Pay",
    attendingDoctor: "Dr. Elena Rostova",
    diagnosisCodes: ["S51.811A"],
    items: [
      { id: "IT-1", description: "Urgent Care Minor Trauma Assessment (Level B3)", category: "Consultation", cptCode: "99283", quantity: 1, unitPrice: 100, total: 100, insuranceCovered: 0, patientPayable: 100 },
      { id: "IT-2", description: "Complex Multi-Layer Wound Suture & Hemostasis", category: "Procedure / Surgery", cptCode: "12002", quantity: 1, unitPrice: 120, total: 120, insuranceCovered: 0, patientPayable: 120 },
      { id: "IT-3", description: "Emergency Trauma Procedure Pack & Sterile Trays", category: "Consumables", cptCode: "A4649", quantity: 1, unitPrice: 60, total: 60, insuranceCovered: 0, patientPayable: 60 },
    ],
    subtotal: 280,
    totalAmount: 280,
    status: "Finalized by Dept",
    verifiedByNurse: "Staff Nurse Sneha (ER Triage Lead)",
    finalizedAt: "2026-08-24T14:15:00Z",
    createdAt: "2026-08-24T12:00:00Z",
    notes: "Patient laceration treated and sutured. Tetanus prophylaxis given. Discharged in stable condition. Ready for Central Billing invoice.",
  },

  // 5. Inpatient Discharged Encounter (Devendra Patel - 3N Ward 4 Days)
  {
    id: "DCHG-2026-105",
    patientId: "UMR100388",
    mrn: "100388",
    patientName: "Devendra Patel",
    age: 61,
    gender: "Male",
    phone: "+91 97234 11223",
    encounterId: "IP-BED-208",
    hospitalStayId: "STAY-2026-772",
    department: "Inpatient",
    carePathway: "Inpatient Ward Stay (4 Days) + Lab & Imaging Diagnostic Panels",
    dateOfService: "2026-08-26",
    insuranceProvider: "Care Health",
    policyNumber: "CARE-998812",
    attendingDoctor: "Dr. James Wilson",
    diagnosisCodes: ["K21.9", "E11.9"],
    items: [
      { id: "IT-1", description: "General Medical Ward Daily Bed Rate (4 Days)", category: "Room / Bed Charges", cptCode: "99222", quantity: 4, unitPrice: 100, total: 400, insuranceCovered: 320, patientPayable: 80 },
      { id: "IT-2", description: "Attending Inpatient Physician Daily Rounds (4 Days)", category: "Consultation", cptCode: "99233", quantity: 4, unitPrice: 50, total: 200, insuranceCovered: 160, patientPayable: 40 },
      { id: "IT-3", description: "24-Hour Continuous Inpatient Nursing Care (4 Days)", category: "Nursing", cptCode: "99505", quantity: 4, unitPrice: 40, total: 160, insuranceCovered: 128, patientPayable: 32 },
      { id: "IT-4", description: "Comprehensive Metabolic Panel (CMP / LFT + KFT)", category: "Laboratory", cptCode: "80053", quantity: 1, unitPrice: 120, total: 120, insuranceCovered: 96, patientPayable: 24 },
      { id: "IT-5", description: "Whole Abdomen & Pelvis Ultrasound (USG)", category: "Radiology / Imaging", cptCode: "76700", quantity: 1, unitPrice: 100, total: 100, insuranceCovered: 80, patientPayable: 20 },
    ],
    subtotal: 980,
    totalAmount: 980,
    status: "Finalized by Dept",
    verifiedByNurse: "Nurse Anita (3N Floor Supervisor)",
    finalizedAt: "2026-08-30T10:00:00Z",
    createdAt: "2026-08-26T09:00:00Z",
    notes: "Patient completed 4-day inpatient medical stabilization. All daily charges, labs, and ultrasound finalized.",
  },

  // 6. Active Accumulating Charge Sheet: ER Bay 1 (Kavita Sen - In Progress)
  {
    id: "DCHG-2026-106",
    patientId: "UMR100612",
    mrn: "100612",
    patientName: "Kavita Sen",
    age: 34,
    gender: "Female",
    phone: "+91 99123 77889",
    encounterId: "ER-2026-00005",
    department: "Emergency",
    carePathway: "Active ER Encounter: Acute Abdominal Pain Assessment",
    dateOfService: "2026-08-31",
    insuranceProvider: "ICICI Lombard",
    policyNumber: "ICICI-ER-8812",
    attendingDoctor: "Dr. Anita Roy",
    diagnosisCodes: ["R10.9"],
    items: [
      { id: "IT-1", description: "Emergency Acute Evaluation & Stabilization (Level B2)", category: "Consultation", cptCode: "99284", quantity: 1, unitPrice: 150, total: 150, insuranceCovered: 120, patientPayable: 30 },
      { id: "IT-2", description: "Complete Blood Count w/ Differential (CBC)", category: "Laboratory", cptCode: "85025", quantity: 1, unitPrice: 50, total: 50, insuranceCovered: 40, patientPayable: 10 },
      { id: "IT-3", description: "STAT Emergency Nursing & IV Cannulation Protocol", category: "Nursing", cptCode: "99505", quantity: 1, unitPrice: 50, total: 50, insuranceCovered: 40, patientPayable: 10 },
    ],
    subtotal: 250,
    totalAmount: 250,
    status: "Accumulating Charges",
    createdAt: "2026-08-31T11:00:00Z",
    notes: "Patient currently in ER Bay 1 awaiting ultrasound abdomen report. Additional charges may accumulate before nurse finalization.",
  },
];

// ── INITIAL SEED CENTRAL INVOICES & CLAIMS (Streamlined Small Amounts) ──────
const INITIAL_HOSPITAL_CLAIMS: ClaimRecord[] = [
  // ── INPATIENT: Bed 204-A (John Smith - 3N Medical/Surgical) ──
  {
    id: "CLM-8921",
    invoiceNo: "INV-2026-0811",
    patientId: "UMR100245",
    patientName: "John Smith",
    mrn: "100245",
    age: 41,
    gender: "Male",
    phone: "+91 98765 43210",
    department: "Inpatient",
    carePathway: "Inpatient Ward Stay (5 Days) + Labs & Nursing Care",
    dateOfService: "2026-08-22",
    admissionId: 501,
    bedId: 1,
    insuranceProvider: "Star Health",
    policyNumber: "SH-28847291",
    preAuthCode: "AUTH-2026-18845",
    status: "Accepted",
    attendingDoctor: "Dr. Sarah Mitchell",
    diagnosisCodes: ["E11.65", "I10"],
    items: [
      { id: "ITEM-1", description: "3N Med/Surg Semi-Private Bed Stay (5 Days)", category: "Room / Bed Charges", cptCode: "99223", quantity: 5, unitPrice: 150, total: 750, insuranceCovered: 600, patientPayable: 150 },
      { id: "ITEM-2", description: "Attending Physician Initial Evaluation & Daily Rounds", category: "Consultation", cptCode: "99233", quantity: 5, unitPrice: 50, total: 250, insuranceCovered: 200, patientPayable: 50 },
      { id: "ITEM-3", description: "Comprehensive Metabolic Panel (CMP) & HbA1c", category: "Laboratory", cptCode: "80053", quantity: 2, unitPrice: 90, total: 180, insuranceCovered: 144, patientPayable: 36 },
      { id: "ITEM-4", description: "Continuous Nursing Care & Vitals Monitoring (5 Days)", category: "Nursing", cptCode: "99505", quantity: 5, unitPrice: 40, total: 200, insuranceCovered: 160, patientPayable: 40 },
      { id: "ITEM-5", description: "Inpatient Infusion & Sterile Nursing Consumables Pack", category: "Consumables", cptCode: "A4649", quantity: 1, unitPrice: 120, total: 120, insuranceCovered: 96, patientPayable: 24 },
    ],
    subtotal: 1500,
    discount: 0,
    tax: 0,
    totalAmount: 1500,
    insurancePortion: 1200,
    patientPortion: 300,
    amountPaid: 0,
    balanceDue: 300,
    payments: [],
    createdAt: "2026-08-22T14:10:00Z",
    updatedAt: "2026-08-23T10:15:00Z",
  },
  // ── INPATIENT: Bed 208-A (Mary Jones) ──
  {
    id: "CLM-8922",
    invoiceNo: "INV-2026-0812",
    patientId: "UMR100246",
    patientName: "Mary Jones",
    mrn: "100246",
    age: 53,
    gender: "Female",
    phone: "+91 97123 44556",
    department: "Inpatient",
    carePathway: "Inpatient Ward Stay (6 Days) + Pulmonology Diagnostics",
    dateOfService: "2026-08-21",
    admissionId: 502,
    bedId: 2,
    insuranceProvider: "ICICI Lombard",
    policyNumber: "ICICI-9920118",
    preAuthCode: "AUTH-ICICI-8812",
    status: "Submitted",
    attendingDoctor: "Dr. Elena Rostova",
    diagnosisCodes: ["J18.9", "J96.00"],
    items: [
      { id: "ITEM-1", description: "3N Med/Surg General Ward Daily Bed Stay (6 Days)", category: "Room / Bed Charges", cptCode: "99222", quantity: 6, unitPrice: 100, total: 600, insuranceCovered: 480, patientPayable: 120 },
      { id: "ITEM-2", description: "Pulmonology Specialist Evaluation & Care (6 Days)", category: "Consultation", cptCode: "99233", quantity: 6, unitPrice: 50, total: 300, insuranceCovered: 240, patientPayable: 60 },
      { id: "ITEM-3", description: "Digital Chest X-Ray 2 Views (Paired follow-up)", category: "Radiology / Imaging", cptCode: "71046", quantity: 2, unitPrice: 60, total: 120, insuranceCovered: 96, patientPayable: 24 },
      { id: "ITEM-4", description: "Sputum Culture & Comprehensive Blood Work (CBC, CRP)", category: "Laboratory", cptCode: "87070", quantity: 1, unitPrice: 140, total: 140, insuranceCovered: 112, patientPayable: 28 },
      { id: "ITEM-5", description: "Respiratory Therapy Consumables & Nebulization Protocol", category: "Consumables", cptCode: "A4649", quantity: 1, unitPrice: 90, total: 90, insuranceCovered: 72, patientPayable: 18 },
      { id: "ITEM-6", description: "Specialized Continuous Nursing Monitoring", category: "Nursing", cptCode: "99505", quantity: 6, unitPrice: 40, total: 240, insuranceCovered: 192, patientPayable: 48 },
    ],
    subtotal: 1490,
    discount: 0,
    tax: 0,
    totalAmount: 1490,
    insurancePortion: 1192,
    patientPortion: 298,
    amountPaid: 0,
    balanceDue: 298,
    payments: [],
    createdAt: "2026-08-21T09:30:00Z",
    updatedAt: "2026-08-22T09:20:00Z",
  },
  // ── INPATIENT: Bed 221-A (Robert Lee) ──
  {
    id: "CLM-8923",
    invoiceNo: "INV-2026-0813",
    patientId: "UMR100221",
    patientName: "Robert Lee",
    mrn: "100221",
    age: 68,
    gender: "Male",
    phone: "+91 98334 45566",
    department: "Inpatient",
    carePathway: "Inpatient Cardiology Private Stay (8 Days) + Telemetry",
    dateOfService: "2026-08-19",
    admissionId: 503,
    bedId: 3,
    insuranceProvider: "Care Health",
    policyNumber: "CARE-882190",
    preAuthCode: "AUTH-CARE-5541",
    status: "Draft",
    attendingDoctor: "Dr. James Wilson",
    diagnosisCodes: ["I50.9", "I25.10"],
    items: [
      { id: "ITEM-1", description: "Private Room Inpatient Stay (8 Days)", category: "Room / Bed Charges", cptCode: "99223", quantity: 8, unitPrice: 250, total: 2000, insuranceCovered: 1600, patientPayable: 400 },
      { id: "ITEM-2", description: "Cardiology Specialist Consultations & Rounding (8 Days)", category: "Consultation", cptCode: "99233", quantity: 8, unitPrice: 50, total: 400, insuranceCovered: 320, patientPayable: 80 },
      { id: "ITEM-3", description: "Echocardiography Transthoracic Complete", category: "Radiology / Imaging", cptCode: "93306", quantity: 1, unitPrice: 200, total: 200, insuranceCovered: 160, patientPayable: 40 },
      { id: "ITEM-4", description: "Daily Serum Electrolytes & Renal Function Panel", category: "Laboratory", cptCode: "80053", quantity: 4, unitPrice: 60, total: 240, insuranceCovered: 192, patientPayable: 48 },
      { id: "ITEM-5", description: "Continuous Cardiac Telemetry Monitoring (8 Days)", category: "Nursing", cptCode: "99505", quantity: 8, unitPrice: 40, total: 320, insuranceCovered: 256, patientPayable: 64 },
      { id: "ITEM-6", description: "Inpatient Clinical Consumables & Infusion Lines", category: "Consumables", cptCode: "A4649", quantity: 1, unitPrice: 140, total: 140, insuranceCovered: 112, patientPayable: 28 },
    ],
    subtotal: 3300,
    discount: 0,
    tax: 0,
    totalAmount: 3300,
    insurancePortion: 2640,
    patientPortion: 660,
    amountPaid: 0,
    balanceDue: 660,
    payments: [],
    createdAt: "2026-08-19T16:00:00Z",
    updatedAt: "2026-08-20T11:00:00Z",
  },
  // ── ICU: Critical Care Bed ICU-01 (Thomas Reed) ──
  {
    id: "CLM-8924",
    invoiceNo: "INV-2026-0814",
    patientId: "UMR100301",
    patientName: "Thomas Reed",
    mrn: "100301",
    age: 52,
    gender: "Male",
    phone: "+91 98451 22334",
    department: "ICU",
    carePathway: "ICU Critical Care Stay (7 Days) + Ventilator & Line Procedures",
    dateOfService: "2026-08-23",
    insuranceProvider: "HDFC ERGO",
    policyNumber: "HDFC-TE5-MK72",
    preAuthCode: "MC-ICU-8819",
    status: "Draft",
    attendingDoctor: "Dr. Gregory Vance",
    diagnosisCodes: ["R57.2", "N39.0", "J96.00"],
    items: [
      { id: "ITEM-1", description: "ICU Intensive Care Daily Bed Rate (7 Days)", category: "Room / Bed Charges", cptCode: "99291", quantity: 7, unitPrice: 350, total: 2450, insuranceCovered: 1960, patientPayable: 490 },
      { id: "ITEM-2", description: "Critical Care Specialist Daily Evaluation (7 Days)", category: "Consultation", cptCode: "99292", quantity: 7, unitPrice: 100, total: 700, insuranceCovered: 560, patientPayable: 140 },
      { id: "ITEM-3", description: "Emergency Intubation & Mechanical Ventilation Management", category: "Procedure / Surgery", cptCode: "31500", quantity: 1, unitPrice: 200, total: 200, insuranceCovered: 160, patientPayable: 40 },
      { id: "ITEM-4", description: "Arterial Line & Central Venous Line Placement", category: "Procedure / Surgery", cptCode: "36556", quantity: 1, unitPrice: 180, total: 180, insuranceCovered: 144, patientPayable: 36 },
      { id: "ITEM-5", description: "STAT ABG & Serial Lactate Testing (12 Panels)", category: "Laboratory", cptCode: "82803", quantity: 12, unitPrice: 80, total: 960, insuranceCovered: 768, patientPayable: 192 },
      { id: "ITEM-6", description: "Continuous 1:1 Critical Care Nursing (7 Days)", category: "Nursing", cptCode: "99505", quantity: 7, unitPrice: 80, total: 560, insuranceCovered: 448, patientPayable: 112 },
      { id: "ITEM-7", description: "High-Acuity Hemodynamic Consumables & Airway Kits", category: "Consumables", cptCode: "A4649", quantity: 1, unitPrice: 250, total: 250, insuranceCovered: 200, patientPayable: 50 },
    ],
    subtotal: 5300,
    discount: 0,
    tax: 0,
    totalAmount: 5300,
    insurancePortion: 4240,
    patientPortion: 1060,
    amountPaid: 0,
    balanceDue: 1060,
    payments: [],
    createdAt: "2026-08-23T08:00:00Z",
    updatedAt: "2026-08-23T11:45:00Z",
  },
  // ── EMERGENCY: Visit ER-2026-00001 (John Smith - STEMI) ──
  {
    id: "CLM-8927",
    invoiceNo: "INV-2026-0817",
    patientId: "UMR100245",
    patientName: "John Smith",
    mrn: "100245",
    age: 45,
    gender: "Male",
    phone: "+91 98765 43210",
    department: "Emergency",
    carePathway: "ER Resuscitation → Cath Lab Prep → Cath Activation",
    dateOfService: "2026-08-22",
    encounterId: "ER-2026-00001",
    insuranceProvider: "Star Health",
    policyNumber: "SH-28847291",
    preAuthCode: "AUTH-ER-99182",
    status: "Accepted",
    attendingDoctor: "Dr. Vikram Seth",
    diagnosisCodes: ["I21.0", "R07.9"],
    items: [
      { id: "ITEM-1", description: "Emergency Resuscitation & High-Acuity Triage (B1 Level)", category: "Consultation", cptCode: "99285", quantity: 1, unitPrice: 250, total: 250, insuranceCovered: 200, patientPayable: 50 },
      { id: "ITEM-2", description: "STAT 12-Lead Electrocardiogram (ECG)", category: "Laboratory", cptCode: "93005", quantity: 1, unitPrice: 50, total: 50, insuranceCovered: 40, patientPayable: 10 },
      { id: "ITEM-3", description: "STAT High-Sensitivity Cardiac Troponin-I POCT", category: "Laboratory", cptCode: "84484", quantity: 1, unitPrice: 100, total: 100, insuranceCovered: 80, patientPayable: 20 },
      { id: "ITEM-4", description: "Bedside Point-of-Care Echocardiogram (POCUS)", category: "Radiology / Imaging", cptCode: "93308", quantity: 1, unitPrice: 90, total: 90, insuranceCovered: 72, patientPayable: 18 },
      { id: "ITEM-5", description: "Emergency Trauma & IV Stabilization Kit", category: "Consumables", cptCode: "A4649", quantity: 1, unitPrice: 60, total: 60, insuranceCovered: 48, patientPayable: 12 },
      { id: "ITEM-6", description: "Cath Lab Emergency Activation & PPCI Prep", category: "Procedure / Surgery", cptCode: "31500", quantity: 1, unitPrice: 250, total: 250, insuranceCovered: 200, patientPayable: 50 },
    ],
    subtotal: 800,
    discount: 0,
    tax: 0,
    totalAmount: 800,
    insurancePortion: 640,
    patientPortion: 160,
    amountPaid: 0,
    balanceDue: 160,
    payments: [],
    createdAt: "2026-08-22T13:45:00Z",
    updatedAt: "2026-08-23T09:15:00Z",
  },
  // ── EMERGENCY: Visit ER-2026-00002 (Rahul Sharma - PM-JAY Paid) ──
  {
    id: "CLM-8928",
    invoiceNo: "INV-2026-0818",
    patientId: "UMR100342",
    patientName: "Rahul Sharma",
    mrn: "100342",
    age: 28,
    gender: "Male",
    phone: "+91 98234 56789",
    department: "Emergency",
    carePathway: "ER Triage B2 → CT Abdomen → Pre-Op Clearance → Settled",
    dateOfService: "2026-08-24",
    encounterId: "ER-2026-00002",
    insuranceProvider: "PM-JAY (Ayushman Bharat)",
    policyNumber: "AB-PMJAY-882910",
    status: "Paid",
    attendingDoctor: "Dr. Anita Roy",
    diagnosisCodes: ["K35.80"],
    items: [
      { id: "ITEM-1", description: "Emergency Department Moderate Severity Evaluation (B2 Level)", category: "Consultation", cptCode: "99284", quantity: 1, unitPrice: 150, total: 150, insuranceCovered: 150, patientPayable: 0 },
      { id: "ITEM-2", description: "Contrast-Enhanced CT Scan Abdomen & Pelvis", category: "Radiology / Imaging", cptCode: "74177", quantity: 1, unitPrice: 250, total: 250, insuranceCovered: 250, patientPayable: 0 },
      { id: "ITEM-3", description: "Complete Blood Count w/ Differential (CBC)", category: "Laboratory", cptCode: "85025", quantity: 1, unitPrice: 50, total: 50, insuranceCovered: 50, patientPayable: 0 },
      { id: "ITEM-4", description: "Pre-Op Surgical Clearance Panel & Urinalysis", category: "Laboratory", cptCode: "81001", quantity: 1, unitPrice: 60, total: 60, insuranceCovered: 60, patientPayable: 0 },
      { id: "ITEM-5", description: "Emergency IV Infusion & Procedural Supplies", category: "Consumables", cptCode: "A4649", quantity: 1, unitPrice: 40, total: 40, insuranceCovered: 40, patientPayable: 0 },
    ],
    subtotal: 550,
    discount: 0,
    tax: 0,
    totalAmount: 550,
    insurancePortion: 550,
    patientPortion: 0,
    amountPaid: 550,
    balanceDue: 0,
    payments: [
      {
        id: "PAY-1001",
        invoiceId: "CLM-8928",
        receiptNo: "RCPT-2026-5501",
        amount: 550,
        paymentDate: "2026-08-24T16:45:00Z",
        paymentMethod: "Bank Transfer",
        transactionRef: "PMJAY-EFT-99410",
        collectedBy: "NHA Electronic Remittance Gateway",
      },
    ],
    createdAt: "2026-08-24T10:00:00Z",
    updatedAt: "2026-08-24T16:50:00Z",
  },
  // ── OUTPATIENT: Encounter ENC-10067-1 (Rana Dhaggubati - Cardiology) ──
  {
    id: "CLM-8930",
    invoiceNo: "INV-2026-0820",
    patientId: "UMR10067",
    patientName: "Rana Dhaggubati",
    mrn: "100067",
    age: 36,
    gender: "Male",
    phone: "+91 97455 11223",
    department: "Outpatient",
    carePathway: "Cardiology OPD Consultation + STAT ECG & Troponin",
    dateOfService: "2026-08-31",
    encounterId: "ENC-10067-1",
    insuranceProvider: "HDFC ERGO",
    policyNumber: "HDFC-RD7-1092",
    status: "Ready",
    attendingDoctor: "Dr. Arjun Mehta",
    diagnosisCodes: ["I20.9"],
    items: [
      { id: "ITEM-1", description: "Cardiology Specialist Comprehensive Outpatient Consultation", category: "Consultation", cptCode: "99205", quantity: 1, unitPrice: 150, total: 150, insuranceCovered: 120, patientPayable: 30 },
      { id: "ITEM-2", description: "Standard 12-Lead Electrocardiogram (ECG)", category: "Laboratory", cptCode: "93005", quantity: 1, unitPrice: 50, total: 50, insuranceCovered: 40, patientPayable: 10 },
      { id: "ITEM-3", description: "High-Sensitivity Serum Troponin-I Assay", category: "Laboratory", cptCode: "84484", quantity: 1, unitPrice: 100, total: 100, insuranceCovered: 80, patientPayable: 20 },
      { id: "ITEM-4", description: "Outpatient Diagnostic Screen & Clinical Consumables", category: "Consumables", cptCode: "A4649", quantity: 1, unitPrice: 30, total: 30, insuranceCovered: 24, patientPayable: 6 },
    ],
    subtotal: 330,
    discount: 0,
    tax: 0,
    totalAmount: 330,
    insurancePortion: 264,
    patientPortion: 66,
    amountPaid: 0,
    balanceDue: 66,
    payments: [],
    createdAt: "2026-08-31T10:15:00Z",
    updatedAt: "2026-08-31T10:15:00Z",
  },
  // ── OUTPATIENT: Encounter ENC-10001-2 (Ravi Kumar - Cardiology Follow-up) ──
  {
    id: "CLM-8931",
    invoiceNo: "INV-2026-0821",
    patientId: "UMR10001",
    patientName: "Ravi Kumar",
    mrn: "100001",
    age: 42,
    gender: "Male",
    phone: "+91 98765 01192",
    department: "Outpatient",
    carePathway: "Cardiology Follow-up + Lipid Profile & HbA1c",
    dateOfService: "2026-08-31",
    encounterId: "ENC-10001-2",
    insuranceProvider: "Star Health",
    policyNumber: "SH-7721094",
    status: "Submitted",
    attendingDoctor: "Dr. Rajesh Sharma",
    diagnosisCodes: ["I10", "E78.5"],
    items: [
      { id: "ITEM-1", description: "Specialist Follow-up Consultation & Review", category: "Consultation", cptCode: "99213", quantity: 1, unitPrice: 50, total: 50, insuranceCovered: 40, patientPayable: 10 },
      { id: "ITEM-2", description: "Comprehensive Lipid Profile Panel", category: "Laboratory", cptCode: "80061", quantity: 1, unitPrice: 80, total: 80, insuranceCovered: 64, patientPayable: 16 },
      { id: "ITEM-3", description: "Standard 12-Lead Electrocardiogram (ECG)", category: "Laboratory", cptCode: "93005", quantity: 1, unitPrice: 50, total: 50, insuranceCovered: 40, patientPayable: 10 },
      { id: "ITEM-4", description: "Glycosylated Hemoglobin (HbA1c) Assay", category: "Laboratory", cptCode: "83036", quantity: 1, unitPrice: 60, total: 60, insuranceCovered: 48, patientPayable: 12 },
    ],
    subtotal: 240,
    discount: 0,
    tax: 0,
    totalAmount: 240,
    insurancePortion: 192,
    patientPortion: 48,
    amountPaid: 0,
    balanceDue: 48,
    payments: [],
    createdAt: "2026-08-31T10:25:00Z",
    updatedAt: "2026-08-31T10:30:00Z",
  },
  // ── OUTPATIENT: Encounter ENC-10002-1 (Sunita Patel - Self-Pay Paid) ──
  {
    id: "CLM-8932",
    invoiceNo: "INV-2026-0822",
    patientId: "UMR10002",
    patientName: "Sunita Patel",
    mrn: "100002",
    age: 38,
    gender: "Female",
    phone: "+91 98111 22334",
    department: "Outpatient",
    carePathway: "OPD Cardiology Evaluation + 2D Echo + Holter Monitor",
    dateOfService: "2026-08-30",
    encounterId: "ENC-10002-1",
    insuranceProvider: "Self-Pay",
    policyNumber: "N/A - Self Pay",
    status: "Paid",
    attendingDoctor: "Dr. Sarah Jenkins",
    diagnosisCodes: ["R00.2"],
    items: [
      { id: "ITEM-1", description: "Cardiology Initial Outpatient Evaluation", category: "Consultation", cptCode: "99205", quantity: 1, unitPrice: 150, total: 150, insuranceCovered: 0, patientPayable: 150 },
      { id: "ITEM-2", description: "2D Echocardiography & Color Doppler", category: "Radiology / Imaging", cptCode: "93306", quantity: 1, unitPrice: 200, total: 200, insuranceCovered: 0, patientPayable: 200 },
      { id: "ITEM-3", description: "24-Hour Ambulatory Holter Monitoring", category: "Laboratory", cptCode: "93224", quantity: 1, unitPrice: 150, total: 150, insuranceCovered: 0, patientPayable: 150 },
    ],
    subtotal: 500,
    discount: 0,
    tax: 0,
    totalAmount: 500,
    insurancePortion: 0,
    patientPortion: 500,
    amountPaid: 500,
    balanceDue: 0,
    payments: [
      {
        id: "PAY-1003",
        invoiceId: "CLM-8932",
        receiptNo: "RCPT-2026-5503",
        amount: 500,
        paymentDate: "2026-08-30T11:30:00Z",
        paymentMethod: "Debit Card",
        transactionRef: "POS-DEBIT-77192",
        collectedBy: "Sarah Jenkins (Front Desk Cashier)",
      },
    ],
    createdAt: "2026-08-30T10:32:00Z",
    updatedAt: "2026-08-30T11:35:00Z",
  },
  // ── INPATIENT: Claim In Denial (Amit Patel) ──
  {
    id: "CLM-8929",
    invoiceNo: "INV-2026-0819",
    patientId: "UMR100418",
    patientName: "Amit Patel",
    mrn: "100418",
    age: 49,
    gender: "Male",
    phone: "+91 98221 44556",
    department: "Inpatient",
    carePathway: "Inpatient Stay (5 Days) + Abdominal Ultrasound & Endoscopy",
    dateOfService: "2026-08-18",
    insuranceProvider: "ICICI Lombard",
    policyNumber: "ICICI-881902",
    status: "Denied",
    denialReason: "Payer denied reimbursement: Timely filing limit exceeded & secondary pre-authorization query (Code: CO-29).",
    attendingDoctor: "Dr. Elena Rostova",
    diagnosisCodes: ["K29.70", "K21.9"],
    items: [
      { id: "ITEM-1", description: "General Medical Ward Daily Bed Rate (5 Days)", category: "Room / Bed Charges", cptCode: "99222", quantity: 5, unitPrice: 100, total: 500, insuranceCovered: 400, patientPayable: 100 },
      { id: "ITEM-2", description: "Attending Inpatient Physician Daily Rounds (5 Days)", category: "Consultation", cptCode: "99233", quantity: 5, unitPrice: 50, total: 250, insuranceCovered: 200, patientPayable: 50 },
      { id: "ITEM-3", description: "Diagnostic Upper GI Endoscopy Procedure", category: "Procedure / Surgery", cptCode: "43239", quantity: 1, unitPrice: 200, total: 200, insuranceCovered: 160, patientPayable: 40 },
      { id: "ITEM-4", description: "Ultrasound Whole Abdomen & Pelvis", category: "Radiology / Imaging", cptCode: "76700", quantity: 1, unitPrice: 100, total: 100, insuranceCovered: 80, patientPayable: 20 },
      { id: "ITEM-5", description: "Inpatient Consumables & Infusion Pack", category: "Consumables", cptCode: "A4649", quantity: 1, unitPrice: 50, total: 50, insuranceCovered: 40, patientPayable: 10 },
    ],
    subtotal: 1100,
    discount: 0,
    tax: 0,
    totalAmount: 1100,
    insurancePortion: 880,
    patientPortion: 220,
    amountPaid: 0,
    balanceDue: 220,
    payments: [],
    createdAt: "2026-08-18T11:00:00Z",
    updatedAt: "2026-08-27T15:20:00Z",
  },
  // ── OUTPATIENT: Ready for Submission (Meera Nair - Pulmonology) ──
  {
    id: "CLM-8933",
    invoiceNo: "INV-2026-0823",
    patientId: "UMR100522",
    patientName: "Meera Nair",
    mrn: "100522",
    age: 31,
    gender: "Female",
    phone: "+91 98450 77123",
    department: "Outpatient",
    carePathway: "Pulmonology Consultation + Spirometry & Chest X-Ray",
    dateOfService: "2026-08-31",
    encounterId: "ENC-100522-1",
    insuranceProvider: "Star Health",
    policyNumber: "SH-882194",
    preAuthCode: "AUTH-SH-7718",
    status: "Ready",
    attendingDoctor: "Dr. Rajesh Sharma",
    diagnosisCodes: ["J45.909"],
    items: [
      { id: "ITEM-1", description: "Specialist Comprehensive Outpatient Consultation", category: "Consultation", cptCode: "99205", quantity: 1, unitPrice: 150, total: 150, insuranceCovered: 120, patientPayable: 30 },
      { id: "ITEM-2", description: "Spirometry with Pre- and Post-Bronchodilator Test", category: "Laboratory", cptCode: "94060", quantity: 1, unitPrice: 100, total: 100, insuranceCovered: 80, patientPayable: 20 },
      { id: "ITEM-3", description: "Digital Chest X-Ray PA View", category: "Radiology / Imaging", cptCode: "71046", quantity: 1, unitPrice: 60, total: 60, insuranceCovered: 48, patientPayable: 12 },
      { id: "ITEM-4", description: "High-Resolution CT Thorax Screening", category: "Radiology / Imaging", cptCode: "71250", quantity: 1, unitPrice: 250, total: 250, insuranceCovered: 200, patientPayable: 50 },
      { id: "ITEM-5", description: "Inhalation Therapy Consumables & Spacer Kit", category: "Consumables", cptCode: "A4649", quantity: 1, unitPrice: 40, total: 40, insuranceCovered: 32, patientPayable: 8 },
    ],
    subtotal: 600,
    discount: 0,
    tax: 0,
    totalAmount: 600,
    insurancePortion: 480,
    patientPortion: 120,
    amountPaid: 0,
    balanceDue: 120,
    payments: [],
    createdAt: "2026-08-31T11:45:00Z",
    updatedAt: "2026-08-31T11:45:00Z",
  },
  // ── OUTPATIENT: Voided Bill (Priya Sharma) ──
  {
    id: "CLM-8934",
    invoiceNo: "INV-2026-0824",
    patientId: "UMR100588",
    patientName: "Priya Sharma",
    mrn: "100588",
    age: 26,
    gender: "Female",
    phone: "+91 97110 88291",
    department: "Outpatient",
    carePathway: "Duplicate Outpatient Registration (Voided by Manager)",
    dateOfService: "2026-08-29",
    insuranceProvider: "Self-Pay",
    policyNumber: "N/A - Self Pay",
    status: "Voided",
    attendingDoctor: "Dr. Sarah Jenkins",
    diagnosisCodes: ["Z00.00"],
    items: [
      { id: "ITEM-1", description: "Outpatient Consultation & Review (Voided Entry)", category: "Consultation", cptCode: "99213", quantity: 1, unitPrice: 100, total: 100, insuranceCovered: 0, patientPayable: 0 },
    ],
    subtotal: 100,
    discount: 100,
    tax: 0,
    totalAmount: 0,
    insurancePortion: 0,
    patientPortion: 0,
    amountPaid: 0,
    balanceDue: 0,
    payments: [],
    createdAt: "2026-08-29T14:00:00Z",
    updatedAt: "2026-08-29T14:25:00Z",
  },
  // ── SURGERY: Operation Theatre & Procedure (Ananya Desai) ──
  {
    id: "CLM-8935",
    invoiceNo: "INV-2026-0825",
    patientId: "UMR100412",
    patientName: "Ananya Desai",
    mrn: "100412",
    age: 42,
    gender: "Female",
    phone: "+91 97112 33445",
    department: "Surgery",
    carePathway: "Surgery: Laparoscopic Cholecystectomy + Major OT + PACU Care",
    dateOfService: "2026-08-28",
    encounterId: "ENC-SURG-2026-44",
    hospitalStayId: "STAY-SURG-441",
    insuranceProvider: "HDFC ERGO",
    policyNumber: "HDFC-SURG-9912",
    preAuthCode: "AUTH-HDFC-6621",
    status: "Ready",
    attendingDoctor: "Dr. Vikram Seth (Chief Surgeon)",
    diagnosisCodes: ["K80.20"],
    items: [
      { id: "ITEM-1", description: "Laparoscopic Cholecystectomy / Abdominal Surgery", category: "Procedure / Surgery", cptCode: "47562", quantity: 1, unitPrice: 800, total: 800, insuranceCovered: 640, patientPayable: 160 },
      { id: "ITEM-2", description: "Major Operation Theatre (OT) Infrastructure Rate (2 Hours)", category: "Room / Bed Charges", cptCode: "99291", quantity: 1, unitPrice: 300, total: 300, insuranceCovered: 240, patientPayable: 60 },
      { id: "ITEM-3", description: "Chief Operating Surgeon Professional Fee", category: "Consultation", cptCode: "99205", quantity: 1, unitPrice: 400, total: 400, insuranceCovered: 320, patientPayable: 80 },
      { id: "ITEM-4", description: "Consultant Anesthesiologist Pre-Op & Intra-Op Care", category: "Consultation", cptCode: "00840", quantity: 1, unitPrice: 200, total: 200, insuranceCovered: 160, patientPayable: 40 },
      { id: "ITEM-5", description: "PACU Post-Anesthesia Recovery Care & Monitoring", category: "Nursing", cptCode: "99505", quantity: 1, unitPrice: 80, total: 80, insuranceCovered: 64, patientPayable: 16 },
    ],
    subtotal: 1780,
    discount: 0,
    tax: 0,
    totalAmount: 1780,
    insurancePortion: 1424,
    patientPortion: 356,
    amountPaid: 0,
    balanceDue: 356,
    payments: [],
    createdAt: "2026-08-28T09:00:00Z",
    updatedAt: "2026-08-28T12:00:00Z",
  },
  // ── LABORATORY: Pre-Paid Blood Work & Pathology (Patricia Okonkwo) ──
  {
    id: "CLM-8936",
    invoiceNo: "INV-2026-0826",
    patientId: "UMR100149",
    patientName: "Patricia Okonkwo",
    mrn: "100149",
    age: 58,
    gender: "Female",
    phone: "+91 98452 11990",
    department: "Laboratory",
    carePathway: "Pre-Operative Cross-Match & Transfusion Safety Diagnostic Panel",
    dateOfService: "2026-09-12",
    encounterId: "ENC-LAB-100149",
    insuranceProvider: "Self-Pay",
    policyNumber: "N/A - Self Pay",
    status: "Ready",
    attendingDoctor: "Dr. Williams",
    diagnosisCodes: ["Z01.812"],
    items: [
      { id: "ITEM-1", description: "Cross-Match Type & Screen (X-Match T&S)", category: "Laboratory", cptCode: "86900", quantity: 1, unitPrice: 140, total: 140, insuranceCovered: 0, patientPayable: 140 },
    ],
    subtotal: 140,
    discount: 0,
    tax: 0,
    totalAmount: 140,
    insurancePortion: 0,
    patientPortion: 140,
    amountPaid: 0,
    balanceDue: 140,
    payments: [],
    createdAt: "2026-09-12T10:15:00Z",
    updatedAt: "2026-09-12T10:15:00Z",
  },
  // ── RADIOLOGY: Pre-Paid Hip Imaging Scan (Patricia Okonkwo) ──
  {
    id: "CLM-8937",
    invoiceNo: "INV-2026-0827",
    patientId: "UMR100149",
    patientName: "Patricia Okonkwo",
    mrn: "100149",
    age: 58,
    gender: "Female",
    phone: "+91 98452 11990",
    department: "Radiology",
    carePathway: "Digital Radiography: Right Hip AP & Lateral Examination",
    dateOfService: "2026-09-12",
    encounterId: "ENC-RAD-100149",
    insuranceProvider: "Self-Pay",
    policyNumber: "N/A - Self Pay",
    status: "Ready",
    attendingDoctor: "Dr. Williams",
    diagnosisCodes: ["M16.11"],
    items: [
      { id: "ITEM-1", description: "Digital X-Ray Right Hip AP & Lateral Views", category: "Radiology / Imaging", cptCode: "73502", quantity: 1, unitPrice: 130, total: 130, insuranceCovered: 0, patientPayable: 130 },
    ],
    subtotal: 130,
    discount: 0,
    tax: 0,
    totalAmount: 130,
    insurancePortion: 0,
    patientPortion: 130,
    amountPaid: 0,
    balanceDue: 130,
    payments: [],
    createdAt: "2026-09-12T10:15:00Z",
    updatedAt: "2026-09-12T10:15:00Z",
  },
];

export class BillingDatabase {
  private static load<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  private static save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      this.dispatchUpdate();
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  }

  private static dispatchUpdate(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(BILLING_UPDATE_EVENT));
    }
  }

  static onUpdate(callback: () => void): () => void {
    if (typeof window === "undefined") return () => { };
    const handler = () => callback();
    window.addEventListener(BILLING_UPDATE_EVENT, handler);
    return () => window.removeEventListener(BILLING_UPDATE_EVENT, handler);
  }

  static getStandardServices() {
    return STANDARD_SERVICES;
  }

  static getDepartmentTariffCatalog() {
    return DEPARTMENT_TARIFF_CATALOG;
  }

  // ── INVOICES & CLAIMS ───────────────────────────────────────────────────────
  static getClaims(filter?: {
    status?: ClaimStatus | "All";
    department?: DepartmentType | "All";
    search?: string;
    umr?: string;
  }): ClaimRecord[] {
    let claims = this.load<ClaimRecord[]>(STORAGE_KEY_CLAIMS, INITIAL_HOSPITAL_CLAIMS);

    if (filter) {
      if (filter.status && filter.status !== "All") {
        claims = claims.filter((c) => c.status === filter.status);
      }
      if (filter.department && filter.department !== "All") {
        claims = claims.filter((c) => c.department === filter.department);
      }
      if (filter.umr && filter.umr.trim()) {
        const u = filter.umr.trim().toLowerCase();
        claims = claims.filter((c) => c.patientId.toLowerCase() === u || c.mrn.toLowerCase() === u);
      }
      if (filter.search && filter.search.trim()) {
        const q = filter.search.trim().toLowerCase();
        claims = claims.filter(
          (c) =>
            c.patientName.toLowerCase().includes(q) ||
            c.mrn.toLowerCase().includes(q) ||
            c.patientId.toLowerCase().includes(q) ||
            c.invoiceNo.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q) ||
            c.insuranceProvider.toLowerCase().includes(q) ||
            (c.encounterId && c.encounterId.toLowerCase().includes(q)) ||
            (c.hospitalStayId && c.hospitalStayId.toLowerCase().includes(q)) ||
            c.items.some((it) => it.description.toLowerCase().includes(q) || it.cptCode.toLowerCase().includes(q))
        );
      }
    }

    return claims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static getClaimById(id: string): ClaimRecord | undefined {
    const claims = this.load<ClaimRecord[]>(STORAGE_KEY_CLAIMS, INITIAL_HOSPITAL_CLAIMS);
    return claims.find((c) => c.id === id || c.invoiceNo === id);
  }

  static createClaim(data: Partial<ClaimRecord>): ClaimRecord {
    let claims = this.load<ClaimRecord[]>(STORAGE_KEY_CLAIMS, INITIAL_HOSPITAL_CLAIMS);

    const claimNum = 8900 + claims.length + 1;
    const invNum = 800 + claims.length + 1;
    const nowIso = new Date().toISOString();

    const items: InvoiceItem[] = data.items || [];
    const subtotal = items.reduce((sum, it) => sum + Number(it.total || 0), 0);
    const discount = Number(data.discount || 0);
    const tax = Number(data.tax || 0);
    const totalAmount = Math.max(0, subtotal - discount + tax);

    // Calculate insurance & patient portions
    const isSelfPay = (data.insuranceProvider || "Self-Pay") === "Self-Pay";
    const insurancePortion = isSelfPay ? 0 : items.reduce((sum, it) => sum + Number(it.insuranceCovered || 0), 0);
    const patientPortion = isSelfPay ? totalAmount : Math.max(0, totalAmount - insurancePortion);

    // Upsert: If an invoice already exists for this encounter, update it directly
    const existingIndex = claims.findIndex(
      (c) => (data.encounterId && c.encounterId === data.encounterId) || (data.id && c.id === data.id)
    );

    if (existingIndex >= 0) {
      const existing = claims[existingIndex];
      const updatedClaim: ClaimRecord = {
        ...existing,
        ...data,
        id: existing.id,
        invoiceNo: existing.invoiceNo,
        items,
        subtotal,
        discount,
        tax,
        totalAmount,
        insurancePortion,
        patientPortion,
        balanceDue: Math.max(0, patientPortion - existing.amountPaid),
        status: data.status || (existing.amountPaid >= patientPortion ? "Paid" : "Accepted"),
        updatedAt: nowIso,
      };
      claims[existingIndex] = updatedClaim;
      this.save(STORAGE_KEY_CLAIMS, claims);
      return updatedClaim;
    }

    const newClaim: ClaimRecord = {
      id: data.id || `CLM-${claimNum}`,
      invoiceNo: data.invoiceNo || `INV-2026-0${invNum}`,
      patientId: data.patientId || `UMR${Math.floor(100000 + Math.random() * 900000)}`,
      patientName: data.patientName || "Hospital Patient",
      mrn: data.mrn || `100${Math.floor(100 + Math.random() * 899)}`,
      age: data.age || 40,
      gender: data.gender || "Other",
      phone: data.phone || "+91 98765 43210",
      department: data.department || "Outpatient",
      carePathway: data.carePathway,
      dateOfService: data.dateOfService || new Date().toISOString().split("T")[0],
      encounterId: data.encounterId,
      hospitalStayId: data.hospitalStayId,
      admissionId: data.admissionId,
      bedId: data.bedId,
      insuranceProvider: data.insuranceProvider || "Self-Pay",
      policyNumber: data.policyNumber || (isSelfPay ? "N/A - Self Pay" : "POL-UNSPECIFIED"),
      preAuthCode: data.preAuthCode,
      status: data.status || "Accepted",
      items,
      subtotal,
      discount,
      tax,
      totalAmount,
      insurancePortion,
      patientPortion,
      amountPaid: 0,
      balanceDue: patientPortion,
      payments: [],
      denialReason: data.denialReason,
      appealNotes: data.appealNotes,
      diagnosisCodes: data.diagnosisCodes && data.diagnosisCodes.length > 0 ? data.diagnosisCodes : ["Z00.00"],
      attendingDoctor: data.attendingDoctor || "Dr. Staff Physician",
      finalizedByNurse: data.finalizedByNurse,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    claims.unshift(newClaim);
    this.save(STORAGE_KEY_CLAIMS, claims);

    BillingRbacManager.logEvent({
      action: "INVOICE_CREATED",
      patientId: newClaim.patientId,
      patientName: newClaim.patientName,
      mrn: newClaim.mrn,
      invoiceNo: newClaim.invoiceNo,
      claimId: newClaim.id,
      financialAmount: newClaim.totalAmount,
      department: newClaim.department,
      reason: `Direct invoice created for ${newClaim.department} under UMR ${newClaim.patientId} (${newClaim.items.length} services).`,
    });

    return newClaim;
  }

  static updateClaim(id: string, updates: Partial<ClaimRecord>): ClaimRecord {
    const claims = this.load<ClaimRecord[]>(STORAGE_KEY_CLAIMS, INITIAL_HOSPITAL_CLAIMS);
    const idx = claims.findIndex((c) => c.id === id || c.invoiceNo === id);
    if (idx < 0) throw new Error("Claim not found");

    const current = claims[idx];
    const items = updates.items || current.items;
    const subtotal = items.reduce((sum, it) => sum + Number(it.total || 0), 0);
    const discount = updates.discount !== undefined ? Number(updates.discount) : current.discount;
    const tax = updates.tax !== undefined ? Number(updates.tax) : current.tax;
    const totalAmount = Math.max(0, subtotal - discount + tax);

    const isSelfPay = (updates.insuranceProvider || current.insuranceProvider) === "Self-Pay";
    const insurancePortion = isSelfPay ? 0 : items.reduce((sum, it) => sum + Number(it.insuranceCovered || 0), 0);
    const patientPortion = isSelfPay ? totalAmount : Math.max(0, totalAmount - insurancePortion);

    const amountPaid = updates.amountPaid !== undefined ? Number(updates.amountPaid) : current.amountPaid;
    const balanceDue = Math.max(0, patientPortion - amountPaid);

    let status = updates.status || current.status;
    if (balanceDue === 0 && (status === "Accepted" || status === "Ready" || status === "Draft")) {
      if (amountPaid >= patientPortion && (isSelfPay || current.status === "Accepted")) {
        status = "Paid";
      }
    }

    const updatedClaim: ClaimRecord = {
      ...current,
      ...updates,
      items,
      subtotal,
      discount,
      tax,
      totalAmount,
      insurancePortion,
      patientPortion,
      amountPaid,
      balanceDue,
      status,
      updatedAt: new Date().toISOString(),
    };

    claims[idx] = updatedClaim;
    this.save(STORAGE_KEY_CLAIMS, claims);
    return updatedClaim;
  }

  static submitClaim(id: string): ClaimRecord {
    const claim = this.getClaimById(id);
    if (!claim) throw new Error("Claim not found");

    const newStatus: ClaimStatus = claim.insuranceProvider === "Self-Pay" ? "Ready" : "Submitted";
    const updated = this.updateClaim(id, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    BillingRbacManager.logEvent({
      action: "CLAIM_SUBMITTED",
      patientId: claim.patientId,
      patientName: claim.patientName,
      mrn: claim.mrn,
      invoiceNo: claim.invoiceNo,
      claimId: claim.id,
      financialAmount: claim.insurancePortion,
      department: claim.department,
      reason: `Claim submitted to clearinghouse / payer (${claim.insuranceProvider}) for ₹${claim.insurancePortion.toLocaleString("en-IN")}.`,
    });

    return updated;
  }

  static bulkSubmitClaims(ids: string[]): number {
    let count = 0;
    ids.forEach((id) => {
      try {
        this.submitClaim(id);
        count++;
      } catch (e) {
        console.error(`Failed to submit claim ${id}:`, e);
      }
    });

    if (count > 0) {
      BillingRbacManager.logEvent({
        action: "CLAIM_BULK_SUBMITTED",
        patientId: "BATCH",
        patientName: `Batch (${count} Claims)`,
        mrn: "N/A",
        invoiceNo: "BATCH-SUBMIT",
        reason: `Bulk submission of ${count} claims processed to clearinghouse.`,
      });
    }

    return count;
  }

  static resubmitClaim(id: string, notes?: string): ClaimRecord {
    const claim = this.getClaimById(id);
    if (!claim) throw new Error("Claim not found");

    const updated = this.updateClaim(id, {
      status: "Submitted",
      denialReason: undefined,
      appealNotes: notes || `Corrected claim re-submitted to payer with updated clinical codes.`,
      updatedAt: new Date().toISOString(),
    });

    BillingRbacManager.logEvent({
      action: "CLAIM_RESUBMITTED",
      patientId: claim.patientId,
      patientName: claim.patientName,
      mrn: claim.mrn,
      invoiceNo: claim.invoiceNo,
      claimId: claim.id,
      financialAmount: claim.insurancePortion,
      department: claim.department,
      reason: `Claim resubmitted with corrections: ${notes || "Updated pre-authorization & diagnosis codes"}`,
    });

    return updated;
  }

  static appealClaim(id: string, appealNotes: string): ClaimRecord {
    const claim = this.getClaimById(id);
    if (!claim) throw new Error("Claim not found");

    const updated = this.updateClaim(id, {
      status: "Appeal",
      appealNotes,
      updatedAt: new Date().toISOString(),
    });

    BillingRbacManager.logEvent({
      action: "CLAIM_APPEALED",
      patientId: claim.patientId,
      patientName: claim.patientName,
      mrn: claim.mrn,
      invoiceNo: claim.invoiceNo,
      claimId: claim.id,
      financialAmount: claim.insurancePortion,
      department: claim.department,
      reason: `Formal appeal filed: ${appealNotes}`,
    });

    return updated;
  }

  static recordPayment(
    invoiceId: string,
    payment: {
      amount: number;
      paymentMethod: PaymentRecord["paymentMethod"];
      transactionRef?: string;
      collectedBy: string;
      notes?: string;
    }
  ): { claim: ClaimRecord; payment: PaymentRecord } {
    const claims = this.load<ClaimRecord[]>(STORAGE_KEY_CLAIMS, INITIAL_HOSPITAL_CLAIMS);
    const idx = claims.findIndex((c) => c.id === invoiceId || c.invoiceNo === invoiceId);
    if (idx < 0) throw new Error("Invoice not found");

    const claim = claims[idx];
    const newAmountPaid = (claim.amountPaid || 0) + payment.amount;
    const newBalanceDue = Math.max(0, claim.patientPortion - newAmountPaid);

    const rcptNum = 5500 + (claim.payments?.length || 0) + Math.floor(100 + Math.random() * 899);
    const newPayment: PaymentRecord = {
      id: `PAY-${Date.now()}`,
      invoiceId: claim.id,
      receiptNo: `RCPT-2026-${rcptNum}`,
      amount: payment.amount,
      paymentDate: new Date().toISOString(),
      paymentMethod: payment.paymentMethod,
      transactionRef: payment.transactionRef || `TXN-${Date.now().toString().slice(-6)}`,
      collectedBy: payment.collectedBy,
      notes: payment.notes,
    };

    const updatedPayments = [...(claim.payments || []), newPayment];

    let newStatus = claim.status;
    if (newBalanceDue === 0) {
      if (claim.insuranceProvider === "Self-Pay" || claim.status === "Accepted" || claim.insurancePortion === 0) {
        newStatus = "Paid";
      }
    }

    const updatedClaim: ClaimRecord = {
      ...claim,
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      status: newStatus,
      payments: updatedPayments,
      updatedAt: new Date().toISOString(),
    };

    claims[idx] = updatedClaim;
    this.save(STORAGE_KEY_CLAIMS, claims);

    BillingRbacManager.logEvent({
      action: "PAYMENT_RECORDED",
      patientId: claim.patientId,
      patientName: claim.patientName,
      mrn: claim.mrn,
      invoiceNo: claim.invoiceNo,
      claimId: claim.id,
      financialAmount: newPayment.amount,
      department: claim.department,
      reason: `Payment receipt ${newPayment.receiptNo} of ₹${newPayment.amount.toLocaleString("en-IN")} collected via ${newPayment.paymentMethod} (Ref: ${newPayment.transactionRef}). Remaining due: ₹${newBalanceDue.toLocaleString("en-IN")}.`,
    });

    return { claim: updatedClaim, payment: newPayment };
  }

  // ── MANUAL DEPARTMENT FINANCIAL CLEARANCE DISPATCH ─────────────────────────
  static dispatchClearanceToDepartment(
    patientIdOrName: string,
    department: "Laboratory" | "Radiology",
    receiptNo?: string,
    optionalTestName?: string
  ): { success: boolean; updatedCount: number; message: string } {
    const targetName = (patientIdOrName || "").toLowerCase().trim();
    const targetMrn = targetName.replace("umr", "").trim();
    const nowIso = new Date().toISOString();
    let updatedCount = 0;

    if (department === "Laboratory") {
      const labOrders = this.getLabOrders();
      let labChanged = false;
      const updatedLabOrders = labOrders.map((lo) => {
        const loName = (lo.patient || "").toLowerCase().trim();
        const loMrn = (lo.mrn || "").toLowerCase().replace("umr", "").trim();
        if (loName === targetName || (targetMrn && loMrn && (loMrn.includes(targetMrn) || targetMrn.includes(loMrn)))) {
          labChanged = true;
          updatedCount += 1;
          return {
            ...lo,
            paymentStatus: "Paid" as const,
            paidReceiptNo: receiptNo || lo.paidReceiptNo || `RCPT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            paidAt: nowIso,
          };
        }
        return lo;
      });

      if (labChanged) {
        this.save(STORAGE_KEY_LAB_ORDERS, updatedLabOrders);
        this.emitUpdate();
        return {
          success: true,
          updatedCount,
          message: `✓ Clearance dispatched to Laboratory for ${updatedCount} test(s). Receipt: ${receiptNo || "Issued"}.`,
        };
      } else {
        // Find matching claim to see if there were lab items
        const matchingClaim = this.getClaims().find(c => 
          c.patientName.toLowerCase().trim() === targetName || 
          c.patientId.toLowerCase().replace("umr", "").trim() === targetMrn
        );
        const labItems = matchingClaim ? matchingClaim.items.filter(i => i.category === "Laboratory") : [];
        const testName = optionalTestName || (labItems.length > 0 ? labItems.map(i => i.description).join(", ") : "Laboratory Diagnostic Panel");
        const newLabOrder: LabOrderRecord = {
          id: `LAB-${Date.now().toString().slice(-4)}`,
          patient: matchingClaim?.patientName || patientIdOrName,
          mrn: matchingClaim?.mrn || targetMrn || "100999",
          test: testName,
          priority: "Routine",
          collected: "—",
          status: "Pending",
          provider: matchingClaim?.attendingDoctor || "Attending Specialist",
          price: labItems.reduce((s, i) => s + i.total, 0) || 100,
          paymentStatus: "Paid",
          paidReceiptNo: receiptNo || `RCPT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          paidAt: nowIso,
        };
        const newLabOrders = [newLabOrder, ...labOrders];
        this.save(STORAGE_KEY_LAB_ORDERS, newLabOrders);
        this.emitUpdate();
        return {
          success: true,
          updatedCount: 1,
          message: `✓ Clearance dispatched to Laboratory for ${testName}. Receipt: ${receiptNo || "Issued"}.`,
        };
      }
    } else if (department === "Radiology") {
      const radStudies = this.getRadiologyStudies();
      let radChanged = false;
      const updatedRadStudies = radStudies.map((rs) => {
        const rsName = (rs.patient || "").toLowerCase().trim();
        const rsMrn = (rs.mrn || "").toLowerCase().replace("umr", "").trim();
        if (rsName === targetName || (targetMrn && rsMrn && (rsMrn.includes(targetMrn) || targetMrn.includes(rsMrn)))) {
          radChanged = true;
          updatedCount += 1;
          return {
            ...rs,
            paymentStatus: "Paid" as const,
            paidReceiptNo: receiptNo || rs.paidReceiptNo || `RCPT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            paidAt: nowIso,
          };
        }
        return rs;
      });

      if (radChanged) {
        this.save(STORAGE_KEY_RAD_STUDIES, updatedRadStudies);
        this.emitUpdate();
        return {
          success: true,
          updatedCount,
          message: `✓ Clearance dispatched to Radiology for ${updatedCount} study(ies). Receipt: ${receiptNo || "Issued"}.`,
        };
      } else {
        const matchingClaim = this.getClaims().find(c => 
          c.patientName.toLowerCase().trim() === targetName || 
          c.patientId.toLowerCase().replace("umr", "").trim() === targetMrn
        );
        const radItems = matchingClaim ? matchingClaim.items.filter(i => i.category === "Radiology / Imaging") : [];
        const studyName = optionalTestName || (radItems.length > 0 ? radItems.map(i => i.description).join(", ") : "Diagnostic Imaging Study");
        const newRadStudy: RadiologyStudyRecord = {
          id: `RAD-${Date.now().toString().slice(-4)}`,
          patient: matchingClaim?.patientName || patientIdOrName,
          mrn: matchingClaim?.mrn || targetMrn || "100999",
          study: studyName,
          modality: studyName.toLowerCase().includes("ct") ? "CT" : studyName.toLowerCase().includes("mri") ? "MR" : studyName.toLowerCase().includes("ultra") ? "US" : "XR",
          priority: "Routine",
          ordered: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          provider: matchingClaim?.attendingDoctor || "Attending Specialist",
          status: "Orders",
          room: "RAD-1",
          price: radItems.reduce((s, i) => s + i.total, 0) || 120,
          paymentStatus: "Paid",
          paidReceiptNo: receiptNo || `RCPT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          paidAt: nowIso,
        };
        const newRadStudies = [newRadStudy, ...radStudies];
        this.save(STORAGE_KEY_RAD_STUDIES, newRadStudies);
        this.emitUpdate();
        return {
          success: true,
          updatedCount: 1,
          message: `✓ Clearance dispatched to Radiology for ${studyName}. Receipt: ${receiptNo || "Issued"}.`,
        };
      }
    }

    return {
      success: false,
      updatedCount: 0,
      message: `No pending ${department} orders found for this patient.`,
    };
  }

  static getDepartmentClearanceStatus(
    patientIdOrName: string,
    claimContext?: ClaimRecord | null
  ): {
    hasLabOrders: boolean;
    labPaidCount: number;
    labPendingCount: number;
    labTestNames: string[];
    hasRadStudies: boolean;
    radPaidCount: number;
    radPendingCount: number;
    radStudyNames: string[];
    isNonDiagnostic: boolean;
  } {
    const targetName = (patientIdOrName || "").toLowerCase().trim();
    const targetMrn = targetName.replace("umr", "").trim();

    const labOrders = this.getLabOrders().filter((lo) => {
      const loName = (lo.patient || "").toLowerCase().trim();
      const loMrn = (lo.mrn || "").toLowerCase().replace("umr", "").trim();
      return loName === targetName || (targetMrn && loMrn && (loMrn.includes(targetMrn) || targetMrn.includes(loMrn)));
    });

    const radStudies = this.getRadiologyStudies().filter((rs) => {
      const rsName = (rs.patient || "").toLowerCase().trim();
      const rsMrn = (rs.mrn || "").toLowerCase().replace("umr", "").trim();
      return rsName === targetName || (targetMrn && rsMrn && (rsMrn.includes(targetMrn) || targetMrn.includes(rsMrn)));
    });

    // Check if claim items contain lab/radiology
    let claimLabItems: InvoiceItem[] = [];
    let claimRadItems: InvoiceItem[] = [];
    if (claimContext) {
      claimLabItems = claimContext.items.filter(i => i.category === "Laboratory" || claimContext.department === "Laboratory");
      claimRadItems = claimContext.items.filter(i => i.category === "Radiology / Imaging" || claimContext.department === "Radiology");
    }

    const hasLab = labOrders.length > 0 || claimLabItems.length > 0;
    const hasRad = radStudies.length > 0 || claimRadItems.length > 0;

    const labTestNames = labOrders.map(o => o.test);
    if (claimLabItems.length > 0 && labTestNames.length === 0) {
      labTestNames.push(...claimLabItems.map(i => i.description));
    }

    const radStudyNames = radStudies.map(s => s.study);
    if (claimRadItems.length > 0 && radStudyNames.length === 0) {
      radStudyNames.push(...claimRadItems.map(i => i.description));
    }

    const labPaid = labOrders.filter(lo => lo.paymentStatus === "Paid").length;
    const labPending = labOrders.filter(lo => lo.paymentStatus === "Payment Pending").length;

    const radPaid = radStudies.filter(rs => rs.paymentStatus === "Paid").length;
    const radPending = radStudies.filter(rs => rs.paymentStatus === "Payment Pending").length;

    return {
      hasLabOrders: hasLab,
      labPaidCount: labPaid,
      labPendingCount: labPending > 0 ? labPending : (claimLabItems.length > 0 && labPaid === 0 ? claimLabItems.length : 0),
      labTestNames,
      hasRadStudies: hasRad,
      radPaidCount: radPaid,
      radPendingCount: radPending > 0 ? radPending : (claimRadItems.length > 0 && radPaid === 0 ? claimRadItems.length : 0),
      radStudyNames,
      isNonDiagnostic: !hasLab && !hasRad,
    };
  }

  // ── DIAGNOSTIC PRE-PAYMENT CLEARANCE ACCESS METHODS ────────────────────────
  static getLabOrders(): LabOrderRecord[] {
    return this.load<LabOrderRecord[]>(STORAGE_KEY_LAB_ORDERS, INITIAL_LAB_ORDERS);
  }

  static updateLabOrder(id: string, updates: Partial<LabOrderRecord>): LabOrderRecord {
    const orders = this.getLabOrders();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx < 0) throw new Error("Lab order not found");
    const updated = { ...orders[idx], ...updates };
    orders[idx] = updated;
    this.save(STORAGE_KEY_LAB_ORDERS, orders);
    return updated;
  }

  static getRadiologyStudies(): RadiologyStudyRecord[] {
    return this.load<RadiologyStudyRecord[]>(STORAGE_KEY_RAD_STUDIES, INITIAL_RAD_STUDIES);
  }

  static updateRadiologyStudy(id: string, updates: Partial<RadiologyStudyRecord>): RadiologyStudyRecord {
    const studies = this.getRadiologyStudies();
    const idx = studies.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error("Radiology study not found");
    const updated = { ...studies[idx], ...updates };
    studies[idx] = updated;
    this.save(STORAGE_KEY_RAD_STUDIES, studies);
    return updated;
  }

  // ── EMERGENCY DEPARTMENT DISCHARGE / BED TRANSFER FINANCIAL CLEARANCE ──────
  static getErFinancialClearance(visitNoOrPatientId: string, optionalPatientName?: string): {
    isCleared: boolean;
    balanceDue: number;
    totalAmount: number;
    receiptNo?: string;
    invoiceNo?: string;
    claimId?: string;
    patientName?: string;
    hasPendingCharges?: boolean;
  } {
    const claims = this.getClaims();
    const deptCharges = this.getDepartmentCharges();
    const query = (visitNoOrPatientId || "").toLowerCase().trim();
    const nameQuery = (optionalPatientName || "").toLowerCase().trim();
    const mrnClean = query.replace("umr", "").trim();

    const matchingClaims = claims.filter((c) => {
      const pId = (c.patientId || "").toLowerCase().trim();
      const pMrn = (c.mrn || "").toLowerCase().trim();
      const encId = (c.encounterId || "").toLowerCase().trim();
      const invNo = (c.invoiceNo || "").toLowerCase().trim();
      const cId = (c.id || "").toLowerCase().trim();
      const cName = (c.patientName || "").toLowerCase().trim();

      return (
        (query && (pId === query || pMrn === mrnClean || encId === query || invNo === query || cId === query)) ||
        (query.length >= 4 && (pId.includes(query) || encId.includes(query) || pMrn.includes(mrnClean))) ||
        (nameQuery.length >= 3 && (cName.includes(nameQuery) || nameQuery.includes(cName)))
      );
    });

    const matchingDeptCharges = deptCharges.filter((d) => {
      const pId = (d.patientId || "").toLowerCase().trim();
      const pMrn = (d.mrn || "").toLowerCase().trim();
      const encId = (d.encounterId || "").toLowerCase().trim();
      const dName = (d.patientName || "").toLowerCase().trim();

      return (
        d.department === "Emergency" &&
        ((query && (pId === query || pMrn === mrnClean || encId === query)) ||
         (query.length >= 4 && (pId.includes(query) || encId.includes(query))) ||
         (nameQuery.length >= 3 && (dName.includes(nameQuery) || nameQuery.includes(dName))))
      );
    });

    if (matchingClaims.length === 0 && matchingDeptCharges.length === 0) {
      return { isCleared: true, balanceDue: 0, totalAmount: 0 };
    }

    const claimBalanceDue = matchingClaims.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
    const claimTotal = matchingClaims.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    
    const unInvoicedCharges = matchingDeptCharges.filter(d => d.status !== "Invoiced in Central Billing");
    const deptChargesDue = unInvoicedCharges.reduce((sum, d) => sum + (d.totalAmount || 0), 0);

    const totalBalanceDue = claimBalanceDue + (matchingClaims.length === 0 ? deptChargesDue : 0);
    const totalAmount = claimTotal || deptChargesDue;
    const latestClaim = matchingClaims[0];
    const latestPayment = latestClaim?.payments && latestClaim.payments.length > 0 ? latestClaim.payments[latestClaim.payments.length - 1] : undefined;

    return {
      isCleared: totalBalanceDue === 0,
      balanceDue: totalBalanceDue,
      totalAmount,
      receiptNo: latestPayment?.receiptNo || (totalBalanceDue === 0 ? "RCPT-2026-5501" : undefined),
      invoiceNo: latestClaim?.invoiceNo || (unInvoicedCharges[0]?.id),
      claimId: latestClaim?.id || (unInvoicedCharges[0]?.id),
      patientName: latestClaim?.patientName || unInvoicedCharges[0]?.patientName,
      hasPendingCharges: unInvoicedCharges.length > 0,
    };
  }

  // ── INPATIENT WARD / ICU DISCHARGE FINANCIAL CLEARANCE ──────────────────────
  static getInpatientFinancialClearance(patientIdOrBedId: string | number, optionalPatientName?: string): {
    isCleared: boolean;
    balanceDue: number;
    totalAmount: number;
    receiptNo?: string;
    invoiceNo?: string;
    claimId?: string;
    patientName?: string;
    hasPendingCharges?: boolean;
    pendingInvoices?: { invoiceNo: string; dueAmount: number; department: string }[];
  } {
    const claims = this.getClaims();
    const deptCharges = this.getDepartmentCharges();
    const query = String(patientIdOrBedId || "").toLowerCase().trim();
    const nameQuery = (optionalPatientName || "").toLowerCase().trim();
    const mrnClean = query.replace("umr", "").trim();

    const matchingClaims = claims.filter((c) => {
      const pId = (c.patientId || "").toLowerCase().trim();
      const pMrn = (c.mrn || "").toLowerCase().trim();
      const encId = (c.encounterId || "").toLowerCase().trim();
      const invNo = (c.invoiceNo || "").toLowerCase().trim();
      const cId = (c.id || "").toLowerCase().trim();
      const cName = (c.patientName || "").toLowerCase().trim();

      return (
        (query && (pId === query || pMrn === mrnClean || encId === query || invNo === query || cId === query)) ||
        (query.length >= 4 && (pId.includes(query) || encId.includes(query) || pMrn.includes(mrnClean))) ||
        (nameQuery.length >= 3 && (cName.includes(nameQuery) || nameQuery.includes(cName)))
      );
    });

    const matchingDeptCharges = deptCharges.filter((d) => {
      const pId = (d.patientId || "").toLowerCase().trim();
      const pMrn = (d.mrn || "").toLowerCase().trim();
      const encId = (d.encounterId || "").toLowerCase().trim();
      const dName = (d.patientName || "").toLowerCase().trim();

      return (
        (d.department === "Inpatient" || d.department === "ICU" || d.department === "Surgery") &&
        ((query && (pId === query || pMrn === mrnClean || encId === query)) ||
         (query.length >= 4 && (pId.includes(query) || encId.includes(query))) ||
         (nameQuery.length >= 3 && (dName.includes(nameQuery) || nameQuery.includes(dName))))
      );
    });

    if (matchingClaims.length === 0 && matchingDeptCharges.length === 0) {
      return { isCleared: true, balanceDue: 0, totalAmount: 0, pendingInvoices: [] };
    }

    const claimBalanceDue = matchingClaims.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
    const claimTotal = matchingClaims.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    
    const unInvoicedCharges = matchingDeptCharges.filter(d => d.status !== "Invoiced in Central Billing");
    const deptChargesDue = unInvoicedCharges.reduce((sum, d) => sum + (d.totalAmount || 0), 0);

    const totalBalanceDue = claimBalanceDue + (matchingClaims.length === 0 ? deptChargesDue : 0);
    const totalAmount = claimTotal || deptChargesDue;
    const latestClaim = matchingClaims[0];
    const latestPayment = latestClaim?.payments && latestClaim.payments.length > 0 ? latestClaim.payments[latestClaim.payments.length - 1] : undefined;

    const pendingInvoices = matchingClaims
      .filter((c) => (c.balanceDue || 0) > 0)
      .map((c) => ({
        invoiceNo: c.invoiceNo,
        dueAmount: c.balanceDue || 0,
        department: c.department,
      }));

    return {
      isCleared: totalBalanceDue === 0,
      balanceDue: totalBalanceDue,
      totalAmount,
      receiptNo: latestPayment?.receiptNo || (totalBalanceDue === 0 ? "RCPT-2026-5501" : undefined),
      invoiceNo: latestClaim?.invoiceNo || unInvoicedCharges[0]?.id,
      claimId: latestClaim?.id || unInvoicedCharges[0]?.id,
      patientName: latestClaim?.patientName || unInvoicedCharges[0]?.patientName,
      hasPendingCharges: unInvoicedCharges.length > 0,
      pendingInvoices,
    };
  }

  static getAllPayments(): (PaymentRecord & { patientName: string; patientId: string; mrn: string; invoiceNo: string; department: DepartmentType })[] {
    const claims = this.load<ClaimRecord[]>(STORAGE_KEY_CLAIMS, INITIAL_HOSPITAL_CLAIMS);
    const paymentsList: (PaymentRecord & { patientName: string; patientId: string; mrn: string; invoiceNo: string; department: DepartmentType })[] = [];
    claims.forEach((c) => {
      (c.payments || []).forEach((p) => {
        paymentsList.push({
          ...p,
          patientName: c.patientName,
          patientId: c.patientId,
          mrn: c.mrn,
          invoiceNo: c.invoiceNo,
          department: c.department,
        });
      });
    });
    return paymentsList.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }

  static voidClaim(id: string, reason: string): ClaimRecord {
    const claim = this.getClaimById(id);
    if (!claim) throw new Error("Invoice not found");

    const updated = this.updateClaim(id, {
      status: "Voided",
      balanceDue: 0,
      denialReason: `Voided / Reversed: ${reason}`,
      updatedAt: new Date().toISOString(),
    });

    BillingRbacManager.logEvent({
      action: "INVOICE_VOIDED",
      patientId: claim.patientId,
      patientName: claim.patientName,
      mrn: claim.mrn,
      invoiceNo: claim.invoiceNo,
      claimId: claim.id,
      financialAmount: claim.totalAmount,
      department: claim.department,
      originalValue: `Status: ${claim.status}, Total: ₹${claim.totalAmount.toLocaleString("en-IN")}`,
      newValue: "Status: Voided, Balance Due: ₹0",
      reason: `Authorized invoice void: ${reason}`,
    });

    return updated;
  }

  static applyDirectAdjustment(
    id: string,
    amount: number,
    adjustmentType: string,
    reason: string
  ): ClaimRecord {
    const claim = this.getClaimById(id);
    if (!claim) throw new Error("Invoice not found");

    const newDiscount = (claim.discount || 0) + amount;
    const newTotal = Math.max(0, claim.subtotal - newDiscount + (claim.tax || 0));
    const newPatientPortion = Math.max(0, claim.patientPortion - amount);
    const newBalanceDue = Math.max(0, newPatientPortion - (claim.amountPaid || 0));

    const updated = this.updateClaim(id, {
      discount: newDiscount,
      totalAmount: newTotal,
      patientPortion: newPatientPortion,
      balanceDue: newBalanceDue,
      updatedAt: new Date().toISOString(),
    });

    BillingRbacManager.logEvent({
      action: "ADJUSTMENT_APPLIED",
      patientId: claim.patientId,
      patientName: claim.patientName,
      mrn: claim.mrn,
      invoiceNo: claim.invoiceNo,
      claimId: claim.id,
      financialAmount: amount,
      department: claim.department,
      reason: `Direct adjustment applied (${adjustmentType}) for ₹${amount.toLocaleString("en-IN")}: ${reason}`,
    });

    return updated;
  }

  static deleteClaim(id: string): void {
    this.voidClaim(id, "Administrative removal / reversal requested");
  }

  // ── DEPARTMENT-TO-BILLING WORKQUEUE METHODS ─────────────────────────────────
  static getDepartmentCharges(filter?: {
    status?: string;
    department?: DepartmentType | "All";
    search?: string;
    umr?: string;
  }): DepartmentChargeRecord[] {
    let charges = this.load<DepartmentChargeRecord[]>(STORAGE_KEY_DEPT_CHARGES, INITIAL_DEPARTMENT_CHARGES);

    // Deduplicate charges by encounterId (keep the latest record if duplicates exist)
    const seenEncounters = new Set<string>();
    const deduplicated: DepartmentChargeRecord[] = [];
    let hasDuplicates = false;

    for (const c of charges) {
      const key = c.encounterId ? `${c.patientId || ""}-${c.encounterId}` : c.id;
      if (!seenEncounters.has(key)) {
        seenEncounters.add(key);
        // Normalize any old inflated item rates
        let itemsChanged = false;
        const normalizedItems = (c.items || []).map((it) => {
          let uPrice = it.unitPrice;
          const desc = (it.description || "").toLowerCase();
          if (it.category === "Consultation" || desc.includes("consultation")) {
            if (uPrice > 150) {
              uPrice = 100;
              itemsChanged = true;
            }
          } else if (it.category === "Laboratory" || desc.includes("blood") || desc.includes("cbc") || desc.includes("lab")) {
            if (uPrice > 120) {
              uPrice = 50;
              itemsChanged = true;
            }
          } else if (it.category === "Radiology / Imaging" || desc.includes("x-ray") || desc.includes("ultrasound") || desc.includes("ecg")) {
            if (uPrice > 200) {
              uPrice = desc.includes("mri") ? 350 : desc.includes("ultra") ? 100 : 60;
              itemsChanged = true;
            }
          } else if (it.category === "Procedure / Surgery" || it.category === "Nursing" || it.category === "Consumables") {
            if (uPrice > 250) {
              uPrice = 40;
              itemsChanged = true;
            }
          }
          if (itemsChanged) {
            const total = uPrice * (it.quantity || 1);
            return {
              ...it,
              unitPrice: uPrice,
              total,
              insuranceCovered: Math.round(total * 0.8),
              patientPayable: Math.round(total * 0.2),
            };
          }
          return it;
        });

        if (itemsChanged || c.totalAmount > 2000) {
          const subtotal = normalizedItems.reduce((sum, it) => sum + Number(it.total || 0), 0);
          deduplicated.push({
            ...c,
            items: normalizedItems,
            subtotal,
            totalAmount: subtotal,
          });
          hasDuplicates = true;
        } else {
          deduplicated.push(c);
        }
      } else {
        hasDuplicates = true;
      }
    }

    if (hasDuplicates) {
      charges = deduplicated;
      this.save(STORAGE_KEY_DEPT_CHARGES, charges);
    }

    if (filter) {
      if (filter.department && filter.department !== "All") {
        charges = charges.filter((c) => c.department === filter.department);
      }
      if (filter.status && filter.status !== "All") {
        charges = charges.filter((c) => c.status === filter.status);
      }
      if (filter.umr && filter.umr.trim()) {
        const u = filter.umr.trim().toLowerCase();
        charges = charges.filter((c) => c.patientId.toLowerCase() === u || c.mrn.toLowerCase() === u);
      }
      if (filter.search && filter.search.trim()) {
        const q = filter.search.trim().toLowerCase();
        charges = charges.filter(
          (c) =>
            c.patientName.toLowerCase().includes(q) ||
            c.mrn.toLowerCase().includes(q) ||
            c.patientId.toLowerCase().includes(q) ||
            c.encounterId.toLowerCase().includes(q) ||
            (c.hospitalStayId && c.hospitalStayId.toLowerCase().includes(q)) ||
            c.items.some((it) => it.description.toLowerCase().includes(q) || it.cptCode.toLowerCase().includes(q))
        );
      }
    }

    return charges.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static getDepartmentChargeById(id: string): DepartmentChargeRecord | undefined {
    const charges = this.load<DepartmentChargeRecord[]>(STORAGE_KEY_DEPT_CHARGES, INITIAL_DEPARTMENT_CHARGES);
    return charges.find((c) => c.id === id || c.encounterId === id);
  }

  static createDepartmentCharge(data: Partial<DepartmentChargeRecord>): DepartmentChargeRecord {
    let charges = this.load<DepartmentChargeRecord[]>(STORAGE_KEY_DEPT_CHARGES, INITIAL_DEPARTMENT_CHARGES);
    const nowIso = new Date().toISOString();
    const id = `DCHG-${Date.now().toString().slice(-6)}`;

    const items = data.items || [];
    const subtotal = items.reduce((sum, it) => sum + Number(it.total || 0), 0);

    // Upsert: If a charge packet already exists for this encounter, update it instead of creating a duplicate
    const existingIndex = charges.findIndex(
      (c) => (data.encounterId && c.encounterId === data.encounterId) ||
        (data.id && c.id === data.id)
    );

    if (existingIndex >= 0) {
      const existing = charges[existingIndex];
      const updatedRecord: DepartmentChargeRecord = {
        ...existing,
        ...data,
        id: existing.id,
        items,
        subtotal,
        totalAmount: subtotal,
        status: data.status || existing.status,
        finalizedAt: data.finalizedAt || existing.finalizedAt || nowIso,
      };
      charges[existingIndex] = updatedRecord;
      // Also purge any historical duplicate packets with same encounterId
      if (data.encounterId) {
        charges = charges.filter((c, idx) => idx === existingIndex || c.encounterId !== data.encounterId);
      }
      this.save(STORAGE_KEY_DEPT_CHARGES, charges);
      return updatedRecord;
    }

    const newRecord: DepartmentChargeRecord = {
      id,
      patientId: data.patientId || `UMR${Math.floor(100000 + Math.random() * 900000)}`,
      mrn: data.mrn || `100${Math.floor(100 + Math.random() * 899)}`,
      patientName: data.patientName || "Department Patient",
      age: data.age || 40,
      gender: data.gender || "Other",
      phone: data.phone || "+91 98765 43210",
      encounterId: data.encounterId || `ENC-${Date.now().toString().slice(-6)}`,
      hospitalStayId: data.hospitalStayId,
      department: data.department || "Outpatient",
      carePathway: data.carePathway,
      dateOfService: data.dateOfService || nowIso.split("T")[0],
      insuranceProvider: data.insuranceProvider || "Star Health",
      policyNumber: data.policyNumber || "SH-POL-2026",
      preAuthCode: data.preAuthCode,
      attendingDoctor: data.attendingDoctor || "Dr. Staff Physician",
      diagnosisCodes: data.diagnosisCodes || ["Z00.00"],
      items,
      subtotal,
      totalAmount: subtotal,
      status: data.status || "Accumulating Charges",
      verifiedByNurse: data.verifiedByNurse,
      finalizedAt: data.finalizedAt,
      createdAt: nowIso,
      notes: data.notes,
    };

    charges.unshift(newRecord);
    this.save(STORAGE_KEY_DEPT_CHARGES, charges);

    BillingRbacManager.logEvent({
      action: "CHARGE_ADDED",
      patientId: newRecord.patientId,
      patientName: newRecord.patientName,
      mrn: newRecord.mrn,
      invoiceNo: "DEPT-RUNNING",
      financialAmount: newRecord.totalAmount,
      department: newRecord.department,
      reason: `Department charge sheet created for ${newRecord.department} under UMR ${newRecord.patientId} (${newRecord.items.length} services attached).`,
    });

    return newRecord;
  }

  static addServiceToDepartmentCharge(chargeId: string, item: Omit<InvoiceItem, "id">): DepartmentChargeRecord {
    const charges = this.load<DepartmentChargeRecord[]>(STORAGE_KEY_DEPT_CHARGES, INITIAL_DEPARTMENT_CHARGES);
    const idx = charges.findIndex((c) => c.id === chargeId);
    if (idx < 0) throw new Error("Department charge sheet not found");

    const current = charges[idx];
    const newItem: InvoiceItem = {
      ...item,
      id: `IT-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 89)}`,
    };

    const updatedItems = [...current.items, newItem];
    const subtotal = updatedItems.reduce((sum, it) => sum + Number(it.total || 0), 0);

    const updated: DepartmentChargeRecord = {
      ...current,
      items: updatedItems,
      subtotal,
      totalAmount: subtotal,
    };

    charges[idx] = updated;
    this.save(STORAGE_KEY_DEPT_CHARGES, charges);

    BillingRbacManager.logEvent({
      action: "CHARGE_ADDED",
      patientId: current.patientId,
      patientName: current.patientName,
      mrn: current.mrn,
      invoiceNo: "DEPT-RUNNING",
      financialAmount: newItem.total,
      department: current.department,
      reason: `Service added under UMR ${current.patientId} (${current.department}): "${newItem.description}" (₹${newItem.total.toLocaleString("en-IN")}).`,
    });

    return updated;
  }

  static finalizeDepartmentCharges(chargeId: string, verifiedByNurse: string, notes?: string): DepartmentChargeRecord {
    const charges = this.load<DepartmentChargeRecord[]>(STORAGE_KEY_DEPT_CHARGES, INITIAL_DEPARTMENT_CHARGES);
    const idx = charges.findIndex((c) => c.id === chargeId);
    if (idx < 0) throw new Error("Department charge sheet not found");

    const current = charges[idx];
    const nowIso = new Date().toISOString();

    const updated: DepartmentChargeRecord = {
      ...current,
      status: "Finalized by Dept",
      verifiedByNurse,
      finalizedAt: nowIso,
      notes: notes || current.notes || "All clinical charges verified and finalized by department nurse. Transferred to Universal Billing.",
    };

    charges[idx] = updated;
    this.save(STORAGE_KEY_DEPT_CHARGES, charges);

    BillingRbacManager.logEvent({
      action: "CHARGE_ADDED",
      patientId: current.patientId,
      patientName: current.patientName,
      mrn: current.mrn,
      invoiceNo: "DEPT-FINALIZED",
      financialAmount: current.totalAmount,
      department: current.department,
      reason: `Department charges finalized by ${verifiedByNurse} for UMR ${current.patientId} (Total: ₹${current.totalAmount.toLocaleString("en-IN")}). Sent to Central Billing queue.`,
    });

    return updated;
  }

  static convertDepartmentChargeToInvoice(
    chargeId: string,
    billingStaffName: string,
    customOptions?: { insuranceProvider?: string; preAuthCode?: string; discount?: number }
  ): ClaimRecord {
    const charges = this.load<DepartmentChargeRecord[]>(STORAGE_KEY_DEPT_CHARGES, INITIAL_DEPARTMENT_CHARGES);
    const idx = charges.findIndex((c) => c.id === chargeId);
    if (idx < 0) throw new Error("Department charge packet not found");

    const deptRecord = charges[idx];
    const payer = customOptions?.insuranceProvider || deptRecord.insuranceProvider || "Star Health";
    const isSelfPay = payer === "Self-Pay";

    const mappedItems: InvoiceItem[] = deptRecord.items.map((it) => {
      const ins = isSelfPay ? 0 : Math.round(it.total * 0.8);
      const pt = it.total - ins;
      return {
        ...it,
        insuranceCovered: ins,
        patientPayable: pt,
      };
    });

    const newClaim = this.createClaim({
      patientId: deptRecord.patientId,
      patientName: deptRecord.patientName,
      mrn: deptRecord.mrn,
      age: deptRecord.age,
      gender: deptRecord.gender,
      phone: deptRecord.phone,
      department: deptRecord.department,
      carePathway: deptRecord.carePathway,
      dateOfService: deptRecord.dateOfService,
      encounterId: deptRecord.encounterId,
      hospitalStayId: deptRecord.hospitalStayId,
      insuranceProvider: payer,
      policyNumber: deptRecord.policyNumber,
      preAuthCode: customOptions?.preAuthCode || deptRecord.preAuthCode,
      attendingDoctor: deptRecord.attendingDoctor,
      diagnosisCodes: deptRecord.diagnosisCodes,
      finalizedByNurse: deptRecord.verifiedByNurse,
      discount: customOptions?.discount || 0,
      status: "Ready",
      items: mappedItems,
    });

    // Mark department record as invoiced
    deptRecord.status = "Invoiced in Central Billing";
    deptRecord.invoiceId = newClaim.id;
    charges[idx] = deptRecord;
    this.save(STORAGE_KEY_DEPT_CHARGES, charges);

    BillingRbacManager.logEvent({
      action: "INVOICE_FINALIZED",
      patientId: newClaim.patientId,
      patientName: newClaim.patientName,
      mrn: newClaim.mrn,
      invoiceNo: newClaim.invoiceNo,
      claimId: newClaim.id,
      financialAmount: newClaim.totalAmount,
      department: newClaim.department,
      reason: `Central billing generated official invoice ${newClaim.invoiceNo} from finalized ${deptRecord.department} charge packet (Staff: ${billingStaffName}).`,
    });

    return newClaim;
  }

  static consolidateHospitalStayInvoices(
    hospitalStayId: string,
    billingStaffName: string
  ): ClaimRecord {
    const charges = this.load<DepartmentChargeRecord[]>(STORAGE_KEY_DEPT_CHARGES, INITIAL_DEPARTMENT_CHARGES);
    const stayCharges = charges.filter(
      (c) => (c.hospitalStayId === hospitalStayId || c.encounterId === hospitalStayId) && c.status !== "Invoiced in Central Billing"
    );

    if (stayCharges.length === 0) throw new Error("No active stay charges found to consolidate");

    const primary = stayCharges[0];
    const allItems: InvoiceItem[] = [];
    stayCharges.forEach((c) => {
      allItems.push(...c.items);
    });

    const isSelfPay = primary.insuranceProvider === "Self-Pay";
    const mappedItems = allItems.map((it) => {
      const ins = isSelfPay ? 0 : Math.round(it.total * 0.8);
      const pt = it.total - ins;
      return {
        ...it,
        insuranceCovered: ins,
        patientPayable: pt,
      };
    });

    const consolidatedClaim = this.createClaim({
      patientId: primary.patientId,
      patientName: primary.patientName,
      mrn: primary.mrn,
      age: primary.age,
      gender: primary.gender,
      phone: primary.phone,
      department: "Inpatient",
      carePathway: `Consolidated Hospital Stay (${stayCharges.map((s) => s.department).join(" → ")})`,
      dateOfService: primary.dateOfService,
      hospitalStayId,
      insuranceProvider: primary.insuranceProvider,
      policyNumber: primary.policyNumber,
      preAuthCode: primary.preAuthCode,
      attendingDoctor: primary.attendingDoctor,
      diagnosisCodes: primary.diagnosisCodes,
      status: "Ready",
      items: mappedItems,
    });

    stayCharges.forEach((sc) => {
      sc.status = "Invoiced in Central Billing";
      sc.invoiceId = consolidatedClaim.id;
    });
    this.save(STORAGE_KEY_DEPT_CHARGES, charges);

    BillingRbacManager.logEvent({
      action: "INVOICE_FINALIZED",
      patientId: consolidatedClaim.patientId,
      patientName: consolidatedClaim.patientName,
      mrn: consolidatedClaim.mrn,
      invoiceNo: consolidatedClaim.invoiceNo,
      claimId: consolidatedClaim.id,
      financialAmount: consolidatedClaim.totalAmount,
      department: "Inpatient",
      reason: `Consolidated single hospital stay invoice ${consolidatedClaim.invoiceNo} created across ${stayCharges.length} departments for UMR ${consolidatedClaim.patientId} (Staff: ${billingStaffName}).`,
    });

    return consolidatedClaim;
  }

  // ── UMR CENTRAL FINANCIAL LEDGER ENGINE ─────────────────────────────────────
  /**
   * Constructs the complete, authoritative financial ledger for any patient by UMR.
   * Aggregates all OP, ER, Inpatient, ICU, Surgery, Lab, and Radiology charges,
   * invoices, claims, and payment records without missing or duplicating transactions.
   */
  static getUmrLedger(umrQuery: string): UmrFinancialLedger | null {
    if (!umrQuery || !umrQuery.trim()) return null;
    const cleanQuery = umrQuery.trim().toUpperCase();

    // 1. Search comprehensively across all collections
    const allClaimsList = this.getClaims();
    const allDeptChargesList = this.getDepartmentCharges();
    const opPatients = db.getPatients();
    const erPatients = ErDatabase.getPatients();
    const beds = BedDatabase.getBeds();

    // Priority 1: Exact UMR match
    let matchedUmr = "";
    let matchedName = "";
    let matchedMrn = "";
    let matchedAge = 40;
    let matchedGender: "Male" | "Female" | "Other" = "Male";
    let matchedPhone = "+91 98765 43210";
    let matchedPayer = "Self-Pay";
    let matchedPolicy = "N/A";

    const exactClaim = allClaimsList.find(c => c.patientId.toUpperCase() === cleanQuery);
    const exactDept = allDeptChargesList.find(c => c.patientId.toUpperCase() === cleanQuery);
    const exactOp = opPatients.find(p => p.umr.toUpperCase() === cleanQuery);
    const exactEr = erPatients.find(p => p.patient_id.toUpperCase() === cleanQuery);

    if (exactClaim) {
      matchedUmr = exactClaim.patientId;
      matchedName = exactClaim.patientName;
      matchedMrn = exactClaim.mrn;
      matchedAge = exactClaim.age;
      matchedGender = exactClaim.gender;
      matchedPhone = exactClaim.phone;
      matchedPayer = exactClaim.insuranceProvider;
      matchedPolicy = exactClaim.policyNumber;
    } else if (exactDept) {
      matchedUmr = exactDept.patientId;
      matchedName = exactDept.patientName;
      matchedMrn = exactDept.mrn;
      matchedAge = exactDept.age;
      matchedGender = exactDept.gender;
      matchedPhone = exactDept.phone;
      matchedPayer = exactDept.insuranceProvider;
      matchedPolicy = exactDept.policyNumber;
    } else if (exactOp) {
      matchedUmr = exactOp.umr;
      matchedName = exactOp.name;
      matchedMrn = exactOp.umr.replace(/\D/g, "") || "100501";
      matchedAge = exactOp.age;
      matchedGender = (exactOp.sex === "Female" ? "Female" : "Male") as any;
      matchedPhone = exactOp.phone;
      matchedPayer = (exactOp as any).insurance || "Self-Pay";
    } else if (exactEr) {
      matchedUmr = exactEr.patient_id;
      matchedName = `${exactEr.name} ${exactEr.last_name}`.trim();
      matchedMrn = exactEr.patient_id.replace(/\D/g, "") || "100501";
      matchedAge = exactEr.age;
      matchedGender = (exactEr.gender === "Female" ? "Female" : "Male") as any;
      matchedPhone = exactEr.phone;
    } else {
      // Priority 2: Substring Name or Phone or MRN match
      const nameOp = opPatients.find(p => p.name.toUpperCase().includes(cleanQuery) || p.phone.includes(cleanQuery));
      const nameClaim = allClaimsList.find(c => c.patientName.toUpperCase().includes(cleanQuery) || c.phone.includes(cleanQuery) || c.mrn.includes(cleanQuery));
      const nameDept = allDeptChargesList.find(c => c.patientName.toUpperCase().includes(cleanQuery) || c.phone.includes(cleanQuery) || c.mrn.includes(cleanQuery));
      const nameEr = erPatients.find(p => `${p.name} ${p.last_name}`.toUpperCase().includes(cleanQuery) || p.phone.includes(cleanQuery));

      if (nameOp) {
        matchedUmr = nameOp.umr;
        matchedName = nameOp.name;
        matchedAge = nameOp.age;
        matchedGender = (nameOp.sex === "Female" ? "Female" : "Male") as any;
        matchedPhone = nameOp.phone;
      } else if (nameClaim) {
        matchedUmr = nameClaim.patientId;
        matchedName = nameClaim.patientName;
        matchedAge = nameClaim.age;
        matchedGender = nameClaim.gender;
        matchedPhone = nameClaim.phone;
      } else if (nameDept) {
        matchedUmr = nameDept.patientId;
        matchedName = nameDept.patientName;
        matchedAge = nameDept.age;
        matchedGender = nameDept.gender;
        matchedPhone = nameDept.phone;
      } else if (nameEr) {
        matchedUmr = nameEr.patient_id;
        matchedName = `${nameEr.name} ${nameEr.last_name}`.trim();
        matchedAge = nameEr.age;
        matchedGender = (nameEr.gender === "Female" ? "Female" : "Male") as any;
        matchedPhone = nameEr.phone;
      } else {
        matchedUmr = cleanQuery;
        matchedName = "Hospital Patient";
      }
    }

    const effectiveUmr = matchedUmr || cleanQuery;
    const effectiveName = matchedName || "Hospital Patient";
    const mrn = matchedMrn || effectiveUmr.replace(/\D/g, "") || "100501";
    const age = matchedAge || 40;
    const gender = matchedGender || "Male";
    const phone = matchedPhone || "+91 98765 43210";

    // 2. Fetch all Invoices & Claims linked to this UMR
    const allClaims = this.getClaims({ umr: effectiveUmr });

    // 3. Fetch all Department Charge packets linked to this UMR
    const allDeptCharges = this.getDepartmentCharges({ umr: effectiveUmr });

    // 4. Build Encounters list from OP, ER, Bed DB, and Dept Charges
    const encounters: EncounterChargeSummary[] = [];
    const seenEncIds = new Set<string>();

    // Add from Dept Charges
    allDeptCharges.forEach((dc) => {
      if (!seenEncIds.has(dc.encounterId)) {
        seenEncIds.add(dc.encounterId);
        encounters.push({
          encounterId: dc.encounterId,
          encounterType: dc.department === "Outpatient" ? "Outpatient" : dc.department === "Emergency" ? "Emergency" : dc.department === "ICU" ? "ICU" : dc.department === "Surgery" ? "Surgery" : "Inpatient Ward",
          department: dc.department,
          date: dc.dateOfService,
          doctor: dc.attendingDoctor,
          status: dc.status,
          items: dc.items,
          totalCharges: dc.totalAmount,
          isFinalized: dc.status === "Finalized by Dept" || dc.status === "Invoiced in Central Billing",
          isInvoiced: dc.status === "Invoiced in Central Billing",
          invoiceId: dc.invoiceId,
        });
      }
    });

    // Add OP Encounters from db.ts if not yet in Dept Charges
    const opEncounters = db.getEncountersForPatient(effectiveUmr);
    opEncounters.forEach((enc) => {
      if (!seenEncIds.has(enc.id)) {
        seenEncIds.add(enc.id);
        const items: InvoiceItem[] = [
          {
            id: `OP-IT-${enc.id}-1`,
            description: `${enc.dept} Doctor Consultation (${enc.assignedDoctor || "Attending Specialist"})`,
            category: "Consultation",
            cptCode: "99205",
            quantity: 1,
            unitPrice: 100,
            total: 100,
            insuranceCovered: 80,
            patientPayable: 20,
            orderedBy: enc.assignedDoctor || "OP Physician",
            orderedAt: enc.registrationTime,
          },
        ];

        // Add Lab / Rad investigations ordered by doctor
        (enc.investigations || []).forEach((inv, idx) => {
          const isRad = inv.toLowerCase().includes("x-ray") || inv.toLowerCase().includes("ct") || inv.toLowerCase().includes("mri") || inv.toLowerCase().includes("ultra");
          const uPrice = isRad ? 120 : 50;
          items.push({
            id: `OP-IT-${enc.id}-INV-${idx + 1}`,
            description: inv,
            category: isRad ? "Radiology / Imaging" : "Laboratory",
            cptCode: isRad ? "71046" : "85025",
            quantity: 1,
            unitPrice: uPrice,
            total: uPrice,
            insuranceCovered: Math.round(uPrice * 0.8),
            patientPayable: Math.round(uPrice * 0.2),
            orderedBy: enc.assignedDoctor || "OP Physician",
          });
        });

        const total = items.reduce((sum, i) => sum + i.total, 0);
        encounters.push({
          encounterId: enc.id,
          encounterType: "Outpatient",
          department: "Outpatient",
          date: enc.registrationTime.includes("-") ? enc.registrationTime.split(" ")[0] : new Date().toISOString().split("T")[0],
          doctor: enc.assignedDoctor || "Dr. Rajesh Sharma",
          status: enc.status === "OP Completed" ? "Finalized by Dept" : "Accumulating Charges",
          items,
          totalCharges: total,
          isFinalized: enc.status === "OP Completed",
          isInvoiced: false,
        });
      }
    });

    // Add ER Visits from erDb.ts if not yet recorded
    const erVisits = ErDatabase.getVisits("all").filter(v => v.patient_id === effectiveUmr);
    erVisits.forEach((v) => {
      const vEncId = v.visit_no;
      if (!seenEncIds.has(vEncId)) {
        seenEncIds.add(vEncId);
        const items: InvoiceItem[] = [
          {
            id: `ER-IT-${v.id}-1`,
            description: `Emergency Triage & Acute Care Evaluation (${v.triage_category || "B2"})`,
            category: "Consultation",
            cptCode: "99284",
            quantity: 1,
            unitPrice: 150,
            total: 150,
            insuranceCovered: 120,
            patientPayable: 30,
            orderedBy: v.assigned_doctor_name || "Emergency Physician",
          },
        ];

        (v.investigations || []).forEach((inv, idx) => {
          const invPrice = inv.category.toLowerCase().includes("radiology") ? 120 : inv.category.toLowerCase().includes("cardiology") ? 80 : 50;
          items.push({
            id: `ER-IT-${v.id}-INV-${idx + 1}`,
            description: inv.test_name,
            category: inv.category.toLowerCase().includes("cardiology") ? "Consultation" : inv.category.toLowerCase().includes("radiology") ? "Radiology / Imaging" : "Laboratory",
            cptCode: "84484",
            quantity: 1,
            unitPrice: invPrice,
            total: invPrice,
            insuranceCovered: Math.round(invPrice * 0.8),
            patientPayable: Math.round(invPrice * 0.2),
            orderedBy: inv.ordered_by,
          });
        });

        const total = items.reduce((sum, i) => sum + i.total, 0);
        encounters.push({
          encounterId: vEncId,
          encounterType: "Emergency",
          department: "Emergency",
          date: v.arrival_at ? v.arrival_at.split("T")[0] : new Date().toISOString().split("T")[0],
          doctor: v.assigned_doctor_name || "Dr. Vikram Seth",
          status: v.closed_at ? "Finalized by Dept" : "Accumulating Charges",
          items,
          totalCharges: total,
          isFinalized: Boolean(v.closed_at),
          isInvoiced: false,
        });
      }
    });

    // 5. Aggregate Financials
    const totalHistoricalCharges = encounters.reduce((sum, e) => sum + e.totalCharges, 0);
    const totalInvoiced = allClaims.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    const totalPaid = allClaims.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
    const outstandingBalance = allClaims.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
    const insurancePending = allClaims
      .filter(c => c.status !== "Paid")
      .reduce((sum, c) => sum + Math.max(0, (c.insurancePortion || 0) - (c.amountPaid || 0)), 0);

    const allPayments = allClaims.flatMap(c => c.payments || []);

    return {
      umr: effectiveUmr,
      patientName: effectiveName,
      mrn,
      age,
      gender,
      phone,
      insuranceProvider: allClaims[0]?.insuranceProvider || allDeptCharges[0]?.insuranceProvider || "Star Health",
      policyNumber: allClaims[0]?.policyNumber || allDeptCharges[0]?.policyNumber || "SH-9921045",
      totalHistoricalCharges,
      totalInvoiced,
      totalPaid,
      outstandingBalance,
      insurancePending,
      encounters,
      invoices: allClaims,
      payments: allPayments,
      activeHospitalStayId: allDeptCharges.find(c => c.hospitalStayId)?.hospitalStayId,
    };
  }

  /**
   * Returns a list of all distinct UMR ledgers available in the hospital system
   */
  static getAllUmrLedgers(): UmrFinancialLedger[] {
    const umrSet = new Set<string>();

    // Collect all UMRs
    this.getClaims().forEach(c => umrSet.add(c.patientId));
    this.getDepartmentCharges().forEach(c => umrSet.add(c.patientId));
    db.getPatients().forEach(p => umrSet.add(p.umr));
    ErDatabase.getPatients().forEach(p => umrSet.add(p.patient_id));
    BedDatabase.getBeds().forEach(b => { if (b.patient_id) umrSet.add(b.patient_id); });

    const ledgers: UmrFinancialLedger[] = [];
    umrSet.forEach(umr => {
      const ledger = this.getUmrLedger(umr);
      if (ledger) ledgers.push(ledger);
    });

    return ledgers.sort((a, b) => b.totalHistoricalCharges - a.totalHistoricalCharges);
  }

  // ── RESET TO CLEAN SEED DATA ────────────────────────────────────────────────
  static resetToActualData(): void {
    this.save(STORAGE_KEY_CLAIMS, INITIAL_HOSPITAL_CLAIMS);
    this.save(STORAGE_KEY_DEPT_CHARGES, INITIAL_DEPARTMENT_CHARGES);
  }

  // ── FINANCIAL METRICS & KPI ENGINE ──────────────────────────────────────────
  static getFinancialMetrics(): FinancialMetrics {
    const claims = this.load<ClaimRecord[]>(STORAGE_KEY_CLAIMS, INITIAL_HOSPITAL_CLAIMS);
    const activeClaims = claims.filter((c) => c.status !== "Voided");

    const totalChargesMtd = activeClaims.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    const insurancePending = activeClaims
      .filter((c) => c.status !== "Paid")
      .reduce((sum, c) => sum + Math.max(0, (c.insurancePortion || 0) - (c.amountPaid || 0)), 0);
    const patientBalance = activeClaims.reduce((sum, c) => sum + (c.balanceDue || 0), 0);

    const deniedClaims = activeClaims.filter((c) => c.status === "Denied" || c.status === "Rejected" || c.status === "Appeal");
    const deniedCount = deniedClaims.length;
    const deniedAmount = deniedClaims.reduce((sum, c) => sum + (c.totalAmount || 0), 0);

    const paidClaims = activeClaims.filter((c) => c.status === "Paid");
    const totalCollected = activeClaims.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
    const collectionsRate = totalChargesMtd > 0 ? Number(((totalCollected / totalChargesMtd) * 100).toFixed(1)) : 94.2;

    const daysInAr = 28.6;
    const firstPassRate = 89.4;
    const avgClaimValue = activeClaims.length > 0 ? Math.round(totalChargesMtd / activeClaims.length) : 28500;

    return {
      totalChargesMtd,
      insurancePending,
      patientBalance,
      deniedCount,
      deniedAmount,
      collectionsRate,
      daysInAr,
      firstPassRate,
      avgClaimValue,
      paidCount: paidClaims.length,
      totalClaimsCount: activeClaims.length,
    };
  }

  static getPayerMixMetrics(): PayerMixItem[] {
    const claims = this.load<ClaimRecord[]>(STORAGE_KEY_CLAIMS, INITIAL_HOSPITAL_CLAIMS);
    const totalAmount = claims.reduce((sum, c) => sum + (c.totalAmount || 0), 0);

    const payerMap: { [payer: string]: { count: number; amount: number; color: string } } = {
      "Star Health": { count: 0, amount: 0, color: "#1B4FD8" },
      "HDFC ERGO": { count: 0, amount: 0, color: "#0284C7" },
      "ICICI Lombard": { count: 0, amount: 0, color: "#7C3AED" },
      "Care Health": { count: 0, amount: 0, color: "#16A34A" },
      "Bajaj Allianz": { count: 0, amount: 0, color: "#D97706" },
      "PM-JAY (Ayushman Bharat)": { count: 0, amount: 0, color: "#0EA5E9" },
      "Self-Pay": { count: 0, amount: 0, color: "#DC2626" },
    };

    claims.forEach((c) => {
      const payer = c.insuranceProvider || "Self-Pay";
      if (!payerMap[payer]) {
        payerMap[payer] = { count: 0, amount: 0, color: "#64748B" };
      }
      payerMap[payer].count += 1;
      payerMap[payer].amount += c.totalAmount || 0;
    });

    return Object.entries(payerMap).map(([payer, val]) => ({
      payer,
      claimCount: val.count,
      totalAmount: val.amount,
      pct: totalAmount > 0 ? Math.round((val.amount / totalAmount) * 100) : 0,
      color: val.color,
    }));
  }

  static getArAgingMetrics(): ArAgingItem[] {
    const claims = this.load<ClaimRecord[]>(STORAGE_KEY_CLAIMS, INITIAL_HOSPITAL_CLAIMS);
    const unpaidClaims = claims.filter((c) => c.status !== "Paid" && c.totalAmount > 0);
    const totalUnpaid = unpaidClaims.reduce((sum, c) => sum + (c.totalAmount || 0), 0);

    const buckets: ArAgingItem[] = [
      { bucket: "0–30 Days", amount: Math.round(totalUnpaid * 0.55), pct: 55, color: "#16A34A", count: Math.max(1, Math.round(unpaidClaims.length * 0.55)) },
      { bucket: "31–60 Days", amount: Math.round(totalUnpaid * 0.25), pct: 25, color: "#D97706", count: Math.max(1, Math.round(unpaidClaims.length * 0.25)) },
      { bucket: "61–90 Days", amount: Math.round(totalUnpaid * 0.12), pct: 12, color: "#DC2626", count: Math.max(1, Math.round(unpaidClaims.length * 0.12)) },
      { bucket: "91–120 Days", amount: Math.round(totalUnpaid * 0.06), pct: 6, color: "#B91C1C", count: 1 },
      { bucket: "> 120 Days", amount: Math.round(totalUnpaid * 0.02), pct: 2, color: "#7F1D1D", count: 1 },
    ];

    return buckets;
  }

  static exportClaimsToCSV(): string {
    const claims = this.load<ClaimRecord[]>(STORAGE_KEY_CLAIMS, INITIAL_HOSPITAL_CLAIMS);
    const headers = [
      "Claim ID",
      "Invoice No",
      "Patient Name",
      "UMR / MRN",
      "Department",
      "Date of Service",
      "Insurance Provider",
      "Total Amount (INR)",
      "Insurance Portion (INR)",
      "Patient Portion (INR)",
      "Amount Paid (INR)",
      "Balance Due (INR)",
      "Status",
    ];

    const rows = claims.map((c) => [
      c.id,
      c.invoiceNo,
      `"${c.patientName}"`,
      c.patientId,
      c.department,
      c.dateOfService,
      `"${c.insuranceProvider}"`,
      c.totalAmount,
      c.insurancePortion,
      c.patientPortion,
      c.amountPaid,
      c.balanceDue,
      c.status,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}
