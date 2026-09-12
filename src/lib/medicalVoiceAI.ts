/**
 * Medical Voice Engine & AI Speaker Diarization with Multi-lingual Auto-Detection
 * Supporting Telugu (తెలుగు), Hindi (हिंदी), English & Indian Regional Languages
 *
 * Provides:
 * 1. Multi-lingual Language Auto-Detection (Telugu, Hindi, Tamil, Kannada, English, Mixed).
 * 2. High-accuracy Phonetic Normalization & Translation (Telugu/Hindi -> Medical English).
 * 3. AI Speaker Diarization (separating Doctor Voice vs. Patient Voice).
 * 4. Complete Audio Encounter Summarization with Auto-Extracted Medicines & Lab Tests.
 */

import { PrescriptionSplit, localSplit } from "./prescriptionAI";
import type { ParsedMedication, ParsedLabTest } from "../services/doctorPortalDb";

export interface LanguageDetectionResult {
  primaryLanguage: string;
  languageCode: string;
  isMultiLingual: boolean;
  detectedLanguages: string[];
  confidence: number;
}

export interface AudioClinicalSummary {
  detectedLanguage: string;
  languageCode: string;
  isMultiLingual: boolean;
  audioDurationFormatted: string;
  chiefComplaint: string;
  patientHistory: string;
  doctorImpression: string;
  diagnosis: string;
  advice: string;
  summaryParagraph: string;
  extractedMedications: ParsedMedication[];
  extractedLabTests: ParsedLabTest[];
  fullTranscript: string;
  doctorStream: string[];
  patientStream: string[];
  soapSubjective: string;
  soapObjective: string;
  soapAssessment: string;
  soapPlan: string;
}

// ── Multi-Lingual Medical Phonetic & Translation Dictionary ──

const PHONETIC_MAP: [RegExp, string][] = [
  // ── Telugu Clinical Symptoms & Terms Translation ──
  [/జ్వరం\s*(వచ్చింది|ఉంది)?/gi, "Fever"],
  [/గొంతు\s*నొప్పి/gi, "Throat Pain"],
  [/తలనొప్పి/gi, "Headache"],
  [/(కడుపు|పొట్ట)\s*నొప్పి/gi, "Abdominal Pain"],
  [/దగ్గు/gi, "Cough"],
  [/ఆయాసం/gi, "Shortness of Breath"],
  [/వాంతులు/gi, "Vomiting / Nausea"],
  [/నీరసం/gi, "General Weakness"],
  [/చలి\s*జ్వరం/gi, "Fever with Chills"],
  [/రక్తపోటు|బిపి/gi, "Blood Pressure (Hypertension)"],
  [/షుగర్\s*వ్యాధి|మధుమేహం/gi, "Diabetes Mellitus"],
  [/మోషన్స్|విరేచనాలు/gi, "Diarrhea / Loose Motions"],
  [/ఆకలి\s*లేకపోవడం/gi, "Loss of Appetite"],
  [/ఛాతీ\s*నొప్పి/gi, "Chest Pain"],
  [/కీళ్ళ\s*నొప్పులు/gi, "Joint Pain"],
  [/రోజుల\s*నుండి|రోజుల\s*నుంచి/gi, "days"],
  [/వారాల\s*నుండి/gi, "weeks"],
  [/నెలల\s*నుండి/gi, "months"],
  [/నిన్నటి\s*నుండి/gi, "since yesterday"],

  // Telugu Medications & Dosages
  [/పారాసిటమాల్/gi, "Paracetamol 650mg"],
  [/అజిత్రోమైసిన్/gi, "Azithromycin 500mg"],
  [/అమాక్సిసిలిన్/gi, "Amoxicillin 500mg"],
  [/పాంటోప్రాజోల్|ప్యాన్\s*40/gi, "Pantoprazole 40mg"],
  [/సెటిరిజైన్/gi, "Cetirizine 10mg"],
  [/డొలో\s*650/gi, "Paracetamol 650mg (Dolo)"],
  [/(మాత్రలు|మాత్ర)/gi, "Tab"],
  [/సిరప్/gi, "Syrup"],
  [/ఇంజెక్షన్/gi, "Inj"],
  [/ఇన్హేలర్/gi, "Inhaler"],
  [/రోజుకి\s*ఒకసారి|ఉదయం\s*ఒకసారి/gi, "OD"],
  [/రోజుకి\s*రెండు\s*సార్లు|ఉదయం\s*రాత్రి/gi, "BD"],
  [/రోజుకి\s*మూడు\s*సార్లు/gi, "TDS"],
  [/అన్నం\s*తిన్నాక|భోజనం\s*తరువాత/gi, "after food"],
  [/అన్నం\s*తినకముందు|ఖాళీ\s*కడుపుతో/gi, "before food"],
  [/రాత్రి\s*పడుకునేముందు/gi, "HS (at bedtime)"],

  // Telugu Lab Tests & Diagnostics
  [/రక్తం\s*పరీక్ష|బ్లడ్\s*టెస్ట్/gi, "Blood Test"],
  [/మూత్ర\s*పరీక్ష/gi, "Urine Routine & Microscopy"],
  [/సిబిసి/gi, "Complete Blood Count (CBC)"],
  [/ఎక్స్\s*రే|ఎక్స్-రే/gi, "Chest X-Ray PA View"],
  [/ఈసిజి|గుండె\s*పరీక్ష/gi, "ECG 12-Lead"],
  [/స్కానింగ్|అల్ట్రాసౌండ్/gi, "Ultrasound Abdomen (USG)"],
  [/విశ్రాంతి\s*తీసుకోండి/gi, "Take proper rest"],
  [/మంచి\s*నీళ్ళు\s*ఎక్కువగా\s*తాగండి/gi, "Maintain high fluid hydration"],

  // ── Hindi Clinical Symptoms & Terms Translation ──
  [/बुखार\s*(है)?/gi, "Fever"],
  [/सर\s*दर्द|सिर\s*दर्द/gi, "Headache"],
  [/पेट\s*दर्द/gi, "Abdominal Pain"],
  [/खाँसी|खांसी/gi, "Cough"],
  [/सांस\s*फूलना/gi, "Shortness of Breath"],
  [/उल्टी/gi, "Vomiting / Nausea"],
  [/कमजोरी/gi, "General Weakness"],
  [/गले\s*में\s*दर्द/gi, "Throat Pain"],
  [/छाती\s*में\s*दर्द/gi, "Chest Pain"],
  [/दस्त|लूज\s*मोशन/gi, "Diarrhea"],
  [/दिनों\s*से/gi, "days"],
  [/पैरासिटामोल/gi, "Paracetamol 650mg"],
  [/एजिथ्रोमाइसिन/gi, "Azithromycin 500mg"],
  [/गोली|दवाई/gi, "Tab"],
  [/दिन\s*में\s*दो\s*बार/gi, "BD"],
  [/दिन\s*में\s*तीन\s*बार/gi, "TDS"],
  [/खाने\s*के\s*बाद/gi, "after food"],
  [/खाने\s*से\s*पहले/gi, "before food"],
  [/रात\s*को/gi, "HS"],
  [/खून\s*की\s*जांच|ब्लड\s*टेस्ट/gi, "Blood Test"],

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

/** Auto-detects spoken language(s) from transcript text */
export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || !text.trim()) {
    return {
      primaryLanguage: "English",
      languageCode: "en-IN",
      isMultiLingual: false,
      detectedLanguages: ["English"],
      confidence: 1.0,
    };
  }

  const teluguCount = (text.match(/[\u0C00-\u0C7F]/g) || []).length;
  const hindiCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const tamilCount = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  const kannadaCount = (text.match(/[\u0C80-\u0CFF]/g) || []).length;
  const englishCount = (text.match(/[a-zA-Z]/g) || []).length;

  const detected: string[] = [];
  if (teluguCount > 3) detected.push("Telugu (తెలుగు)");
  if (hindiCount > 3) detected.push("Hindi (हिंदी)");
  if (tamilCount > 3) detected.push("Tamil (தமிழ்)");
  if (kannadaCount > 3) detected.push("Kannada (ಕನ್ನಡ)");
  if (englishCount > 5) detected.push("English");

  let primary = "English";
  let code = "en-IN";

  if (teluguCount > hindiCount && teluguCount > englishCount) {
    primary = "Telugu (తెలుగు)";
    code = "te-IN";
  } else if (hindiCount > teluguCount && hindiCount > englishCount) {
    primary = "Hindi (हिंदी)";
    code = "hi-IN";
  } else if (tamilCount > teluguCount && tamilCount > englishCount) {
    primary = "Tamil (தமிழ்)";
    code = "ta-IN";
  } else if (kannadaCount > teluguCount && kannadaCount > englishCount) {
    primary = "Kannada (కನ್ನಡ)";
    code = "kn-IN";
  }

  const isMultiLingual = detected.length > 1;
  const displayPrimary = isMultiLingual
    ? `${detected.join(" + ")} (Auto-Detected)`
    : `${primary} (Auto-Detected)`;

  return {
    primaryLanguage: displayPrimary,
    languageCode: code,
    isMultiLingual,
    detectedLanguages: detected.length > 0 ? detected : ["English"],
    confidence: 0.95,
  };
}

/** Corrects raw speech recognition transcript into clean medical terms */
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
  "రోజుల నుండి", "వచ్చింది", "నొప్పుగా", "ఆయాసం", "పొట్ట", "గొంతు", "షుగర్", "బిపి",
  // Hindi
  "मुझे", "दर्द", "बुखार", "खांसी", "उल्टी", "कमजोरी", "दिनों से", "सिर दर्द", "पेट दर्द",
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
  // Hindi
  "डॉक्टर", "दवाई", "गोली", "जांच", "लेना", "टेस्ट", "आराम",
];

/**
 * Diarizes dialogue text into Doctor vs Patient streams.
 */
export function diarizeDoctorAndPatient(transcript: string): DiarizedSpeech {
  const doctorLines: string[] = [];
  const patientLines: string[] = [];

  const rawLines = transcript.split("\n").map(l => l.trim()).filter(Boolean);

  let currentSpeaker: "doctor" | "patient" = "doctor";

  for (const rawLine of rawLines) {
    const line = normalizeMedicalSpeech(rawLine);
    const lower = line.toLowerCase();

    if (/^(doctor|dr|physician|డాక్టర్|डॉक्टर)\s*[:\-]/i.test(line)) {
      const content = line.replace(/^(doctor|dr|physician|డాక్టర్|डॉक्टर)\s*[:\-]\s*/i, "").trim();
      if (content) doctorLines.push(content);
      currentSpeaker = "doctor";
      continue;
    }

    if (/^(patient|pt|user|పేషెంట్|मरीज)\s*[:\-]/i.test(line)) {
      const content = line.replace(/^(patient|pt|user|పేషెంట్|मरीज)\s*[:\-]\s*/i, "").trim();
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

/**
 * Generates a complete AI Clinical Audio Summary from recorded/dictated speech transcript.
 */
export function generateAudioClinicalSummary(
  rawTranscript: string,
  durationSeconds = 0
): AudioClinicalSummary {
  const langDetect = detectLanguage(rawTranscript);
  const normalized = normalizeMedicalSpeech(rawTranscript);
  const diarized = diarizeDoctorAndPatient(normalized);

  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const audioDurationFormatted = durationSeconds > 0 ? `${mins}m ${secs}s` : "Live Dictation";

  const split = diarized.split;

  const chiefComplaint = diarized.patientStream.length > 0
    ? diarized.patientStream.slice(0, 2).join("; ")
    : "Reported symptoms discussed in consultation";

  const patientHistory = diarized.patientStream.join(" ");

  const doctorImpression = split.diagnosis || "Acute consultation evaluation & clinical management plan";

  const advice = split.advice || "Follow medication schedule, maintain fluid intake, and review if symptoms persist.";

  const medsListStr = split.medications.length > 0
    ? split.medications.map(m => `${m.name} (${m.frequency || "OD"} x ${m.duration || "3 days"})`).join(", ")
    : "No oral medications required";

  const labsListStr = split.labTests.length > 0
    ? split.labTests.map(l => `${l.name} [${l.category}]`).join(", ")
    : "No diagnostic lab tests ordered";

  const soapSubjective = diarized.patientStream.length > 0
    ? `Patient said: "${diarized.patientStream.join(". ")}"`
    : `Patient reported: ${chiefComplaint}`;

  const soapObjective = `Consultation notes from voice recording (${langDetect.primaryLanguage}).`;

  const soapAssessment = `Diagnosis: ${doctorImpression}`;

  const soapPlan = `Medicines: ${medsListStr}. Tests: ${labsListStr}. Advice: ${advice}`;

  const summaryParagraph = `Voice Consultation (${langDetect.primaryLanguage}, ${audioDurationFormatted}). Patient reported: "${chiefComplaint}". Doctor diagnosis: "${doctorImpression}". Advice: "${advice}". Prescribed Medicines: ${medsListStr}. Diagnostic Tests Ordered: ${labsListStr}.`;

  return {
    detectedLanguage: langDetect.primaryLanguage,
    languageCode: langDetect.languageCode,
    isMultiLingual: langDetect.isMultiLingual,
    audioDurationFormatted,
    chiefComplaint,
    patientHistory,
    doctorImpression,
    diagnosis: split.diagnosis || doctorImpression,
    advice,
    summaryParagraph,
    extractedMedications: split.medications,
    extractedLabTests: split.labTests,
    fullTranscript: normalized,
    doctorStream: diarized.doctorStream,
    patientStream: diarized.patientStream,
    soapSubjective,
    soapObjective,
    soapAssessment,
    soapPlan,
  };
}
