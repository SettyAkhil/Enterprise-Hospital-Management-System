import React, { useState } from "react";
import { Icon } from "../icons";
import { InsuranceEngineService } from "../../services/insuranceDb";
import { ComprehensiveClaimRecord, ClaimSettlementRecord } from "../../types/insurance";

interface Props {
  claims: ComprehensiveClaimRecord[];
  onRefresh: () => void;
}

export default function SettlementReconciliation({ claims, onRefresh }: Props) {
  const [selectedClaim, setSelectedClaim] = useState<ComprehensiveClaimRecord | null>(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [bankAccount, setBankAccount] = useState("HDFC Hospital Main Ops (A/C ...4410)");
  const [isSaving, setIsSaving] = useState(false);

  const approvedClaims = claims.filter(
    (c) =>
      c.status === "APPROVED" ||
      c.status === "PARTIALLY_APPROVED" ||
      c.status === "SETTLEMENT_PENDING" ||
      c.status === "PAYMENT_RECEIVED" ||
      c.status === "RECONCILED"
  );

  const handleOpenSettlement = (claim: ComprehensiveClaimRecord) => {
    setSelectedClaim(claim);
    setSettlementAmount(claim.finalClaimAmount || claim.approvedPreAuthAmount || 0);
    setUtrNumber(claim.settlement?.paymentReferenceNo || `UTR${Date.now().toString().slice(-8)}`);
  };

  const handleRecordSettlement = () => {
    if (!selectedClaim) return;
    setIsSaving(true);

    setTimeout(() => {
      const settlementRecord: ClaimSettlementRecord = {
        id: `SETTL-${Date.now()}`,
        claimId: selectedClaim.id,
        settlementAdviceNo: `ADV-${Math.floor(10000 + Math.random() * 90000)}`,
        approvedAmount: selectedClaim.approvedPreAuthAmount || selectedClaim.finalClaimAmount,
        deductionsAmount: Math.max(0, selectedClaim.totalHospitalBill - settlementAmount),
        deductionReasons: [
          { id: "d1", category: "Non-Payable Consumables", amount: 3000, remark: "Gloves & Sanitizer excluded" },
        ],
        netSettlementAmount: settlementAmount,
        paymentReferenceNo: utrNumber,
        paymentDate: new Date().toISOString().split("T")[0],
        bankAccountName: bankAccount,
        reconciliationStatus: "Reconciled",
        reconciledAt: new Date().toISOString(),
        reconciledBy: "Finance Officer",
      };

      selectedClaim.settlement = settlementRecord;
      selectedClaim.status = "RECONCILED";

      InsuranceEngineService.saveClaim(selectedClaim);
      InsuranceEngineService.updateClaimStatus(
        selectedClaim.id,
        "RECONCILED",
        "Finance Officer",
        "Finance",
        `Payment reconciled via UTR ${utrNumber} for ₹${settlementAmount.toLocaleString()}`
      );

      setIsSaving(false);
      setSelectedClaim(null);
      onRefresh();
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Total Claims Pending Settlement
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            ₹
            {approvedClaims
              .filter((c) => c.status !== "RECONCILED")
              .reduce((acc, c) => acc + (c.finalClaimAmount || 0), 0)
              .toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
            Reconciled Bank Receipts (MTD)
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
            ₹
            {approvedClaims
              .filter((c) => c.status === "RECONCILED")
              .reduce((acc, c) => acc + (c.settlement?.netSettlementAmount || 0), 0)
              .toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-rose-700 uppercase tracking-wide">
            Deductions &amp; Disallowances
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono mt-1">
            ₹
            {approvedClaims
              .reduce((acc, c) => acc + (c.settlement?.deductionsAmount || 0), 0)
              .toLocaleString()}
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm">
            Insurance Adjudication &amp; Bank Settlement Reconciliation Grid
          </h3>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Claim ID</th>
              <th className="px-4 py-3">Patient / MRN</th>
              <th className="px-4 py-3">Insurer</th>
              <th className="px-4 py-3">Claim Amount</th>
              <th className="px-4 py-3">Net Settled</th>
              <th className="px-4 py-3">Bank Ref (UTR)</th>
              <th className="px-4 py-3">Recon Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {approvedClaims.map((claim) => (
              <tr key={claim.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-blue-700">{claim.id}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {claim.patientName}
                  <span className="block text-[11px] font-normal text-slate-400 font-mono">
                    {claim.mrn}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{claim.policy.insurerName}</td>
                <td className="px-4 py-3 font-mono font-bold text-slate-900">
                  ₹{claim.finalClaimAmount.toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                  {claim.settlement ? `₹${claim.settlement.netSettlementAmount.toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-slate-600">
                  {claim.settlement?.paymentReferenceNo || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      claim.status === "RECONCILED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-blue-50 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {claim.status === "RECONCILED" ? "Reconciled" : "Pending Recon"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleOpenSettlement(claim)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11.5px] font-bold transition-all cursor-pointer shadow-xs"
                  >
                    {claim.status === "RECONCILED" ? "View Recon" : "Record Bank Payment"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Settlement Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <h3 className="text-base font-bold text-slate-900">
              Record Bank Settlement Advice &amp; UTR Reconciliation
            </h3>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-800">
                Claim {selectedClaim.id} - {selectedClaim.patientName}
              </div>
              <div className="text-slate-600">
                Insurer: <strong className="text-slate-800">{selectedClaim.policy.insurerName}</strong> | Original Claim: <strong className="font-mono text-slate-900">₹{selectedClaim.finalClaimAmount.toLocaleString()}</strong>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank Payment Reference / UTR Number
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. UTR882100912"
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Net Amount Received in Bank Account (INR ₹)
                </label>
                <input
                  type="number"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Hospital Receiving Bank Account
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordSettlement}
                disabled={isSaving || !utrNumber.trim()}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer disabled:opacity-50 shadow-md"
              >
                {isSaving ? "Reconciling..." : "Save Bank Reconciliation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
