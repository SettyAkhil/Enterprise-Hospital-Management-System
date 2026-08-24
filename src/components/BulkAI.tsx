import React from 'react';
import { Icon } from './icons';

export default function BulkAI() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Bulk Patient AI (Background Jobs)</h1>
          <p className="text-[12.5px] text-[#64748B]">Process large numbers of documents or patient records asynchronously using Redis & Celery.</p>
        </div>
        <button className="h-8 px-3 bg-[#1B4FD8] text-white text-[12px] font-medium rounded hover:bg-[#1740B4] transition-colors flex items-center gap-2">
          <Icon.Plus /> New Bulk Job
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Active Jobs", val: "3", color: "text-[#1B4FD8]" },
            { label: "Pending Tasks (Redis Queue)", val: "14,205", color: "text-gray-900" },
            { label: "Processed Today", val: "48,192", color: "text-green-700" },
            { label: "Failed Items", val: "12", color: "text-red-600" }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
              <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.val}</div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#DDE2EC] flex justify-between items-center bg-[#F8FAFC]">
            <h2 className="text-[14px] font-semibold text-gray-900">Active & Recent Jobs</h2>
            <div className="text-[11.5px] text-[#64748B] flex items-center gap-1">
              <Icon.Refresh /> Live Updates Enabled
            </div>
          </div>
          
          <table className="w-full text-left">
            <thead className="bg-white border-b border-[#DDE2EC]">
              <tr>
                <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Job ID</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Type / Description</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Progress</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {[
                { id: "JOB-9482", type: "Historical OCR Extraction", desc: "Processing 2025 discharge summaries", status: "Running", progress: 68, total: "5,000" },
                { id: "JOB-9481", type: "RAG Indexing", desc: "Updating vector embeddings for Dept 4", status: "Running", progress: 89, total: "12,400" },
                { id: "JOB-9480", type: "Medication Reconciliation", desc: "Bulk interaction check for elderly cohort", status: "Queued", progress: 0, total: "850" },
                { id: "JOB-9479", type: "Bulk Summarization", desc: "Monthly IP summaries", status: "Completed", progress: 100, total: "412" },
                { id: "JOB-9478", type: "Data Import Mapping", desc: "Legacy system migration batch 3", status: "Failed", progress: 45, total: "10,000" },
              ].map((job, i) => (
                <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-5 py-4 text-[12.5px] font-mono text-gray-900">{job.id}</td>
                  <td className="px-5 py-4">
                    <div className="text-[13px] font-semibold text-gray-900">{job.type}</div>
                    <div className="text-[11.5px] text-[#64748B]">{job.desc}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 text-[10.5px] font-bold rounded uppercase tracking-wider ${
                      job.status === 'Running' ? 'bg-[#DBEAFE] text-[#1E3A8A]' :
                      job.status === 'Completed' ? 'bg-[#DCFCE7] text-[#15803D]' :
                      job.status === 'Queued' ? 'bg-[#FEF3C7] text-[#92400E]' :
                      'bg-[#FEE2E2] text-[#991B1B]'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3 w-48">
                      <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${job.status === 'Failed' ? 'bg-[#DC2626]' : job.status === 'Completed' ? 'bg-[#16A34A]' : 'bg-[#1B4FD8]'}`} 
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-[11.5px] text-gray-600 font-mono">{job.progress}%</span>
                    </div>
                    <div className="text-[10.5px] text-[#94A3B8] mt-1">{Math.floor(parseInt(job.total.replace(',','')) * (job.progress/100))} / {job.total} items</div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="text-[12px] font-medium text-[#1B4FD8] hover:underline">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
