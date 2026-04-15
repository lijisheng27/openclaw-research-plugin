export type ResearchModuleId =
  | "paper_search"
  | "paper_ingest"
  | "knowledge_ingest"
  | "rag_query"
  | "context_pack_build"
  | "task_orchestrator"
  | "code_generator"
  | "sandbox_run"
  | "docker_sandbox_run"
  | "cloud_sandbox_plan"
  | "sandbox_policy_decide"
  | "phase3_local_workflow_plan"
  | "phase3_agent_exec_recipe"
  | "artifact_capture"
  | "task_graph_snapshot"
  | "trace_replay"
  | "structured_progress_updates"
  | "task_graph_summary"
  | "canvas_bridge"
  | "task_flow_bridge"
  | "vtk_scene_export"
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
  language: "typescript" | "python";
  framework: "vtk.js" | "python-scientific";
  entrypoint: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  summary: string;
}

export type EnvironmentProfileId = "node-vtk" | "node-typescript" | "python-scientific";

export interface SandboxRunResult {
  runId: string;
  status: "passed" | "failed";
  runtime:
    | "subagent-sandbox-simulated"
    | "docker-adapter"
    | "docker-adapter-dry-run"
    | "cloud-sandbox-planned";
  stdout: string[];
  stderr: string[];
  producedArtifacts: string[];
  exitCode: number;
}

export interface SandboxPolicyDecision {
  policyId: string;
  requestedRuntime: "docker" | "cloud" | "subagent" | "simulate";
  selectedRuntime: "docker" | "cloud" | "subagent" | "simulate";
  allowed: boolean;
  requiresStrongSandbox: boolean;
  blockedReasons: string[];
  guidance: string[];
}

export interface ExecutionArtifact {
  artifactId: string;
  kind: "source" | "manifest" | "stdout" | "stderr" | "report";
  path: string;
  summary: string;
  sha256: string;
}

export interface SandboxRunManifest {
  manifestId: string;
  runId: string;
  runtime: SandboxRunResult["runtime"];
  environmentProfile: EnvironmentProfileId;
  image: string;
  imageTag: string;
  command: string[];
  dockerfilePath: string;
  buildContextDir: string;
  dockerBuildCommand: string[];
  dockerCommand: string[];
  manifestPath: string;
  runnerCommand: string[];
  workingDirectory: string;
  createdAt: string;
  artifacts: ExecutionArtifact[];
  policy: SandboxPolicyDecision;
}

export interface CloudSandboxPlan {
  planId: string;
  provider: "technology-cloud" | "generic-cloud";
  runtime: "cloud-sandbox-planned";
  requiredInputs: string[];
  uploadArtifacts: string[];
  expectedOutputs: string[];
  handoffSteps: string[];
}

export interface LocalDockerWorkflowPlan {
  workflowId: string;
  inputPath: string;
  environmentProfile: EnvironmentProfileId;
  command: string[];
  shellCommand: string;
  expectedOutputs: string[];
}

export interface AgentExecRecipe {
  recipeId: string;
  goal: string;
  environmentProfile: EnvironmentProfileId;
  preferredToolCall: {
    toolName: "phase3_local_workflow_plan";
    arguments: {
      goal: string;
      title: string;
      abstract: string;
      body?: string;
      code?: string;
      codeLanguage?: GeneratedCode["language"];
      artifactRoot?: string;
      environmentProfile: EnvironmentProfileId;
      requestedRuntime: SandboxPolicyDecision["requestedRuntime"];
    };
  };
  expectedExec: {
    cwd: string;
    command: string;
  };
  successChecks: string[];
  troubleshooting: string[];
  agentPrompt: string;
}

export interface TaskGraphSnapshot {
  snapshotId: string;
  taskGraph: TaskGraph;
  capturedAt: string;
  path: string;
}

export interface TraceReplay {
  replayId: string;
  traceId: string;
  stepCount: number;
  timeline: Array<{
    order: number;
    phase: ThinkActionTraceStep["phase"];
    action: string;
    observation: string;
  }>;
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

export interface Phase3ValidationOutput {
  policy: SandboxPolicyDecision;
  sandboxRun: SandboxRunResult;
  manifest: SandboxRunManifest;
  evaluation: EvalRecord;
  taskGraphSnapshot: TaskGraphSnapshot;
  traceReplay: TraceReplay;
  localWorkflowPlan: LocalDockerWorkflowPlan;
  cloudPlan?: CloudSandboxPlan;
}

export interface StructuredProgressUpdate {
  progressId: string;
  stage: "phase-1" | "phase-2" | "phase-3" | "phase-4";
  currentStep: string;
  percent: number;
  status: "running" | "completed" | "needs_attention";
  timestamp: string;
  details: string[];
}

export interface TaskGraphSummary {
  summaryId: string;
  graphId: string;
  goal: string;
  totalNodes: number;
  completedNodes: number;
  readyNodes: number;
  failedNodes: number;
  completionPercent: number;
  criticalPath: string[];
  nextRecommendedNode?: string;
}

export interface CanvasBridgePayload {
  canvasId: string;
  title: string;
  subtitle: string;
  cards: Array<{
    id: string;
    kind: "summary" | "progress" | "artifact" | "decision";
    title: string;
    body: string;
    emphasis?: "low" | "medium" | "high";
  }>;
}

export interface TaskFlowBridgePayload {
  flowId: string;
  graphId: string;
  nodes: Array<{
    id: string;
    label: string;
    status: TaskNode["status"];
    kind: TaskNode["kind"];
    percent?: number;
  }>;
  edges: Array<{ from: string; to: string }>;
}

export interface VtkSceneExportContract {
  exportId: string;
  sceneName: string;
  format: "vtkjs-scene-export";
  entrypoint: string;
  artifactPath: string;
  metadata: {
    framework: GeneratedCode["framework"];
    runId: string;
    evaluationStatus: EvalRecord["status"];
  };
  validationChecks: string[];
}

export interface Phase4VisualizationOutput {
  progressUpdates: StructuredProgressUpdate[];
  taskGraphSummary: TaskGraphSummary;
  canvasBridge: CanvasBridgePayload;
  taskFlowBridge: TaskFlowBridgePayload;
  vtkSceneExport: VtkSceneExportContract;
}
