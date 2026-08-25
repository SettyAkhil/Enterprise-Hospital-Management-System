import React, { useState } from "react";
import { Icon } from "./icons";
import { StatusBadge, Btn, Input } from "./shared";

interface ResearchCohortPatient {
  id: string;
  name: string;
  age: number;
  sex: string;
  primaryDx: string;
  icd10: string;
  biomarkers: string;
  medications: string[];
  trialEligibility: string;
  riskScore: number;
  admissionDate: string;
}

const RESEARCH_COHORTS: ResearchCohortPatient[] = [
  {
    id: "RES-4019",
    name: "John Smith",
    age: 41,
    sex: "M",
    primaryDx: "Type 2 Diabetes w/ Nephropathy",
    icd10: "E11.21",
    biomarkers: "HbA1c 8.4% · eGFR 58",
    medications: ["Metformin", "Empagliflozin", "Lisinopril"],
    trialEligibility: "Cardio-Renal Trial Phase III (Eligible)",
    riskScore: 68,
    admissionDate: "2026-08-14"
  },
  {
    id: "RES-4022",
    name: "Mary Jones",
    age: 53,
    sex: "F",
    primaryDx: "Severe Persistent Asthma",
    icd10: "J45.50",
    biomarkers: "IgE 420 IU/mL · FeNO 45 ppb",
    medications: ["Fluticasone/Salmeterol", "Dupilumab"],
    trialEligibility: "Biologic Efficacy Study (Enrolled)",
    riskScore: 42,
    admissionDate: "2026-08-18"
  },
  {
    id: "RES-4058",
    name: "Thomas Reed",
    age: 68,
    sex: "M",
    primaryDx: "Heart Failure w/ Reduced EF",
    icd10: "I50.22",
    biomarkers: "NT-proBNP 3,420 pg/mL · LVEF 32%",
    medications: ["Sacubitril/Valsartan", "Carvedilol", "Spironolactone"],
    trialEligibility: "HFpEF & HFrEF Device Registry (Eligible)",
    riskScore: 88,
    admissionDate: "2026-08-20"
  },
  {
    id: "RES-4089",
    name: "Sarah Connelly",
    age: 35,
    sex: "F",
    primaryDx: "Relapsing-Remitting Multiple Sclerosis",
    icd10: "G35",
    biomarkers: "Oligoclonal bands (+) · MRI 4 active lesions",
    medications: ["Ocrelizumab", "Baclofen"],
    trialEligibility: "Neuro-Immunology Biobank (Consent Pending)",
    riskScore: 31,
    admissionDate: "2026-08-11"
  },
  {
    id: "RES-4102",
    name: "Elena Vasquez",
    age: 57,
    sex: "F",
    primaryDx: "Rheumatoid Arthritis (Seropositive)",
    icd10: "M05.79",
    biomarkers: "Anti-CCP >250 U/mL · CRP 28 mg/L",
    medications: ["Methotrexate", "Adalimumab"],
    trialEligibility: "Targeted JAK/STAT Inhibitor Study (Eligible)",
    riskScore: 54,
    admissionDate: "2026-08-15"
  },
  {
    id: "RES-4133",
    name: "Marcus Kim",
    age: 43,
    sex: "M",
    primaryDx: "Acute Myeloid Leukemia in Remission",
    icd10: "C92.00",
    biomarkers: "FLT3-ITD (-) · Minimal Residual 0.01%",
    medications: ["Midostaurin", "Acyclovir"],
    trialEligibility: "Post-Remission Immunotherapy Trial (Eligible)",
    riskScore: 76,
    admissionDate: "2026-08-02"
  },
  {
    id: "RES-4167",
    name: "Diane Walsh",
    age: 80,
    sex: "F",
    primaryDx: "Early Stage Alzheimer's Disease",
    icd10: "G30.0",
    biomarkers: "MoCA 21/30 · Amyloid PET (+)",
    medications: ["Lecanemab", "Donepezil"],
    trialEligibility: "Monoclonal Amyloid Clearance Cohort (Enrolled)",
    riskScore: 61,
    admissionDate: "2026-08-09"
  },
  {
    id: "RES-4190",
    name: "Robert Garcia",
    age: 29,
    sex: "M",
    primaryDx: "Crohn's Disease (Ileocolonic)",
    icd10: "K50.80",
    biomarkers: "Fecal Calprotectin 680 mcg/g",
    medications: ["Ustekinumab", "Mesalamine"],
    trialEligibility: "IBD Microbiome Sequencing Protocol (Eligible)",
    riskScore: 38,
    admissionDate: "2026-08-16"
  }
];

export default function PatientResearch() {
  const [search, setSearch] = useState("");
  const [selectedDx, setSelectedDx] = useState("All");
  const [selectedSex, setSelectedSex] = useState("All");
  const [trialFilter, setTrialFilter] = useState("All");
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"cohort" | "analytics" | "trials">("cohort");

  const runAiResearchQuery = (preset?: string) => {
    const q = preset || aiQuery;
    if (!q) return;
    setAiLoading(true);
    setTimeout(() => {
      setAiLoading(false);
      setSearch(q.toLowerCase().includes("diabet") ? "Diabetes" : q.toLowerCase().includes("heart") ? "Heart" : "");
    }, 800);
  };

  const filtered = RESEARCH_COHORTS.filter((p) => {
    const matchesSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.primaryDx.toLowerCase().includes(search.toLowerCase()) ||
      p.icd10.toLowerCase().includes(search.toLowerCase()) ||
      p.biomarkers.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());

    const matchesDx = selectedDx === "All" || p.primaryDx.toLowerCase().includes(selectedDx.toLowerCase());
    const matchesSex = selectedSex === "All" || p.sex === selectedSex;
    const matchesTrial = trialFilter === "All" || p.trialEligibility.toLowerCase().includes(trialFilter.toLowerCase());

    return matchesSearch && matchesDx && matchesSex && matchesTrial;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F0F2F5]">
      {/* Top Header Strip */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-900">Clinical Patient Research &amp; Cohort Discovery</h1>
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
              IRB &amp; HIPAA Compliant
            </span>
          </div>
          <p className="text-[11.5px] text-[#64748B] mt-0.5">
            Query deep longitudinal cohorts, analyze biomarker phenotypes, and evaluate clinical trial eligibility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="outline" size="sm">
            <Icon.Download /> Export Dataset (FHIR/CSV)
          </Btn>
          <Btn variant="primary" size="sm">
            <Icon.Plus /> Create Research Cohort
          </Btn>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Research Metrics Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <div className="bg-white border border-[#DDE2EC] rounded-lg p-3.5 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Total Active Cohort</div>
              <div className="text-xl font-bold text-gray-900 mt-0.5">{filtered.length} Patients</div>
              <div className="text-[11px] text-[#16A34A] font-medium mt-0.5">8 Genomic Linked</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] text-[#1B4FD8] flex items-center justify-center text-lg">
              👥
            </div>
          </div>

          <div className="bg-white border border-[#DDE2EC] rounded-lg p-3.5 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Clinical Trials Matched</div>
              <div className="text-xl font-bold text-gray-900 mt-0.5">6 Active Protocols</div>
              <div className="text-[11px] text-[#1B4FD8] font-medium mt-0.5">3 Phase III Studies</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center text-lg">
              🧪
            </div>
          </div>

          <div className="bg-white border border-[#DDE2EC] rounded-lg p-3.5 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Avg Cohort Age</div>
              <div className="text-xl font-bold text-gray-900 mt-0.5">
                {Math.round(filtered.reduce((acc, p) => acc + p.age, 0) / (filtered.length || 1))} yrs
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5">Range 29–80 yrs</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center text-lg">
              📊
            </div>
          </div>

          <div className="bg-white border border-[#DDE2EC] rounded-lg p-3.5 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">High Risk Phenotypes</div>
              <div className="text-xl font-bold text-[#DC2626] mt-0.5">
                {filtered.filter(p => p.riskScore >= 60).length} Patients
              </div>
              <div className="text-[11px] text-[#DC2626] font-medium mt-0.5">Risk Score ≥ 60</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center text-lg">
              ⚠
            </div>
          </div>
        </div>

        {/* AI Cohort Query Assistant */}
        <div className="bg-gradient-to-r from-[#0C1524] to-[#162B4D] border border-[#1E2D42] rounded-xl p-4 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">✨</span>
            <span className="text-[13px] font-semibold text-white">AI Clinical Research Cohort Builder</span>
            <span className="text-[10px] text-[#93C5FD] bg-[#1E3A8A] px-2 py-0.5 rounded font-mono">NLP Engine</span>
          </div>
          <div className="flex gap-2">
            <input
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              placeholder="e.g. 'Patients with Type 2 Diabetes and nephropathy on SGLT2 inhibitors' or 'Heart failure LVEF < 35%'"
              className="flex-1 h-10 bg-white/10 border border-white/20 rounded-lg px-3.5 text-[13px] text-white placeholder:text-[#94A3B8] focus:outline-none focus:bg-white/15 focus:border-[#3B82F6]"
            />
            <button
              onClick={() => runAiResearchQuery()}
              disabled={aiLoading}
              className="h-10 px-5 bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
            >
              {aiLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icon.Search />
              )}
              {aiLoading ? "Analyzing..." : "Find Cohort"}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2.5 text-[11px] text-[#94A3B8] flex-wrap">
            <span>Quick Prompts:</span>
            {[
              "Diabetic Nephropathy + eGFR < 60",
              "Heart Failure with NT-proBNP > 1000",
              "Multiple Sclerosis active MRI lesions",
              "Severe Asthma on Biologics"
            ].map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAiQuery(p);
                  runAiResearchQuery(p);
                }}
                className="bg-white/10 hover:bg-white/20 text-[#CBD5E1] px-2 py-0.5 rounded text-[10.5px] transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Filters & Tabs */}
        <div className="bg-white border border-[#DDE2EC] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("cohort")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                activeTab === "cohort"
                  ? "bg-[#1B4FD8] text-white"
                  : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-gray-900"
              }`}
            >
              Cohort Subjects ({filtered.length})
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                activeTab === "analytics"
                  ? "bg-[#1B4FD8] text-white"
                  : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-gray-900"
              }`}
            >
              Phenotype Analytics
            </button>
            <button
              onClick={() => setActiveTab("trials")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                activeTab === "trials"
                  ? "bg-[#1B4FD8] text-white"
                  : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-gray-900"
              }`}
            >
              Trial Protocols (6)
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-56">
              <Input value={search} onChange={setSearch} placeholder="Filter search..." icon={<Icon.Search />} />
            </div>
            <select
              value={selectedDx}
              onChange={e => setSelectedDx(e.target.value)}
              className="border border-[#DDE2EC] rounded text-[12px] text-gray-700 px-2.5 py-1.5 bg-white focus:outline-none focus:border-[#1B4FD8]"
            >
              <option value="All">All Diagnoses</option>
              <option value="Diabetes">Diabetes</option>
              <option value="Heart">Cardiovascular</option>
              <option value="Asthma">Respiratory</option>
              <option value="Sclerosis">Neurology</option>
              <option value="Arthritis">Rheumatology</option>
            </select>
            <select
              value={selectedSex}
              onChange={e => setSelectedSex(e.target.value)}
              className="border border-[#DDE2EC] rounded text-[12px] text-gray-700 px-2.5 py-1.5 bg-white focus:outline-none focus:border-[#1B4FD8]"
            >
              <option value="All">All Sexes</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
            {(search || selectedDx !== "All" || selectedSex !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedDx("All");
                  setSelectedSex("All");
                }}
                className="text-[11.5px] text-[#DC2626] font-medium hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Cohort Subjects Table */}
        {activeTab === "cohort" && (
          <div className="bg-white border border-[#DDE2EC] rounded-lg shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-gray-900">
                Matched Research Subjects ({filtered.length})
              </span>
              <span className="text-[11.5px] text-[#64748B]">Click patient to view de-identified clinical chart</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA]">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Research ID</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Subject Name</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Age/Sex</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Primary Diagnosis (ICD-10)</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Key Biomarkers</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Regimen Medications</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Clinical Trial Eligibility</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#1B4FD8]">{p.id}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-600">{p.age} yrs · {p.sex}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{p.primaryDx}</div>
                        <div className="text-[11px] font-mono text-[#64748B]">{p.icd10}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-[#F1F5F9] text-gray-800 px-2 py-0.5 rounded text-[11.5px] font-medium">
                          {p.biomarkers}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.medications.map((m, mi) => (
                            <span key={mi} className="bg-[#EFF6FF] text-[#1E40AF] px-1.5 py-0.5 rounded text-[10.5px] font-medium">
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          p.trialEligibility.includes("Enrolled")
                            ? "bg-[#DCFCE7] text-[#15803D]"
                            : p.trialEligibility.includes("Eligible")
                            ? "bg-[#EFF6FF] text-[#1D4ED8]"
                            : "bg-[#FEF3C7] text-[#B45309]"
                        }`}>
                          {p.trialEligibility}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-[11.5px] font-bold px-1.5 py-0.5 rounded ${
                          p.riskScore >= 70
                            ? "bg-[#FEE2E2] text-[#DC2626]"
                            : p.riskScore >= 45
                            ? "bg-[#FEF3C7] text-[#D97706]"
                            : "bg-[#DCFCE7] text-[#16A34A]"
                        }`}>
                          {p.riskScore}/100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Phenotype Analytics */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#DDE2EC] rounded-lg p-5 shadow-xs">
              <h3 className="text-[13.5px] font-semibold text-gray-900 mb-3">Cohort Disease Categories</h3>
              <div className="space-y-2.5 text-[12px]">
                {[
                  { label: "Endocrine / Metabolic (Diabetes, Nephropathy)", pct: 35, count: 48 },
                  { label: "Cardiovascular (HFrEF, Arrhythmia)", pct: 28, count: 39 },
                  { label: "Autoimmune & Rheumatology", pct: 18, count: 25 },
                  { label: "Neurological Disorders", pct: 12, count: 17 },
                  { label: "Oncology & Hematology", pct: 7, count: 10 },
                ].map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-gray-700 font-medium mb-1">
                      <span>{c.label}</span>
                      <span>{c.count} ({c.pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1B4FD8]" style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#DDE2EC] rounded-lg p-5 shadow-xs">
              <h3 className="text-[13.5px] font-semibold text-gray-900 mb-3">Clinical Biomarker Phenotypes</h3>
              <div className="space-y-3 text-[12px]">
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
                  <div className="font-semibold text-gray-800">Kidney Function &amp; Glycemic Control</div>
                  <div className="text-[11.5px] text-[#64748B] mt-0.5">Mean HbA1c 8.1% · Median eGFR 62 mL/min/1.73m²</div>
                </div>
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
                  <div className="font-semibold text-gray-800">Cardiovascular Stress Markers</div>
                  <div className="text-[11.5px] text-[#64748B] mt-0.5">NT-proBNP Elevated in 42% of Cohort · Troponin I baseline monitored</div>
                </div>
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
                  <div className="font-semibold text-gray-800">Inflammatory &amp; Cytokine Profiling</div>
                  <div className="text-[11.5px] text-[#64748B] mt-0.5">High Sensitivity CRP &gt; 10 mg/L in 29% active inflammatory cohort</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Trial Protocols */}
        {activeTab === "trials" && (
          <div className="bg-white border border-[#DDE2EC] rounded-lg p-5 shadow-xs space-y-3">
            <h3 className="text-[13.5px] font-semibold text-gray-900 mb-2">Active Clinical Trials &amp; Registry Programs</h3>
            {[
              {
                protocol: "NCT-04829101",
                title: "Phase III Dual SGLT2/GLP-1 RA in Diabetic Kidney Disease",
                dept: "Endocrinology & Nephrology",
                eligible: 14,
                enrolled: 6,
                sponsor: "NIH / University Medical Center"
              },
              {
                protocol: "NCT-05291882",
                title: "Novel Biologic Target for Eosinophilic Refractory Asthma",
                dept: "Pulmonology",
                eligible: 9,
                enrolled: 4,
                sponsor: "Global BioPharma Research"
              },
              {
                protocol: "NCT-04992104",
                title: "Cardiomyopathy Micro-Sensor Implant Clinical Registry",
                dept: "Cardiology & Interventional",
                eligible: 11,
                enrolled: 7,
                sponsor: "Heart Rhythm Institute"
              }
            ].map((t, idx) => (
              <div key={idx} className="p-4 border border-[#DDE2EC] rounded-lg hover:border-[#1B4FD8] transition-colors flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[12px] text-[#1B4FD8]">{t.protocol}</span>
                    <span className="font-semibold text-gray-900 text-[13px]">{t.title}</span>
                  </div>
                  <div className="text-[11.5px] text-[#64748B] mt-1">
                    Department: {t.dept} · Sponsor: {t.sponsor}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-[12.5px] font-bold text-gray-900">{t.eligible} Eligible</div>
                    <div className="text-[11px] text-[#16A34A]">{t.enrolled} Enrolled</div>
                  </div>
                  <Btn variant="outline" size="sm">Review Criteria</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
