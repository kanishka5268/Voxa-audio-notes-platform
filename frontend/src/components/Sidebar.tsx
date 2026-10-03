"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useNotes, NoteSummaryItem } from "@/context/NotesContext";
import AudioWaveLogo from "./AudioWaveLogo";
import { getLanguageLabel } from "@/lib/languages";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    notes,
    archivedNotes,
    isLoading,
    isArchivedLoading,
    error,
    pinNote,
    archiveNote,
    deleteNote,
  } = useNotes();

  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<NoteSummaryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Close three-dot menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest("[data-note-menu]")) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [openMenuId]);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isOpen && onClose) {
      onClose();
    }
  }, [pathname]);

  // Prevent background scrolling when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const displayedNotes = showArchived ? archivedNotes : notes;
  const currentLoading = showArchived ? isArchivedLoading : isLoading;

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      }
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const renderStatus = (item: NoteSummaryItem) => {
    const langLabel = getLanguageLabel(item.language_code);
    const timeStr = formatTimestamp(item.created_at);

    switch (item.status) {
      case "completed":
        return (
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-sans">
            <span className="flex items-center gap-1.5 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--wave-cyan)] shrink-0" />
              <span className="truncate text-[var(--text-secondary)] font-medium">Completed · {langLabel}</span>
            </span>
            {timeStr && <span className="opacity-70 shrink-0 ml-1.5 text-[10px]">{timeStr}</span>}
          </div>
        );
      case "summarizing":
        return (
          <div className="flex items-center justify-between text-[11px] text-[var(--coral)] font-sans">
            <span className="flex items-center gap-1.5 truncate">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--coral)] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--coral)]" />
              </span>
              <span className="truncate font-medium">Generating summary</span>
            </span>
            {timeStr && <span className="opacity-70 shrink-0 ml-1.5 text-[10px]">{timeStr}</span>}
          </div>
        );
      case "transcribing":
        return (
          <div className="flex items-center justify-between text-[11px] text-[var(--coral)] font-sans">
            <span className="flex items-center gap-1.5 truncate">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--coral)] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--coral)]" />
              </span>
              <span className="truncate font-medium">Transcribing · {item.progress}%</span>
            </span>
            {timeStr && <span className="opacity-70 shrink-0 ml-1.5 text-[10px]">{timeStr}</span>}
          </div>
        );
      case "uploaded":
        return (
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-sans">
            <span className="flex items-center gap-1.5 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)] shrink-0" />
              <span className="truncate text-[var(--warning)] font-medium">Uploaded</span>
            </span>
            {timeStr && <span className="opacity-70 shrink-0 ml-1.5 text-[10px]">{timeStr}</span>}
          </div>
        );
      case "failed":
        return (
          <div className="flex items-center justify-between text-[11px] text-[var(--error)] font-sans">
            <span className="flex items-center gap-1.5 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--error)] shrink-0" />
              <span className="truncate font-semibold text-[var(--error)]">Failed</span>
            </span>
            {timeStr && <span className="opacity-70 shrink-0 ml-1.5 text-[10px]">{timeStr}</span>}
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-sans">
            <span className="flex items-center gap-1.5 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] shrink-0" />
              <span className="truncate">{item.status}</span>
            </span>
            {timeStr && <span className="opacity-70 shrink-0 ml-1.5 text-[10px]">{timeStr}</span>}
          </div>
        );
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => !isDeleting && setNoteToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 space-y-4 shadow-2xl"
          >
            <div className="space-y-1.5">
              <h3 className="text-sm font-sans font-semibold text-[var(--text-primary)]">
                Delete this recording?
              </h3>
              <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
                This will permanently delete the audio, transcript and summary.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setNoteToDelete(null)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] px-3.5 py-1.5 text-xs font-sans font-medium text-[var(--text-primary)] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!noteToDelete) return;
                  setIsDeleting(true);
                  const deletedId = noteToDelete.id;
                  const success = await deleteNote(deletedId);
                  setIsDeleting(false);
                  if (success) {
                    setNoteToDelete(null);
                    if (pathname === `/notes/${deletedId}`) {
                      router.push("/");
                    }
                  }
                }}
                className="rounded-lg bg-[var(--error)] hover:opacity-90 px-3.5 py-1.5 text-xs font-sans font-medium text-white transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen h-[100dvh] max-h-[100dvh] w-72 max-w-[85vw] flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] transition-transform duration-200 ease-in-out overflow-hidden md:static md:h-screen md:max-h-screen md:translate-x-0 ${
          isOpen
            ? "translate-x-0 shadow-2xl pointer-events-auto"
            : "-translate-x-full pointer-events-none md:pointer-events-auto md:shadow-none"
        }`}
      >
        {/* TOP: Brand & New Recording CTA */}
        <div className="relative z-10 flex flex-col gap-3 p-3.5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={onClose}
              className="group flex items-center gap-2.5 transition"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-xs group-hover:border-[var(--coral)]/50 transition-colors">
                <AudioWaveLogo size="sm" />
              </div>
              <span className="font-sans text-base font-bold tracking-tight text-[var(--text-primary)]">
                Voxa
              </span>
            </Link>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="md:hidden p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--surface-hover)] transition-colors"
                aria-label="Close sidebar"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* New Recording Button */}
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--coral)] hover:bg-[var(--coral-hover)] active:bg-[var(--coral-active)] px-3 py-2 text-xs font-sans font-bold text-[var(--coral-text)] shadow-xs transition duration-150 active:scale-[0.99]"
          >
            <span className="text-sm leading-none font-bold">+</span>
            <span>New recording</span>
          </Link>
        </div>

        {/* MIDDLE: RECENT AUDIO RECORDS & ARCHIVE FILTER */}
        <div className="relative z-10 flex flex-1 min-h-0 flex-col overflow-hidden px-2.5 py-3">
          <div className="flex items-center justify-between px-2 pb-2 shrink-0">
            <h2 className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {showArchived ? "Archived Audio" : "Recent Audio"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowArchived(!showArchived);
                setOpenMenuId(null);
              }}
              className="text-[10px] font-sans font-medium text-[var(--text-muted)] hover:text-[var(--coral)] transition-colors cursor-pointer"
            >
              {showArchived
                ? "← Recent"
                : `Archived${archivedNotes.length > 0 ? ` (${archivedNotes.length})` : ""}`}
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5 overscroll-contain">
            {currentLoading && (
              <div className="space-y-1.5 py-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="flex items-start gap-2 rounded-lg px-2.5 py-2 border border-[var(--border)]/30 bg-[var(--surface-recent)]/60 animate-pulse"
                  >
                    <div className="h-3.5 w-3.5 rounded bg-[var(--surface-secondary)] shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-3/4 rounded bg-[var(--surface-secondary)]" />
                      <div className="h-2 w-1/2 rounded bg-[var(--surface-secondary)]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!currentLoading && error && (
              <div className="mx-2 my-2 p-2.5 text-xs text-[var(--error)] bg-[var(--surface)] rounded-md border border-[var(--error)]/30">
                {error}
              </div>
            )}

            {!currentLoading && !error && displayedNotes.length === 0 && (
              <div className="px-3 py-8 text-center space-y-2">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]">
                  <svg
                    className="h-4 w-4 text-[var(--coral-muted)]"
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
                <p className="text-xs font-sans font-medium text-[var(--text-secondary)]">
                  {showArchived ? "No archived recordings" : "No recordings yet"}
                </p>
                <p className="text-[11px] font-sans text-[var(--text-muted)] leading-tight">
                  {showArchived
                    ? "Archived audio recordings will appear here."
                    : "Upload an audio note to see its transcript and summary here."}
                </p>
              </div>
            )}

            {!currentLoading &&
              displayedNotes.map((item) => {
                const isActive = pathname === `/notes/${item.id}`;
                const isFailed = item.status === "failed";
                const isMenuOpen = openMenuId === item.id;

                return (
                  <div key={item.id} className="relative group">
                    <Link
                      href={`/notes/${item.id}`}
                      onClick={onClose}
                      className={`flex items-start gap-2 rounded-lg px-2.5 py-2 pr-7 transition-all duration-150 text-left border ${
                        isActive
                          ? "bg-[var(--surface-hover)] border-l-[3px] border-l-[var(--coral)] border-t-[var(--border)] border-r-[var(--border)] border-b-[var(--border)] text-[var(--text-primary)] shadow-xs"
                          : isFailed
                          ? "border-[var(--error)]/30 bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--error)]/50 text-[var(--text-secondary)] shadow-xs"
                          : "border-[var(--border)]/40 bg-[var(--surface-recent)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)] shadow-xs"
                      }`}
                    >
                      {/* Audio Icon */}
                      <div
                        className={`shrink-0 pt-0.5 transition-opacity ${
                          isFailed
                            ? "text-[var(--error)] opacity-80 group-hover:opacity-100"
                            : "text-[var(--coral-muted)] opacity-90 group-hover:opacity-100"
                        }`}
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
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={`truncate text-xs font-sans font-medium leading-tight flex-1 ${
                              isActive
                                ? "text-[var(--text-primary)] font-semibold"
                                : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                            }`}
                            title={item.file_name}
                          >
                            {item.file_name}
                          </p>

                          {/* Subtle Pin Indicator */}
                          {item.is_pinned && !item.is_archived && (
                            <span
                              className="shrink-0 text-[var(--coral)] opacity-90"
                              title="Pinned note"
                            >
                              <svg
                                className="h-2.5 w-2.5"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                              </svg>
                            </span>
                          )}
                        </div>

                        <div className="mt-1">
                          {renderStatus(item)}
                        </div>
                      </div>
                    </Link>

                    {/* Three-Dot Action Button (Hover / Touch) */}
                    <button
                      type="button"
                      aria-label="Note options"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenuId((prev) => (prev === item.id ? null : item.id));
                      }}
                      className={`absolute right-1.5 top-2.5 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer z-20 ${
                        isMenuOpen
                          ? "opacity-100 text-[var(--coral)]"
                          : "opacity-0 group-hover:opacity-100 max-sm:opacity-80 focus:opacity-100"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.8" />
                        <circle cx="12" cy="12" r="1.8" />
                        <circle cx="12" cy="19" r="1.8" />
                      </svg>
                    </button>

                    {/* Three-Dot Dropdown Menu */}
                    {isMenuOpen && (
                      <div
                        data-note-menu
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="absolute right-1 top-8 z-30 min-w-[115px] rounded-lg border border-[var(--border)] bg-[var(--surface-card)] py-1 shadow-xl shadow-black/40"
                      >
                        {/* Normal / Pinned Note Options */}
                        {!item.is_archived && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId(null);
                              await pinNote(item.id, !item.is_pinned);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-sans font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-left cursor-pointer"
                          >
                            <svg
                              className="h-3 w-3 text-[var(--coral)]"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                            </svg>
                            <span>{item.is_pinned ? "Unpin" : "Pin"}</span>
                          </button>
                        )}

                        {/* Archive / Unarchive */}
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuId(null);
                            await archiveNote(item.id, !item.is_archived);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-sans font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-left cursor-pointer"
                        >
                          <svg
                            className="h-3 w-3 text-[var(--text-muted)]"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="21 8 21 21 3 21 3 8" />
                            <rect x="1" y="3" width="22" height="5" />
                            <line x1="10" y1="12" x2="14" y2="12" />
                          </svg>
                          <span>{item.is_archived ? "Unarchive" : "Archive"}</span>
                        </button>

                        <div className="my-1 border-t border-[var(--border)]/60" />

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuId(null);
                            setNoteToDelete(item);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-sans font-medium text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors text-left cursor-pointer"
                        >
                          <svg
                            className="h-3 w-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* BOTTOM: Architecture & GitHub */}
        <div className="relative z-10 border-t border-[var(--border)] p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex flex-col gap-0.5 text-xs font-sans shrink-0">
          <Link
            href="/architecture"
            onClick={onClose}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
              pathname === "/architecture"
                ? "bg-[var(--surface-hover)] text-[var(--coral)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
            }`}
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
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span className="font-medium text-xs">Architecture</span>
          </Link>

          <a
            href="https://github.com/kanishka5268/Voxa-audio-notes-platform"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors font-medium text-xs"
          >
            <span className="flex items-center gap-2">
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
              <span>GitHub</span>
            </span>
            <span className="text-[11px] font-sans text-[var(--text-muted)]">↗</span>
          </a>
        </div>
      </aside>
    </>
  );
}
