import type {
  CanvasBridgePayload,
  Phase5RepairSummary,
  Phase5VisualizationOutput,
  StructuredProgressUpdate,
  TaskFlowBridgePayload,
} from "../contracts/research-contracts.js";
import { runPhase5RepairLoop } from "./vtkjs-repair.js";
import { createStableId } from "./research-utils.js";

interface Phase5VisualizationParams {
  goal: string;
  title?: string;
  abstract?: string;
  html?: string;
  script?: string;
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
  artifactRoot?: string;
  canvasSelector?: string;
  timeoutMs?: number;
  maxRounds?: number;
}

function buildPhase5RepairSummary(params: {
  goal: string;
  repairLoop: ReturnType<typeof runPhase5RepairLoop>;
}): Phase5RepairSummary {
  const latestRound = params.repairLoop.rounds.at(-1);
  const latestVerdict =
    latestRound?.evidenceSummary?.verdict ??
    params.repairLoop.evidenceSummary?.verdict ??
    "unknown";

  return {
    summaryId: createStableId("phase5-summary", `${params.goal}-${params.repairLoop.repair.category}`),
    goal: params.goal,
    maxRounds: params.repairLoop.maxRounds,
    plannedRounds: params.repairLoop.rounds.length,
    primaryCategory: params.repairLoop.repair.category,
    hasArtifactComparison: Boolean(params.repairLoop.artifactComparison),
    improvementDetected: params.repairLoop.artifactComparison?.improved ?? false,
    latestVerdict,
  };
}

function buildPhase5ProgressUpdates(params: {
  repairLoop: ReturnType<typeof runPhase5RepairLoop>;
  summary: Phase5RepairSummary;
}): StructuredProgressUpdate[] {
  const now = new Date().toISOString();
  const roundsPlanned = params.repairLoop.rounds.length;
  const comparison = params.repairLoop.artifactComparison;
  const latestVerdict = params.summary.latestVerdict;

  return [
    {
      progressId: createStableId("progress", `${params.summary.summaryId}-routing`),
      stage: "phase-5",
      currentStep: "Phase 5 repair route planned",
      percent: roundsPlanned > 0 ? 35 : 20,
      status: "completed",
      timestamp: now,
      details: [
        `Template: ${params.repairLoop.selection.templateLabel}`,
        `Primary category: ${params.repairLoop.repair.category}`,
        `Original route: ${params.repairLoop.originalRouteKind}`,
      ],
    },
    {
      progressId: createStableId("progress", `${params.summary.summaryId}-repair`),
      stage: "phase-5",
      currentStep: "Repair rounds prepared",
      percent: roundsPlanned > 0 ? 75 : 50,
      status: roundsPlanned > 0 ? "completed" : "needs_attention",
      timestamp: now,
      details: [
        `Planned rounds: ${roundsPlanned}/${params.repairLoop.maxRounds}`,
        ...params.repairLoop.repair.retryHints.slice(0, 2),
      ],
    },
    {
      progressId: createStableId("progress", `${params.summary.summaryId}-comparison`),
      stage: "phase-5",
      currentStep: "Artifact delta summarized",
      percent: comparison ? 100 : 85,
      status:
        latestVerdict === "accepted" || comparison?.improved
          ? "completed"
          : "needs_attention",
      timestamp: now,
      details: comparison
        ? comparison.changes
        : [
            `Latest verdict: ${latestVerdict}`,
            "No after-retry artifact comparison was provided yet.",
          ],
    },
  ];
}

function buildPhase5CanvasBridge(params: {
  summary: Phase5RepairSummary;
  repairLoop: ReturnType<typeof runPhase5RepairLoop>;
  progressUpdates: StructuredProgressUpdate[];
}): CanvasBridgePayload {
  const comparison = params.repairLoop.artifactComparison;
  const latestProgress = params.progressUpdates.at(-1);
  const latestRound = params.repairLoop.rounds.at(-1);

  return {
    canvasId: createStableId("phase5-canvas", params.summary.summaryId),
    title: "Phase 5 Repair Canvas",
    subtitle: params.summary.goal,
    cards: [
      {
        id: createStableId("phase5-card", `${params.summary.summaryId}-summary`),
        kind: "summary",
        title: "Repair Summary",
        body: `Category ${params.summary.primaryCategory}; planned ${params.summary.plannedRounds}/${params.summary.maxRounds} rounds; latest verdict ${params.summary.latestVerdict}.`,
        emphasis: "high",
      },
      {
        id: createStableId("phase5-card", `${params.summary.summaryId}-progress`),
        kind: "progress",
        title: latestProgress?.currentStep ?? "Repair Progress",
        body: latestProgress?.details.join(" | ") ?? "No repair progress details available.",
        emphasis: "medium",
      },
      {
        id: createStableId("phase5-card", `${params.summary.summaryId}-repair`),
        kind: "repair",
        title: "Latest Repair Hints",
        body:
          latestRound?.repair.retryHints.join(" | ") ||
          params.repairLoop.repair.retryHints.join(" | ") ||
          "No retry hints available.",
        emphasis: "medium",
      },
      {
        id: createStableId("phase5-card", `${params.summary.summaryId}-artifact`),
        kind: "artifact",
        title: "Artifact Delta",
        body:
          comparison?.changes.join(" | ") ||
          "Artifact comparison will appear here after a retry run is available.",
        emphasis: comparison?.improved ? "low" : "high",
      },
      {
        id: createStableId("phase5-card", `${params.summary.summaryId}-decision`),
        kind: "decision",
        title: "Review Decision",
        body:
          comparison?.improved
            ? "Evidence improved after comparison."
            : `Latest verdict is ${params.summary.latestVerdict}.`,
        emphasis: comparison?.improved ? "low" : "high",
      },
    ],
  };
}

function buildPhase5TaskFlow(params: {
  summary: Phase5RepairSummary;
  repairLoop: ReturnType<typeof runPhase5RepairLoop>;
}): TaskFlowBridgePayload {
  const totalNodes = Math.max(1, params.repairLoop.rounds.length + 1);
  const nodes = [
    {
      id: createStableId("phase5-node", `${params.summary.summaryId}-classify`),
      label: `Classify ${params.repairLoop.repair.category}`,
      status: "completed" as const,
      kind: "repair" as const,
      percent: 100,
    },
    ...params.repairLoop.rounds.map((round, index) => {
      const status: "completed" | "failed" = round.repair.shouldRetry ? "completed" : "failed";
      return {
        id: createStableId("phase5-node", `${params.summary.summaryId}-round-${round.round}`),
        label: `Repair Round ${round.round}`,
        status,
        kind: "repair" as const,
        percent: Math.round(((index + 2) / totalNodes) * 100),
      };
    }),
  ];

  const edges = nodes.slice(1).map((node, index) => ({
    from: nodes[index].id,
    to: node.id,
  }));

  return {
    flowId: createStableId("phase5-flow", params.summary.summaryId),
    graphId: params.summary.summaryId,
    nodes,
    edges,
  };
}

export function runPhase5VisualizationLoop(input: Phase5VisualizationParams): Phase5VisualizationOutput {
  const repairLoop = runPhase5RepairLoop(input);
  const repairSummary = buildPhase5RepairSummary({
    goal: input.goal,
    repairLoop,
  });
  const progressUpdates = buildPhase5ProgressUpdates({
    repairLoop,
    summary: repairSummary,
  });
  const canvasBridge = buildPhase5CanvasBridge({
    summary: repairSummary,
    repairLoop,
    progressUpdates,
  });
  const taskFlowBridge = buildPhase5TaskFlow({
    summary: repairSummary,
    repairLoop,
  });

  return {
    progressUpdates,
    repairSummary,
    canvasBridge,
    taskFlowBridge,
    artifactComparison: repairLoop.artifactComparison,
  };
}
