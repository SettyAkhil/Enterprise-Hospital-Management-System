import React, { useState } from 'react';
import { Icon } from './icons';

export default function Admissions() {
  const [activeTab, setActiveTab] = useState<'requests'|'admitted'>('requests');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Inpatient Admissions</h1>
          <p className="text-[12.5px] text-[#64748B]">Manage admission requests and assign beds to patients.</p>
        </div>
        <div className="flex gap-2">
           <button className="h-8 px-3 bg-[#1B4FD8] text-white text-[12px] font-medium rounded hover:bg-[#1740B4] transition-colors flex items-center gap-2">
            <Icon.Plus /> Direct Admission
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex max-w-7xl mx-auto w-full flex-col gap-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
             <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Pending Requests</div>
             <div className="text-2xl font-bold text-[#D97706]">14</div>
          </div>
          <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
             <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Admitted Today</div>
             <div className="text-2xl font-bold text-[#16A34A]">22</div>
          </div>
          <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
             <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Available Beds (Gen)</div>
             <div className="text-2xl font-bold text-gray-900">45</div>
          </div>
          <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
             <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Available Beds (ICU)</div>
             <div className="text-2xl font-bold text-[#DC2626]">2</div>
          </div>
        </div>

        <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-[#DDE2EC] flex px-4">
            <button 
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-3 text-[13px] font-semibold border-b-2 transition-colors ${activeTab === 'requests' ? 'border-[#1B4FD8] text-[#1B4FD8]' : 'border-transparent text-[#64748B] hover:text-gray-900'}`}
            >
              Pending Admission Requests (14)
            </button>
            <button 
              onClick={() => setActiveTab('admitted')}
              className={`px-4 py-3 text-[13px] font-semibold border-b-2 transition-colors ${activeTab === 'admitted' ? 'border-[#1B4FD8] text-[#1B4FD8]' : 'border-transparent text-[#64748B] hover:text-gray-900'}`}
            >
              Recently Admitted
            </button>
          </div>
          
          <div className="flex-1 overflow-auto bg-[#F8FAFC]">
            {activeTab === 'requests' && (
              <div className="p-4 space-y-3">
                {[
                  { name: "Robert Lee", mrn: "882910", source: "Emergency", priority: "Urgent", diagnosis: "Acute Myocardial Infarction", reqWard: "ICU", time: "10 mins ago" },
                  { name: "Maria Garcia", mrn: "441293", source: "OPD - Cardiology", priority: "Routine", diagnosis: "Congestive Heart Failure Exacerbation", reqWard: "3N Medical", time: "45 mins ago" },
                  { name: "William Davis", mrn: "910283", source: "Surgery", priority: "Routine", diagnosis: "Post-op Hip Replacement", reqWard: "Orthopedics", time: "1 hour ago" },
                  { name: "Emma Wilson", mrn: "112938", source: "Emergency", priority: "Urgent", diagnosis: "Sepsis", reqWard: "ICU", time: "1.5 hours ago" },
                ].map((req, i) => (
                  <div key={i} className="bg-white border border-[#DDE2EC] rounded-lg p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px] ${req.priority === 'Urgent' ? 'bg-[#DC2626]' : 'bg-[#1B4FD8]'}`}>
                        {req.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[14px] font-bold text-gray-900">{req.name}</h3>
                          <span className="text-[11px] font-mono text-[#64748B]">MRN: {req.mrn}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${req.priority === 'Urgent' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#F1F5F9] text-[#475569]'}`}>
                            {req.priority}
                          </span>
                        </div>
                        <div className="text-[12.5px] text-gray-700 mb-1">
                          <strong>Diagnosis:</strong> {req.diagnosis}
                        </div>
                        <div className="text-[11.5px] text-[#64748B]">
                          Requested from: {req.source} • Requested Ward: {req.reqWard} • {req.time}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                       <button className="px-4 py-1.5 bg-[#1B4FD8] text-white text-[12px] font-medium rounded hover:bg-[#1740B4] shadow-sm">Assign Bed</button>
                       <button className="px-4 py-1.5 bg-white border border-[#DDE2EC] text-gray-700 text-[12px] font-medium rounded hover:bg-[#F8FAFC]">View Details</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'admitted' && (
              <div className="p-12 flex flex-col items-center justify-center text-[#94A3B8]">
                 <div className="text-5xl mb-4">🛏️</div>
                 <div className="text-[14px] font-medium text-gray-700 mb-1">No Recent Admissions</div>
                 <div className="text-[12.5px]">Patients admitted in the last 24 hours will appear here.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
