// Points at the ER/Bed Management backend started via `python backend/app.py`
// (see backend/README section of the integration report) -- same
// hardcoded-localhost:8000 convention already used by SmartOCR.tsx/
// SymptomAI.tsx/ClinicalSummaries.tsx elsewhere in this app.
// Relative (same-origin) so requests go through Vite's dev proxy (see
// vite.config.ts) to the Keppler backend -- this way only the frontend's own
// port needs to be reachable (e.g. through an SSH tunnel), never a second one.
export const API_BASE = "";
export const SYMPTOM_API_BASE = API_BASE;

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

export const SUPPORTED_DOCUMENT_ACCEPT = SUPPORTED_DOCUMENT_EXTENSIONS.map(
  (ext) => `.${ext}`,
).join(",");
