import React from 'react';
import { Icon } from './icons';

export default function DoctorWorkflow() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Doctor Workspace</h1>
          <p className="text-[12.5px] text-[#64748B]">Dr. Sarah Jenkins · Cardiology · Schedule: 09:00 - 17:00</p>
        </div>
        <div className="flex gap-2">
          <button className="h-8 px-3 bg-[#1B4FD8] text-white text-[12px] font-medium rounded hover:bg-[#1740B4] transition-colors flex items-center gap-2">
            <Icon.Stethoscope /> Call Next Patient
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column: My Queue & Schedule */}
        <div className="w-1/3 flex flex-col gap-6">
          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex flex-col min-h-[300px]">
            <div className="px-4 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <h2 className="text-[13px] font-semibold text-gray-900">My OP Queue</h2>
              <span className="text-[11px] font-bold bg-[#DBEAFE] text-[#1B4FD8] px-2 py-0.5 rounded">6 Waiting</span>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="divide-y divide-[#F1F5F9]">
                {[
                  { token: "C-104", name: "Maria Garcia", time: "10:15", status: "In Consult" },
                  { token: "C-105", name: "John Smith", time: "10:30", status: "Waiting" },
                  { token: "C-107", name: "Robert Lee", time: "10:45", status: "Waiting" },
                  { token: "C-110", name: "Emily Chen", time: "11:00", status: "Waiting" },
                ].map((p, i) => (
                  <div key={i} className={`p-3 flex justify-between items-center cursor-pointer ${p.status === 'In Consult' ? 'bg-[#EFF6FF] border-l-2 border-[#1B4FD8]' : 'hover:bg-[#F8FAFC]'}`}>
                    <div>
                      <div className="text-[13px] font-semibold text-gray-900">{p.name}</div>
                      <div className="text-[11.5px] text-[#64748B]">Token: {p.token} · Scheduled: {p.time}</div>
                    </div>
                    {p.status === 'In Consult' ? (
                      <span className="text-[10px] font-bold text-[#1B4FD8] uppercase">Active</span>
                    ) : (
                      <button className="text-[11px] font-medium text-[#1B4FD8] hover:underline">Call</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex flex-col flex-1">
            <div className="px-4 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC]">
              <h2 className="text-[13px] font-semibold text-gray-900">Today's Schedule</h2>
            </div>
            <div className="p-4 space-y-4">
               <div className="flex gap-3 text-[12.5px]">
                 <div className="text-[#64748B] font-mono w-12 text-right">09:00</div>
                 <div className="flex-1 bg-[#F1F5F9] rounded p-2 text-gray-700">Ward Rounds (3N)</div>
               </div>
               <div className="flex gap-3 text-[12.5px]">
                 <div className="text-[#1B4FD8] font-mono font-bold w-12 text-right">10:00</div>
                 <div className="flex-1 bg-[#DBEAFE] border border-[#BFDBFE] rounded p-2 text-[#1E3A8A] font-medium">OPD Consultations</div>
               </div>
               <div className="flex gap-3 text-[12.5px]">
                 <div className="text-[#64748B] font-mono w-12 text-right">13:00</div>
                 <div className="flex-1 bg-[#F1F5F9] rounded p-2 text-gray-700">Lunch Break</div>
               </div>
               <div className="flex gap-3 text-[12.5px]">
                 <div className="text-[#64748B] font-mono w-12 text-right">14:00</div>
                 <div className="flex-1 bg-[#FEF3C7] border border-[#FDE68A] rounded p-2 text-[#92400E]">Surgery (OR 2)</div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Patient / EMR Quick View */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white border border-[#1B4FD8] rounded-xl shadow-md overflow-hidden flex flex-col h-full">
            <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1B4FD8] text-white flex items-center justify-center font-bold text-[12px]">MG</div>
                <div>
                  <h2 className="text-[14px] font-bold text-gray-900">Maria Garcia (Active Consult)</h2>
                  <div className="text-[11.5px] text-[#64748B]">MRN: 882910 · 52 Y/O · Female · Last visit: 2 months ago</div>
                </div>
              </div>
              <button className="text-[12px] font-medium text-[#1B4FD8] hover:underline flex items-center gap-1">
                Open Full Chart <Icon.ChevronRight />
              </button>
            </div>
            
            <div className="flex-1 p-5 overflow-auto flex flex-col gap-5">
              
              <div className="grid grid-cols-2 gap-5">
                <div className="border border-[#DDE2EC] rounded-lg p-4 bg-[#FAFBFF]">
                  <h3 className="text-[12px] font-bold text-gray-900 mb-2 flex items-center gap-2"><Icon.Alert /> Chief Complaint / Triage</h3>
                  <p className="text-[13px] text-gray-800 mb-2">Patient reports occasional chest palpitations and mild shortness of breath during exertion.</p>
                  <div className="flex gap-4 text-[11.5px] text-[#64748B]">
                    <span><strong>BP:</strong> 142/90</span>
                    <span><strong>HR:</strong> 88</span>
                    <span><strong>SpO2:</strong> 98%</span>
                    <span><strong>Temp:</strong> 98.6°F</span>
                  </div>
                </div>
                
                <div className="border border-[#DDE2EC] rounded-lg p-4">
                  <h3 className="text-[12px] font-bold text-gray-900 mb-2 flex items-center gap-2"><Icon.FlaskConical /> AI Insights</h3>
                  <ul className="list-disc pl-4 text-[12.5px] text-gray-700 space-y-1">
                    <li>Patient missed refill for Metoprolol last month.</li>
                    <li>Recent lipid panel shows elevated LDL (160 mg/dL).</li>
                    <li><button className="text-[#1B4FD8] hover:underline">Ask Clinical RAG about past EKGs...</button></li>
                  </ul>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                 <h3 className="text-[12px] font-bold text-gray-900">Clinical Note (SOAP)</h3>
                 <textarea 
                   className="w-full flex-1 border border-[#DDE2EC] rounded-lg p-3 text-[13.5px] text-gray-900 focus:outline-none focus:border-[#1B4FD8] resize-none font-serif"
                   placeholder="Start typing subjective notes... Or use AI Dictation."
                   defaultValue="Subjective: Patient presents with palpitations...&#10;Objective: ...&#10;Assessment: ...&#10;Plan: ..."
                 ></textarea>
                 <div className="flex justify-between items-center mt-1">
                   <button className="text-[11.5px] font-medium text-[#1B4FD8] hover:underline flex items-center gap-1">
                     <Icon.Cmd /> Generate Note with AI
                   </button>
                   <div className="flex gap-2">
                     <button className="px-3 py-1.5 border border-[#DDE2EC] rounded text-[12px] font-medium text-gray-700 hover:bg-[#F8FAFC]">Rx Prescription</button>
                     <button className="px-3 py-1.5 border border-[#DDE2EC] rounded text-[12px] font-medium text-gray-700 hover:bg-[#F8FAFC]">Lab Orders</button>
                     <button className="px-3 py-1.5 bg-[#1B4FD8] rounded text-[12px] font-medium text-white hover:bg-[#1740B4]">Sign & Complete</button>
                   </div>
                 </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
