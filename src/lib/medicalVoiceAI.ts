/**
 * Medical Voice Engine & AI Speaker Diarization with Telugu Language Support
 *
 * Provides:
 * 1. High-accuracy Telugu & English medical term phonetic normalization.
 * 2. Multi-lingual AI Speaker Diarization (separating Doctor Voice vs. Patient Voice in Telugu & English).
 * 3. Structured parsing into Doctor Notes, Patient Advice/Complaints, Pharmacy Meds, and Lab Tests.
 */

import { PrescriptionSplit, localSplit } from "./prescriptionAI";

// ── Medical Phonetic Dictionary & Telugu Translation Normalization ──

const PHONETIC_MAP: [RegExp, string][] = [
  // Telugu Clinical & Symptom Mappings
  [/జ్వరం/gi, "Fever"],
  [/గొంతు\s*నొప్పి/gi, "Throat Pain"],
  [/తలనొప్పి/gi, "Headache"],
  [/(కడుపు|పొట్ట)\s*నొప్పి/gi, "Abdominal Pain"],
  [/దగ్గు/gi, "Cough"],
  [/ఆయాసం/gi, "Shortness of Breath"],
  [/వాంతులు/gi, "Vomiting / Nausea"],
  [/నీరసం/gi, "General Weakness"],
  [/రోజుల\s*నుండి/gi, "days"],
  [/పారాసిటమాల్/gi, "Paracetamol 650mg"],
  [/అజిత్రోమైసిన్/gi, "Azithromycin 500mg"],
  [/(మాత్రలు|మాత్ర)/gi, "Tab"],
  [/సిబిసి/gi, "Complete Blood Count (CBC)"],
  [/ఎక్స్\s*రే|ఎక్స్-రే/gi, "Chest X-Ray PA View"],
  [/విశ్రాంతి\s*తీసుకోండి/gi, "Take proper rest"],
  [/మంచి\s*నీళ్ళు\s*తాగండి/gi, "Maintain high fluid hydration"],

  // Common Medication Names Phonetic Corrections
  [/\b(para\s*citacol|para\s*cetamol|crocin|calpol|p\s*650)\b/gi, "Paracetamol"],
  [/\b(azithro|azithromycin|azithral|zithromax)\b/gi, "Azithromycin"],
  [/\b(amox|amoxicillin|mox|augmentin)\b/gi, "Amoxicillin"],
  [/\b(pantop|pantoprazole|pan\s*40|pantocid)\b/gi, "Pantoprazole"],
  [/\b(cetrizine|cetrizin|cetzine|ziyrtec)\b/gi, "Cetirizine"],
  [/\b(metformin|glycomet|glucophage)\b/gi, "Metformin"],
  [/\b(ondem|ondansetron|emset)\b/gi, "Ondansetron"],
  [/\b(ibuprofen|brufen|combiflam)\b/gi, "Ibuprofen"],
  [/\b(telmi|telmisartan|micardis)\b/gi, "Telmisartan"],
  [/\b(amlo|amlodipine|norvasc)\b/gi, "Amlodipine"],
  [/\b(atorva|atorvastatin|lipitor)\b/gi, "Atorvastatin"],
  [/\b(dolo|dolo\s*650)\b/gi, "Paracetamol 650mg"],
  [/\b(ors|oral\s*rehydration)\b/gi, "ORS Sachet"],
  [/\b(oflox|ofloxacin|zenflox)\b/gi, "Ofloxacin"],
  [/\b(ranitidine|aciloc)\b/gi, "Ranitidine"],

  // Frequencies & Dosages Phonetic Corrections
  [/\b(once\s*a?\s*day|once\s*daily|one\s*time\s*a?\s*day|o\s*d)\b/gi, "OD"],
  [/\b(twice\s*a?\s*day|twice\s*daily|two\s*times\s*a?\s*day|b\s*d)\b/gi, "BD"],
  [/\b(thrice\s*a?\s*day|thrice\s*daily|three\s*times\s*a?\s*day|t\s*d\s*s|t\s*i\s*d)\b/gi, "TDS"],
  [/\b(four\s*times\s*a?\s*day|q\s*i\s*d|q\s*d\s*s)\b/gi, "QID"],
  [/\b(at\s*night|at\s*bedtime|h\s*s)\b/gi, "HS"],
  [/\b(when\s*needed|as\s*needed|if\s*required|s\s*o\s*s)\b/gi, "SOS"],
  [/\b(before\s*food|before\s*meals|empty\s*stomach)\b/gi, "before food"],
  [/\b(after\s*food|after\s*meals)\b/gi, "after food"],
  [/\b(milligram|milligrams|m\s*g)\b/gi, "mg"],
  [/\b(microgram|micrograms|m\s*c\s*g)\b/gi, "mcg"],
  [/\b(gram|grams|g\s*m)\b/gi, "g"],
  [/\b(milliliter|milliliters|m\s*l)\b/gi, "ml"],
  [/\b(tablet|tablets|tab)\b/gi, "Tab"],
  [/\b(capsule|capsules|cap)\b/gi, "Cap"],
  [/\b(syrup|syp)\b/gi, "Syrup"],
  [/\b(injection|inj)\b/gi, "Inj"],

  // Laboratory & Diagnostic Phonetic Corrections
  [/\b(c\s*b\s*c|see\s*bee\s*see|complete\s*blood|blood\s*count)\b/gi, "Complete Blood Count (CBC)"],
  [/\b(h\s*b\s*a\s*1\s*c|hba1c|glycated\s*hemoglobin)\b/gi, "HbA1c"],
  [/\b(l\s*f\s*t|liver\s*function)\b/gi, "Liver Function Test (LFT)"],
  [/\b(k\s*f\s*t|r\s*f\s*t|kidney\s*function|renal\s*function)\b/gi, "Kidney Function Test (KFT)"],
  [/\b(e\s*c\s*g|electrocardiogram)\b/gi, "ECG 12-Lead"],
  [/\b(chest\s*x\s*ray|chest\s*xray|xray\s*chest)\b/gi, "Chest X-Ray PA View"],
  [/\b(u\s*s\s*g|ultrasound|sonography)\b/gi, "Ultrasound Abdomen"],
  [/\b(lipid\s*profile|cholesterol\s*test)\b/gi, "Lipid Profile"],
  [/\b(fasting\s*sugar|f\s*b\s*s)\b/gi, "Fasting Blood Sugar (FBS)"],
  [/\b(post\s*meal\s*sugar|p\s*p\s*b\s*s)\b/gi, "Postprandial Blood Sugar (PPBS)"],
  [/\b(thyroid|t\s*s\s*h|t3\s*t4)\b/gi, "Thyroid Profile (TSH)"],
  [/\b(urine\s*routine|urine\s*test)\b/gi, "Urine Routine & Microscopy"],
  [/\b(stool\s*routine|stool\s*test)\b/gi, "Stool Routine & Microscopy"],
];

/** Corrects raw browser speech recognition transcript into clean medical terms */
export function normalizeMedicalSpeech(rawText: string): string {
  if (!rawText) return "";
  let text = rawText;
  for (const [regex, replacement] of PHONETIC_MAP) {
    text = text.replace(regex, replacement);
  }
  return text;
}

// ── AI Speaker Diarization (Doctor Voice vs Patient Voice) ─────────

export interface DiarizedSpeech {
  doctorStream: string[];
  patientStream: string[];
  fullTranscript: string;
  split: PrescriptionSplit;
}

const PATIENT_SYMPTOM_INDICATORS = [
  // English
  "i have", "i feel", "suffering from", "pain", "fever", "headache", "vomiting",
  "nausea", "cough", "coughing", "chest pain", "stomach pain", "dizziness",
  "weakness", "tired", "throat pain", "diarrhea", "loose motion", "since", "days",
  "weeks", "months", "started yesterday", "my head", "my leg", "my arm", "my stomach",
  // Telugu
  "నాకు", "ఉంది", "నొప్పి", "జ్వరం", "దగ్గు", "వాంతులు", "నీరసం", "తలనొప్పి", "బాధపడుతున్నాను",
  "రోజుల నుండి", "వచ్చింది", "నొప్పుగా", "ఆయాసం", "పొట్ట", "గొంతు",
];

const DOCTOR_DIRECTIVE_INDICATORS = [
  // English
  "diagnosis", "impression", "prescribing", "take", "tab", "tablet", "cap",
  "injection", "syrup", "daily", "after food", "before food", "test", "cbc",
  "x-ray", "xray", "ultrasound", "ecg", "advice", "follow up", "rest", "saline",
  "steam", "drink water", "come back", "review",
  // Telugu
  "డాక్టర్", "మందులు", "మాత్రలు", "వేసుకోండి", "పరీక్షలు", "చేయించండి", "పారాసిటమాల్",
  "ఎక్స్ రే", "సిబిసి", "విశ్రాంతి", "తాగండి", "వాడండి", "రోజుకి",
];

/**
 * Diarizes dialogue text into Doctor vs Patient streams.
 * If line explicitly starts with "Doctor:" or "Patient:", respects tags.
 * Otherwise uses AI keyword heuristics to categorize each speaker turn.
 */
export function diarizeDoctorAndPatient(transcript: string): DiarizedSpeech {
  const doctorLines: string[] = [];
  const patientLines: string[] = [];

  const rawLines = transcript.split("\n").map(l => l.trim()).filter(Boolean);

  let currentSpeaker: "doctor" | "patient" = "doctor";

  for (const rawLine of rawLines) {
    const line = normalizeMedicalSpeech(rawLine);
    const lower = line.toLowerCase();

    if (/^(doctor|dr|physician|డాక్టర్)\s*[:\-]/i.test(line)) {
      const content = line.replace(/^(doctor|dr|physician|డాక్టర్)\s*[:\-]\s*/i, "").trim();
      if (content) doctorLines.push(content);
      currentSpeaker = "doctor";
      continue;
    }

    if (/^(patient|pt|user|పేషెంట్)\s*[:\-]/i.test(line)) {
      const content = line.replace(/^(patient|pt|user|పేషెంట్)\s*[:\-]\s*/i, "").trim();
      if (content) patientLines.push(content);
      currentSpeaker = "patient";
      continue;
    }

    // Heuristic scoring for un-tagged audio streams
    const patientScore = PATIENT_SYMPTOM_INDICATORS.reduce(
      (acc, kw) => (lower.includes(kw.toLowerCase()) ? acc + 1 : acc),
      0
    );
    const doctorScore = DOCTOR_DIRECTIVE_INDICATORS.reduce(
      (acc, kw) => (lower.includes(kw.toLowerCase()) ? acc + 1 : acc),
      0
    );

    if (patientScore > doctorScore && patientScore > 0) {
      patientLines.push(line);
      currentSpeaker = "patient";
    } else if (doctorScore > 0) {
      doctorLines.push(line);
      currentSpeaker = "doctor";
    } else {
      // Continuation of active speaker turn
      if (currentSpeaker === "patient") {
        patientLines.push(line);
      } else {
        doctorLines.push(line);
      }
    }
  }

  const combinedText = [
    patientLines.length > 0 ? `Patient Advice: ${patientLines.join(". ")}` : "",
    doctorLines.join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  const split = localSplit(combinedText);
  if (patientLines.length > 0 && !split.advice) {
    split.advice = `Patient reported symptoms: ${patientLines.join("; ")}`;
  }

  return {
    doctorStream: doctorLines,
    patientStream: patientLines,
    fullTranscript: combinedText,
    split,
  };
}
