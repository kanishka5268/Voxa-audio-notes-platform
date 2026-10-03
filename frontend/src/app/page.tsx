"use client";

import { useState, useRef, useEffect, ChangeEvent, FormEvent, DragEvent } from "react";
import { useNotes } from "@/context/NotesContext";
import AudioWaveLogo from "@/components/AudioWaveLogo";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

interface AudioNote {
  id: string;
  file_name: string;
  storage_path: string;
  file_size?: number;
  status: "uploaded" | "transcribing" | "summarizing" | "completed" | "failed" | string;
  progress: number;
  gnani_job_id?: string | null;
  transcript?: string | null;
  summary?: string | null;
  language_code?: string | null;
  error_message?: string | null;
  audio_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Compact waveform bar heights matching reference dropzone
const LEFT_BAR_HEIGHTS = [6, 11, 18, 13, 24, 28, 20, 14, 9, 5];
const RIGHT_BAR_HEIGHTS = [5, 9, 14, 20, 28, 24, 13, 18, 11, 6];

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<AudioNote | null>(null);

  // Language state
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en-IN");
  const [isAutoDetect, setIsAutoDetect] = useState<boolean>(false);
  const [autoLanguages, setAutoLanguages] = useState<string[]>(["en-IN", "hi-IN"]);

  const [pollingError, setPollingError] = useState<string | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { refreshNotes, upsertNote, setActiveProcessingStatus } = useNotes();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const isTerminal =
    activeNote?.status === "completed" || activeNote?.status === "failed";
  const isProcessing =
    activeNote !== null &&
    (activeNote.status === "uploaded" ||
      activeNote.status === "transcribing" ||
      activeNote.status === "summarizing");

  // Keep ambient background in sync with current state
  useEffect(() => {
    if (isUploading) {
      setActiveProcessingStatus("uploading");
    } else if (activeNote?.status) {
      setActiveProcessingStatus(activeNote.status);
    } else {
      setActiveProcessingStatus("idle");
    }
  }, [isUploading, activeNote?.status, setActiveProcessingStatus]);

  // Polling loop for the CURRENT upload only
  useEffect(() => {
    if (!activeNote?.id || isTerminal) {
      return;
    }

    let isMounted = true;
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/audio/notes/${activeNote.id}`
        );

        if (!response.ok) {
          if (isMounted) {
            setPollingError(
              `Temporary error checking status (HTTP ${response.status})`
            );
          }
          return;
        }

        const data: AudioNote = await response.json();
        if (isMounted) {
          setPollingError(null);
          setActiveNote(data);
          upsertNote({
            id: data.id,
            file_name: data.file_name,
            file_size: data.file_size,
            status: data.status,
            progress: data.progress,
            summary: data.summary,
            language_code: data.language_code,
            error_message: data.error_message,
          });
          if (data.status === "completed") {
            refreshNotes();
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof Error
              ? err.message
              : "Reconnecting to backend server...";
          setPollingError(msg);
        }
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeNote?.id, isTerminal, apiBaseUrl, upsertNote, refreshNotes]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      setPollingError(null);
      setActiveNote(null);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      setPollingError(null);
      setActiveNote(null);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadError(null);
    setPollingError(null);
    setActiveNote(null);
    setCopiedTranscript(false);
    setCopiedSummary(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleAutoLanguage = (code: string) => {
    setAutoLanguages((prev) => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== code);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), code];
      }
      return [...prev, code];
    });
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select an audio file first.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setPollingError(null);
    setActiveNote(null);
    setCopiedTranscript(false);

    const languageCodeToSend = isAutoDetect
      ? autoLanguages.join(",")
      : selectedLanguage;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("language_code", languageCodeToSend);

    try {
      const response = await fetch(`${apiBaseUrl}/api/audio/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = "Upload failed. Please check backend logs.";
        if (typeof data?.detail === "string") {
          errorMsg = data.detail;
        } else if (data?.detail?.message) {
          errorMsg = data.detail.message;
        } else if (data?.message) {
          errorMsg = data.message;
        }
        throw new Error(errorMsg);
      }

      const newNote = data as AudioNote;
      setActiveNote(newNote);
      upsertNote({
        id: newNote.id,
        file_name: newNote.file_name,
        file_size: newNote.file_size,
        status: newNote.status,
        progress: newNote.progress,
        summary: newNote.summary,
        language_code: newNote.language_code,
      });
      refreshNotes();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during upload.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyTranscript = async () => {
    if (!activeNote?.transcript) return;
    try {
      await navigator.clipboard.writeText(activeNote.transcript);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleCopySummary = async () => {
    if (!activeNote?.summary) return;
    try {
      await navigator.clipboard.writeText(activeNote.summary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes && bytes !== 0) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const hasReadyFile = selectedFile !== null && !isUploading && !isProcessing;
  // Hover or drag or processing triggers waveform bar animation inside dropzone
  const isBarsAnimating = isHovered || isDragging || isProcessing;

  return (
    <div className="flex min-h-full w-full max-w-full flex-col items-center justify-start px-4 pt-6 sm:pt-[46px] pb-16 overflow-x-hidden">
      <div className="w-full max-w-xl flex flex-col items-stretch">
        {/* FIXED / STABLE HERO COMPOSITION */}
        <div className="w-full space-y-6 sm:space-y-8">
          {/* Workspace Title: DM Serif Display & Subtitle: DM Sans */}
          <div className="text-center space-y-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xs mb-1">
              <AudioWaveLogo size="md" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-[68px] font-normal tracking-tight text-[var(--text-primary)] leading-[1.08]">
              Voxa
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] font-normal font-sans">
              Upload audio. Get an accurate transcript and concise summary.
            </p>
          </div>

          {/* Upload Workspace Form */}
          <form onSubmit={handleUpload} className="space-y-4">
            {/* UPLOAD COMPONENT (Section 1: exact match to reference screenshot) */}
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`relative rounded-xl border border-dashed px-6 py-8 sm:py-10 text-center transition-all duration-200 cursor-pointer ${
                  isDragging
                    ? "border-[var(--coral)] bg-[var(--surface-hover)] shadow-lg shadow-[var(--coral)]/10"
                    : "border-[var(--border)] bg-[var(--surface-upload)] hover:border-[var(--coral)]/60 hover:bg-[var(--surface-hover)]/80 shadow-xs"
                }`}
                style={{
                  backdropFilter: "blur(8px)",
                }}
              >
                <input
                  id="audio-file-input"
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,.opus,.wma,.mp4"
                  onChange={handleFileChange}
                  disabled={isUploading || isProcessing}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed z-10"
                  aria-label="Upload audio file"
                />

                <div className="pointer-events-none flex flex-col items-center justify-center gap-3">
                  {/* WAVEFORM BARS: [ BLUE WAVEFORM ] [ small dark upload icon ] [ PINK WAVEFORM ] */}
                  <div className="flex items-center justify-center gap-4 sm:gap-5 w-full py-1">
                    {/* Left Audio Frequency Bars: Compact blue/cyan vertical bars */}
                    <div className="flex items-center gap-[3px] h-8">
                      {LEFT_BAR_HEIGHTS.map((height, i) => {
                        const ratio = i / (LEFT_BAR_HEIGHTS.length - 1);
                        return (
                          <span
                            key={`left-bar-${i}`}
                            className={`w-[2.5px] rounded-full transition-all duration-300 ${
                              isBarsAnimating ? "animate-bar-hover" : ""
                            }`}
                            style={{
                              height: `${height}px`,
                              backgroundColor:
                                ratio < 0.5
                                  ? "var(--wave-cyan)"
                                  : "var(--wave-blue)",
                              opacity: isBarsAnimating ? 0.95 : 0.65,
                              animationDelay: `${i * 0.08}s`,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Central Upload Action Icon: Small dark rounded-square container with thin border and coral icon */}
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--coral)] shadow-xs transition-colors duration-150">
                      <svg
                        className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-[var(--coral)]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>

                    {/* Right Audio Frequency Bars: Compact pink/purple vertical bars */}
                    <div className="flex items-center gap-[3px] h-8">
                      {RIGHT_BAR_HEIGHTS.map((height, i) => {
                        const ratio = i / (RIGHT_BAR_HEIGHTS.length - 1);
                        return (
                          <span
                            key={`right-bar-${i}`}
                            className={`w-[2.5px] rounded-full transition-all duration-300 ${
                              isBarsAnimating ? "animate-bar-hover" : ""
                            }`}
                            style={{
                              height: `${height}px`,
                              backgroundColor:
                                ratio < 0.5
                                  ? "var(--wave-violet)"
                                  : "var(--wave-pink)",
                              opacity: isBarsAnimating ? 0.95 : 0.65,
                              animationDelay: `${i * 0.08}s`,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Primary & Secondary Upload Text */}
                  <div className="space-y-1">
                    <p className="font-sans text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                      Drop your audio file here
                    </p>
                    <p className="font-sans text-xs sm:text-sm text-[var(--text-secondary)] font-normal">
                      or <span className="text-[var(--coral)] hover:underline">click to browse</span>
                    </p>
                    <p className="font-sans text-xs text-[var(--text-muted)] font-normal pt-1">
                      MP3 · WAV · M4A · AAC · FLAC
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* SELECTED FILE PREVIEW CARD */
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--coral)]">
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-[var(--text-primary)] font-sans truncate max-w-[260px] sm:max-w-md">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs font-sans text-[var(--text-secondary)] mt-0.5">
                        {formatFileSize(selectedFile.size)} ·{" "}
                        <span className="text-[var(--success)] font-medium">Ready to transcribe</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isUploading || isProcessing}
                    className="text-xs font-sans font-medium text-[var(--text-muted)] hover:text-[var(--coral)] transition-colors px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* COMPACT LANGUAGE SELECTOR */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-control)] p-3 space-y-2 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="language-select"
                  className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[var(--text-secondary)] shrink-0"
                >
                  Speech Language
                </label>

                <select
                  id="language-select"
                  value={isAutoDetect ? "auto" : selectedLanguage}
                  onChange={(e) => {
                    if (e.target.value === "auto") {
                      setIsAutoDetect(true);
                    } else {
                      setIsAutoDetect(false);
                      setSelectedLanguage(e.target.value);
                    }
                  }}
                  disabled={isUploading || isProcessing}
                  className="text-xs font-sans font-medium rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-primary)] px-2.5 py-1.5 focus:outline-none focus:border-[var(--coral)] cursor-pointer max-w-[62%] sm:max-w-none truncate"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label} ({lang.nativeLabel})
                    </option>
                  ))}
                  <option value="auto">✦ Auto-detect (Multi-language)</option>
                </select>
              </div>

              {/* AUTO-DETECT CANDIDATE SELECTOR */}
              {isAutoDetect && (
                <div className="pt-2 border-t border-[var(--border)]/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-sans">
                    <span>Candidate languages:</span>
                    <span className="text-[var(--coral)] font-semibold">
                      {autoLanguages.length} / 3 selected
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isSelected = autoLanguages.includes(lang.code);
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => toggleAutoLanguage(lang.code)}
                          disabled={isUploading || isProcessing}
                          className={`text-xs px-2 py-0.5 rounded-md border font-sans transition-colors ${
                            isSelected
                              ? "bg-[var(--coral)] text-[var(--coral-text)] font-semibold border-[var(--coral)] shadow-xs"
                              : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--coral)]/50"
                          }`}
                        >
                          {lang.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* PRIMARY ACTION BUTTON */}
            <button
              type="submit"
              disabled={!selectedFile || isUploading || isProcessing}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-sans font-bold transition duration-150 active:scale-[0.99] ${
                hasReadyFile
                  ? "bg-[var(--coral)] text-[var(--coral-text)] hover:bg-[var(--coral-hover)] active:bg-[var(--coral-active)] shadow-sm cursor-pointer border border-transparent"
                  : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)] opacity-60 cursor-not-allowed"
              }`}
            >
              {isUploading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin text-[var(--coral-text)]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>Uploading recording...</span>
                </>
              ) : isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--coral-text)] animate-ping" />
                  <span>Processing in Background...</span>
                </span>
              ) : (
                <span>Upload &amp; Transcribe</span>
              )}
            </button>
          </form>
        </div>

        {/* CURRENT UPLOAD RESULTS ONLY (Processing card during active processing, ONLY Summary + Transcript on complete) */}
        {(uploadError || (isProcessing && activeNote) || (activeNote?.status === "failed") || (activeNote?.status === "completed")) && (
          <div className="w-full mt-6 space-y-6">
            {/* Upload Error Banner */}
            {uploadError && (
              <div className="rounded-xl border border-[var(--error)]/40 bg-[var(--surface)] p-3.5 text-xs text-[var(--error)]">
                <div className="flex items-start gap-2.5">
                  <span className="font-bold text-sm leading-none">&times;</span>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Upload Failed</p>
                    <p className="mt-0.5 text-[var(--text-secondary)]">{uploadError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Approved Processing Card for CURRENT Upload */}
            {isProcessing && activeNote && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 shadow-xs">
                {/* Header: Title, Filename & Percentage */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-sans text-sm font-semibold text-[var(--text-primary)]">
                      Processing Audio Note
                    </h3>
                    <p className="text-xs font-sans text-[var(--text-secondary)] truncate max-w-xs sm:max-w-md">
                      {activeNote.file_name}
                    </p>
                  </div>

                  <span className="text-xs font-sans font-bold text-[var(--coral)] bg-[var(--surface-hover)] px-2.5 py-1 rounded-md border border-[var(--coral)]/30">
                    {activeNote.progress || 0}%
                  </span>
                </div>

                {/* Coral Animated Progress Bar */}
                <div className="w-full bg-[var(--surface-secondary)] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[var(--coral)] h-1.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, Math.max(8, activeNote.progress || 0))}%` }}
                  />
                </div>

                {/* Staged Indicators: Uploaded ✓ | Transcribing ● | Summary ○ */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)]/60 text-xs font-sans">
                  {/* Step 1: Uploaded */}
                  <div className="flex items-center gap-1.5 text-[var(--wave-cyan)] font-medium">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--wave-cyan)]/20 text-[10px] font-bold">✓</span>
                    <span>Uploaded</span>
                  </div>

                  {/* Step 2: Transcribing */}
                  <div className={`flex items-center gap-1.5 font-medium ${
                    activeNote.status === "transcribing"
                      ? "text-[var(--coral)]"
                      : activeNote.status === "summarizing" || activeNote.status === "completed"
                      ? "text-[var(--wave-cyan)]"
                      : "text-[var(--text-muted)]"
                  }`}>
                    {activeNote.status === "summarizing" || activeNote.status === "completed" ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--wave-cyan)]/20 text-[10px] font-bold">✓</span>
                    ) : activeNote.status === "transcribing" ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--coral)]/20 text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)] animate-ping" />
                      </span>
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] text-[10px]">○</span>
                    )}
                    <span>Transcribing</span>
                  </div>

                  {/* Step 3: Summary */}
                  <div className={`flex items-center gap-1.5 font-medium ${
                    activeNote.status === "summarizing"
                      ? "text-[var(--coral)]"
                      : activeNote.status === "completed"
                      ? "text-[var(--wave-cyan)]"
                      : "text-[var(--text-muted)]"
                  }`}>
                    {activeNote.status === "completed" ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--wave-cyan)]/20 text-[10px] font-bold">✓</span>
                    ) : activeNote.status === "summarizing" ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--coral)]/20 text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)] animate-ping" />
                      </span>
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] text-[10px]">○</span>
                    )}
                    <span>Summary</span>
                  </div>
                </div>
              </div>
            )}

            {/* Current Failed State Display */}
            {activeNote?.status === "failed" && (
              <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--surface)] p-4 space-y-3 text-xs shadow-xs">
                <div className="flex items-center gap-2 text-[var(--error)] font-semibold font-sans">
                  <span className="h-2 w-2 rounded-full bg-[var(--error)]" />
                  <span>Processing Failed</span>
                </div>
                <p className="text-[var(--text-secondary)] font-sans">
                  {activeNote.error_message || "Could not transcribe audio. Please try again."}
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] px-3 py-1.5 font-medium text-[var(--text-primary)] transition-colors"
                >
                  Try another file
                </button>
              </div>
            )}

            {/* Current Completed State Output: ONLY AI Summary + Transcript (NO Note Ready, NO Audio Player) */}
            {activeNote?.status === "completed" && (
              <div className="space-y-6 pt-1">
                {/* AI Summary Section */}
                <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--coral)]">✦</span>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--coral)] font-sans">
                        AI Summary
                      </h2>
                    </div>
                    {activeNote.summary && activeNote.summary.trim() && (
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
                      {activeNote.summary && activeNote.summary.trim() ? (
                        activeNote.summary
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
                      disabled={!activeNote.transcript}
                      className="text-xs font-sans text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-md px-2.5 py-1 transition-colors disabled:opacity-40"
                    >
                      {copiedTranscript ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--border)]/60 bg-[var(--surface-secondary)] p-4 text-xs sm:text-sm leading-[1.7] text-[var(--text-secondary)] font-sans whitespace-pre-wrap select-text">
                    {activeNote.transcript && activeNote.transcript.trim() ? (
                      activeNote.transcript
                    ) : (
                      <span className="italic text-[var(--text-muted)] text-xs font-sans">
                        No speech detected or empty transcript returned.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
