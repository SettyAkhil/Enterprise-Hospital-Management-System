import { useEffect, useMemo, useState } from "react"
import { Plus, Search } from "lucide-react"
import type { ComprehensiveClaimRecord } from "../../types/insurance"
import ClaimWorkspace from "./ClaimWorkspace"
import { NEEDS_ME, NEXT_SHORT, stepOf, type DeskStepId } from "./deskGuide"
import NewCaseModal from "./NewCaseModal"
import { Empty, PageHeader, QueueButton, Stat, StatusPill, btn, daysUntil, fieldBase, fmtDateTime, inr, useCases, useNotify } from "./ui"


// Insurance home: every insured admission in one worklist, filtered by the
// stage of the claim process. Opening a row shows that claim.

type Nav = (module: string, caseId?: string) => void
type View = "needs" | "all" | "closed" | DeskStepId

const STAGE_TABS: { id: DeskStepId; label: string }[] = [
  { id: "admission", label: "Admission" },
  { id: "eligibility", label: "Eligibility" },
  { id: "preauth", label: "Pre-auth" },
  { id: "treatment", label: "Treatment" },
  { id: "discharge", label: "Discharge" },
  { id: "submission", label: "Submitted" },
  { id: "adjudication", label: "Insurer decision" },
  { id: "settlement", label: "Settlement" },
]

const openQueries = (c: ComprehensiveClaimRecord) => c.queries.filter((q) => q.status === "Open" || q.status === "Draft Response")
const needsMe = (c: ComprehensiveClaimRecord) => NEEDS_ME.includes(c.status) || openQueries(c).length > 0

export default function ClaimsHome({ onNavigate, initialCaseId, initialView }: { onNavigate: Nav; initialCaseId?: string; initialView?: View }) {
  const cases = useCases()
  const { notify, toastNode } = useNotify()
  const [open, setOpen] = useState<string | undefined>(initialCaseId)
  const [view, setView] = useState<View>(initialView || "needs")
  const [q, setQ] = useState("")
  const [insurer, setInsurer] = useState("")
  const [enc, setEnc] = useState("")
  const [adding, setAdding] = useState(false)

  useEffect(() => setOpen(initialCaseId), [initialCaseId])
  useEffect(() => { if (initialView) setView(initialView) }, [initialView])


  const inView = (c: ComprehensiveClaimRecord, v: View) =>
    v === "all" ? true : v === "closed" ? c.status === "CLOSED" : v === "needs" ? needsMe(c) && c.status !== "CLOSED" : stepOf(c).id === v && c.status !== "CLOSED"

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return cases
      .filter((c) => inView(c, view))
      .filter((c) => !insurer || c.policy.insurerName === insurer)
      .filter((c) => !enc || c.encounterType === enc)
      .filter((c) => !t || [c.patientName, c.patientId, c.id, c.policy.policyNumber, c.invoiceNo, c.preAuth?.id].some((v) => String(v ?? "").toLowerCase().includes(t)))
  }, [cases, view, q, insurer, enc]) // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => {
    const withInsurer = cases.filter((c) => ["CLAIM_SUBMITTED", "CLAIM_QUERY_RAISED"].includes(c.status))
    const due = cases.filter((c) => ["APPROVED", "PARTIALLY_APPROVED", "SETTLEMENT_PENDING"].includes(c.status))
    const qs = cases.flatMap(openQueries)
    return {
      withInsurer: withInsurer.reduce((a, c) => a + c.finalClaimAmount, 0),
      due: due.reduce((a, c) => a + Math.max(0, (c.settlement?.expectedAmount ?? c.approvedClaimAmount ?? 0) - (c.settlement?.receivedAmount ?? 0)), 0),
      queries: qs.length,
      overdue: qs.filter((x) => daysUntil(x.dueDate) < 0).length,
    }
  }, [cases])

  const current = open ? cases.find((c) => c.id === open) : undefined
  if (current)
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        {toastNode}
        <ClaimWorkspace c={current} notify={notify} onBack={() => setOpen(undefined)} onOpenBilling={() => onNavigate("billing_ip")} />
      </div>
    )

  const insurers = [...new Set(cases.map((c) => c.policy.insurerName))].sort()
  const count = (v: View) => cases.filter((c) => inView(c, v)).length

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {toastNode}
      {adding && <NewCaseModal notify={notify} onClose={() => setAdding(false)} onOpened={(id) => (setAdding(false), setOpen(id))} />}
      <PageHeader
        title="Insurance claims"
        subtitle="Every insured admission, from eligibility to settlement."
        actions={
          <>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${fieldBase} pl-9 w-72`} placeholder="Search patient, UHID, claim or policy" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search claims" />
            </div>
            <button type="button" className={btn.primary} onClick={() => setAdding(true)}>
              <Plus size={15} /> New claim
            </button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Key Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat
            label="With Insurers for Review"
            value={inr(summary.withInsurer)}
            sub={`${cases.filter((c) => ["CLAIM_SUBMITTED", "CLAIM_QUERY_RAISED"].includes(c.status)).length} active claims`}
            tone="text-teal-800"
          />
          <Stat
            label="Approved & Awaiting Payment"
            value={inr(summary.due)}
            sub={`${cases.filter((c) => ["APPROVED", "PARTIALLY_APPROVED", "SETTLEMENT_PENDING"].includes(c.status)).length} claims pending UTR`}
            tone="text-emerald-800"
          />
          <Stat
            label="Open Insurer Queries"
            value={summary.queries}
            sub={summary.overdue ? `${summary.overdue} overdue query responses` : "All responses on schedule"}
            tone={summary.overdue ? "text-rose-700 font-bold" : "text-amber-800"}
          />
        </div>

        {/* Stage Filter Buttons & Search Dropdowns */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200/80 p-2 rounded-lg shadow-2xs">
          <QueueButton active={view === "needs"} label="Needs Action" count={count("needs")} alert onClick={() => setView("needs")} />
          <span className="w-px h-5 bg-slate-200/80 mx-1" />
          {STAGE_TABS.filter((s) => s.id !== "admission" || count("admission") > 0).map((s) => (
            <QueueButton key={s.id} active={view === s.id} label={s.label} count={count(s.id)} onClick={() => setView(s.id)} />
          ))}
          <span className="w-px h-5 bg-slate-200/80 mx-1" />
          <QueueButton active={view === "closed"} label="Closed" count={count("closed")} onClick={() => setView("closed")} />
          <QueueButton active={view === "all"} label="All Cases" count={cases.length} onClick={() => setView("all")} />

          <div className="ml-auto flex items-center gap-2">
            <select className={`${fieldBase} w-44`} value={insurer} onChange={(e) => setInsurer(e.target.value)} aria-label="Insurer">
              <option value="">All Insurers</option>
              {insurers.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
            <select className={`${fieldBase} w-36`} value={enc} onChange={(e) => setEnc(e.target.value)} aria-label="Encounter">
              <option value="">All Wards</option>
              {["IP", "ICU", "OT", "ER"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cashless Claims Table */}
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden">
          {rows.length === 0 ? (
            <Empty title={view === "needs" ? "Nothing needs your attention" : "No claims found"} hint="Try another stage, or start a new claim for an admitted patient." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px] text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200/80 bg-slate-50/80">
                    <th className="px-5 py-3">Patient & UHID</th>
                    <th className="px-4 py-3">Insurer / TPA</th>
                    <th className="px-4 py-3">Claim Stage</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Claim Amount</th>
                    <th className="px-4 py-3">Next Required Action</th>
                    <th className="px-5 py-3 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((c) => {
                    const s = stepOf(c)
                    const oq = openQueries(c)
                    const overdue = oq.some((x) => daysUntil(x.dueDate) < 0)
                    const initials = c.patientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                    return (
                      <tr key={c.id} onClick={() => setOpen(c.id)} className="hover:bg-teal-50/40 transition-colors cursor-pointer group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-100/80 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 group-hover:text-teal-900 transition-colors">{c.patientName}</div>
                              <div className="text-[11.5px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                                <span>{c.id}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-semibold text-teal-800 bg-teal-50 border border-teal-100 rounded px-1.5 py-0.2 text-[10.5px]">{c.encounterType}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-800">
                          <div className="font-medium">{c.policy.insurerName}</div>
                          {c.policy.tpaName && <div className="text-[11.5px] text-slate-500 font-normal">{c.policy.tpaName}</div>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{s.title}</span>
                            <span className="text-[11px] font-mono text-slate-500 font-semibold px-1.5 py-0.5 bg-slate-100 rounded">{s.n}/8</span>
                          </div>
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div className="bg-teal-600 h-full rounded-full transition-all" style={{ width: `${(s.n / 8) * 100}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusPill status={c.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                          {inr(c.finalClaimAmount || c.preAuth?.requestedAmount || c.consumedBillAmount)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 font-semibold text-[12px] ${overdue ? "text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md" : oq.length ? "text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md" : "text-slate-700"}`}>
                            {oq.length ? `Answer insurer query${overdue ? " (overdue)" : ""}` : NEXT_SHORT[c.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-[11.5px] font-mono text-slate-400 whitespace-nowrap">{fmtDateTime(c.updatedAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


