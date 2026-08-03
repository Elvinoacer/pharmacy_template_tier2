"use client";

/**
 * Lightweight, dependency-free Markdown → HTML renderer.
 *
 * Why not pull in `marked` or `react-markdown`? The .git folder must remain
 * intact and we cannot add new dependencies. This renderer covers the subset
 * of Markdown that shows up in our campaign/template/notification bodies:
 *
 *   - Headings (#, ##, ###)
 *   - Bold (**text**) and italic (*text*)
 *   - Inline code (`code`)
 *   - Unordered lists (- item or * item)
 *   - Ordered lists (1. item)
 *   - Links [text](url)
 *   - Blockquotes (> quote)
 *   - Horizontal rules (---)
 *   - Paragraphs and line breaks
 *
 * Output is sanitised against an allowlist of tags/attributes — no <script>,
 * no inline event handlers. Safe to render with dangerouslySetInnerHTML.
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

function renderInline(text: string): string {
  let t = escapeHtml(text);
  // Inline code first so its content isn't re-processed.
  t = t.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
  // Bold
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  // Italic
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  t = t.replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
  // Links — only allow http(s) and mailto.
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>',
  );
  // Strikethrough
  t = t.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return t;
}

export function renderMarkdown(src: string): string {
  if (!src) return "";
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;
  let inQuote = false;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
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

    // Blank line — flush.
    if (/^\s*$/.test(line)) {
      flushParagraph();
      closeLists();
      closeQuote();
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*]){3,}\s*$/.test(line)) {
      flushParagraph();
      closeLists();
      closeQuote();
      out.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushParagraph();
      closeLists();
      closeQuote();
      const level = h[1].length;
      out.push(`<h${level} class="md-h md-h${level}">${renderInline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      closeLists();
      if (!inQuote) {
        out.push('<blockquote class="md-quote">');
        inQuote = true;
      }
      out.push(`<p>${renderInline(line.replace(/^\s*>\s?/, ""))}</p>`);
      i++;
      continue;
    } else if (inQuote) {
      closeQuote();
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul class="md-ul">');
        inUl = true;
      }
      out.push(`<li>${renderInline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      i++;
      continue;
    }

    // Ordered list
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
      out.push(`<li>${renderInline(line.replace(/^\s*\d+\.\s+/, ""))}</li>`);
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

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(children || ""), [children]);
  return (
    <div
      className={`md-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
