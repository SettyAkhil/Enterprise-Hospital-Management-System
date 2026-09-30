import React, { useState } from "react";
import { Icon } from "../icons";
import { InsuranceEngineService } from "../../services/insuranceDb";
import { ComprehensiveClaimRecord, PackageMaster } from "../../types/insurance";

interface Props {
  isOpen: boolean;
  claim?: ComprehensiveClaimRecord;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PreAuthWizardModal({ isOpen, claim, onClose, onSuccess }: Props) {
  const [packages] = useState<PackageMaster[]>(() => InsuranceEngineService.getPackages());
  const [selectedPkgCode, setSelectedPkgCode] = useState("B-11");
  const [secondPkgCode, setSecondPkgCode] = useState<string>("");
  const [estimatedStayDays, setEstimatedStayDays] = useState(3);
  const [customRequestAmount, setCustomRequestAmount] = useState<number>(75000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !claim) return null;

  const primaryPkg = packages.find((p) => p.code === selectedPkgCode) || packages[0];
  const secondPkg = packages.find((p) => p.code === secondPkgCode);

  const selectedPackagesList = [primaryPkg, ...(secondPkg ? [secondPkg] : [])];
  const surgeryCalculations = InsuranceEngineService.calculateMultipleSurgeries(selectedPackagesList);

  const totalCalculatedPackageCost = surgeryCalculations.reduce((acc, item) => acc + item.finalPrice, 0);

  const handlePreAuthSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      claim.preAuth = {
        id: `PA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        encounterId: claim.encounterId,
        patientId: claim.patientId,
        patientName: claim.patientName,
        mrn: claim.mrn,
        encounterType: claim.encounterType,
        proposedProcedureCode: primaryPkg.code,
        proposedProcedureName: primaryPkg.procedureName,
        packagePrice: primaryPkg.basePrice,
        estimatedHospitalStayDays: estimatedStayDays,
        estimatedTotalCost: totalCalculatedPackageCost + 25000,
        requestedAmount: customRequestAmount,
        approvedAmount: customRequestAmount * 0.9,
        status: "Submitted",
        checklist: InsuranceEngineService.generateChecklist(claim.policy.insurerId, primaryPkg.code),
        submissionHistory: [
          {
            timestamp: new Date().toISOString(),
            action: "Pre-Auth Submitted",
            user: "Insurance Desk Officer",
            notes: `Package ${primaryPkg.code} requested for ₹${customRequestAmount.toLocaleString()}`,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      claim.packageApplied = primaryPkg;
      claim.packageBaseAmount = totalCalculatedPackageCost;
      claim.approvedPreAuthAmount = customRequestAmount * 0.9;
      claim.status = "PREAUTH_SUBMITTED";

      InsuranceEngineService.saveClaim(claim);
      setIsSubmitting(false);
      onSuccess();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Icon.Insurance />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Pre-Authorization Wizard &amp; Package Billing
              </h2>
              <p className="text-[12px] text-blue-200">
                Patient: <span className="font-bold text-white">{claim.patientName}</span> ({claim.mrn}) | Insurer: <span className="font-bold text-white">{claim.policy.insurerName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Section 1: Package Selection */}
          <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>1. Procedure &amp; Fixed Package Selection</span>
              <span className="text-[11px] font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-bold">
                Package Rule Active
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Primary Surgical Package (100% Rate)
                </label>
                <select
                  value={selectedPkgCode}
                  onChange={(e) => setSelectedPkgCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.code}>
                      {pkg.code} - {pkg.procedureName} (₹{pkg.basePrice.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Secondary Surgery (Optional - 50% Rule)
                </label>
                <select
                  value={secondPkgCode}
                  onChange={(e) => setSecondPkgCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">None (Single Surgery)</option>
                  {packages
                    .filter((p) => p.code !== selectedPkgCode)
                    .map((pkg) => (
                      <option key={pkg.id} value={pkg.code}>
                        {pkg.code} - {pkg.procedureName} (Base: ₹{pkg.basePrice.toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Multiple Surgery Breakdown */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="font-bold text-slate-700 text-[11.5px] uppercase tracking-wide">
                Multiple Surgery Calculation Breakdown:
              </div>
              {surgeryCalculations.map((calc, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-mono border-b border-slate-100 pb-1">
                  <span>
                    Surgery #{calc.sequence}: <strong className="text-slate-900">{calc.package.procedureName} ({calc.package.code})</strong>
                  </span>
                  <span>
                    Base ₹{calc.package.basePrice.toLocaleString()} × {calc.multiplier * 100}% ={" "}
                    <strong className="text-blue-700">₹{calc.finalPrice.toLocaleString()}</strong>
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center text-xs font-bold pt-1">
                <span>Calculated Combined Package Total:</span>
                <span className="text-sm font-mono text-emerald-700">
                  ₹{totalCalculatedPackageCost.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Financial Estimates & Requested Pre-Auth Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estimated Hospital Stay (Days)
              </label>
              <input
                type="number"
                value={estimatedStayDays}
                onChange={(e) => setEstimatedStayDays(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Requested Pre-Auth Amount (INR ₹)
              </label>
              <input
                type="number"
                value={customRequestAmount}
                onChange={(e) => setCustomRequestAmount(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Required Document Checklist */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900">
              Required Documents Checklist for {claim.policy.insurerName}:
            </h4>
            <div className="space-y-1 bg-white border border-slate-200 rounded-lg p-3">
              {[
                "Insurance Card & Member ID Proof",
                "Patient Govt Identity Card (Aadhaar / Passport)",
                "Doctor Initial Clinical Evaluation & Diagnosis Note",
                "Package Estimate Sheet & Hospital Tariff Consent",
              ].map((docName, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-1.5 hover:bg-slate-50 rounded">
                  <span className="font-medium text-slate-700">✓ {docName}</span>
                  <span className="text-[10.5px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                    Attached
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold text-xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handlePreAuthSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            {isSubmitting ? "Submitting to Insurer..." : "Submit Pre-Auth to TPA Portal"}
          </button>
        </div>
      </div>
    </div>
  );
}
