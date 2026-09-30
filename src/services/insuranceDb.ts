// Enterprise Hospital Management System (HMS) - Insurance Engine & DB Service

import {
  InsuranceCompanyConfig,
  PackageMaster,
  SurgeryPricingRule,
  ComprehensiveClaimRecord,
  PreAuthRequest,
  ClaimQuery,
  ClaimSettlementRecord,
  InsuranceClaimStatus,
  DocumentChecklistItem,
  AuditTrailLog,
} from "../types/insurance";

const STORAGE_KEY_INSURERS = "hospai_insurance_companies_v1";
const STORAGE_KEY_PACKAGES = "hospai_insurance_packages_v1";
const STORAGE_KEY_CLAIMS_FULL = "hospai_insurance_claims_full_v1";
const STORAGE_KEY_PREAUTH = "hospai_insurance_preauth_v1";
const STORAGE_KEY_QUERIES = "hospai_insurance_queries_v1";
const STORAGE_KEY_SETTLEMENTS = "hospai_insurance_settlements_v1";

const BROADCAST_CHANNEL_NAME = "hospai_insurance_engine_sync";
const broadcastChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel(BROADCAST_CHANNEL_NAME)
    : null;

// Default Insurance Companies Master Seed
const SEED_INSURERS: InsuranceCompanyConfig[] = [
  {
    id: "INS-001",
    companyName: "Star Health & Allied Insurance",
    companyCode: "STAR-HLTH",
    tpaName: "Star Health In-House TPA",
    contactPhone: "+91 1800 425 2255",
    contactEmail: "claims@starhealth.in",
    preAuthEmail: "preauth@starhealth.in",
    claimsEmail: "settlements@starhealth.in",
    networkStatus: "Empaneled / In-Network",
    documentRequirements: [
      "Insurance Card",
      "Patient Govt ID",
      "Doctor Initial Notes",
      "Diagnosis & ICP",
      "Cost Estimate Sheet",
      "Discharge Summary",
      "Final Itemized Bill",
    ],
    slaDaysForPreAuth: 1,
    slaDaysForClaimSettlement: 14,
    status: "Active",
  },
  {
    id: "INS-002",
    companyName: "HDFC ERGO General Insurance",
    companyCode: "HDFC-ERGO",
    tpaName: "FHPL (Family Health Plan TPA)",
    contactPhone: "+91 1800 266 6000",
    contactEmail: "care@hdfcergo.com",
    preAuthEmail: "cashless@fhpl.net",
    claimsEmail: "claims@hdfcergo.com",
    networkStatus: "Empaneled / In-Network",
    documentRequirements: [
      "Insurance Card",
      "Aadhaar Card",
      "Doctor Clinical Summary",
      "Investigation Reports",
      "Package Rate Agreement",
      "Discharge Summary",
      "Pharmacy Prescriptions",
    ],
    slaDaysForPreAuth: 2,
    slaDaysForClaimSettlement: 10,
    status: "Active",
  },
  {
    id: "INS-003",
    companyName: "PM-JAY (Ayushman Bharat)",
    companyCode: "PM-JAY",
    tpaName: "State Health Agency (SHA)",
    contactPhone: "+91 14555",
    contactEmail: "ayushman@pmjay.gov.in",
    preAuthEmail: "preauth.pmjay@gov.in",
    claimsEmail: "claims.pmjay@gov.in",
    networkStatus: "Empaneled / In-Network",
    documentRequirements: [
      "Ayushman Golden Card",
      "Ration Card / ID Proof",
      "Biometric Verification Slip",
      "Doctor OPD Note",
      "Pre-Op & Post-Op Photos",
      "Discharge Summary",
    ],
    slaDaysForPreAuth: 1,
    slaDaysForClaimSettlement: 7,
    status: "Active",
  },
  {
    id: "INS-004",
    companyName: "ICICI Lombard General Insurance",
    companyCode: "ICICI-LOMB",
    tpaName: "Medi Assist TPA",
    contactPhone: "+91 1800 2666",
    contactEmail: "ihealth@icicilombard.com",
    preAuthEmail: "cashless@mediassist.in",
    claimsEmail: "claims@mediassist.in",
    networkStatus: "Empaneled / In-Network",
    documentRequirements: [
      "Insurance Card",
      "ID Proof",
      "Clinical Notes",
      "Investigation Reports",
      "Discharge Summary",
    ],
    slaDaysForPreAuth: 2,
    slaDaysForClaimSettlement: 15,
    status: "Active",
  },
];

// Default Packages Master Seed (Includes Procedure B-11 Appendectomy)
const SEED_PACKAGES: PackageMaster[] = [
  {
    id: "PKG-B11",
    code: "B-11",
    procedureName: "Laparoscopic Appendectomy",
    basePrice: 32700,
    applicableGstRate: 5,
    department: "General Surgery",
    includedComponents: ["Surgeon", "OT", "Room", "Nursing", "Investigations", "Pharmacy"],
    excludedComponents: ["Implants", "HighCostDrugs"],
    pricingRules: [
      { sequenceOrder: 1, discountPercentage: 100, description: "1st Surgery -> 100% of Base Package Rate" },
      { sequenceOrder: 2, discountPercentage: 50, description: "2nd Surgery -> 50% of Base Package Rate" },
      { sequenceOrder: 3, discountPercentage: 25, description: "3rd Surgery & Subsequent -> 25% of Base Package Rate" },
    ],
    effectiveDate: "2026-01-01",
    status: "Active",
  },
  {
    id: "PKG-C04",
    code: "C-04",
    procedureName: "Laparoscopic Cholecystectomy",
    basePrice: 42500,
    applicableGstRate: 5,
    department: "General Surgery",
    includedComponents: ["Surgeon", "OT", "Room", "Nursing", "Investigations", "Pharmacy"],
    excludedComponents: ["Implants"],
    pricingRules: [
      { sequenceOrder: 1, discountPercentage: 100, description: "1st Surgery -> 100%" },
      { sequenceOrder: 2, discountPercentage: 50, description: "2nd Surgery -> 50%" },
      { sequenceOrder: 3, discountPercentage: 25, description: "3rd Surgery -> 25%" },
    ],
    effectiveDate: "2026-01-01",
    status: "Active",
  },
  {
    id: "PKG-H02",
    code: "H-02",
    procedureName: "Inguinal Hernia Mesh Repair",
    basePrice: 38000,
    applicableGstRate: 5,
    department: "General Surgery",
    includedComponents: ["Surgeon", "OT", "Room", "Nursing"],
    excludedComponents: ["Implants", "HighCostDrugs"],
    pricingRules: [
      { sequenceOrder: 1, discountPercentage: 100, description: "1st Surgery -> 100%" },
      { sequenceOrder: 2, discountPercentage: 50, description: "2nd Surgery -> 50%" },
    ],
    effectiveDate: "2026-01-01",
    status: "Active",
  },
];

// Default Claims Seed Data
const SEED_CLAIMS: ComprehensiveClaimRecord[] = [
  {
    id: "CLM-2026-001245",
    encounterId: "ENC-88102",
    patientId: "UMR100245",
    patientName: "John Smith",
    mrn: "100245",
    age: 42,
    gender: "Male",
    phone: "+91 98765 43210",
    encounterType: "IP",
    department: "General Surgery",
    dateOfService: "2026-09-20",
    admissionDate: "2026-09-20T10:00:00Z",
    dischargeDate: "2026-09-23T14:30:00Z",
    policy: {
      insurerId: "INS-001",
      insurerName: "Star Health & Allied Insurance",
      tpaName: "Star Health In-House TPA",
      policyNumber: "SH-28847291",
      memberId: "SH-MEM-9921",
      policyHolderName: "John Smith",
      relationship: "Self",
      validUntil: "2027-03-31",
      sumInsured: 500000,
      balanceAvailable: 420000,
      roomCategoryEligible: "Semi-Private",
      copayPercentage: 10,
      deductibleAmount: 5000,
      preAuthRequired: true,
    },
    eligibility: {
      status: "Eligible",
      verifiedAt: "2026-09-20T10:15:00Z",
      verifiedBy: "Jessica Carter, RN",
      roomEligibilityNote: "Eligible for Semi-Private ward up to ₹3,500/day",
      copayApplicable: true,
      copayValue: "10%",
      deductibleRemaining: 0,
      preAuthRequired: true,
    },
    preAuth: {
      id: "PA-2026-00098",
      encounterId: "ENC-88102",
      patientId: "UMR100245",
      patientName: "John Smith",
      mrn: "100245",
      encounterType: "IP",
      proposedProcedureCode: "B-11",
      proposedProcedureName: "Laparoscopic Appendectomy",
      packagePrice: 32700,
      estimatedHospitalStayDays: 3,
      estimatedTotalCost: 75000,
      requestedAmount: 75000,
      approvedAmount: 68000,
      status: "Approved",
      checklist: [
        { id: "doc-1", documentType: "Insurance Card", label: "Star Health Insurance Card", isMandatory: true, isUploaded: true },
        { id: "doc-2", documentType: "Patient Govt ID", label: "Aadhaar Card", isMandatory: true, isUploaded: true },
        { id: "doc-3", documentType: "Doctor Initial Notes", label: "Admission & Clinical Note", isMandatory: true, isUploaded: true },
        { id: "doc-4", documentType: "Cost Estimate Sheet", label: "Pre-Auth Cost Breakdown", isMandatory: true, isUploaded: true },
      ],
      submissionHistory: [
        { timestamp: "2026-09-20T10:45:00Z", action: "Pre-Auth Submitted", user: "Insurance Officer Desk" },
        { timestamp: "2026-09-20T14:20:00Z", action: "Pre-Auth Approved (₹68,000)", user: "Star Health Portal" },
      ],
      createdAt: "2026-09-20T10:45:00Z",
      updatedAt: "2026-09-20T14:20:00Z",
    },
    packageApplied: SEED_PACKAGES[0],
    totalHospitalBill: 72500,
    packageBaseAmount: 32700,
    approvedPreAuthAmount: 68000,
    consumedBillAmount: 72500,
    nonPayableAmount: 4500,
    patientShareAmount: 6800,
    finalClaimAmount: 61200,
    status: "CLAIM_SUBMITTED",
    documents: [
      { id: "d1", documentType: "Insurance Card", label: "Insurance Card", isMandatory: true, isUploaded: true },
      { id: "d2", documentType: "Patient Govt ID", label: "Aadhaar Card", isMandatory: true, isUploaded: true },
      { id: "d3", documentType: "Doctor Initial Notes", label: "Doctor Notes", isMandatory: true, isUploaded: true },
      { id: "d4", documentType: "Diagnosis & ICP", label: "ICP & Diagnosis Sheet", isMandatory: true, isUploaded: true },
      { id: "d5", documentType: "Cost Estimate Sheet", label: "Estimate Sheet", isMandatory: true, isUploaded: true },
      { id: "d6", documentType: "Discharge Summary", label: "Discharge Summary", isMandatory: true, isUploaded: true },
      { id: "d7", documentType: "Final Itemized Bill", label: "Final Hospital Bill", isMandatory: true, isUploaded: true },
    ],
    queries: [],
    auditTrail: [
      { id: "a1", timestamp: "2026-09-20T10:15:00Z", user: "Jessica Carter", role: "Nurse", action: "Eligibility Verified" },
      { id: "a2", timestamp: "2026-09-20T10:45:00Z", user: "Admin", role: "Insurance Desk", action: "Pre-Auth Submitted" },
      { id: "a3", timestamp: "2026-09-23T15:00:00Z", user: "Admin", role: "Billing Desk", action: "Final Claim Submitted (₹61,200)" },
    ],
    createdAt: "2026-09-20T10:15:00Z",
    updatedAt: "2026-09-23T15:00:00Z",
  },
  {
    id: "CLM-2026-001246",
    encounterId: "ENC-88109",
    patientId: "UMR100246",
    patientName: "Mary Jones",
    mrn: "100246",
    age: 38,
    gender: "Female",
    phone: "+91 98112 33445",
    encounterType: "IP",
    department: "General Surgery",
    dateOfService: "2026-09-22",
    admissionDate: "2026-09-22T11:30:00Z",
    policy: {
      insurerId: "INS-002",
      insurerName: "HDFC ERGO General Insurance",
      tpaName: "FHPL TPA",
      policyNumber: "ICICI-9920118",
      memberId: "MEM-8821",
      policyHolderName: "Mary Jones",
      relationship: "Self",
      validUntil: "2027-05-15",
      sumInsured: 400000,
      balanceAvailable: 350000,
      roomCategoryEligible: "Private Room",
      copayPercentage: 0,
      deductibleAmount: 0,
      preAuthRequired: true,
    },
    eligibility: {
      status: "Eligible",
      verifiedAt: "2026-09-22T11:45:00Z",
      verifiedBy: "Staff Nurse",
      roomEligibilityNote: "Full Private Room Coverage",
      copayApplicable: false,
      copayValue: "0%",
      deductibleRemaining: 0,
      preAuthRequired: true,
    },
    preAuth: {
      id: "PA-2026-00102",
      encounterId: "ENC-88109",
      patientId: "UMR100246",
      patientName: "Mary Jones",
      mrn: "100246",
      encounterType: "IP",
      proposedProcedureCode: "C-04",
      proposedProcedureName: "Laparoscopic Cholecystectomy",
      packagePrice: 42500,
      estimatedHospitalStayDays: 2,
      estimatedTotalCost: 65000,
      requestedAmount: 65000,
      approvedAmount: 58000,
      status: "Approved",
      checklist: [],
      submissionHistory: [],
      createdAt: "2026-09-22T12:00:00Z",
      updatedAt: "2026-09-22T16:00:00Z",
    },
    packageApplied: SEED_PACKAGES[1],
    totalHospitalBill: 61000,
    packageBaseAmount: 42500,
    approvedPreAuthAmount: 58000,
    consumedBillAmount: 61000,
    nonPayableAmount: 3000,
    patientShareAmount: 0,
    finalClaimAmount: 58000,
    status: "CLAIM_QUERY_RAISED",
    documents: [],
    queries: [
      {
        id: "Q-1024",
        claimId: "CLM-2026-001246",
        queryDate: "2026-09-24T10:00:00Z",
        dueDate: "2026-10-01T23:59:59Z",
        requestedBy: "FHPL TPA Desk",
        queryText: "Please provide intra-operative surgical notes signed by attending surgeon along with histopathology lab report.",
        status: "Open",
      },
    ],
    auditTrail: [
      { id: "a10", timestamp: "2026-09-24T10:00:00Z", user: "FHPL System", role: "TPA", action: "Query Raised (#Q-1024)" },
    ],
    createdAt: "2026-09-22T11:45:00Z",
    updatedAt: "2026-09-24T10:00:00Z",
  },
];

export class InsuranceEngineService {
  private static getItem<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      broadcastChannel?.postMessage({ key, timestamp: Date.now() });
    } catch {
      // Storage quota safety
    }
  }

  // --- Insurers Master ---
  public static getInsurers(): InsuranceCompanyConfig[] {
    return this.getItem<InsuranceCompanyConfig[]>(STORAGE_KEY_INSURERS, SEED_INSURERS);
  }

  public static saveInsurer(config: InsuranceCompanyConfig): void {
    const insurers = this.getInsurers();
    const idx = insurers.findIndex((i) => i.id === config.id);
    if (idx >= 0) insurers[idx] = config;
    else insurers.push(config);
    this.setItem(STORAGE_KEY_INSURERS, insurers);
  }

  // --- Packages Master ---
  public static getPackages(): PackageMaster[] {
    return this.getItem<PackageMaster[]>(STORAGE_KEY_PACKAGES, SEED_PACKAGES);
  }

  public static savePackage(pkg: PackageMaster): void {
    const pkgs = this.getPackages();
    const idx = pkgs.findIndex((p) => p.id === pkg.id || p.code === pkg.code);
    if (idx >= 0) pkgs[idx] = pkg;
    else pkgs.push(pkg);
    this.setItem(STORAGE_KEY_PACKAGES, pkgs);
  }

  /**
   * Multiple Surgery Pricing Engine Calculation
   * Rule:
   * 1st Surgery -> 100% of Package Rate
   * 2nd Surgery -> 50% of Package Rate
   * 3rd Surgery & beyond -> 25% of Package Rate
   */
  public static calculateMultipleSurgeries(
    selectedPackages: PackageMaster[]
  ): { package: PackageMaster; sequence: number; multiplier: number; finalPrice: number }[] {
    return selectedPackages.map((pkg, index) => {
      const sequence = index + 1;
      let multiplier = 1.0;
      if (sequence === 2) multiplier = 0.5;
      else if (sequence >= 3) multiplier = 0.25;

      return {
        package: pkg,
        sequence,
        multiplier,
        finalPrice: Math.round(pkg.basePrice * multiplier),
      };
    });
  }

  // --- Claims Engine ---
  public static getClaims(): ComprehensiveClaimRecord[] {
    return this.getItem<ComprehensiveClaimRecord[]>(STORAGE_KEY_CLAIMS_FULL, SEED_CLAIMS);
  }

  public static getClaimById(claimId: string): ComprehensiveClaimRecord | undefined {
    return this.getClaims().find((c) => c.id === claimId);
  }

  public static saveClaim(claim: ComprehensiveClaimRecord): void {
    const claims = this.getClaims();
    const idx = claims.findIndex((c) => c.id === claim.id);
    claim.updatedAt = new Date().toISOString();
    if (idx >= 0) claims[idx] = claim;
    else claims.unshift(claim);
    this.setItem(STORAGE_KEY_CLAIMS_FULL, claims);
  }

  /**
   * Check Pre-Auth Consumed Bill Threshold
   * Warns when ongoing hospital bill reaches or exceeds 85% of approved pre-auth amount
   */
  public static checkThresholdWarning(claim: ComprehensiveClaimRecord): {
    isWarning: boolean;
    percentageConsumed: number;
    message: string;
  } {
    if (!claim.approvedPreAuthAmount || claim.approvedPreAuthAmount <= 0) {
      return { isWarning: false, percentageConsumed: 0, message: "" };
    }
    const pct = Math.round((claim.consumedBillAmount / claim.approvedPreAuthAmount) * 100);
    const isWarning = pct >= 85;
    const message = isWarning
      ? `Warning: Current bill (₹${claim.consumedBillAmount.toLocaleString()}) has reached ${pct}% of approved Pre-Auth limit (₹${claim.approvedPreAuthAmount.toLocaleString()}). Submit enhancement pre-auth immediately.`
      : `${pct}% of Pre-Auth limit consumed.`;

    return { isWarning, percentageConsumed: pct, message };
  }

  /**
   * Helper to generate Pre-Auth document checklist dynamically by Insurer & Procedure
   */
  public static generateChecklist(
    insurerId: string,
    procedureCode: string
  ): DocumentChecklistItem[] {
    const insurer = this.getInsurers().find((i) => i.id === insurerId);
    const docTypes = insurer?.documentRequirements || [
      "Insurance Card",
      "Patient Govt ID",
      "Doctor Notes",
      "Cost Estimate Sheet",
    ];

    return docTypes.map((type, idx) => ({
      id: `chk-${idx + 1}-${Date.now()}`,
      documentType: type,
      label: `${type} for ${procedureCode}`,
      isMandatory: true,
      isUploaded: false,
    }));
  }

  public static updateClaimStatus(
    claimId: string,
    newStatus: InsuranceClaimStatus,
    user: string,
    role: string,
    comment?: string
  ): ComprehensiveClaimRecord | undefined {
    const claim = this.getClaimById(claimId);
    if (!claim) return undefined;

    const oldStatus = claim.status;
    claim.status = newStatus;

    const log: AuditTrailLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user,
      role,
      action: `Status changed from ${oldStatus} to ${newStatus}`,
      oldStatus,
      newStatus,
      comments: comment,
    };

    claim.auditTrail.unshift(log);
    this.saveClaim(claim);
    return claim;
  }

  public static subscribe(callback: () => void): () => void {
    const handler = () => callback();
    broadcastChannel?.addEventListener("message", handler);
    return () => broadcastChannel?.removeEventListener("message", handler);
  }
}
