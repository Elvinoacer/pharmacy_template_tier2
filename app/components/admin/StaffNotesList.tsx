"use client";

/**
 * Staff notes panel with drag-and-drop reordering.
 *
 * - Pinned notes always appear first (and within pinned, by sortOrder).
 * - Drag the handle to reorder; on drop, we POST the new order to /api/admin/notes/reorder.
 * - "Pin to top" toggle per note.
 */

import { useState, useTransition } from "react";
import { Pin, GripVertical, Trash2 } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { formatDateTime } from "@/app/lib/time";

type Note = {
  id: string;
  body: string;
  isPinned: boolean;
  sortOrder: number;
  createdAt: string;
  authorEmail: string | null;
};

export function StaffNotesList({
  notes: initialNotes,
  customerId,
}: {
  notes: Note[];
  customerId: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Sort: pinned first, then by sortOrder, then by createdAt desc.
  const sorted = [...notes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  async function togglePin(id: string) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const next = !note.isPinned;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isPinned: next } : n)));
    try {
      const r = await fetch("/api/admin/notes/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isPinned: next }),
      });
      if (!r.ok) throw new Error();
      toast.success(next ? "Pinned to top." : "Unpinned.");
    } catch {
      toast.error("Could not update pin.");
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isPinned: !next } : n)));
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      const r = await fetch("/api/admin/notes/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error();
      toast.success("Note deleted.");
    } catch {
      toast.error("Could not delete note.");
      setNotes(initialNotes);
    }
  }

  function onDragStart(id: string) {
    setDragging(id);
  }
  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    setDragOver(id);
  }
  function onDrop(targetId: string) {
    if (!dragging || dragging === targetId) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    const from = sorted.findIndex((n) => n.id === dragging);
    const to = sorted.findIndex((n) => n.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...sorted];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // Reassign sortOrder.
    const reordered = next.map((n, i) => ({ ...n, sortOrder: i }));
    setNotes(reordered);
    setDragging(null);
    setDragOver(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/notes/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            order: reordered.map((n) => n.id),
          }),
        });
        if (!r.ok) throw new Error();
        toast.success("Order saved.");
      } catch {
        toast.error("Could not save order.");
      }
    });
  }

  if (sorted.length === 0) {
    return (
      <p className="py-4 text-center text-xs admin-soft">No notes yet. Add one above.</p>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {sorted.map((n) => (
        <li
          key={n.id}
          draggable
          onDragStart={() => onDragStart(n.id)}
          onDragOver={(e) => onDragOver(e, n.id)}
          onDrop={() => onDrop(n.id)}
          onDragEnd={() => {
            setDragging(null);
            setDragOver(null);
          }}
          className={`group flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
            n.isPinned
              ? "bg-amber-400/10 border border-amber-400/20"
              : "bg-[var(--admin-inset)]"
          } ${dragging === n.id ? "note-dragging" : ""} ${
            dragOver === n.id && dragging !== n.id ? "note-drag-over" : ""
          }`}
        >
          <span
            className="note-drag-handle mt-0.5 admin-soft opacity-0 transition group-hover:opacity-100"
            title="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            {n.isPinned && (
              <span className="mb-1 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </span>
            )}
            <p className="whitespace-pre-wrap admin-text/90">{n.body}</p>
            <p className="mt-1 text-xs admin-soft">
              {n.authorEmail || "Unknown"} · {formatDateTime(n.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={() => togglePin(n.id)}
              className={`rounded-full p-1 transition ${
                n.isPinned
                  ? "text-amber-600 hover:bg-amber-500/10"
                  : "admin-soft hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
              }`}
              title={n.isPinned ? "Unpin" : "Pin to top"}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => deleteNote(n.id)}
              className="rounded-full p-1 admin-soft transition hover:bg-rose-500/10 hover:text-rose-600"
              title="Delete note"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

