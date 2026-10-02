"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface NoteSummaryItem {
  id: string;
  file_name: string;
  file_size?: number;
  status: "uploaded" | "transcribing" | "summarizing" | "completed" | "failed" | string;
  progress: number;
  summary?: string | null;
  language_code?: string | null;
  error_message?: string | null;
  is_pinned?: boolean;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface NotesContextType {
  notes: NoteSummaryItem[];
  archivedNotes: NoteSummaryItem[];
  isLoading: boolean;
  isArchivedLoading: boolean;
  error: string | null;
  refreshNotes: () => Promise<void>;
  refreshArchivedNotes: () => Promise<void>;
  pinNote: (id: string, isPinned: boolean) => Promise<boolean>;
  archiveNote: (id: string, isArchived: boolean) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  removeNoteLocally: (id: string) => void;
  upsertNote: (note: Partial<NoteSummaryItem> & { id: string }) => void;
  activeProcessingStatus: string;
  setActiveProcessingStatus: (status: string) => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const sortNotes = (items: NoteSummaryItem[]): NoteSummaryItem[] => {
  return [...items].sort((a, b) => {
    const aPinned = a.is_pinned ? 1 : 0;
    const bPinned = b.is_pinned ? 1 : 0;
    if (aPinned !== bPinned) {
      return bPinned - aPinned;
    }
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
};

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<NoteSummaryItem[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<NoteSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isArchivedLoading, setIsArchivedLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeProcessingStatus, setActiveProcessingStatus] = useState<string>("idle");

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const refreshNotes = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/audio/notes`);
      if (res.ok) {
        const data: NoteSummaryItem[] = await res.json();
        setNotes(sortNotes(data));
        setError(null);
      } else {
        setError(`Failed to load notes (HTTP ${res.status})`);
      }
    } catch {
      setError("Unable to connect to backend server.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  const refreshArchivedNotes = useCallback(async () => {
    setIsArchivedLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/audio/notes?archived=true`);
      if (res.ok) {
        const data: NoteSummaryItem[] = await res.json();
        setArchivedNotes(sortNotes(data));
      }
    } catch {
      // Ignored non-fatal refresh
    } finally {
      setIsArchivedLoading(false);
    }
  }, [apiBaseUrl]);

  const removeNoteLocally = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setArchivedNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const pinNote = useCallback(
    async (id: string, isPinned: boolean): Promise<boolean> => {
      // Optimistic update
      setNotes((prev) =>
        sortNotes(
          prev.map((n) => (n.id === id ? { ...n, is_pinned: isPinned } : n))
        )
      );

      try {
        const res = await fetch(`${apiBaseUrl}/api/audio/notes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_pinned: isPinned }),
        });

        if (!res.ok) {
          throw new Error("Failed to update pin state.");
        }
        const updated: NoteSummaryItem = await res.json();
        setNotes((prev) =>
          sortNotes(
            prev.map((n) => (n.id === id ? { ...n, ...updated } : n))
          )
        );
        return true;
      } catch (err) {
        console.error("Error pinning note:", err);
        refreshNotes();
        return false;
      }
    },
    [apiBaseUrl, refreshNotes]
  );

  const archiveNote = useCallback(
    async (id: string, isArchived: boolean): Promise<boolean> => {
      // Optimistic update
      if (isArchived) {
        const target = notes.find((n) => n.id === id);
        setNotes((prev) => prev.filter((n) => n.id !== id));
        if (target) {
          setArchivedNotes((prev) =>
            sortNotes([{ ...target, is_archived: true }, ...prev])
          );
        }
      } else {
        const target = archivedNotes.find((n) => n.id === id);
        setArchivedNotes((prev) => prev.filter((n) => n.id !== id));
        if (target) {
          setNotes((prev) =>
            sortNotes([{ ...target, is_archived: false }, ...prev])
          );
        }
      }

      try {
        const res = await fetch(`${apiBaseUrl}/api/audio/notes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_archived: isArchived }),
        });

        if (!res.ok) {
          throw new Error("Failed to update archive state.");
        }
        return true;
      } catch (err) {
        console.error("Error updating archive state:", err);
        refreshNotes();
        refreshArchivedNotes();
        return false;
      }
    },
    [apiBaseUrl, notes, archivedNotes, refreshNotes, refreshArchivedNotes]
  );

  const deleteNote = useCallback(
    async (id: string): Promise<boolean> => {
      // Optimistic removal
      removeNoteLocally(id);

      try {
        const res = await fetch(`${apiBaseUrl}/api/audio/notes/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Failed to delete note.");
        }
        return true;
      } catch (err) {
        console.error("Error deleting note:", err);
        refreshNotes();
        refreshArchivedNotes();
        return false;
      }
    },
    [apiBaseUrl, removeNoteLocally, refreshNotes, refreshArchivedNotes]
  );

  const upsertNote = useCallback(
    (updatedNote: Partial<NoteSummaryItem> & { id: string }) => {
      setNotes((prevNotes) => {
        const index = prevNotes.findIndex((n) => n.id === updatedNote.id);
        if (index >= 0) {
          const next = [...prevNotes];
          next[index] = { ...next[index], ...updatedNote } as NoteSummaryItem;
          return sortNotes(next);
        }
        return sortNotes([updatedNote as NoteSummaryItem, ...prevNotes]);
      });
    },
    []
  );

  useEffect(() => {
    refreshNotes();
    refreshArchivedNotes();
  }, [refreshNotes, refreshArchivedNotes]);

  return (
    <NotesContext.Provider
      value={{
        notes,
        archivedNotes,
        isLoading,
        isArchivedLoading,
        error,
        refreshNotes,
        refreshArchivedNotes,
        pinNote,
        archiveNote,
        deleteNote,
        removeNoteLocally,
        upsertNote,
        activeProcessingStatus,
        setActiveProcessingStatus,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider");
  }
  return context;
}
