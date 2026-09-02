import React, { useState } from 'react';
import { Icon } from './icons';
import { API_BASE } from '../lib/constants';
import { withAuthHeaders, reportError } from '../lib/api';
import type { Notice } from '../types';

type BulkPatientRow = {
  patient_id: string;
  name: string;
  last_name?: string;
  age?: number;
  gender?: string;
  area?: string;
  medical_condition?: string;
};

type Props = {
  setNotice?: (notice: Notice | null) => void;
};

export default function NLFiltering({ setNotice }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkPatientRow[] | null>(null);
  const [total, setTotal] = useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResults(null);

    try {
      const res = await fetch(`${API_BASE}/api/bulk-import/query`, {
        method: "POST",
        credentials: "include",
        headers: withAuthHeaders({ "Content-Type": "application/json" }, "POST"),
        body: JSON.stringify({ prompt: query.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw Object.assign(new Error(data.error || "Unable to run that query."), { status: res.status });
      }
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      reportError(setNotice, err as { status?: number; message?: string }, "Unable to run that query.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3">
        <h1 className="text-base font-semibold text-gray-900">Natural Language Patient Filtering</h1>
        <p className="text-[11.5px] text-[#64748B]">Query the bulk-imported patient population using conversational language, translated by the Keppler AI (Qwen) model into a secure database query.</p>
      </div>

      <div className="flex-1 overflow-auto p-5 flex flex-col max-w-6xl mx-auto w-full">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="mb-4 relative">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. 'Show all male patients over 50'"
            className="w-full h-10 bg-white border border-[#DDE2EC] rounded pl-3 pr-28 text-[13px] text-gray-900 focus:outline-none focus:border-[#1B4FD8]"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12px] font-medium rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icon.Filter />}
            {loading ? 'Translating...' : 'Filter'}
          </button>
        </form>

        <div className="flex gap-4 items-start">
          {/* Main Results Table */}
          <div className="flex-1 bg-white border border-[#DDE2EC] rounded overflow-hidden min-h-[360px]">
            {!results && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-[#94A3B8] p-10">
                <div className="text-3xl mb-3">🔍</div>
                <p className="text-[12.5px]">Enter a natural language query above to filter bulk-imported patient records.</p>
              </div>
            )}

            {loading && (
               <div className="h-full flex flex-col items-center justify-center p-10">
                <div className="w-10 h-10 border-4 border-[#E2E8F0] border-t-[#1B4FD8] rounded-full animate-spin mb-3"></div>
                <div className="text-[13px] font-semibold text-gray-900">Executing Secure Query</div>
               </div>
            )}

            {results && !loading && (
              <>
                <div className="px-4 py-2.5 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
                  <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Found {total} Matching Patients</div>
                </div>
                {results.length === 0 ? (
                  <div className="p-10 text-center text-[12.5px] text-[#94A3B8]">No bulk-imported patients matched that query.</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="border-b border-[#DDE2EC]">
                      <tr>
                        <th className="px-4 py-2 text-[10.5px] font-semibold text-[#64748B] uppercase tracking-wider">MRN</th>
                        <th className="px-4 py-2 text-[10.5px] font-semibold text-[#64748B] uppercase tracking-wider">Patient Name</th>
                        <th className="px-4 py-2 text-[10.5px] font-semibold text-[#64748B] uppercase tracking-wider">Age/Sex</th>
                        <th className="px-4 py-2 text-[10.5px] font-semibold text-[#64748B] uppercase tracking-wider">Area</th>
                        <th className="px-4 py-2 text-[10.5px] font-semibold text-[#64748B] uppercase tracking-wider">Medical Condition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {results.map((r) => (
                        <tr key={r.patient_id} className="hover:bg-[#F8FAFC]">
                          <td className="px-4 py-2 text-[11.5px] font-mono text-[#64748B]">{r.patient_id}</td>
                          <td className="px-4 py-2 text-[12.5px] font-medium text-gray-900">{r.name} {r.last_name || ""}</td>
                          <td className="px-4 py-2 text-[12px] text-gray-700">{r.age ?? "—"} / {r.gender ?? "—"}</td>
                          <td className="px-4 py-2 text-[12px] text-gray-700">{r.area || "—"}</td>
                          <td className="px-4 py-2 text-[12px] text-gray-700">{r.medical_condition || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
