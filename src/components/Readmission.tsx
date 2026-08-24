import React from 'react';
import { Icon } from './icons';

export default function Readmission() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Readmission Tracking</h1>
          <p className="text-[12.5px] text-[#64748B]">Monitor 30-day readmissions and AI-predicted risk profiles.</p>
        </div>
        <div className="flex gap-2">
           <button className="h-8 px-3 bg-[#1B4FD8] text-white text-[12px] font-medium rounded hover:bg-[#1740B4] transition-colors flex items-center gap-2">
            <Icon.Download /> Generate CMS Report
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        
        {/* Readmission Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
             <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">30-Day Readmission Rate</div>
             <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-[#D97706]">12.4%</div>
                <div className="text-[11px] font-bold text-red-600 mb-1">+1.2%</div>
             </div>
          </div>
          <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
             <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Total Readmissions (YTD)</div>
             <div className="text-2xl font-bold text-gray-900">342</div>
          </div>
          <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
             <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Patients at High Risk</div>
             <div className="text-2xl font-bold text-[#DC2626]">28</div>
          </div>
          <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
             <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Estimated Penalty Risk</div>
             <div className="text-2xl font-bold text-gray-900">$142,000</div>
          </div>
        </div>

        <div className="flex gap-6 flex-1">
           {/* Current Readmitted Patients */}
           <div className="flex-1 bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex flex-col overflow-hidden">
             <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
               <h2 className="text-[14px] font-semibold text-gray-900">Current Readmitted Patients</h2>
               <div className="relative">
                 <Icon.Search />
                 <input placeholder="Search..." className="pl-8 pr-3 py-1 text-[12px] border border-[#DDE2EC] rounded focus:outline-none focus:border-[#1B4FD8]" />
                 <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"><Icon.Search /></span>
               </div>
             </div>
             <div className="flex-1 overflow-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-[#DDE2EC]">
                    <tr>
                      <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Index Admission</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Days Since D/C</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Reason for Readmission</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {[
                      { name: "John Smith", mrn: "847291", index: "Heart Failure", days: 12, reason: "Fluid Overload" },
                      { name: "Sarah Davis", mrn: "992103", index: "Pneumonia", days: 8, reason: "Recurrent Fever" },
                      { name: "Robert Wilson", mrn: "112948", index: "Knee Arthroplasty", days: 22, reason: "Surgical Site Infection" },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-[#F8FAFC]">
                        <td className="px-5 py-4">
                          <div className="text-[13px] font-bold text-gray-900">{row.name}</div>
                          <div className="text-[11.5px] font-mono text-[#64748B]">MRN: {row.mrn}</div>
                        </td>
                        <td className="px-5 py-4 text-[12.5px] text-gray-700">{row.index}</td>
                        <td className="px-5 py-4">
                           <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.days < 15 ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>{row.days} Days</span>
                        </td>
                        <td className="px-5 py-4 text-[12.5px] text-gray-700">{row.reason}</td>
                        <td className="px-5 py-4 text-right">
                           <button className="text-[12px] font-medium text-[#1B4FD8] hover:underline">View RCA</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
           </div>

           {/* AI Risk Predictions */}
           <div className="w-96 bg-[#0C1524] rounded-xl shadow-lg flex flex-col overflow-hidden text-white">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                 <h2 className="text-[14px] font-bold flex items-center gap-2">
                   <Icon.FlaskConical /> AI Readmission Risk
                 </h2>
                 <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono">LIVE PREDICTIONS</span>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                 <p className="text-[12px] text-[#94A3B8] mb-2">Patients currently admitted with high risk of 30-day readmission.</p>
                 
                 {[
                   { name: "Frank Torres", ward: "Cardiology", risk: 84, factors: ["Poor medication adherence history", "Multiple comorbidities", "Living alone"] },
                   { name: "Helen Park", ward: "Internal Medicine", risk: 76, factors: ["Frequent ED visits (4 in 6mo)", "Complex medication regimen"] },
                 ].map((p, i) => (
                   <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3">
                     <div className="flex justify-between items-start mb-2">
                       <div>
                         <div className="text-[13px] font-bold">{p.name}</div>
                         <div className="text-[11px] text-[#94A3B8]">{p.ward}</div>
                       </div>
                       <div className="w-10 h-10 rounded-full border-4 border-[#DC2626] flex items-center justify-center">
                         <span className="text-[12px] font-bold text-[#F87171]">{p.risk}%</span>
                       </div>
                     </div>
                     <div className="text-[11px] text-[#94A3B8] mb-1">Risk Factors:</div>
                     <ul className="list-disc pl-4 text-[11px] text-white/80 space-y-1">
                       {p.factors.map((f, j) => <li key={j}>{f}</li>)}
                     </ul>
                     <button className="w-full mt-3 py-1.5 bg-[#1B4FD8] text-white text-[11px] font-medium rounded hover:bg-[#1740B4]">Generate Care Plan</button>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
