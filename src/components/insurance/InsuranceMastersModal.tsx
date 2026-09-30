import React, { useState } from "react";
import { Icon } from "../icons";
import { InsuranceEngineService } from "../../services/insuranceDb";
import { InsuranceCompanyConfig, PackageMaster } from "../../types/insurance";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function InsuranceMastersModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"insurers" | "packages">("packages");
  const [insurers, setInsurers] = useState<InsuranceCompanyConfig[]>(() =>
    InsuranceEngineService.getInsurers()
  );
  const [packages, setPackages] = useState<PackageMaster[]>(() =>
    InsuranceEngineService.getPackages()
  );

  const [editingPkg, setEditingPkg] = useState<PackageMaster | null>(null);
  const [showAddPkgModal, setShowAddPkgModal] = useState(false);

  if (!isOpen) return null;

  const handleSavePkg = (pkg: PackageMaster) => {
    InsuranceEngineService.savePackage(pkg);
    setPackages(InsuranceEngineService.getPackages());
    setEditingPkg(null);
    setShowAddPkgModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Icon.Insurance />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Insurance Master Configuration
              </h2>
              <p className="text-[12px] text-slate-300">
                Manage Insurers, TPAs, Package Masters (B-11), &amp; Surgery Pricing Rules
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

        {/* Tab Selection */}
        <div className="bg-slate-100/80 px-6 py-2 border-b border-slate-200 flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("packages")}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "packages"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icon.Clipboard /> Package Master (B-11 &amp; Surgery Rules)
          </button>
          <button
            onClick={() => setActiveTab("insurers")}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "insurers"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icon.Building /> Insurance Companies &amp; TPAs
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {activeTab === "packages" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Configured Hospital Packages
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defines fixed rates, GST, and 100% / 50% / 25% multiple surgery pricing rules
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newPkg: PackageMaster = {
                      id: `PKG-${Date.now()}`,
                      code: "B-12",
                      procedureName: "New Surgical Package",
                      basePrice: 35000,
                      applicableGstRate: 5,
                      department: "General Surgery",
                      includedComponents: ["Surgeon", "OT", "Room", "Nursing"],
                      excludedComponents: ["Implants"],
                      pricingRules: [
                        { sequenceOrder: 1, discountPercentage: 100, description: "1st Surgery -> 100%" },
                        { sequenceOrder: 2, discountPercentage: 50, description: "2nd Surgery -> 50%" },
                        { sequenceOrder: 3, discountPercentage: 25, description: "3rd Surgery -> 25%" },
                      ],
                      effectiveDate: new Date().toISOString().split("T")[0],
                      status: "Active",
                    };
                    handleSavePkg(newPkg);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  + Add New Package
                </button>
              </div>

              {/* Package Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Procedure Name</th>
                      <th className="px-4 py-3">Base Price</th>
                      <th className="px-4 py-3">GST Rate</th>
                      <th className="px-4 py-3">Multiple Surgery Rules</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {pkg.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {pkg.procedureName}
                          <div className="text-[11px] text-slate-400 font-normal">
                            Dept: {pkg.department}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 font-mono text-sm">
                          ₹{pkg.basePrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{pkg.applicableGstRate}%</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {pkg.pricingRules.map((r, i) => (
                              <div
                                key={i}
                                className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center justify-between"
                              >
                                <span>{r.description}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {pkg.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "insurers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Empaneled Insurers &amp; TPA Contacts
                  </h3>
                  <p className="text-xs text-slate-500">
                    SLA expectations, mandatory submission checklists, and direct portal integration
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insurers.map((ins) => (
                  <div
                    key={ins.id}
                    className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{ins.companyName}</h4>
                        <div className="text-xs font-medium text-slate-500">
                          TPA: {ins.tpaName || "Direct Insurer"}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {ins.networkStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Pre-Auth SLA</span>
                        <span className="font-bold text-slate-800">{ins.slaDaysForPreAuth} Days</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Settlement SLA</span>
                        <span className="font-bold text-slate-800">{ins.slaDaysForClaimSettlement} Days</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold text-slate-700 mb-1">
                        Mandatory Required Checklist ({ins.documentRequirements.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ins.documentRequirements.map((doc, idx) => (
                          <span
                            key={idx}
                            className="text-[10.5px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium"
                          >
                            ✓ {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">
            HMS Insurance Engine Master Config Active
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold cursor-pointer"
          >
            Close Master Settings
          </button>
        </div>
      </div>
    </div>
  );
}
