export type ResearchModuleId =
  | "research_vtkjs_loop"
  | "phase5_agent_exec_recipe"
  | "phase5_local_workflow_plan"
  | "phase5_repair_workflow_plan"
  | "research_phase5_execution_loop"
  | "research_phase5_repair_loop"
  | "research_phase5_visualization_loop"
  | "vtkjs_knowledge_ingest"
  | "vtkjs_retrieve_context"
  | "vtkjs_generation_brief"
  | "vtkjs_code_generate"
  | "vtkjs_corpus_build"
  | "vtkjs_corpus_update"
  | "vtkjs_eval_runner"
  | "vtkjs_render_verify"
  | "vtkjs_repair_once";

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

export interface RAGQueryResult {
  query: string;
  matches: Array<{
    chunk: RAGChunk;
    documentId: string;
    title: string;
    score: number;
  }>;
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

export interface GeneratedCode {
  language: "typescript" | "python";
  framework: "vtk.js";
  entrypoint: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  summary: string;
}

export type EnvironmentProfileId = "node-vtk";

export interface SandboxRunResult {
  runId: string;
  status: "passed" | "failed";
  runtime: "docker-adapter-dry-run";
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

export type TaskTemplateId = "vtkjs_scene_validation";

export interface TaskTemplateSelection {
  selectionId: string;
  phase: "phase-5";
  templateId: TaskTemplateId;
  templateLabel: string;
  goal: string;
  matchedSignals: string[];
  rationale: string[];
  environmentProfile: EnvironmentProfileId;
  codeLanguage: GeneratedCode["language"];
  requestedRuntime: SandboxPolicyDecision["requestedRuntime"];
  validationStrategy: "vtkjs-render-contract";
  recommendedInputs: string[];
  nextTools: ResearchModuleId[];
}

export interface Phase5AgentExecRecipe {
  recipeId: string;
  goal: string;
  templateId: TaskTemplateId;
  routeKind: "vtkjs_render_verify";
  environmentProfile: EnvironmentProfileId;
  preferredToolCall: {
    toolName: "research_phase5_execution_loop";
    arguments: {
      goal: string;
      title: string;
      abstract: string;
      body?: string;
      code?: string;
      html?: string;
      script?: string;
      codeLanguage?: GeneratedCode["language"];
      artifactRoot?: string;
      environmentProfile?: EnvironmentProfileId;
      requestedRuntime: SandboxPolicyDecision["requestedRuntime"];
      canvasSelector?: string;
      timeoutMs?: number;
    };
  };
  expectedExec: {
    cwd: string;
    command: string;
  };
  successChecks: string[];
  troubleshooting: string[];
  repairToolCall: {
    toolName: "phase5_repair_workflow_plan";
    arguments: {
      goal: string;
      title: string;
      abstract: string;
      html?: string;
      script?: string;
      renderReportPath?: string;
      browserConsolePath?: string;
      pageErrorsPath?: string;
      artifactRoot?: string;
      canvasSelector?: string;
      timeoutMs?: number;
      maxRounds?: number;
    };
  };
  agentPrompt: string;
}

export interface VtkjsRenderVerifyOutput {
  verificationId: string;
  pageUrl: string;
  canvasSelector: string;
  timeoutMs: number;
  sandboxRun: SandboxRunResult;
  manifest: SandboxRunManifest;
  expectedArtifacts: string[];
  runnerCommand: string[];
}

export interface Phase5LocalWorkflowPlan {
  workflowId: string;
  templateId: TaskTemplateId;
  routeKind: "vtkjs_render_verify";
  inputPath: string;
  shellCommand: string;
  expectedOutputs: string[];
}

export interface Phase5ExecutionLoopOutput {
  selection: TaskTemplateSelection;
  routeKind: "vtkjs_render_verify";
  localWorkflowPlan: Phase5LocalWorkflowPlan;
  renderVerify: VtkjsRenderVerifyOutput;
}

export type VtkjsRepairCategory =
  | "missing_vtk_runtime"
  | "missing_render_call"
  | "missing_canvas"
  | "page_runtime_error"
  | "console_error"
  | "unknown";

export interface VtkjsRepairOnceOutput {
  repairId: string;
  category: VtkjsRepairCategory;
  shouldRetry: boolean;
  findings: string[];
  rationale: string[];
  repairedHtml?: string;
  repairedScript?: string;
  retryHints: string[];
}

export interface VtkjsEvidenceSummary {
  summaryId: string;
  label: string;
  verdict: "accepted" | "needs_revision" | "planned" | "unknown";
  canvasFound: boolean;
  consoleErrorCount: number;
  pageErrorCount: number;
  hasRuntimeReferenceIssue: boolean;
  evidenceSources: string[];
}

export interface Phase5ArtifactComparison {
  comparisonId: string;
  baseline: VtkjsEvidenceSummary;
  candidate: VtkjsEvidenceSummary;
  improved: boolean;
  changes: string[];
}

export interface Phase5RepairRound {
  round: number;
  repair: VtkjsRepairOnceOutput;
  retryLocalWorkflowPlan?: Phase5LocalWorkflowPlan;
  retryRenderVerify?: VtkjsRenderVerifyOutput;
  evidenceSummary?: VtkjsEvidenceSummary;
}

export interface Phase5RepairWorkflowPlan {
  workflowId: string;
  inputPath: string;
  shellCommand: string;
  maxRounds: number;
  expectedOutputs: string[];
}

export interface Phase5ExecutedRepairRound {
  round: number;
  category: VtkjsRepairCategory;
  manifestPath?: string;
  dockerExitCode?: number;
  dockerStatus?: "passed" | "failed";
  evidenceSummary?: VtkjsEvidenceSummary;
  artifactComparison?: Phase5ArtifactComparison;
  stopReason?: string;
}

export interface Phase5RepairExecutionOutput {
  workflow: Phase5RepairWorkflowPlan;
  maxRounds: number;
  executedRounds: Phase5ExecutedRepairRound[];
  finalStatus: "accepted" | "needs_revision" | "stopped";
  finalEvidenceSummary?: VtkjsEvidenceSummary;
}

export interface Phase5RepairLoopOutput {
  selection: TaskTemplateSelection;
  originalRouteKind: "vtkjs_render_verify";
  maxRounds: number;
  evidenceSummary?: VtkjsEvidenceSummary;
  artifactComparison?: Phase5ArtifactComparison;
  repair: VtkjsRepairOnceOutput;
  rounds: Phase5RepairRound[];
  retryLocalWorkflowPlan?: Phase5LocalWorkflowPlan;
  retryRenderVerify?: VtkjsRenderVerifyOutput;
}

export interface StructuredProgressUpdate {
  progressId: string;
  stage: "phase-5";
  currentStep: string;
  percent: number;
  status: "running" | "completed" | "needs_attention";
  timestamp: string;
  details: string[];
}

export interface CanvasBridgePayload {
  canvasId: string;
  title: string;
  subtitle: string;
  cards: Array<{
    id: string;
    kind: "summary" | "progress" | "artifact" | "decision" | "repair";
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
    status: "pending" | "ready" | "running" | "completed" | "failed";
    kind: "repair" | "validate" | "generate" | "retrieve" | "visualize";
    percent?: number;
  }>;
  edges: Array<{ from: string; to: string }>;
}

export interface Phase5RepairSummary {
  summaryId: string;
  goal: string;
  maxRounds: number;
  plannedRounds: number;
  primaryCategory: VtkjsRepairCategory;
  hasArtifactComparison: boolean;
  improvementDetected: boolean;
  latestVerdict: VtkjsEvidenceSummary["verdict"] | "unknown";
}

export interface Phase5VisualizationOutput {
  progressUpdates: StructuredProgressUpdate[];
  repairSummary: Phase5RepairSummary;
  canvasBridge: CanvasBridgePayload;
  taskFlowBridge: TaskFlowBridgePayload;
  artifactComparison?: Phase5ArtifactComparison;
}

export interface VtkjsKnowledgeIngestOutput {
  query: string;
  domain: "vtkjs";
  storePath: string;
  search: PaperSearchResult;
  store: RAGStoreSnapshot;
}

export interface VtkjsRetrieveContextOutput {
  query: string;
  domain: "vtkjs";
  storePath: string;
  search: PaperSearchResult;
  store: RAGStoreSnapshot;
  queryResult: RAGQueryResult;
  contextPack: ContextPack;
  recommendedPatterns: string[];
  failureFixPairs: string[];
}

export interface VtkjsGenerationBrief {
  briefId: string;
  query: string;
  templateId: TaskTemplateId;
  sceneKind: "generic" | "volume" | "slice" | "streamline" | "mag_iso" | "benchmark";
  contextSummary: string;
  recommendedPatterns: string[];
  failureFixPairs: string[];
  generationPrompt: string;
  starterScript: string;
  acceptanceChecks: string[];
}

export interface VtkjsCodeGenerationOutput {
  generationId: string;
  brief: VtkjsGenerationBrief;
  generatedCode: GeneratedCode;
  html: string;
  script: string;
  sceneKind: VtkjsGenerationBrief["sceneKind"];
  starterNotes: string[];
}

export interface VtkjsCorpusEntry {
  entryId: string;
  track: "prompt-sample" | "prompt-sample-pro" | "benchmark";
  slug: string;
  title: string;
  sceneKind: VtkjsGenerationBrief["sceneKind"];
  directory: string;
  files: string[];
}

export interface VtkjsCorpusBuildOutput {
  buildId: string;
  corpusRoot: string;
  manifestPath: string;
  readmePath: string;
  scriptGuidePath: string;
  promptSampleCount: number;
  promptSampleProCount: number;
  benchmarkCount: number;
  entries: VtkjsCorpusEntry[];
  nextActions: string[];
}

export interface VtkjsCorpusUpdateOutput {
  updateId: string;
  corpusRoot: string;
  entryId: string;
  track: VtkjsCorpusEntry["track"];
  slug: string;
  entryDirectory: string;
  manifestPath?: string;
  evidenceSummary?: VtkjsEvidenceSummary;
  artifactComparison?: Phase5ArtifactComparison;
  repair?: Phase5RepairLoopOutput;
  nextWorkflowInputPath?: string;
  promotedToStable: boolean;
  stableArtifactSummaryPath?: string;
  benchmarkGroundTruthPath?: string;
  promotedFiles: string[];
  updatedFiles: string[];
  nextActions: string[];
}

export interface VtkjsEvalCaseResult {
  caseId: "slice" | "volume" | "streamline" | "mag_iso";
  title: string;
  sceneKind: VtkjsGenerationBrief["sceneKind"];
  generation: VtkjsCodeGenerationOutput;
  routeKind: "vtkjs_render_verify";
  workflow: Phase5LocalWorkflowPlan;
  score: number;
  status: "accepted" | "needs_revision";
  checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
  summary: string;
}

export interface VtkjsEvalRunnerOutput {
  runId: string;
  requestedCases: Array<"slice" | "volume" | "streamline" | "mag_iso">;
  totalCases: number;
  acceptedCases: number;
  averageScore: number;
  cases: VtkjsEvalCaseResult[];
  nextActions: string[];
}

export interface VtkjsEvalExecutedCaseResult {
  caseId: "slice" | "volume" | "streamline" | "mag_iso";
  title: string;
  workflow: Phase5LocalWorkflowPlan;
  dockerExitCode: number;
  dockerStatus?: "passed" | "failed";
  renderVerdict?: VtkjsEvidenceSummary["verdict"] | "unknown";
  consoleErrorCount?: number;
  pageErrorCount?: number;
  score: number;
  status: "accepted" | "needs_revision";
  checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
}

export interface VtkjsEvalExecutionOutput {
  runId: string;
  requestedCases: Array<"slice" | "volume" | "streamline" | "mag_iso">;
  totalCases: number;
  acceptedCases: number;
  averageScore: number;
  cases: VtkjsEvalExecutedCaseResult[];
  nextActions: string[];
}

export interface ResearchVtkjsLoopOutput {
  loopId: string;
  mode: "planning" | "repair_review";
  selection: TaskTemplateSelection;
  governance: VtkjsLoopGovernance;
  vtkjsContext?: VtkjsRetrieveContextOutput;
  generationBrief?: VtkjsGenerationBrief;
  generatedCandidate?: VtkjsCodeGenerationOutput;
  corpusBuild?: VtkjsCorpusBuildOutput;
  phase5Execution: Phase5ExecutionLoopOutput;
  phase5AgentRecipe: Phase5AgentExecRecipe;
  repairWorkflowPlan?: Phase5RepairWorkflowPlan;
  phase5Repair?: Phase5RepairLoopOutput;
  phase5Visualization?: Phase5VisualizationOutput;
  recommendedCommand: string;
  nextActions: string[];
  warnings: string[];
}

export type VtkjsSubAgentRole =
  | "module_retriever"
  | "example_retriever"
  | "error_retriever"
  | "candidate_generator"
  | "static_reviewer"
  | "render_verifier"
  | "repairer"
  | "corpus_curator";

export interface VtkjsSubAgentPlan {
  agentId: string;
  role: VtkjsSubAgentRole;
  canRunInParallel: boolean;
  purpose: string;
  inputScope: string[];
  outputContract: string[];
  writeScope: string;
  termination: {
    maxSteps: number;
    maxToolCalls: number;
    stopWhen: string[];
  };
}

export interface VtkjsGateDecision {
  gateId: string;
  stage:
    | "intent_gate"
    | "spawn_gate"
    | "context_gate"
    | "candidate_gate"
    | "verification_gate"
    | "repair_gate"
    | "promotion_gate";
  decision: "pass" | "warn" | "block";
  valueScore: number;
  evidence: string[];
  feedback: string[];
  nextAction: "continue" | "spawn_subagents" | "verify" | "repair" | "ask_human" | "promote" | "discard";
}

export interface VtkjsLoopGovernance {
  governanceId: string;
  parallelism: {
    enabled: boolean;
    maxConcurrentSubAgents: number;
    rationale: string[];
  };
  subAgentPlan: VtkjsSubAgentPlan[];
  gates: VtkjsGateDecision[];
  fanInContract: {
    requiredFields: string[];
    reducerPolicy: string[];
  };
  summaryContract: {
    valueJudgementFields: string[];
    memoryDecisionFields: string[];
  };
}
