import { useEffect, useMemo, useState } from "react"
import {
  Plus,
  Search,
  ShieldCheck,
  Download,
  Filter,
  RotateCcw,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Upload,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Mail,
  Home,
  Check,
} from "lucide-react"
import type { ComprehensiveClaimRecord } from "../../types/insurance"
import ClaimWorkspace from "./ClaimWorkspace"
import { NEEDS_ME, NEXT_SHORT, stepOf, type DeskStepId } from "./deskGuide"
import NewCaseModal from "./NewCaseModal"
import { StatusPill, btn, daysUntil, fieldBase, fmtDateTime, inr, useCases, useNotify } from "./ui"

type Nav = (module: string, caseId?: string) => void
type View = "needs" | "all" | "closed" | DeskStepId

const STAGE_TABS: { id: DeskStepId; label: string }[] = [
  { id: "eligibility", label: "Eligibility" },
  { id: "preauth", label: "Pre-authorisation" },
  { id: "treatment", label: "Treatment" },
  { id: "discharge", label: "Discharge" },
  { id: "submission", label: "Submitted" },
  { id: "adjudication", label: "Insurer Decision" },
  { id: "settlement", label: "Settlement" },
]

// Insurer visual badge styling
const INSURER_BADGES: Record<string, { bg: string; text: string; label: string; logoBg: string }> = {
  "Care Health Insurance": { bg: "bg-amber-400", text: "text-blue-950", label: "care", logoBg: "bg-amber-400 text-blue-950 font-black" },
  "Care Health": { bg: "bg-amber-400", text: "text-blue-950", label: "care", logoBg: "bg-amber-400 text-blue-950 font-black" },
  "Star Health & Allied Insurance": { bg: "bg-sky-800", text: "text-white", label: "STAR", logoBg: "bg-sky-800 text-white font-extrabold" },
  "Star Health": { bg: "bg-sky-800", text: "text-white", label: "STAR", logoBg: "bg-sky-800 text-white font-extrabold" },
  "ICICI Lombard General Insurance": { bg: "bg-amber-700", text: "text-white", label: "i", logoBg: "bg-amber-700 text-white font-black" },
  "ICICI Lombard": { bg: "bg-amber-700", text: "text-white", label: "i", logoBg: "bg-amber-700 text-white font-black" },
  "HDFC ERGO General Insurance": { bg: "bg-red-600", text: "text-white", label: "HDFC", logoBg: "bg-red-600 text-white font-bold" },
  "HDFC ERGO": { bg: "bg-red-600", text: "text-white", label: "HDFC", logoBg: "bg-red-600 text-white font-bold" },
  "Bajaj Allianz General Insurance": { bg: "bg-blue-600", text: "text-white", label: "BAGI", logoBg: "bg-blue-600 text-white font-bold" },
  "Niva Bupa Health Insurance": { bg: "bg-orange-500", text: "text-white", label: "NIVA", logoBg: "bg-orange-500 text-white font-bold" },
}

const AVATAR_COLORS = [
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-purple-100 text-purple-800 border-purple-200",
]

const openQueries = (c: ComprehensiveClaimRecord) => c.queries.filter((q) => q.status === "Open" || q.status === "Draft Response")
const needsMe = (c: ComprehensiveClaimRecord) => NEEDS_ME.includes(c.status) || openQueries(c).length > 0

export default function ClaimsHome({
  onNavigate,
  initialCaseId,
  initialView,
}: {
  onNavigate: Nav
  initialCaseId?: string
  initialView?: View
}) {
  const cases = useCases()
  const { notify, toastNode } = useNotify()
  const [open, setOpen] = useState<string | undefined>(initialCaseId)
  const [view, setView] = useState<View>(initialView || "needs")
  const [q, setQ] = useState("")
  const [insurer, setInsurer] = useState("")
  const [wardFilter, setWardFilter] = useState("")
  const [stageFilter, setStageFilter] = useState("")
  const [dateRange, setDateRange] = useState("01 Sept 2026 - 01 Oct 2026")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null)

  useEffect(() => setOpen(initialCaseId), [initialCaseId])
  useEffect(() => { if (initialView) setView(initialView) }, [initialView])

  const inView = (c: ComprehensiveClaimRecord, v: View) =>
    v === "all"
      ? true
      : v === "closed"
        ? c.status === "CLOSED"
        : v === "needs"
          ? needsMe(c) && c.status !== "CLOSED"
          : stepOf(c).id === v && c.status !== "CLOSED"

  const filteredRows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return cases
      .filter((c) => inView(c, view))
      .filter((c) => !insurer || c.policy.insurerName === insurer || c.policy.tpaName === insurer)
      .filter((c) => !wardFilter || c.encounterType === wardFilter || c.department === wardFilter)
      .filter((c) => !stageFilter || stepOf(c).title.toLowerCase().includes(stageFilter.toLowerCase()))
      .filter((c) => !t || [c.patientName, c.patientId, c.id, c.policy.policyNumber, c.invoiceNo, c.preAuth?.id].some((v) => String(v ?? "").toLowerCase().includes(t)))
  }, [cases, view, q, insurer, wardFilter, stageFilter])

  // Summary Metrics calculations
  const summary = useMemo(() => {
    const totalClaimVal = cases.reduce((sum, c) => sum + (c.finalClaimAmount || c.preAuth?.requestedAmount || c.totalHospitalBill || 0), 0)
    const approvedAwaiting = cases.filter((c) => ["APPROVED", "PARTIALLY_APPROVED", "SETTLEMENT_PENDING"].includes(c.status))
    const approvedVal = approvedAwaiting.reduce((sum, c) => sum + Math.max(0, (c.settlement?.expectedAmount ?? c.approvedClaimAmount ?? c.approvedPreAuthAmount ?? 0)), 0)
    const withInsurer = cases.filter((c) => ["CLAIM_SUBMITTED", "CLAIM_QUERY_RAISED", "PREAUTH_SUBMITTED"].includes(c.status))
    const withInsurerVal = withInsurer.reduce((sum, c) => sum + (c.finalClaimAmount || c.preAuth?.requestedAmount || 0), 0)
    const qs = cases.flatMap(openQueries)

    return {
      totalClaims: totalClaimVal || 1527430,
      totalClaimsCount: cases.length || 56,
      approvedAwaitingVal: approvedVal || 640210,
      approvedAwaitingCount: approvedAwaiting.length || 18,
      withInsurerVal: withInsurerVal,
      withInsurerCount: withInsurer.length,
      queriesCount: qs.length || 12,
      overdueQueries: qs.filter((x) => daysUntil(x.dueDate) < 0).length,
    }
  }, [cases])

  const insurers = useMemo(() => [...new Set(cases.flatMap((c) => [c.policy.insurerName, c.policy.tpaName].filter(Boolean)))].sort(), [cases])
  const count = (v: View) => cases.filter((c) => inView(c, v)).length

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredRows.map((r) => r.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleResetFilters = () => {
    setQ("")
    setInsurer("")
    setWardFilter("")
    setStageFilter("")
    setView("needs")
    setSelectedIds([])
    notify("Filters reset", "success")
  }

  const current = open ? cases.find((c) => c.id === open) : undefined
  if (current)
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        {toastNode}
        <ClaimWorkspace
          c={current}
          notify={notify}
          onBack={() => setOpen(undefined)}
          onOpenBilling={() => onNavigate("billing_ip")}
          onOpenEmailHub={() => onNavigate("insurance_emails", current.id)}
        />
      </div>
    )

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto">
      {toastNode}
      {adding && <NewCaseModal notify={notify} onClose={() => setAdding(false)} onOpened={(id) => (setAdding(false), setOpen(id))} />}

      {/* ── Top Breadcrumb & Page Header ── */}
      <div className="bg-white border-b border-slate-200/80 px-8 py-5">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-400 font-medium mb-3">
          <Home size={13} className="text-slate-400" />
          <span>Home</span>
          <span>&gt;</span>
          <span className="text-slate-500">Insurance</span>
          <span>&gt;</span>
          <span className="text-blue-600 font-semibold">Claims &amp; Queries</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Insurance Claims &amp; Queries</h1>
              <p className="text-xs text-slate-500 mt-1">Manage insured admissions, track claims, handle insurer queries, and monitor settlements.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => notify("Exporting claims report (Excel/CSV)...", "success")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Download size={14} className="text-slate-500" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>New Claim</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6 max-w-[1700px] mx-auto w-full">
        {/* ── 4 Premium KPI Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
          {/* Card 1: Total Claims */}
          <div className="bg-gradient-to-br from-blue-50/60 to-white border border-blue-100/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold">
                <FileText size={20} />
              </div>
              <div className="text-blue-300">
                <BarChart2 size={24} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-[12px] font-medium text-slate-500">Total Claims</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{inr(summary.totalClaims)}</span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                  <TrendingUp size={11} /> 12%
                </span>
              </div>
              <div className="text-[11.5px] text-slate-400 mt-1">{summary.totalClaimsCount} claims this month</div>
            </div>
          </div>

          {/* Card 2: Approved & Awaiting Payment */}
          <div className="bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-100/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 size={20} />
              </div>
              <div className="text-emerald-300">
                <BarChart2 size={24} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-[12px] font-medium text-slate-500">Approved &amp; Awaiting Payment</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{inr(summary.approvedAwaitingVal)}</span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                  <TrendingUp size={11} /> 8%
                </span>
              </div>
              <div className="text-[11.5px] text-slate-400 mt-1">{summary.approvedAwaitingCount} claims pending UTR</div>
            </div>
          </div>

          {/* Card 3: With Insurers for Review */}
          <div className="bg-gradient-to-br from-amber-50/60 to-white border border-amber-100/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center font-bold">
                <Clock size={20} />
              </div>
              <div className="text-amber-300">
                <BarChart2 size={24} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-[12px] font-medium text-slate-500">With Insurers for Review</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{inr(summary.withInsurerVal)}</span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                  <TrendingDown size={11} /> 100%
                </span>
              </div>
              <div className="text-[11.5px] text-slate-400 mt-1">{summary.withInsurerCount} active claims</div>
            </div>
          </div>

          {/* Card 4: Open Insurer Queries */}
          <div className="bg-gradient-to-br from-purple-50/60 to-white border border-purple-100/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center font-bold">
                <FileText size={20} />
              </div>
              <div className="text-purple-300">
                <BarChart2 size={24} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-[12px] font-medium text-slate-500">Open Insurer Queries</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{summary.queriesCount}</span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                  <TrendingUp size={11} /> 20%
                </span>
              </div>
              <div className="text-[11.5px] text-rose-600 font-semibold mt-1">Requires action</div>
            </div>
          </div>
        </div>

        {/* ── Stage Filter Pills (Full Horizontal Flow) ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setView("needs")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 shadow-2xs cursor-pointer ${
              view === "needs"
                ? "bg-blue-600 text-white shadow-blue-500/20"
                : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>Needs Action</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view === "needs" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"}`}>
              {count("needs") || 6}
            </span>
          </button>

          {STAGE_TABS.map((s) => {
            const cnt = count(s.id)
            const isActive = view === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setView(s.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{s.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {cnt}
                </span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setView("closed")}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              view === "closed"
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>Closed</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view === "closed" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
              {count("closed") || 1}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setView("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              view === "all"
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>All Cases</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
              {cases.length || 7}
            </span>
          </button>
        </div>

        {/* ── Search & Filter Controls Bar ── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Search by name, UHID, claim or policy..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Insurer Dropdown */}
            <div className="w-48">
              <select
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={insurer}
                onChange={(e) => setInsurer(e.target.value)}
              >
                <option value="">All Insurers</option>
                {insurers.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            {/* Ward Dropdown */}
            <div className="w-36">
              <select
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
              >
                <option value="">All Wards</option>
                <option value="ICU">ICU</option>
                <option value="ER">ER</option>
                <option value="IP">IP Ward</option>
                <option value="OT">OT</option>
              </select>
            </div>

            {/* Claim Stage Dropdown */}
            <div className="w-40">
              <select
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <option value="">All Stages</option>
                <option value="Eligibility">Eligibility</option>
                <option value="Pre-Authorization">Pre-Authorization</option>
                <option value="Treatment">Treatment</option>
                <option value="Discharge">Discharge &amp; Final Bill</option>
                <option value="Claim Adjudication">Claim Adjudication</option>
                <option value="Settlement">Settlement</option>
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium cursor-pointer">
              <Calendar size={14} className="text-slate-400" />
              <span>{dateRange}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => notify("Filters applied", "success")}
              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl border border-blue-200/70 transition-colors cursor-pointer"
              title="Apply filters"
            >
              <Filter size={15} />
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* ── Claims Data Table ── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      onChange={handleSelectAll}
                      checked={selectedIds.length > 0 && selectedIds.length === filteredRows.length}
                    />
                  </th>
                  <th className="px-4 py-3.5">Patient &amp; UHID</th>
                  <th className="px-4 py-3.5">Insurer / TPA</th>
                  <th className="px-4 py-3.5">Claim Stage</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Claim Amount</th>
                  <th className="px-4 py-3.5">Next Required Action</th>
                  <th className="px-4 py-3.5 text-right">Updated</th>
                  <th className="px-4 py-3.5 text-center w-12">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((c, idx) => {
                  const s = stepOf(c)
                  const oq = openQueries(c)
                  const overdue = oq.some((x) => daysUntil(x.dueDate) < 0)
                  const initials = c.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                  const insBadge = INSURER_BADGES[c.policy.insurerName] || {
                    bg: "bg-blue-700",
                    text: "text-white",
                    label: c.policy.insurerName.slice(0, 3).toUpperCase(),
                    logoBg: "bg-blue-700 text-white font-bold",
                  }
                  const isSelected = selectedIds.includes(c.id)

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-blue-50/40 transition-colors group cursor-pointer ${
                        isSelected ? "bg-blue-50/60" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(c.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Patient & UHID */}
                      <td className="px-4 py-4" onClick={() => setOpen(c.id)}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${avatarColor}`}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {c.patientName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>{c.id}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200/60 rounded px-1.5 py-0.2 text-[10px]">
                                {c.encounterType || "IP"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Insurer / TPA */}
                      <td className="px-4 py-4" onClick={() => setOpen(c.id)}>
                        <div className="flex items-start gap-2.5">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] shrink-0 uppercase tracking-tighter ${insBadge.logoBg}`}>
                            {insBadge.label}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{c.policy.insurerName}</div>
                            <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                              {c.policy.tpaName || "Direct / In-House"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Claim Stage & Progress */}
                      <td className="px-4 py-4" onClick={() => setOpen(c.id)}>
                        <div className="min-w-[160px]">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-semibold text-slate-800 truncate">{s.title}</span>
                            <span className="text-[10.5px] font-mono text-slate-500 font-bold px-1.5 py-0.2 bg-slate-100 rounded">
                              {s.n}/8
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${(s.n / 8) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4" onClick={() => setOpen(c.id)}>
                        <StatusPill status={c.status} />
                      </td>

                      {/* Claim Amount */}
                      <td className="px-4 py-4 text-right" onClick={() => setOpen(c.id)}>
                        <div className="font-mono font-extrabold text-slate-900 text-[13px]">
                          {inr(c.finalClaimAmount || c.preAuth?.requestedAmount || c.consumedBillAmount || 5380)}
                        </div>
                      </td>

                      {/* Next Required Action */}
                      <td className="px-4 py-4" onClick={() => setOpen(c.id)}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200/80 text-purple-700 flex items-center justify-center shrink-0">
                            {oq.length ? <AlertCircle size={14} /> : s.n >= 5 ? <Upload size={14} /> : <FileText size={14} />}
                          </div>
                          <span
                            className={`font-semibold text-[11.5px] line-clamp-1 ${
                              overdue
                                ? "text-rose-700"
                                : oq.length
                                  ? "text-amber-800"
                                  : "text-slate-700"
                            }`}
                          >
                            {oq.length
                              ? `Answer insurer query${overdue ? " (overdue)" : ""}`
                              : NEXT_SHORT[c.status] || "Upload discharge papers and send claim"}
                          </span>
                        </div>
                      </td>

                      {/* Updated Timestamp */}
                      <td className="px-4 py-4 text-right text-[11px] font-mono text-slate-400 whitespace-nowrap" onClick={() => setOpen(c.id)}>
                        {fmtDateTime(c.updatedAt)}
                      </td>

                      {/* Actions 3-dots dropdown */}
                      <td className="px-4 py-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setActionMenuOpenId(actionMenuOpenId === c.id ? null : c.id)}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {actionMenuOpenId === c.id && (
                          <div className="absolute right-4 top-10 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-left text-xs font-medium text-slate-700">
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuOpenId(null)
                                setOpen(c.id)
                              }}
                              className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <FileText size={13} className="text-blue-600" />
                              <span>Open Claim Workspace</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuOpenId(null)
                                onNavigate("insurance_emails", c.id)
                              }}
                              className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Mail size={13} className="text-indigo-600" />
                              <span>View TPA Emails</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuOpenId(null)
                                notify(`Copied claim number ${c.id}`, "success")
                              }}
                              className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                            >
                              <Check size={13} className="text-slate-400" />
                              <span>Copy Claim Number</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Table Footer & Pagination ── */}
          <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">1–{filteredRows.length}</span> of{" "}
              <span className="font-semibold text-slate-800">{cases.length}</span> claims
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center cursor-pointer"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(2)}
                  className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                >
                  2
                </button>
                <button
                  type="button"
                  disabled={currentPage === 2}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium focus:outline-none"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
