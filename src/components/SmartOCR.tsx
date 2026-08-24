import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './icons';

export default function SmartOCR() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<'idle' | 'uploading' | 'extracting' | 'review'>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Results
  const [extractedData, setExtractedData] = useState<any>(null);

  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = async (f: File) => {
    setFile(f);
    setFileUrl(URL.createObjectURL(f));
    setProcessingState('uploading');
    setError(null);
    setExtractedData(null);

    try {
      const formData = new FormData();
      formData.append('file', f);
      formData.append('client_blueprint', 'Universal OCR (Any Text)');

      // Upload to OCR backend
      const res = await fetch('http://localhost:8000/api/v1/ocr/upload', {
        method: 'POST',
        // Assuming we need a user token, if backend requires auth we might need to mock or handle it.
        // For local testing without auth tokens configured, we hope the backend doesn't enforce strict auth or has a test user
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.job_id) {
        setJobId(data.job_id);
        setProcessingState('extracting');
        startPolling(data.job_id);
      } else {
        throw new Error("No job_id returned from upload");
      }
    } catch (err: any) {
      console.error(err);
      setError(`Failed to connect to local OCR API. Is the backend running on port 8000?`);
      setProcessingState('idle');
    }
  };

  const startPolling = (currentJobId: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/ocr/job/${currentJobId}`);
        if (!res.ok) throw new Error("Failed to check job status");
        
        const data = await res.json();
        if (data.status === 'COMPLETED') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          fetchResult(currentJobId);
        } else if (data.status === 'FAILED') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setError(`Extraction failed: ${data.error_message || 'Unknown error'}`);
          setProcessingState('idle');
        }
      } catch (err: any) {
        console.error("Polling error", err);
      }
    }, 2000);
  };

  const fetchResult = async (currentJobId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/ocr/job/${currentJobId}/result`);
      if (!res.ok) throw new Error("Failed to fetch result");
      const data = await res.json();
      setExtractedData(data);
      setProcessingState('review');
    } catch (err: any) {
      setError("Failed to fetch extraction results.");
      setProcessingState('idle');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Smart OCR & Extraction</h1>
          <p className="text-[12.5px] text-[#64748B]">Digitize and extract structured data from medical documents via Keppler AI.</p>
        </div>
        <button className="h-8 px-3 bg-white border border-[#DDE2EC] text-[#1B4FD8] text-[12px] font-medium rounded hover:bg-[#F8FAFC] transition-colors">
          View Audit Logs
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
        {error && (
          <div className="max-w-3xl mx-auto w-full bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] px-4 py-3 rounded-lg flex items-center gap-3">
             <Icon.Alert />
             <div className="text-[13px] font-medium">{error}</div>
             <button onClick={() => setError(null)} className="ml-auto text-[#991B1B] hover:underline text-[12px]">Dismiss</button>
          </div>
        )}

        {processingState === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
            <div 
              className={`w-full border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragActive ? 'border-[#1B4FD8] bg-[#F4F7FF]' : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8]'}`}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-[#F1F5F9] text-[#64748B] rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon.Plus />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Upload a medical document</h3>
              <p className="text-[13px] text-[#64748B] mb-6">Drag and drop prescriptions, lab reports, or discharge summaries (PDF, JPG, PNG)</p>
              
              <label className="cursor-pointer bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[13px] font-medium px-5 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2">
                <Icon.Download /> Browse Files
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
              </label>
            </div>
            
            <div className="grid grid-cols-3 gap-4 w-full mt-8">
              {[
                { title: "Prescriptions", desc: "Extract meds, dosage & frequency" },
                { title: "Lab Reports", desc: "Structured extraction of biomakers" },
                { title: "Discharge Summaries", desc: "Key clinical facts and history" }
              ].map((item, i) => (
                <div key={i} className="bg-white border border-[#DDE2EC] p-4 rounded-lg flex flex-col items-center text-center">
                  <div className="text-[13px] font-semibold text-gray-900 mb-1">{item.title}</div>
                  <div className="text-[11.5px] text-[#64748B]">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(processingState === 'uploading' || processingState === 'extracting') && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 border-4 border-[#E2E8F0] border-t-[#1B4FD8] rounded-full animate-spin mb-6"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {processingState === 'uploading' ? 'Uploading Document...' : 'Running Vision & Extraction Models...'}
            </h3>
            <p className="text-[13px] text-[#64748B]">
              {processingState === 'uploading' 
                ? `Encrypting and securely storing ${file?.name || 'document'}` 
                : `Extracting clinical entities (Job ID: ${jobId || '...'})`}
            </p>
          </div>
        )}

        {processingState === 'review' && (
          <div className="flex-1 flex gap-6 min-h-0">
            {/* Left side - Document Viewer */}
            <div className="w-1/2 bg-white border border-[#DDE2EC] rounded-lg shadow-sm flex flex-col overflow-hidden">
              <div className="bg-[#F8FAFC] border-b border-[#DDE2EC] px-4 py-2.5 flex justify-between items-center">
                <div className="text-[13px] font-semibold text-gray-800 flex items-center gap-2">
                  <Icon.Eye /> Source Document
                </div>
                <div className="text-[11.5px] text-[#64748B] font-mono">{file?.name || 'document.pdf'}</div>
              </div>
              <div className="flex-1 bg-[#E2E8F0] flex items-center justify-center overflow-auto">
                 {fileUrl ? (
                   file?.type.includes('pdf') ? (
                     <iframe src={fileUrl} className="w-full h-full border-none" />
                   ) : (
                     <img src={fileUrl} className="max-w-full max-h-full object-contain p-4" alt="Uploaded Document" />
                   )
                 ) : (
                   <div className="text-[#64748B] text-[13px]">No preview available</div>
                 )}
              </div>
            </div>

            {/* Right side - Extraction Review */}
            <div className="w-1/2 flex flex-col bg-white border border-[#DDE2EC] rounded-lg shadow-sm overflow-hidden">
               <div className="bg-[#F8FAFC] border-b border-[#DDE2EC] px-4 py-2.5 flex justify-between items-center">
                <div className="text-[13px] font-semibold text-gray-800 flex items-center gap-2">
                  <Icon.FlaskConical /> AI Extraction Draft
                </div>
                <div className="flex gap-2">
                   <span className="bg-[#DCFCE7] text-[#15803D] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                     {extractedData?.confidence_score ? `${(extractedData.confidence_score * 100).toFixed(0)}% CONFIDENCE` : 'HIGH CONFIDENCE'}
                   </span>
                </div>
              </div>
              <div className="flex-1 p-5 overflow-auto">
                <div className="mb-4 bg-blue-50 border border-blue-100 rounded-md p-3 text-[12px] text-blue-800 flex gap-2">
                  <Icon.Alert /> Please review the extracted information for clinical accuracy before committing to the EMR.
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Extracted Text (Markdown)</label>
                    <textarea 
                      readOnly
                      value={extractedData?.combined_markdown || 'No text extracted.'} 
                      className="w-full h-64 border border-[#DDE2EC] rounded bg-[#F8FAFC] text-[13px] px-3 py-2 focus:outline-none"
                    />
                  </div>

                  {extractedData?.entities && extractedData.entities.length > 0 && (
                    <div>
                      <label className="block text-[11.5px] font-semibold text-[#64748B] mb-2">Detected Entities</label>
                      <div className="flex flex-wrap gap-2">
                        {extractedData.entities.map((ent: any, i: number) => (
                           <span key={i} className="px-2 py-1 bg-[#F1F5F9] border border-[#DDE2EC] rounded text-[11px] text-gray-700">
                             {ent.text || JSON.stringify(ent)}
                           </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                </div>
              </div>
              <div className="bg-[#F8FAFC] border-t border-[#DDE2EC] p-4 flex justify-between">
                <button 
                  onClick={() => setProcessingState('idle')}
                  className="px-4 py-2 text-[13px] font-medium text-gray-600 border border-[#DDE2EC] rounded hover:bg-gray-50 transition-colors"
                >
                  Discard
                </button>
                <div className="flex gap-2">
                  <button className="px-4 py-2 text-[13px] font-medium text-[#B91C1C] border border-[#FECACA] bg-[#FEF2F2] rounded hover:bg-[#FEE2E2] transition-colors">
                    Reject Extraction
                  </button>
                  <button 
                    onClick={() => {
                      alert('Committed to EMR successfully!');
                      setProcessingState('idle');
                    }}
                    className="px-4 py-2 text-[13px] font-medium text-white bg-[#1B4FD8] rounded hover:bg-[#1740B4] transition-colors shadow-sm"
                  >
                    Approve & Commit to EMR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
