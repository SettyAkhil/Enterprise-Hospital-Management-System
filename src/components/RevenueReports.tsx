import React from 'react';
import { Icon } from './icons';

export default function RevenueReports() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
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
            <div key={i} className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-sm">
              <div className="text-[11.5px] font-semibold text-[#64748B] mb-2">{stat.label}</div>
              <div className="flex items-end justify-between">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.val}</div>
                <div className={`text-[12px] font-bold ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-6 flex-1">
          {/* Revenue by Department */}
          <div className="flex-1 bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex flex-col overflow-hidden">
             <div className="px-5 py-4 border-b border-[#DDE2EC] bg-[#F8FAFC]">
               <h2 className="text-[14px] font-semibold text-gray-900">Revenue Breakdown by Department</h2>
             </div>
             <div className="flex-1 p-6">
                {/* Mock Chart representation using HTML/CSS */}
                <div className="space-y-6">
                  {[
                    { dept: "Surgery & OR", amount: "$950,000", pct: 40, color: "bg-[#1B4FD8]" },
                    { dept: "Inpatient Wards", amount: "$620,000", pct: 26, color: "bg-[#0284C7]" },
                    { dept: "Pharmacy", amount: "$380,000", pct: 16, color: "bg-[#0EA5E9]" },
                    { dept: "Radiology & Imaging", amount: "$250,000", pct: 10, color: "bg-[#38BDF8]" },
                    { dept: "Outpatient Clinics", amount: "$200,000", pct: 8, color: "bg-[#7DD3FC]" },
                  ].map((row, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[12.5px] mb-1">
                        <span className="font-semibold text-gray-700">{row.dept}</span>
                        <span className="font-bold text-gray-900">{row.amount} <span className="text-[#64748B] font-normal">({row.pct}%)</span></span>
                      </div>
                      <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className={`h-full ${row.color}`} style={{ width: `${row.pct}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          {/* Outstanding Claims */}
          <div className="w-96 bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex flex-col">
            <div className="px-5 py-4 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <h2 className="text-[14px] font-semibold text-gray-900">Aging Insurance Claims</h2>
              <Icon.Insurance className="text-[#1B4FD8]" />
            </div>
            <div className="p-5 flex-1 space-y-4 text-[13px]">
               <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
                 <span className="text-[#64748B]">0-30 Days</span>
                 <span className="font-bold text-gray-900">$520,000</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
                 <span className="text-[#64748B]">31-60 Days</span>
                 <span className="font-bold text-[#D97706]">$210,000</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
                 <span className="text-[#64748B]">61-90 Days</span>
                 <span className="font-bold text-[#DC2626]">$85,000</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
                 <span className="text-[#64748B]">&gt; 90 Days (Critical)</span>
                 <span className="font-bold text-[#991B1B]">$30,000</span>
               </div>

               <div className="mt-8 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg p-4">
                 <h3 className="text-[12px] font-bold text-[#991B1B] mb-1">Denial Alert</h3>
                 <p className="text-[11.5px] text-[#7F1D1D] mb-3">Claim denials from Medicare increased by 4% this week due to missing prior authorizations.</p>
                 <button className="text-[11.5px] font-bold text-[#991B1B] hover:underline">View Denied Claims</button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
