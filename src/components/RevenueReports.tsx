import React from 'react';
import { Icon } from './icons';

export default function RevenueReports() {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-5 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Revenue & Financial Reports</h1>
          <p className="text-[12.5px] text-[#64748B]">Analyze hospital revenue, claims, and department financial performance.</p>
        </div>
        <div className="flex gap-2">
           <select className="border border-[#DDE2EC] rounded bg-white text-[12px] px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8]">
             <option>August 2026</option>
             <option>July 2026</option>
             <option>Q3 2026</option>
           </select>
           <button className="h-8 px-3 bg-[#1B4FD8] text-white text-[12px] font-medium rounded hover:bg-[#1740B4] transition-colors flex items-center gap-2">
            <Icon.Download /> Export PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        {/* KPI Dashboard */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Revenue (MTD)", val: "$2.4M", trend: "+8.2%", color: "text-green-600" },
            { label: "Pending Insurance Claims", val: "$845K", trend: "-2.1%", color: "text-[#1B4FD8]" },
            { label: "Out of Pocket (Cash/Card)", val: "$320K", trend: "+5.4%", color: "text-gray-900" },
            { label: "Average Revenue / Patient", val: "$1,850", trend: "+1.2%", color: "text-gray-900" },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-slate-200/60 p-6 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
              <div className="text-[12px] font-semibold text-slate-500 mb-3 tracking-wide">{stat.label}</div>
              <div className="flex items-end justify-between">
                <div className={`text-3xl font-extrabold tracking-tight ${stat.color}`}>{stat.val}</div>
                <div className={`text-[13px] font-bold px-2.5 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {stat.trend}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-6 flex-1">
          {/* Revenue by Department */}
          <div className="flex-1 bg-white border border-slate-200/60 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden">
             <div className="px-8 py-6 border-b border-slate-100 bg-white/50 backdrop-blur-md">
               <h2 className="text-base font-bold text-slate-900">Revenue Breakdown by Department</h2>
             </div>
             <div className="flex-1 p-8">
                {/* Mock Chart representation using HTML/CSS */}
                <div className="space-y-6">
                  {[
                    { dept: "Surgery & OR", amount: "$950,000", pct: 40, color: "bg-[#1B4FD8]" },
                    { dept: "Inpatient Wards", amount: "$620,000", pct: 26, color: "bg-[#0284C7]" },
                    { dept: "Pharmacy", amount: "$380,000", pct: 16, color: "bg-[#0EA5E9]" },
                    { dept: "Radiology & Imaging", amount: "$250,000", pct: 10, color: "bg-[#38BDF8]" },
                    { dept: "Outpatient Clinics", amount: "$200,000", pct: 8, color: "bg-[#7DD3FC]" },
                  ].map((row, i) => (
                    <div key={i} className="group">
                      <div className="flex justify-between text-[13px] mb-2">
                        <span className="font-semibold text-slate-700">{row.dept}</span>
                        <span className="font-bold text-slate-900">{row.amount} <span className="text-slate-400 font-medium ml-1">({row.pct}%)</span></span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full ${row.color} rounded-full relative group-hover:brightness-110 transition-all duration-500`} style={{ width: `${row.pct}%` }}>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          {/* Outstanding Claims */}
          <div className="w-96 bg-white border border-slate-200/60 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 bg-white/50 backdrop-blur-md flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900">Aging Insurance Claims</h2>
              <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm"><Icon.Insurance /></span>
            </div>
            <div className="p-8 flex-1 space-y-5 text-sm">
               <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                 <span className="text-slate-500 font-medium">0-30 Days</span>
                 <span className="font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-full">$520,000</span>
               </div>
               <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                 <span className="text-slate-500 font-medium">31-60 Days</span>
                 <span className="font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">$210,000</span>
               </div>
               <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                 <span className="text-slate-500 font-medium">61-90 Days</span>
                 <span className="font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">$85,000</span>
               </div>
               <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                 <span className="text-slate-500 font-medium">&gt; 90 Days <span className="text-red-400 text-xs ml-1 font-semibold">(Critical)</span></span>
                 <span className="font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full">$30,000</span>
               </div>

               <div className="mt-8 bg-gradient-to-br from-rose-50 to-red-50/50 border border-rose-200/60 rounded-[20px] p-5 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-red-100/50 rounded-full blur-2xl -z-10"></div>
                 <h3 className="text-[13px] font-bold text-rose-800 mb-1.5 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                   Denial Alert
                 </h3>
                 <p className="text-[12.5px] text-rose-700/80 mb-4 leading-relaxed">Claim denials from Medicare increased by 4% this week due to missing prior authorizations.</p>
                 <button className="text-[12.5px] font-bold text-rose-700 bg-white/60 hover:bg-white px-4 py-2 rounded-full transition-colors w-full text-center shadow-sm border border-rose-100">View Denied Claims</button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
