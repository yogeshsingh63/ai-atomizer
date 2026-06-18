import React from "react";

interface PrismLogoProps {
  className?: string;
  size?: number;
}

export const PrismLogo = ({ className, size = 32 }: PrismLogoProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Background Glow */}
    <circle cx="50" cy="50" r="30" fill="url(#prism-glow)" opacity="0.15" />

    {/* Incoming Light Ray (White) */}
    <path
      d="M10 65 L42 50"
      stroke="url(#incoming-ray)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    
    {/* Prism Glass Structure */}
    <polygon
      points="50,22 23,72 77,72"
      stroke="url(#prism-border)"
      strokeWidth="2"
      fill="url(#prism-fill)"
      strokeLinejoin="round"
    />

    {/* Small inner refraction core */}
    <polygon
      points="50,32 32,68 68,68"
      fill="url(#inner-refraction)"
      opacity="0.25"
    />
    
    {/* Refracted Outgoing Spectrum Rays */}
    {/* Ray 1: Red/Orange (YouTube / Clips) */}
    <path
      d="M52 48 L90 35"
      stroke="#ef4444"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.8"
    />
    {/* Ray 2: Cyan/Blue (X/Twitter) */}
    <path
      d="M52 50 L92 48"
      stroke="#38bdf8"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.85"
    />
    {/* Ray 3: Deep Blue (LinkedIn) */}
    <path
      d="M52 52 L90 61"
      stroke="#0a66c2"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.8"
    />
    {/* Ray 4: Gold (Blog/Text) */}
    <path
      d="M52 54 L85 74"
      stroke="#f59e0b"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.75"
    />

    <defs>
      {/* Background glow radial gradient */}
      <radialGradient id="prism-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>

      {/* Incoming ray linear gradient to simulate light entry */}
      <linearGradient id="incoming-ray" x1="10" y1="65" x2="42" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
      </linearGradient>

      {/* Glass border gradient */}
      <linearGradient id="prism-border" x1="50" y1="22" x2="50" y2="72" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="50%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>

      {/* Glass body filling gradient */}
      <linearGradient id="prism-fill" x1="50" y1="22" x2="50" y2="72" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.75" />
      </linearGradient>

      {/* Inner refraction color blend */}
      <linearGradient id="inner-refraction" x1="50" y1="32" x2="50" y2="68" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
  </svg>
);
