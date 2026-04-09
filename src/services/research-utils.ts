export function createStableId(prefix: string, seed: string) {
  const normalized = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${prefix}-${normalized || "item"}`;
}

export function pickKeywords(input: string, limit = 8) {
  const stopwords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "into",
    "using",
    "will",
    "your",
    "have",
    "has",
    "are",
    "was",
    "were",
    "into",
    "build",
    "phase",
    "research",
  ]);

  const counts = new Map<string, number>();
  for (const token of input.toLowerCase().match(/[a-z0-9.-]+/g) ?? []) {
    if (token.length < 3 || stopwords.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

export function chunkText(input: string, maxLength = 220) {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }
    if (current) chunks.push(current);
    current = sentence;
  }

  if (current) chunks.push(current);
  return chunks;
}

