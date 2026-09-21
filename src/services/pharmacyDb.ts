export interface AppUser {
  id: string;

  name: string;

  role: string;

  department: string;

  email: string;

  phone: string;

  status: "Active" | "Inactive";

  lastLogin: string;
}

export interface AppNotification {
  id: string;

  title: string;

  message: string;

  type: "alert" | "info" | "success" | "warning";

  timestamp: string;

  read: boolean;
}

export interface AppAuditLog {
  id: string;

  timestamp: string;

  user: string;

  action: string;

  module: string;

  record: string;

  details: string;

  // Origin address, when something upstream recorded one. Entries written by

  // `logAudit` in the browser have no way to know it, so this stays unset and

  // the log renders it as unknown -- an audit trail must not invent an origin.

  ip?: string;
}

export interface AppCategory {
  id: string;

  categoryName: string;

  description: string;

  status: "Active" | "Inactive";

  createdAt: string;
}

export interface AppSupplier {
  id: string;

  supplierName: string;

  contactInformation: string;

  phone?: string;

  email?: string;

  address: string;

  gstInformation: string;

  licenseDetails: string;

  paymentTerms: string;

  status: "Active" | "Inactive";

  createdAt: string;
}

export interface AppMedicine {
  id: string;

  medicineName: string;

  genericName: string;

  brandName: string;

  hsnCode?: string;

  categoryId: string;

  manufacturer: string;

  dosageForm: string;

  strength: string;

  unit: string;

  barcode: string;

  taxPercentage: number;

  reorderLevel: number;

  storageCondition: string;

  scheduleType: string;

  controlledSubstanceFlag: boolean;

  activeStatus: "Active" | "Inactive";

  createdAt: string;
}

// FEFO enabled Batch

export interface AppBatch {
  id: string;

  medicineId: string;

  batchNumber: string;

  expiryDate: string;

  manufacturingDate: string;

  availableQuantity: number; // For FEFO

  purchasePrice: number;

  // Quantity received and the retail price, as `addBatch` actually stores them.

  // The GRN path (PharmacyOld) additionally fills in the procurement fields

  // below; batches created by `addBatch` leave them unset, so everything the

  // lean path omits is optional rather than a lie about what is on disk.

  quantity: number;

  mrp: number;

  grnId?: string;

  status?: string;

  initialQuantity?: number;

  sellingPrice?: number;

  supplierId?: string;

  invoiceNumber?: string;

  location?: string; // Phase 4 - Transfer capability

  createdAt: string;
}

// Procurement - Phase 2

export interface PurchaseOrderItem {
  medicineId: string;

  quantity: number;

  purchasePrice: number;

  taxPercentage: number;

  discount: number;

  totalAmount: number;
}

export type POStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Ordered"
  | "Partially Received"
  | "Received"
  | "Cancelled";

export interface AppPurchaseOrder {
  id: string;

  supplierId: string;

  poDate: string;

  expectedDeliveryDate: string;

  status: POStatus;

  items: PurchaseOrderItem[];

  totalOrderValue: number;

  createdAt: string;

  createdBy: string; // user id
}

export interface AppGRNItem {
  medicineId: string;

  orderedQty: number;

  receivedQty: number;

  batchNumber: string;

  manufacturingDate: string;

  expiryDate: string;

  purchasePrice: number;

  sellingPrice: number;
}

export interface AppGRN {
  id: string;

  purchaseOrderId: string;

  supplierId: string;

  invoiceNumber: string;

  grnDate: string;

  items: AppGRNItem[];

  receivedBy: string; // user id

  createdAt: string;
}

export type StockTransactionType =
  | "PURCHASE_RECEIVED"
  | "DISPENSED"
  | "RETURNED"
  | "EXPIRED"
  | "ADJUSTMENT"
  | "DAMAGED"
  | "TRANSFER_OUT"
  | "TRANSFER_IN";

export interface AppStockTransaction {
  id: string;

  date: string;

  medicineId: string;

  batchId: string;

  quantity: number;

  transactionType: StockTransactionType;

  userId: string;

  reason?: string;

  patientId?: string;

  billId?: string;

  prescriptionId?: string;
}

// Phase 3 - Dispensing & Billing

export type PrescriptionSource = "DIGITAL" | "UPLOADED_IMAGE" | "OCR";

export type PrescriptionStatus =
  | "Draft"
  | "Sent To Pharmacy"
  | "Received"
  | "OCR Processing"
  | "Verification Pending"
  | "Verified"
  | "Approved"
  | "Preparing"
  | "Ready For Dispensing"
  | "Dispensed"
  | "Cancelled"
  | "Rejected";

/**
 * Statuses that mean a prescription is still waiting on the pharmacist.
 *
 * Shared rather than re-listed per screen: the dashboard's "awaiting
 * verification" tile used its own shorter list and omitted "Sent To Pharmacy",
 * which is exactly the status the doctor portal dispatches with -- so a
 * prescription sat in the verification queue while the pharmacist's landing
 * screen told them there was nothing to do.
 */

export const AWAITING_VERIFICATION_STATUSES: PrescriptionStatus[] = [
  "Sent To Pharmacy",

  "Received",

  "OCR Processing",

  "Verification Pending",
];

export function isAwaitingVerification(status: PrescriptionStatus): boolean {
  return AWAITING_VERIFICATION_STATUSES.includes(status);
}

export type DispensingStatus =
  "Waiting" | "Preparing" | "Ready" | "Dispensed" | "Cancelled";

export type PrescriptionPriority = "Normal" | "Urgent" | "Emergency";

export interface AppPrescriptionItem {
  id: string;

  medicineName: string; // OCR text or real name

  genericName?: string;

  medicineId?: string; // Resolved ID

  strength?: string;

  dosage: string;

  frequency?: string;

  duration: string;

  route?: string;

  instructions?: string;

  quantity: number;

  remarks?: string;

  substitutionAllowed: boolean;

  substitutionMedicineId?: string;
}

export interface AppPrescription {
  id: string;

  patientId: string;

  patientName: string;

  uhid: string;

  age?: number;

  gender?: string;

  visitId?: string;

  appointmentId?: string;

  doctorId: string;

  doctorName: string;

  department: string;

  diagnosis?: string;

  date: string;

  sourceType: PrescriptionSource;

  priority: PrescriptionPriority;

  status: PrescriptionStatus;

  dispensingStatus: DispensingStatus;

  imageUrl?: string;

  items: AppPrescriptionItem[];

  verifiedBy?: string;

  verifiedDate?: string;

  rejectedReason?: string;

  verificationNotes?: string;

  createdAt: string;
}

export interface AppPrescriptionClarification {
  id: string;

  prescriptionId: string;

  pharmacistId: string;

  doctorId: string;

  issueType:
    | "Wrong Medicine"
    | "Stock Not Available"
    | "Dose Clarification Needed"
    | "Allergy Concern"
    | "Other";

  message: string;

  status: "Pending" | "Resolved";

  resolutionMessage?: string;

  createdAt: string;
}

export type BillType = "Cash" | "Insurance" | "Corporate" | "IP_Ward";

export type PaymentStatus =
  | "Pending"
  | "Partially Paid"
  | "Paid"
  | "Insurance Pending"
  | "Credit Approved";

export interface AppPharmacyBillItem {
  medicineId: string;

  medicineName: string;

  batchNumber: string;

  batchLocation?: string; // Barcode/Shelf

  barcode?: string;

  expiryDate: string;

  quantity: number;

  unitPrice: number;

  grossAmount: number;

  discount: number;

  taxableAmount: number;

  cgstAmount: number;

  sgstAmount: number;

  tax: number;

  totalPrice: number;

  hsnCode?: string;

  mfgShortCode?: string;
}

// Removed duplicate interface AppPharmacyBillItem

export interface AppPharmacyBill {
  id: string;

  billNumber: string;

  patientId: string;

  patientName: string;

  uhid: string;

  doctorName: string;

  department: string;

  billType: BillType;

  paymentStatus: PaymentStatus;

  paymentMode?: string;

  prescriptionId?: string;

  items: AppPharmacyBillItem[];

  subTotal: number;

  discount: number;

  tax: number;

  taxableTotal: number;

  cgstTotal: number;

  sgstTotal: number;

  totalAmount: number;

  createdBy: string;

  createdAt: string;
  isModifiedReturnBill?: boolean;
  originalBillNumber?: string;
}

// Phase 4 - Returns, Transfers, Expiry

export type ReturnStatus = "Requested" | "Approved" | "Rejected" | "Completed";

export interface AppPharmacyReturnItem {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate?: string;
  originalQuantity: number;
  returnQuantity: number;
  finalQuantity: number;
  unitPrice: number;
  originalAmount: number;
  refundAmount: number;
  finalAmount: number;
  tax?: number;
  discount?: number;
}

export interface AppPharmacyReturn {
  id: string;

  returnNumber: string;

  patientUhid: string;
  patientName?: string;
  patientId?: string;
  doctorName?: string;
  department?: string;
  originalBillId: string;
  originalBillNumber?: string;
  modifiedBillId?: string;
  modifiedBillNumber?: string;
  items?: AppPharmacyReturnItem[];
  // Backwards compatibility for single-item fields
  medicineId?: string;
  batchNumber?: string;
  returnQuantity?: number;
  originalTotalAmount?: number;
  modifiedTotalAmount?: number;
  refundAmount?: number;
  returnReason: string;
  notes?: string;
  approvedBy?: string;
  createdBy?: string;
  status: ReturnStatus;

  createdAt: string;
}

export type TransferStatus =
  "Requested" | "Approved" | "Transferred" | "Received" | "Cancelled";

export interface AppStockTransfer {
  id: string;

  transferId: string;

  fromLocation: string;

  toLocation: string;

  medicineId: string;

  batchId: string;

  quantity: number;

  requestedBy: string;

  approvedBy?: string;

  receivedBy?: string;

  status: TransferStatus;

  createdAt: string;
}

export interface AppSupplierReturn {
  id: string;

  returnNumber?: string;

  debitNoteNumber?: string;

  supplierId: string;

  supplierName?: string;

  medicineId: string;

  medicineName?: string;

  batchId: string;

  batchNumber?: string;

  quantity: number;

  unitCost?: number;

  returnAmount?: number;

  reason:
    "Expired" | "Damaged" | "Wrong Item" | "Recall" | "Near Expiry" | string;

  status:
    | "Requested"
    | "Approved"
    | "Credit Note Received"
    | "Debit Note Issued"
    | "Completed"
    | "Pending"
    | "Rejected";

  creditNoteId?: string;

  notes?: string;

  requestedBy?: string;

  approvedBy?: string;

  returnDate?: string;

  createdAt: string;
}

export interface AppStockAdjustment {
  id: string;

  adjustmentNumber?: string;

  medicineId: string;

  medicineName?: string;

  batchId: string;

  batchNumber?: string;

  systemQuantity: number;

  physicalQuantity: number;

  difference: number;

  quantity?: number;

  unitCost?: number;

  lossValue?: number;

  supplierId?: string;

  supplierName?: string;

  category?: string;

  reason:
    | "Physical Mismatch"
    | "Damage"
    | "Missing Stock"
    | "Broken Ampoule"
    | "Cold Chain Failure"
    | "Expired"
    | "Packaging Torn"
    | "Spillage"
    | string;

  status?: "Approved" | "Pending" | "Written Off" | "Rejected";

  disposalMethod?: string;

  location?: string;

  witnessName?: string;

  approvedBy: string;

  reportedBy?: string;

  adjustmentDate?: string;

  createdAt: string;
}

const USERS_KEY = "hospai_pharm_users_v2";

const NOTIFICATIONS_KEY = "hospai_pharm_notifications_v2";

const AUDIT_LOGS_KEY = "hospai_pharm_audit_logs_v2";

const CATEGORIES_KEY = "hospai_pharm_categories_v2";

const SUPPLIERS_KEY = "hospai_pharm_suppliers_v2";

const MEDICINES_KEY = "hospai_pharm_medicines_v2";

const BATCHES_KEY = "hospai_pharm_batches_v2";

const POS_KEY = "hospai_pharm_pos_v2";

const GRNS_KEY = "hospai_pharm_grns_v2";

const STOCK_TXS_KEY = "hospai_pharm_stock_txs_v2";

const PRESCRIPTIONS_KEY = "hospai_pharm_rx_v2";

const BILLS_KEY = "hospai_pharm_bills_v2";

const RETURNS_KEY = "hospai_pharm_returns_v2";

const TRANSFERS_KEY = "hospai_pharm_transfers_v2";

const SUPPLIER_RETURNS_KEY = "hospai_pharm_supp_returns_v2";

const ADJUSTMENTS_KEY = "hospai_pharm_adjustments_v2";

const CLARIFICATIONS_KEY = "hospai_pharm_clarifications_v2";

export const INITIAL_PHARMACY_CATEGORIES: AppCategory[] = [
  {
    id: "CAT-001",
    categoryName: "Antibiotics & Anti-infectives",
    description: "Systemic antibacterial and antifungal formulations",
    status: "Active",
    createdAt: "2026-01-01T00:00:00Z",
  },

  {
    id: "CAT-002",
    categoryName: "Analgesics & Antipyretics",
    description: "Pain management, NSAIDs, and antipyretics",
    status: "Active",
    createdAt: "2026-01-01T00:00:00Z",
  },

  {
    id: "CAT-003",
    categoryName: "Cardiovascular & Antihypertensives",
    description: "Cardiology, blood pressure, and antiarrhythmic agents",
    status: "Active",
    createdAt: "2026-01-01T00:00:00Z",
  },

  {
    id: "CAT-004",
    categoryName: "Anti-diabetic & Endocrine",
    description: "Oral hypoglycemic agents, insulins, and thyroid regulators",
    status: "Active",
    createdAt: "2026-01-01T00:00:00Z",
  },

  {
    id: "CAT-005",
    categoryName: "Respiratory & Pulmonology",
    description: "Bronchodilators, steroids, and inhalers",
    status: "Active",
    createdAt: "2026-01-01T00:00:00Z",
  },

  {
    id: "CAT-006",
    categoryName: "Critical Care & Emergency Injectables",
    description:
      "Resuscitation, vasoactive drugs, and ICU emergency injectables",
    status: "Active",
    createdAt: "2026-01-01T00:00:00Z",
  },

  {
    id: "CAT-007",
    categoryName: "Gastrointestinal & Antacids",
    description: "PPIs, antiemetics, and GI motility agents",
    status: "Active",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

export const INITIAL_PHARMACY_SUPPLIERS: AppSupplier[] = [
  {
    id: "SUP-001",

    supplierName: "MedLife Pharmaceuticals",

    contactInformation: "P. Rajesh (Sales VP)",

    phone: "+91 98490 12345",

    email: "orders@medlifepharma.in",

    address: "Plot 42, IDA Uppal, Hyderabad, Telangana",

    gstInformation: "36AABCM1234F1Z1",

    licenseDetails: "DL-TS-HYD-2022-8819",

    paymentTerms: "Net 30 Days",

    status: "Active",

    createdAt: "2026-01-10T09:00:00Z",
  },

  {
    id: "SUP-002",

    supplierName: "Apex Healthcare Ltd",

    contactInformation: "Vikas Sharma (Supply Manager)",

    phone: "+91 98200 55443",

    email: "institutional@apexhealth.co.in",

    address: "Unit 12, Kurla Industrial Estate, Mumbai, Maharashtra",

    gstInformation: "27AAACA1122C1Z5",

    licenseDetails: "DL-MH-MUM-2021-4402",

    paymentTerms: "Net 45 Days",

    status: "Active",

    createdAt: "2026-01-12T10:00:00Z",
  },

  {
    id: "SUP-003",

    supplierName: "Sun Pharma Distributors",

    contactInformation: "K. Raman (Depot Manager)",

    phone: "+91 99800 77665",

    email: "depot.south@sunpharma.com",

    address: "14/A Peenya Industrial Area, Bengaluru, Karnataka",

    gstInformation: "29AABCS8899K1Z2",

    licenseDetails: "DL-KA-BNG-2023-9901",

    paymentTerms: "Net 30 Days",

    status: "Active",

    createdAt: "2026-01-15T11:00:00Z",
  },

  {
    id: "SUP-004",

    supplierName: "Cipla Depot Logistics",

    contactInformation: "Anil Deshmukh",

    phone: "+91 98450 33221",

    email: "hosp.supply@cipla.com",

    address: "Survey 118, Medchal Highway, Secunderabad, Telangana",

    gstInformation: "36AABCC7788P1Z8",

    licenseDetails: "DL-TS-HYD-2022-1049",

    paymentTerms: "Net 15 Days",

    status: "Active",

    createdAt: "2026-01-20T08:30:00Z",
  },

  {
    id: "SUP-005",

    supplierName: "Glenmark Lifesciences",

    contactInformation: "Suresh Menon",

    phone: "+91 97120 44991",

    email: "orders@glenmarklifesciences.com",

    address: "B-5 MIDC Andheri East, Mumbai, Maharashtra",

    gstInformation: "27AABCG4455N1Z3",

    licenseDetails: "DL-MH-MUM-2020-7721",

    paymentTerms: "Net 30 Days",

    status: "Active",

    createdAt: "2026-01-25T14:00:00Z",
  },
];

export const INITIAL_PHARMACY_MEDICINES: AppMedicine[] = [
  {
    id: "MED-001",

    medicineName: "Paracetamol 650mg",

    genericName: "Paracetamol",

    brandName: "Dolo 650",

    hsnCode: "30049060",

    categoryId: "CAT-002",

    manufacturer: "Micro Labs",

    dosageForm: "Tablet",

    strength: "650mg",

    unit: "Strip (15 tabs)",

    barcode: "8901148202011",

    taxPercentage: 12,

    reorderLevel: 50,

    storageCondition: "Store below 25°C in a dry place",

    scheduleType: "Over the Counter",

    controlledSubstanceFlag: false,

    activeStatus: "Active",

    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "MED-002",

    medicineName: "Amoxicillin & Clavulanic Acid 625mg",

    genericName: "Amoxicillin + Potassium Clavulanate",

    brandName: "Augmentin 625 Duo",

    hsnCode: "30041010",

    categoryId: "CAT-001",

    manufacturer: "GlaxoSmithKline",

    dosageForm: "Tablet",

    strength: "500mg+125mg",

    unit: "Strip (10 tabs)",

    barcode: "8901037012025",

    taxPercentage: 12,

    reorderLevel: 40,

    storageCondition: "Store below 25°C protected from moisture",

    scheduleType: "Schedule H",

    controlledSubstanceFlag: false,

    activeStatus: "Active",

    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "MED-003",

    medicineName: "Pantoprazole 40mg",

    genericName: "Pantoprazole Sodium",

    brandName: "Pan 40",

    hsnCode: "30049099",

    categoryId: "CAT-007",

    manufacturer: "Alkem Laboratories",

    dosageForm: "Tablet",

    strength: "40mg",

    unit: "Strip (15 tabs)",

    barcode: "8901117210101",

    taxPercentage: 12,

    reorderLevel: 45,

    storageCondition: "Store in cool dry place",

    scheduleType: "Schedule H",

    controlledSubstanceFlag: false,

    activeStatus: "Active",

    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "MED-004",

    medicineName: "Metformin 500mg",

    genericName: "Metformin Hydrochloride",

    brandName: "Glycomet 500",

    hsnCode: "30049099",

    categoryId: "CAT-004",

    manufacturer: "USV Ltd",

    dosageForm: "Tablet",

    strength: "500mg",

    unit: "Strip (20 tabs)",

    barcode: "8901088019910",

    taxPercentage: 12,

    reorderLevel: 60,

    storageCondition: "Store below 30°C",

    scheduleType: "Schedule H",

    controlledSubstanceFlag: false,

    activeStatus: "Active",

    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "MED-005",

    medicineName: "Amlodipine 5mg",

    genericName: "Amlodipine Besylate",

    brandName: "Amlong 5",

    hsnCode: "30049099",

    categoryId: "CAT-003",

    manufacturer: "Micro Labs",

    dosageForm: "Tablet",

    strength: "5mg",

    unit: "Strip (15 tabs)",

    barcode: "8901148005012",

    taxPercentage: 12,

    reorderLevel: 35,

    storageCondition: "Protect from light and moisture",

    scheduleType: "Schedule H",

    controlledSubstanceFlag: false,

    activeStatus: "Active",

    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "MED-006",

    medicineName: "Ceftriaxone 1g Injection",

    genericName: "Ceftriaxone Sodium Sterile",

    brandName: "Monocef 1g",

    hsnCode: "30042064",

    categoryId: "CAT-006",

    manufacturer: "Aristo Pharmaceuticals",

    dosageForm: "Injection (Vial)",

    strength: "1g/vial",

    unit: "Vial with SWFI",

    barcode: "8901235001192",

    taxPercentage: 12,

    reorderLevel: 30,

    storageCondition: "Store below 25°C protected from light",

    scheduleType: "Schedule H1",

    controlledSubstanceFlag: false,

    activeStatus: "Active",

    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "MED-007",

    medicineName: "Ondansetron 4mg/2ml Injection",

    genericName: "Ondansetron Hydrochloride",

    brandName: "Emeset Inj",

    hsnCode: "30049099",

    categoryId: "CAT-006",

    manufacturer: "Cipla Ltd",

    dosageForm: "Injection (Ampoule)",

    strength: "2mg/ml (2ml)",

    unit: "Ampoule",

    barcode: "8901117004412",

    taxPercentage: 12,

    reorderLevel: 25,

    storageCondition: "Store below 30°C protected from light",

    scheduleType: "Schedule H",

    controlledSubstanceFlag: false,

    activeStatus: "Active",

    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "MED-008",

    medicineName: "Azithromycin 500mg",

    genericName: "Azithromycin Dihydrate",

    brandName: "Azithral 500",

    hsnCode: "30042062",

    categoryId: "CAT-001",

    manufacturer: "Alembic Pharma",

    dosageForm: "Tablet",

    strength: "500mg",

    unit: "Strip (5 tabs)",

    barcode: "8901078021190",

    taxPercentage: 12,

    reorderLevel: 30,

    storageCondition: "Store below 25°C",

    scheduleType: "Schedule H",

    controlledSubstanceFlag: false,

    activeStatus: "Active",

    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "MED-009",

    medicineName: "Atorvastatin 20mg",

    genericName: "Atorvastatin Calcium",

    brandName: "Atorva 20",

    hsnCode: "30049099",

    categoryId: "CAT-003",

    manufacturer: "Zydus Cadila",

    dosageForm: "Tablet",

    strength: "20mg",

    unit: "Strip (15 tabs)",

    barcode: "8901211003318",

    taxPercentage: 12,

    reorderLevel: 40,

    storageCondition: "Store below 25°C",

    scheduleType: "Schedule H",

    controlledSubstanceFlag: false,

    activeStatus: "Active",

    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "MED-010",

    medicineName: "Insulin Glargine 100IU/ml Cartridge",

    genericName: "Insulin Glargine (rDNA)",

    brandName: "Lantus Solostar",

    hsnCode: "30043110",

    categoryId: "CAT-004",

    manufacturer: "Sanofi India",

    dosageForm: "Prefilled Pen / Cartridge",

    strength: "100 IU/ml (3ml)",

    unit: "Cartridge 3ml",

    barcode: "8901452009914",

    taxPercentage: 5,

    reorderLevel: 15,

    storageCondition: "Store in refrigerator (2°C to 8°C). Do NOT freeze",

    scheduleType: "Schedule G",

    controlledSubstanceFlag: false,

    activeStatus: "Active",

    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "MED-011",

    medicineName: "Salbutamol Inhaler 100mcg",

    genericName: "Salbutamol Sulfate MDI",

    brandName: "Asthalin Inhaler",

    hsnCode: "30049099",

    categoryId: "CAT-005",

    manufacturer: "Cipla Ltd",

    dosageForm: "Inhaler (MDI)",

    strength: "100mcg/puff (200 doses)",

    unit: "Canister with Actuator",

    barcode: "8901117009941",

    taxPercentage: 12,

    reorderLevel: 20,

    storageCondition:
      "Store below 30°C. Protect from frost and direct sunlight",

    scheduleType: "Schedule H",

    controlledSubstanceFlag: false,

    activeStatus: "Active",

    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "MED-012",

    medicineName: "Enoxaparin 40mg/0.4ml Syringe",

    genericName: "Enoxaparin Sodium",

    brandName: "Clexane 40mg",

    hsnCode: "30049099",

    categoryId: "CAT-006",

    manufacturer: "Sanofi India",

    dosageForm: "Prefilled Syringe",

    strength: "40mg/0.4ml",

    unit: "Prefilled Syringe",

    barcode: "8901452001188",

    taxPercentage: 12,

    reorderLevel: 20,

    storageCondition: "Store below 25°C. Do NOT freeze",

    scheduleType: "Schedule H",

    controlledSubstanceFlag: false,

    activeStatus: "Active",

    createdAt: "2026-02-01T00:00:00Z",
  },
];

export const INITIAL_PHARMACY_BATCHES: AppBatch[] = [
  {
    id: "B-DOL-01",
    medicineId: "MED-001",
    batchNumber: "DL-2024-88",
    expiryDate: "2027-04-30",
    manufacturingDate: "2024-04-01",
    availableQuantity: 280,
    quantity: 300,
    purchasePrice: 24.5,
    mrp: 34.0,
    supplierId: "SUP-001",
    location: "Main Pharmacy Shelf A-1",
    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "B-AUG-01",
    medicineId: "MED-002",
    batchNumber: "AUG-9912",
    expiryDate: "2026-11-30",
    manufacturingDate: "2024-11-01",
    availableQuantity: 120,
    quantity: 150,
    purchasePrice: 155.0,
    mrp: 215.0,
    supplierId: "SUP-002",
    location: "Main Pharmacy Shelf B-2",
    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "B-PAN-01",
    medicineId: "MED-003",
    batchNumber: "PAN-1092",
    expiryDate: "2027-02-28",
    manufacturingDate: "2024-02-01",
    availableQuantity: 210,
    quantity: 250,
    purchasePrice: 88.0,
    mrp: 122.0,
    supplierId: "SUP-001",
    location: "Main Pharmacy Shelf A-3",
    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "B-GLY-01",
    medicineId: "MED-004",
    batchNumber: "GLY-3301",
    expiryDate: "2027-08-31",
    manufacturingDate: "2024-08-01",
    availableQuantity: 190,
    quantity: 200,
    purchasePrice: 42.0,
    mrp: 62.0,
    supplierId: "SUP-003",
    location: "Main Pharmacy Shelf C-1",
    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "B-AML-01",
    medicineId: "MED-005",
    batchNumber: "AML-7701",
    expiryDate: "2027-01-31",
    manufacturingDate: "2024-01-01",
    availableQuantity: 140,
    quantity: 150,
    purchasePrice: 38.0,
    mrp: 54.0,
    supplierId: "SUP-001",
    location: "Main Pharmacy Shelf C-2",
    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "B-MON-01",
    medicineId: "MED-006",
    batchNumber: "MNF-8821",
    expiryDate: "2026-12-31",
    manufacturingDate: "2024-12-01",
    availableQuantity: 82,
    quantity: 100,
    purchasePrice: 54.5,
    mrp: 78.0,
    supplierId: "SUP-002",
    location: "Emergency Injectable Rack",
    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "B-EME-01",
    medicineId: "MED-007",
    batchNumber: "EMT-9011",
    expiryDate: "2027-05-31",
    manufacturingDate: "2024-05-01",
    availableQuantity: 95,
    quantity: 120,
    purchasePrice: 18.2,
    mrp: 28.0,
    supplierId: "SUP-004",
    location: "Emergency Injectable Rack",
    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "B-AZI-01",
    medicineId: "MED-008",
    batchNumber: "AZT-4401",
    expiryDate: "2027-03-31",
    manufacturingDate: "2024-03-01",
    availableQuantity: 75,
    quantity: 80,
    purchasePrice: 92.0,
    mrp: 135.0,
    supplierId: "SUP-001",
    location: "Main Pharmacy Shelf B-1",
    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "B-AZI-02",
    medicineId: "MED-008",
    batchNumber: "AZT-4402",
    expiryDate: "2026-08-31",
    manufacturingDate: "2024-01-01",
    availableQuantity: 0,
    quantity: 60,
    purchasePrice: 95.0,
    mrp: 138.0,
    supplierId: "SUP-001",
    location: "Quarantine Bin",
    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "B-ATO-01",
    medicineId: "MED-009",
    batchNumber: "ATR-3310",
    expiryDate: "2027-03-31",
    manufacturingDate: "2024-03-01",
    availableQuantity: 105,
    quantity: 120,
    purchasePrice: 140.0,
    mrp: 198.0,
    supplierId: "SUP-003",
    location: "Main Pharmacy Shelf C-3",
    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "B-LAN-01",
    medicineId: "MED-010",
    batchNumber: "LAN-4022",
    expiryDate: "2026-10-31",
    manufacturingDate: "2024-10-01",
    availableQuantity: 36,
    quantity: 50,
    purchasePrice: 580.0,
    mrp: 750.0,
    supplierId: "SUP-005",
    location: "Cold Storage Refrigerator #1",
    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "B-AST-01",
    medicineId: "MED-011",
    batchNumber: "AST-5520",
    expiryDate: "2026-11-30",
    manufacturingDate: "2024-11-01",
    availableQuantity: 44,
    quantity: 60,
    purchasePrice: 110.0,
    mrp: 165.0,
    supplierId: "SUP-004",
    location: "Main Pharmacy Shelf D-1",
    createdAt: "2026-02-01T00:00:00Z",
  },

  {
    id: "B-CLE-01",
    medicineId: "MED-012",
    batchNumber: "CLX-7711",
    expiryDate: "2027-06-30",
    manufacturingDate: "2024-06-01",
    availableQuantity: 37,
    quantity: 45,
    purchasePrice: 420.0,
    mrp: 560.0,
    supplierId: "SUP-005",
    location: "Emergency Injectable Rack",
    createdAt: "2026-02-01T00:00:00Z",
  },
];

export const INITIAL_PHARMACY_BILLS: AppPharmacyBill[] = [
  {
    id: "BILL-2026-101",

    billNumber: "PHARM-2026-0801",

    patientId: "UMR100245",

    patientName: "John Smith",

    uhid: "UMR100245",

    doctorName: "Dr. Sarah Mitchell",

    department: "Inpatient",

    billType: "Cash",

    paymentStatus: "Paid",

    paymentMode: "Cash",

    items: [
      {
        medicineId: "MED-001",
        medicineName: "Dolo 650 (Paracetamol 650mg)",
        batchNumber: "DL-2024-88",
        expiryDate: "2027-04-30",
        quantity: 2,
        unitPrice: 34,
        grossAmount: 68,
        discount: 0,
        taxableAmount: 60.71,
        cgstAmount: 3.64,
        sgstAmount: 3.64,
        tax: 7.29,
        totalPrice: 68,
      },

      {
        medicineId: "MED-003",
        medicineName: "Pan 40 (Pantoprazole 40mg)",
        batchNumber: "PAN-1092",
        expiryDate: "2027-02-28",
        quantity: 1,
        unitPrice: 122,
        grossAmount: 122,
        discount: 0,
        taxableAmount: 108.93,
        cgstAmount: 6.54,
        sgstAmount: 6.54,
        tax: 13.07,
        totalPrice: 122,
      },
    ],

    subTotal: 190,

    discount: 0,

    tax: 20.36,

    taxableTotal: 169.64,

    cgstTotal: 10.18,

    sgstTotal: 10.18,

    totalAmount: 190,

    createdBy: "Pharmacist S. Rao",

    createdAt: "2026-08-31T12:30:00Z",
  },

  {
    id: "BILL-2026-102",

    billNumber: "PHARM-2026-0802",

    patientId: "UMR10002",

    patientName: "Sunita Patel",

    uhid: "UMR10002",

    doctorName: "Dr. Sarah Jenkins",

    department: "Outpatient",

    billType: "Cash",

    paymentStatus: "Paid",

    paymentMode: "UPI / Digital",

    items: [
      {
        medicineId: "MED-005",
        medicineName: "Amlong 5 (Amlodipine 5mg)",
        batchNumber: "AML-7701",
        expiryDate: "2027-01-31",
        quantity: 2,
        unitPrice: 54,
        grossAmount: 108,
        discount: 0,
        taxableAmount: 96.43,
        cgstAmount: 5.79,
        sgstAmount: 5.79,
        tax: 11.57,
        totalPrice: 108,
      },

      {
        medicineId: "MED-009",
        medicineName: "Atorva 20 (Atorvastatin 20mg)",
        batchNumber: "ATR-3310",
        expiryDate: "2027-03-31",
        quantity: 1,
        unitPrice: 198,
        grossAmount: 198,
        discount: 0,
        taxableAmount: 176.79,
        cgstAmount: 10.61,
        sgstAmount: 10.61,
        tax: 21.21,
        totalPrice: 198,
      },
    ],

    subTotal: 306,

    discount: 0,

    tax: 32.78,

    taxableTotal: 273.22,

    cgstTotal: 16.39,

    sgstTotal: 16.39,

    totalAmount: 306,

    createdBy: "Pharmacist N. Gupta",

    createdAt: "2026-08-30T14:15:00Z",
  },

  {
    id: "BILL-2026-103",

    billNumber: "PHARM-2026-0803",

    patientId: "UMR100342",

    patientName: "Rahul Sharma",

    uhid: "UMR100342",

    doctorName: "Dr. Anita Roy",

    department: "Emergency",

    billType: "Cash",

    paymentStatus: "Paid",

    paymentMode: "Credit Card",

    items: [
      {
        medicineId: "MED-002",
        medicineName: "Augmentin 625 Duo",
        batchNumber: "AUG-9912",
        expiryDate: "2026-11-30",
        quantity: 1,
        unitPrice: 215,
        grossAmount: 215,
        discount: 0,
        taxableAmount: 191.96,
        cgstAmount: 11.52,
        sgstAmount: 11.52,
        tax: 23.04,
        totalPrice: 215,
      },

      {
        medicineId: "MED-003",
        medicineName: "Pan 40 (Pantoprazole 40mg)",
        batchNumber: "PAN-1092",
        expiryDate: "2027-02-28",
        quantity: 1,
        unitPrice: 122,
        grossAmount: 122,
        discount: 0,
        taxableAmount: 108.93,
        cgstAmount: 6.54,
        sgstAmount: 6.54,
        tax: 13.07,
        totalPrice: 122,
      },
    ],

    subTotal: 337,

    discount: 0,

    tax: 36.11,

    taxableTotal: 300.89,

    cgstTotal: 18.06,

    sgstTotal: 18.06,

    totalAmount: 337,

    createdBy: "Pharmacist S. Rao",

    createdAt: "2026-08-26T17:00:00Z",
  },

  {
    id: "BILL-2026-104",

    billNumber: "PHARM-2026-0804",

    patientId: "UMR100522",

    patientName: "Meera Nair",

    uhid: "UMR100522",

    doctorName: "Dr. Rajesh Sharma",

    department: "Outpatient",

    billType: "Cash",

    paymentStatus: "Paid",

    paymentMode: "Debit Card",

    items: [
      {
        medicineId: "MED-011",
        medicineName: "Asthalin Inhaler 100mcg",
        batchNumber: "AST-5520",
        expiryDate: "2026-11-30",
        quantity: 1,
        unitPrice: 165,
        grossAmount: 165,
        discount: 0,
        taxableAmount: 147.32,
        cgstAmount: 8.84,
        sgstAmount: 8.84,
        tax: 17.68,
        totalPrice: 165,
      },

      {
        medicineId: "MED-008",
        medicineName: "Azithral 500 (Azithromycin)",
        batchNumber: "AZT-4401",
        expiryDate: "2027-03-31",
        quantity: 1,
        unitPrice: 135,
        grossAmount: 135,
        discount: 0,
        taxableAmount: 120.54,
        cgstAmount: 7.23,
        sgstAmount: 7.23,
        tax: 14.46,
        totalPrice: 135,
      },
    ],

    subTotal: 300,

    discount: 0,

    tax: 32.14,

    taxableTotal: 267.86,

    cgstTotal: 16.07,

    sgstTotal: 16.07,

    totalAmount: 300,

    createdBy: "Pharmacist N. Gupta",

    createdAt: "2026-08-20T11:20:00Z",
  },
];

export const INITIAL_PHARMACY_ADJUSTMENTS: AppStockAdjustment[] = [
  {
    id: "ADJ-2026-001",

    adjustmentNumber: "ADJ-2026-001",

    medicineId: "MED-006",

    medicineName: "Ceftriaxone 1g Injection (Monocef)",

    batchId: "B-MON-01",

    batchNumber: "MNF-8821",

    systemQuantity: 50,

    physicalQuantity: 42,

    difference: -8,

    quantity: 8,

    unitCost: 54.5,

    lossValue: 436.0,

    supplierId: "SUP-002",

    supplierName: "Apex Healthcare Ltd",

    category: "Critical Care & Emergency Injectables",

    reason: "Broken Ampoule",

    status: "Approved",

    disposalMethod: "Biohazard Sharp Bin Disposal & Autoclaving",

    location: "Emergency Pharmacy / ICU Dispensing Unit",

    witnessName: "Dr. Rajesh Sharma",

    approvedBy: "Chief Pharmacist K. Verma",

    reportedBy: "Nurse Priyadarshini",

    adjustmentDate: "2026-09-08",

    createdAt: "2026-09-08T10:15:00Z",
  },

  {
    id: "ADJ-2026-002",

    adjustmentNumber: "ADJ-2026-002",

    medicineId: "MED-010",

    medicineName: "Insulin Glargine 100IU/ml Cartridge (Lantus)",

    batchId: "B-LAN-01",

    batchNumber: "LAN-4022",

    systemQuantity: 25,

    physicalQuantity: 21,

    difference: -4,

    quantity: 4,

    unitCost: 580.0,

    lossValue: 2320.0,

    supplierId: "SUP-005",

    supplierName: "Glenmark Lifesciences",

    category: "Anti-diabetic & Endocrine",

    reason: "Cold Chain Failure",

    status: "Approved",

    disposalMethod: "Deep Burial & Thermal Degradation",

    location: "Main Central Pharmacy Cold Storage #2",

    witnessName: "Dr. Sarah Mitchell",

    approvedBy: "Chief Pharmacist K. Verma",

    reportedBy: "Stores Tech Anand",

    adjustmentDate: "2026-08-28",

    createdAt: "2026-08-28T14:30:00Z",
  },

  {
    id: "ADJ-2026-003",

    adjustmentNumber: "ADJ-2026-003",

    medicineId: "MED-007",

    medicineName: "Ondansetron 4mg/2ml Injection (Emeset)",

    batchId: "B-EME-01",

    batchNumber: "EMT-9011",

    systemQuantity: 60,

    physicalQuantity: 45,

    difference: -15,

    quantity: 15,

    unitCost: 18.2,

    lossValue: 273.0,

    supplierId: "SUP-004",

    supplierName: "Cipla Depot Logistics",

    category: "Critical Care & Emergency Injectables",

    reason: "Spillage",

    status: "Approved",

    disposalMethod: "Effluent Treatment Wash & Chemical Neutralization",

    location: "Day Care Chemo Ward Unit",

    witnessName: "Staff Nurse David",

    approvedBy: "Pharmacist S. Rao",

    reportedBy: "Pharmacist S. Rao",

    adjustmentDate: "2026-08-16",

    createdAt: "2026-08-16T16:20:00Z",
  },

  {
    id: "ADJ-2026-004",

    adjustmentNumber: "ADJ-2026-004",

    medicineId: "MED-011",

    medicineName: "Salbutamol Inhaler 100mcg (Asthalin)",

    batchId: "B-AST-01",

    batchNumber: "AST-5520",

    systemQuantity: 30,

    physicalQuantity: 24,

    difference: -6,

    quantity: 6,

    unitCost: 110.0,

    lossValue: 660.0,

    supplierId: "SUP-004",

    supplierName: "Cipla Depot Logistics",

    category: "Respiratory & Pulmonology",

    reason: "Packaging Torn",

    status: "Approved",

    disposalMethod: "Incineration & Regulated Gas Venting",

    location: "Outpatient Pharmacy Dispensing Counter 1",

    witnessName: "Dr. Arjun Mehta",

    approvedBy: "Chief Pharmacist K. Verma",

    reportedBy: "Pharmacist N. Gupta",

    adjustmentDate: "2026-08-04",

    createdAt: "2026-08-04T11:00:00Z",
  },

  {
    id: "ADJ-2026-005",

    adjustmentNumber: "ADJ-2026-005",

    medicineId: "MED-012",

    medicineName: "Enoxaparin 40mg/0.4ml Syringe (Clexane)",

    batchId: "B-CLE-01",

    batchNumber: "CLX-7711",

    systemQuantity: 40,

    physicalQuantity: 37,

    difference: -3,

    quantity: 3,

    unitCost: 420.0,

    lossValue: 1260.0,

    supplierId: "SUP-005",

    supplierName: "Glenmark Lifesciences",

    category: "Critical Care & Emergency Injectables",

    reason: "Broken Ampoule",

    status: "Approved",

    disposalMethod: "Biohazard Sharp Bin Disposal",

    location: "Cath Lab Pre-Op Holding",

    witnessName: "Dr. Vikram Seth",

    approvedBy: "Chief Pharmacist K. Verma",

    reportedBy: "Nurse Kavita",

    adjustmentDate: "2026-07-22",

    createdAt: "2026-07-22T09:40:00Z",
  },

  {
    id: "ADJ-2026-006",

    adjustmentNumber: "ADJ-2026-006",

    medicineId: "MED-001",

    medicineName: "Paracetamol 650mg (Dolo 650)",

    batchId: "B-DOL-01",

    batchNumber: "DL-2024-88",

    systemQuantity: 200,

    physicalQuantity: 180,

    difference: -20,

    quantity: 20,

    unitCost: 24.5,

    lossValue: 490.0,

    supplierId: "SUP-001",

    supplierName: "MedLife Pharmaceuticals",

    category: "Analgesics & Antipyretics",

    reason: "Packaging Torn",

    status: "Approved",

    disposalMethod: "Crushing & Solid Waste Shredding",

    location: "Inpatient Floor 3 Ward Dispenser",

    witnessName: "Nurse Priya Nair",

    approvedBy: "Pharmacist S. Rao",

    reportedBy: "Ward Boy Mohan",

    adjustmentDate: "2026-07-10",

    createdAt: "2026-07-10T15:10:00Z",
  },
];

export const INITIAL_PHARMACY_SUPPLIER_RETURNS: AppSupplierReturn[] = [
  {
    id: "SRET-2026-001",

    returnNumber: "RET-2026-001",

    debitNoteNumber: "DN-2026-041",

    supplierId: "SUP-001",

    supplierName: "MedLife Pharmaceuticals",

    medicineId: "MED-008",

    medicineName: "Azithromycin 500mg (Azithral 500)",

    batchId: "B-AZI-02",

    batchNumber: "AZT-4402",

    quantity: 60,

    unitCost: 95.0,

    returnAmount: 5700.0,

    reason: "Expired",

    status: "Credit Note Received",

    creditNoteId: "CN-MLP-881",

    notes:
      "Quarterly vendor return of expired strips. Credit note CN-MLP-881 settled against invoice INV-9041.",

    requestedBy: "P. Kumar (Stores Lead)",

    approvedBy: "R. Gupta (Procurement Head)",

    returnDate: "2026-09-05",

    createdAt: "2026-09-05T14:30:00Z",
  },

  {
    id: "SRET-2026-002",

    returnNumber: "RET-2026-002",

    debitNoteNumber: "DN-2026-042",

    supplierId: "SUP-002",

    supplierName: "Apex Healthcare Ltd",

    medicineId: "MED-002",

    medicineName: "Amoxicillin & Clavulanic Acid 625mg (Augmentin 625)",

    batchId: "B-AUG-01",

    batchNumber: "AUG-9912",

    quantity: 30,

    unitCost: 155.0,

    returnAmount: 4650.0,

    reason: "Near Expiry",

    status: "Debit Note Issued",

    creditNoteId: "CN-APX-PENDING",

    notes:
      "Batches within 60 days of expiry dispatched back under vendor 90-day return policy.",

    requestedBy: "P. Kumar (Stores Lead)",

    approvedBy: "R. Gupta (Procurement Head)",

    returnDate: "2026-08-25",

    createdAt: "2026-08-25T11:15:00Z",
  },

  {
    id: "SRET-2026-003",

    returnNumber: "RET-2026-003",

    debitNoteNumber: "DN-2026-043",

    supplierId: "SUP-003",

    supplierName: "Sun Pharma Distributors",

    medicineId: "MED-009",

    medicineName: "Atorvastatin 20mg (Atorva 20)",

    batchId: "B-ATO-01",

    batchNumber: "ATR-3310",

    quantity: 45,

    unitCost: 140.0,

    returnAmount: 6300.0,

    reason: "Wrong Item",

    status: "Credit Note Received",

    creditNoteId: "CN-SPD-1029",

    notes:
      "Vendor erroneously supplied Atorva 20mg instead of Atorva 40mg per PO-2026-104.",

    requestedBy: "Pharmacist S. Rao",

    approvedBy: "R. Gupta (Procurement Head)",

    returnDate: "2026-08-12",

    createdAt: "2026-08-12T16:00:00Z",
  },

  {
    id: "SRET-2026-004",

    returnNumber: "RET-2026-004",

    debitNoteNumber: "DN-2026-044",

    supplierId: "SUP-004",

    supplierName: "Cipla Depot Logistics",

    medicineId: "MED-011",

    medicineName: "Salbutamol Inhaler 100mcg (Asthalin)",

    batchId: "B-AST-01",

    batchNumber: "AST-5520",

    quantity: 25,

    unitCost: 110.0,

    returnAmount: 2750.0,

    reason: "Damaged",

    status: "Debit Note Issued",

    notes:
      "Outer master carton crushed upon transit delivery at receiving dock. GRN discrepancy noted.",

    requestedBy: "Stores Tech Anand",

    approvedBy: "Chief Pharmacist K. Verma",

    returnDate: "2026-07-29",

    createdAt: "2026-07-29T10:30:00Z",
  },

  {
    id: "SRET-2026-005",

    returnNumber: "RET-2026-005",

    debitNoteNumber: "DN-2026-045",

    supplierId: "SUP-005",

    supplierName: "Glenmark Lifesciences",

    medicineId: "MED-010",

    medicineName: "Insulin Glargine 100IU/ml Cartridge (Lantus)",

    batchId: "B-LAN-01",

    batchNumber: "LAN-4022",

    quantity: 10,

    unitCost: 580.0,

    returnAmount: 5800.0,

    reason: "Recall",

    status: "Credit Note Received",

    creditNoteId: "CN-GLM-5521",

    notes:
      "Manufacturer batch advisory and voluntary quarantine return as per DCGI notification.",

    requestedBy: "Chief Pharmacist K. Verma",

    approvedBy: "Medical Director Dr. Roy",

    returnDate: "2026-07-15",

    createdAt: "2026-07-15T13:45:00Z",
  },
];

export class PharmacyDatabase {
  private static load<T>(key: string, initialData: T): T {
    if (typeof window === "undefined") return initialData;

    try {
      const stored = window.localStorage.getItem(key);

      if (!stored) {
        window.localStorage.setItem(key, JSON.stringify(initialData));

        return initialData;
      }

      return JSON.parse(stored);
    } catch {
      return initialData;
    }
  }

  // Categories

  static getUsers(): AppUser[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveUsers(users: AppUser[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static addUser(user: AppUser) {
    const users = this.getUsers();

    users.push(user);

    this.saveUsers(users);
  }

  static updateUser(id: string, updates: Partial<AppUser>) {
    const users = this.getUsers();

    const idx = users.findIndex((u) => u.id === id);

    if (idx > -1) {
      users[idx] = { ...users[idx], ...updates };

      this.saveUsers(users);
    }
  }

  static getNotifications(): AppNotification[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(NOTIFICATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveNotifications(notifications: AppNotification[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        NOTIFICATIONS_KEY,
        JSON.stringify(notifications),
      );
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static updateNotification(id: string, updates: Partial<AppNotification>) {
    const notifs = this.getNotifications();

    const idx = notifs.findIndex((n) => n.id === id);

    if (idx > -1) {
      notifs[idx] = { ...notifs[idx], ...updates };

      this.saveNotifications(notifs);
    }
  }

  static deleteNotification(id: string) {
    let notifs = this.getNotifications();

    notifs = notifs.filter((n) => n.id !== id);

    this.saveNotifications(notifs);
  }

  static addNotification(
    title: string,
    message: string,
    type: AppNotification["type"],
  ) {
    const notifs = this.getNotifications();

    const newNotif: AppNotification = {
      id: "NOTIF" + Date.now() + Math.floor(Math.random() * 1000),

      title,

      message,

      type,

      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),

      read: false,
    };

    notifs.unshift(newNotif);

    this.saveNotifications(notifs);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("hospai_pharmacy_toast", { detail: newNotif }),
      );
    }
  }

  static getAuditLogs(): AppAuditLog[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(AUDIT_LOGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveAuditLogs(logs: AppAuditLog[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static getCategories(): AppCategory[] {
    return this.load<AppCategory[]>(
      CATEGORIES_KEY,
      INITIAL_PHARMACY_CATEGORIES,
    );
  }

  static saveCategories(categories: AppCategory[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static addCategory(cat: AppCategory) {
    const cats = this.getCategories();

    cats.push(cat);

    this.saveCategories(cats);
  }

  static updateCategory(id: string, updates: Partial<AppCategory>) {
    const cats = this.getCategories();

    const idx = cats.findIndex((c) => c.id === id);

    if (idx !== -1) {
      cats[idx] = { ...cats[idx], ...updates };

      this.saveCategories(cats);
    }
  }

  static deleteCategory(id: string) {
    this.saveCategories(this.getCategories().filter((c) => c.id !== id));
  }

  // Suppliers

  static getSuppliers(): AppSupplier[] {
    return this.load<AppSupplier[]>(SUPPLIERS_KEY, INITIAL_PHARMACY_SUPPLIERS);
  }

  static saveSuppliers(suppliers: AppSupplier[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static addSupplier(sup: AppSupplier) {
    const sups = this.getSuppliers();

    sups.push(sup);

    this.saveSuppliers(sups);
  }

  static updateSupplier(id: string, updates: Partial<AppSupplier>) {
    const sups = this.getSuppliers();

    const idx = sups.findIndex((s) => s.id === id);

    if (idx !== -1) {
      sups[idx] = { ...sups[idx], ...updates };

      this.saveSuppliers(sups);
    }
  }

  static deleteSupplier(id: string) {
    this.saveSuppliers(this.getSuppliers().filter((s) => s.id !== id));
  }

  // Medicines

  static getMedicines(): AppMedicine[] {
    return this.load<AppMedicine[]>(MEDICINES_KEY, INITIAL_PHARMACY_MEDICINES);
  }

  static saveMedicines(medicines: AppMedicine[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static addMedicine(med: AppMedicine) {
    const meds = this.getMedicines();

    meds.push(med);

    this.saveMedicines(meds);
  }

  static updateMedicine(id: string, updates: any) {
    const meds = this.getMedicines();

    const idx = meds.findIndex((m) => m.id === id);

    if (idx !== -1) {
      meds[idx] = {
        ...meds[idx],
        ...updates,
        medicineName: updates.name || meds[idx].medicineName,
      };

      this.saveMedicines(meds);
    }
  }

  static deleteMedicine(id: string) {
    const meds = this.getMedicines();

    this.saveMedicines(meds.filter((m) => m.id !== id));
  }

  // Batches

  static getBatches(): AppBatch[] {
    return this.load<AppBatch[]>(BATCHES_KEY, INITIAL_PHARMACY_BATCHES);
  }

  static saveBatches(batches: AppBatch[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BATCHES_KEY, JSON.stringify(batches));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static updateBatch(id: string, updates: Partial<AppBatch>) {
    const batches = this.getBatches();

    const idx = batches.findIndex((b) => b.id === id);

    if (idx !== -1) {
      batches[idx] = { ...batches[idx], ...updates };

      this.saveBatches(batches);
    }
  }

  static addBatch(batch: any) {
    const batches = this.getBatches();

    batches.push({
      id: "B" + Date.now() + Math.floor(Math.random() * 100),

      medicineId: batch.medicineId,

      batchNumber: batch.batchNumber,

      expiryDate: batch.expiryDate,

      manufacturingDate: batch.mfg || "2024-01-01",

      quantity: batch.quantity,

      availableQuantity: batch.availableQuantity ?? batch.quantity,

      purchasePrice: batch.purchasePrice,

      mrp: batch.mrp,

      grnId: batch.grnId || "GRN-SYS",

      location: batch.location || "Main Pharmacy",

      status: "Available",

      createdAt: new Date().toISOString(),
    });

    this.saveBatches(batches);
  }

  // Purchase Orders

  static getPurchaseOrders(): AppPurchaseOrder[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(POS_KEY);

      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static savePurchaseOrders(pos: AppPurchaseOrder[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(POS_KEY, JSON.stringify(pos));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static addPurchaseOrder(po: AppPurchaseOrder) {
    const pos = this.getPurchaseOrders();
    pos.push(po);
    this.savePurchaseOrders(pos);
  }

  // Bills
  static getBills(): AppPharmacyBill[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(BILLS_KEY);
      let bills: AppPharmacyBill[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(bills)) bills = [];

      // Ensure standard seed bills exist for immediate testing
      const hasStandardSeed1 = bills.some(b => b.billNumber === "BILL-2026-001245");
      const hasStandardSeed2 = bills.some(b => b.billNumber === "INV-2026-8845");

      let hasNewSeeds = false;

      // Seed Bill 1: Rahul Verma (BILL-2026-001245)
      if (!hasStandardSeed1) {
        const seedBill1: AppPharmacyBill = {
          id: "PB-2026-001245",
          billNumber: "BILL-2026-001245",
          patientId: "P-10042",
          patientName: "Rahul Verma",
          uhid: "UHID-2026-042",
          doctorName: "Dr. Ananya Sharma",
          department: "General Medicine",
          billType: "Cash",
          paymentStatus: "Paid",
          paymentMode: "Cash",
          items: [
            {
              medicineId: "MED-PCM-500",
              medicineName: "Paracetamol 500mg",
              batchNumber: "PCM-2026-B1",
              expiryDate: "2027-08",
              quantity: 10,
              unitPrice: 2,
              grossAmount: 20,
              discount: 0,
              taxableAmount: 17.86,
              cgstAmount: 1.07,
              sgstAmount: 1.07,
              tax: 12,
              totalPrice: 20,
            },
            {
              medicineId: "MED-AMX-500",
              medicineName: "Amoxicillin 500mg",
              batchNumber: "AMX-2026-B2",
              expiryDate: "2027-05",
              quantity: 10,
              unitPrice: 8,
              grossAmount: 80,
              discount: 0,
              taxableAmount: 71.43,
              cgstAmount: 4.29,
              sgstAmount: 4.29,
              tax: 12,
              totalPrice: 80,
            },
            {
              medicineId: "MED-CTZ-10",
              medicineName: "Cetirizine 10mg",
              batchNumber: "CTZ-2026-B3",
              expiryDate: "2027-11",
              quantity: 5,
              unitPrice: 3,
              grossAmount: 15,
              discount: 0,
              taxableAmount: 13.39,
              cgstAmount: 0.8,
              sgstAmount: 0.8,
              tax: 12,
              totalPrice: 15,
            },
          ],
          subTotal: 102.68,
          discount: 0,
          tax: 12.32,
          taxableTotal: 102.68,
          cgstTotal: 6.16,
          sgstTotal: 6.16,
          totalAmount: 115,
          createdBy: "Pharmacist",
          createdAt: "2026-09-15T10:30:00.000Z",
        };
        bills = [seedBill1, ...bills];
        hasNewSeeds = true;
      }

      // Seed Bill 2: Priya Sharma (INV-2026-8845)
      if (!hasStandardSeed2) {
        const seedBill2: AppPharmacyBill = {
          id: "PB-2026-008845",
          billNumber: "INV-2026-8845",
          patientId: "P-10088",
          patientName: "Priya Sharma",
          uhid: "UHID-2026-088",
          doctorName: "Dr. Rajesh Kumar",
          department: "Internal Medicine",
          billType: "Cash",
          paymentStatus: "Paid",
          paymentMode: "UPI",
          items: [
            {
              medicineId: "MED-AZM-500",
              medicineName: "Azithromycin 500mg",
              batchNumber: "AZM-2026-C1",
              expiryDate: "2027-09",
              quantity: 6,
              unitPrice: 35,
              grossAmount: 210,
              discount: 0,
              taxableAmount: 187.50,
              cgstAmount: 11.25,
              sgstAmount: 11.25,
              tax: 12,
              totalPrice: 210,
            },
            {
              medicineId: "MED-PAN-40",
              medicineName: "Pantoprazole 40mg",
              batchNumber: "PAN-2026-C2",
              expiryDate: "2027-12",
              quantity: 15,
              unitPrice: 10,
              grossAmount: 150,
              discount: 0,
              taxableAmount: 133.93,
              cgstAmount: 8.04,
              sgstAmount: 8.04,
              tax: 12,
              totalPrice: 150,
            },
            {
              medicineId: "MED-VTC-500",
              medicineName: "Vitamin C 500mg Chewable",
              batchNumber: "VTC-2026-C3",
              expiryDate: "2028-02",
              quantity: 20,
              unitPrice: 4,
              grossAmount: 80,
              discount: 0,
              taxableAmount: 71.43,
              cgstAmount: 4.29,
              sgstAmount: 4.29,
              tax: 12,
              totalPrice: 80,
            },
          ],
          subTotal: 392.86,
          discount: 0,
          tax: 47.14,
          taxableTotal: 392.86,
          cgstTotal: 23.57,
          sgstTotal: 23.57,
          totalAmount: 440,
          createdBy: "Pharmacist",
          createdAt: "2026-09-15T14:15:00.000Z",
        };
        bills = [...bills, seedBill2];
        hasNewSeeds = true;
      }

      // Purge any previous test modified return bills for Rahul Verma
      const cleanedBills = bills.filter(
        b => !(b.billNumber === "MOD-BILL-2026-001245" || (b.originalBillNumber === "BILL-2026-001245" && b.billNumber.startsWith("MOD-")))
      );
      if (cleanedBills.length !== bills.length) {
        bills = cleanedBills;
        hasNewSeeds = true;
      }

      if (hasNewSeeds) {
        this.saveBills(bills);
      }
      return bills;
    } catch {
      return [];
    }
  }

  static updatePurchaseOrder(id: string, updates: Partial<AppPurchaseOrder>) {
    const pos = this.getPurchaseOrders();

    const idx = pos.findIndex((p) => p.id === id);

    if (idx !== -1) {
      pos[idx] = { ...pos[idx], ...updates };

      this.savePurchaseOrders(pos);
    }
  }

  // GRNs

  static getGRNs(): AppGRN[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(GRNS_KEY);

      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveGRNs(grns: AppGRN[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GRNS_KEY, JSON.stringify(grns));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static addGRN(grn: AppGRN) {
    const grns = this.getGRNs();

    grns.push(grn);

    this.saveGRNs(grns);
  }

  // Stock Transactions

  static getStockTransactions(): AppStockTransaction[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(STOCK_TXS_KEY);

      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveStockTransactions(txs: AppStockTransaction[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STOCK_TXS_KEY, JSON.stringify(txs));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static addTransaction(tx: AppStockTransaction) {
    const txs = this.getStockTransactions();

    txs.push(tx);

    this.saveStockTransactions(txs);
  }

  // Prescriptions

  static getPrescriptions(): AppPrescription[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(PRESCRIPTIONS_KEY);

      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static savePrescriptions(rx: AppPrescription[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(rx));

      window.dispatchEvent(new Event("storage"));

      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }



  static saveBills(bills: AppPharmacyBill[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BILLS_KEY, JSON.stringify(bills));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static addPharmacyBill(bill: AppPharmacyBill) {
    const bills = this.getBills();

    bills.unshift(bill);

    this.saveBills(bills);
  }

  // Returns

  static getReturns(): AppPharmacyReturn[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(RETURNS_KEY);
      let list: AppPharmacyReturn[] = stored ? JSON.parse(stored) : [];
      // Clean up previous test returns for Rahul Verma (BILL-2026-001245)
      const cleaned = list.filter(
        (r) => r.originalBillNumber !== "BILL-2026-001245" && r.patientName !== "Rahul Verma",
      );
      if (cleaned.length !== list.length) {
        this.saveReturns(cleaned);
        return cleaned;
      }
      return list;
    } catch {
      return [];
    }
  }

  static saveReturns(returns: AppPharmacyReturn[]) {
    if (typeof window !== "undefined") {
      // Deduplicate returns by ID or returnNumber to ensure zero duplicates in Returns History
      const seen = new Set<string>();
      const uniqueReturns = returns.filter((r) => {
        const key = r.id || r.returnNumber;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      window.localStorage.setItem(RETURNS_KEY, JSON.stringify(uniqueReturns));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static deleteReturn(id: string) {
    const returns = this.getReturns();
    const retToDelete = returns.find(r => r.id === id || r.returnNumber === id);
    const filteredReturns = returns.filter(r => r.id !== id && r.returnNumber !== id);
    this.saveReturns(filteredReturns);

    // Also remove the corresponding modified bill if present
    if (retToDelete?.modifiedBillNumber) {
      const bills = this.getBills();
      const filteredBills = bills.filter(
        b => b.billNumber !== retToDelete.modifiedBillNumber && b.id !== retToDelete.modifiedBillId
      );
      this.saveBills(filteredBills);
    }
  }

  static getReturnsForBill(billNumberOrId: string): AppPharmacyReturn[] {
    const allReturns = this.getReturns();
    return allReturns.filter(
      r => r.originalBillNumber === billNumberOrId || r.originalBillId === billNumberOrId
    );
  }

  static processMedicineReturn(
    originalBill: AppPharmacyBill,
    returnedItems: AppPharmacyReturnItem[],
    returnReason: string,
    notes?: string
  ): { returnRecord: AppPharmacyReturn; modifiedBill: AppPharmacyBill } {
    const returnNumber = "RET-" + new Date().getFullYear() + "-" + String(Math.floor(10000 + Math.random() * 90000));
    const modifiedBillNumber = "MOD-" + originalBill.billNumber;
    const now = new Date().toISOString();

    const refundAmount = returnedItems.reduce((sum, item) => sum + (item.refundAmount || 0), 0);
    const modifiedTotalAmount = Math.max(0, (originalBill.totalAmount || 0) - refundAmount);

    // Calculate previous returns to accurately determine line items
    const previousReturns = this.getReturnsForBill(originalBill.billNumber);
    const previouslyReturnedMap: Record<string, number> = {};
    previousReturns.forEach(ret => {
      (ret.items || []).forEach(item => {
        const key = `${item.medicineId}_${item.batchNumber}`;
        previouslyReturnedMap[key] = (previouslyReturnedMap[key] || 0) + (item.returnQuantity || 0);
      });
      if (ret.medicineId && ret.returnQuantity && (!ret.items || ret.items.length === 0)) {
        const key = `${ret.medicineId}_${ret.batchNumber || ""}`;
        previouslyReturnedMap[key] = (previouslyReturnedMap[key] || 0) + ret.returnQuantity;
      }
    });

    // 1. Build modified bill items
    const modifiedBillItems: AppPharmacyBillItem[] = originalBill.items.map(origItem => {
      const key = `${origItem.medicineId}_${origItem.batchNumber}`;
      const prevReturned = previouslyReturnedMap[key] || 0;
      const currentReturned = returnedItems.find(
        r => r.medicineId === origItem.medicineId && r.batchNumber === origItem.batchNumber
      )?.returnQuantity || 0;

      const totalReturned = prevReturned + currentReturned;
      const finalQty = Math.max(0, origItem.quantity - totalReturned);
      const unitPrice = origItem.unitPrice;
      const grossAmount = finalQty * unitPrice;
      const discount = origItem.discount || 0;
      const discAmt = grossAmount * (discount / 100);
      const taxable = grossAmount - discAmt;
      const taxRate = origItem.tax || 12;
      const cgstAmt = (taxable * (taxRate / 2)) / 100;
      const sgstAmt = (taxable * (taxRate / 2)) / 100;
      const totalPrice = taxable + cgstAmt + sgstAmt;

      return {
        ...origItem,
        quantity: finalQty,
        grossAmount,
        taxableAmount: taxable,
        cgstAmount: cgstAmt,
        sgstAmount: sgstAmt,
        totalPrice,
      };
    }).filter(item => item.quantity > 0);

    const subTotal = modifiedBillItems.reduce((s, i) => s + (i.taxableAmount || 0), 0);
    const cgstTotal = modifiedBillItems.reduce((s, i) => s + (i.cgstAmount || 0), 0);
    const sgstTotal = modifiedBillItems.reduce((s, i) => s + (i.sgstAmount || 0), 0);
    const totalTax = cgstTotal + sgstTotal;

    const modifiedBill: AppPharmacyBill = {
      id: "PB-" + Date.now(),
      billNumber: modifiedBillNumber,
      originalBillNumber: originalBill.billNumber,
      isModifiedReturnBill: true,
      patientId: originalBill.patientId,
      patientName: originalBill.patientName,
      uhid: originalBill.uhid,
      doctorName: originalBill.doctorName,
      department: originalBill.department,
      billType: originalBill.billType,
      paymentStatus: modifiedTotalAmount === 0 ? "Paid" : originalBill.paymentStatus,
      paymentMode: originalBill.paymentMode,
      prescriptionId: originalBill.prescriptionId,
      items: modifiedBillItems,
      subTotal,
      discount: originalBill.discount || 0,
      tax: totalTax,
      taxableTotal: subTotal,
      cgstTotal,
      sgstTotal,
      totalAmount: modifiedTotalAmount,
      createdBy: "Pharmacist",
      createdAt: now,
    };

    // 2. Create the return record
    const returnRecord: AppPharmacyReturn = {
      id: "RET-" + Date.now(),
      returnNumber,
      patientUhid: originalBill.uhid,
      patientName: originalBill.patientName,
      patientId: originalBill.patientId,
      doctorName: originalBill.doctorName,
      department: originalBill.department,
      originalBillId: originalBill.id,
      originalBillNumber: originalBill.billNumber,
      modifiedBillId: modifiedBill.id,
      modifiedBillNumber: modifiedBill.billNumber,
      items: returnedItems,
      // For legacy single-item schema compatibility
      medicineId: returnedItems[0]?.medicineId || "",
      batchNumber: returnedItems[0]?.batchNumber || "",
      returnQuantity: returnedItems.reduce((sum, i) => sum + i.returnQuantity, 0),
      originalTotalAmount: originalBill.totalAmount,
      modifiedTotalAmount,
      refundAmount,
      returnReason,
      notes,
      approvedBy: "Pharmacist",
      createdBy: "Pharmacist",
      status: "Completed",
      createdAt: now,
    };

    // 3. Save return record
    const returns = this.getReturns();
    returns.unshift(returnRecord);
    this.saveReturns(returns);

    // 4. Save modified bill (IMPORTANT: Original bill is preserved untouched)
    this.addPharmacyBill(modifiedBill);

    // 5. Restock batches and record stock transactions
    const batches = this.getBatches();
    returnedItems.forEach(item => {
      if (item.returnQuantity <= 0) return;

      const batch = batches.find(
        b => b.medicineId === item.medicineId && b.batchNumber === item.batchNumber
      );
      if (batch) {
        batch.availableQuantity += item.returnQuantity;
        this.updateBatch(batch.id, batch);
      } else {
        this.addBatch({
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate || "2027-12-31",
          quantity: item.returnQuantity,
          availableQuantity: item.returnQuantity,
          purchasePrice: (item.unitPrice || 0) * 0.7,
          mrp: item.unitPrice || 0,
        });
      }

      this.addTransaction({
        id: "TXN" + Math.floor(Math.random() * 100000),
        date: now,
        medicineId: item.medicineId,
        batchId: batch ? batch.id : "B-" + item.batchNumber,
        quantity: item.returnQuantity,
        transactionType: "RETURNED",
        userId: "Pharmacist",
        reason: returnReason,
        patientId: originalBill.patientId,
        billId: originalBill.billNumber,
      });
    });

    // 6. Log audit
    this.logAudit(
      "Pharmacist",
      "Medicine Return",
      "Pharmacy Returns",
      returnNumber,
      `Processed return ${returnNumber} for bill ${originalBill.billNumber}. Refund: ₹${refundAmount.toFixed(2)}. Modified bill: ${modifiedBillNumber}`
    );

    // 7. Push notification
    this.addNotification(
      "Medicine Return Processed",
      `Return ${returnNumber} processed for bill ${originalBill.billNumber}. Refund amount: ₹${refundAmount.toFixed(2)}`,
      "info"
    );

    return { returnRecord, modifiedBill };
  }

  // Transfers

  static getTransfers(): AppStockTransfer[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(TRANSFERS_KEY);

      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveTransfers(transfers: AppStockTransfer[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TRANSFERS_KEY, JSON.stringify(transfers));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  // Supplier Returns

  static getSupplierReturns(): AppSupplierReturn[] {
    return this.load<AppSupplierReturn[]>(
      SUPPLIER_RETURNS_KEY,
      INITIAL_PHARMACY_SUPPLIER_RETURNS,
    );
  }

  static saveSupplierReturns(returns: AppSupplierReturn[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        SUPPLIER_RETURNS_KEY,
        JSON.stringify(returns),
      );
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  // Adjustments

  static getAdjustments(): AppStockAdjustment[] {
    return this.load<AppStockAdjustment[]>(
      ADJUSTMENTS_KEY,
      INITIAL_PHARMACY_ADJUSTMENTS,
    );
  }

  static saveAdjustments(adjustments: AppStockAdjustment[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADJUSTMENTS_KEY, JSON.stringify(adjustments));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  // Clarifications

  static getClarifications(): AppPrescriptionClarification[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(CLARIFICATIONS_KEY);

      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveClarifications(clarifications: AppPrescriptionClarification[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        CLARIFICATIONS_KEY,
        JSON.stringify(clarifications),
      );
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static updatePrescription(id: string, updates: Partial<AppPrescription>) {
    const rxs = this.getPrescriptions();

    const idx = rxs.findIndex((r) => r.id === id);

    if (idx > -1) {
      rxs[idx] = { ...rxs[idx], ...updates };

      this.savePrescriptions(rxs);
    }
  }

  static logAudit(user: string, action: string, module: string, record: string, details?: string) {
    const logs = this.getAuditLogs();

    logs.unshift({
      id: "LOG" + Date.now(),

      timestamp: new Date().toISOString(),

      user,
      action,
      module,
      record: details !== undefined ? record : "SYS",
      details: details !== undefined ? details : record,
    });

    this.saveAuditLogs(logs);
  }

  // FEFO Helper Engine

  // Given a medicine and quantity, it returns the exact batch splits required to fulfill the order based on Earliest Expiry.

  static executeFEFOSplit(
    medicineId: string,
    requiredQty: number,
    currentBatches: AppBatch[],
    location: string = "Main Pharmacy",
  ): {
    success: boolean;
    splits: { batch: AppBatch; usedQty: number }[];
    remainingBatches: AppBatch[];
  } {
    const availableBatches = currentBatches.filter(
      (b) =>
        b.medicineId === medicineId &&
        b.availableQuantity > 0 &&
        (b.location || "Main Pharmacy") === location,
    );

    // Calculate total available to see if fulfillment is possible

    const totalAvailable = availableBatches.reduce(
      (sum, b) => sum + b.availableQuantity,
      0,
    );

    if (totalAvailable < requiredQty) {
      return { success: false, splits: [], remainingBatches: currentBatches };
    }

    // Sort by Expiry Date (FEFO)

    availableBatches.sort(
      (a, b) =>
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
    );

    let remainingToFulfill = requiredQty;

    const splits: { batch: AppBatch; usedQty: number }[] = [];

    // Deep copy to prevent mutating the original array passed in until caller saves

    const updatedBatches = JSON.parse(
      JSON.stringify(currentBatches),
    ) as AppBatch[];

    for (const batch of availableBatches) {
      if (remainingToFulfill <= 0) break;

      const targetBatchIndex = updatedBatches.findIndex(
        (b) => b.id === batch.id,
      );

      if (targetBatchIndex === -1) continue;

      const targetBatch = updatedBatches[targetBatchIndex];

      const canTake = Math.min(
        targetBatch.availableQuantity,
        remainingToFulfill,
      );

      splits.push({ batch: { ...targetBatch }, usedQty: canTake });

      targetBatch.availableQuantity -= canTake;

      remainingToFulfill -= canTake;
    }

    return {
      success: remainingToFulfill === 0,

      splits,

      remainingBatches: updatedBatches,
    };
  }
}
