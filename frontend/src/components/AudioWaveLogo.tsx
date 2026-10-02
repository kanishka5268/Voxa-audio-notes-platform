import React from "react";

interface AudioWaveLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function AudioWaveLogo({ className = "", size = "md" }: AudioWaveLogoProps) {
  const dimensions = {
    sm: { width: 16, height: 16 },
    md: { width: 22, height: 22 },
    lg: { width: 32, height: 32 },
  }[size];

  return (
    <svg
      className={`shrink-0 ${className}`}
      width={dimensions.width}
      height={dimensions.height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer Left: Blue #438CFF (shorter) */}
      <rect x="2" y="7" width="2.5" height="10" rx="1.25" fill="#438CFF" />
      {/* Inner Left: Pink #D94D9A (medium height) */}
      <rect x="6.5" y="4" width="2.5" height="16" rx="1.25" fill="#D94D9A" />
      {/* Center: Coral #FF6668 (tallest, primary brand mark) */}
      <rect x="11" y="1" width="2.5" height="22" rx="1.25" fill="#FF6668" />
      {/* Inner Right: Pink #D94D9A (medium height) */}
      <rect x="15.5" y="4" width="2.5" height="16" rx="1.25" fill="#D94D9A" />
      {/* Outer Right: Blue #438CFF (shorter) */}
      <rect x="20" y="7" width="2.5" height="10" rx="1.25" fill="#438CFF" />
    </svg>
  );
}
