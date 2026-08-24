import React, { useState } from "react";

interface LoginProps { onLogin: () => void; }

export default function Login({ onLogin }: LoginProps) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [role, setRole] = useState("rn");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pass) { setError("Please enter your credentials."); return; }
    setError("");
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 900);
  };

  const ROLES = [
    { key: "physician", label: "Physician", dept: "Internal Medicine" },
    { key: "rn", label: "Registered Nurse", dept: "3N Medical" },
    { key: "pharmacist", label: "Pharmacist", dept: "Inpatient Pharmacy" },
    { key: "lab", label: "Lab Technician", dept: "Clinical Laboratory" },
    { key: "billing", label: "Billing Specialist", dept: "Revenue Cycle" },
    { key: "admin", label: "System Admin", dept: "IT Administration" },
  ];

  return (
    <div className="h-screen flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#0C1524] p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-[#1B4FD8] rounded-lg flex items-center justify-center text-white font-bold text-xl">+</div>
            <div>
              <div className="text-white font-semibold text-lg">General Hospital</div>
              <div className="text-[#64748B] text-sm">Main Campus · Boston, MA</div>
            </div>
          </div>

          <div className="mb-12">
            <h1 className="text-white text-3xl font-semibold leading-snug mb-4">
              Universal Hospital<br />Management System
            </h1>
            <p className="text-[#64748B] text-sm leading-relaxed max-w-sm">
              Enterprise-grade clinical operations platform for physicians, nurses, pharmacists, laboratory staff, and administrators.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: "🏥", label: "16 Modules", sub: "End-to-end care workflow" },
              { icon: "👥", label: "428 Patients Today", sub: "Real-time census management" },
              { icon: "⚠", label: "7 Critical Alerts", sub: "Requires immediate attention" },
              { icon: "🔒", label: "HIPAA Compliant", sub: "Role-based access control" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-xl">{f.icon}</span>
                <div>
                  <div className="text-[13px] font-semibold text-white">{f.label}</div>
                  <div className="text-[11.5px] text-[#64748B]">{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-[#334155]">
          © 2026 General Hospital · UHMS v4.2.1 · Build 20260823
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-[#F0F2F5] px-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-[#1B4FD8] rounded flex items-center justify-center text-white font-bold text-sm">+</div>
            <div className="text-[13.5px] font-semibold text-gray-900">General Hospital HMS</div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
            <p className="text-[12.5px] text-[#64748B]">Enter your credentials to access the HMS</p>
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12.5px] px-3.5 py-2.5 rounded mb-4 flex items-center gap-2">
              <span className="font-bold">⚠</span> {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                User ID / Employee Number
              </label>
              <input value={user} onChange={e => setUser(e.target.value)}
                placeholder="e.g. jcarter@generalhospital.org"
                className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3.5 py-2.5 focus:outline-none focus:border-[#1B4FD8]" />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Password</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3.5 py-2.5 focus:outline-none focus:border-[#1B4FD8]" />
              <div className="text-right mt-1">
                <a href="#" className="text-[11.5px] text-[#1B4FD8] hover:underline">Forgot password?</a>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Role</label>
              <div className="grid grid-cols-2 gap-1.5">
                {ROLES.map(r => (
                  <button key={r.key} type="button" onClick={() => setRole(r.key)}
                    className={`text-left px-3 py-2 rounded border text-[12px] transition-colors
                      ${role === r.key ? "border-[#1B4FD8] bg-[#EFF6FF] text-[#1B4FD8]" : "border-[#DDE2EC] bg-white text-[#64748B] hover:border-[#94A3B8]"}`}>
                    <div className="font-medium">{r.label}</div>
                    <div className={`text-[10.5px] ${role === r.key ? "text-[#93C5FD]" : "text-[#94A3B8]"}`}>{r.dept}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" id="mfa" className="w-3.5 h-3.5 accent-[#1B4FD8]" defaultChecked />
              <label htmlFor="mfa" className="text-[12px] text-[#64748B]">Remember this device for 8 hours</label>
            </div>

            <button type="submit" disabled={loading}
              className={`w-full py-2.5 rounded text-white font-semibold text-[13px] transition-colors mt-2
                ${loading ? "bg-[#94A3B8] cursor-not-allowed" : "bg-[#1B4FD8] hover:bg-[#1740B4]"}`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Authenticating...
                </span>
              ) : "Sign In to HMS"}
            </button>

            <div className="text-center text-[11.5px] text-[#64748B] pt-1">
              Demo: any username + any password · select a role above
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-[#DDE2EC]">
            <div className="text-[11px] text-[#94A3B8] text-center">
              General Hospital UHMS · HIPAA-compliant platform<br />
              All access is logged and audited per hospital policy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
