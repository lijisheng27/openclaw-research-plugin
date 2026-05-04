import fs from "node:fs";
import path from "node:path";
import type {
  EnvironmentProfileId,
  GeneratedCode,
  Phase5AgentExecRecipe,
  Phase5ExecutionLoopOutput,
  Phase5LocalWorkflowPlan,
  SandboxPolicyDecision,
  TaskTemplateSelection,
} from "../contracts/research-contracts.js";
import { createStableId, pickKeywords } from "./research-utils.js";
import { buildVtkjsRenderVerifyPlan } from "./vtkjs-render-verify.js";

interface TemplateSelectParams {
  goal: string;
  title: string;
  abstract: string;
  body?: string;
  code?: string;
  html?: string;
  script?: string;
  codeLanguage?: GeneratedCode["language"];
  environmentProfile?: EnvironmentProfileId;
  requestedRuntime?: SandboxPolicyDecision["requestedRuntime"];
  artifactRoot?: string;
  canvasSelector?: string;
  timeoutMs?: number;
}

const VTKJS_SIGNALS = [
  "vtk",
  "vtk.js",
  "render",
  "renderer",
  "renderwindow",
  "mapper",
  "actor",
  "scene",
  "canvas",
  "playwright",
  "visualization",
  "volume",
  "slice",
  "streamline",
  "mag-iso",
];

function getRunRoot(customPath?: string) {
  return path.resolve(customPath?.trim() || path.join(process.cwd(), ".research-runs"));
}

function findMatchedSignals(content: string) {
  const normalized = content.toLowerCase();
  return VTKJS_SIGNALS.filter((signal) => normalized.includes(signal));
}

export function selectPhase5Template(params: TemplateSelectParams): TaskTemplateSelection {
  const content = [params.goal, params.title, params.abstract, params.body ?? "", params.code ?? ""].join(" ");
  const matchedSignals = Array.from(
    new Set([
      ...findMatchedSignals(content),
      ...pickKeywords(content, 6).filter((keyword) =>
        VTKJS_SIGNALS.some((signal) => signal.includes(keyword) || keyword.includes(signal)),
      ),
    ]),
  );

  return {
    selectionId: createStableId("template", `${params.goal}-vtkjs_scene_validation`),
    phase: "phase-5",
    templateId: "vtkjs_scene_validation",
    templateLabel: "vtk.js Scene Validation",
    goal: params.goal,
    matchedSignals,
    rationale: [
      "The plugin is now scoped to Phase 5 vtk.js workflows only.",
      "All execution should flow through the Docker + Playwright render verification contract.",
    ],
    environmentProfile: params.environmentProfile ?? "node-vtk",
    codeLanguage: params.codeLanguage ?? "typescript",
    requestedRuntime: params.requestedRuntime ?? "docker",
    validationStrategy: "vtkjs-render-contract",
    recommendedInputs: [
      "A natural-language scene goal with pipeline stages such as source, mapper, actor, and renderer.",
      "Optional generated HTML or browser script to validate inside the Docker workflow.",
      "Expected canvas, screenshot, or artifact assertions for Playwright verification.",
      ...matchedSignals.slice(0, 4).map((signal) => `Matched signal: ${signal}`),
    ],
    nextTools: [
      "research_vtkjs_loop",
      "vtkjs_knowledge_ingest",
      "vtkjs_retrieve_context",
      "vtkjs_generation_brief",
      "vtkjs_code_generate",
      "vtkjs_corpus_build",
      "vtkjs_corpus_update",
      "vtkjs_eval_runner",
      "phase5_agent_exec_recipe",
      "vtkjs_render_verify",
      "vtkjs_repair_once",
      "phase5_repair_workflow_plan",
      "research_phase5_repair_loop",
    ],
  };
}

export function buildPhase5AgentExecRecipe(params: TemplateSelectParams): Phase5AgentExecRecipe {
  const execution = runPhase5ExecutionLoop(params);
  const requestedRuntime = params.requestedRuntime ?? execution.selection.requestedRuntime;

  return {
    recipeId: createStableId("phase5-agent-recipe", `${params.goal}-${execution.selection.templateId}`),
    goal: params.goal,
    templateId: execution.selection.templateId,
    routeKind: "vtkjs_render_verify",
    environmentProfile: execution.selection.environmentProfile,
    preferredToolCall: {
      toolName: "research_phase5_execution_loop",
      arguments: {
        goal: params.goal,
        title: params.title,
        abstract: params.abstract,
        body: params.body,
        code: params.code,
        html: params.html,
        script: params.script,
        codeLanguage: params.codeLanguage,
        artifactRoot: params.artifactRoot,
        environmentProfile: params.environmentProfile,
        requestedRuntime,
        canvasSelector: params.canvasSelector,
        timeoutMs: params.timeoutMs,
      },
    },
    expectedExec: {
      cwd: process.cwd(),
      command: execution.localWorkflowPlan.shellCommand,
    },
    successChecks: [
      "The tool result returns routeKind = vtkjs_render_verify.",
      "Execute localWorkflowPlan.shellCommand exactly as returned.",
      "docker-result.json reports status = passed and exitCode = 0.",
      "workspace/artifacts/render-verification.json reports verdict = accepted.",
    ],
    troubleshooting: [
      "If the agent skipped research_phase5_execution_loop, restart from that tool instead of improvising a different chain.",
      "If the local workflow fails before Docker runs, rerun the returned shellCommand from the plugin repository and inspect docker-result.json.",
      "If browser evidence is not accepted, call phase5_repair_workflow_plan with the emitted artifact paths.",
    ],
    repairToolCall: {
      toolName: "phase5_repair_workflow_plan",
      arguments: {
        goal: params.goal,
        title: params.title,
        abstract: params.abstract,
        html: params.html,
        script: params.script ?? params.code,
        artifactRoot: params.artifactRoot,
        canvasSelector: params.canvasSelector,
        timeoutMs: params.timeoutMs,
        maxRounds: 3,
      },
    },
    agentPrompt: [
      "Call research_phase5_execution_loop first.",
      "Run the exact localWorkflowPlan.shellCommand in the plugin repository with exec.",
      "If docker-result.json is passed and render-verification.json is accepted, stop.",
      "If browser verification is not accepted, call phase5_repair_workflow_plan and execute the returned repair workflow command.",
    ].join(" "),
  };
}

export function buildPhase5LocalWorkflowPlan(params: TemplateSelectParams): Phase5LocalWorkflowPlan {
  const selection = selectPhase5Template(params);
  const workflowId = createStableId("phase5-workflow", `${params.goal}-${selection.templateId}`);
  const runRoot = path.join(getRunRoot(params.artifactRoot), "phase5-workflow-inputs");
  fs.mkdirSync(runRoot, { recursive: true });
  const inputPath = path.join(runRoot, `${workflowId}.json`);
  fs.writeFileSync(
    inputPath,
    `${JSON.stringify(
      {
        goal: params.goal,
        title: params.title,
        abstract: params.abstract,
        body: params.body,
        code: params.code,
        html: params.html,
        script: params.script,
        codeLanguage: params.codeLanguage,
        artifactRoot: params.artifactRoot,
        environmentProfile: params.environmentProfile ?? selection.environmentProfile,
        requestedRuntime: params.requestedRuntime ?? selection.requestedRuntime,
        canvasSelector: params.canvasSelector,
        timeoutMs: params.timeoutMs,
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );

  return {
    workflowId,
    templateId: selection.templateId,
    routeKind: "vtkjs_render_verify",
    inputPath,
    shellCommand: ["pnpm", "phase5:local-workflow", "--", "--input", inputPath].join(" "),
    expectedOutputs: [
      "docker-result.json",
      "workspace/artifacts/render-verification.json",
      "workspace/artifacts/browser-console.json",
      "workspace/artifacts/page-errors.json",
      "workspace/artifacts/render-screenshot.png",
    ],
  };
}

export function runPhase5ExecutionLoop(params: TemplateSelectParams): Phase5ExecutionLoopOutput {
  const selection = selectPhase5Template(params);
  const localWorkflowPlan = buildPhase5LocalWorkflowPlan(params);

  return {
    selection,
    routeKind: "vtkjs_render_verify",
    localWorkflowPlan,
    renderVerify: buildVtkjsRenderVerifyPlan({
      goal: params.goal,
      html: params.html,
      script: params.script ?? params.code,
      artifactRoot: params.artifactRoot,
      requestedRuntime: params.requestedRuntime ?? selection.requestedRuntime,
      canvasSelector: params.canvasSelector,
      timeoutMs: params.timeoutMs,
    }),
  };
}
