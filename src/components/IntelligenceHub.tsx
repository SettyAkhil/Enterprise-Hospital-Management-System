import React from 'react';
import { Icon } from './icons';

interface IntelligenceHubProps {
  navigate: (module: string) => void;
}

export default function IntelligenceHub({ navigate }: IntelligenceHubProps) {
  const aiModules = [
    {
      id: "ocr",
      title: "Smart OCR",
      desc: "Extract text and structured data from clinical documents, lab reports, and ID cards with high accuracy.",
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>,
      color: "from-blue-500 to-indigo-600",
      bgHover: "hover:shadow-blue-500/20",
      metrics: "99.2% Accuracy"
    },
    {
      id: "symptom_ai",
      title: "Symptom AI",
      desc: "Interactive visual body map for patient symptom logging and AI-assisted preliminary diagnostics.",
      icon: <Icon.Stethoscope />,
      color: "from-emerald-500 to-teal-600",
      bgHover: "hover:shadow-emerald-500/20",
      metrics: "Live Analysis"
    },
    {
      id: "clinical_rag",
      title: "Clinical RAG",
      desc: "Retrieve and generate answers from vast medical literature and internal hospital guidelines instantly.",
      icon: <Icon.Search />,
      color: "from-purple-500 to-fuchsia-600",
      bgHover: "hover:shadow-purple-500/20",
      metrics: "2.4M Documents Indexed"
    },
    {
      id: "clinical_summaries",
      title: "Clinical Summaries",
      desc: "Automatically generate concise discharge summaries and encounter notes from long patient histories.",
      icon: <Icon.Reports />,
      color: "from-amber-500 to-orange-600",
      bgHover: "hover:shadow-amber-500/20",
      metrics: "Saves 45m/doctor daily"
    },
    {
      id: "bulk_ai",
      title: "Bulk Patient AI",
      desc: "High-throughput asynchronous processing for migrating, indexing, or auditing thousands of records.",
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
      color: "from-rose-500 to-pink-600",
      bgHover: "hover:shadow-rose-500/20",
      metrics: "3 Active Jobs"
    },
    {
      id: "nl_filtering",
      title: "NL Patient Filtering",
      desc: "Use natural language queries to filter cohorts (e.g., 'Diabetic patients over 50 with high BP').",
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
      color: "from-cyan-500 to-blue-600",
      bgHover: "hover:shadow-cyan-500/20",
      metrics: "Instant Cohort Builder"
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Icon.FlaskConical />
            </div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              Intelligence Hub
            </h1>
          </div>
          <p className="text-gray-500 text-lg max-w-2xl">
            Command center for enterprise medical AI. Access specialized models for clinical operations, diagnostic assistance, and automated workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiModules.map((mod) => (
            <div 
              key={mod.id}
              onClick={() => navigate(mod.id)}
              className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden ${mod.bgHover}`}
            >
              {/* Decorative background glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${mod.color} opacity-5 rounded-bl-full group-hover:opacity-10 transition-opacity`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-white shadow-md`}>
                    {mod.icon}
                  </div>
                  <div className="bg-gray-50 px-3 py-1 rounded-full text-xs font-bold text-gray-500 border border-gray-100">
                    {mod.metrics}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {mod.title}
                </h3>
                
                <p className="text-sm font-medium text-gray-500 leading-relaxed flex-1">
                  {mod.desc}
                </p>
                
                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                  Launch Module 
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
