import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createCodeGeneratorTool } from "./src/tools/code-generator-tool.js";
import { createPaperIngestTool } from "./src/tools/paper-ingest-tool.js";
import { createPhase1LoopTool } from "./src/tools/phase1-loop-tool.js";
import { createResearchStatusTool } from "./src/tools/research-status-tool.js";
import { createReportBuildTool } from "./src/tools/report-build-tool.js";
import { createSandboxRunTool } from "./src/tools/sandbox-run-tool.js";
import { createTaskOrchestratorTool } from "./src/tools/task-orchestrator-tool.js";
import { createTraceRecorderTool } from "./src/tools/trace-recorder-tool.js";
import { createValidatorTool } from "./src/tools/validator-tool.js";
import { createVtkjsValidateTool } from "./src/tools/vtkjs-validate-tool.js";

export default definePluginEntry({
  id: "research-plugin",
  name: "Research Plugin",
  description: "Plugin-first scientific workflow extension for OpenClaw",
  register(api) {
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
