import type {
  AgentExecRecipe,
  EnvironmentProfileId,
  Phase5AgentExecRecipe,
  Phase5ExecutionLoopOutput,
  Phase5LocalWorkflowPlan,
  Phase3ValidationOutput,
  GeneratedCode,
  Phase5TemplateExecRecipe,
  SandboxPolicyDecision,
  TaskTemplateId,
  TaskTemplateSelection,
} from "../contracts/research-contracts.js";
import { buildPhase3AgentExecRecipe } from "./research-validation.js";
import { buildVtkjsRenderVerifyPlan } from "./vtkjs-render-verify.js";
import { runPhase3ValidationLoop } from "./research-validation.js";
import { createStableId, pickKeywords } from "./research-utils.js";
import fs from "node:fs";
import path from "node:path";

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

interface TemplateProfile {
  templateId: TaskTemplateId;
  templateLabel: string;
  environmentProfile: EnvironmentProfileId;
  codeLanguage: GeneratedCode["language"];
  validationStrategy: TaskTemplateSelection["validationStrategy"];
  rationale: string[];
  recommendedInputs: string[];
}

const TEMPLATE_SIGNAL_SETS = {
  vtkjs_scene_validation: [
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
  ],
  python_scientific_script: [
    "python",
    "numpy",
    "scipy",
    "pandas",
    "matplotlib",
    "jupyter",
    "script",
    "analysis",
    "plot",
    "scientific",
  ],
  paper_reproduction_experiment: [
    "paper",
    "reproduce",
    "reproduction",
    "benchmark",
    "baseline",
    "experiment",
    "dataset",
    "metric",
    "evaluation",
  ],
} satisfies Record<TaskTemplateId, string[]>;

function findMatchedSignals(content: string, templateId: TaskTemplateId) {
  const normalized = content.toLowerCase();
  return TEMPLATE_SIGNAL_SETS[templateId].filter((signal) => normalized.includes(signal));
}

function getTemplateProfile(templateId: TaskTemplateId, matchedSignals: string[]): TemplateProfile {
  switch (templateId) {
    case "vtkjs_scene_validation":
      return {
        templateId,
        templateLabel: "vtk.js Scene Validation",
        environmentProfile: "node-vtk",
        codeLanguage: "typescript",
        validationStrategy: "vtkjs-render-contract",
        rationale: [
          "The request contains vtk.js render-pipeline signals, so the default path should stay on the node-vtk environment.",
          "This template is designed to feed the existing Docker validation workflow while reserving the Phase 5 upgrade path for real browser rendering checks.",
        ],
        recommendedInputs: [
          "A natural-language scene goal with pipeline stages such as source, mapper, actor, and renderer.",
          "Optional generated HTML or TypeScript code to validate inside the Docker workflow.",
          "Any expected screenshot, canvas, or artifact assertions for later Playwright-based verification.",
          ...matchedSignals.slice(0, 4).map((signal) => `Matched signal: ${signal}`),
        ],
      };
    case "paper_reproduction_experiment":
      return {
        templateId,
        templateLabel: "Paper Reproduction Experiment",
        environmentProfile: "python-scientific",
        codeLanguage: "python",
        validationStrategy: "paper-reproduction-workflow",
        rationale: [
          "The request reads like an experiment or benchmark reproduction task, which usually needs a scriptable, repeatable scientific runtime.",
          "The template keeps the workflow reproducible-first so later Phase 5 work can attach real datasets, metrics, and artifact comparison.",
        ],
        recommendedInputs: [
          "Paper title, abstract, or benchmark objective.",
          "Dataset, baseline, or metric hints if they are already known.",
          "Optional Python starter code for a reproducible experiment script.",
          ...matchedSignals.slice(0, 4).map((signal) => `Matched signal: ${signal}`),
        ],
      };
    case "python_scientific_script":
    default:
      return {
        templateId: "python_scientific_script",
        templateLabel: "Python Scientific Script",
        environmentProfile: "python-scientific",
        codeLanguage: "python",
        validationStrategy: "scientific-script-contract",
        rationale: [
          "The request is closer to a scientific scripting workflow than a vtk.js browser-render path.",
          "This template reuses the existing Python scientific container profile so we can keep the Phase 5 execution chain deterministic.",
        ],
        recommendedInputs: [
          "A clear analysis or computation objective.",
          "Optional Python code or library requirements.",
          "Expected artifact outputs such as JSON, CSV, plots, or summary reports.",
          ...matchedSignals.slice(0, 4).map((signal) => `Matched signal: ${signal}`),
        ],
      };
  }
}

function chooseTemplate(params: TemplateSelectParams) {
  if (params.environmentProfile === "node-vtk") {
    return "vtkjs_scene_validation" as const;
  }
  if (params.environmentProfile === "python-scientific") {
    if (/\bpaper\b|\breproduc/i.test(`${params.goal} ${params.title} ${params.abstract} ${params.body ?? ""}`)) {
      return "paper_reproduction_experiment" as const;
    }
    return "python_scientific_script" as const;
  }
  if (params.codeLanguage === "python") {
    return "python_scientific_script" as const;
  }

  const content = [params.goal, params.title, params.abstract, params.body ?? "", params.code ?? ""].join(" ");
  const vtkSignals = findMatchedSignals(content, "vtkjs_scene_validation");
  const paperSignals = findMatchedSignals(content, "paper_reproduction_experiment");
  const pythonSignals = findMatchedSignals(content, "python_scientific_script");

  if (vtkSignals.length >= Math.max(2, paperSignals.length, pythonSignals.length)) {
    return "vtkjs_scene_validation" as const;
  }
  if (paperSignals.length >= Math.max(2, pythonSignals.length)) {
    return "paper_reproduction_experiment" as const;
  }
  if (pythonSignals.length > 0) {
    return "python_scientific_script" as const;
  }
  return "vtkjs_scene_validation" as const;
}

export function selectPhase5Template(params: TemplateSelectParams): TaskTemplateSelection {
  const content = [params.goal, params.title, params.abstract, params.body ?? "", params.code ?? ""].join(" ");
  const templateId = chooseTemplate(params);
  const matchedSignals = Array.from(
    new Set([
      ...findMatchedSignals(content, templateId),
      ...pickKeywords(content, 6).filter((keyword) =>
        TEMPLATE_SIGNAL_SETS[templateId].some((signal) => signal.includes(keyword) || keyword.includes(signal)),
      ),
    ]),
  );
  const profile = getTemplateProfile(templateId, matchedSignals);

  return {
    selectionId: createStableId("template", `${params.goal}-${templateId}`),
    phase: "phase-5",
    templateId: profile.templateId,
    templateLabel: profile.templateLabel,
    goal: params.goal,
    matchedSignals,
    rationale: profile.rationale,
    environmentProfile: params.environmentProfile ?? profile.environmentProfile,
    codeLanguage: params.codeLanguage ?? profile.codeLanguage,
    requestedRuntime: params.requestedRuntime ?? "docker",
    validationStrategy: profile.validationStrategy,
    recommendedInputs: profile.recommendedInputs,
    nextTools:
      templateId === "vtkjs_scene_validation"
        ? [
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
            "phase3_agent_exec_recipe",
            "phase3_local_workflow_plan",
            "docker_sandbox_run",
          ]
        : [
            "research_vtkjs_loop",
            "vtkjs_knowledge_ingest",
            "vtkjs_retrieve_context",
            "vtkjs_generation_brief",
            "vtkjs_code_generate",
            "vtkjs_corpus_build",
            "vtkjs_corpus_update",
            "vtkjs_eval_runner",
            "phase5_agent_exec_recipe",
            "phase3_agent_exec_recipe",
            "phase3_local_workflow_plan",
            "docker_sandbox_run",
          ],
  };
}

export function buildPhase5TemplateExecRecipe(params: TemplateSelectParams): Phase5TemplateExecRecipe {
  const selection = selectPhase5Template(params);
  const agentExecRecipe: AgentExecRecipe = buildPhase3AgentExecRecipe({
    ...params,
    codeLanguage: selection.codeLanguage,
    environmentProfile: selection.environmentProfile,
    requestedRuntime: selection.requestedRuntime,
  });

  return {
    selection,
    agentExecRecipe,
  };
}

export function buildPhase5AgentExecRecipe(params: TemplateSelectParams): Phase5AgentExecRecipe {
  const execution = runPhase5ExecutionLoop(params);
  const requestedRuntime = params.requestedRuntime ?? execution.selection.requestedRuntime;

  return {
    recipeId: createStableId("phase5-agent-recipe", `${params.goal}-${execution.selection.templateId}`),
    goal: params.goal,
    templateId: execution.selection.templateId,
    routeKind: execution.routeKind,
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
    successChecks:
      execution.routeKind === "vtkjs_render_verify"
        ? [
            "The tool result returns routeKind = vtkjs_render_verify.",
            "Execute localWorkflowPlan.shellCommand exactly as returned.",
            "docker-result.json reports status = passed and exitCode = 0.",
            "workspace/artifacts/render-verification.json reports verdict = accepted.",
          ]
        : [
            "The tool result returns routeKind = phase3_validation.",
            "Execute localWorkflowPlan.shellCommand exactly as returned.",
            "docker-result.json reports status = passed and exitCode = 0.",
          ],
    troubleshooting:
      execution.routeKind === "vtkjs_render_verify"
        ? [
            "If the agent skipped research_phase5_execution_loop, restart from that tool instead of improvising a different chain.",
            "If the local workflow fails before Docker runs, rerun the returned shellCommand from the plugin repository and inspect docker-result.json.",
            "If browser evidence is not accepted, call phase5_repair_workflow_plan with the emitted artifact paths.",
          ]
        : [
            "If the agent skipped research_phase5_execution_loop, restart from that tool instead of improvising a different chain.",
            "If Docker fails, rerun the returned shellCommand from the plugin repository and inspect docker-result.json.",
          ],
    repairToolCall:
      execution.routeKind === "vtkjs_render_verify"
        ? {
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
          }
        : undefined,
    agentPrompt:
      execution.routeKind === "vtkjs_render_verify"
        ? [
            "Call research_phase5_execution_loop first.",
            "Run the exact localWorkflowPlan.shellCommand in the plugin repository with exec.",
            "If docker-result.json is passed and render-verification.json is accepted, stop.",
            "If browser verification is not accepted, call phase5_repair_workflow_plan and execute the returned repair workflow command.",
          ].join(" ")
        : [
            "Call research_phase5_execution_loop first.",
            "Run the exact localWorkflowPlan.shellCommand in the plugin repository with exec.",
            "If docker-result.json is passed, stop.",
          ].join(" "),
  };
}

function getRunRoot(customPath?: string) {
  return path.resolve(customPath?.trim() || path.join(process.cwd(), ".research-runs"));
}

export function buildPhase5LocalWorkflowPlan(params: TemplateSelectParams): Phase5LocalWorkflowPlan {
  const selection = selectPhase5Template(params);
  const routeKind = selection.templateId === "vtkjs_scene_validation" ? "vtkjs_render_verify" : "phase3_validation";
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
    routeKind,
    inputPath,
    shellCommand: ["pnpm", "phase5:local-workflow", "--", "--input", inputPath].join(" "),
    expectedOutputs:
      routeKind === "vtkjs_render_verify"
        ? [
            "docker-result.json",
            "workspace/artifacts/render-verification.json",
            "workspace/artifacts/browser-console.json",
            "workspace/artifacts/page-errors.json",
            "workspace/artifacts/render-screenshot.png",
          ]
        : [
            "docker-result.json",
            "workspace/artifacts/vtk-scene-summary.json",
          ],
  };
}

export function runPhase5ExecutionLoop(params: TemplateSelectParams): Phase5ExecutionLoopOutput {
  const selection = selectPhase5Template(params);
  const localWorkflowPlan = buildPhase5LocalWorkflowPlan(params);

  if (selection.templateId === "vtkjs_scene_validation") {
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

  const phase3Validation: Phase3ValidationOutput = runPhase3ValidationLoop({
    goal: params.goal,
    title: params.title,
    abstract: params.abstract,
    body: params.body,
    code: params.code,
    codeLanguage: params.codeLanguage ?? selection.codeLanguage,
    artifactRoot: params.artifactRoot,
    environmentProfile: params.environmentProfile ?? selection.environmentProfile,
    requestedRuntime: params.requestedRuntime ?? selection.requestedRuntime,
  });

  return {
    selection,
    routeKind: "phase3_validation",
    localWorkflowPlan,
    phase3Validation,
  };
}
