import React, { useState, useEffect } from 'react';

export default function BulkAI() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`flex-1 flex flex-col h-full bg-[#F0F2F5] p-6 lg:p-8 transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        
        {/* Left Column: Command Center & Stats */}
        <div className="lg:w-1/3 flex flex-col gap-6">
          {/* Header Card */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group flex-shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-100/40 via-purple-50/20 to-transparent rounded-bl-full opacity-60 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mb-4">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/></svg>
              </div>
              <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 mb-2">Bulk Patient AI</h1>
              <p className="text-sm font-medium text-gray-500 mb-6">Process large numbers of documents or patient records asynchronously using high-throughput background queues.</p>
              
              <button className="w-full h-[52px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-[16px] shadow-[0_4px_20px_-4px_rgba(99,102,241,0.4)] hover:shadow-[0_8px_25px_-4px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-2 group/btn">
                <svg className="transform group-hover/btn:scale-110 transition-transform" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Initialize New Batch
              </button>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            {[
              { label: "Active Jobs", val: "3", icon: <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />, color: "text-gray-900", bg: "bg-white" },
              { label: "Queue Backlog", val: "14.2k", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>, color: "text-indigo-600", bg: "bg-indigo-50/50" },
              { label: "Processed Today", val: "48.1k", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>, color: "text-emerald-600", bg: "bg-emerald-50/50" },
              { label: "Failed Items", val: "12", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>, color: "text-rose-600", bg: "bg-rose-50/50" }
            ].map((stat, i) => (
              <div key={i} className={`${stat.bg} border border-gray-100 p-5 rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col justify-between group/card hover:-translate-y-1 transition-transform duration-300`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</div>
                  <div className={`text-gray-400 group-hover/card:${stat.color} transition-colors`}>{stat.icon}</div>
                </div>
                <div className={`text-3xl font-extrabold ${stat.color} tracking-tight`}>{stat.val}</div>
              </div>
            ))}
          </div>
          
          {/* System Health */}
          <div className="bg-gray-900 rounded-[24px] p-6 shadow-xl relative overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Compute Cluster</div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
                  Online & Scaling
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current Load</div>
                <div className="text-lg font-bold text-emerald-400">42%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Jobs Grid */}
        <div className="lg:w-2/3 flex flex-col">
          <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex-1 flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-white to-gray-50/50">
              <h2 className="text-lg font-extrabold text-gray-900">Active Pipeline</h2>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold ring-1 ring-emerald-600/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Sync
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50/30">
              {[
                { id: "JOB-9482", type: "Historical OCR Extraction", desc: "Processing 2025 discharge summaries", status: "Running", progress: 68, total: "5,000", time: "2h remaining" },
                { id: "JOB-9481", type: "RAG Indexing", desc: "Updating vector embeddings for Dept 4", status: "Running", progress: 89, total: "12,400", time: "15m remaining" },
                { id: "JOB-9480", type: "Medication Reconciliation", desc: "Bulk interaction check for elderly cohort", status: "Queued", progress: 0, total: "850", time: "Waiting for workers" },
                { id: "JOB-9479", type: "Bulk Summarization", desc: "Monthly IP summaries", status: "Completed", progress: 100, total: "412", time: "Finished 2h ago" },
                { id: "JOB-9478", type: "Data Import Mapping", desc: "Legacy system migration batch 3", status: "Failed", progress: 45, total: "10,000", time: "Stopped due to schema error" },
              ].map((job, i) => (
                <div key={i} className="bg-white border border-gray-100 p-5 rounded-[16px] shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold border border-gray-100 group-hover:border-indigo-200 group-hover:text-indigo-500 transition-colors">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{job.id}</span>
                          <h3 className="text-sm font-extrabold text-gray-900">{job.type}</h3>
                        </div>
                        <p className="text-xs font-medium text-gray-500">{job.desc}</p>
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center">
                      <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                        job.status === 'Running' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20' :
                        job.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' :
                        job.status === 'Queued' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20' :
                        'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                      }`}>
                        {job.status}
                      </span>
                      <span className="text-[11px] font-bold text-gray-400 mt-2 hidden md:block">{job.time}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-6 border border-gray-100/50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-700">{job.progress}% Complete</span>
                        <span className="text-xs font-bold text-gray-400">{Math.floor(parseInt(job.total.replace(',','')) * (job.progress/100)).toLocaleString()} / {job.total} items</span>
                      </div>
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out relative ${job.status === 'Failed' ? 'bg-rose-500' : job.status === 'Completed' ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} 
                          style={{ width: `${job.progress}%` }}
                        >
                          {job.status === 'Running' && (
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:15px_15px] animate-[shimmer_1s_infinite_linear]" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
