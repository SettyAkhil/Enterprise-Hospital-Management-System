import React, { useState, useEffect, useMemo } from "react";
import { BillingDatabase, ClaimRecord, PaymentRecord } from "../services/billingDb";
import { Icon } from "./icons";

export default function PaymentCollection() {
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"Pending" | "Paid" | "All">("Pending");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Payment Form States
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentRecord["paymentMethod"]>("UPI / Digital");
  const [transactionRef, setTransactionRef] = useState("");
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [cashierName, setCashierName] = useState("Hospital Front Desk Cashier");
  const [notes, setNotes] = useState("");
  const [lastReceipt, setLastReceipt] = useState<{ claim: ClaimRecord; payment: PaymentRecord } | null>(null);

  const refreshData = () => {
    const all = BillingDatabase.getClaims();
    setClaims(all);
  };

  useEffect(() => {
    refreshData();
    const unsub = BillingDatabase.onUpdate(refreshData);
    return () => unsub();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Filtered invoices
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === "Pending") return c.balanceDue > 0;
      if (filterType === "Paid") return c.balanceDue === 0 || c.status === "Paid";
      return true;
    });
  }, [claims, searchQuery, filterType]);

  const selectedClaim = useMemo(() => {
    return claims.find((c) => c.id === selectedInvoiceId || c.invoiceNo === selectedInvoiceId) || null;
  }, [claims, selectedInvoiceId]);

  // Set default selected invoice
  useEffect(() => {
    if (!selectedInvoiceId && filteredClaims.length > 0) {
      const firstPending = filteredClaims.find((c) => c.balanceDue > 0) || filteredClaims[0];
      setSelectedInvoiceId(firstPending.id);
    }
  }, [filteredClaims, selectedInvoiceId]);

  // Auto set pay amount when selected invoice changes
  useEffect(() => {
    if (selectedClaim) {
      setPayAmount(selectedClaim.balanceDue > 0 ? selectedClaim.balanceDue : selectedClaim.totalAmount);
      setCashTendered(selectedClaim.balanceDue > 0 ? selectedClaim.balanceDue : selectedClaim.totalAmount);
      setTransactionRef(`UPI-${Math.floor(10000000 + Math.random() * 90000000)}`);
    }
  }, [selectedClaim]);

  const changeDue = payMethod === "Cash" ? Math.max(0, cashTendered - payAmount) : 0;

  const [dispatchedClearances, setDispatchedClearances] = useState<{ [key: string]: boolean }>({});

  const handleProcessPayment = () => {
    if (!selectedClaim) return;
    if (payAmount <= 0) {
      showToast("Please enter a valid payment amount.", "error");
      return;
    }

    try {
      const result = BillingDatabase.recordPayment(selectedClaim.id, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
        transactionRef,
        collectedBy: cashierName,
        notes: notes.trim() || undefined,
      });

      setLastReceipt(result);
      showToast(`Payment of ₹${payAmount.toLocaleString("en-IN")} collected! Receipt: ${result.payment.receiptNo}`, "success");
      refreshData();
    } catch (e: any) {
      showToast(e.message || "Failed to process payment", "error");
    }
  };

  const handleDispatchClearance = (
    patientNameOrUmr: string,
    department: "Laboratory" | "Radiology",
    receiptNo?: string,
    testName?: string
  ) => {
    const res = BillingDatabase.dispatchClearanceToDepartment(patientNameOrUmr, department, receiptNo, testName);
    if (res.success) {
      showToast(res.message, "success");
      setDispatchedClearances((prev) => ({
        ...prev,
        [`${patientNameOrUmr}_${department}`]: true,
      }));
      refreshData();
    } else {
      showToast(res.message, "error");
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl text-[13px] font-medium flex items-center gap-2.5 ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>💳</span> Payment Collection &amp; POS Cashier Terminal
          </h1>
          <p className="text-[12.5px] text-[#64748B]">
            Process patient payments, issue official receipts, and collect co-pays in real time (INR ₹).
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, MRN, Invoice #..."
              className="pl-8 pr-3 py-1.5 text-[12px] border border-[#CBD5E1] rounded w-64 focus:outline-none focus:border-[#1B4FD8] bg-white text-gray-900 shadow-2xs"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full">
        {/* ── Left Side: Invoice List & Queue ─────────────────────── */}
        <div className="flex-1 bg-white border border-[#DDE2EC] rounded-xl shadow-2xs flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-[13.5px] font-bold text-gray-900 flex items-center gap-2">
              <span>📋</span> Hospital Invoices Queue
            </h2>
            <div className="flex items-center gap-1 bg-white border border-[#CBD5E1] rounded p-0.5 text-xs font-bold">
              {(["Pending", "Paid", "All"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                    filterType === t ? "bg-[#1B4FD8] text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-[#DDE2EC] bg-[#FAFCFF] sticky top-0 z-10">
                <tr className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Dept</th>
                  <th className="px-5 py-3 text-right">Total Bill</th>
                  <th className="px-5 py-3 text-right">Balance Due</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No invoices found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((inv) => {
                    const isSelected = selectedClaim?.id === inv.id;
                    const isPaid = inv.balanceDue === 0 || inv.status === "Paid";
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-[#EFF6FF] font-semibold" : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td className="px-5 py-3.5 font-mono text-[#1B4FD8] text-xs font-bold">{inv.invoiceNo}</td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-gray-900">{inv.patientName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">MRN: {inv.mrn}</div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs">{inv.department}</td>
                        <td className="px-5 py-3.5 font-mono text-right text-gray-900">
                          ₹{inv.totalAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-right">
                          <span className={isPaid ? "text-emerald-700" : "text-amber-700"}>
                            ₹{inv.balanceDue.toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                              isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isPaid ? "Paid" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right Side: Live Cashier Payment Terminal ──────────── */}
        <div className="w-full lg:w-[420px] bg-white border border-[#DDE2EC] rounded-xl shadow-2xs flex flex-col flex-shrink-0">
          <div className="px-5 py-3.5 border-b border-[#DDE2EC] bg-[#F8FAFC]">
            <h2 className="text-[13.5px] font-bold text-gray-900 flex items-center gap-2">
              <span>💳</span> Live POS Cashier Terminal
            </h2>
          </div>

          {!selectedClaim ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="text-4xl mb-2">🧾</div>
              <p className="text-[13px] font-semibold text-gray-700">No Invoice Selected</p>
              <p className="text-[11.5px] text-[#64748B] mt-1">Select an invoice from the list to collect payment.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-5 space-y-4 text-[12.5px]">
              {/* Selected Invoice Details */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Invoice:</span>
                  <span className="font-mono font-bold text-[#1B4FD8]">{selectedClaim.invoiceNo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold text-xs">Patient:</span>
                  <span className="font-bold text-gray-900">{selectedClaim.patientName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Payer:</span>
                  <span className="font-medium text-slate-800">{selectedClaim.insuranceProvider}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Balance Due:</span>
                  <span className="text-xl font-extrabold font-mono text-amber-700">
                    ₹{selectedClaim.balanceDue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      "UPI / Digital",
                      "Credit Card",
                      "Debit Card",
                      "Cash",
                      "Insurance Copay",
                      "Bank Transfer",
                    ] as PaymentRecord["paymentMethod"][]
                  ).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`py-1.5 px-2 rounded text-[11px] font-bold border transition-colors cursor-pointer text-center ${
                        payMethod === m
                          ? "border-[#1B4FD8] bg-[#EFF6FF] text-[#1B4FD8]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Amount to Pay (₹)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded font-mono font-bold text-gray-900 text-sm focus:border-[#1B4FD8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">UPI / Reference #</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded font-mono text-xs"
                  />
                </div>
              </div>

              {/* Cash Change Calculator */}
              {payMethod === "Cash" && (
                <div className="bg-amber-50 border border-amber-200 rounded p-2.5 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block font-bold text-amber-900 text-[10.5px]">Cash Received (₹)</label>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-white border border-amber-300 rounded font-mono font-bold"
                    />
                  </div>
                  <div className="text-right flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-amber-800">Change Due:</span>
                    <span className="text-base font-mono font-extrabold text-emerald-700">
                      ₹{changeDue.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={selectedClaim.balanceDue === 0 && payAmount <= 0}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded text-sm cursor-pointer shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span>✓</span> Process Payment (₹{payAmount.toLocaleString("en-IN")})
                </button>

                {lastReceipt && lastReceipt.claim.id === selectedClaim.id && (
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="w-full py-2 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 font-bold rounded text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>🖨️</span> Print Official Receipt ({lastReceipt.payment.receiptNo})
                  </button>
                )}
              </div>

              {/* Department Diagnostic Clearance Routing (Manual Transmission) */}
              {(() => {
                const effectiveReceiptNo = lastReceipt && lastReceipt.claim.id === selectedClaim.id ? lastReceipt.payment.receiptNo : (selectedClaim.payments && selectedClaim.payments.length > 0 ? selectedClaim.payments[selectedClaim.payments.length - 1].receiptNo : undefined);
                const clearanceStatus = BillingDatabase.getDepartmentClearanceStatus(selectedClaim.patientName, selectedClaim);
                const isLabDispatched = dispatchedClearances[`${selectedClaim.patientName}_Laboratory`] || clearanceStatus.labPendingCount === 0;
                const isRadDispatched = dispatchedClearances[`${selectedClaim.patientName}_Radiology`] || clearanceStatus.radPendingCount === 0;

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <span>🏥</span> Department Clearance Routing
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">Manual Dispatch</span>
                    </div>

                    {clearanceStatus.isNonDiagnostic ? (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px]">
                        ℹ️ <strong>Non-Diagnostic Bill:</strong> No lab or imaging tests ordered. Patient settled and cleared to leave.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {clearanceStatus.hasLabOrders && (
                          <div className="p-2 bg-white border border-slate-200 rounded flex items-center justify-between gap-2 shadow-2xs">
                            <div>
                              <div className="font-bold text-gray-900 text-[11.5px] flex items-center gap-1">
                                <span>🧪</span> Laboratory
                              </div>
                              <div className="text-[10.5px] text-slate-500">
                                {clearanceStatus.labTestNames.join(", ") || "Lab Tests"}
                              </div>
                            </div>
                            <div>
                              {isLabDispatched ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                                  ✓ Cleared
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDispatchClearance(selectedClaim.patientName, "Laboratory", effectiveReceiptNo, clearanceStatus.labTestNames[0])}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded shadow-2xs cursor-pointer"
                                >
                                  📤 Send Clearance
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {clearanceStatus.hasRadStudies && (
                          <div className="p-2 bg-white border border-slate-200 rounded flex items-center justify-between gap-2 shadow-2xs">
                            <div>
                              <div className="font-bold text-gray-900 text-[11.5px] flex items-center gap-1">
                                <span>🩻</span> Radiology
                              </div>
                              <div className="text-[10.5px] text-slate-500">
                                {clearanceStatus.radStudyNames.join(", ") || "Imaging Studies"}
                              </div>
                            </div>
                            <div>
                              {isRadDispatched ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                                  ✓ Cleared
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDispatchClearance(selectedClaim.patientName, "Radiology", effectiveReceiptNo, clearanceStatus.radStudyNames[0])}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded shadow-2xs cursor-pointer"
                                >
                                  📤 Send Clearance
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Payment History for this invoice */}
              {selectedClaim.payments && selectedClaim.payments.length > 0 && (
                <div className="border-t border-slate-200 pt-3">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                    Past Payments ({selectedClaim.payments.length})
                  </span>
                  <div className="mt-1.5 space-y-1 max-h-32 overflow-y-auto">
                    {selectedClaim.payments.map((p, i) => (
                      <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] flex justify-between items-center">
                        <div>
                          <div className="font-mono text-[#1B4FD8] font-bold">{p.receiptNo}</div>
                          <div className="text-slate-500 text-[10px]">{p.paymentMethod}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-emerald-700">₹{p.amount.toLocaleString("en-IN")}</div>
                          <div className="text-[10px] text-slate-400">{new Date(p.paymentDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
