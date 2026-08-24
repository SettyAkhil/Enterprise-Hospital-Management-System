import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './icons';

export default function ClinicalSummaries() {
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const generateSummary = async () => {
    if (!file) {
      setError("Please select a patient record PDF to summarize.");
      return;
    }

    setGenerating(true);
    setSummary(null);
    setError(null);
    setJobId(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://localhost:8000/api/v1/summarizer/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.job_id) {
        setJobId(data.job_id);
        startPolling(data.job_id);
      } else {
        throw new Error("No job_id returned from upload");
      }
    } catch (err: any) {
      console.error(err);
      setError(`Failed to connect to local Summarizer API. Is the backend running on port 8000?`);
      setGenerating(false);
    }
  };

  const startPolling = (currentJobId: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/summarizer/job/${currentJobId}`);
        if (!res.ok) throw new Error("Failed to check job status");
        
        const data = await res.json();
        if (data.status === 'COMPLETED') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          fetchResult(currentJobId);
        } else if (data.status === 'FAILED') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setError(`Summarization failed: ${data.error_message || 'Unknown error'}`);
          setGenerating(false);
        }
      } catch (err: any) {
        console.error("Polling error", err);
      }
    }, 2000);
  };

  const fetchResult = async (currentJobId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/summarizer/job/${currentJobId}/result`);
      if (!res.ok) throw new Error("Failed to fetch result");
      const data = await res.json();
      setSummary(data.summary_md);
      setGenerating(false);
    } catch (err: any) {
      setError("Failed to fetch summarization results.");
      setGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Automated Clinical Summarization</h1>
          <p className="text-[12.5px] text-[#64748B]">Generate structured summaries from authorized EMR documents.</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex gap-6">
        
        {/* Left Panel: Configuration */}
        <div className="w-80 bg-white border border-[#DDE2EC] rounded-xl flex flex-col flex-shrink-0 shadow-sm">
          <div className="p-4 border-b border-[#DDE2EC]">
            <h2 className="text-[14px] font-semibold text-gray-900">Summary Parameters</h2>
          </div>
          <div className="p-4 space-y-5 flex-1 overflow-auto">

            {error && (
               <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] px-3 py-2 rounded flex flex-col gap-1 text-[11.5px]">
                 <div className="flex items-center gap-1 font-bold"><Icon.Alert /> Error</div>
                 {error}
               </div>
            )}

            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-2">Upload Patient Record (PDF)</label>
              <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-[#CBD5E1] rounded-lg p-4 bg-[#F8FAFC] hover:border-[#1B4FD8] transition-colors">
                <Icon.Download />
                <span className="text-[12px] text-gray-700 mt-2 font-medium text-center">
                   {file ? file.name : 'Select PDF to summarize'}
                </span>
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
              </label>
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Summary Type</label>
              <select className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]">
                <option>Discharge Summary</option>
                <option>Transfer Note</option>
                <option>Outpatient Consult Follow-up</option>
                <option>Pre-Op Clearance</option>
              </select>
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-2">Time Range (History)</label>
              <div className="space-y-2">
                {['Current Admission Only', 'Past 3 Months', 'Past Year', 'Full Available History'].map((opt, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="time" defaultChecked={i === 0} className="text-[#1B4FD8]" />
                    <span className="text-[12.5px] text-gray-800">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

             <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-2">Include Sections</label>
              <div className="space-y-2">
                {['Chief Complaint', 'History of Present Illness', 'Medication History', 'Investigations', 'Treatment Course'].map((opt, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="text-[#1B4FD8] rounded-sm" />
                    <span className="text-[12.5px] text-gray-800">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-[#DDE2EC] bg-[#F8FAFC]">
             <button 
              onClick={generateSummary}
              disabled={generating}
              className="w-full h-10 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[13px] font-medium rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icon.TrendUp />}
              {generating ? 'Generating...' : 'Generate Summary'}
            </button>
          </div>
        </div>

        {/* Right Panel: Output */}
        <div className="flex-1 bg-white border border-[#DDE2EC] rounded-xl flex flex-col shadow-sm">
          {!summary && !generating && (
            <div className="flex-1 flex flex-col items-center justify-center text-[#94A3B8]">
               <div className="w-16 h-16 bg-[#F1F5F9] rounded-full flex items-center justify-center mb-4">
                 <Icon.Reports />
               </div>
               <p className="text-[14px]">Upload a patient PDF and click generate to create an AI summary.</p>
            </div>
          )}

          {generating && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#1B4FD8] rounded-full animate-spin mb-4"></div>
              <div className="text-[14px] font-semibold text-gray-900 mb-1">Synthesizing Clinical Records...</div>
              <div className="text-[12.5px] text-[#64748B]">Reading uploaded document chunks (Job ID: {jobId || '...'})</div>
            </div>
          )}

          {summary && !generating && (
            <>
              <div className="p-4 border-b border-[#DDE2EC] flex justify-between items-center bg-[#F8FAFC]">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-800">
                  <Icon.Cmd /> Generated Draft (Discharge Summary)
                </div>
                <div className="flex gap-2">
                  <a href={`http://localhost:8000/api/v1/summarizer/job/${jobId}/export?format=pdf`} download className="px-3 py-1.5 text-[11.5px] font-medium text-[#1B4FD8] bg-[#EFF6FF] border border-[#BFDBFE] rounded hover:bg-[#DBEAFE] flex items-center gap-1.5">
                    <Icon.Download /> Download PDF
                  </a>
                  <button className="px-3 py-1.5 text-[11.5px] font-medium text-white bg-[#15803D] border border-[#166534] rounded hover:bg-[#166534]">Approve to EMR</button>
                </div>
              </div>
              <div className="flex-1 p-8 overflow-auto font-serif text-[14px] leading-relaxed text-gray-900">
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="bg-[#FEF9C3] border-l-4 border-[#EAB308] p-3 text-[12px] font-sans text-gray-800 mb-6">
                    <strong>AI Generated Draft:</strong> This summary was generated from available source information. Do not treat as verified clinical truth without review.
                  </div>

                  <textarea 
                      readOnly
                      value={summary || ''} 
                      className="w-full h-[600px] border-none bg-transparent font-serif text-[14px] leading-relaxed focus:outline-none resize-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
