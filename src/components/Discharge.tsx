import React, { useState } from "react";
import { Btn, Card, AlertBanner } from "./shared";
import { Icon } from "./icons";

const STEPS = ["Clinical Review", "Discharge Orders", "Patient Education", "Follow-up", "Summary"];

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold border-2 transition-colors
              ${i < current ? "bg-[#16A34A] border-[#16A34A] text-white"
                : i === current ? "bg-[#1B4FD8] border-[#1B4FD8] text-white"
                : "bg-white border-[#DDE2EC] text-[#94A3B8]"}`}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`text-[10.5px] font-medium mt-1 whitespace-nowrap ${i === current ? "text-[#1B4FD8]" : i < current ? "text-[#16A34A]" : "text-[#94A3B8]"}`}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`h-0.5 flex-1 mx-1.5 ${i < current ? "bg-[#16A34A]" : "bg-[#DDE2EC]"}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

interface Check { label: string; done: boolean; required?: boolean }

function Checklist({ title, items, onChange }: { title: string; items: Check[]; onChange: (i: number) => void }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2.5 pb-1.5 border-b border-[#DDE2EC]">{title}</div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={item.done} onChange={() => onChange(i)}
              className="w-4 h-4 accent-[#1B4FD8] rounded" />
            <span className={`text-[12.5px] ${item.done ? "line-through text-[#94A3B8]" : "text-gray-800"}`}>
              {item.label}
              {item.required && !item.done && <span className="text-[#DC2626] ml-1 text-[11px] font-semibold">*</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function Discharge({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [clinicalChecks, setClinicalChecks] = useState<Check[]>([
    { label: "Final diagnosis confirmed and documented", done: true, required: true },
    { label: "All pending laboratory results reviewed", done: false, required: true },
    { label: "Chest X-ray reviewed — Final report obtained", done: true, required: true },
    { label: "Attending physician discharge summary complete", done: false, required: true },
    { label: "Medication reconciliation performed", done: true, required: true },
    { label: "Allergies verified and documented", done: true, required: true },
    { label: "Physical therapy clearance obtained", done: true },
    { label: "Social work assessment complete", done: false },
  ]);
  const [dcChecks, setDcChecks] = useState<Check[]>([
    { label: "Discharge order signed by attending", done: false, required: true },
    { label: "Outpatient prescriptions written", done: false, required: true },
    { label: "Diet orders discontinued", done: true },
    { label: "IV access removed / documented", done: false },
    { label: "Activity restrictions documented", done: true },
    { label: "Wound care instructions documented", done: false },
    { label: "DME / home health arranged if needed", done: true },
  ]);
  const [eduChecks, setEduChecks] = useState<Check[]>([
    { label: "Patient educated on diagnosis: T2DM / Hypertension", done: true, required: true },
    { label: "Medication teaching completed — all new prescriptions", done: false, required: true },
    { label: "Dietary restrictions reviewed with patient", done: true },
    { label: "Activity limitations explained", done: true },
    { label: "Return precautions reviewed (when to seek ER)", done: false, required: true },
    { label: "Patient verbalized understanding (teach-back)", done: false, required: true },
    { label: "Written discharge instructions provided (English)", done: false, required: true },
  ]);
  const [fupChecks, setFupChecks] = useState<Check[]>([
    { label: "PCP follow-up scheduled within 7 days", done: false, required: true },
    { label: "Cardiology follow-up scheduled (Dr. Patel — 2 weeks)", done: false, required: true },
    { label: "Outpatient lab orders placed (BMP, HbA1c in 3 months)", done: false },
    { label: "Patient portal account activated", done: true },
    { label: "Referral to Diabetes Education Center placed", done: false },
    { label: "Transportation arranged if needed", done: true },
  ]);

  const toggle = (arr: Check[], setArr: React.Dispatch<React.SetStateAction<Check[]>>, i: number) => {
    setArr(prev => prev.map((c, j) => j === i ? { ...c, done: !c.done } : c));
  };

  const steps = [
    { checks: clinicalChecks, set: setClinicalChecks },
    { checks: dcChecks, set: setDcChecks },
    { checks: eduChecks, set: setEduChecks },
    { checks: fupChecks, set: setFupChecks },
  ];

  const requiredComplete = step < 4 ? steps[step].checks.filter(c => c.required && !c.done).length === 0 : true;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Discharge Workflow</h1>
          <p className="text-[11.5px] text-[#64748B]">John Smith · MRN 100245 · Room 204 · Admitted Aug 22, 2026</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={onComplete}>Cancel</Btn>
          <Btn variant="primary" size="sm">Save Progress</Btn>
        </div>
      </div>

      {/* Patient banner */}
      <div className="bg-[#0C1524] border-b border-[#1E2D42] px-6 py-2.5 flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#1B4FD8] flex items-center justify-center text-white text-[12px] font-semibold">JS</div>
          <div>
            <div className="text-[13px] font-semibold text-white">John Smith</div>
            <div className="text-[11px] text-[#64748B]">41y Male · T2DM, HTN · Dr. Anderson</div>
          </div>
        </div>
        {[
          { l: "LOS", v: "2 days" }, { l: "Admit Dx", v: "Hyperglycemia + HTN urgency" },
          { l: "Discharge Dx", v: "T2DM uncontrolled, Stage 2 HTN" }, { l: "DC Mode", v: "Home" },
        ].map(({ l, v }) => (
          <div key={l}>
            <div className="text-[10.5px] text-[#64748B]">{l}</div>
            <div className="text-[12px] font-medium text-white">{v}</div>
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto p-5">
        {/* Stepper */}
        <div className="bg-white border border-[#DDE2EC] rounded p-4 mb-5">
          <StepIndicator steps={STEPS} current={step} />
        </div>

        {step < 4 && (
          <>
            {!requiredComplete && (
              <AlertBanner type="warning" title="Required items incomplete"
                body="Complete all required items (marked *) before proceeding." />
            )}
            <div className="mt-3 bg-white border border-[#DDE2EC] rounded p-5">
              {step === 0 && (
                <>
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Clinical Review Checklist</h2>
                  <Checklist title="Clinical Documentation" items={clinicalChecks}
                    onChange={(i) => toggle(clinicalChecks, setClinicalChecks, i)} />
                </>
              )}
              {step === 1 && (
                <>
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Discharge Orders & Medications</h2>
                  <Checklist title="Discharge Orders" items={dcChecks}
                    onChange={(i) => toggle(dcChecks, setDcChecks, i)} />

                  <div className="mt-4 pt-4 border-t border-[#DDE2EC]">
                    <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3">Discharge Medications</div>
                    <div className="space-y-2">
                      {[
                        { drug: "Metformin 1000mg", sig: "1 tab PO BID with meals", qty: "60 tablets", refills: "3" },
                        { drug: "Lisinopril 10mg", sig: "1 tab PO daily in AM", qty: "30 tablets", refills: "3" },
                        { drug: "Atorvastatin 40mg", sig: "1 tab PO at bedtime", qty: "30 tablets", refills: "3" },
                        { drug: "Metoprolol Succinate 50mg", sig: "1 tab PO daily in AM", qty: "30 tablets", refills: "3" },
                        { drug: "Aspirin 81mg", sig: "1 tab PO daily", qty: "100 tablets", refills: "11" },
                      ].map((med, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 border border-[#DDE2EC] rounded hover:bg-[#F8FAFC]">
                          <div className="flex-1">
                            <div className="text-[12.5px] font-semibold text-gray-900">{med.drug}</div>
                            <div className="text-[11.5px] text-[#64748B]">{med.sig} · Qty: {med.qty} · Refills: {med.refills}</div>
                          </div>
                          <Btn variant="ghost" size="xs">Edit</Btn>
                        </div>
                      ))}
                    </div>
                    <Btn variant="outline" size="sm" className="mt-3"><Icon.Plus /> Add Medication</Btn>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Patient Education</h2>
                  <Checklist title="Education Checklist" items={eduChecks}
                    onChange={(i) => toggle(eduChecks, setEduChecks, i)} />

                  <div className="mt-4 pt-4 border-t border-[#DDE2EC]">
                    <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3">Discharge Instructions</div>
                    <div className="bg-[#F8FAFC] border border-[#DDE2EC] rounded p-4 text-[12.5px] space-y-3">
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">Diagnosis</div>
                        <p className="text-[#64748B]">Type 2 Diabetes (uncontrolled) and Stage 2 Hypertension. These conditions require ongoing management with medication, diet, and lifestyle changes.</p>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">Medications</div>
                        <p className="text-[#64748B]">Take all medications as prescribed. Do NOT stop any blood pressure or diabetes medication without speaking to your doctor first.</p>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">Diet</div>
                        <p className="text-[#64748B]">Follow an ADA-consistent diet: limit refined carbohydrates, added sugars, and sodium (&lt;2g/day). Portion control is important.</p>
                      </div>
                      <div>
                        <div className="font-semibold text-[#DC2626] mb-1">⚠ Return to ER if you experience:</div>
                        <ul className="text-[#64748B] space-y-0.5 pl-3">
                          <li>· Blood sugar &gt; 400 mg/dL or &lt; 60 mg/dL</li>
                          <li>· Chest pain, shortness of breath, or severe headache</li>
                          <li>· Severe dizziness, confusion, or loss of consciousness</li>
                          <li>· Blood pressure &gt; 180/110 with symptoms</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Btn variant="outline" size="sm"><Icon.Download /> Print Instructions</Btn>
                      <Btn variant="outline" size="sm">Send to Patient Portal</Btn>
                      <Btn variant="outline" size="sm">Request Translator</Btn>
                    </div>
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Follow-up Appointments</h2>
                  <Checklist title="Follow-up Checklist" items={fupChecks}
                    onChange={(i) => toggle(fupChecks, setFupChecks, i)} />

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      { type: "PCP Follow-up", provider: "Dr. M. Anderson", date: "Aug 30, 2026", note: "Within 7 days per protocol", status: "Schedule" },
                      { type: "Cardiology", provider: "Dr. R. Patel", date: "Sep 06, 2026", note: "HTN management, EKG review", status: "Schedule" },
                      { type: "Diabetes Education", provider: "GH Diabetes Center", date: "Sep 10, 2026", note: "Insulin management class", status: "Referred" },
                      { type: "Lab Work", provider: "Outpatient Lab", date: "Nov 23, 2026", note: "BMP + HbA1c in 3 months", status: "Ordered" },
                    ].map((f, i) => (
                      <div key={i} className="border border-[#DDE2EC] rounded p-3 hover:border-[#1B4FD8] transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-[12.5px] font-semibold text-gray-900">{f.type}</div>
                            <div className="text-[11.5px] text-[#64748B]">{f.provider}</div>
                            <div className="text-[11.5px] font-medium text-gray-700 mt-0.5">{f.date}</div>
                            <div className="text-[11px] text-[#94A3B8] mt-0.5">{f.note}</div>
                          </div>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${f.status === "Schedule" ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#DCFCE7] text-[#15803D]"}`}>
                            {f.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Confirmation */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded p-4 flex items-center gap-3">
              <span className="text-[#16A34A] text-2xl">✓</span>
              <div>
                <div className="font-semibold text-[#15803D] text-sm">Discharge Ready</div>
                <div className="text-[12px] text-[#16A34A]">All required steps completed. Patient may be discharged.</div>
              </div>
            </div>
            <Card title="Discharge Summary — John Smith">
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-[12.5px]">
                {[
                  { l: "Patient", v: "John Smith · MRN 100245" },
                  { l: "Admission", v: "Aug 22, 2026 · 2:10 PM" },
                  { l: "Discharge", v: "Aug 24, 2026 · 11:00 AM" },
                  { l: "LOS", v: "2 days" },
                  { l: "Attending", v: "Dr. M. Anderson" },
                  { l: "Admit Diagnosis", v: "Hyperglycemia, HTN urgency" },
                  { l: "Discharge Diagnosis", v: "T2DM uncontrolled, Stage 2 HTN" },
                  { l: "Discharge Mode", v: "Home — independent" },
                  { l: "Condition at DC", v: "Stable — improved" },
                  { l: "Medications", v: "5 prescriptions — eRx sent" },
                  { l: "PCP Follow-up", v: "Aug 30 · Dr. Anderson" },
                  { l: "Code Status", v: "Full Code" },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between border-b border-[#F8FAFC] py-1">
                    <span className="text-[#64748B]">{l}</span>
                    <span className="font-medium text-gray-800">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Btn variant="outline" size="sm"><Icon.Download /> Print Summary</Btn>
                <Btn variant="outline" size="sm">Send to PCP</Btn>
                <Btn variant="outline" size="sm">Send to Patient Portal</Btn>
              </div>
            </Card>
            <div className="flex justify-center">
              <Btn variant="primary" size="md" onClick={onComplete}>
                ✓ Confirm Discharge
              </Btn>
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="flex justify-between mt-5">
            <Btn variant="outline" size="md" onClick={() => step > 0 ? setStep(s => s - 1) : onComplete()}>
              {step === 0 ? "Cancel" : "← Back"}
            </Btn>
            <Btn variant="primary" size="md" onClick={() => setStep(s => s + 1)}
              className={!requiredComplete ? "opacity-50 cursor-not-allowed" : ""}>
              {step === 3 ? "Review Summary →" : "Continue →"}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
