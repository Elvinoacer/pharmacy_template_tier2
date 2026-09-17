"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Sparkles,
  Zap,
} from "lucide-react";
import type { SessionUser } from "@/app/lib/types";
import {
  type WorkspaceRole,
  type ContextualAction,
  getContextualActions,
} from "@/app/lib/navigation/workspace-registry";
import { WorkspaceIcon } from "./WorkspaceIcons";
import { useNavigationProgress } from "./NavigationProgress";

export function ContextualTaskSurface({
  role,
  user,
}: {
  role: WorkspaceRole;
  user: SessionUser;
}) {
  const pathname = usePathname();
  const { startNavigation } = useNavigationProgress();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const actions: ContextualAction[] = getContextualActions(pathname, role, user);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // If no contextual actions apply to this path, don't render anything
  if (actions.length === 0) return null;

  // Split into primary (first 3) and secondary (remainder) for progressive disclosure
  const primaryActions = actions.slice(0, 3);
  const secondaryActions = actions.slice(3);

  return (
    <nav
      aria-label="Contextual task surface"
      className="aether-contextual-surface"
    >
      <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-[var(--admin-accent-text)] pr-2 border-r border-[var(--admin-border)]">
        <Zap size={14} className="text-[var(--admin-accent)]" />
        <span className="hidden sm:inline">Tasks:</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
        {primaryActions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            onClick={() => startNavigation(action.href, action.label)}
            className={`aether-context-chip ${
              action.variant === "primary" ? "primary" : ""
            }`}
            title={action.description}
          >
            <WorkspaceIcon name={action.icon} size={14} />
            <span>{action.label}</span>
          </Link>
        ))}

        {/* Progressive disclosure dropdown for secondary actions */}
        {secondaryActions.length > 0 && (
          <div ref={menuRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className="aether-context-chip subtle"
            >
              <span>More</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <div className="aether-context-dropdown" role="menu">
                {secondaryActions.map((action) => (
                  <Link
                    key={action.id}
                    href={action.href}
                    role="menuitem"
                    onClick={() => {
                      startNavigation(action.href, action.label);
                      setMenuOpen(false);
                    }}
                    className="aether-context-dropdown-item"
                  >
                    <WorkspaceIcon name={action.icon} size={15} />
                    <div>
                      <p className="font-semibold text-xs leading-none">{action.label}</p>
                      <p className="text-[11px] text-[var(--admin-text-muted)] mt-0.5">
                        {action.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
