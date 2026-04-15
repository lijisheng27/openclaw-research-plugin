import type {
  CanvasBridgePayload,
  EvalRecord,
  GeneratedCode,
  Phase1LoopOutput,
  Phase4VisualizationOutput,
  StructuredProgressUpdate,
  TaskFlowBridgePayload,
  TaskGraph,
  TaskGraphSummary,
  VtkSceneExportContract,
} from "../contracts/research-contracts.js";
import { runPhase1Loop } from "./research-phase1.js";
import { createStableId } from "./research-utils.js";

function computeNodePercent(taskGraph: TaskGraph) {
  const totalNodes = taskGraph.nodes.length || 1;
  const completedNodes = taskGraph.nodes.filter((node) => node.status === "completed").length;
  const readyNodes = taskGraph.nodes.filter((node) => node.status === "ready").length;
  const failedNodes = taskGraph.nodes.filter((node) => node.status === "failed").length;
  return {
    totalNodes,
    completedNodes,
    readyNodes,
    failedNodes,
    completionPercent: Math.round((completedNodes / totalNodes) * 100),
  };
}

export function buildStructuredProgressUpdates(loop: Phase1LoopOutput): StructuredProgressUpdate[] {
  const now = new Date().toISOString();
  const nodeStats = computeNodePercent(loop.taskGraph);
  return [
    {
      progressId: createStableId("progress", `${loop.taskGraph.graphId}-phase1`),
      stage: "phase-1",
      currentStep: "Minimal loop completed",
      percent: 100,
      status: "completed",
      timestamp: now,
      details: [
        `Paper ingested: ${loop.paperMeta.title}`,
        `Task graph nodes: ${loop.taskGraph.nodes.length}`,
        `Sandbox status: ${loop.sandboxRun.status}`,
      ],
    },
    {
      progressId: createStableId("progress", `${loop.taskGraph.graphId}-phase3`),
      stage: "phase-3",
      currentStep: "Validation artifacts ready for UI surfaces",
      percent: loop.evaluation.status === "accepted" ? 100 : 75,
      status: loop.evaluation.status === "accepted" ? "completed" : "needs_attention",
      timestamp: now,
      details: [
        `Evaluation score: ${loop.evaluation.score}`,
        `Artifacts: ${loop.sandboxRun.producedArtifacts.length}`,
        `Completed nodes: ${nodeStats.completedNodes}/${nodeStats.totalNodes}`,
      ],
    },
    {
      progressId: createStableId("progress", `${loop.taskGraph.graphId}-phase4`),
      stage: "phase-4",
      currentStep: "Visualization bridge payload assembled",
      percent: 100,
      status: "completed",
      timestamp: now,
      details: [
        "Structured progress payload generated",
        "Canvas bridge cards generated",
        "Task Flow bridge nodes generated",
      ],
    },
  ];
}

export function summarizeTaskGraph(taskGraph: TaskGraph): TaskGraphSummary {
  const nodeStats = computeNodePercent(taskGraph);
  const criticalPath = taskGraph.nodes.map((node) => node.title);
  const nextRecommendedNode = taskGraph.nodes.find((node) => node.status === "ready")?.title;
  return {
    summaryId: createStableId("graph-summary", taskGraph.graphId),
    graphId: taskGraph.graphId,
    goal: taskGraph.goal,
    ...nodeStats,
    criticalPath,
    nextRecommendedNode,
  };
}

export function buildCanvasBridgePayload(params: {
  loop: Phase1LoopOutput;
  summary: TaskGraphSummary;
  progressUpdates: StructuredProgressUpdate[];
}): CanvasBridgePayload {
  const latestProgress = params.progressUpdates.at(-1);
  return {
    canvasId: createStableId("canvas", params.loop.taskGraph.graphId),
    title: "Research Workflow Canvas",
    subtitle: params.summary.goal,
    cards: [
      {
        id: createStableId("canvas-card", `${params.loop.taskGraph.graphId}-summary`),
        kind: "summary",
        title: "Task Graph Summary",
        body: `Completed ${params.summary.completedNodes}/${params.summary.totalNodes} nodes with ${params.summary.completionPercent}% completion.`,
        emphasis: "high",
      },
      {
        id: createStableId("canvas-card", `${params.loop.taskGraph.graphId}-progress`),
        kind: "progress",
        title: latestProgress?.currentStep ?? "Progress",
        body: latestProgress?.details.join(" | ") ?? "No progress details available.",
        emphasis: "medium",
      },
      {
        id: createStableId("canvas-card", `${params.loop.taskGraph.graphId}-artifact`),
        kind: "artifact",
        title: "Validation Artifacts",
        body:
          params.loop.sandboxRun.producedArtifacts.join(", ") ||
          "No validation artifacts produced by the current run.",
        emphasis: "medium",
      },
      {
        id: createStableId("canvas-card", `${params.loop.taskGraph.graphId}-decision`),
        kind: "decision",
        title: "Evaluator Decision",
        body: `${params.loop.evaluation.status} (${params.loop.evaluation.score})`,
        emphasis: params.loop.evaluation.status === "accepted" ? "low" : "high",
      },
    ],
  };
}

export function buildTaskFlowBridgePayload(taskGraph: TaskGraph): TaskFlowBridgePayload {
  const totalNodes = taskGraph.nodes.length || 1;
  return {
    flowId: createStableId("task-flow", taskGraph.graphId),
    graphId: taskGraph.graphId,
    nodes: taskGraph.nodes.map((node, index) => ({
      id: node.id,
      label: node.title,
      status: node.status,
      kind: node.kind,
      percent:
        node.status === "completed"
          ? 100
          : node.status === "running"
            ? 50
            : node.status === "ready"
              ? Math.round(((index + 1) / totalNodes) * 100)
              : 0,
    })),
    edges: taskGraph.edges,
  };
}

export function buildVtkSceneExportContract(params: {
  generatedCode: GeneratedCode;
  sandboxRun: Phase1LoopOutput["sandboxRun"];
  evaluation: EvalRecord;
}): VtkSceneExportContract {
  const artifactPath =
    params.sandboxRun.producedArtifacts.find((artifact) => artifact.endsWith(".json")) ??
    "artifacts/vtk-scene-summary.json";
  return {
    exportId: createStableId("vtk-export", `${params.generatedCode.entrypoint}-${artifactPath}`),
    sceneName: "vtk-js-validation-scene",
    format: "vtkjs-scene-export",
    entrypoint: params.generatedCode.entrypoint,
    artifactPath,
    metadata: {
      framework: params.generatedCode.framework,
      runId: params.sandboxRun.runId,
      evaluationStatus: params.evaluation.status,
    },
    validationChecks: [
      "sandbox-exit-code",
      "vtk-entrypoint-present",
      "artifact-produced",
    ],
  };
}

export function runPhase4VisualizationLoop(input: {
  goal: string;
  title: string;
  abstract: string;
  body?: string;
  code?: string;
}): Phase4VisualizationOutput {
  const loop = runPhase1Loop({
    goal: input.goal,
    title: input.title,
    abstract: input.abstract,
    body: input.body,
  });
  if (input.code) {
    loop.generatedCode.files = [{ path: loop.generatedCode.entrypoint, content: input.code }];
    loop.generatedCode.summary = `Phase 4 visualization loop for goal: ${input.goal}`;
  }
  const progressUpdates = buildStructuredProgressUpdates(loop);
  const taskGraphSummary = summarizeTaskGraph(loop.taskGraph);
  const canvasBridge = buildCanvasBridgePayload({
    loop,
    summary: taskGraphSummary,
    progressUpdates,
  });
  const taskFlowBridge = buildTaskFlowBridgePayload(loop.taskGraph);
  const vtkSceneExport = buildVtkSceneExportContract({
    generatedCode: loop.generatedCode,
    sandboxRun: loop.sandboxRun,
    evaluation: loop.evaluation,
  });
  return {
    progressUpdates,
    taskGraphSummary,
    canvasBridge,
    taskFlowBridge,
    vtkSceneExport,
  };
}
