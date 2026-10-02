import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import type { ComprehensiveClaimRecord } from "../../types/insurance"
import { DESK_STEPS, stepOf } from "./deskGuide"
import { DocumentChecklist, NextStep } from "./forms"
import { MailComposer, MailThread } from "./mail"
import { Hint, KV, NEXT_HINT, StatusPill, fmtDate, fmtDateTime, inr, type Notify } from "./ui"
import { AuditTable, BillLines, Consumption, Readiness } from "./widgets"

// One claim. Left: where it is in the 8-stage process. Right: the one thing
// to do now, with documents, emails, details and history a tab away.

import ClaimPharmacyBillsView from "./ClaimPharmacyBillsView"
import ClaimPatientJourneyView from "./ClaimPatientJourneyView"

const TABS = ["Current step", "Bills & Pharmacy", "Patient Journey", "Documents", "Emails", "Details", "History"] as const
type Tab = (typeof TABS)[number]

export default function ClaimWorkspace({ c, notify, onBack, onOpenBilling }: { c: ComprehensiveClaimRecord; notify: Notify; onBack: () => void; onOpenBilling?: () => void }) {
  const [tab, setTab] = useState<Tab>("Current step")
  const [composing, setComposing] = useState(false)
  const stage = stepOf(c)
  const closed = c.status === "CLOSED"
  const stopped = ["NOT_ELIGIBLE", "PREAUTH_REJECTED", "REJECTED"].includes(c.status)
  const mand = c.documents.filter((d) => d.isMandatory)
  const verified = mand.filter((d) => d.isUploaded && d.status === "Verified").length
  const mails = c.mails ?? []
  const openQ = c.queries.filter((q) => q.status === "Open" || q.status === "Draft Response")
  const showUsage = ["PREAUTH_APPROVED", "TREATMENT_IN_PROGRESS", "DISCHARGE_INITIATED"].includes(c.status) && c.approvedPreAuthAmount > 0

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Who and how much */}
      <div className="bg-white border-b border-slate-200 px-6 pt-4 pb-5">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-900 cursor-pointer">
          <ArrowLeft size={14} /> All claims
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-[20px] font-semibold text-slate-900">{c.patientName}</h1>
          <StatusPill status={c.status} />
        </div>
        <p className="text-[13px] text-slate-500 mt-1">
          {c.id} · {c.encounterType} {c.department} · admitted {fmtDate(c.admissionDate)} · {c.policy.insurerName}
          {c.policy.tpaName ? ` / ${c.policy.tpaName}` : ""} · policy {c.policy.policyNumber || "—"}
        </p>
        <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-2">
          {[
            ["Hospital bill", c.totalHospitalBill],
            ["Pre-auth approved", c.approvedPreAuthAmount],
            ["Claim amount", c.finalClaimAmount],
            ["Settled", c.settlement?.receivedAmount ?? 0],
          ].map(([l, v]) => (
            <div key={l as string}>
              <dt className="text-[12px] text-slate-500">{l}</dt>
              <dd className="text-[17px] font-semibold text-slate-900 tabular-nums">{v ? inr(v as number) : "—"}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* The process */}
        <nav aria-label="Claim process" className="lg:sticky lg:top-6">
          <ol className="relative">
            {DESK_STEPS.map((s, i) => {
              const state = closed || s.n < stage.n ? "done" : s.n === stage.n ? (stopped ? "stopped" : "now") : "todo"
              return (
                <li key={s.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < DESK_STEPS.length - 1 && <span className={`absolute left-[11px] top-6 bottom-0 w-px ${state === "done" ? "bg-emerald-300" : "bg-slate-200"}`} />}
                  <span
                    className={`relative z-10 w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11.5px] font-semibold ${state === "done"
                        ? "bg-emerald-500 text-white"
                        : state === "now"
                          ? "bg-blue-600 text-white ring-4 ring-blue-100"
                          : state === "stopped"
                            ? "bg-rose-500 text-white ring-4 ring-rose-100"
                            : "bg-white border border-slate-300 text-slate-400"
                      }`}
                  >
                    {state === "done" ? "✓" : s.n}
                  </span>
                  <div className="pt-0.5 min-w-0">
                    <div className={`text-[13px] leading-5 ${state === "now" || state === "stopped" ? "font-semibold text-slate-900" : state === "done" ? "text-slate-700" : "text-slate-400"}`}>{s.title}</div>
                    {(state === "now" || state === "stopped") && <div className={`text-[12px] ${stopped ? "text-rose-600" : "text-blue-700"}`}>{stopped ? "Stopped here" : "In progress"}</div>}
                  </div>
                </li>
              )
            })}
          </ol>
        </nav>

        {/* The work */}
        <section className="bg-white border border-slate-200 rounded-[8px] min-w-0">
          <div role="tablist" className="flex gap-1 px-4 border-b border-slate-200 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`h-11 px-3 -mb-px border-b-2 text-[13px] font-medium whitespace-nowrap cursor-pointer ${tab === t ? "border-blue-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                {t}
                {t === "Documents" && mand.length > 0 && <span className="ml-1.5 text-slate-400 tabular-nums">{verified}/{mand.length}</span>}
                {t === "Emails" && mails.length > 0 && <span className="ml-1.5 text-slate-400 tabular-nums">{mails.length}</span>}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "Current step" && (
              <div className="space-y-5">
                <div>
                  <div className="text-[12px] text-slate-500">
                    Stage {stage.n} of 8
                  </div>
                  <h2 className="text-[17px] font-semibold text-slate-900">{stage.title}</h2>
                  <p className="text-[13.5px] text-slate-600 mt-1 max-w-3xl">{NEXT_HINT[c.status]}</p>
                </div>
                {openQ.length > 0 && !["PREAUTH_QUERY", "CLAIM_QUERY_RAISED"].includes(c.status) && <Hint tone="amber">The insurer has {openQ.length} open question{openQ.length > 1 ? "s" : ""} on this claim.</Hint>}
                {showUsage && <Consumption c={c} />}
                {["TREATMENT_IN_PROGRESS", "DISCHARGE_INITIATED", "FINAL_BILL_READY"].includes(c.status) && <Readiness c={c} />}
                <NextStep key={`${c.id}-${c.status}`} c={c} notify={notify} onOpenBilling={onOpenBilling} />
              </div>
            )}

            {tab === "Bills & Pharmacy" && (
              <ClaimPharmacyBillsView
                c={c}
                notify={notify}
                onOpenEnhancement={() => setTab("Current step")}
              />
            )}

            {tab === "Patient Journey" && (
              <ClaimPatientJourneyView c={c} />
            )}

            {tab === "Documents" && <DocumentChecklist c={c} notify={notify} />}

            {tab === "Emails" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-slate-500">Everything sent to and received from {c.policy.tpaName || c.policy.insurerName}.</p>
                  {!composing && (
                    <button type="button" className="text-[13px] font-medium text-blue-700 hover:underline cursor-pointer" onClick={() => setComposing(true)}>
                      Write an email
                    </button>
                  )}
                </div>
                {composing && <MailComposer c={c} purpose="General" notify={(m, t) => (notify(m, t), t !== "error" && setComposing(false))} allowPortal={false} />}
                <MailThread mails={mails} />
              </div>
            )}

            {tab === "Details" && <Details c={c} />}

            {tab === "History" && <AuditTable c={c} notify={notify} />}
          </div>
        </section>
      </div>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-5 first:pt-0 border-b border-slate-100 last:border-0">
      <h3 className="text-[13.5px] font-semibold text-slate-900 mb-2">{title}</h3>
      {children}
    </section>
  )
}

function Details({ c }: { c: ComprehensiveClaimRecord }) {
  const pa = c.preAuth
  const e = c.eligibility
  return (
    <div>
      <Block title="Policy and eligibility">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          <div>
            <KV k="Insurer" v={c.policy.insurerName} />
            <KV k="TPA" v={c.policy.tpaName || "—"} />
            <KV k="Policy number" v={c.policy.policyNumber || "—"} />
            <KV k="Member ID" v={c.policy.memberId || "—"} />
            <KV k="Policy holder" v={`${c.policy.policyHolderName || c.patientName} (${c.policy.relationship})`} />
          </div>
          <div>
            <KV k="Eligibility" v={e ? `${e.status} · ${fmtDateTime(e.verifiedAt)}` : "Not verified"} />
            <KV k="Sum insured" v={c.policy.sumInsured ? inr(c.policy.sumInsured) : "—"} mono />
            <KV k="Available balance" v={c.policy.balanceAvailable ? inr(c.policy.balanceAvailable) : "—"} mono />
            <KV k="Room eligibility" v={c.policy.roomCategoryEligible || e?.roomEligibilityNote || "—"} />
            <KV k="Co-pay" v={c.policy.copayPercentage ? `${c.policy.copayPercentage}%` : "None"} />
          </div>
        </div>
      </Block>

      <Block title="Pre-authorisation">
        {pa ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            <div>
              <KV k="Pre-auth number" v={pa.id} />
              <KV k="Diagnosis" v={pa.diagnosis} />
              <KV k="Treating doctor" v={pa.treatingDoctor} />
              <KV k="Expected stay" v={`${pa.estimatedHospitalStayDays} days`} />
              <KV k="Submitted" v={pa.submittedAt ? `${fmtDateTime(pa.submittedAt)} by ${pa.submissionMethod?.toLowerCase()}` : "Not yet"} />
            </div>
            <div>
              {pa.procedures.map((l) => (
                <KV key={`${l.packageCode}-${l.sequence}`} k={`${l.packageCode} ${l.procedureName} (${l.ratePercent}%)`} v={inr(l.amount)} mono />
              ))}
              <KV k={`GST ${pa.gstRate}%`} v={inr(pa.gstAmount)} mono />
              <KV k="Requested" v={inr(pa.requestedAmount)} mono />
              <KV k="Approved" v={pa.approvedAmount ? `${inr(pa.approvedAmount)}${pa.approvalCode ? ` · ${pa.approvalCode}` : ""}` : "—"} mono />
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-slate-500">No pre-authorisation yet.</p>
        )}
      </Block>

      {c.approvedPreAuthAmount > 0 && (
        <Block title="Approved vs used">
          <Consumption c={c} />
        </Block>
      )}

      <Block title="Bill">
        <BillLines c={c} />
      </Block>

      {c.queries.length > 0 && (
        <Block title="Insurer queries">
          <ul className="space-y-3">
            {c.queries.map((q) => (
              <li key={q.id} className="text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{q.id}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">
                    {q.stage} · {q.status}
                  </span>
                </div>
                <p className="text-slate-700">{q.queryText}</p>
                {q.hospitalResponseText && <p className="text-slate-500 mt-0.5">Reply: {q.hospitalResponseText}</p>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {c.settlement && (
        <Block title="Settlement">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            <div>
              <KV k="Approved" v={inr(c.settlement.approvedAmount)} mono />
              <KV k="Deductions" v={inr(c.settlement.deductionsAmount)} mono />
              <KV k="Expected" v={inr(c.settlement.expectedAmount)} mono />
              <KV k="Received" v={inr(c.settlement.receivedAmount)} mono />
            </div>
            <div>
              <KV k="Settlement advice" v={c.settlement.settlementAdviceNo || "—"} />
              <KV k="UTR" v={c.settlement.paymentReferenceNo || "—"} />
              <KV k="Payment date" v={c.settlement.paymentDate ? fmtDate(c.settlement.paymentDate) : "—"} />
              <KV k="Reconciliation" v={c.settlement.reconciliationStatus} />
            </div>
          </div>
          {c.settlement.deductionReasons.length > 0 && (
            <ul className="mt-3 text-[13px] text-slate-600 space-y-1">
              {c.settlement.deductionReasons.map((d) => (
                <li key={d.id} className="flex justify-between">
                  <span>
                    {d.category}
                    {d.remark ? ` — ${d.remark}` : ""}
                  </span>
                  <span className="tabular-nums">{inr(d.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Block>
      )}
    </div>
  )
}

