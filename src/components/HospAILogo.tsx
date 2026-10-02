import React from "react"

interface HospAILogoProps {
  className?: string
  variant?: "full" | "icon" | "horizontal"
  theme?: "dark" | "light"
  size?: number | string
}

export function HospAILogo({
  className = "h-10",
  variant = "full",
  theme = "dark",
  size,
}: HospAILogoProps) {
  const isDark = theme === "dark"
  const textColor = isDark ? "#FFFFFF" : "#0F172A"
  const subColor = isDark ? "#94A3B8" : "#64748B"

  if (variant === "icon") {
    return (
      <svg
        viewBox="0 0 100 100"
        className={className}
        style={size ? { width: size, height: size } : undefined}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hospai-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="hospai-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>

        {/* Outer Shield Container */}
        <rect
          x="6"
          y="6"
          width="88"
          height="88"
          rx="22"
          fill="url(#hospai-grad)"
          stroke="#38bdf8"
          strokeWidth="2"
        />

        {/* Neural AI Nodes / Connection Orbit Lines */}
        <circle cx="50" cy="50" r="34" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="24" cy="24" r="3.5" fill="#38bdf8" />
        <circle cx="76" cy="24" r="3.5" fill="#38bdf8" />
        <circle cx="24" cy="76" r="3.5" fill="#38bdf8" />
        <circle cx="76" cy="76" r="3.5" fill="#38bdf8" />

        {/* Clean Center Medical Cross */}
        <path
          d="M42 24 H58 V42 H76 V58 H58 V76 H42 V58 H24 V42 H42 Z"
          fill="white"
        />

        {/* Glowing Center Core Dot */}
        <circle cx="50" cy="50" r="5" fill="#0284c7" />
        <circle cx="50" cy="50" r="2.5" fill="#ffffff" />
      </svg>
    )
  }

  if (variant === "horizontal") {
    return (
      <div className={`inline-flex items-center gap-3 select-none ${className}`}>
        <svg
          viewBox="0 0 100 100"
          className="h-full w-auto shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="hospai-grad-h" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
          <rect
            x="8"
            y="8"
            width="84"
            height="84"
            rx="20"
            fill="url(#hospai-grad-h)"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          <path
            d="M42 26 H58 V42 H74 V58 H58 V74 H42 V58 H26 V42 H42 Z"
            fill="white"
          />
          <circle cx="50" cy="50" r="4.5" fill="#0284c7" />
        </svg>

        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1 text-base font-black tracking-tight">
            <span style={{ color: textColor }}>Hosp</span>
            <span className="text-sky-500 font-extrabold">AI</span>
          </div>
          <span
            style={{ color: subColor }}
            className="text-[9px] font-bold tracking-widest uppercase mt-0.5"
          >
            Hospital System
          </span>
        </div>
      </div>
    )
  }

  // Full / Stacked Variant
  return (
    <div className={`flex flex-col items-center justify-center select-none text-center ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-24 h-24 mb-2 shrink-0 drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hospai-grad-f" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <filter id="hospai-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#2563eb" floodOpacity="0.4" />
          </filter>
        </defs>

        <rect
          x="8"
          y="8"
          width="84"
          height="84"
          rx="22"
          fill="url(#hospai-grad-f)"
          stroke="#38bdf8"
          strokeWidth="2.5"
          filter="url(#hospai-shadow)"
        />

        {/* Orbit Grid */}
        <circle cx="50" cy="50" r="32" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="26" cy="26" r="3" fill="#38bdf8" />
        <circle cx="74" cy="26" r="3" fill="#38bdf8" />
        <circle cx="26" cy="74" r="3" fill="#38bdf8" />
        <circle cx="74" cy="74" r="3" fill="#38bdf8" />

        {/* Solid White Medical Cross */}
        <path
          d="M42 24 H58 V42 H76 V58 H58 V76 H42 V58 H24 V42 H42 Z"
          fill="white"
        />

        {/* Center Tech Core */}
        <circle cx="50" cy="50" r="5" fill="#0284c7" />
        <circle cx="50" cy="50" r="2.5" fill="#ffffff" />
      </svg>

      <div className="flex items-center gap-1 text-2xl font-extrabold tracking-tight">
        <span style={{ color: textColor }}>Hosp</span>
        <span className="text-sky-400 font-black">AI</span>
      </div>
      <span
        style={{ color: subColor }}
        className="text-[10px] font-bold tracking-[0.2em] uppercase mt-1"
      >
        Enterprise Hospital System
      </span>
    </div>
  )
}

export default HospAILogo
