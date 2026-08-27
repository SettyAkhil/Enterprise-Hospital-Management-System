// Points at the ER/Bed Management backend started via `python backend/app.py`
// (see backend/README section of the integration report) -- same
// hardcoded-localhost:8000 convention already used by SmartOCR.tsx/
// SymptomAI.tsx/ClinicalSummaries.tsx elsewhere in this app.
export const API_BASE = "http://localhost:8010";
export const SYMPTOM_API_BASE = "http://localhost:8010";

export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "tif",
  "tiff",
  "bmp",
  "gif",
  "heic",
  "heif",
];

const SUPPORTED_DOCUMENT_EXTENSION_SET = new Set(SUPPORTED_DOCUMENT_EXTENSIONS);

export const SUPPORTED_DOCUMENT_ACCEPT = SUPPORTED_DOCUMENT_EXTENSIONS.map(
  (ext) => `.${ext}`,
).join(",");

export const isSupportedDocumentFile = (file: File) => {
  const parts = file.name.toLowerCase().split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1] : "";
  return SUPPORTED_DOCUMENT_EXTENSION_SET.has(ext);
};
