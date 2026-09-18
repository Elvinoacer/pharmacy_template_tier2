"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useId,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  ArrowRight,
  Pin,
  PinOff,
  Clock,
  Command,
  CornerDownLeft,
  X,
  Bot,
  Layers,
  ChevronRight,
} from "lucide-react";
import type { SessionUser } from "@/app/lib/types";
import {
  type WorkspaceRole,
  type NavigationDestination,
  type SearchMatch,
  searchWorkspace,
  getContextualActions,
  getDestinationsForRole,
} from "@/app/lib/navigation/workspace-registry";
import { WorkspaceIcon } from "./WorkspaceIcons";
import { useNavigationProgress } from "./NavigationProgress";
import { useAppTheme } from "../ThemeProvider";

type RecentItem = {
  href: string;
  label: string;
  icon: string;
  visitedAt: number;
};

export function CommandCenter({
  role,
  user,
  currentPath,
  placeholder = "What do you want to do? (⌘K)",
  triggerClassName = "",
}: {
  role: WorkspaceRole;
  user: SessionUser;
  currentPath: string;
  placeholder?: string;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const { startNavigation, stage, targetHref } = useNavigationProgress();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pinned, setPinned] = useState<string[]>([]);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiActions, setAiActions] = useState<{ label: string; href: string; description?: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const pinnedKey = `afyvia:pinned:${role}`;
  const recentsKey = `afyvia:recents:${role}`;

  // Hydrate pinned and recents from localStorage
  useEffect(() => {
    try {
      const storedPinned = localStorage.getItem(pinnedKey);
      if (storedPinned) {
        const parsed = JSON.parse(storedPinned);
        if (Array.isArray(parsed)) setPinned(parsed);
      }

      const storedRecents = localStorage.getItem(recentsKey);
      if (storedRecents) {
        const parsed = JSON.parse(storedRecents);
        if (Array.isArray(parsed)) setRecents(parsed.slice(0, 5));
      }
    } catch {
      /* ignore */
    }
  }, [pinnedKey, recentsKey]);

  // Record current page visit in recents
  useEffect(() => {
    if (!currentPath) return;
    const all = getDestinationsForRole(role, user);
    const currentDest = all.find((d) => d.href === currentPath);
    if (!currentDest) return;

    try {
      const stored = localStorage.getItem(recentsKey);
      let list: RecentItem[] = stored ? JSON.parse(stored) : [];
      list = list.filter((item) => item.href !== currentPath);
      list.unshift({
        href: currentDest.href,
        label: currentDest.label,
        icon: currentDest.icon,
        visitedAt: Date.now(),
      });
      list = list.slice(0, 8);
      localStorage.setItem(recentsKey, JSON.stringify(list));
      setRecents(list.slice(0, 5));
    } catch {
      /* ignore */
    }
  }, [currentPath, role, user, recentsKey]);

  const togglePin = useCallback(
    (href: string, event?: React.MouseEvent) => {
      event?.preventDefault();
      event?.stopPropagation();
      setPinned((prev) => {
        const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href];
        try {
          localStorage.setItem(pinnedKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [pinnedKey],
  );

  const openDialog = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    setIsAiMode(false);
    setAiAnswer(null);
    setAiActions([]);
    setIsOpen(true);
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
  }, []);

  const closeDialog = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialogRef.current?.open) {
          closeDialog();
        } else {
          openDialog();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openDialog, closeDialog]);

  // Contextual actions for current route
  const contextualActions = getContextualActions(currentPath, role, user);

  // Deterministic search results
  const searchResults: SearchMatch[] = query.trim()
    ? searchWorkspace(query, role, user, currentPath)
    : [];

  // Pinned destinations
  const allDestinations = getDestinationsForRole(role, user);
  const pinnedDestinations = allDestinations.filter((d) => pinned.includes(d.href));

  // Flattened actionable list for keyboard navigation
  type ActionableItem = {
    id: string;
    label: string;
    description?: string;
    href: string;
    icon: string;
    category: "context" | "search" | "pinned" | "recent" | "ai";
    badge?: string;
  };

  const actionableItems: ActionableItem[] = [];

  if (query.trim()) {
    const q = query.trim().toLowerCase();
    const isThemeQuery =
      q === "theme" ||
      q === "dark" ||
      q === "light" ||
      q === "mode" ||
      q.includes("theme") ||
      q.includes("dark mode") ||
      q.includes("light mode") ||
      q.includes("toggle theme") ||
      q.includes("switch theme");

    if (isThemeQuery) {
      if (theme.resolved === "dark") {
        actionableItems.push({
          id: "cmd-theme-light",
          label: "Switch to Light Theme",
          description: "Change workspace appearance to clean clinical light theme",
          href: "#switch-theme-light",
          icon: "Sun",
          category: "context",
          badge: "Appearance",
        });
      } else {
        actionableItems.push({
          id: "cmd-theme-dark",
          label: "Switch to Dark Theme",
          description: "Change workspace appearance to cool charcoal dark theme",
          href: "#switch-theme-dark",
          icon: "Moon",
          category: "context",
          badge: "Appearance",
        });
      }

      if (theme.mode !== "system") {
        actionableItems.push({
          id: "cmd-theme-system",
          label: "Use System Theme",
          description: "Sync workspace appearance automatically with your OS preference",
          href: "#switch-theme-system",
          icon: "Monitor",
          category: "context",
          badge: "Appearance",
        });
      }
    }

    // Show search results first
    for (const match of searchResults) {
      actionableItems.push({
        id: `search-${match.destination.id}`,
        label: match.destination.label,
        description: match.destination.description,
        href: match.destination.href,
        icon: match.destination.icon,
        category: "search",
        badge: match.matchType === "intent" ? "Suggested task" : undefined,
      });
    }

    // Add "Ask Afyvia" action when query exists
    actionableItems.push({
      id: "action-ask-afyvia",
      label: `Ask Afyvia: “${query}”`,
      description: "Ask AI for workflow guidance, drug interactions, or navigation help",
      href: "#ask-afyvia",
      icon: "Sparkles",
      category: "ai",
      badge: "AI Assist",
    });
  } else {
    // When query is empty, show:
    // 1. Contextual actions for this screen
    for (const action of contextualActions) {
      actionableItems.push({
        id: `ctx-${action.id}`,
        label: action.label,
        description: action.description,
        href: action.href,
        icon: action.icon,
        category: "context",
        badge: "Here & now",
      });
    }

    // 2. Pinned destinations
    for (const dest of pinnedDestinations) {
      actionableItems.push({
        id: `pinned-${dest.id}`,
        label: dest.label,
        description: dest.description,
        href: dest.href,
        icon: dest.icon,
        category: "pinned",
        badge: "Pinned",
      });
    }

    // 3. Recent locations
    for (const recent of recents) {
      if (!pinned.includes(recent.href) && recent.href !== currentPath) {
        actionableItems.push({
          id: `recent-${recent.href}`,
          label: recent.label,
          description: "Recently visited",
          href: recent.href,
          icon: recent.icon,
          category: "recent",
        });
      }
    }
  }

  // Handle Ask Afyvia natural language inquiry
  const handleAskAfyvia = async (text: string) => {
    setIsAiMode(true);
    setAiLoading(true);
    setAiAnswer(null);
    setAiActions([]);

    try {
      const res = await fetch("/api/workspace/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          role,
          currentPath,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnswer(data.message || "I’ve checked your request.");
        if (Array.isArray(data.suggestedActions)) {
          setAiActions(data.suggestedActions);
        }
      } else {
        setAiAnswer(
          `To manage "${text}", use the search options above or select the corresponding task from your workspace rail.`
        );
      }
    } catch {
      setAiAnswer(
        `Unable to reach assistant right now. You can navigate directly using the results list.`
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectItem = (item: ActionableItem) => {
    if (item.category === "ai" || item.href === "#ask-afyvia") {
      void handleAskAfyvia(query);
      return;
    }

    if (item.href === "#switch-theme-light") {
      theme.setTheme("light");
      closeDialog();
      return;
    }
    if (item.href === "#switch-theme-dark") {
      theme.setTheme("dark");
      closeDialog();
      return;
    }
    if (item.href === "#switch-theme-system") {
      theme.setTheme("system");
      closeDialog();
      return;
    }

    startNavigation(item.href, item.label);
    closeDialog();
    router.push(item.href);
  };

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, actionableItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + actionableItems.length) % Math.max(1, actionableItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (actionableItems[selectedIndex]) {
        handleSelectItem(actionableItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeDialog();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeEl = list.children[selectedIndex] as HTMLElement | undefined;
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <>
      {/* Prominent Header Command Bar Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        aria-label="Open Afyvia Command Workspace (Press Command or Control K)"
        className={`afyvia-command-bar-trigger ${triggerClassName}`}
      >
        <span className="afyvia-command-bar-icon-wrap">
          <Search size={16} className="text-[var(--admin-accent)] shrink-0" aria-hidden />
        </span>
        <span className="afyvia-command-bar-text truncate">{placeholder}</span>
        <span className="afyvia-command-bar-kbd">
          <kbd aria-hidden>⌘</kbd>
          <kbd aria-hidden>K</kbd>
        </span>
      </button>

      {/* Modern Dialog Command Center Modal */}
      <dialog
        ref={dialogRef}
        closedby="any"
        aria-label="Afyvia Command Center"
        className="afyvia-command-dialog"
        onClose={() => setIsOpen(false)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickedInDialog =
            rect.top <= e.clientY &&
            e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX &&
            e.clientX <= rect.left + rect.width;
          if (!clickedInDialog) {
            closeDialog();
          }
        }}
      >
        <div className="afyvia-command-card">
          {/* Search Input Surface */}
          <div className="afyvia-command-input-row">
            <Search size={20} className="text-[var(--admin-accent)] shrink-0" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-controls="afyvia-command-results-list"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
                setIsAiMode(false);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a task, medicine, patient, or 'Ask Afyvia'…"
              className="afyvia-command-input"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSelectedIndex(0);
                  setIsAiMode(false);
                  inputRef.current?.focus();
                }}
                className="afyvia-command-clear-btn"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={closeDialog}
              className="afyvia-command-close-btn"
              aria-label="Close command center"
            >
              <kbd>ESC</kbd>
            </button>
          </div>

          {/* AI Response Panel if activated */}
          {isAiMode && (
            <div className="afyvia-ai-panel">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={18} className="text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                  Afyvia Command Assistant
                </span>
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-3 py-2 text-sm text-[var(--admin-text-muted)]">
                  <span className="afyvia-pulse-dot" />
                  <span>Checking clinical and workflow context…</span>
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-[var(--admin-text)]">
                    {aiAnswer}
                  </p>
                  {aiActions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-[var(--admin-border)]">
                      {aiActions.map((action) => (
                        <button
                          key={action.href}
                          type="button"
                          onClick={() => {
                            startNavigation(action.href, action.label);
                            closeDialog();
                            router.push(action.href);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--admin-accent-soft)] hover:bg-[var(--admin-hover)] text-xs font-semibold text-[var(--admin-accent-text)] border border-[var(--admin-accent-soft)] transition cursor-pointer"
                        >
                          <span>{action.label}</span>
                          <ArrowRight size={13} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Results / Suggestions Surface */}
          <div className="afyvia-command-results-body">
            <ul
              ref={listRef}
              id="afyvia-command-results-list"
              role="listbox"
              className="afyvia-command-list"
            >
              {actionableItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                const isPinnedItem = pinned.includes(item.href);
                const isPending = targetHref === item.href && stage !== "idle";

                return (
                  <li
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    className={`afyvia-command-item ${isSelected ? "selected" : ""} ${isPending ? "is-navigating-pending" : ""}`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => handleSelectItem(item)}
                  >
                    <span className="afyvia-command-item-icon">
                      <WorkspaceIcon name={item.icon} size={18} />
                    </span>

                    <div className="afyvia-command-item-content">
                      <div className="flex items-center gap-2">
                        <span className="afyvia-command-item-label">{item.label}</span>
                        {item.badge && (
                          <span className="afyvia-command-item-badge">{item.badge}</span>
                        )}
                      </div>
                      {item.description && (
                        <p className="afyvia-command-item-desc">{item.description}</p>
                      )}
                    </div>

                    <div className="afyvia-command-item-actions">
                      {item.href !== "#ask-afyvia" && !item.href.startsWith("#switch-theme") && (
                        <button
                          type="button"
                          onClick={(e) => togglePin(item.href, e)}
                          className={`afyvia-command-pin-btn ${isPinnedItem ? "pinned" : ""}`}
                          aria-label={isPinnedItem ? "Unpin location" : "Pin location"}
                          title={isPinnedItem ? "Unpin" : "Pin"}
                        >
                          <Pin size={14} />
                        </button>
                      )}
                      <span className="afyvia-command-enter-hint" aria-hidden>
                        <CornerDownLeft size={13} />
                      </span>
                    </div>
                  </li>
                );
              })}

              {actionableItems.length === 0 && (
                <div className="afyvia-command-empty">
                  <p className="font-semibold text-sm">No direct tasks match “{query}”</p>
                  <p className="text-xs text-[var(--admin-text-muted)] mt-1">
                    Try asking Afyvia or browsing categories in the workspace rail.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleAskAfyvia(query)}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--admin-accent-soft)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-accent-text)] hover:bg-[var(--admin-hover)]"
                  >
                    <Sparkles size={15} />
                    Ask Afyvia for assistance
                  </button>
                </div>
              )}
            </ul>
          </div>

          {/* Footer keyboard hints */}
          <div className="afyvia-command-footer">
            <div className="flex items-center gap-4 text-xs text-[var(--admin-text-soft)]">
              <span className="flex items-center gap-1">
                <kbd>↑</kbd> <kbd>↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd>↵</kbd> Select
              </span>
              <span className="flex items-center gap-1">
                <kbd>esc</kbd> Dismiss
              </span>
            </div>
            <span className="text-[11px] text-[var(--admin-text-soft)] font-medium">
              Afyvia Command Workspace
            </span>
          </div>
        </div>
      </dialog>
    </>
  );
}
