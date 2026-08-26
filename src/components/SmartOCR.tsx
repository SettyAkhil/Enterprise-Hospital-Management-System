import { useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import DocumentUploadDropzone from "../components/DocumentUploadDropzone";
import MarkdownReport from "../components/MarkdownReport";
import {
  Badge,
  Input,
  Modal,
  Select,
  ConfirmDialog,
} from "../components/ui";
import { Btn, Card, Table, TR, TD, StatusBadge } from "../components/shared";
import {
  API_BASE,
  SUPPORTED_DOCUMENT_ACCEPT,
  SUPPORTED_DOCUMENT_EXTENSIONS,
} from "../lib/constants";
import { apiFetch, reportError, withAuthHeaders } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { Notice } from "../types";

type Props = {
  setNotice: Dispatch<SetStateAction<Notice | null>>;
};

type OcrJob = {
  job_id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  error_message?: string | null;
};

type OcrJobResult = {
  filename: string;
  combined_markdown: string;
  entities: unknown[];
  confidence_score: number | null;
};

type VaultDoc = {
  id: number;
  filename: string;
  doc_category: string | null;
  confidence_score: number | null;
  extraction_date: string | null;
};

type VaultDocDetail = {
  id: number;
  markdown: string;
};

type KbDoc = {
  doc_id: number;
  filename: string;
  category: string | null;
  chunk_count: number;
};

type ChatCitation = {
  doc_id: number;
  filename: string;
  page_label?: string | null;
  snippet?: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
};

const EXPORT_FORMATS: { value: string; label: string }[] = [
  { value: "md", label: "Markdown" },
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Word" },
  { value: "xlsx", label: "Excel" },
];

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Icon({
  name,
  size = 18,
}: {
  name: "upload" | "folder" | "chat" | "file" | "check" | "clock" | "alert" | "trash" | "refresh" | "flask";
  size?: number;
}) {
  const paths: Record<string, ReactNode> = {
    upload: (
      <>
        <path d="M12 16V4M12 4l-4 4M12 4l4 4" {...STROKE} />
        <path
          d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16"
          {...STROKE}
        />
      </>
    ),
    folder: (
      <>
        <path
          d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l1.6 2H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z"
          {...STROKE}
        />
      </>
    ),
    chat: (
      <>
        <path
          d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3H5.5A1.5 1.5 0 0 1 4 14.5Z"
          {...STROKE}
        />
      </>
    ),
    file: (
      <>
        <path
          d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z"
          {...STROKE}
        />
        <path d="M14 3.5V7a1 1 0 0 0 1 1h3.5" {...STROKE} />
      </>
    ),
    check: <path d="M5 12.5l4.5 4.5L19 7" {...STROKE} />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8" {...STROKE} />
        <path d="M12 8v4l3 2" {...STROKE} />
      </>
    ),
    alert: (
      <>
        <path d="M12 8.5v4.2" {...STROKE} />
        <path
          d="M10.3 4.3 2.9 17.5A1.8 1.8 0 0 0 4.5 20h15a1.8 1.8 0 0 0 1.6-2.5L13.7 4.3a1.8 1.8 0 0 0-3.4 0Z"
          {...STROKE}
        />
        <circle cx="12" cy="16.3" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
    trash: <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...STROKE} />,
    refresh: <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8m0 0h4m-4 0v4M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16m0 0h-4m4 0v-4" {...STROKE} />,
    flask: <path d="M10 2v7.5M10 2H8M10 2h2M14 2H10M8 2h2M6 21h12M12 21V9.5M12 9.5 7.6 2.5H16.4L12 9.5Z" {...STROKE} />
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function confidenceVariant(
  score: number | null,
): "default" | "secondary" | "destructive" {
  if (score == null) return "secondary";
  if (score >= 90) return "default";
  if (score >= 70) return "secondary";
  return "destructive";
}

function jobStatusMeta(status: OcrJob["status"]): {
  label: string;
  variant: "default" | "secondary" | "destructive";
  icon: "clock" | "check" | "alert";
} {
  switch (status) {
    case "COMPLETED":
      return { label: "Completed", variant: "default", icon: "check" };
    case "FAILED":
      return { label: "Failed", variant: "destructive", icon: "alert" };
    case "PROCESSING":
      return { label: "Processing", variant: "secondary", icon: "clock" };
    default:
      return { label: "Queued", variant: "secondary", icon: "clock" };
  }
}

function downloadExport(path: string) {
  window.open(`${API_BASE}${path}`, "_blank", "noopener,noreferrer");
}

function ProgressBar({ value, tone = "#1B4FD8" }: { value: number; tone?: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-[#EEF2FA] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(4, value))}%`, backgroundColor: tone }}
      />
    </div>
  );
}

function ConfidenceRing({ score }: { score: number }) {
  const tone = score >= 90 ? "#16A34A" : score >= 70 ? "#D97706" : "#DC2626";
  const circumference = 2 * Math.PI * 26;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg viewBox="0 0 60 60" className="w-16 h-16 -rotate-90">
        <circle cx="30" cy="30" r="26" fill="none" stroke="#EEF2FA" strokeWidth="6" />
        <circle
          cx="30"
          cy="30"
          r="26"
          fill="none"
          stroke={tone}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-gray-800">
        {Math.round(score)}%
      </span>
    </div>
  );
}

const TABS: { id: "upload" | "vault" | "chat"; label: string; icon: "upload" | "folder" | "chat" }[] = [
  { id: "upload", label: "Scan Document", icon: "upload" },
  { id: "vault", label: "Document Vault", icon: "folder" },
  { id: "chat", label: "Ask Your Documents", icon: "chat" },
];

const EXPORT_META: Record<string, { icon: string; tone: string }> = {
  md: { icon: "◆", tone: "#475569" },
  pdf: { icon: "▤", tone: "#DC2626" },
  docx: { icon: "▤", tone: "#1B4FD8" },
  xlsx: { icon: "▤", tone: "#16A34A" },
};

export default function SmartOCR() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [tab, setTab] = useState<"upload" | "vault" | "chat">("upload");

  const [blueprints, setBlueprints] = useState<string[]>(["Universal OCR (Any Text)"]);
  const [selectedBlueprint, setSelectedBlueprint] = useState("Universal OCR (Any Text)");
  const [file, setFile] = useState<File | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<OcrJob | null>(null);
  const [jobResult, setJobResult] = useState<OcrJobResult | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);

  const [vaultLoaded, setVaultLoaded] = useState(false);
  const [vaultDocs, setVaultDocs] = useState<VaultDoc[]>([]);
  const [vaultDetail, setVaultDetail] = useState<VaultDocDetail | null>(null);
  const [vaultDetailOpen, setVaultDetailOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [chatLoaded, setChatLoaded] = useState(false);
  const [kbDocs, setKbDocs] = useState<KbDoc[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ blueprints: string[] }>("/api/ocr-portal/blueprints")
      .then((data) => {
        if (data.blueprints?.length) {
          setBlueprints(data.blueprints);
          setSelectedBlueprint(data.blueprints[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile || undefined);
    setActiveJobId(null);
    setJobStatus(null);
    setJobResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setNotice({ type: "warning", message: "Choose a file to scan first." });
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("blueprint", selectedBlueprint);
      const response = await fetch(`${API_BASE}/api/ocr-portal/upload`, {
        method: "POST",
        headers: withAuthHeaders({}, "POST"),
        body,
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw Object.assign(new Error(data.error || "Upload failed."), {
          status: response.status,
        });
      }
      setJobResult(null);
      setJobStatus({ job_id: data.job_id, status: "PENDING", progress: 0 });
      setActiveJobId(data.job_id);
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Failed to upload document.",
      );
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!activeJobId) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await apiFetch<OcrJob>(`/api/ocr-portal/jobs/${activeJobId}`);
        if (cancelled) return;
        setJobStatus(data);
        if (data.status === "COMPLETED") {
          const result = await apiFetch<OcrJobResult>(`/api/ocr-portal/jobs/${activeJobId}/result`);
          if (!cancelled) setJobResult(result);
          return;
        }
        if (data.status === "FAILED") {
          reportError(setNotice, { message: data.error_message || "OCR failed." }, "OCR failed.");
          return;
        }
        pollTimeoutRef.current = window.setTimeout(poll, 2000);
      } catch (error) {
        if (!cancelled) reportError(setNotice, error as { message?: string; status?: number }, "Lost connection.");
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (pollTimeoutRef.current) window.clearTimeout(pollTimeoutRef.current);
    };
  }, [activeJobId]);

  const handleClear = () => {
    setFile(undefined);
    setActiveJobId(null);
    setJobStatus(null);
    setJobResult(null);
  };

  const loadVault = async () => {
    try {
      const data = await apiFetch<VaultDoc[]>("/api/ocr-portal/vault");
      setVaultDocs(data);
    } catch (error) {
      reportError(setNotice, error as { message?: string; status?: number }, "Unable to load documents.");
    }
  };

  const openVaultTab = () => {
    setTab("vault");
    if (!vaultLoaded) { setVaultLoaded(true); void loadVault(); }
  };

  const openVaultDetail = async (doc: VaultDoc) => {
    try {
      const data = await apiFetch<VaultDocDetail>(`/api/ocr-portal/vault/${doc.id}`);
      setVaultDetail(data);
      setVaultDetailOpen(true);
    } catch (error) {
      reportError(setNotice, error as { message?: string; status?: number }, "Unable to load document.");
    }
  };

  const handleDeleteConfirmed = async () => {
    if (deleteTargetId == null) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/ocr-portal/vault/${deleteTargetId}`, { method: "DELETE" });
      setVaultDocs((prev) => prev.filter((doc) => doc.id !== deleteTargetId));
      setNotice({ type: "success", message: "Document deleted." });
    } catch (error) {
      reportError(setNotice, error as { message?: string; status?: number }, "Unable to delete document.");
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const handleAddToKnowledgeBase = async (doc: VaultDoc) => {
    try {
      await apiFetch("/api/ocr-portal/assistant/ingest", {
        method: "POST",
        body: JSON.stringify({ doc_ids: [doc.id] }),
      });
      setNotice({ type: "success", message: `${doc.filename} added to KB.` });
      if (chatLoaded) void loadKb();
    } catch (error) {
      reportError(setNotice, error as { message?: string; status?: number }, "Unable to add to KB.");
    }
  };

  const loadKb = async () => {
    try {
      const data = await apiFetch<KbDoc[]>("/api/ocr-portal/assistant/kb");
      setKbDocs(data);
    } catch (error) {
      reportError(setNotice, error as { message?: string; status?: number }, "Unable to load KB.");
    }
  };

  const loadChatHistory = async () => {
    try {
      const data = await apiFetch<{ role: "user" | "assistant"; content: string }[]>("/api/ocr-portal/assistant/history");
      setChatMessages(data);
    } catch (error) {
      reportError(setNotice, error as { message?: string; status?: number }, "Unable to load chat history.");
    }
  };

  const openChatTab = () => {
    setTab("chat");
    if (!chatLoaded) { setChatLoaded(true); void loadKb(); void loadChatHistory(); }
  };

  const handleRemoveFromKb = async (doc_id: number) => {
    try {
      await apiFetch(`/api/ocr-portal/assistant/kb/${doc_id}`, { method: "DELETE" });
      setKbDocs((prev) => prev.filter((d) => d.doc_id !== doc_id));
    } catch (error) {
      reportError(setNotice, error as { message?: string; status?: number }, "Unable to remove.");
    }
  };

  const handleChatSend = async () => {
    const message = chatInput.trim();
    if (!message) return;
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const data = await apiFetch<{ role: "assistant"; content: string; citations: ChatCitation[] }>("/api/ocr-portal/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message, session_id: "default" }),
      });
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.content, citations: data.citations }]);
    } catch (error) {
      reportError(setNotice, error as { message?: string; status?: number }, "Chat error.");
      setChatMessages((prev) => prev.slice(0, -1));
      setChatInput(message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await apiFetch("/api/ocr-portal/assistant/history", { method: "DELETE" });
      setChatMessages([]);
      setNotice({ type: "success", message: "Chat cleared." });
    } catch (error) {
      reportError(setNotice, error as { message?: string; status?: number }, "Unable to clear.");
    }
  };

  const statusMeta = jobStatus ? jobStatusMeta(jobStatus.status) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5] p-6">
      {notice && (
        <div className={`p-4 mb-4 rounded-xl border flex items-center justify-between shadow-sm ${notice.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
          <span className="text-[12px] font-medium">{notice.message}</span>
          <button className="text-[11px] font-semibold underline hover:opacity-70" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1B4FD8] to-[#3B82F6] flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Icon name="flask" size={20} />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-gray-900 leading-tight">Smart OCR AI</h1>
            <p className="text-[12px] text-[#64748B]">Extract structured data from documents and chat with your archive</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl self-start md:self-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => (t.id === "vault" ? openVaultTab() : t.id === "chat" ? openChatTab() : setTab("upload"))}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all whitespace-nowrap ${
                tab === t.id ? "bg-white text-[#1B4FD8] shadow-sm" : "text-[#64748B] hover:text-gray-800"
              }`}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h2 className="text-[17px] font-bold text-gray-900 mb-1">Upload &amp; Scan</h2>
            <div className="flex flex-col gap-4 mt-2">
              <div className="text-[12px] text-[#64748B] -mt-2">
                Choose a blueprint that best matches your document, then drop it below to extract structured data.
              </div>
              <label className="flex flex-col gap-1.5 mt-2">
                <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide">Extraction Blueprint</span>
                <Select value={selectedBlueprint} onChange={(e) => setSelectedBlueprint(e.target.value)}>
                  {blueprints.map((bp) => <option key={bp} value={bp}>{bp}</option>)}
                </Select>
              </label>
              <div className="p-1 rounded-xl bg-gray-50/50 border border-dashed border-gray-200 mt-2">
                <DocumentUploadDropzone
                  accept={SUPPORTED_DOCUMENT_ACCEPT}
                  file={file}
                  helperText={`Supported: ${SUPPORTED_DOCUMENT_EXTENSIONS.join(", ")}`}
                  disabled={uploading}
                  onFileSelect={handleFileSelect}
                />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => void handleUpload()}
                  disabled={!file || uploading}
                  className="flex-1 bg-gradient-to-r from-[#1B4FD8] to-[#3B82F6] text-white font-semibold py-3 rounded-xl hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 text-[14px]"
                >
                  <Icon name="upload" size={16} />
                  {uploading ? "Uploading..." : "Scan Document"}
                </button>
                {(file || jobStatus) && (
                  <button onClick={handleClear} className="px-5 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col">
            <h2 className="text-[17px] font-bold text-gray-900 mb-4">Processing Status</h2>
            {!jobStatus && (
              <div className="flex-1 flex flex-col items-center justify-center p-10 border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-[#F8FAFC] text-[#94A3B8]">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-blue-500">
                  <Icon name="flask" size={30} />
                </div>
                <p className="text-[13.5px] mt-2 font-medium text-center text-gray-500">Scan a document to see live extraction progress here.</p>
              </div>
            )}

            {jobStatus && !jobResult && (
              <div className="flex flex-col gap-5 py-4 flex-1 justify-center">
                <div className="flex items-center justify-between">
                  {statusMeta && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[12px] font-bold tracking-wide uppercase border border-blue-100">
                      <Icon name={statusMeta.icon} size={13} /> {statusMeta.label}
                    </span>
                  )}
                  <span className="text-[13px] font-bold text-gray-700">{jobStatus.progress ?? 0}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                   <div className="h-full bg-[#1B4FD8] rounded-full transition-all duration-300" style={{ width: `${jobStatus.progress ?? 8}%` }} />
                </div>
                <p className="text-[13px] text-gray-500 font-medium">
                  {jobStatus.status === "PROCESSING"
                    ? "Reading document structure and extracting fields..."
                    : "Queued — this will begin shortly."}
                </p>
                {jobStatus.status === "FAILED" && jobStatus.error_message && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl p-4 font-medium">
                    {jobStatus.error_message}
                  </div>
                )}
              </div>
            )}

            {jobResult && (
              <div className="flex flex-col gap-5 flex-1">
                <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                  <ConfidenceRing score={jobResult.confidence_score || 0} />
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-gray-900 truncate">{jobResult.filename}</p>
                    <p className="text-[12px] text-[#64748B] font-medium">Extraction confidence score</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-3">Export As</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {EXPORT_FORMATS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => downloadExport(`/api/ocr-portal/jobs/${activeJobId}/export?format=${f.value}`)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#1B4FD8] hover:text-[#1B4FD8] text-[#374151] text-[13px] font-semibold transition-all hover:shadow-sm"
                      >
                        <span style={{ color: EXPORT_META[f.value]?.tone }}>{EXPORT_META[f.value]?.icon}</span>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <h4 className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-3">Extracted Text Preview</h4>
                  <div className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5 overflow-y-auto custom-scrollbar markdown-body text-[13px] shadow-inner">
                    <MarkdownReport text={jobResult.combined_markdown} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "vault" && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[17px] font-bold text-gray-900">My Documents</h2>
            <button onClick={() => void loadVault()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              <Icon name="refresh" size={14} /> Refresh Vault
            </button>
          </div>
          <div className="text-[13px] text-gray-500 mb-6">
            Everything you've previously scanned. Click a row to view the full text.
          </div>

          {vaultDocs.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-[#F8FAFC] text-gray-400">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-blue-500">
                <Icon name="folder" size={32} />
              </div>
              <p className="text-[14px] mt-2 font-medium">No documents yet. Scan one from the Scan Document tab.</p>
            </div>
          )}

          {vaultDocs.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <Table headers={["Filename", "Category", "Confidence", "Date", "Actions"]}>
                {vaultDocs.map((doc) => (
                  <TR key={doc.id}>
                    <TD>
                      <button type="button" className="text-[#1B4FD8] hover:underline flex items-center gap-3 font-semibold text-[13.5px] group" onClick={() => void openVaultDetail(doc)}>
                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                          <Icon name="file" size={16} />
                        </span>
                        {doc.filename}
                      </button>
                    </TD>
                    <TD>
                      <span className="bg-gray-50 text-gray-600 px-3 py-1 rounded-full border border-gray-200 text-[11px] font-bold uppercase tracking-wider">
                        {doc.doc_category || "Uncategorized"}
                      </span>
                    </TD>
                    <TD>
                      {doc.confidence_score != null ? (
                        <div className="flex items-center gap-3 min-w-[100px]">
                          <div className="w-16 h-2 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(4, doc.confidence_score)}%`,
                                backgroundColor:
                                  doc.confidence_score >= 90 ? "#10B981" : doc.confidence_score >= 70 ? "#F59E0B" : "#EF4444",
                              }}
                            />
                          </div>
                          <span className="text-[12px] font-bold text-gray-700">{Math.round(doc.confidence_score)}%</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[12px]">-</span>
                      )}
                    </TD>
                    <TD><span className="text-[12px] font-medium text-gray-500">{doc.extraction_date ? formatDateTime(doc.extraction_date) : "-"}</span></TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[12px] font-semibold hover:bg-blue-100 transition-colors" onClick={() => void handleAddToKnowledgeBase(doc)}>
                          Add to KB
                        </button>
                        <button className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => setDeleteTargetId(doc.id)} aria-label="Delete">
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </Table>
            </div>
          )}
        </div>
      )}

      {tab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[17px] font-bold text-gray-900">Knowledge Base</h2>
                <button onClick={() => void loadKb()} className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors uppercase tracking-wider flex items-center gap-1.5">
                  <Icon name="refresh" size={12} /> Sync
                </button>
              </div>
              <div className="text-[12px] text-gray-500">
                Documents you've explicitly added to your AI's memory.
              </div>
            </div>
            {kbDocs.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-[#F8FAFC] text-gray-400">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 text-blue-500">
                  <Icon name="folder" size={24} />
                </div>
                <p className="text-[13px] mt-2 font-medium">No documents in KB.</p>
                <p className="text-[11.5px] mt-1 opacity-70 text-center">Add documents from the My Documents tab.</p>
              </div>
            )}
            {kbDocs.length > 0 && (
              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {kbDocs.map((doc) => (
                  <div key={doc.doc_id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between shadow-sm hover:border-blue-300 hover:shadow-md transition-all group cursor-default">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <Icon name="file" size={16} />
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-bold text-gray-800 truncate">{doc.filename}</span>
                        <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{doc.chunk_count} chunks</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => void handleRemoveFromKb(doc.doc_id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors p-2 rounded-lg opacity-0 group-hover:opacity-100" title="Remove from KB">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[17px] font-bold text-gray-900 mb-1">AI Document Assistant</h2>
                <div className="text-[12px] text-gray-500">
                  Ask questions about documents in your Knowledge Base.
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col min-h-[500px] bg-[#F8FAFC]/50 border border-gray-200 rounded-xl overflow-hidden mt-2 relative">
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 custom-scrollbar relative z-10">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-80">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-blue-500">
                      <Icon name="chat" size={32} />
                    </div>
                    <p className="text-[14px] font-medium mt-2">Ask a question about your documents.</p>
                    <p className="text-[12px] mt-1 opacity-70">The AI will cite its sources from your Knowledge Base.</p>
                  </div>
                )}
                {chatMessages.map((message, index) => (
                  <div key={index} className={`flex flex-col max-w-[85%] ${message.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1 ${message.role === 'user' ? 'text-blue-600' : 'text-gray-500'}`}>
                      {message.role === "user" ? "You" : "AI Assistant"}
                    </span>
                    <div className={`p-4 text-[13px] leading-relaxed shadow-sm ${message.role === 'user' ? 'bg-gradient-to-br from-[#1B4FD8] to-[#3B82F6] text-white rounded-2xl rounded-tr-sm' : 'bg-white border border-[#E2E8F0] text-gray-800 rounded-2xl rounded-tl-sm markdown-body'}`}>
                      <MarkdownReport text={message.content} />
                    </div>
                    {!!message.citations?.length && (
                      <div className="flex flex-wrap gap-2 mt-2 justify-start">
                        {message.citations.map((c, i) => (
                          <span key={i} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 flex items-center gap-1.5 shadow-sm">
                            <Icon name="file" size={12} /> {c.filename}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="self-start items-start flex flex-col max-w-[85%]">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 px-1">AI Assistant</span>
                     <div className="p-4 bg-white border border-[#E2E8F0] shadow-sm rounded-2xl rounded-tl-sm flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                       <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                       <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                     </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-white border-t border-[#E2E8F0] flex flex-col gap-3 relative z-10">
                <div className="flex gap-3">
                  <input
                    value={chatInput}
                    placeholder="Ask a question about your documents..."
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !chatLoading) {
                        event.preventDefault();
                        void handleChatSend();
                      }
                    }}
                    disabled={chatLoading}
                    className="flex-1 text-[14px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    onClick={() => void handleChatSend()}
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-[#1B4FD8] hover:bg-blue-700 text-white px-5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
                  >
                    <Icon name="chat" size={16} /> Send
                  </button>
                </div>
                <div className="flex justify-start">
                  <button 
                    className="text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50" 
                    onClick={() => void handleClearChat()} 
                    disabled={!chatMessages.length}
                  >
                    Clear Chat History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={vaultDetailOpen} onClose={() => setVaultDetailOpen(false)} title="Document View">
        <div className="p-1 max-h-[70vh] overflow-y-auto">
           {vaultDetail && <MarkdownReport text={vaultDetail.markdown} />}
        </div>
      </Modal>

      <ConfirmDialog open={deleteTargetId != null} onClose={() => setDeleteTargetId(null)} onConfirm={handleDeleteConfirmed} title="Delete" description="Are you sure?" confirmLabel="Delete" loading={deleting} />
    </div>
  );
}
