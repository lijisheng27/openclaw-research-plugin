export type ResearchModuleId =
  | "paper_search"
  | "paper_ingest"
  | "knowledge_ingest"
  | "rag_query"
  | "context_pack_build"
  | "task_orchestrator"
  | "code_generator"
  | "sandbox_run"
  | "validator"
  | "trace_recorder"
  | "report_build"
  | "vtkjs_validate"
  | "knowledge_store_status";

export interface PaperMeta {
  title: string;
  abstract: string;
  source: string;
  keywords: string[];
}

export interface PaperSearchResult {
  query: string;
  provider: "local-fixture";
  papers: PaperMeta[];
}

export interface RAGChunk {
  id: string;
  text: string;
  keywords: string[];
}

export interface RAGIndex {
  indexId: string;
  documentCount: number;
  chunkCount: number;
  chunks: RAGChunk[];
}

export interface RAGStoreDocument {
  documentId: string;
  paperMeta: PaperMeta;
  chunks: RAGChunk[];
  ingestedAt: string;
}

export interface RAGStoreSnapshot {
  storeId: string;
  documentCount: number;
  chunkCount: number;
  documents: RAGStoreDocument[];
}

export interface RAGQueryMatch {
  chunk: RAGChunk;
  documentId: string;
  title: string;
  score: number;
}

export interface RAGQueryResult {
  query: string;
  matches: RAGQueryMatch[];
  store: {
    storeId: string;
    documentCount: number;
    chunkCount: number;
  };
}

export interface ContextPack {
  contextPackId: string;
  query: string;
  summary: string;
  citations: Array<{
    title: string;
    documentId: string;
    chunkId: string;
    score: number;
  }>;
  snippets: string[];
}

export interface TaskNode {
  id: string;
  title: string;
  kind: "ingest" | "retrieve" | "generate" | "execute" | "validate" | "report";
  status: "pending" | "ready" | "running" | "completed" | "failed";
  inputs: string[];
  outputs: string[];
  dependsOn: string[];
}

export interface TaskGraph {
  graphId: string;
  goal: string;
  nodes: TaskNode[];
  edges: Array<{ from: string; to: string }>;
}

export interface GeneratedCode {
  language: "typescript";
  framework: "vtk.js";
  entrypoint: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  summary: string;
}

export interface SandboxRunResult {
  runId: string;
  status: "passed" | "failed";
  runtime: "subagent-sandbox-simulated";
  stdout: string[];
  stderr: string[];
  producedArtifacts: string[];
  exitCode: number;
}

export interface EvalRecord {
  evaluationId: string;
  status: "accepted" | "needs_revision";
  score: number;
  checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
  revisionSuggestions: string[];
}

export interface ThinkActionTraceStep {
  stepId: string;
  phase:
    | "paper_ingest"
    | "task_orchestrator"
    | "code_generator"
    | "sandbox_run"
    | "validator"
    | "report_build";
  thought: string;
  action: string;
  observation: string;
}

export interface ThinkActionTrace {
  traceId: string;
  taskGraphId: string;
  steps: ThinkActionTraceStep[];
}

export interface ResearchReport {
  reportId: string;
  summary: string;
  keyFindings: string[];
  nextActions: string[];
}

export interface Phase1LoopOutput {
  paperMeta: PaperMeta;
  ragIndex: RAGIndex;
  taskGraph: TaskGraph;
  generatedCode: GeneratedCode;
  sandboxRun: SandboxRunResult;
  evaluation: EvalRecord;
  trace: ThinkActionTrace;
  report: ResearchReport;
}

export interface Phase2KnowledgeOutput {
  search: PaperSearchResult;
  store: RAGStoreSnapshot;
  queryResult: RAGQueryResult;
  contextPack: ContextPack;
}
