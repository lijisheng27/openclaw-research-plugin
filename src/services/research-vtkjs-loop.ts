import type {
  EnvironmentProfileId,
  GeneratedCode,
  Phase5RepairLoopOutput,
  Phase5RepairWorkflowPlan,
  Phase5VisualizationOutput,
  ResearchVtkjsLoopOutput,
  SandboxPolicyDecision,
} from "../contracts/research-contracts.js";
import { createStableId } from "./research-utils.js";
import { runPhase5VisualizationLoop } from "./phase5-visualization.js";
import { buildVtkjsCorpus } from "./vtkjs-corpus.js";
import { generateVtkjsCode } from "./vtkjs-codegen.js";
import { buildVtkjsGenerationBrief } from "./vtkjs-generator.js";
import { buildVtkjsLoopGovernance } from "./vtkjs-governance.js";
import { retrieveVtkjsContext } from "./vtkjs-knowledge.js";
import { buildPhase5AgentExecRecipe, runPhase5ExecutionLoop } from "./vtkjs-phase5.js";
import { buildPhase5RepairWorkflowPlan, runPhase5RepairLoop } from "./vtkjs-repair.js";

interface ResearchVtkjsLoopParams {
  goal: string;
  title?: string;
  abstract?: string;
  body?: string;
  code?: string;
  html?: string;
  script?: string;
  codeLanguage?: GeneratedCode["language"];
  artifactRoot?: string;
  environmentProfile?: EnvironmentProfileId;
  requestedRuntime?: SandboxPolicyDecision["requestedRuntime"];
  canvasSelector?: string;
  timeoutMs?: number;
  renderReport?: string;
  renderReportPath?: string;
  browserConsole?: string;
  browserConsolePath?: string;
  pageErrors?: string;
  pageErrorsPath?: string;
  comparisonRenderReport?: string;
  comparisonRenderReportPath?: string;
  comparisonBrowserConsole?: string;
  comparisonBrowserConsolePath?: string;
  comparisonPageErrors?: string;
  comparisonPageErrorsPath?: string;
  maxRounds?: number;
  knowledgeStorePath?: string;
  knowledgeLimit?: number;
  knowledgeTopK?: number;
  includeContext?: boolean;
  includeGenerationBrief?: boolean;
  includeGeneratedCandidate?: boolean;
  includeCorpusBuild?: boolean;
  corpusOutputRoot?: string;
  corpusArtifactRoot?: string;
  includeRepair?: boolean;
  includeVisualization?: boolean;
}

function buildNormalizedTitle(params: ResearchVtkjsLoopParams) {
  return params.title?.trim() || "vtk.js Specialized Research Loop";
}

function buildNormalizedAbstract(params: ResearchVtkjsLoopParams) {
  return (
    params.abstract?.trim() ||
    "Use the dedicated vtk.js loop to route validation, prepare stable execution commands, and optionally summarize repair evidence."
  );
}

function hasRepairEvidence(params: ResearchVtkjsLoopParams) {
  return Boolean(
    params.renderReport?.trim() ||
      params.renderReportPath?.trim() ||
      params.browserConsole?.trim() ||
      params.browserConsolePath?.trim() ||
      params.pageErrors?.trim() ||
      params.pageErrorsPath?.trim() ||
      params.comparisonRenderReport?.trim() ||
      params.comparisonRenderReportPath?.trim() ||
      params.comparisonBrowserConsole?.trim() ||
      params.comparisonBrowserConsolePath?.trim() ||
      params.comparisonPageErrors?.trim() ||
      params.comparisonPageErrorsPath?.trim(),
  );
}

function buildNextActions(params: {
  command: string;
  shouldRunRepair: boolean;
  visualizationIncluded: boolean;
  repairWorkflowPlan?: Phase5RepairWorkflowPlan;
  repair?: Phase5RepairLoopOutput;
  warnings: string[];
}) {
  const actions = [
    `Run the canonical local workflow command: ${params.command}`,
  ];

  if (params.shouldRunRepair && params.repairWorkflowPlan) {
    actions.push(`If browser evidence still needs revision, run: ${params.repairWorkflowPlan.shellCommand}`);
  } else if (params.shouldRunRepair && params.repair?.retryLocalWorkflowPlan?.shellCommand) {
    actions.push(`Retry the first repaired round with: ${params.repair.retryLocalWorkflowPlan.shellCommand}`);
  } else {
    actions.push("Use the returned Phase 5 execution output as the single source of truth for Docker orchestration.");
  }

  if (params.visualizationIncluded) {
    actions.push("Use the visualization payload to review repair rounds, artifact delta, and the latest verdict.");
  }

  if (params.warnings.length > 0) {
    actions.push("Review the warnings before assuming this request should stay on the vtk.js-specific route.");
  }

  return actions;
}

export function runResearchVtkjsLoop(params: ResearchVtkjsLoopParams): ResearchVtkjsLoopOutput {
  const title = buildNormalizedTitle(params);
  const abstract = buildNormalizedAbstract(params);
  const normalized = {
    goal: params.goal,
    title,
    abstract,
    body: params.body,
    code: params.code,
    html: params.html,
    script: params.script,
    codeLanguage: params.codeLanguage,
    artifactRoot: params.artifactRoot,
    environmentProfile: params.environmentProfile,
    requestedRuntime: params.requestedRuntime,
    canvasSelector: params.canvasSelector,
    timeoutMs: params.timeoutMs,
  };

  let phase5Execution = runPhase5ExecutionLoop(normalized);
  let phase5AgentRecipe = buildPhase5AgentExecRecipe(normalized);
  const isVtkjsRoute = phase5Execution.selection.templateId === "vtkjs_scene_validation";
  const shouldIncludeContext = isVtkjsRoute && (params.includeContext ?? true);
  const shouldIncludeGenerationBrief = isVtkjsRoute && (params.includeGenerationBrief ?? true);
  const shouldIncludeGeneratedCandidate = isVtkjsRoute && (params.includeGeneratedCandidate ?? true);
  const shouldIncludeCorpusBuild = isVtkjsRoute && (params.includeCorpusBuild ?? false);
  const shouldRunRepair = isVtkjsRoute && (params.includeRepair ?? hasRepairEvidence(params));
  const includeVisualization = params.includeVisualization ?? shouldRunRepair;
  const warnings: string[] = [];

  if (!isVtkjsRoute) {
    warnings.push(
      `The specialized vtk.js loop fell back to template ${phase5Execution.selection.templateId}; use the returned Phase 5 execution plan, but treat this as a non-vtk.js route.`,
    );
  }

  const vtkjsContext = shouldIncludeContext
    ? retrieveVtkjsContext({
        query: [params.goal, title, abstract].filter(Boolean).join(" "),
        limit: params.knowledgeLimit,
        topK: params.knowledgeTopK,
        storePath: params.knowledgeStorePath,
      })
    : undefined;

  const generationBrief = shouldIncludeGenerationBrief
    ? buildVtkjsGenerationBrief({
        goal: params.goal,
        title,
        abstract,
        templateId: phase5Execution.selection.templateId,
        storePath: params.knowledgeStorePath,
        limit: params.knowledgeLimit,
        topK: params.knowledgeTopK,
        context: vtkjsContext,
      })
    : undefined;

  const generatedCandidate = shouldIncludeGeneratedCandidate && generationBrief
    ? generateVtkjsCode({
        goal: params.goal,
        title,
        abstract,
        templateId: phase5Execution.selection.templateId,
        storePath: params.knowledgeStorePath,
        limit: params.knowledgeLimit,
        topK: params.knowledgeTopK,
        brief: generationBrief,
        context: vtkjsContext,
      })
    : undefined;

  const effectiveHtml = params.html ?? generatedCandidate?.html;
  const effectiveScript = params.script ?? params.code ?? generatedCandidate?.script;

  if (isVtkjsRoute && generatedCandidate && !params.html && !params.script && !params.code) {
    const generatedExecutionInput = {
      ...normalized,
      html: generatedCandidate.html,
      script: generatedCandidate.script,
    };
    phase5Execution = runPhase5ExecutionLoop(generatedExecutionInput);
    phase5AgentRecipe = buildPhase5AgentExecRecipe(generatedExecutionInput);
  }

  const corpusBuild = shouldIncludeCorpusBuild
    ? buildVtkjsCorpus({
        outputRoot: params.corpusOutputRoot,
        artifactRoot: params.corpusArtifactRoot,
      })
    : undefined;

  const phase5Repair = shouldRunRepair
    ? runPhase5RepairLoop({
        goal: params.goal,
        title,
        abstract,
        html: effectiveHtml,
        script: effectiveScript,
        renderReport: params.renderReport,
        renderReportPath: params.renderReportPath,
        browserConsole: params.browserConsole,
        browserConsolePath: params.browserConsolePath,
        pageErrors: params.pageErrors,
        pageErrorsPath: params.pageErrorsPath,
        comparisonRenderReport: params.comparisonRenderReport,
        comparisonRenderReportPath: params.comparisonRenderReportPath,
        comparisonBrowserConsole: params.comparisonBrowserConsole,
        comparisonBrowserConsolePath: params.comparisonBrowserConsolePath,
        comparisonPageErrors: params.comparisonPageErrors,
        comparisonPageErrorsPath: params.comparisonPageErrorsPath,
        artifactRoot: params.artifactRoot,
        canvasSelector: params.canvasSelector,
        timeoutMs: params.timeoutMs,
        maxRounds: params.maxRounds,
      })
    : undefined;

  const repairWorkflowPlan = shouldRunRepair
    ? buildPhase5RepairWorkflowPlan({
        goal: params.goal,
        title,
        abstract,
        html: effectiveHtml,
        script: effectiveScript,
        renderReport: params.renderReport,
        renderReportPath: params.renderReportPath,
        browserConsole: params.browserConsole,
        browserConsolePath: params.browserConsolePath,
        pageErrors: params.pageErrors,
        pageErrorsPath: params.pageErrorsPath,
        artifactRoot: params.artifactRoot,
        canvasSelector: params.canvasSelector,
        timeoutMs: params.timeoutMs,
        maxRounds: params.maxRounds,
      })
    : undefined;

  const phase5Visualization = shouldRunRepair && includeVisualization
    ? runPhase5VisualizationLoop({
        goal: params.goal,
        title,
        abstract,
        html: effectiveHtml,
        script: effectiveScript,
        renderReport: params.renderReport,
        renderReportPath: params.renderReportPath,
        browserConsole: params.browserConsole,
        browserConsolePath: params.browserConsolePath,
        pageErrors: params.pageErrors,
        pageErrorsPath: params.pageErrorsPath,
        comparisonRenderReport: params.comparisonRenderReport,
        comparisonRenderReportPath: params.comparisonRenderReportPath,
        comparisonBrowserConsole: params.comparisonBrowserConsole,
        comparisonBrowserConsolePath: params.comparisonBrowserConsolePath,
        comparisonPageErrors: params.comparisonPageErrors,
        comparisonPageErrorsPath: params.comparisonPageErrorsPath,
        artifactRoot: params.artifactRoot,
        canvasSelector: params.canvasSelector,
        timeoutMs: params.timeoutMs,
        maxRounds: params.maxRounds,
      })
    : undefined;

  const governance = buildVtkjsLoopGovernance({
    goal: params.goal,
    selection: phase5Execution.selection,
    vtkjsContext,
    generationBrief,
    generatedCandidate,
    phase5Execution,
    repairWorkflowPlan,
    phase5Repair,
    warnings,
  });

  return {
    loopId: createStableId("research-vtkjs-loop", `${params.goal}-${phase5Execution.selection.templateId}`),
    mode: shouldRunRepair ? "repair_review" : "planning",
    selection: phase5Execution.selection,
    governance,
    vtkjsContext,
    generationBrief,
    generatedCandidate,
    corpusBuild,
    phase5Execution,
    phase5AgentRecipe,
    repairWorkflowPlan,
    phase5Repair,
    phase5Visualization,
    recommendedCommand: phase5Execution.localWorkflowPlan.shellCommand,
    nextActions: buildNextActions({
      command: phase5Execution.localWorkflowPlan.shellCommand,
      shouldRunRepair,
      visualizationIncluded: Boolean(phase5Visualization),
      repairWorkflowPlan,
      repair: phase5Repair,
      warnings,
    }),
    warnings,
  };
}
