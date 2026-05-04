import path from "node:path";
import type {
  PaperMeta,
  PaperSearchResult,
  VtkjsKnowledgeIngestOutput,
  VtkjsRetrieveContextOutput,
} from "../contracts/research-contracts.js";
import { buildContextPack, ingestKnowledge, loadRagStore, queryRag } from "./research-knowledge.js";
import { pickKeywords } from "./research-utils.js";

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

const SOURCE_GUIDANCE: Record<
  string,
  { patterns: string[]; fixes: string[] }
> = {
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
    patterns: [
      "Inject the vtk.js browser bundle before any module script that references global vtk.",
    ],
    fixes: ["When the page says vtk is not defined, restore the runtime script include before changing scene logic."],
  },
  "local-fixture:vtkjs-missing-canvas": {
    patterns: [
      "Use a minimal sphere or cone scene to re-establish canvas rendering before restoring custom logic.",
    ],
    fixes: ["If the canvas is missing, reduce the page to a known-good bootstrap scene and compare new artifacts."],
  },
  "local-fixture:vtkjs-volume-rendering": {
    patterns: [
      "Retrieve mapper plus transfer-function setup before generating volume scenes.",
    ],
    fixes: ["If volume output is blank, verify transfer-function and camera-reset steps before deeper repair."],
  },
  "local-fixture:vtkjs-slice": {
    patterns: [
      "Keep slice scenes explicit about image data, mapper setup, and viewport assumptions.",
    ],
    fixes: ["If slice rendering regresses, compare mapper wiring and viewport setup against a minimal slice baseline."],
  },
  "local-fixture:vtkjs-streamline": {
    patterns: [
      "Seed streamline scenes explicitly and confirm vector-field inputs before validation.",
    ],
    fixes: ["If streamline output is empty, inspect seed generation and pipeline ordering before general browser repair."],
  },
  "local-fixture:vtkjs-benchmark": {
    patterns: [
      "Use slice, volume, streamline, and mag-iso as the benchmark backbone for vtk.js eval.",
    ],
    fixes: ["Capture artifact expectations per benchmark case so later eval output stays comparable."],
  },
};

function getVtkjsStorePath(customPath?: string) {
  return path.resolve(customPath?.trim() || path.join(process.cwd(), VTKJS_STORE_RELATIVE_PATH));
}

function scoreFixture(queryKeywords: string[], paper: PaperMeta) {
  const normalized = `${paper.title} ${paper.abstract}`.toLowerCase();
  return queryKeywords.reduce((score, keyword) => {
    const keywordBonus = paper.keywords.includes(keyword) ? 3 : 0;
    const textBonus = normalized.includes(keyword) ? 1 : 0;
    return score + keywordBonus + textBonus;
  }, 0);
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
  const store = ingestKnowledge({ papers: search.papers, storePath });
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
    for (const pattern of guidance.patterns) {
      patterns.add(pattern);
    }
    for (const fix of guidance.fixes) {
      fixes.add(fix);
    }
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
  const currentStore = loadRagStore({ storePath });
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
  const queryResult = queryRag({ query: params.query, topK: params.topK ?? 6, storePath });
  const contextPack = buildContextPack({ query: params.query, result: queryResult, maxSnippets: params.topK ?? 6 });
  const guidance = buildGuidance(ingestResult.search.papers);

  return {
    query: params.query,
    domain: "vtkjs",
    storePath,
    search: ingestResult.search,
    store: loadRagStore({ storePath }),
    queryResult,
    contextPack,
    recommendedPatterns: guidance.recommendedPatterns,
    failureFixPairs: guidance.failureFixPairs,
  };
}
