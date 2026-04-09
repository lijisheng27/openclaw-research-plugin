import type {
  EvalRecord,
  GeneratedCode,
  PaperMeta,
  Phase1LoopOutput,
  RAGIndex,
  ResearchReport,
  SandboxRunResult,
  TaskGraph,
  ThinkActionTrace,
  ThinkActionTraceStep,
} from "../contracts/research-contracts.js";
import { chunkText, createStableId, pickKeywords } from "./research-utils.js";

export interface PaperIngestInput {
  title: string;
  abstract: string;
  body?: string;
  source?: string;
}

export interface TaskOrchestratorInput {
  goal: string;
  paperMeta: PaperMeta;
}

export interface CodeGeneratorInput {
  goal: string;
  taskGraph: TaskGraph;
}

export interface SandboxRunInput {
  generatedCode: GeneratedCode;
}

export interface ValidatorInput {
  generatedCode: GeneratedCode;
  sandboxRun: SandboxRunResult;
}

export interface ReportBuildInput {
  goal: string;
  evaluation: EvalRecord;
  sandboxRun: SandboxRunResult;
}

export function ingestPaper(input: PaperIngestInput): { paperMeta: PaperMeta; ragIndex: RAGIndex } {
  const sourceText = [input.title, input.abstract, input.body ?? ""].join(" ");
  const keywords = pickKeywords(sourceText);
  const chunks = chunkText(`${input.abstract} ${input.body ?? ""}`).map((text, index) => ({
    id: createStableId("chunk", `${input.title}-${index + 1}`),
    text,
    keywords: pickKeywords(text, 5),
  }));

  return {
    paperMeta: {
      title: input.title,
      abstract: input.abstract,
      source: input.source ?? "local-ingest",
      keywords,
    },
    ragIndex: {
      indexId: createStableId("rag", input.title),
      documentCount: 1,
      chunkCount: chunks.length,
      chunks,
    },
  };
}

export function orchestrateTaskGraph(input: TaskOrchestratorInput): TaskGraph {
  const graphId = createStableId("graph", input.goal);
  const nodes = [
    {
      id: `${graphId}-ingest`,
      title: "Ingest paper evidence",
      kind: "ingest" as const,
      status: "completed" as const,
      inputs: [input.paperMeta.title],
      outputs: ["rag-index"],
      dependsOn: [],
    },
    {
      id: `${graphId}-retrieve`,
      title: "Retrieve relevant research context",
      kind: "retrieve" as const,
      status: "ready" as const,
      inputs: ["rag-index"],
      outputs: ["context-pack"],
      dependsOn: [`${graphId}-ingest`],
    },
    {
      id: `${graphId}-generate`,
      title: "Generate vtk.js experiment code",
      kind: "generate" as const,
      status: "ready" as const,
      inputs: ["context-pack"],
      outputs: ["generated-code"],
      dependsOn: [`${graphId}-retrieve`],
    },
    {
      id: `${graphId}-execute`,
      title: "Run code in sandbox",
      kind: "execute" as const,
      status: "ready" as const,
      inputs: ["generated-code"],
      outputs: ["sandbox-run-result"],
      dependsOn: [`${graphId}-generate`],
    },
    {
      id: `${graphId}-validate`,
      title: "Validate outputs and constraints",
      kind: "validate" as const,
      status: "ready" as const,
      inputs: ["sandbox-run-result"],
      outputs: ["evaluation-record"],
      dependsOn: [`${graphId}-execute`],
    },
    {
      id: `${graphId}-report`,
      title: "Build execution report",
      kind: "report" as const,
      status: "ready" as const,
      inputs: ["evaluation-record"],
      outputs: ["phase1-report"],
      dependsOn: [`${graphId}-validate`],
    },
  ];

  return {
    graphId,
    goal: input.goal,
    nodes,
    edges: nodes.flatMap((node) => node.dependsOn.map((parent) => ({ from: parent, to: node.id }))),
  };
}

export function generateCode(input: CodeGeneratorInput): GeneratedCode {
  const summary = `Phase 1 generated vtk.js starter for goal: ${input.goal}`;
  const appCode = `import vtkFullScreenRenderWindow from "vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow";
import vtkSphereSource from "vtk.js/Sources/Filters/Sources/SphereSource";
import vtkMapper from "vtk.js/Sources/Rendering/Core/Mapper";
import vtkActor from "vtk.js/Sources/Rendering/Core/Actor";

export function runExperiment() {
  const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance();
  const renderer = fullScreenRenderer.getRenderer();
  const renderWindow = fullScreenRenderer.getRenderWindow();

  const source = vtkSphereSource.newInstance({ radius: 0.5, thetaResolution: 24, phiResolution: 24 });
  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(source.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  renderer.addActor(actor);
  renderer.resetCamera();
  renderWindow.render();

  return {
    scene: "sphere",
    graphId: "${input.taskGraph.graphId}",
    status: "rendered"
  };
}
`;

  return {
    language: "typescript",
    framework: "vtk.js",
    entrypoint: "src/generated/app.ts",
    summary,
    files: [
      {
        path: "src/generated/app.ts",
        content: appCode,
      },
    ],
  };
}

export function runSandbox(input: SandboxRunInput): SandboxRunResult {
  const artifact = "artifacts/vtk-scene-summary.json";
  const containsUnsafePlaceholder = input.generatedCode.files.some((file) =>
    /TODO|throw new Error|FIXME/.test(file.content),
  );

  return {
    runId: createStableId("run", input.generatedCode.summary),
    status: containsUnsafePlaceholder ? "failed" : "passed",
    runtime: "subagent-sandbox-simulated",
    stdout: [
      "Booting simulated sandbox runtime",
      `Executing ${input.generatedCode.entrypoint}`,
      "vtk.js scene bootstrap completed",
    ],
    stderr: containsUnsafePlaceholder ? ["Unsafe placeholder detected in generated code"] : [],
    producedArtifacts: containsUnsafePlaceholder ? [] : [artifact],
    exitCode: containsUnsafePlaceholder ? 1 : 0,
  };
}

export function validateRun(input: ValidatorInput): EvalRecord {
  const checks = [
    {
      name: "sandbox-exit-code",
      passed: input.sandboxRun.exitCode === 0,
      detail: `Expected exit code 0, got ${input.sandboxRun.exitCode}.`,
    },
    {
      name: "vtk-entrypoint-present",
      passed: input.generatedCode.entrypoint.endsWith(".ts"),
      detail: `Entrypoint resolved to ${input.generatedCode.entrypoint}.`,
    },
    {
      name: "artifact-produced",
      passed: input.sandboxRun.producedArtifacts.length > 0,
      detail: `Produced ${input.sandboxRun.producedArtifacts.length} artifacts.`,
    },
  ];

  const passed = checks.filter((check) => check.passed).length;
  const score = Math.round((passed / checks.length) * 100);

  return {
    evaluationId: createStableId("eval", input.generatedCode.summary),
    status: score === 100 ? "accepted" : "needs_revision",
    score,
    checks,
    revisionSuggestions:
      score === 100
        ? []
        : [
            "Remove placeholder exceptions before sandbox execution.",
            "Ensure vtk.js export artifacts are generated for validator consumption.",
          ],
  };
}

export function buildTrace(output: {
  paperMeta: PaperMeta;
  taskGraph: TaskGraph;
  generatedCode: GeneratedCode;
  sandboxRun: SandboxRunResult;
  evaluation: EvalRecord;
}): ThinkActionTrace {
  const steps: ThinkActionTraceStep[] = [
    {
      stepId: `${output.taskGraph.graphId}-trace-1`,
      phase: "paper_ingest",
      thought: `Extract domain terms from ${output.paperMeta.title}.`,
      action: "Chunk paper abstract/body into RAG-ready segments.",
      observation: `Collected keywords: ${output.paperMeta.keywords.join(", ")}.`,
    },
    {
      stepId: `${output.taskGraph.graphId}-trace-2`,
      phase: "task_orchestrator",
      thought: "Convert goal into an execution graph with explicit validation.",
      action: "Build ingest -> retrieve -> generate -> execute -> validate -> report graph.",
      observation: `Task graph has ${output.taskGraph.nodes.length} nodes.`,
    },
    {
      stepId: `${output.taskGraph.graphId}-trace-3`,
      phase: "code_generator",
      thought: "Produce a minimal vtk.js scene that is easy to validate.",
      action: `Generate ${output.generatedCode.entrypoint}.`,
      observation: `Generated ${output.generatedCode.files.length} file(s).`,
    },
    {
      stepId: `${output.taskGraph.graphId}-trace-4`,
      phase: "sandbox_run",
      thought: "Validate code in an isolated runtime path before acceptance.",
      action: "Run simulated sub-agent sandbox execution.",
      observation: `Sandbox status: ${output.sandboxRun.status}.`,
    },
    {
      stepId: `${output.taskGraph.graphId}-trace-5`,
      phase: "validator",
      thought: "Check execution, artifacts, and basic vtk.js contract compliance.",
      action: "Score the run and emit revision guidance if needed.",
      observation: `Evaluation status: ${output.evaluation.status} (${output.evaluation.score}).`,
    },
    {
      stepId: `${output.taskGraph.graphId}-trace-6`,
      phase: "report_build",
      thought: "Summarize the loop output for users and future replay.",
      action: "Package results into a report-friendly structure.",
      observation: "Phase 1 loop output is ready for visualization.",
    },
  ];

  return {
    traceId: createStableId("trace", output.taskGraph.graphId),
    taskGraphId: output.taskGraph.graphId,
    steps,
  };
}

export function buildReport(input: ReportBuildInput): ResearchReport {
  return {
    reportId: createStableId("report", input.goal),
    summary: `Phase 1 loop finished with ${input.evaluation.status} after sandbox status ${input.sandboxRun.status}.`,
    keyFindings: [
      `Evaluation score: ${input.evaluation.score}`,
      `Sandbox artifacts: ${input.sandboxRun.producedArtifacts.join(", ") || "none"}`,
    ],
    nextActions:
      input.evaluation.status === "accepted"
        ? ["Extend from simulated sandbox to Docker adapter.", "Add real vtk.js validation metrics."]
        : input.evaluation.revisionSuggestions,
  };
}

export function runPhase1Loop(input: { goal: string; title: string; abstract: string; body?: string }): Phase1LoopOutput {
  const { paperMeta, ragIndex } = ingestPaper({
    title: input.title,
    abstract: input.abstract,
    body: input.body,
  });
  const taskGraph = orchestrateTaskGraph({ goal: input.goal, paperMeta });
  const generatedCode = generateCode({ goal: input.goal, taskGraph });
  const sandboxRun = runSandbox({ generatedCode });
  const evaluation = validateRun({ generatedCode, sandboxRun });
  const trace = buildTrace({ paperMeta, taskGraph, generatedCode, sandboxRun, evaluation });
  const report = buildReport({ goal: input.goal, evaluation, sandboxRun });

  return {
    paperMeta,
    ragIndex,
    taskGraph,
    generatedCode,
    sandboxRun,
    evaluation,
    trace,
    report,
  };
}

