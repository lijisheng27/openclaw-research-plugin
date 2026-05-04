import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPhase5AgentExecRecipeTool } from "./src/tools/phase5-agent-exec-recipe-tool.js";
import { createPhase5ExecutionLoopTool } from "./src/tools/phase5-execution-loop-tool.js";
import { createPhase5LocalWorkflowPlanTool } from "./src/tools/phase5-local-workflow-plan-tool.js";
import { createPhase5RepairLoopTool } from "./src/tools/phase5-repair-loop-tool.js";
import { createPhase5RepairWorkflowPlanTool } from "./src/tools/phase5-repair-workflow-plan-tool.js";
import { createPhase5VisualizationLoopTool } from "./src/tools/phase5-visualization-loop-tool.js";
import { createResearchVtkjsLoopTool } from "./src/tools/research-vtkjs-loop-tool.js";
import { createVtkjsCodeGenerateTool } from "./src/tools/vtkjs-code-generate-tool.js";
import { createVtkjsCorpusBuildTool } from "./src/tools/vtkjs-corpus-build-tool.js";
import { createVtkjsCorpusUpdateTool } from "./src/tools/vtkjs-corpus-update-tool.js";
import { createVtkjsEvalRunnerTool } from "./src/tools/vtkjs-eval-runner-tool.js";
import { createVtkjsGenerationBriefTool } from "./src/tools/vtkjs-generation-brief-tool.js";
import { createVtkjsKnowledgeIngestTool } from "./src/tools/vtkjs-knowledge-ingest-tool.js";
import { createVtkjsRenderVerifyTool } from "./src/tools/vtkjs-render-verify-tool.js";
import { createVtkjsRepairOnceTool } from "./src/tools/vtkjs-repair-once-tool.js";
import { createVtkjsRetrieveContextTool } from "./src/tools/vtkjs-retrieve-context-tool.js";

export default definePluginEntry({
  id: "research-plugin",
  name: "Research Plugin",
  description: "Phase 5 vtk.js research workflow extension for OpenClaw",
  register(api) {
    api.registerTool(createResearchVtkjsLoopTool());
    api.registerTool(createPhase5AgentExecRecipeTool());
    api.registerTool(createPhase5ExecutionLoopTool());
    api.registerTool(createPhase5LocalWorkflowPlanTool());
    api.registerTool(createPhase5RepairWorkflowPlanTool());
    api.registerTool(createPhase5RepairLoopTool());
    api.registerTool(createPhase5VisualizationLoopTool());
    api.registerTool(createVtkjsKnowledgeIngestTool());
    api.registerTool(createVtkjsRetrieveContextTool());
    api.registerTool(createVtkjsGenerationBriefTool());
    api.registerTool(createVtkjsCodeGenerateTool());
    api.registerTool(createVtkjsCorpusBuildTool());
    api.registerTool(createVtkjsCorpusUpdateTool());
    api.registerTool(createVtkjsEvalRunnerTool());
    api.registerTool(createVtkjsRepairOnceTool());
    api.registerTool(createVtkjsRenderVerifyTool());
  },
});
