"use client";

/**
 * Lightweight, dependency-free Markdown → HTML renderer.
 *
 * Covers the complete set of Markdown features needed across chat,
 * notifications, patient portal, campaign templates, and admin views:
 *
 *   - Headings (#, ##, ###, ####, #####, ######)
 *   - Bold (**text** or __text__) and italic (*text* or _text_)
 *   - Strikethrough (~~text~~)
 *   - Inline code (`code`)
 *   - Fenced multi-line code blocks (```lang ... ```)
 *   - Tables (| Col 1 | Col 2 | with alignment :--- / :---: / ---:)
 *   - Unordered lists (- item, * item, + item)
 *   - Ordered lists (1. item, 2. item)
 *   - Links [text](url) — supports https://, mailto:, tel:, and internal routes (/refill, /medicines, etc.)
 *   - Standalone internal path detection (/refill, /delivery, etc.)
 *   - Blockquotes (> quote)
 *   - Horizontal rules (---, ***, ___)
 *   - Paragraphs and clean line breaks
 *
 * Output is sanitised against an allowlist — no <script>, no inline event handlers.
 * Safe to render with dangerouslySetInnerHTML.
 */

import { useMemo } from "react";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const INTERNAL_PATHS = [
  "refill",
  "delivery",
  "contact",
  "services",
  "faq",
  "health",
  "careers",
  "about",
  "medicines",
  "order",
  "portal",
  "search",
  "how-do-you-feel",
  "prescriptions",
  "catalog",
];

const INTERNAL_PATH_REGEX = new RegExp(
  `(^|[^"'=\\w/])(/(${INTERNAL_PATHS.join("|")})(?:/[\\w-]*)*(?:\\?[\\w=&%-]*)?(?:#[\\w-]*)?)`,
  "gi"
);

function isSafeUrl(url: string): boolean {
  if (!url) return false;
  if (/^https?:\/\//i.test(url)) return true;
  if (/^mailto:/i.test(url)) return true;
  if (/^tel:/i.test(url)) return true;
  if (/^\/(?!\/)/.test(url)) return true; // Relative internal path starting with a single slash
  if (/^#/.test(url)) return true;
  return false;
}

export function renderInline(text: string, enableAutoLinkPaths = true): string {
  let t = escapeHtml(text);

  // Store inline code to prevent Markdown parsing inside code blocks
  const codeBlocks: string[] = [];
  t = t.replace(/`([^`]+)`/g, (_match, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<code class="md-code">${code}</code>`);
    return `\uFFF0MDCODE${idx}\uFFF0`;
  });

  // Markdown links: [text](url)
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label, url) => {
    if (isSafeUrl(url)) {
      const isInternal = url.startsWith("/") || url.startsWith("#");
      const targetAttr = isInternal ? "" : ' target="_blank" rel="noopener noreferrer"';
      const linkClass = isInternal ? "md-link chat-path-link" : "md-link";
      return `<a href="${url}"${targetAttr} class="${linkClass}">${label}</a>`;
    }
    return label;
  });

  // Auto-link standalone URLs (http/https) not already part of an anchor
  t = t.replace(/(^|[^\w"'>])(https?:\/\/[^\s<)]+)/g, (_match, prefix, url) => {
    return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" class="md-link">${url}</a>`;
  });

  // Auto-link internal pharmacy routes if enabled
  if (enableAutoLinkPaths) {
    t = t.replace(INTERNAL_PATH_REGEX, (_match, prefix, path) => {
      return `${prefix}<a href="${path}" class="md-link chat-path-link">${path}</a>`;
    });
  }

  // Bold & Italic (***text*** or ___text___)
  t = t.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  t = t.replace(/___([^_]+)___/g, "<strong><em>$1</em></strong>");

  // Bold (**text** or __text__)
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic (*text* or _text_)
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  t = t.replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");

  // Strikethrough (~~text~~)
  t = t.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // Restore inline code blocks
  t = t.replace(/\uFFF0MDCODE(\d+)\uFFF0/g, (_match, idx) => codeBlocks[Number(idx)] || "");

  return t;
}

function parseTableAlignments(dividerLine: string): string[] {
  const cells = dividerLine.split("|").slice(1, -1);
  return cells.map((cell) => {
    const trimmed = cell.trim();
    const left = trimmed.startsWith(":");
    const right = trimmed.endsWith(":");
    if (left && right) return "text-center";
    if (right) return "text-right";
    return "text-left";
  });
}

export interface MarkdownOptions {
  autoLinkPaths?: boolean;
}

export function renderMarkdown(src: string, options: MarkdownOptions = { autoLinkPaths: true }): string {
  if (!src) return "";
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;
  let inQuote = false;
  let paragraph: string[] = [];

  const autoLinkPaths = options.autoLinkPaths ?? true;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${renderInline(paragraph.join(" "), autoLinkPaths)}</p>`);
      paragraph = [];
    }
  };
  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      out.push("</blockquote>");
      inQuote = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — flush everything.
    if (/^\s*$/.test(line)) {
      flushParagraph();
      closeLists();
      closeQuote();
      i++;
      continue;
    }

    // Fenced code block (```lang ... ```)
    const codeFenceMatch = line.match(/^```(\w+)?\s*$/);
    if (codeFenceMatch) {
      flushParagraph();
      closeLists();
      closeQuote();
      const lang = codeFenceMatch[1] ? ` language-${escapeHtml(codeFenceMatch[1])}` : "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      const rawCode = codeLines.join("\n");
      out.push(`<pre class="md-pre"><code class="md-code-block${lang}">${escapeHtml(rawCode)}</code></pre>`);
      i++; // Skip closing ```
      continue;
    }

    // Markdown Table Check
    if (
      line.trim().startsWith("|") &&
      line.trim().endsWith("|") &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith("|") &&
      /^\|(\s*:?-+:?\s*\|)+$/.test(lines[i + 1].trim())
    ) {
      flushParagraph();
      closeLists();
      closeQuote();

      const headerRow = line.trim();
      const dividerRow = lines[i + 1].trim();
      const aligns = parseTableAlignments(dividerRow);
      const headerCells = headerRow.split("|").slice(1, -1);

      let tableHtml = '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
      headerCells.forEach((cell, idx) => {
        const alignClass = aligns[idx] || "text-left";
        tableHtml += `<th class="md-th ${alignClass}">${renderInline(cell.trim(), autoLinkPaths)}</th>`;
      });
      tableHtml += "</tr></thead><tbody>";

      i += 2; // skip header and divider

      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        const rowCells = lines[i].trim().split("|").slice(1, -1);
        tableHtml += "<tr>";
        rowCells.forEach((cell, idx) => {
          const alignClass = aligns[idx] || "text-left";
          tableHtml += `<td class="md-td ${alignClass}">${renderInline(cell.trim(), autoLinkPaths)}</td>`;
        });
        tableHtml += "</tr>";
        i++;
      }

      tableHtml += "</tbody></table></div>";
      out.push(tableHtml);
      continue;
    }

    // Horizontal rule (--- or *** or ___)
    if (/^\s*([-*_]){3,}\s*$/.test(line)) {
      flushParagraph();
      closeLists();
      closeQuote();
      out.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    // Heading (# to ######)
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushParagraph();
      closeLists();
      closeQuote();
      const level = h[1].length;
      out.push(`<h${level} class="md-h md-h${level}">${renderInline(h[2], autoLinkPaths)}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote (> quote)
    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      closeLists();
      if (!inQuote) {
        out.push('<blockquote class="md-quote">');
        inQuote = true;
      }
      out.push(`<p>${renderInline(line.replace(/^\s*>\s?/, ""), autoLinkPaths)}</p>`);
      i++;
      continue;
    } else if (inQuote) {
      closeQuote();
    }

    // Unordered list (- or * or +)
    if (/^\s*[-*+]\s+/.test(line)) {
      flushParagraph();
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul class="md-ul">');
        inUl = true;
      }
      out.push(`<li>${renderInline(line.replace(/^\s*[-*+]\s+/, ""), autoLinkPaths)}</li>`);
      i++;
      continue;
    }

    // Ordered list (1. item)
    if (/^\s*\d+\.\s+/.test(line)) {
      flushParagraph();
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol class="md-ol">');
        inOl = true;
      }
      out.push(`<li>${renderInline(line.replace(/^\s*\d+\.\s+/, ""), autoLinkPaths)}</li>`);
      i++;
      continue;
    }

    // Regular paragraph line
    closeLists();
    paragraph.push(line);
    i++;
  }

  flushParagraph();
  closeLists();
  closeQuote();
  return out.join("\n");
}

export function Markdown({
  children,
  className = "",
  autoLinkPaths = true,
}: {
  children: string;
  className?: string;
  autoLinkPaths?: boolean;
}) {
  const html = useMemo(() => renderMarkdown(children || "", { autoLinkPaths }), [children, autoLinkPaths]);
  return (
    <div
      className={`md-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
