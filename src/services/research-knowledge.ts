import fs from "node:fs";
import path from "node:path";
import type {
  ContextPack,
  PaperMeta,
  PaperSearchResult,
  Phase2KnowledgeOutput,
  RAGQueryMatch,
  RAGQueryResult,
  RAGStoreDocument,
  RAGStoreSnapshot,
} from "../contracts/research-contracts.js";
import { ingestPaper } from "./research-phase1.js";
import { createStableId, pickKeywords } from "./research-utils.js";

const STORE_ID = "local-research-rag-store";

const LOCAL_PAPER_FIXTURES: PaperMeta[] = [
  {
    title: "Interactive Scientific Visualization with vtk.js",
    abstract:
      "Browser-based scientific visualization workflows can use vtk.js to render reproducible scenes and expose validation artifacts.",
    source: "local-fixture:vtkjs-visualization",
    keywords: ["vtk.js", "visualization", "browser", "scene", "validation"],
  },
  {
    title: "Retrieval Augmented Code Generation for Scientific Computing",
    abstract:
      "RAG pipelines improve code generation by grounding implementation plans in paper snippets, API documentation, and failed execution traces.",
    source: "local-fixture:rag-code-generation",
    keywords: ["rag", "code-generation", "scientific-computing", "retrieval"],
  },
  {
    title: "Sandboxed Evaluation of Generated Research Code",
    abstract:
      "Safe execution requires isolated runtimes, captured stdout and stderr, artifact collection, and structured evaluator records.",
    source: "local-fixture:sandbox-evaluation",
    keywords: ["sandbox", "evaluation", "artifacts", "execution", "validator"],
  },
  {
    title: "Task Graphs for Human-in-the-loop Agent Workflows",
    abstract:
      "Task graphs and trace timelines help users inspect agent decisions, approve risky actions, and replay workflow state.",
    source: "local-fixture:task-graph-hitl",
    keywords: ["task-graph", "trace", "hitl", "workflow", "replay"],
  },
];

function getStorePath(customPath?: string) {
  const raw = customPath?.trim() || process.env.OPENCLAW_RESEARCH_RAG_STORE;
  if (raw) {
    return path.resolve(raw);
  }
  return path.resolve(process.cwd(), ".research-data", "rag-store.json");
}

function emptyStore(): RAGStoreSnapshot {
  return {
    storeId: STORE_ID,
    documentCount: 0,
    chunkCount: 0,
    documents: [],
  };
}

function normalizeStore(raw: unknown): RAGStoreSnapshot {
  if (!raw || typeof raw !== "object") {
    return emptyStore();
  }
  const maybe = raw as Partial<RAGStoreSnapshot>;
  const documents = Array.isArray(maybe.documents) ? maybe.documents : [];
  const cleanDocuments = documents.filter((doc): doc is RAGStoreDocument => {
    return (
      !!doc &&
      typeof doc.documentId === "string" &&
      !!doc.paperMeta &&
      Array.isArray(doc.chunks)
    );
  });
  return {
    storeId: typeof maybe.storeId === "string" ? maybe.storeId : STORE_ID,
    documentCount: cleanDocuments.length,
    chunkCount: cleanDocuments.reduce((sum, doc) => sum + doc.chunks.length, 0),
    documents: cleanDocuments,
  };
}

export function loadRagStore(params: { storePath?: string } = {}): RAGStoreSnapshot {
  const storePath = getStorePath(params.storePath);
  if (!fs.existsSync(storePath)) {
    return emptyStore();
  }
  try {
    return normalizeStore(JSON.parse(fs.readFileSync(storePath, "utf-8")));
  } catch {
    return emptyStore();
  }
}

export function saveRagStore(store: RAGStoreSnapshot, params: { storePath?: string } = {}) {
  const storePath = getStorePath(params.storePath);
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const normalized = normalizeStore(store);
  fs.writeFileSync(storePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return { storePath, store: normalized };
}

function scoreText(queryKeywords: string[], textKeywords: string[], text: string) {
  const normalizedText = text.toLowerCase();
  return queryKeywords.reduce((score, keyword) => {
    const keywordScore = textKeywords.includes(keyword) ? 3 : 0;
    const textScore = normalizedText.includes(keyword) ? 1 : 0;
    return score + keywordScore + textScore;
  }, 0);
}

export function searchPapers(params: { query: string; limit?: number }): PaperSearchResult {
  const limit = Math.max(1, Math.min(params.limit ?? 5, 10));
  const queryKeywords = pickKeywords(params.query, 10);
  const papers = LOCAL_PAPER_FIXTURES.map((paper) => ({
    paper,
    score: scoreText(queryKeywords, paper.keywords, `${paper.title} ${paper.abstract}`),
  }))
    .sort((a, b) => b.score - a.score || a.paper.title.localeCompare(b.paper.title))
    .slice(0, limit)
    .map(({ paper }) => paper);

  return {
    query: params.query,
    provider: "local-fixture",
    papers,
  };
}

export function ingestKnowledge(params: {
  papers: PaperMeta[];
  storePath?: string;
  ingestedAt?: string;
}): RAGStoreSnapshot {
  const current = loadRagStore({ storePath: params.storePath });
  const byId = new Map(current.documents.map((doc) => [doc.documentId, doc]));
  const ingestedAt = params.ingestedAt ?? new Date().toISOString();

  for (const paper of params.papers) {
    const { ragIndex } = ingestPaper({
      title: paper.title,
      abstract: paper.abstract,
      source: paper.source,
    });
    const documentId = createStableId("doc", `${paper.source}-${paper.title}`);
    byId.set(documentId, {
      documentId,
      paperMeta: paper,
      chunks: ragIndex.chunks,
      ingestedAt,
    });
  }

  const documents = [...byId.values()].sort((a, b) => a.documentId.localeCompare(b.documentId));
  const nextStore = normalizeStore({
    storeId: STORE_ID,
    documents,
  });
  return saveRagStore(nextStore, { storePath: params.storePath }).store;
}

export function queryRag(params: { query: string; topK?: number; storePath?: string }): RAGQueryResult {
  const store = loadRagStore({ storePath: params.storePath });
  const queryKeywords = pickKeywords(params.query, 12);
  const topK = Math.max(1, Math.min(params.topK ?? 5, 20));
  const matches: RAGQueryMatch[] = [];

  for (const doc of store.documents) {
    for (const chunk of doc.chunks) {
      const score = scoreText(queryKeywords, chunk.keywords, `${doc.paperMeta.title} ${chunk.text}`);
      if (score <= 0) {
        continue;
      }
      matches.push({
        chunk,
        documentId: doc.documentId,
        title: doc.paperMeta.title,
        score,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return {
    query: params.query,
    matches: matches.slice(0, topK),
    store: {
      storeId: store.storeId,
      documentCount: store.documentCount,
      chunkCount: store.chunkCount,
    },
  };
}

export function buildContextPack(params: {
  query: string;
  result: RAGQueryResult;
  maxSnippets?: number;
}): ContextPack {
  const maxSnippets = Math.max(1, Math.min(params.maxSnippets ?? 5, 10));
  const selected = params.result.matches.slice(0, maxSnippets);
  return {
    contextPackId: createStableId("ctx", params.query),
    query: params.query,
    summary:
      selected.length === 0
        ? "No matching knowledge snippets were found in the local RAG store."
        : `Prepared ${selected.length} snippets from ${new Set(selected.map((m) => m.documentId)).size} document(s).`,
    citations: selected.map((match) => ({
      title: match.title,
      documentId: match.documentId,
      chunkId: match.chunk.id,
      score: match.score,
    })),
    snippets: selected.map((match) => match.chunk.text),
  };
}

export function runPhase2KnowledgeLoop(params: {
  query: string;
  limit?: number;
  topK?: number;
  storePath?: string;
}): Phase2KnowledgeOutput {
  const search = searchPapers({ query: params.query, limit: params.limit });
  const store = ingestKnowledge({ papers: search.papers, storePath: params.storePath });
  const queryResult = queryRag({ query: params.query, topK: params.topK, storePath: params.storePath });
  const contextPack = buildContextPack({ query: params.query, result: queryResult });
  return {
    search,
    store,
    queryResult,
    contextPack,
  };
}

