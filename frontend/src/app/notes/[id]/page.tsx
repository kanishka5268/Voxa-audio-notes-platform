"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getLanguageLabel } from "@/lib/languages";

interface AudioNoteDetail {
  id: string;
  file_name: string;
  storage_path?: string;
  file_size?: number;
  status: "uploaded" | "transcribing" | "summarizing" | "completed" | "failed" | string;
  progress: number;
  transcript?: string | null;
  summary?: string | null;
  language_code?: string | null;
  error_message?: string | null;
  audio_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function NoteDetailPage() {
  const params = useParams();
  const noteId = params?.id as string | undefined;

  const [note, setNote] = useState<AudioNoteDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (!noteId) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    const fetchNote = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/audio/notes/${noteId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("This audio note could not be found.");
          }
          throw new Error(`Failed to load note (HTTP ${response.status})`);
        }
        const data: AudioNoteDetail = await response.json();
        if (isMounted) {
          setNote(data);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Unable to load note.";
          setErrorMessage(msg);
          setIsLoading(false);
        }
      }
    };

    fetchNote();

    return () => {
      isMounted = false;
    };
  }, [noteId, apiBaseUrl]);

  const handleCopySummary = async () => {
    if (!note?.summary) return;
    try {
      await navigator.clipboard.writeText(note.summary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleCopyTranscript = async () => {
    if (!note?.transcript) return;
    try {
      await navigator.clipboard.writeText(note.transcript);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--wave-cyan)] font-sans font-medium bg-[var(--surface-hover)] px-2.5 py-1 rounded-lg border border-[var(--wave-cyan)]/30">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--wave-cyan)]" />
            <span>Completed</span>
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--error)] font-sans font-medium bg-[var(--surface-hover)] px-2.5 py-1 rounded-lg border border-[var(--error)]/30">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--error)]" />
            <span>Failed</span>
          </span>
        );
      case "transcribing":
      case "summarizing":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--coral)] font-sans font-medium bg-[var(--surface-hover)] px-2.5 py-1 rounded-lg border border-[var(--coral)]/30">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)] animate-ping" />
            <span>Processing</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-sans font-medium bg-[var(--surface)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
            <span>{status || "Unknown"}</span>
          </span>
        );
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-start px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
        {/* Navigation: Back to Voxa */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors group"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">&larr;</span>
            <span>Back to Voxa</span>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center space-y-3 shadow-xs">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--coral)] animate-spin">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <p className="text-xs font-sans text-[var(--text-secondary)]">Loading audio note...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && (errorMessage || !note) && (
          <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--surface)] p-6 space-y-4 shadow-xs text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--error)]/10 text-[var(--error)] text-lg font-bold">
              !
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-sans font-semibold text-[var(--text-primary)]">
                Note Unavailable
              </h2>
              <p className="text-xs font-sans text-[var(--text-secondary)]">
                {errorMessage || "The requested audio note was not found or could not be loaded."}
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] px-4 py-2 text-xs font-sans font-medium text-[var(--text-primary)] transition-colors"
            >
              &larr; Return to Voxa
            </Link>
          </div>
        )}

        {/* Detail Content */}
        {!isLoading && note && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 space-y-1">
                  <h1 className="text-lg sm:text-xl font-sans font-bold text-[var(--text-primary)] truncate max-w-lg">
                    {note.file_name}
                  </h1>
                  <p className="text-xs font-sans text-[var(--text-muted)]">
                    {formatDate(note.created_at)}
                    {note.language_code && ` · ${getLanguageLabel(note.language_code)}`}
                  </p>
                </div>
                <div>{renderStatusBadge(note.status)}</div>
              </div>
            </div>

            {/* Failure Alert (if note failed) */}
            {note.status === "failed" && (
              <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--surface)] p-4 space-y-2 text-xs shadow-xs">
                <div className="flex items-center gap-2 text-[var(--error)] font-semibold font-sans">
                  <span className="h-2 w-2 rounded-full bg-[var(--error)]" />
                  <span>Transcription Unsuccessful</span>
                </div>
                <p className="text-[var(--text-secondary)] font-sans leading-relaxed">
                  {note.error_message || "Processing could not be completed for this audio recording."}
                </p>
              </div>
            )}

            {/* Audio Player Card (when audio_url is present) */}
            {note.audio_url && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-sans font-semibold">
                  <svg className="h-4 w-4 text-[var(--coral)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                  <span>Audio Recording</span>
                </div>
                <audio
                  controls
                  src={note.audio_url}
                  className="w-full h-9 accent-[var(--coral)] rounded-lg outline-none"
                  preload="metadata"
                />
              </div>
            )}

            {/* AI Summary Section */}
            <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--coral)]">✦</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--coral)] font-sans">
                    AI Summary
                  </h2>
                </div>
                {note.summary && note.summary.trim() && (
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="text-xs font-sans text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-md px-2.5 py-1 transition-colors"
                  >
                    {copiedSummary ? "Copied" : "Copy"}
                  </button>
                )}
              </div>

              <div className="pt-0.5">
                <p className="text-sm sm:text-base leading-[1.7] text-[var(--text-primary)] font-sans">
                  {note.summary && note.summary.trim() ? (
                    note.summary
                  ) : (
                    <span className="italic text-[var(--text-muted)] font-sans text-xs">
                      Summary unavailable.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Transcript Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] font-sans">
                  Transcript
                </h2>
                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  disabled={!note.transcript}
                  className="text-xs font-sans text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-md px-2.5 py-1 transition-colors disabled:opacity-40"
                >
                  {copiedTranscript ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-lg border border-[var(--border)]/60 bg-[var(--surface-secondary)] p-4 text-xs sm:text-sm leading-[1.7] text-[var(--text-secondary)] font-sans whitespace-pre-wrap select-text">
                {note.transcript && note.transcript.trim() ? (
                  note.transcript
                ) : (
                  <span className="italic text-[var(--text-muted)] text-xs font-sans">
                    No speech detected or empty transcript returned.
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Return Button */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] px-4 py-2 text-xs font-sans font-medium text-[var(--text-primary)] transition-colors shadow-xs"
              >
                <span>&larr; Back to Voxa</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
