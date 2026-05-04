import fs from "node:fs";
import path from "node:path";
import type {
  ContextPack,
  PaperMeta,
  PaperSearchResult,
  RAGChunk,
  RAGQueryResult,
  RAGStoreSnapshot,
  VtkjsKnowledgeIngestOutput,
  VtkjsRetrieveContextOutput,
} from "../contracts/research-contracts.js";
import { createStableId, pickKeywords } from "./research-utils.js";

const VTKJS_STORE_RELATIVE_PATH = path.join(".research-data", "vtkjs-rag-store.json");

const VTKJS_KNOWLEDGE_FIXTURES: PaperMeta[] = [
  {
    title: "vtk.js Scene Bootstrap with Source Mapper Actor Renderer",
    abstract:
      "A minimal browser scene should create a render window, source, mapper, actor, and then call renderWindow.render() after resetCamera.",
    source: "local-fixture:vtkjs-bootstrap",
    keywords: ["vtk.js", "renderwindow", "mapper", "actor", "renderer", "scene", "render"],
  },
  {
    title: "Browser Evidence for vtk.js Validation with Playwright",
    abstract:
      "Reliable vtk.js validation should capture screenshots, browser console logs, page errors, and a render verification verdict from Playwright.",
    source: "local-fixture:vtkjs-browser-evidence",
    keywords: ["vtk.js", "playwright", "browser", "verification", "artifacts", "screenshot", "console"],
  },
  {
    title: "Repairing Missing vtk Runtime in Browser Validation",
    abstract:
      "When the browser reports vtk is not defined, inject the vtk.js browser bundle before the module script and keep the runtime bootstrap minimal.",
    source: "local-fixture:vtkjs-missing-runtime",
    keywords: ["vtk.js", "repair", "vtk is not defined", "runtime", "browser", "script"],
  },
  {
    title: "Recovering from Missing Canvas during vtk.js Verification",
    abstract:
      "A missing canvas usually indicates that render bootstrap failed, so retry with a minimal sphere scene before reintroducing custom logic.",
    source: "local-fixture:vtkjs-missing-canvas",
    keywords: ["vtk.js", "canvas", "repair", "sphere", "render", "verification"],
  },
  {
    title: "Volume Rendering Workflow Patterns in vtk.js",
    abstract:
      "Volume rendering tasks should retrieve volume mapper, transfer function, opacity function, and camera reset patterns before validation.",
    source: "local-fixture:vtkjs-volume-rendering",
    keywords: ["vtk.js", "volume", "mapper", "transfer function", "opacity", "camera"],
  },
  {
    title: "Slice Rendering and Image Data Patterns in vtk.js",
    abstract:
      "Slice workflows benefit from retrieving image data setup, slice mapper, actor configuration, and viewport constraints for validation.",
    source: "local-fixture:vtkjs-slice",
    keywords: ["vtk.js", "slice", "image data", "mapper", "actor", "viewport"],
  },
  {
    title: "Streamline and Vector Field Scene Construction in vtk.js",
    abstract:
      "Streamline tasks typically require seeded sources, vector field inputs, mapper wiring, and explicit render ordering to avoid empty scenes.",
    source: "local-fixture:vtkjs-streamline",
    keywords: ["vtk.js", "streamline", "vector field", "seed", "mapper", "render"],
  },
  {
    title: "Benchmark-Oriented vtk.js Validation Cases",
    abstract:
      "Repeatable benchmark cases should cover slice, volume rendering, streamline, and mag-iso scenes with stable artifact expectations.",
    source: "local-fixture:vtkjs-benchmark",
    keywords: ["vtk.js", "benchmark", "slice", "volume", "streamline", "mag-iso", "artifacts"],
  },
];

const SOURCE_GUIDANCE: Record<string, { patterns: string[]; fixes: string[] }> = {
  "local-fixture:vtkjs-bootstrap": {
    patterns: [
      "Build the scene in source -> mapper -> actor -> renderer order.",
      "Always call renderer.resetCamera() before renderWindow.render().",
    ],
    fixes: ["If validation fails early, retry with the minimal full-screen bootstrap scene first."],
  },
  "local-fixture:vtkjs-browser-evidence": {
    patterns: [
      "Expect screenshot, console log, page error log, and a structured render verdict.",
      "Treat browser evidence as the acceptance contract for vtk.js scene validation.",
    ],
    fixes: ["If artifacts are missing, rerun the canonical Docker workflow instead of improvising a different browser command."],
  },
  "local-fixture:vtkjs-missing-runtime": {
    patterns: ["Inject the vtk.js browser bundle before any module script that references global vtk."],
    fixes: ["When the page says vtk is not defined, restore the runtime script include before changing scene logic."],
  },
  "local-fixture:vtkjs-missing-canvas": {
    patterns: ["Use a minimal sphere or cone scene to re-establish canvas rendering before restoring custom logic."],
    fixes: ["If the canvas is missing, reduce the page to a known-good bootstrap scene and compare new artifacts."],
  },
  "local-fixture:vtkjs-volume-rendering": {
    patterns: ["Retrieve mapper plus transfer-function setup before generating volume scenes."],
    fixes: ["If volume output is blank, verify transfer-function and camera-reset steps before deeper repair."],
  },
  "local-fixture:vtkjs-slice": {
    patterns: ["Keep slice scenes explicit about image data, mapper setup, and viewport assumptions."],
    fixes: ["If slice rendering regresses, compare mapper wiring and viewport setup against a minimal slice baseline."],
  },
  "local-fixture:vtkjs-streamline": {
    patterns: ["Seed streamline scenes explicitly and confirm vector-field inputs before validation."],
    fixes: ["If streamline output is empty, inspect seed generation and pipeline ordering before general browser repair."],
  },
  "local-fixture:vtkjs-benchmark": {
    patterns: ["Use slice, volume, streamline, and mag-iso as the benchmark backbone for vtk.js eval."],
    fixes: ["Capture artifact expectations per benchmark case so later eval output stays comparable."],
  },
};

function getVtkjsStorePath(customPath?: string) {
  return path.resolve(customPath?.trim() || path.join(process.cwd(), VTKJS_STORE_RELATIVE_PATH));
}

function buildChunks(paper: PaperMeta): RAGChunk[] {
  return [
    {
      id: createStableId("chunk", `${paper.source}-abstract`),
      text: paper.abstract,
      keywords: paper.keywords,
    },
  ];
}

function emptyStore(): RAGStoreSnapshot {
  return {
    storeId: createStableId("rag-store", "vtkjs-empty"),
    documentCount: 0,
    chunkCount: 0,
    documents: [],
  };
}

function loadStore(storePath: string): RAGStoreSnapshot {
  if (!fs.existsSync(storePath)) {
    return emptyStore();
  }
  return JSON.parse(fs.readFileSync(storePath, "utf-8")) as RAGStoreSnapshot;
}

function writeStore(storePath: string, papers: PaperMeta[]): RAGStoreSnapshot {
  const documents = papers.map((paper) => ({
    documentId: createStableId("doc", paper.source),
    paperMeta: paper,
    chunks: buildChunks(paper),
    ingestedAt: new Date().toISOString(),
  }));
  const store: RAGStoreSnapshot = {
    storeId: createStableId("rag-store", storePath),
    documentCount: documents.length,
    chunkCount: documents.reduce((sum, document) => sum + document.chunks.length, 0),
    documents,
  };
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  return store;
}

function scoreKeywords(queryKeywords: string[], text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return queryKeywords.reduce((score, keyword) => {
    const keywordBonus = keywords.includes(keyword) ? 3 : 0;
    const textBonus = normalized.includes(keyword) ? 1 : 0;
    return score + keywordBonus + textBonus;
  }, 0);
}

function queryStore(params: { query: string; topK: number; storePath: string }): RAGQueryResult {
  const store = loadStore(params.storePath);
  const queryKeywords = pickKeywords(params.query, 12);
  const matches = store.documents
    .flatMap((document) =>
      document.chunks.map((chunk) => ({
        chunk,
        documentId: document.documentId,
        title: document.paperMeta.title,
        score: scoreKeywords(queryKeywords, `${document.paperMeta.title} ${chunk.text}`, chunk.keywords),
      })),
    )
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, params.topK);

  return {
    query: params.query,
    matches,
    store: {
      storeId: store.storeId,
      documentCount: store.documentCount,
      chunkCount: store.chunkCount,
    },
  };
}

function buildContextPack(params: { query: string; result: RAGQueryResult; maxSnippets: number }): ContextPack {
  const snippets = params.result.matches.slice(0, params.maxSnippets).map((match) => match.chunk.text);
  return {
    contextPackId: createStableId("context-pack", params.query),
    query: params.query,
    summary:
      snippets.length > 0
        ? `Retrieved ${snippets.length} vtk.js context snippets for ${params.query}.`
        : `No vtk.js context snippets were retrieved for ${params.query}.`,
    citations: params.result.matches.map((match) => ({
      title: match.title,
      documentId: match.documentId,
      chunkId: match.chunk.id,
      score: match.score,
    })),
    snippets,
  };
}

function scoreFixture(queryKeywords: string[], paper: PaperMeta) {
  return scoreKeywords(queryKeywords, `${paper.title} ${paper.abstract}`, paper.keywords);
}

export function searchVtkjsKnowledge(params: { query: string; limit?: number }): PaperSearchResult {
  const limit = Math.max(1, Math.min(params.limit ?? 6, 12));
  const queryKeywords = pickKeywords(params.query, 12);
  const papers = VTKJS_KNOWLEDGE_FIXTURES.map((paper) => ({
    paper,
    score: scoreFixture(queryKeywords, paper),
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

export function ingestVtkjsKnowledge(params: {
  query: string;
  limit?: number;
  storePath?: string;
}): VtkjsKnowledgeIngestOutput {
  const storePath = getVtkjsStorePath(params.storePath);
  const search = searchVtkjsKnowledge({ query: params.query, limit: params.limit });
  const store = writeStore(storePath, search.papers);
  return {
    query: params.query,
    domain: "vtkjs",
    storePath,
    search,
    store,
  };
}

function buildGuidance(matches: PaperMeta[]) {
  const patterns = new Set<string>();
  const fixes = new Set<string>();

  for (const match of matches) {
    const guidance = SOURCE_GUIDANCE[match.source];
    if (!guidance) {
      continue;
    }
    guidance.patterns.forEach((pattern) => patterns.add(pattern));
    guidance.fixes.forEach((fix) => fixes.add(fix));
  }

  return {
    recommendedPatterns: [...patterns].slice(0, 6),
    failureFixPairs: [...fixes].slice(0, 6),
  };
}

export function retrieveVtkjsContext(params: {
  query: string;
  limit?: number;
  topK?: number;
  storePath?: string;
}): VtkjsRetrieveContextOutput {
  const storePath = getVtkjsStorePath(params.storePath);
  const currentStore = loadStore(storePath);
  const ingestResult =
    currentStore.documentCount > 0
      ? {
          query: params.query,
          domain: "vtkjs" as const,
          storePath,
          search: searchVtkjsKnowledge({ query: params.query, limit: params.limit }),
          store: currentStore,
        }
      : ingestVtkjsKnowledge({ query: params.query, limit: params.limit, storePath });
  const queryResult = queryStore({ query: params.query, topK: params.topK ?? 6, storePath });
  const contextPack = buildContextPack({ query: params.query, result: queryResult, maxSnippets: params.topK ?? 6 });
  const guidance = buildGuidance(ingestResult.search.papers);

  return {
    query: params.query,
    domain: "vtkjs",
    storePath,
    search: ingestResult.search,
    store: loadStore(storePath),
    queryResult,
    contextPack,
    recommendedPatterns: guidance.recommendedPatterns,
    failureFixPairs: guidance.failureFixPairs,
  };
}
