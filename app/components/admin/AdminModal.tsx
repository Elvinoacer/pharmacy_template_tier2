"use client";

import { useEffect, useRef } from "react";

/** Native modality provides focus containment, Escape, and focus restoration. */
export function AdminModal({ children, label, onClose, className = "" }: {
  children: React.ReactNode; label: string; onClose: () => void; className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => {
      element?.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialog} aria-label={label} className={`admin-modal ${className}`} onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}
