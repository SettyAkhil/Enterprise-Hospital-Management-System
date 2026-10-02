import React from "react"
import hospaiLogoImg from "../assets/hospai-logo.png"

interface HospAILogoProps {
  className?: string
  variant?: "full" | "icon" | "horizontal"
  theme?: "dark" | "light"
  size?: number | string
}

export function HospAILogo({
  className = "h-10",
  variant = "horizontal",
  theme = "dark",
  size,
}: HospAILogoProps) {
  const isDark = theme === "dark"

  // Base image with optional dark-background container enhancement
  const containerStyle = size
    ? { width: size, height: size }
    : undefined

  if (variant === "icon") {
    return (
      <div
        style={containerStyle}
        className={`inline-flex items-center justify-center shrink-0 ${
          isDark ? "bg-white/95 rounded-lg p-0.5 shadow-sm" : ""
        } ${className}`}
      >
        <img
          src={hospaiLogoImg}
          alt="HospAI"
          className="w-full h-full object-contain"
        />
      </div>
    )
  }

  if (variant === "horizontal") {
    return (
      <div
        style={containerStyle}
        className={`inline-flex items-center gap-2 select-none ${
          isDark ? "bg-white/95 rounded-lg p-1 px-2 shadow-sm" : ""
        } ${className}`}
      >
        <img
          src={hospaiLogoImg}
          alt="HospAI"
          className="h-full w-auto max-h-full object-contain"
        />
      </div>
    )
  }

  // Full / Stacked Variant
  return (
    <div
      style={containerStyle}
      className={`inline-flex flex-col items-center justify-center select-none ${
        isDark ? "bg-white/95 rounded-xl p-3 shadow-md" : ""
      } ${className}`}
    >
      <img
        src={hospaiLogoImg}
        alt="HospAI"
        className="w-full h-auto max-h-36 object-contain"
      />
    </div>
  )
}

export default HospAILogo
