import React, { useState } from 'react';
import { Icon } from './icons';

export default function NLFiltering() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [structuredFilter, setStructuredFilter] = useState<any | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResults(null);
    setStructuredFilter(null);

    // Mock processing
    setTimeout(() => {
      setStructuredFilter({
        "gender": "male",
        "age": {
          "operator": ">",
          "value": 50
        },
        "admission_date": {
          "from": "2026-08-17",
          "to": "2026-08-24"
        }
      });
      
      setResults([
        { id: "P-8472", name: "Robert Lee", age: 66, gender: "M", admission: "2026-08-21", dept: "Cardiology", status: "Admitted" },
        { id: "P-9102", name: "Frank Torres", age: 55, gender: "M", admission: "2026-08-19", dept: "Internal Medicine", status: "Discharged" },
        { id: "P-8334", name: "William Davis", age: 72, gender: "M", admission: "2026-08-18", dept: "Orthopedics", status: "Admitted" }
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Natural Language Patient Filtering</h1>
          <p className="text-[12.5px] text-[#64748B]">Query patient populations using conversational language translated into secure database queries.</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col max-w-6xl mx-auto w-full">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="mb-6 relative">
          <input 
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. 'Show all male patients over 50 admitted last week'"
            className="w-full h-14 bg-white border border-[#DDE2EC] rounded-xl pl-4 pr-32 text-[15px] shadow-sm text-gray-900 focus:outline-none focus:border-[#1B4FD8] focus:ring-1 focus:ring-[#1B4FD8]"
          />
          <button 
            type="submit"
            disabled={!query.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icon.Filter />}
            {loading ? 'Translating...' : 'Filter'}
          </button>
        </form>

        <div className="flex gap-6 items-start">
          {/* Main Results Table */}
          <div className="flex-1 bg-white border border-[#DDE2EC] rounded-xl shadow-sm overflow-hidden min-h-[400px]">
            {!results && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-[#94A3B8] p-12">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-[14px]">Enter a natural language query above to filter the patient database.</p>
              </div>
            )}
            
            {loading && (
               <div className="h-full flex flex-col items-center justify-center p-12">
                <div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#1B4FD8] rounded-full animate-spin mb-4"></div>
                <div className="text-[14px] font-semibold text-gray-900">Executing Secure Query</div>
               </div>
            )}

            {results && !loading && (
              <>
                <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
                  <div className="text-[13px] font-semibold text-gray-900">Found {results.length} Matching Patients</div>
                  <button className="text-[11.5px] font-medium text-[#1B4FD8] hover:underline flex items-center gap-1">
                    <Icon.Download /> Export CSV
                  </button>
                </div>
                <table className="w-full text-left">
                  <thead className="border-b border-[#DDE2EC]">
                    <tr>
                      <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">MRN</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient Name</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Age/Sex</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Admission Date</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Department</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-[#F8FAFC] cursor-pointer">
                        <td className="px-5 py-3 text-[12px] font-mono text-[#64748B]">{r.id}</td>
                        <td className="px-5 py-3 text-[13px] font-semibold text-gray-900">{r.name}</td>
                        <td className="px-5 py-3 text-[12.5px] text-gray-700">{r.age} / {r.gender}</td>
                        <td className="px-5 py-3 text-[12.5px] text-gray-700">{r.admission}</td>
                        <td className="px-5 py-3 text-[12.5px] text-gray-700">{r.dept}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`px-2 py-1 text-[10.5px] font-bold rounded uppercase tracking-wider ${r.status === 'Admitted' ? 'bg-[#DBEAFE] text-[#1E3A8A]' : 'bg-[#F1F5F9] text-[#475569]'}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* Sidebar - Translation Insight */}
          {structuredFilter && (
            <div className="w-80 bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[#DDE2EC] bg-[#F8FAFC]">
                <h3 className="text-[13px] font-semibold text-gray-900 flex items-center gap-2">
                  <Icon.Cmd /> Query Translation
                </h3>
              </div>
              <div className="p-4 bg-gray-50 flex-1">
                <p className="text-[11.5px] text-[#64748B] mb-3">
                  The LLM parsed your natural language into the following structured JSON filter before querying PostgreSQL:
                </p>
                <pre className="text-[11px] font-mono bg-[#0F172A] text-[#38BDF8] p-4 rounded-lg overflow-auto">
                  {JSON.stringify(structuredFilter, null, 2)}
                </pre>
                
                <div className="mt-4 p-3 bg-[#DCFCE7] border border-[#BBF7D0] rounded-md text-[11px] text-[#166534]">
                  <strong>✓ Schema Validated:</strong> Query safely parameterized and authorized for current user role.
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
