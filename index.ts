import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createArtifactCaptureTool } from "./src/tools/artifact-capture-tool.js";
import { createCanvasBridgeTool } from "./src/tools/canvas-bridge-tool.js";
import { createCloudSandboxPlanTool } from "./src/tools/cloud-sandbox-plan-tool.js";
import { createCodeGeneratorTool } from "./src/tools/code-generator-tool.js";
import { createContextPackTool } from "./src/tools/context-pack-tool.js";
import { createDockerSandboxRunTool } from "./src/tools/docker-sandbox-run-tool.js";
import { createKnowledgeIngestTool } from "./src/tools/knowledge-ingest-tool.js";
import { createKnowledgeStoreStatusTool } from "./src/tools/knowledge-store-status-tool.js";
import { createPaperIngestTool } from "./src/tools/paper-ingest-tool.js";
import { createPaperSearchTool } from "./src/tools/paper-search-tool.js";
import { createPhase1LoopTool } from "./src/tools/phase1-loop-tool.js";
import { createPhase2KnowledgeLoopTool } from "./src/tools/phase2-knowledge-loop-tool.js";
import { createPhase3ValidationLoopTool } from "./src/tools/phase3-validation-loop-tool.js";
import { createPhase3LocalWorkflowPlanTool } from "./src/tools/phase3-local-workflow-plan-tool.js";
import { createPhase3AgentExecRecipeTool } from "./src/tools/phase3-agent-exec-recipe-tool.js";
import { createPhase4VisualizationLoopTool } from "./src/tools/phase4-visualization-loop-tool.js";
import { createRagQueryTool } from "./src/tools/rag-query-tool.js";
import { createResearchStatusTool } from "./src/tools/research-status-tool.js";
import { createReportBuildTool } from "./src/tools/report-build-tool.js";
import { createSandboxPolicyTool } from "./src/tools/sandbox-policy-tool.js";
import { createSandboxRunTool } from "./src/tools/sandbox-run-tool.js";
import { createStructuredProgressTool } from "./src/tools/structured-progress-tool.js";
import { createTaskFlowBridgeTool } from "./src/tools/task-flow-bridge-tool.js";
import { createTaskOrchestratorTool } from "./src/tools/task-orchestrator-tool.js";
import { createTaskGraphSnapshotTool } from "./src/tools/task-graph-snapshot-tool.js";
import { createTaskGraphSummaryTool } from "./src/tools/task-graph-summary-tool.js";
import { createTraceReplayTool } from "./src/tools/trace-replay-tool.js";
import { createTraceRecorderTool } from "./src/tools/trace-recorder-tool.js";
import { createValidatorTool } from "./src/tools/validator-tool.js";
import { createVtkSceneExportTool } from "./src/tools/vtk-scene-export-tool.js";
import { createVtkjsValidateTool } from "./src/tools/vtkjs-validate-tool.js";

export default definePluginEntry({
  id: "research-plugin",
  name: "Research Plugin",
  description: "Plugin-first scientific workflow extension for OpenClaw",
  register(api) {
    api.registerTool(createPaperSearchTool());
    api.registerTool(createKnowledgeIngestTool());
    api.registerTool(createRagQueryTool());
    api.registerTool(createContextPackTool());
    api.registerTool(createKnowledgeStoreStatusTool());
    api.registerTool(createPhase2KnowledgeLoopTool());
    api.registerTool(createSandboxPolicyTool());
    api.registerTool(createDockerSandboxRunTool());
    api.registerTool(createCloudSandboxPlanTool());
    api.registerTool(createArtifactCaptureTool());
    api.registerTool(createTaskGraphSnapshotTool());
    api.registerTool(createTraceReplayTool());
    api.registerTool(createPhase3LocalWorkflowPlanTool());
    api.registerTool(createPhase3AgentExecRecipeTool());
    api.registerTool(createPhase3ValidationLoopTool());
    api.registerTool(createStructuredProgressTool());
    api.registerTool(createTaskGraphSummaryTool());
    api.registerTool(createCanvasBridgeTool());
    api.registerTool(createTaskFlowBridgeTool());
    api.registerTool(createVtkSceneExportTool());
    api.registerTool(createPhase4VisualizationLoopTool());
    api.registerTool(createPaperIngestTool());
    api.registerTool(createTaskOrchestratorTool());
    api.registerTool(createCodeGeneratorTool());
    api.registerTool(createSandboxRunTool());
    api.registerTool(createValidatorTool());
    api.registerTool(createTraceRecorderTool());
    api.registerTool(createReportBuildTool());
    api.registerTool(createVtkjsValidateTool());
    api.registerTool(createPhase1LoopTool());
    api.registerTool(createResearchStatusTool());
  },
});
