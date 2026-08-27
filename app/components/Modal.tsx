"use client";

/**
 * Reusable Modal component. Renders a backdrop + centered card with
 * close-on-esc + close-on-backdrop-click. Used for notification detail
 * views, confirmation dialogs, and the like.
 */

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal-card ${maxWidth}`}>
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-[#e3ebe6] px-5 py-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[#0c1a14]">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1 text-[#8a9a92] transition hover:bg-[#f4f7f4] hover:text-[#0c1a14]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-[#0c1a14]">
          {children}
        </div>
        {footer && (
          <div className="border-t border-[#e3ebe6] px-5 py-3 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
