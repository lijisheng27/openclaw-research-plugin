import type { VtkjsEvalCaseResult, VtkjsEvalRunnerOutput } from "../contracts/research-contracts.js";
import { createStableId } from "./research-utils.js";
import { generateVtkjsCode } from "./vtkjs-codegen.js";
import { runPhase5ExecutionLoop } from "./vtkjs-phase5.js";

type BenchmarkCaseId = "slice" | "volume" | "streamline" | "mag_iso";

interface BenchmarkCaseSpec {
  caseId: BenchmarkCaseId;
  title: string;
  goal: string;
  abstract: string;
  expectedSceneKind: BenchmarkCaseId;
}

const BENCHMARK_CASES: BenchmarkCaseSpec[] = [
  {
    caseId: "slice",
    title: "vtk.js Slice Benchmark",
    goal: "Generate and validate a vtk.js slice scene with browser evidence",
    abstract: "The candidate should preserve a deterministic slice-oriented render path and browser validation contract.",
    expectedSceneKind: "slice",
  },
  {
    caseId: "volume",
    title: "vtk.js Volume Benchmark",
    goal: "Generate and validate a vtk.js volume rendering scene with browser evidence",
    abstract: "The candidate should preserve volume-specific setup hints while staying browser-verifiable.",
    expectedSceneKind: "volume",
  },
  {
    caseId: "streamline",
    title: "vtk.js Streamline Benchmark",
    goal: "Generate and validate a vtk.js streamline scene with browser evidence",
    abstract: "The candidate should represent streamline-like structure while preserving a deterministic render loop.",
    expectedSceneKind: "streamline",
  },
  {
    caseId: "mag_iso",
    title: "vtk.js Mag-Iso Benchmark",
    goal: "Generate and validate a vtk.js mag-iso scene with browser evidence",
    abstract: "The candidate should preserve iso-surface intent while staying compatible with browser verification.",
    expectedSceneKind: "mag_iso",
  },
];

function selectCases(caseIds?: BenchmarkCaseId[]) {
  if (!caseIds || caseIds.length === 0) {
    return BENCHMARK_CASES;
  }
  const selected = new Set(caseIds);
  return BENCHMARK_CASES.filter((item) => selected.has(item.caseId));
}

function evaluateCase(spec: BenchmarkCaseSpec, artifactRoot?: string): VtkjsEvalCaseResult {
  const generation = generateVtkjsCode({
    goal: spec.goal,
    title: spec.title,
    abstract: spec.abstract,
  });
  const phase5Execution = runPhase5ExecutionLoop({
    goal: spec.goal,
    title: spec.title,
    abstract: spec.abstract,
    html: generation.html,
    script: generation.script,
    artifactRoot,
  });

  const checks = [
    {
      name: "scene-kind-match",
      passed: generation.sceneKind === spec.expectedSceneKind,
      detail: `Expected ${spec.expectedSceneKind}, got ${generation.sceneKind}.`,
    },
    {
      name: "browser-runtime-html",
      passed: generation.html.includes("/node_modules/vtk.js/vtk.js"),
      detail: "HTML should preload the vtk.js browser runtime from node_modules.",
    },
    {
      name: "render-call-present",
      passed: generation.script.includes("renderWindow.render()") && generation.script.includes("renderer.resetCamera()"),
      detail: "Browser script should reset the camera and call renderWindow.render().",
    },
    {
      name: "acceptance-contract",
      passed: generation.brief.acceptanceChecks.length >= 4,
      detail: `Acceptance check count: ${generation.brief.acceptanceChecks.length}.`,
    },
    {
      name: "source-generated",
      passed: generation.generatedCode.files.some((file) => file.path === "src/generated/app.ts"),
      detail: `Generated file count: ${generation.generatedCode.files.length}.`,
    },
    {
      name: "phase5-route-kind",
      passed: phase5Execution.routeKind === "vtkjs_render_verify",
      detail: `Phase 5 route kind: ${phase5Execution.routeKind}.`,
    },
    {
      name: "workflow-command-present",
      passed: phase5Execution.localWorkflowPlan.shellCommand.includes("pnpm phase5:local-workflow"),
      detail: `Workflow command: ${phase5Execution.localWorkflowPlan.shellCommand}.`,
    },
  ];

  const passed = checks.filter((check) => check.passed).length;
  const score = Math.round((passed / checks.length) * 100);

  return {
    caseId: spec.caseId,
    title: spec.title,
    sceneKind: generation.sceneKind,
    generation,
    routeKind: phase5Execution.routeKind,
    workflow: phase5Execution.localWorkflowPlan,
    score,
    status: score === 100 ? "accepted" : "needs_revision",
    checks,
    summary: `${spec.caseId} benchmark scored ${score} with ${passed}/${checks.length} checks passing.`,
  };
}

export function runVtkjsEvalRunner(params: { caseIds?: BenchmarkCaseId[]; artifactRoot?: string } = {}): VtkjsEvalRunnerOutput {
  const requestedCases = params.caseIds?.length ? params.caseIds : BENCHMARK_CASES.map((item) => item.caseId);
  const cases = selectCases(params.caseIds).map((spec) => evaluateCase(spec, params.artifactRoot));
  const acceptedCases = cases.filter((item) => item.status === "accepted").length;
  const totalCases = cases.length;
  const averageScore = totalCases > 0 ? Math.round(cases.reduce((sum, item) => sum + item.score, 0) / totalCases) : 0;

  return {
    runId: createStableId("vtkjs-eval", requestedCases.join("-")),
    requestedCases,
    totalCases,
    acceptedCases,
    averageScore,
    cases,
    nextActions: [
      "Review any benchmark cases that fell below full score before treating the generator as stable.",
      "Use the generated browser-ready scripts as the next input to Phase 5 local workflow execution.",
      "Replace scaffold geometry with higher-fidelity task logic as the generator matures.",
    ],
  };
}
