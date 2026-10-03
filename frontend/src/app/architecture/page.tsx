import React from "react";
import Link from "next/link";
import AudioWaveLogo from "@/components/AudioWaveLogo";

export const metadata = {
  title: "Architecture | Voxa",
  description: "End-to-end technical architecture of the Voxa audio notes platform",
};

export default function ArchitecturePage() {
  const githubUrl =
    process.env.NEXT_PUBLIC_GITHUB_URL ||
    "https://github.com/kanishka5268/Voxa-audio-notes-platform";

  return (
    <div className="flex min-h-full flex-col items-center justify-start px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="w-full max-w-5xl space-y-10">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-[var(--text-muted)] hover:text-[var(--coral)] transition-colors group"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">&larr;</span>
            <span>Back to Voxa</span>
          </Link>

          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-sans font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--coral)]/50 transition-colors shadow-xs"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            <span>GitHub Repository</span>
            <span className="text-[10px] text-[var(--text-muted)]">&#8599;</span>
          </a>
        </div>

        {/* Page Title */}
        <div className="border-b border-[var(--border)] pb-6 flex items-start sm:items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
            <AudioWaveLogo size="md" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight text-[var(--text-primary)] leading-tight">
              Voxa — System Architecture
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-1">
              From audio upload to transcription, summarization and note delivery.
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SYSTEM ARCHITECTURE DIAGRAM */}
        {/* ============================================================== */}
        <section className="w-full flex items-center justify-center">
          <img
            src="/architecture-diagram.png"
            alt="Voxa system architecture diagram"
            width={1282}
            height={775}
            className="w-full h-auto max-w-5xl object-contain block mx-auto"
          />
        </section>

        {/* ============================================================== */}
        {/* HOW THE PROCESSING FLOW WORKS */}
        {/* ============================================================== */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] font-sans">
              How the processing flow works
            </h2>
            <span className="text-[11px] font-sans font-medium text-[var(--coral)] bg-[var(--surface-hover)] border border-[var(--coral)]/30 px-2.5 py-0.5 rounded-full">
              Processing Flow
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Step 1: Upload (Desktop: Row 1, Col 1) */}
            <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-1.5 shadow-xs transition hover:border-[var(--coral)]/40 lg:col-start-1 lg:row-start-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--coral)]/15 border border-[var(--coral)]/40 text-[10px] font-bold text-[var(--coral)] font-mono">
                  1
                </span>
                <h3 className="font-sans text-xs font-bold text-[var(--text-primary)]">
                  Upload
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                The user selects an audio file and speech language in the Next.js frontend. The file is sent to the FastAPI backend as a multipart upload.
              </p>

              {/* Connector: 1 -> 2 (Desktop: Right arrow) */}
              <div className="hidden lg:flex absolute left-[calc(100%+12px)] top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
                <div className="h-5 w-5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center shadow-xs">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 6h7M6.5 3l3 3-3 3" />
                  </svg>
                </div>
              </div>

              {/* Connector: 1 -> 2 (Mobile/Tablet: Down arrow) */}
              <div className="flex lg:hidden absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
                <div className="h-4.5 w-4.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center shadow-xs">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2.5v7M3 6.5l3 3 3-3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Step 2: Validate and store (Desktop: Row 1, Col 2) */}
            <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-1.5 shadow-xs transition hover:border-[var(--wave-cyan)]/40 lg:col-start-2 lg:row-start-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--wave-cyan)]/15 border border-[var(--wave-cyan)]/40 text-[10px] font-bold text-[var(--wave-cyan)] font-mono">
                  2
                </span>
                <h3 className="font-sans text-xs font-bold text-[var(--text-primary)]">
                  Validate and store
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                FastAPI validates the uploaded file and creates an audio_notes database record with an initial &ldquo;uploaded&rdquo; status. The audio file is then stored as a private object in Supabase Storage.
              </p>

              {/* Connector: 2 -> 3 (Desktop: Right arrow) */}
              <div className="hidden lg:flex absolute left-[calc(100%+12px)] top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
                <div className="h-5 w-5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center shadow-xs">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 6h7M6.5 3l3 3-3 3" />
                  </svg>
                </div>
              </div>

              {/* Connector: 2 -> 3 (Mobile/Tablet: Down arrow) */}
              <div className="flex lg:hidden absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
                <div className="h-4.5 w-4.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center shadow-xs">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2.5v7M3 6.5l3 3 3-3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Step 3: Start background processing (Desktop: Row 1, Col 3) */}
            <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-1.5 shadow-xs transition hover:border-[var(--wave-blue)]/40 lg:col-start-3 lg:row-start-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--wave-blue)]/15 border border-[var(--wave-blue)]/40 text-[10px] font-bold text-[var(--wave-blue)] font-mono">
                  3
                </span>
                <h3 className="font-sans text-xs font-bold text-[var(--text-primary)]">
                  Start background processing
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                After the upload and database record are successfully created, the API returns the note information to the frontend and starts processing through FastAPI BackgroundTasks. The frontend does not remain blocked while transcription is running.
              </p>

              {/* Connector: 3 -> 4 (Desktop & Mobile: Down arrow) */}
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-[calc(100%+8px)] lg:top-[calc(100%+12px)] z-10 items-center justify-center pointer-events-none">
                <div className="h-4.5 w-4.5 lg:h-5 lg:w-5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center shadow-xs">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2.5v7M3 6.5l3 3 3-3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Step 4: Transcribe with Gnani (Desktop: Row 2, Col 3) */}
            <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-1.5 shadow-xs transition hover:border-[var(--wave-violet)]/40 lg:col-start-3 lg:row-start-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--wave-violet)]/15 border border-[var(--wave-violet)]/40 text-[10px] font-bold text-[var(--wave-violet)] font-mono">
                  4
                </span>
                <h3 className="font-sans text-xs font-bold text-[var(--text-primary)]">
                  Transcribe with Gnani
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                The background task retrieves the private audio file and submits it to the Gnani Batch STT API. Because Batch STT is asynchronous, the backend creates a Gnani job, starts it, and polls its status until the transcription is complete.
              </p>

              {/* Connector: 4 -> 5 (Desktop: Left arrow towards Col 2) */}
              <div className="hidden lg:flex absolute left-[-12px] top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
                <div className="h-5 w-5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center shadow-xs">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 6h-7M5.5 3l-3 3 3 3" />
                  </svg>
                </div>
              </div>

              {/* Connector: 4 -> 5 (Mobile/Tablet: Down arrow) */}
              <div className="flex lg:hidden absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
                <div className="h-4.5 w-4.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center shadow-xs">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2.5v7M3 6.5l3 3 3-3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Step 5: Generate the summary (Desktop: Row 2, Col 2) */}
            <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-1.5 shadow-xs transition hover:border-[var(--wave-pink)]/40 lg:col-start-2 lg:row-start-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--wave-pink)]/15 border border-[var(--wave-pink)]/40 text-[10px] font-bold text-[var(--wave-pink)] font-mono">
                  5
                </span>
                <h3 className="font-sans text-xs font-bold text-[var(--text-primary)]">
                  Generate the summary
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                Once Gnani returns the transcript, the backend saves the transcript and sends it to Groq for LLM-based summarization.
              </p>

              {/* Connector: 5 -> 6 (Desktop: Left arrow towards Col 1) */}
              <div className="hidden lg:flex absolute left-[-12px] top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
                <div className="h-5 w-5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center shadow-xs">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 6h-7M5.5 3l-3 3 3 3" />
                  </svg>
                </div>
              </div>

              {/* Connector: 5 -> 6 (Mobile/Tablet: Down arrow) */}
              <div className="flex lg:hidden absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
                <div className="h-4.5 w-4.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center shadow-xs">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2.5v7M3 6.5l3 3 3-3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Step 6: Save and display results (Desktop: Row 2, Col 1) */}
            <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-1.5 shadow-xs transition hover:border-[var(--coral)]/40 lg:col-start-1 lg:row-start-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--coral)]/15 border border-[var(--coral)]/40 text-[10px] font-bold text-[var(--coral)] font-mono">
                  6
                </span>
                <h3 className="font-sans text-xs font-bold text-[var(--text-primary)]">
                  Save and display results
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                The transcript, summary, processing status, progress, and other note information are stored in PostgreSQL. The frontend periodically polls the FastAPI status endpoint and updates the UI until processing is complete.
              </p>
            </div>
          </div>

          {/* Synchronous vs Background Work */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3 shadow-xs">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Synchronous vs Background Work
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5 rounded-lg border border-[var(--border)]/60 bg-[var(--surface-secondary)] p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--wave-cyan)] font-sans">
                  <span className="h-2 w-2 rounded-full bg-[var(--wave-cyan)]" />
                  <span>Synchronous</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                  File validation, audio upload to Supabase Storage, database record creation, and the initial API response happen during the upload request.
                </p>
              </div>

              <div className="space-y-1.5 rounded-lg border border-[var(--border)]/60 bg-[var(--surface-secondary)] p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--coral)] font-sans">
                  <span className="h-2 w-2 rounded-full bg-[var(--coral)]" />
                  <span>Background</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                  Gnani Batch job creation, job polling, transcript retrieval, Groq summarization, and saving the final processing results run in the background through FastAPI BackgroundTasks.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* ENGINEERING DECISIONS (4 COMPACT CARDS) */}
        {/* ============================================================== */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] font-sans">
              Engineering Decisions
            </h2>
            <span className="text-[11px] font-sans font-medium text-[var(--text-secondary)]">
              Architecture Rationale
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Background Processing */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2 shadow-xs transition hover:border-[var(--coral)]/40">
              <div className="flex items-center justify-between">
                <h3 className="font-sans text-sm font-bold text-[var(--text-primary)]">
                  1. Background Processing
                </h3>
                <span className="text-[10px] font-mono text-[var(--coral)] bg-[var(--surface-hover)] border border-[var(--coral)]/30 px-2 py-0.5 rounded">
                  FastAPI
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                FastAPI <code className="text-[var(--coral)]">BackgroundTasks</code> executes speech-to-text polling and LLM summarization asynchronously without holding the client HTTP connection open. The upload response returns immediately in under 500ms, eliminating browser timeouts (HTTP 504) for long audio files while keeping the single-instance architecture lightweight and free of external message broker dependencies.
              </p>
            </div>

            {/* Card 2: Storage */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2 shadow-xs transition hover:border-[var(--wave-cyan)]/40">
              <div className="flex items-center justify-between">
                <h3 className="font-sans text-sm font-bold text-[var(--text-primary)]">
                  2. Storage Architecture
                </h3>
                <span className="text-[10px] font-mono text-[var(--wave-cyan)] bg-[var(--surface-hover)] border border-[var(--wave-cyan)]/30 px-2 py-0.5 rounded">
                  Supabase Storage
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                Raw audio binaries are stored in a private Supabase Storage bucket rather than inside PostgreSQL BLOB columns. This prevents database bloat, preserves fast B-tree indexing on metadata tables, and provides scalable media throughput. User recordings remain strictly private; time-limited (1-hour) signed URLs are minted only when opening historical recordings for browser playback.
              </p>
            </div>

            {/* Card 3: Long Audio */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2 shadow-xs transition hover:border-[var(--wave-violet)]/40">
              <div className="flex items-center justify-between">
                <h3 className="font-sans text-sm font-bold text-[var(--text-primary)]">
                  3. Long Audio Handling
                </h3>
                <span className="text-[10px] font-mono text-[var(--wave-violet)] bg-[var(--surface-hover)] border border-[var(--wave-violet)]/30 px-2 py-0.5 rounded">
                  Gnani Batch STT
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                Rather than using fragile real-time streaming sockets that disconnect during network fluctuations, Voxa uses Gnani’s Prisma v2.5 Batch STT API. The background task creates a job with raw audio, starts processing, enforces cooldown periods, and polls the job status endpoint until completion before extracting the clean transcript.
              </p>
            </div>

            {/* Card 4: Future Scaling */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2 shadow-xs transition hover:border-[var(--wave-blue)]/40">
              <div className="flex items-center justify-between">
                <h3 className="font-sans text-sm font-bold text-[var(--text-primary)]">
                  4. Future Scaling
                </h3>
                <span className="text-[10px] font-mono text-[var(--wave-blue)] bg-[var(--surface-hover)] border border-[var(--wave-blue)]/30 px-2 py-0.5 rounded">
                  Production Roadmap
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                With additional scale, the system would evolve by: (1) replacing in-process tasks with a distributed task queue (Celery + Redis) for worker horizontal scaling and persistence across server restarts; (2) using Server-Sent Events (SSE) or WebSockets for real-time status push; and (3) adding multi-tenant user authentication via Supabase Auth with Row-Level Security (RLS).
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* CORE TECHNOLOGY STACK */}
        {/* ============================================================== */}
        <section className="space-y-4 pt-2 border-t border-[var(--border)]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] font-sans">
            Core Technology Stack
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs">
              <p className="font-sans font-semibold text-[var(--text-primary)]">Next.js</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">App Router · UI</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs">
              <p className="font-sans font-semibold text-[var(--text-primary)]">FastAPI</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">REST &amp; Background</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs">
              <p className="font-sans font-semibold text-[var(--text-primary)]">Supabase</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">Storage &amp; Postgres</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs">
              <p className="font-sans font-semibold text-[var(--text-primary)]">Gnani AI</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">Batch STT</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs col-span-2 sm:col-span-1">
              <p className="font-sans font-semibold text-[var(--text-primary)]">Groq</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">LLM Inference</p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* VIEW REPOSITORY ON GITHUB */}
        {/* ============================================================== */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center space-y-3 shadow-xs">
          <h3 className="font-display text-xl font-normal text-[var(--text-primary)]">
            Explore the Source Code
          </h3>
          <p className="text-xs font-sans text-[var(--text-secondary)] max-w-md mx-auto">
            Review the complete code repository, FastAPI endpoints, Gnani Batch STT orchestrator, Groq prompt pipelines, and database migrations.
          </p>
          <div className="pt-1">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--coral)] hover:bg-[var(--coral-hover)] text-[var(--coral-text)] px-4 py-2 text-xs font-sans font-semibold transition-colors shadow-xs"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              <span>View Repository on GitHub</span>
              <span>&#8599;</span>
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
