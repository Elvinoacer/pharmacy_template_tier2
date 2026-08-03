"use client";

import { useState, useTransition } from "react";
import { toast } from "@/app/components/Toaster";
import { Pencil, Save, Merge } from "lucide-react";

type Cat = { name: string; count: number };

export function CategoryManager({ initial }: { initial: Cat[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [mergeFrom, setMergeFrom] = useState("");
  const [mergeTo, setMergeTo] = useState("");
  const [pending, startTransition] = useTransition();

  function startEdit(name: string) {
    setEditing(name);
    setNewName(name);
  }

  async function rename(oldName: string) {
    const next = newName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!next || next === oldName) {
      setEditing(null);
      return;
    }
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/medications/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rename", from: oldName, to: next }),
        });
        if (!r.ok) throw new Error();
        toast.success(`Renamed "${oldName}" → "${next}".`);
        setRows((prev) =>
          prev
            .map((c) => (c.name === oldName ? { ...c, name: next } : c))
            .reduce<Cat[]>((acc, c) => {
              const existing = acc.find((x) => x.name === c.name);
              if (existing) existing.count += c.count;
              else acc.push({ ...c });
              return acc;
            }, [])
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        setEditing(null);
      } catch {
        toast.error("Could not rename category.");
      }
    });
  }

  async function merge() {
    if (!mergeFrom || !mergeTo || mergeFrom === mergeTo) {
      toast.error("Pick two different categories to merge.");
      return;
    }
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/medications/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rename", from: mergeFrom, to: mergeTo }),
        });
        if (!r.ok) throw new Error();
        toast.success(`Merged "${mergeFrom}" into "${mergeTo}".`);
        window.location.reload();
      } catch {
        toast.error("Could not merge categories.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-2">
        {rows.map((c) => (
          <li
            key={c.name}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-2.5"
          >
            {editing === c.name ? (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input-admin max-w-xs"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => rename(c.name)}
                  className="btn-admin-sm"
                >
                  <Save className="h-3 w-3" /> Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-xs admin-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div>
                  <p className="font-semibold admin-text">{c.name.replace(/-/g, " ")}</p>
                  <p className="text-[10px] font-mono admin-soft">{c.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-[10px] admin-muted">
                    {c.count} med{c.count === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(c.name)}
                    className="rounded-full p-1.5 admin-soft hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-dashed border-[var(--admin-border)] p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide admin-soft">
          <Merge className="mr-1 inline h-3 w-3" /> Merge categories
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label-admin">From</label>
            <select
              value={mergeFrom}
              onChange={(e) => setMergeFrom(e.target.value)}
              className="input-admin"
            >
              <option value="">Select…</option>
              {rows.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-admin">Into</label>
            <select
              value={mergeTo}
              onChange={(e) => setMergeTo(e.target.value)}
              className="input-admin"
            >
              <option value="">Select…</option>
              {rows.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={merge}
            className="btn-admin-sm"
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}
