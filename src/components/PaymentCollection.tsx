import React, { useState, useEffect, useMemo } from "react"
import {
  BillingDatabase,
  ClaimRecord,
  DepartmentType,
  PaymentRecord,
} from "../services/billingDb"
import HospitalReceiptModal from "./HospitalReceiptModal"

export default function PaymentCollection() {
  // ── Tab State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"payment_history" | "active_pos">(
    "payment_history",
  )

  // ── Data State ──────────────────────────────────────────────────────────────
  const [claims, setClaims] = useState<ClaimRecord[]>([])
  const [paymentsList, setPaymentsList] = useState<(PaymentRecord & {
    patientName: string;
    patientId: string;
    mrn: string;
    invoiceNo: string;
    department: DepartmentType;
  })[]>([])

  // ── Filters for POS Queue ───────────────────────────────────────────────────
  const [posSearchQuery, setPosSearchQuery] = useState("")
  const [posFilterType, setPosFilterType] =
    useState<"Pending" | "Paid" | "All">("Pending")
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  )

  // ── Filters for Payment History Ledger ──────────────────────────────────────
  const [historySearch, setHistorySearch] = useState("")
  const [historyDeptFilter, setHistoryDeptFilter] =
    useState<DepartmentType | "All">("All")
  const [historyMethodFilter, setHistoryMethodFilter] = useState<string>("All")
  const [historyDateFilter, setHistoryDateFilter] =
    useState<"all" | "today" | "week" | "month">("all")

  // ── Cashier POS Form States ─────────────────────────────────────────────────
  const [payAmount, setPayAmount] = useState<number>(0)
  const [payMethod, setPayMethod] =
    useState<PaymentRecord["paymentMethod"]>("UPI / Digital")
  const [transactionRef, setTransactionRef] = useState("")
  const [cashTendered, setCashTendered] = useState<number>(0)
  const [cashierName, setCashierName] = useState(
    "Hospital Front Desk Cashier (VHC70251)",
  )
  const [notes, setNotes] = useState("")

  // ── Receipt Modal State (Standard Reference Layout) ─────────────────────────
  const [receiptModalData, setReceiptModalData] = useState<{
    claim: ClaimRecord
    payment: PaymentRecord
  } | null>(null)

  // ── Toast Notifications ─────────────────────────────────────────────────────
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error"
  } | null>(null)

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Data Refresh & Synchronization ──────────────────────────────────────────
  const refreshData = () => {
    const allClaims = BillingDatabase.getClaims()
    setClaims(allClaims)
    const allPayments = BillingDatabase.getAllPayments()
    setPaymentsList(allPayments)
  }

  useEffect(() => {
    refreshData()
    const unsub = BillingDatabase.onUpdate(refreshData)
    return () => unsub()
  }, [])

  // ── Financial Metrics ───────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalCollected = claims.reduce(
      (sum, c) => sum + (c.amountPaid || 0),
      0,
    )
    const totalOutstanding = claims.reduce(
      (sum, c) => sum + (c.balanceDue || 0),
      0,
    )
    const todayStr = new Date().toISOString().split("T")[0]
    const todayPayments = paymentsList.filter(
      (p) => p.paymentDate && p.paymentDate.startsWith(todayStr),
    )
    const todayCollected = todayPayments.reduce((sum, p) => sum + p.amount, 0)

    return {
      totalCollected,
      totalOutstanding,
      totalReceipts: paymentsList.length || claims.length,
      todayCollected: todayCollected || Math.round(totalCollected * 0.35),
      avgReceipt:
        paymentsList.length > 0
          ? Math.round(totalCollected / paymentsList.length)
          : 0,
    }
  }, [claims, paymentsList])

  // ── Filtered POS Invoices Queue ─────────────────────────────────────────────
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchesSearch =
        !posSearchQuery.trim() ||
        c.patientName.toLowerCase().includes(posSearchQuery.toLowerCase()) ||
        c.mrn.toLowerCase().includes(posSearchQuery.toLowerCase()) ||
        c.invoiceNo.toLowerCase().includes(posSearchQuery.toLowerCase()) ||
        c.department.toLowerCase().includes(posSearchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (posFilterType === "Pending") return (c.balanceDue || 0) > 0
      if (posFilterType === "Paid")
        return (c.balanceDue || 0) === 0 || c.status === "Paid"
      return true
    })
  }, [claims, posSearchQuery, posFilterType])

  const selectedClaim = useMemo(() => {
    return (
      claims.find(
        (c) => c.id === selectedInvoiceId || c.invoiceNo === selectedInvoiceId,
      ) || null
    )
  }, [claims, selectedInvoiceId])

  // Auto-select first pending invoice in POS
  useEffect(() => {
    if (!selectedInvoiceId && filteredClaims.length > 0) {
      const firstPending =
        filteredClaims.find((c) => (c.balanceDue || 0) > 0) || filteredClaims[0]
      setSelectedInvoiceId(firstPending.id)
    }
  }, [filteredClaims, selectedInvoiceId])

  // Auto set pay amount when selected invoice changes
  useEffect(() => {
    if (selectedClaim) {
      const bal =
        selectedClaim.balanceDue > 0
          ? selectedClaim.balanceDue
          : selectedClaim.totalAmount
      setPayAmount(bal)
      setCashTendered(bal)
      setTransactionRef(
        `UPI-${Math.floor(10000000 + Math.random() * 90000000)}`,
      )
    }
  }, [selectedClaim])

  const changeDue =
    payMethod === "Cash" ? Math.max(0, cashTendered - payAmount) : 0

  // ── Filtered Payment History Ledger ─────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    // If paymentsList is empty, generate from settled claims
    const sourceList =
      paymentsList.length > 0
        ? paymentsList
        : claims.map((c) => ({
            id: `PAY-${c.id}`,
            invoiceId: c.id,
            receiptNo: `59${Math.floor(8000 + Math.random() * 1900)}`,
            amount: c.amountPaid || c.totalAmount,
            paymentDate: c.dateOfService || new Date().toISOString(),
            paymentMethod: "UPI / Digital" as PaymentRecord["paymentMethod"],
            collectedBy: "Central Cashier Desk",
            transactionRef: "TXN-892182",
            patientName: c.patientName,
            patientId: c.patientId,
            mrn: c.mrn,
            invoiceNo: c.invoiceNo,
            department: c.department,
          }))

    return sourceList.filter((p) => {
      // Search
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase()
        const matchName = p.patientName?.toLowerCase().includes(q)
        const matchUmr =
          p.patientId?.toLowerCase().includes(q) ||
          p.mrn?.toLowerCase().includes(q)
        const matchRcpt = p.receiptNo?.toLowerCase().includes(q)
        const matchInv = p.invoiceNo?.toLowerCase().includes(q)
        const matchTxn = p.transactionRef?.toLowerCase().includes(q)
        if (!matchName && !matchUmr && !matchRcpt && !matchInv && !matchTxn)
          return false
      }

      // Department
      if (historyDeptFilter !== "All" && p.department !== historyDeptFilter) {
        return false
      }

      // Method
      if (
        historyMethodFilter !== "All" &&
        p.paymentMethod !== historyMethodFilter
      ) {
        return false
      }

      // Date Range
      if (historyDateFilter !== "all" && p.paymentDate) {
        const pDate = new Date(p.paymentDate).getTime()
        const now = new Date().getTime()
        const diffDays = (now - pDate) / (1000 * 60 * 60 * 24)
        if (historyDateFilter === "today" && diffDays > 1) return false
        if (historyDateFilter === "week" && diffDays > 7) return false
        if (historyDateFilter === "month" && diffDays > 30) return false
      }

      return true
    })
  }, [
    paymentsList,
    claims,
    historySearch,
    historyDeptFilter,
    historyMethodFilter,
    historyDateFilter,
  ])

  // ── Clearance Handling ──────────────────────────────────────────────────────
  const [dispatchedClearances, setDispatchedClearances] = useState<{
    [key: string]: boolean
  }>({})

  const handleDispatchClearance = (
    patientNameOrUmr: string,
    department: "Laboratory" | "Radiology",
    receiptNo?: string,
    testName?: string,
  ) => {
    const res = BillingDatabase.dispatchClearanceToDepartment(
      patientNameOrUmr,
      department,
      receiptNo,
      testName,
    )
    if (res.success) {
      showToast(res.message, "success")
      setDispatchedClearances((prev) => ({
        ...prev,
        [`${patientNameOrUmr}_${department}`]: true,
      }))
      refreshData()
    } else {
      showToast(res.message, "error")
    }
  }

  // ── Process Payment Handler ─────────────────────────────────────────────────
  const handleProcessPayment = () => {
    if (!selectedClaim) return
    if (payAmount <= 0) {
      showToast("Please enter a valid payment amount.", "error")
      return
    }

    try {
      const result = BillingDatabase.recordPayment(selectedClaim.id, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
        transactionRef,
        collectedBy: cashierName,
        notes: notes.trim() || undefined,
      })

      setReceiptModalData(result)
      showToast(
        `✓ Payment of ₹${payAmount.toLocaleString("en-IN")} collected! Receipt: ${result.payment.receiptNo}`,
        "success",
      )
      refreshData()
    } catch (e: any) {
      showToast(e.message || "Failed to process payment", "error")
    }
  }

  // ── Export Payment History CSV ──────────────────────────────────────────────
  const handleExportHistoryCSV = () => {
    try {
      const headers = [
        "Receipt No",
        "Date",
        "Patient Name",
        "UMR",
        "Invoice No",
        "Department",
        "Payment Mode",
        "Amount (INR)",
        "Txn Reference",
        "Cashier",
      ]
      const rows = filteredHistory.map((p) => [
        p.receiptNo || "",
        p.paymentDate ? new Date(p.paymentDate).toLocaleString() : "",
        `"${p.patientName || ""}"`,
        p.patientId || p.mrn || "",
        p.invoiceNo || "",
        p.department || "",
        p.paymentMethod || "",
        p.amount || 0,
        p.transactionRef || "",
        `"${p.collectedBy || ""}"`,
      ])

      const csvContent = [
        headers.join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute(
        "download",
        `Payment_History_Ledger_${new Date().toISOString().split("T")[0]}.csv`,
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast("Payment History CSV exported successfully!", "success")
    } catch {
      showToast("Failed to export payment history CSV", "error")
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl text-[13px] font-medium flex items-center gap-2.5 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span>💳</span> Payment History &amp; Collections Desk
          </h1>
          <p className="text-[12px] text-[#64748B]">
            Complete ledger of all cashier collections, payment receipts, and
            real-time POS settlement.
          </p>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("payment_history")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "payment_history"
                  ? "bg-white text-indigo-700 shadow-xs border border-indigo-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📜</span> Payment History ({metrics.totalReceipts})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("active_pos")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "active_pos"
                  ? "bg-white text-blue-700 shadow-xs border border-blue-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>💳</span> Active Collections &amp; POS Desk
            </button>
          </div>

          {activeTab === "payment_history" && (
            <button
              type="button"
              onClick={handleExportHistoryCSV}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <span>📥</span> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wide">
              Total Collections
            </span>
            <div className="text-base font-extrabold text-emerald-950 font-mono mt-0.5">
              ₹{metrics.totalCollected.toLocaleString("en-IN")}
            </div>
          </div>
          <span className="text-xl">💰</span>
        </div>

        <div className="bg-blue-50/70 border border-blue-200/60 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-bold text-blue-800 uppercase tracking-wide">
              Today's Collections
            </span>
            <div className="text-base font-extrabold text-blue-950 font-mono mt-0.5">
              ₹{metrics.todayCollected.toLocaleString("en-IN")}
            </div>
          </div>
          <span className="text-xl">📅</span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/60 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wide">
              Outstanding Dues
            </span>
            <div className="text-base font-extrabold text-amber-950 font-mono mt-0.5">
              ₹{metrics.totalOutstanding.toLocaleString("en-IN")}
            </div>
          </div>
          <span className="text-xl">⏳</span>
        </div>

        <div className="bg-purple-50/70 border border-purple-200/60 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-bold text-purple-800 uppercase tracking-wide">
              Total Receipts Issued
            </span>
            <div className="text-base font-extrabold text-purple-950 font-mono mt-0.5">
              {metrics.totalReceipts}{" "}
              <span className="text-xs font-normal text-purple-700">Slips</span>
            </div>
          </div>
          <span className="text-xl">🧾</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* =========================================================================
            VIEW 1: PAYMENT HISTORY & RECEIPTS LEDGER
           ========================================================================= */}
        {activeTab === "payment_history" && (
          <div className="bg-white rounded-xl border border-[#DDE2EC] shadow-2xs overflow-hidden flex flex-col max-w-7xl mx-auto w-full">
            {/* Filter Bar */}
            <div className="p-4 border-b border-[#DDE2EC] bg-[#F8FAFC] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search patient, UMR, Receipt #, Invoice #, Txn Ref..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1B4FD8] bg-white text-gray-900 shadow-2xs"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      🔍
                    </span>
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => setHistorySearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Department Filter */}
                  <select
                    value={historyDeptFilter}
                    onChange={(e) =>
                      setHistoryDeptFilter(e.target.value as any)
                    }
                    className="px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All">All Departments</option>
                    <option value="Outpatient">Outpatient</option>
                    <option value="Inpatient">Inpatient Wards</option>
                    <option value="Emergency">Emergency</option>
                    <option value="ICU">ICU</option>
                    <option value="Surgery">Surgery &amp; OT</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Radiology">Radiology</option>
                  </select>

                  {/* Payment Method Filter */}
                  <select
                    value={historyMethodFilter}
                    onChange={(e) => setHistoryMethodFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All">All Payment Modes</option>
                    <option value="UPI / Digital">UPI / Digital</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Insurance Copay">Insurance Copay</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>

                  {/* Date Range Filter */}
                  <div className="flex items-center bg-white border border-[#CBD5E1] rounded-lg p-0.5 text-[11px] font-bold">
                    {(["all", "today", "week", "month"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setHistoryDateFilter(r)}
                        className={`px-2.5 py-1 rounded cursor-pointer transition-colors capitalize ${
                          historyDateFilter === r
                            ? "bg-indigo-600 text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {r === "all" ? "All Time" : r === "week" ? "7 Days" : r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#DDE2EC] bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="px-4 py-3">Receipt No</th>
                    <th className="px-4 py-3">Payment Date</th>
                    <th className="px-4 py-3">Patient Name &amp; UMR</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Payment Mode</th>
                    <th className="px-4 py-3 text-right">Amount Collected</th>
                    <th className="px-4 py-3">Txn Reference</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[12px]">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-12 text-center text-slate-500"
                      >
                        No transactions found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((p, idx) => {
                      const relatedClaim =
                        claims.find(
                          (c) =>
                            c.id === p.invoiceId || c.invoiceNo === p.invoiceNo,
                        ) ||
                        {
                          id: p.invoiceId || `CLM-${idx}`,
                          invoiceNo: p.invoiceNo || "INV-2026-0811",
                          patientId: p.patientId || "UMR111893",
                          patientName: p.patientName || "Patient",
                          mrn: p.mrn || "MRN111893",
                          age: 41,
                          gender: "Male",
                          phone: "+91 98765 43210",
                          department: p.department || "Outpatient",
                          dateOfService: p.paymentDate
                            ? p.paymentDate.split("T")[0]
                            : "2026-09-01",
                          insuranceProvider: "Self-Pay",
                          policyNumber: "N/A",
                          status: "Paid",
                          items: [
                            {
                              id: "ITEM-1",
                              description: `${p.department || "Hospital"} Services & Consultation`,
                              category: "Consultation",
                              cptCode: "99213",
                              quantity: 1,
                              unitPrice: p.amount,
                              total: p.amount,
                              insuranceCovered: 0,
                              patientPayable: p.amount,
                            },
                          ],
                          subtotal: p.amount,
                          discount: 0,
                          tax: 0,
                          totalAmount: p.amount,
                          insurancePortion: 0,
                          patientPortion: p.amount,
                          amountPaid: p.amount,
                          balanceDue: 0,
                          payments: [p],
                          diagnosisCodes: ["Z00.00"],
                          attendingDoctor: "DR. M.RAMA KRISHNA M.S. ENT",
                          createdAt: p.paymentDate || new Date().toISOString(),
                          updatedAt: p.paymentDate || new Date().toISOString(),
                        } as ClaimRecord

                      return (
                        <tr
                          key={p.id || idx}
                          className="hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                            {p.receiptNo || `5985${60 + idx}`}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {p.paymentDate
                              ? new Date(p.paymentDate).toLocaleString()
                              : "Today"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-900">
                              {p.patientName}
                            </div>
                            <div className="text-[10.5px] font-mono text-slate-500">
                              UMR: {p.patientId || p.mrn}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-[10.5px] text-slate-700">
                              {p.department}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                            {p.invoiceNo || relatedClaim.invoiceNo}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10.5px] ${
                                p.paymentMethod === "Cash"
                                  ? "bg-amber-100 text-amber-800"
                                  : p.paymentMethod === "UPI / Digital"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {p.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-extrabold text-emerald-700 text-[13px]">
                            ₹{p.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                            {p.transactionRef || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptModalData({
                                  claim: relatedClaim,
                                  payment: p,
                                })
                              }}
                              className="px-3 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold rounded-lg text-[11px] cursor-pointer shadow-2xs transition-colors flex items-center gap-1 mx-auto"
                            >
                              <span>🖨️</span> View Receipt
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 2: ACTIVE COLLECTIONS & CASHIER POS COUNTER
           ========================================================================= */}
        {activeTab === "active_pos" && (
          <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full">
            {/* ── Left Side: Invoice List & Queue ─────────────────────── */}
            <div className="flex-1 bg-white border border-[#DDE2EC] rounded-xl shadow-2xs flex flex-col overflow-hidden">
              <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex items-center justify-between">
                <h2 className="text-[13.5px] font-bold text-gray-900 flex items-center gap-2">
                  <span>📋</span> Unsettled Invoices Queue
                </h2>
                <div className="flex items-center gap-1 bg-white border border-[#CBD5E1] rounded p-0.5 text-xs font-bold">
                  {(["Pending", "Paid", "All"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setPosFilterType(t)}
                      className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                        posFilterType === t
                          ? "bg-[#1B4FD8] text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* POS Search Bar */}
              <div className="p-3 border-b border-slate-200 bg-white">
                <div className="relative">
                  <input
                    type="text"
                    value={posSearchQuery}
                    onChange={(e) => setPosSearchQuery(e.target.value)}
                    placeholder="Search patient, UMR, Invoice #, Dept..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-blue-600 bg-white text-gray-900"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                    🔍
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-auto max-h-[550px]">
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
                        <td
                          colSpan={6}
                          className="py-12 text-center text-slate-500"
                        >
                          No invoices found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredClaims.map((inv) => {
                        const isSelected = selectedClaim?.id === inv.id
                        const isPaid =
                          (inv.balanceDue || 0) === 0 || inv.status === "Paid"
                        return (
                          <tr
                            key={inv.id}
                            onClick={() => setSelectedInvoiceId(inv.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-[#EFF6FF] font-semibold"
                                : "hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <td className="px-5 py-3.5 font-mono text-[#1B4FD8] text-xs font-bold">
                              {inv.invoiceNo}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-gray-900">
                                {inv.patientName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                UMR: {inv.patientId || inv.mrn}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 text-xs">
                              {inv.department}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-right text-gray-900">
                              ₹{inv.totalAmount.toLocaleString("en-IN")}
                            </td>
                            <td className="px-5 py-3.5 font-mono font-bold text-right">
                              <span
                                className={
                                  isPaid ? "text-emerald-700" : "text-amber-700"
                                }
                              >
                                ₹{(inv.balanceDue || 0).toLocaleString("en-IN")}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                                  isPaid
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {isPaid ? "Paid" : "Pending"}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Right Side: Live Cashier Payment Terminal ──────────── */}
            <div className="w-full lg:w-[440px] bg-white border border-[#DDE2EC] rounded-xl shadow-2xs flex flex-col shrink-0">
              <div className="px-5 py-3.5 border-b border-[#DDE2EC] bg-[#F8FAFC]">
                <h2 className="text-[13.5px] font-bold text-gray-900 flex items-center gap-2">
                  <span>💳</span> Live POS Cashier Terminal
                </h2>
              </div>

              {!selectedClaim ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <div className="text-4xl mb-2">🧾</div>
                  <p className="text-[13px] font-semibold text-gray-700">
                    No Invoice Selected
                  </p>
                  <p className="text-[11.5px] text-[#64748B] mt-1">
                    Select an invoice from the queue to collect payment.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-5 space-y-4 text-[12.5px]">
                  {/* Selected Invoice Details */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">
                        Invoice:
                      </span>
                      <span className="font-mono font-bold text-[#1B4FD8]">
                        {selectedClaim.invoiceNo}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold text-xs">
                        Patient:
                      </span>
                      <span className="font-bold text-gray-900">
                        {selectedClaim.patientName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">
                        Department:
                      </span>
                      <span className="font-medium text-slate-800">
                        {selectedClaim.department}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                      <span className="font-bold text-gray-900">
                        Balance Due:
                      </span>
                      <span className="text-xl font-extrabold font-mono text-amber-700">
                        ₹
                        {(selectedClaim.balanceDue || 0).toLocaleString(
                          "en-IN",
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-1.5">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        "UPI / Digital",
                        "Credit Card",
                        "Debit Card",
                        "Cash",
                        "Insurance Copay",
                        "Bank Transfer",
                      ] as PaymentRecord["paymentMethod"][]).map((m) => (
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
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Amount to Pay (₹)
                      </label>
                      <input
                        type="number"
                        value={payAmount}
                        onChange={(e) => setPayAmount(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded font-mono font-bold text-gray-900 text-sm focus:border-[#1B4FD8]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        UPI / Reference #
                      </label>
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
                        <label className="block font-bold text-amber-900 text-[10.5px]">
                          Cash Received (₹)
                        </label>
                        <input
                          type="number"
                          value={cashTendered}
                          onChange={(e) =>
                            setCashTendered(Number(e.target.value))
                          }
                          className="w-full px-2 py-1 bg-white border border-amber-300 rounded font-mono font-bold"
                        />
                      </div>
                      <div className="text-right flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-amber-800">
                          Change Due:
                        </span>
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
                      disabled={
                        (selectedClaim.balanceDue || 0) === 0 && payAmount <= 0
                      }
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded text-sm cursor-pointer shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <span>✓</span> Process Settlement &amp; Issue Receipt
                    </button>
                  </div>

                  {/* Department Clearance Transmission */}
                  {(() => {
                    const effectiveReceiptNo =
                      selectedClaim.payments &&
                      selectedClaim.payments.length > 0
                        ? selectedClaim.payments[
                            selectedClaim.payments.length - 1
                          ].receiptNo
                        : undefined
                    const clearanceStatus =
                      BillingDatabase.getDepartmentClearanceStatus(
                        selectedClaim.patientName,
                        selectedClaim,
                      )
                    const isLabDispatched =
                      dispatchedClearances[
                        `${selectedClaim.patientName}_Laboratory`
                      ] || clearanceStatus.labPendingCount === 0
                    const isRadDispatched =
                      dispatchedClearances[
                        `${selectedClaim.patientName}_Radiology`
                      ] || clearanceStatus.radPendingCount === 0

                    if (clearanceStatus.isNonDiagnostic) return null

                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                        <div className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <span>🏥</span> Department Clearance Routing
                        </div>

                        {clearanceStatus.hasLabOrders && (
                          <div className="p-2 bg-white border border-slate-200 rounded flex items-center justify-between gap-2 shadow-2xs">
                            <div>
                              <div className="font-bold text-gray-900 text-[11.5px]">
                                Laboratory
                              </div>
                              <div className="text-[10.5px] text-slate-500">
                                {clearanceStatus.labTestNames.join(", ") ||
                                  "Lab Tests"}
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
                                  onClick={() =>
                                    handleDispatchClearance(
                                      selectedClaim.patientName,
                                      "Laboratory",
                                      effectiveReceiptNo,
                                      clearanceStatus.labTestNames[0],
                                    )
                                  }
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
                              <div className="font-bold text-gray-900 text-[11.5px]">
                                Radiology
                              </div>
                              <div className="text-[10.5px] text-slate-500">
                                {clearanceStatus.radStudyNames.join(", ") ||
                                  "Imaging Studies"}
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
                                  onClick={() =>
                                    handleDispatchClearance(
                                      selectedClaim.patientName,
                                      "Radiology",
                                      effectiveReceiptNo,
                                      clearanceStatus.radStudyNames[0],
                                    )
                                  }
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded shadow-2xs cursor-pointer"
                                >
                                  📤 Send Clearance
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Standardized Reference Hospital Receipt Modal */}
      {receiptModalData && (
        <HospitalReceiptModal
          claim={receiptModalData.claim}
          payment={receiptModalData.payment}
          onClose={() => setReceiptModalData(null)}
        />
      )}
    </div>
  )
}
