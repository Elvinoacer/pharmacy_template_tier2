import "server-only";

import { prisma } from "@/app/lib/db";

export type KnowledgeSnippet = {
  title: string;
  category: string;
  content: string;
};

const MAX_QUERY_LEN = 200;
const DEFAULT_LIMIT = 4;
const HARD_LIMIT = 6;
const CONTENT_MAX = 700;

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "do",
  "does",
  "did",
  "can",
  "could",
  "would",
  "should",
  "i",
  "me",
  "my",
  "we",
  "you",
  "your",
  "it",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "and",
  "or",
  "but",
  "with",
  "about",
  "from",
  "what",
  "when",
  "where",
  "who",
  "how",
  "why",
  "please",
  "tell",
  "need",
  "want",
  "have",
  "has",
  "any",
  "some",
]);

function truncate(text: string, max = CONTENT_MAX): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Extract meaningful tokens for keyword matching. */
export function extractSearchTokens(raw: string): string[] {
  const cleaned = raw
    .toLowerCase()
    .slice(0, MAX_QUERY_LEN)
    .replace(/[^a-z0-9\s-]/g, " ");
  const tokens = cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
  // de-dupe, keep order
  return [...new Set(tokens)].slice(0, 8);
}

function scoreArticle(
  article: { title: string; category: string; content: string; tags: string[]; priority: number },
  tokens: string[],
  fullQuery: string,
): number {
  if (tokens.length === 0 && !fullQuery) return 0;

  const title = article.title.toLowerCase();
  const category = article.category.toLowerCase();
  const content = article.content.toLowerCase();
  const tags = article.tags.map((t) => t.toLowerCase());
  const q = fullQuery.toLowerCase();

  let score = article.priority * 2;

  if (q.length >= 4) {
    if (title.includes(q)) score += 40;
    if (tags.some((t) => t.includes(q) || q.includes(t))) score += 25;
    if (content.includes(q)) score += 12;
    if (category.includes(q)) score += 8;
  }

  for (const token of tokens) {
    if (title.includes(token)) score += 14;
    if (tags.some((t) => t.includes(token))) score += 10;
    if (category.includes(token)) score += 6;
    if (content.includes(token)) score += 3;
  }

  return score;
}

/**
 * Return only the most relevant approved knowledge articles for a user question.
 * Never dumps the full knowledge base into the model context.
 */
export async function findRelevantKnowledge(
  rawQuery: string,
  limit = DEFAULT_LIMIT,
): Promise<KnowledgeSnippet[]> {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LEN);
  const take = Math.min(Math.max(1, limit), HARD_LIMIT);
  const tokens = extractSearchTokens(query);

  if (query.length < 2) return [];

  // Pull a bounded candidate set (approved only), then rank in-memory.
  // Avoids shipping every article into the LLM prompt.
  const candidates = await prisma.knowledgeArticle.findMany({
    where: { isApproved: true },
    select: {
      title: true,
      category: true,
      content: true,
      tags: true,
      priority: true,
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 40,
  });

  if (candidates.length === 0) return [];

  const ranked = candidates
    .map((a) => ({
      article: a,
      score: scoreArticle(a, tokens, query),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, take);

  // If nothing keyword-matched, fall back to top-priority approved snippets
  // only when the query looks policy/hours-ish — otherwise return empty
  // so we don't inject unrelated articles.
  if (ranked.length === 0) {
    const policyHints = /hour|open|close|deliver|insur|refill|pickup|pick-up|payment|mpesa|whatsapp|locat|address|contact|policy|return|vaccine|flu|loyalty/i;
    if (!policyHints.test(query)) return [];
    return candidates.slice(0, Math.min(2, take)).map((a) => ({
      title: a.title,
      category: a.category,
      content: truncate(a.content),
    }));
  }

  return ranked.map(({ article }) => ({
    title: article.title,
    category: article.category,
    content: truncate(article.content),
  }));
}

/** Explicit knowledge search for the AI tool (title/tag/content contains). */
export async function searchKnowledgeArticles(
  rawQuery: string,
  limit = DEFAULT_LIMIT,
): Promise<{ query: string; count: number; results: KnowledgeSnippet[] }> {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LEN);
  const take = Math.min(Math.max(1, limit), HARD_LIMIT);

  if (query.length < 2) {
    return { query, count: 0, results: [] };
  }

  const rows = await prisma.knowledgeArticle.findMany({
    where: {
      isApproved: true,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
        { tags: { has: query.toLowerCase() } },
      ],
    },
    select: { title: true, category: true, content: true },
    orderBy: [{ priority: "desc" }, { title: "asc" }],
    take,
  });

  // has: is exact tag match; also try ranked fallback if empty
  if (rows.length === 0) {
    const ranked = await findRelevantKnowledge(query, take);
    return { query, count: ranked.length, results: ranked };
  }

  const results = rows.map((r) => ({
    title: r.title,
    category: r.category,
    content: truncate(r.content),
  }));

  return { query, count: results.length, results };
}

/** Format snippets for injection into the system prompt. */
export function formatKnowledgeForPrompt(snippets: KnowledgeSnippet[]): string {
  if (!snippets.length) return "";
  return (
    "\n\n## Relevant approved knowledge (only these articles — do not invent policies)\n" +
    snippets
      .map((s) => `### ${s.title} [${s.category}]\n${s.content}`)
      .join("\n\n")
  );
}
