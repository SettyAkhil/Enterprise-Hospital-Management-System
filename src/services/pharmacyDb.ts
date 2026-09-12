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
  initialQuantity: number;
  availableQuantity: number; // For FEFO
  purchasePrice: number;
  sellingPrice: number;
  supplierId: string;
  invoiceNumber: string;
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
  discount: number;
  tax: number;
  totalPrice: number;
}

export interface AppPharmacyBillItem {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  totalPrice: number;
}

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

const CATEGORIES_KEY = "hospai_pharm_categories_v1";
const SUPPLIERS_KEY = "hospai_pharm_suppliers_v1";
const MEDICINES_KEY = "hospai_pharm_medicines_v1";
const BATCHES_KEY = "hospai_pharm_batches_v1";
const POS_KEY = "hospai_pharm_pos_v1";
const GRNS_KEY = "hospai_pharm_grns_v1";
const STOCK_TXS_KEY = "hospai_pharm_stock_txs_v1";
const PRESCRIPTIONS_KEY = "hospai_pharm_rx_v1";
const BILLS_KEY = "hospai_pharm_bills_v1";
const RETURNS_KEY = "hospai_pharm_returns_v1";
const TRANSFERS_KEY = "hospai_pharm_transfers_v1";
const SUPPLIER_RETURNS_KEY = "hospai_pharm_supp_returns_v1";
const ADJUSTMENTS_KEY = "hospai_pharm_adjustments_v1";
const CLARIFICATIONS_KEY = "hospai_pharm_clarifications_v1";

export class PharmacyDatabase {
  // Categories
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
