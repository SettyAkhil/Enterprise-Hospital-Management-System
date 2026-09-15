
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

export type POStatus = "Draft" | "Submitted" | "Approved" | "Ordered" | "Partially Received" | "Received" | "Cancelled";

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

export type StockTransactionType = "PURCHASE_RECEIVED" | "DISPENSED" | "RETURNED" | "EXPIRED" | "ADJUSTMENT" | "DAMAGED" | "TRANSFER_OUT" | "TRANSFER_IN";

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
export type PrescriptionStatus = "Draft" | "Sent To Pharmacy" | "Received" | "OCR Processing" | "Verification Pending" | "Verified" | "Approved" | "Preparing" | "Ready For Dispensing" | "Dispensed" | "Cancelled" | "Rejected";

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
export type DispensingStatus = "Waiting" | "Preparing" | "Ready" | "Dispensed" | "Cancelled";
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
  issueType: "Wrong Medicine" | "Stock Not Available" | "Dose Clarification Needed" | "Allergy Concern" | "Other";
  message: string;
  status: "Pending" | "Resolved";
  resolutionMessage?: string;
  createdAt: string;
}

export type BillType = "Cash" | "Insurance" | "Corporate" | "IP_Ward";
export type PaymentStatus = "Pending" | "Partially Paid" | "Paid" | "Insurance Pending" | "Credit Approved";

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
}

// Phase 4 - Returns, Transfers, Expiry

export type ReturnStatus = "Requested" | "Approved" | "Rejected" | "Completed";

export interface AppPharmacyReturn {
  id: string;
  returnNumber: string;
  patientUhid: string;
  originalBillId: string;
  medicineId: string;
  batchNumber: string;
  returnQuantity: number;
  returnReason: string;
  approvedBy?: string;
  status: ReturnStatus;
  createdAt: string;
}

export type TransferStatus = "Requested" | "Approved" | "Transferred" | "Received" | "Cancelled";

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
  supplierId: string;
  medicineId: string;
  batchId: string;
  quantity: number;
  reason: "Expired" | "Damaged" | "Wrong Item";
  status: "Requested" | "Approved" | "Credit Note Received";
  creditNoteId?: string;
  createdAt: string;
}

export interface AppStockAdjustment {
  id: string;
  medicineId: string;
  batchId: string;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  reason: "Physical Mismatch" | "Damage" | "Missing Stock";
  approvedBy: string;
  status: "Approved";
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

export class PharmacyDatabase {
  // Categories

  static getUsers(): AppUser[] {
    if (typeof window === "undefined") return [];
    try { const stored = window.localStorage.getItem(USERS_KEY); return stored ? JSON.parse(stored) : []; } catch { return []; }
  }
  static saveUsers(users: AppUser[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  static getNotifications(): AppNotification[] {
    if (typeof window === "undefined") return [];
    try { const stored = window.localStorage.getItem(NOTIFICATIONS_KEY); return stored ? JSON.parse(stored) : []; } catch { return []; }
  }
  static saveNotifications(notifications: AppNotification[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }

  static getAuditLogs(): AppAuditLog[] {
    if (typeof window === "undefined") return [];
    try { const stored = window.localStorage.getItem(AUDIT_LOGS_KEY); return stored ? JSON.parse(stored) : []; } catch { return []; }
  }
  static saveAuditLogs(logs: AppAuditLog[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
  }

  static getCategories(): AppCategory[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(CATEGORIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveCategories(categories: AppCategory[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }

  static addCategory(cat: AppCategory) {
    const cats = this.getCategories();
    cats.push(cat);
    this.saveCategories(cats);
  }

  static updateCategory(id: string, updates: Partial<AppCategory>) {
    const cats = this.getCategories();
    const idx = cats.findIndex(c => c.id === id);
    if (idx !== -1) {
      cats[idx] = { ...cats[idx], ...updates };
      this.saveCategories(cats);
    }
  }

  static deleteCategory(id: string) {
    this.saveCategories(this.getCategories().filter(c => c.id !== id));
  }

  // Suppliers
  static getSuppliers(): AppSupplier[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(SUPPLIERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveSuppliers(suppliers: AppSupplier[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
  }

  static addSupplier(sup: AppSupplier) {
    const sups = this.getSuppliers();
    sups.push(sup);
    this.saveSuppliers(sups);
  }

  static updateSupplier(id: string, updates: Partial<AppSupplier>) {
    const sups = this.getSuppliers();
    const idx = sups.findIndex(s => s.id === id);
    if (idx !== -1) {
      sups[idx] = { ...sups[idx], ...updates };
      this.saveSuppliers(sups);
    }
  }

  static deleteSupplier(id: string) {
    this.saveSuppliers(this.getSuppliers().filter(s => s.id !== id));
  }

  // Medicines
  static getMedicines(): AppMedicine[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(MEDICINES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveMedicines(medicines: AppMedicine[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
  }

  static addMedicine(med: AppMedicine) {
    const meds = this.getMedicines();
    meds.push(med);
    this.saveMedicines(meds);
  }

  static updateMedicine(id: string, updates: any) {
    const meds = this.getMedicines();
    const idx = meds.findIndex(m => m.id === id);
    if (idx !== -1) {
      meds[idx] = { ...meds[idx], ...updates, medicineName: updates.name || meds[idx].medicineName };
      this.saveMedicines(meds);
    }
  }

  static deleteMedicine(id: string) {
    const meds = this.getMedicines();
    this.saveMedicines(meds.filter(m => m.id !== id));
  }

  // Batches
  static getBatches(): AppBatch[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(BATCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveBatches(batches: AppBatch[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(BATCHES_KEY, JSON.stringify(batches));
  }

  static updateBatch(id: string, updates: Partial<AppBatch>) {
    const batches = this.getBatches();
    const idx = batches.findIndex(b => b.id === id);
    if (idx !== -1) {
      batches[idx] = { ...batches[idx], ...updates };
      this.saveBatches(batches);
    }
  }

  static addBatch(batch: any) {
    const batches = this.getBatches();
    batches.push({
      id: "B" + Date.now() + Math.floor(Math.random()*100),
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
      createdAt: new Date().toISOString()
    });
    this.saveBatches(batches);
  }

  // Purchase Orders
  static getPurchaseOrders(): AppPurchaseOrder[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(POS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static savePurchaseOrders(pos: AppPurchaseOrder[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(POS_KEY, JSON.stringify(pos));
  }

  static addPurchaseOrder(po: AppPurchaseOrder) {
    const pos = this.getPurchaseOrders();
    pos.push(po);
    this.savePurchaseOrders(pos);
  }

  static updatePurchaseOrder(id: string, updates: Partial<AppPurchaseOrder>) {
    const pos = this.getPurchaseOrders();
    const idx = pos.findIndex(p => p.id === id);
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
    } catch { return []; }
  }
  static saveGRNs(grns: AppGRN[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(GRNS_KEY, JSON.stringify(grns));
  }

  // Stock Transactions
  static getStockTransactions(): AppStockTransaction[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(STOCK_TXS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveStockTransactions(txs: AppStockTransaction[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(STOCK_TXS_KEY, JSON.stringify(txs));
  }

  // Prescriptions
  static getPrescriptions(): AppPrescription[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(PRESCRIPTIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static savePrescriptions(rx: AppPrescription[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(rx));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  // Bills
  static getBills(): AppPharmacyBill[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(BILLS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveBills(bills: AppPharmacyBill[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(BILLS_KEY, JSON.stringify(bills));
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
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveReturns(returns: AppPharmacyReturn[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(RETURNS_KEY, JSON.stringify(returns));
  }

  // Transfers
  static getTransfers(): AppStockTransfer[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(TRANSFERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveTransfers(transfers: AppStockTransfer[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(TRANSFERS_KEY, JSON.stringify(transfers));
  }

  // Supplier Returns
  static getSupplierReturns(): AppSupplierReturn[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(SUPPLIER_RETURNS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveSupplierReturns(returns: AppSupplierReturn[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(SUPPLIER_RETURNS_KEY, JSON.stringify(returns));
  }

  // Adjustments
  static getAdjustments(): AppStockAdjustment[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(ADJUSTMENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveAdjustments(adjustments: AppStockAdjustment[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(ADJUSTMENTS_KEY, JSON.stringify(adjustments));
  }

  // Clarifications
  static getClarifications(): AppPrescriptionClarification[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(CLARIFICATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveClarifications(clarifications: AppPrescriptionClarification[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(CLARIFICATIONS_KEY, JSON.stringify(clarifications));
  }


  static updatePrescription(id: string, updates: Partial<AppPrescription>) {
    const rxs = this.getPrescriptions();
    const idx = rxs.findIndex(r => r.id === id);
    if (idx > -1) {
      rxs[idx] = { ...rxs[idx], ...updates };
      this.savePrescriptions(rxs);
    }
  }

  static logAudit(user: string, action: string, module: string, record: string, details: string) {
    const logs = this.getAuditLogs();
    logs.unshift({
      id: "LOG" + Date.now(),
      timestamp: new Date().toISOString(),
      user, action, module, record, details
    });
    this.saveAuditLogs(logs);
  }

  // FEFO Helper Engine
  // Given a medicine and quantity, it returns the exact batch splits required to fulfill the order based on Earliest Expiry.
  static executeFEFOSplit(medicineId: string, requiredQty: number, currentBatches: AppBatch[], location: string = "Main Pharmacy"): { success: boolean, splits: { batch: AppBatch, usedQty: number }[], remainingBatches: AppBatch[] } {
     const availableBatches = currentBatches.filter(b => b.medicineId === medicineId && b.availableQuantity > 0 && (b.location || "Main Pharmacy") === location);
     
     // Calculate total available to see if fulfillment is possible
     const totalAvailable = availableBatches.reduce((sum, b) => sum + b.availableQuantity, 0);
     if (totalAvailable < requiredQty) {
       return { success: false, splits: [], remainingBatches: currentBatches };
     }

     // Sort by Expiry Date (FEFO)
     availableBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

     let remainingToFulfill = requiredQty;
     const splits: { batch: AppBatch, usedQty: number }[] = [];
     
     // Deep copy to prevent mutating the original array passed in until caller saves
     const updatedBatches = JSON.parse(JSON.stringify(currentBatches)) as AppBatch[];

     for (const batch of availableBatches) {
        if (remainingToFulfill <= 0) break;

        const targetBatchIndex = updatedBatches.findIndex(b => b.id === batch.id);
        if (targetBatchIndex === -1) continue;
        
        const targetBatch = updatedBatches[targetBatchIndex];
        const canTake = Math.min(targetBatch.availableQuantity, remainingToFulfill);
        
        splits.push({ batch: { ...targetBatch }, usedQty: canTake });
        
        targetBatch.availableQuantity -= canTake;
        remainingToFulfill -= canTake;
     }

     return {
       success: remainingToFulfill === 0,
       splits,
       remainingBatches: updatedBatches
     };
  }
}
