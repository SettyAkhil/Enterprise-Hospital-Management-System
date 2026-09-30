// Enterprise Hospital Management System (HMS) - Insurance & Claims Domain Types

export type PolicyRelationship = "Self" | "Spouse" | "Child" | "Parent" | "Other";

export type ClaimEncounterType = "OP" | "IP" | "ER" | "OT" | "ICU";

export type InsuranceClaimStatus =
  | "DRAFT"
  | "ELIGIBILITY_PENDING"
  | "ELIGIBLE"
  | "NOT_ELIGIBLE"
  | "PREAUTH_DRAFT"
  | "PREAUTH_SUBMITTED"
  | "PREAUTH_UNDER_REVIEW"
  | "PREAUTH_QUERY"
  | "PREAUTH_APPROVED"
  | "PREAUTH_REJECTED"
  | "TREATMENT_IN_PROGRESS"
  | "DISCHARGE_INITIATED"
  | "FINAL_BILL_READY"
  | "CLAIM_SUBMITTED"
  | "CLAIM_QUERY_RAISED"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "REJECTED"
  | "SETTLEMENT_PENDING"
  | "PAYMENT_RECEIVED"
  | "RECONCILED"
  | "CLOSED";

export interface InsurancePolicyDetails {
  insurerId: string;
  insurerName: string;
  tpaId?: string;
  tpaName?: string;
  policyNumber: string;
  memberId: string;
  groupPolicyNo?: string;
  policyHolderName: string;
  relationship: PolicyRelationship;
  validUntil: string;
  sumInsured: number;
  balanceAvailable: number;
  roomCategoryEligible: string; // e.g. "Deluxe Private", "Semi-Private", "General Ward"
  copayPercentage: number;
  deductibleAmount: number;
  preAuthRequired: boolean;
}

export interface EligibilityResult {
  status: "Eligible" | "Partially Eligible" | "Not Eligible" | "Verification Required";
  verifiedAt: string;
  verifiedBy: string;
  roomEligibilityNote: string;
  copayApplicable: boolean;
  copayValue: string;
  deductibleRemaining: number;
  preAuthRequired: boolean;
  notes?: string;
}

export interface DocumentChecklistItem {
  id: string;
  documentType: string;
  label: string;
  isMandatory: boolean;
  isUploaded: boolean;
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface PreAuthRequest {
  id: string; // e.g. "PA-2026-00098"
  encounterId: string;
  patientId: string;
  patientName: string;
  mrn: string;
  encounterType: ClaimEncounterType;
  proposedProcedureCode: string; // e.g. "B-11"
  proposedProcedureName: string; // e.g. "Appendectomy"
  packagePrice: number;
  estimatedHospitalStayDays: number;
  estimatedTotalCost: number;
  requestedAmount: number;
  approvedAmount: number;
  status: "Draft" | "Submitted" | "Under Review" | "Query" | "Approved" | "Rejected";
  checklist: DocumentChecklistItem[];
  submissionHistory: {
    timestamp: string;
    action: string;
    user: string;
    notes?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface ClaimQuery {
  id: string;
  claimId: string;
  queryDate: string;
  dueDate: string;
  requestedBy: string; // Insurer / TPA Name
  queryText: string;
  status: "Open" | "Draft Response" | "Response Submitted" | "Closed";
  hospitalResponseText?: string;
  attachedDocumentUrls?: string[];
  respondedAt?: string;
  respondedBy?: string;
}

export interface SurgeryPricingRule {
  sequenceOrder: number; // 1 = 100%, 2 = 50%, 3 = 25%...
  discountPercentage: number; // 100, 50, 25
  description: string;
}

export interface PackageMaster {
  id: string;
  code: string; // e.g. "B-11"
  procedureName: string; // e.g. "Appendectomy"
  basePrice: number; // 32700
  applicableGstRate: number; // 5%
  department: string; // "General Surgery"
  includedComponents: ("Surgeon" | "OT" | "Room" | "Nursing" | "Investigations" | "Pharmacy")[];
  excludedComponents: ("Implants" | "HighCostDrugs" | "SpecialConsultations")[];
  pricingRules: SurgeryPricingRule[];
  effectiveDate: string;
  status: "Active" | "Inactive";
}

export interface InsuranceCompanyConfig {
  id: string;
  companyName: string; // e.g. "Star Health", "HDFC ERGO"
  companyCode: string; // e.g. "STAR-01"
  tpaName?: string; // e.g. "Family Health Plan TPA"
  contactPhone: string;
  contactEmail: string;
  preAuthEmail: string;
  claimsEmail: string;
  networkStatus: "Empaneled / In-Network" | "Non-Network" | "Preferred Provider";
  documentRequirements: string[]; // List of mandatory doc types
  slaDaysForPreAuth: number; // e.g. 2
  slaDaysForClaimSettlement: number; // e.g. 15
  status: "Active" | "Inactive";
}

export interface ClaimDeductionReason {
  id: string;
  category: "Non-Payable Consumables" | "Room Rent Capping" | "Co-pay Deduction" | "Unapproved Excess" | "Other";
  amount: number;
  remark: string;
}

export interface ClaimSettlementRecord {
  id: string;
  claimId: string;
  settlementAdviceNo: string;
  approvedAmount: number;
  deductionsAmount: number;
  deductionReasons: ClaimDeductionReason[];
  netSettlementAmount: number;
  paymentReferenceNo: string; // UTR / Cheque No
  paymentDate: string;
  bankAccountName: string;
  reconciliationStatus: "Pending" | "Matched" | "Discrepancy" | "Reconciled";
  reconciledAt?: string;
  reconciledBy?: string;
}

export interface AuditTrailLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  oldStatus?: string;
  newStatus?: string;
  comments?: string;
}

export interface ComprehensiveClaimRecord {
  id: string; // "CLM-2026-001245"
  encounterId: string;
  patientId: string;
  patientName: string;
  mrn: string;
  age: number;
  gender: string;
  phone: string;
  encounterType: ClaimEncounterType;
  department: string;
  dateOfService: string;
  admissionDate?: string;
  dischargeDate?: string;
  
  // Insurance policy details
  policy: InsurancePolicyDetails;
  eligibility?: EligibilityResult;
  preAuth?: PreAuthRequest;
  
  // Financial breakdown
  packageApplied?: PackageMaster;
  totalHospitalBill: number; // ₹2,50,000
  packageBaseAmount: number; // ₹32,700
  approvedPreAuthAmount: number; // ₹2,10,000
  consumedBillAmount: number; // Current ongoing bill total ₹1,72,000
  nonPayableAmount: number; // ₹15,000
  patientShareAmount: number; // ₹25,000
  finalClaimAmount: number; // ₹2,10,000
  
  // State machine and workflow
  status: InsuranceClaimStatus;
  documents: DocumentChecklistItem[];
  queries: ClaimQuery[];
  settlement?: ClaimSettlementRecord;
  auditTrail: AuditTrailLog[];
  
  createdAt: string;
  updatedAt: string;
}
