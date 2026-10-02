"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";

interface AudioWaveBackgroundProps {
  status?: "idle" | "uploading" | "transcribing" | "summarizing" | "completed" | "failed" | string;
}

export default function AudioWaveBackground({ status = "idle" }: AudioWaveBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetOffset = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touchQuery = window.matchMedia("(pointer: coarse)");

    if (motionQuery.matches || touchQuery.matches) {
      return;
    }

    const handlePointerMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetOffset.current = {
        x: nx * 16,
        y: ny * 10,
      };
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const updatePosition = () => {
      const dx = targetOffset.current.x - currentOffset.current.x;
      const dy = targetOffset.current.y - currentOffset.current.y;
      currentOffset.current.x += dx * 0.04;
      currentOffset.current.y += dy * 0.04;

      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${currentOffset.current.x}px, ${currentOffset.current.y}px, 0)`;
      }

      animationFrameRef.current = requestAnimationFrame(updatePosition);
    };

    animationFrameRef.current = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const isDark = theme === "dark";
  const isUploading = status === "uploading";
  const isTranscribing = status === "transcribing";
  const isSummarizing = status === "summarizing";
  const isFailed = status === "failed";

  // Visual intensity (Reduced by ~10–15% to maintain UI visual dominance):
  // Dark mode: ~18–28% visual intensity
  // Light mode: ~30–38% visual intensity
  let mainWaveOpacity = isDark ? 0.25 : 0.38;
  let accentWaveOpacity = isDark ? 0.21 : 0.34;
  let glowOpacity = isDark ? 0.16 : 0.22;

  if (isFailed) {
    mainWaveOpacity = isDark ? 0.10 : 0.15;
    accentWaveOpacity = isDark ? 0.08 : 0.12;
    glowOpacity = isDark ? 0.05 : 0.08;
  } else if (isUploading) {
    mainWaveOpacity = isDark ? 0.32 : 0.44;
    glowOpacity = isDark ? 0.22 : 0.28;
  } else if (isTranscribing) {
    mainWaveOpacity = isDark ? 0.40 : 0.48;
    accentWaveOpacity = isDark ? 0.36 : 0.42;
    glowOpacity = isDark ? 0.26 : 0.30;
  } else if (isSummarizing) {
    mainWaveOpacity = isDark ? 0.36 : 0.44;
    accentWaveOpacity = isDark ? 0.40 : 0.46;
    glowOpacity = isDark ? 0.25 : 0.28;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 md:left-72 overflow-hidden z-0 select-none bg-[var(--bg-primary)] transition-colors duration-500"
      aria-hidden="true"
    >
      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center"
        style={{ willChange: "transform" }}
      >
        {/* RE-ESTABLISHED HIGH-QUALITY GENERATED SVG AUDIO WAVEFORM
            - 5-8 overlapping flowing paths and organic ribbons
            - Continuous slow motion (25-45s keyframes), never stops moving in idle
            - Luminous cyan -> blue -> violet -> pink -> coral gradients
            - Positioned behind upload box (translate-y-16 sm:translate-y-20)
            - Strongest amplitude on left and right of upload box
            - Clean Voxa heading area above
        */}
        <svg
          className="absolute w-[125vw] max-w-[1800px] h-[760px] translate-y-8 sm:translate-y-12 pointer-events-none select-none"
          viewBox="0 0 1440 760"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: "saturate(0.92)" }}
        >
          <defs>
            {/* Violet/Pink Dominant Ribbon Gradient: cyan -> blue -> violet -> pink -> coral */}
            <linearGradient id="ribbonVioletPink" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--wave-cyan)" stopOpacity="0.45" />
              <stop offset="25%" stopColor="var(--wave-blue)" stopOpacity="0.8" />
              <stop offset="50%" stopColor="var(--wave-violet)" stopOpacity="0.88" />
              <stop offset="75%" stopColor="var(--wave-pink)" stopOpacity="0.88" />
              <stop offset="100%" stopColor="var(--wave-coral)" stopOpacity="0.55" />
            </linearGradient>

            {/* Cyan/Blue Secondary Ribbon Gradient */}
            <linearGradient id="ribbonCyanBlue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--wave-cyan)" stopOpacity="0.4" />
              <stop offset="30%" stopColor="var(--wave-blue)" stopOpacity="0.82" />
              <stop offset="68%" stopColor="var(--wave-violet)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--wave-pink)" stopOpacity="0.45" />
            </linearGradient>

            {/* Warm Violet-Coral Accent Strand */}
            <linearGradient id="strandWarm" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--wave-cyan)" />
              <stop offset="25%" stopColor="var(--wave-blue)" />
              <stop offset="52%" stopColor="var(--wave-violet)" />
              <stop offset="78%" stopColor="var(--wave-pink)" />
              <stop offset="100%" stopColor="var(--wave-coral)" />
            </linearGradient>

            {/* Soft Luminous Central Sound Glow */}
            <radialGradient id="centerSoundGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--wave-violet)" stopOpacity={glowOpacity} />
              <stop offset="38%" stopColor="var(--wave-pink)" stopOpacity={glowOpacity * 0.75} />
              <stop offset="72%" stopColor="var(--wave-blue)" stopOpacity={glowOpacity * 0.35} />
              <stop offset="100%" stopColor="var(--bg-primary)" stopOpacity="0" />
            </radialGradient>

            <filter id="waveSoftBlur" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Central Luminous Sound Glow centered on upload zone */}
          <ellipse
            cx="720"
            cy="380"
            rx="560"
            ry="240"
            fill="url(#centerSoundGlow)"
          />

          {/* PATH 1: Base Translucent Waveform Ribbon (Organic amplitude swell on sides) */}
          <path
            className="animate-wave-1 transition-all duration-700"
            d="M-60,390 
               C140,210 320,490 560,340 
               C780,210 960,460 1180,310 
               C1320,220 1440,340 1520,370 
               L1520,450 
               C1380,480 1220,380 1020,480 
               C760,600 500,390 300,500 
               C140,570 -10,460 -60,430 Z"
            fill="url(#ribbonVioletPink)"
            fillOpacity={mainWaveOpacity * 0.55}
          />

          {/* PATH 2: Counter-Harmonic Translucent Ribbon */}
          <path
            className="animate-wave-2 transition-all duration-700"
            d="M-70,340 
               C130,480 340,200 580,390 
               C820,540 1040,230 1240,410 
               C1380,510 1480,370 1540,350 
               L1540,420 
               C1400,500 1240,350 1020,500 
               C800,640 560,340 340,510 
               C180,620 40,410 -70,380 Z"
            fill="url(#ribbonCyanBlue)"
            fillOpacity={mainWaveOpacity * 0.45}
          />

          {/* PATH 3: Primary Flowing Audio Waveform Ribbon (Violet -> Pink dominant) */}
          <path
            className="animate-wave-1 transition-all duration-700"
            d="M-90,370 
               C120,200 320,490 560,330 
               C800,160 1000,450 1220,280 
               C1360,190 1460,330 1540,360"
            stroke="url(#ribbonVioletPink)"
            strokeWidth={isDark ? "3.5" : "3"}
            strokeOpacity={mainWaveOpacity * 1.3}
            strokeLinecap="round"
            filter="url(#waveSoftBlur)"
          />

          {/* PATH 4: Companion Harmonic Strand (Warm spectral transition) */}
          <path
            className="animate-wave-3 transition-all duration-700"
            d="M-80,395 
               C130,225 330,515 570,355 
               C810,185 1010,475 1230,305 
               C1370,215 1470,355 1550,385"
            stroke="url(#strandWarm)"
            strokeWidth={isDark ? "2" : "1.8"}
            strokeOpacity={accentWaveOpacity * 1.15}
            strokeLinecap="round"
          />

          {/* PATH 5: Intersecting Cool Cyan/Blue Strand */}
          <path
            className="animate-wave-2 transition-all duration-700"
            d="M-100,330 
               C110,480 340,220 600,410 
               C840,570 1060,260 1260,430 
               C1390,520 1480,360 1550,340"
            stroke="url(#ribbonCyanBlue)"
            strokeWidth={isDark ? "2.5" : "2"}
            strokeOpacity={accentWaveOpacity * 1.2}
            strokeLinecap="round"
          />

          {/* PATH 6: Upper Harmonic Ribbon (Frames slightly above the upload card) */}
          <path
            className="animate-wave-1 transition-all duration-700"
            d="M-60,335 
               C140,240 360,420 620,270 
               C860,150 1060,380 1270,250 
               C1390,185 1470,290 1540,310"
            stroke="var(--wave-pink)"
            strokeWidth="1.5"
            strokeOpacity={mainWaveOpacity * 0.85}
            strokeDasharray="16 8"
            strokeLinecap="round"
          />

          {/* PATH 7: Lower Harmonic Ribbon (Frames slightly below the upload card) */}
          <path
            className="animate-wave-2 transition-all duration-700"
            d="M-80,440 
               C140,540 380,330 640,490 
               C880,630 1100,360 1300,510 
               C1410,580 1480,450 1550,440"
            stroke="var(--wave-blue)"
            strokeWidth="1.5"
            strokeOpacity={accentWaveOpacity * 0.75}
            strokeDasharray="20 10"
            strokeLinecap="round"
          />

          {/* PATH 8: Processing Active Pulse Strand */}
          {(isTranscribing || isSummarizing) && (
            <path
              className="animate-wave-pulse transition-opacity duration-500"
              d="M-90,360 
                 C130,200 350,490 590,310 
                 C830,130 1030,450 1250,270 
                 C1380,180 1480,340 1550,355"
              stroke={isTranscribing ? "var(--wave-cyan)" : "var(--wave-coral)"}
              strokeWidth="4"
              strokeOpacity={isDark ? 0.65 : 0.55}
              filter="url(#waveSoftBlur)"
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Soft edge vignette to preserve text contrast across full viewport */}
        <div
          className="absolute inset-0 pointer-events-none transition-colors duration-500"
          style={{
            background: isDark
              ? "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(5, 9, 13, 0.70) 90%, #05090D 100%)"
              : "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(228, 224, 216, 0.60) 90%, #E4E0D8 100%)",
          }}
        />
      </div>
    </div>
  );
}
