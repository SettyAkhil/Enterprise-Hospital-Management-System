import React, { useState } from 'react';
import { Icon } from './icons';

interface QueueManagementProps {
  onStartConsultation?: () => void;
}

export default function QueueManagement({ onStartConsultation }: QueueManagementProps) {
  const [selectedDept, setSelectedDept] = useState("Cardiology");
  
  const queueData = [
    { token: "C-OP025", umr: "UMR10001", op: "OP025", patient: "Ravi Kumar", doctor: "Dr. Rajesh Sharma", room: "Room 104", priority: "Urgent", wait: "12m", status: "IN_CONSULTATION" },
    { token: "C-OP003", umr: "UMR10002", op: "OP003", patient: "Sunita Patel", doctor: "Dr. Sarah Jenkins", room: "Room 102", priority: "Routine", wait: "25m", status: "CALLED" },
    { token: "O-OP001", umr: "UMR10048", op: "OP001", patient: "Alex Turner", doctor: "Dr. David Anderson", room: "Room 112", priority: "Routine", wait: "8m", status: "WAITING" },
    { token: "G-OP014", umr: "UMR10012", op: "OP014", patient: "Sarah Davis", doctor: "Dr. Anita Desai", room: "Room 101", priority: "Routine", wait: "15m", status: "WAITING" },
    { token: "P-OP009", umr: "UMR10034", op: "OP009", patient: "Michael Brown", doctor: "Dr. Michael Chen", room: "Room 108", priority: "Routine", wait: "-", status: "COMPLETED" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_CONSULTATION': return <span className="bg-[#DBEAFE] text-[#1E3A8A] text-[10px] font-bold px-2 py-0.5 rounded uppercase">In Consult</span>;
      case 'CALLED': return <span className="bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold px-2 py-0.5 rounded uppercase">Called</span>;
      case 'WAITING': return <span className="bg-[#F1F5F9] text-[#475569] text-[10px] font-bold px-2 py-0.5 rounded uppercase">Waiting</span>;
      case 'COMPLETED': return <span className="bg-[#DCFCE7] text-[#15803D] text-[10px] font-bold px-2 py-0.5 rounded uppercase">Completed</span>;
      case 'NO_SHOW': return <span className="bg-[#FEE2E2] text-[#991B1B] text-[10px] font-bold px-2 py-0.5 rounded uppercase">No Show</span>;
      default: return <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{status}</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Queue Management</h1>
          <p className="text-[12.5px] text-[#64748B]">Control patient movement through outpatient departments.</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8]"
          >
            <option>All Departments</option>
            <option>Cardiology</option>
            <option>Internal Medicine</option>
            <option>Orthopedics</option>
          </select>
          <button className="px-4 py-1.5 bg-[#1B4FD8] text-white text-[13px] font-medium rounded hover:bg-[#1740B4] transition-colors flex items-center gap-2">
            <Icon.Plus /> Issue Token
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex gap-6 max-w-7xl mx-auto w-full">
        {/* Left Side: Active Queue */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
              <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Waiting</div>
              <div className="text-2xl font-bold text-gray-900">14</div>
            </div>
            <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
              <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">In Consult</div>
              <div className="text-2xl font-bold text-[#1B4FD8]">3</div>
            </div>
            <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
              <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Avg Wait Time</div>
              <div className="text-2xl font-bold text-gray-900">24m</div>
            </div>
            <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
              <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Completed</div>
              <div className="text-2xl font-bold text-[#15803D]">42</div>
            </div>
          </div>

          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <h2 className="text-[14px] font-semibold text-gray-900">Current Queue — {selectedDept}</h2>
              <div className="relative">
                <Icon.Search />
                <input placeholder="Search token or patient..." className="pl-8 pr-3 py-1 text-[12px] border border-[#DDE2EC] rounded bg-white focus:outline-none focus:border-[#1B4FD8]" />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"><Icon.Search /></span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-[#DDE2EC] sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Token</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Doctor</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Priority</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Wait</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {queueData.map((row, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC]">
                      <td className="px-5 py-3 text-[13px] font-bold text-gray-900">{row.token}</td>
                      <td className="px-5 py-3 text-[13px] font-medium text-gray-800">{row.patient}</td>
                      <td className="px-5 py-3 text-[12.5px] text-gray-600">{row.doctor}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[11.5px] flex items-center gap-1 ${row.priority === 'Urgent' ? 'text-[#DC2626] font-semibold' : 'text-gray-600'}`}>
                          {row.priority === 'Urgent' && <Icon.Alert />} {row.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12.5px] text-gray-600">{row.wait}</td>
                      <td className="px-5 py-3">{getStatusBadge(row.status)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {row.status === 'WAITING' && (
                            <button
                              onClick={onStartConsultation}
                              className="text-[11px] font-semibold text-white bg-[#1B4FD8] hover:bg-[#1740B4] px-2.5 py-1 rounded shadow-xs"
                            >
                              Call ➔
                            </button>
                          )}
                          {row.status === 'CALLED' && (
                            <button
                              onClick={onStartConsultation}
                              className="text-[11px] font-semibold text-white bg-[#D97706] hover:bg-[#B45309] px-2.5 py-1 rounded shadow-xs"
                            >
                              Consult ➔
                            </button>
                          )}
                          {row.status === 'IN_CONSULTATION' && (
                            <button
                              onClick={onStartConsultation}
                              className="text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-2.5 py-1 rounded"
                            >
                              Active ➔
                            </button>
                          )}
                          {row.status === 'COMPLETED' && (
                            <span className="text-[11px] text-gray-400 font-mono">Done</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Displays / Kiosk View */}
        <div className="w-80 flex flex-col gap-6">
          <div className="bg-[#0F172A] rounded-xl shadow-xl overflow-hidden flex flex-col">
             <div className="bg-[#1E293B] p-3 text-center border-b border-white/10">
               <h3 className="text-white text-[13px] font-semibold tracking-widest uppercase">Waiting Room Display</h3>
             </div>
             <div className="p-6 text-center text-white">
                <div className="text-[12px] text-[#94A3B8] uppercase tracking-wider mb-2">Now Calling</div>
                <div className="text-5xl font-bold text-[#38BDF8] mb-2">C-105</div>
                <div className="text-[15px] font-medium text-white mb-6">Proceed to Room 3</div>
                
                <div className="border-t border-white/10 pt-6">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-[#94A3B8] text-[12px]">C-104</span>
                     <span className="text-white text-[12px] font-medium">Room 2</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-[#94A3B8] text-[12px]">O-042</span>
                     <span className="text-white text-[12px] font-medium">Room 5</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm p-4">
             <h3 className="text-[13px] font-semibold text-gray-900 mb-3">Quick Actions</h3>
             <div className="space-y-2">
               <button className="w-full text-left px-3 py-2 text-[12.5px] text-gray-700 hover:bg-[#F8FAFC] border border-[#DDE2EC] rounded flex items-center gap-2">
                 <Icon.Refresh /> Transfer Patient
               </button>
               <button className="w-full text-left px-3 py-2 text-[12.5px] text-gray-700 hover:bg-[#F8FAFC] border border-[#DDE2EC] rounded flex items-center gap-2">
                 <Icon.Alert /> Mark No-Show
               </button>
               <button className="w-full text-left px-3 py-2 text-[12.5px] text-gray-700 hover:bg-[#F8FAFC] border border-[#DDE2EC] rounded flex items-center gap-2">
                 <Icon.Cmd /> Broadcast Announcement
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
