import React, { useState } from "react";
import { Btn, Input, AlertBanner } from "./shared";
import { Icon } from "./icons";

const STEPS = ["Patient Info", "Insurance", "Appointment", "Confirmation"];

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold border-2 transition-colors
              ${i < current ? "bg-[#16A34A] border-[#16A34A] text-white"
                : i === current ? "bg-[#1B4FD8] border-[#1B4FD8] text-white"
                : "bg-white border-[#DDE2EC] text-[#94A3B8]"}`}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`text-[10.5px] font-medium mt-1 ${i === current ? "text-[#1B4FD8]" : i < current ? "text-[#16A34A]" : "text-[#94A3B8]"}`}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 flex-1 mx-2 ${i < current ? "bg-[#16A34A]" : "bg-[#DDE2EC]"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3 pb-2 border-b border-[#DDE2EC]">{title}</div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, required, children, full }: { label: string; required?: boolean; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="block text-[11.5px] font-medium text-[#374151] mb-1">
        {label}{required && <span className="text-[#DC2626] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function Registration({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [step, setStep] = useState(0);

  const next = () => { if (step < STEPS.length - 1) setStep(s => s + 1); else onComplete(); };
  const prev = () => { if (step > 0) setStep(s => s - 1); else onBack(); };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-[#64748B] hover:text-gray-900 transition-colors rotate-180">
          <Icon.ChevronRight />
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">New Patient Registration</h1>
          <p className="text-[11.5px] text-[#64748B]">Step {step + 1} of {STEPS.length}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        {/* Stepper */}
        <div className="bg-white border border-[#DDE2EC] rounded p-4 mb-5">
          <StepIndicator steps={STEPS} current={step} />
        </div>

        {/* Step 1: Patient Info */}
        {step === 0 && (
          <div className="bg-white border border-[#DDE2EC] rounded p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Patient Information</h2>

            <FormSection title="Personal Information">
              <Field label="First Name" required>
                <Input placeholder="Given name" />
              </Field>
              <Field label="Last Name" required>
                <Input placeholder="Family name" />
              </Field>
              <Field label="Date of Birth" required>
                <Input placeholder="MM/DD/YYYY" />
              </Field>
              <Field label="Sex at Birth" required>
                <select className="w-full border border-[#DDE2EC] rounded text-[12.5px] text-gray-700 px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8] bg-white">
                  <option value="">Select...</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Unknown</option>
                </select>
              </Field>
              <Field label="Social Security Number">
                <Input placeholder="XXX-XX-XXXX" />
              </Field>
              <Field label="Race / Ethnicity">
                <select className="w-full border border-[#DDE2EC] rounded text-[12.5px] text-gray-700 px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8] bg-white">
                  <option value="">Select...</option>
                  <option>White</option>
                  <option>Black or African American</option>
                  <option>Hispanic / Latino</option>
                  <option>Asian</option>
                  <option>Native American</option>
                  <option>Pacific Islander</option>
                  <option>Prefer not to say</option>
                </select>
              </Field>
            </FormSection>

            <FormSection title="Contact Information">
              <Field label="Mobile Phone" required>
                <Input placeholder="(617) 555-XXXX" />
              </Field>
              <Field label="Home Phone">
                <Input placeholder="(617) 555-XXXX" />
              </Field>
              <Field label="Email Address">
                <Input placeholder="patient@example.com" />
              </Field>
              <Field label="Preferred Contact Method">
                <select className="w-full border border-[#DDE2EC] rounded text-[12.5px] text-gray-700 px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8] bg-white">
                  <option>Mobile Phone</option>
                  <option>Home Phone</option>
                  <option>Email</option>
                  <option>Text Message</option>
                </select>
              </Field>
              <Field label="Address" full>
                <Input placeholder="Street address" />
              </Field>
              <Field label="City">
                <Input placeholder="City" />
              </Field>
              <Field label="State / ZIP">
                <div className="flex gap-2">
                  <Input placeholder="MA" className="w-14" />
                  <Input placeholder="02101" />
                </div>
              </Field>
            </FormSection>

            <FormSection title="Emergency Contact">
              <Field label="Contact Name">
                <Input placeholder="Full name" />
              </Field>
              <Field label="Relationship">
                <select className="w-full border border-[#DDE2EC] rounded text-[12.5px] text-gray-700 px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8] bg-white">
                  <option>Spouse</option>
                  <option>Parent</option>
                  <option>Child</option>
                  <option>Sibling</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Phone" full>
                <Input placeholder="(617) 555-XXXX" />
              </Field>
            </FormSection>
          </div>
        )}

        {/* Step 2: Insurance */}
        {step === 1 && (
          <div className="bg-white border border-[#DDE2EC] rounded p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Insurance Information</h2>

            <FormSection title="Primary Insurance">
              <Field label="Insurance Company" required>
                <select className="w-full border border-[#DDE2EC] rounded text-[12.5px] text-gray-700 px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8] bg-white">
                  <option value="">Select payer...</option>
                  <option>BlueCross BlueShield PPO</option>
                  <option>Aetna HMO</option>
                  <option>United Healthcare PPO</option>
                  <option>Cigna PPO</option>
                  <option>Medicare</option>
                  <option>Medicaid</option>
                  <option>Self-Pay</option>
                </select>
              </Field>
              <Field label="Plan Name">
                <Input placeholder="e.g., BlueCross PPO" />
              </Field>
              <Field label="Member ID" required>
                <Input placeholder="Insurance member ID" />
              </Field>
              <Field label="Group Number">
                <Input placeholder="Group number" />
              </Field>
              <Field label="Subscriber Name">
                <Input placeholder="If different from patient" />
              </Field>
              <Field label="Subscriber DOB">
                <Input placeholder="MM/DD/YYYY" />
              </Field>
            </FormSection>

            <FormSection title="Secondary Insurance">
              <Field label="Insurance Company" full>
                <select className="w-full border border-[#DDE2EC] rounded text-[12.5px] text-gray-700 px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8] bg-white">
                  <option value="">None (optional)</option>
                  <option>Medicare Part B</option>
                  <option>Medicaid</option>
                  <option>Other</option>
                </select>
              </Field>
            </FormSection>

            <AlertBanner type="info" title="Insurance Verification"
              body="Real-time eligibility check will be performed upon saving. Ensure member ID is accurate." />
          </div>
        )}

        {/* Step 3: Appointment */}
        {step === 2 && (
          <div className="bg-white border border-[#DDE2EC] rounded p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Schedule Initial Appointment</h2>

            <FormSection title="Appointment Details">
              <Field label="Visit Type" required>
                <select className="w-full border border-[#DDE2EC] rounded text-[12.5px] text-gray-700 px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8] bg-white">
                  <option>New Patient Visit</option>
                  <option>Follow-up</option>
                  <option>Annual Physical</option>
                  <option>Urgent Visit</option>
                  <option>Telehealth</option>
                </select>
              </Field>
              <Field label="Department" required>
                <select className="w-full border border-[#DDE2EC] rounded text-[12.5px] text-gray-700 px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8] bg-white">
                  <option>Internal Medicine</option>
                  <option>Cardiology</option>
                  <option>Oncology</option>
                  <option>Orthopedics</option>
                  <option>Surgery</option>
                  <option>Emergency</option>
                </select>
              </Field>
              <Field label="Provider">
                <select className="w-full border border-[#DDE2EC] rounded text-[12.5px] text-gray-700 px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8] bg-white">
                  <option>Dr. Anderson</option>
                  <option>Dr. Lee</option>
                  <option>Dr. Adams</option>
                  <option>Dr. Patel</option>
                  <option>Dr. Chen</option>
                </select>
              </Field>
              <Field label="Date">
                <Input placeholder="MM/DD/YYYY" />
              </Field>
              <Field label="Time">
                <select className="w-full border border-[#DDE2EC] rounded text-[12.5px] text-gray-700 px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8] bg-white">
                  <option>09:00 AM</option>
                  <option>09:30 AM</option>
                  <option>10:00 AM</option>
                  <option>10:30 AM</option>
                  <option>11:00 AM</option>
                  <option>02:00 PM</option>
                  <option>02:30 PM</option>
                  <option>03:00 PM</option>
                </select>
              </Field>
              <Field label="Chief Complaint" full>
                <textarea rows={3} placeholder="Reason for visit..."
                  className="w-full border border-[#DDE2EC] rounded text-[12.5px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8] resize-none" />
              </Field>
            </FormSection>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white border border-[#DDE2EC] rounded p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Confirm Registration</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12.5px]">
                {[
                  { l: "Patient Name", v: "Jane Doe" },
                  { l: "Date of Birth", v: "03/15/1990 · 36 yrs" },
                  { l: "Sex at Birth", v: "Female" },
                  { l: "MRN (Generated)", v: "100612" },
                  { l: "Primary Insurance", v: "BlueCross PPO" },
                  { l: "Member ID", v: "BCB-99012847" },
                  { l: "Appointment", v: "Sep 01, 2026 · 09:30 AM" },
                  { l: "Provider", v: "Dr. Anderson — Internal Med" },
                  { l: "Visit Type", v: "New Patient Visit" },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between border-b border-[#F8FAFC] py-1.5">
                    <span className="text-[#64748B]">{l}</span>
                    <span className="font-medium text-gray-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <AlertBanner type="info" title="Next Steps"
              body="After registration, the patient will receive a confirmation email with appointment details and a link to complete pre-visit forms online." />

            <div className="bg-white border border-[#DDE2EC] rounded p-4 flex items-start gap-2.5">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#1B4FD8]" defaultChecked />
              <div className="text-[12.5px] text-gray-700">
                I verify that I have obtained and confirmed the patient's consent for treatment, insurance assignment, and release of medical information as required.
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-5">
          <Btn variant="outline" size="md" onClick={prev}>
            {step === 0 ? "Cancel" : "← Back"}
          </Btn>
          <Btn variant="primary" size="md" onClick={next}>
            {step === STEPS.length - 1 ? "Complete Registration" : "Continue →"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
