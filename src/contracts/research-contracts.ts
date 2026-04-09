export type ResearchModuleId =
  | "paper_search"
  | "paper_ingest"
  | "task_orchestrator"
  | "code_generator"
  | "sandbox_run"
  | "validator"
  | "trace_recorder"
  | "report_build"
  | "vtkjs_validate";

export interface PaperMeta {
  title: string;
  abstract: string;
  source: string;
  keywords: string[];
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

