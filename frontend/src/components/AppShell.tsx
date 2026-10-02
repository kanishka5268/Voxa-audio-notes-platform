"use client";

import React, { useState } from "react";
import Link from "next/link";
import Sidebar from "./Sidebar";
import AudioWaveBackground from "./AudioWaveBackground";
import ThemeToggle from "./ThemeToggle";
import AudioWaveLogo from "./AudioWaveLogo";
import { NotesProvider, useNotes } from "@/context/NotesContext";

interface AppShellProps {
  children: React.ReactNode;
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const { activeProcessingStatus } = useNotes();

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-250">
      {/* Waveform Background inspired by living audio frequencies */}
      <AudioWaveBackground status={activeProcessingStatus} />

      {/* Persistent Desktop Sidebar (width ~320px) / Mobile Drawer */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Top Navigation Bar */}
        <header className="flex h-14 md:hidden items-center justify-between border-b border-[var(--border)] bg-[var(--bg-secondary)]/90 backdrop-blur-md px-4 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Open sidebar menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>

            <Link href="/" className="flex items-center gap-2">
              <AudioWaveLogo size="sm" />
              <span className="font-sans font-bold text-sm tracking-tight text-[var(--text-primary)]">
                Voxa
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/"
              className="text-xs font-semibold text-[var(--coral)] hover:opacity-80 transition-opacity"
            >
              + New
            </Link>
          </div>
        </header>

        {/* Desktop Top Bar: Theme Switcher aligned top-right */}
        <div className="hidden md:flex items-center justify-end px-8 pt-6 pb-2 shrink-0 pointer-events-none">
          <div className="pointer-events-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Main Workspace (Scrollable) */}
        <main className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <NotesProvider>
      <AppShellContent>{children}</AppShellContent>
    </NotesProvider>
  );
}
