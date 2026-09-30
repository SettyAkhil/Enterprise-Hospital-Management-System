import React, { useState } from "react";
import { Icon } from "../icons";
import { InsuranceEngineService } from "../../services/insuranceDb";
import { ComprehensiveClaimRecord, ClaimQuery } from "../../types/insurance";

interface Props {
  claims: ComprehensiveClaimRecord[];
  onRefresh: () => void;
}

export default function QueryManagementDesk({ claims, onRefresh }: Props) {
  const [selectedClaim, setSelectedClaim] = useState<ComprehensiveClaimRecord | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<ClaimQuery | null>(null);
  const [responseText, setResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract all active queries from claims
  const allQueries = claims.flatMap((c) =>
    (c.queries || []).map((q) => ({ query: q, claim: c }))
  );

  const handleOpenResponse = (c: ComprehensiveClaimRecord, q: ClaimQuery) => {
    setSelectedClaim(c);
    setSelectedQuery(q);
    setResponseText(q.hospitalResponseText || "");
  };

  const handleSubmitResponse = () => {
    if (!selectedClaim || !selectedQuery) return;
    setIsSubmitting(true);

    setTimeout(() => {
      selectedQuery.status = "Response Submitted";
      selectedQuery.hospitalResponseText = responseText;
      selectedQuery.respondedAt = new Date().toISOString();
      selectedQuery.respondedBy = "Insurance Desk Officer";

      selectedClaim.status = "CLAIM_SUBMITTED";

      InsuranceEngineService.saveClaim(selectedClaim);
      InsuranceEngineService.updateClaimStatus(
        selectedClaim.id,
        "CLAIM_SUBMITTED",
        "Insurance Desk Officer",
        "Insurance Officer",
        `Query response submitted for query ${selectedQuery.id}`
      );

      setIsSubmitting(false);
      setSelectedQuery(null);
      setSelectedClaim(null);
      onRefresh();
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold">
            <Icon.AlertTriangle />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900">
              Active Insurer &amp; TPA Query Resolution Desk
            </h3>
            <p className="text-xs text-amber-800/80">
              Manage requests for additional clinical documentation, bills, and operative reports to avoid claim denials.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-amber-900 font-mono">
            {allQueries.filter((item) => item.query.status === "Open").length}
          </span>
          <span className="block text-[11px] font-bold text-amber-700 uppercase tracking-wide">
            Open Queries Pending Response
          </span>
        </div>
      </div>

      {/* Query List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {allQueries.map(({ query, claim }) => (
          <div
            key={query.id}
            className={`bg-white border rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all space-y-4 ${
              query.status === "Open" ? "border-amber-300" : "border-slate-200"
            }`}
          >
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">{claim.patientName}</span>
                  <span className="text-xs font-mono text-slate-400">({claim.mrn})</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Claim ID: <strong className="font-mono text-slate-700">{claim.id}</strong> | Insurer: <strong className="text-slate-700">{claim.policy.insurerName}</strong>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  query.status === "Open"
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                }`}
              >
                {query.status}
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">
                Requested by: <span className="text-blue-700">{query.requestedBy}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-800 leading-relaxed font-medium">
                "{query.queryText}"
              </div>
            </div>

            {query.hospitalResponseText && (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
                <div className="font-bold text-emerald-900">Hospital Response:</div>
                <div className="text-emerald-800">{query.hospitalResponseText}</div>
                <div className="text-[10.5px] text-emerald-600 font-mono">
                  Submitted at: {new Date(query.respondedAt!).toLocaleString()} by {query.respondedBy}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] font-mono text-slate-400">
                Due Date: {new Date(query.dueDate).toLocaleDateString()}
              </span>

              {query.status === "Open" && (
                <button
                  onClick={() => handleOpenResponse(claim, query)}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Icon.Edit /> Respond to Query
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Response Modal */}
      {selectedQuery && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900">
              Submit Query Response to {selectedQuery.requestedBy}
            </h3>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-700 block">Query Prompt:</span>
              <p className="text-slate-800 font-medium">"{selectedQuery.queryText}"</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Clinical &amp; Administrative Response Text:
              </label>
              <textarea
                rows={4}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Enter doctor clarification, operative details, or invoice breakdowns..."
                className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedQuery(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResponse}
                disabled={isSubmitting || !responseText.trim()}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Response to TPA"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
