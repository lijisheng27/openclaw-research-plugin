import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createCodeGeneratorTool } from "./src/tools/code-generator-tool.js";
import { createContextPackTool } from "./src/tools/context-pack-tool.js";
import { createKnowledgeIngestTool } from "./src/tools/knowledge-ingest-tool.js";
import { createKnowledgeStoreStatusTool } from "./src/tools/knowledge-store-status-tool.js";
import { createPaperIngestTool } from "./src/tools/paper-ingest-tool.js";
import { createPaperSearchTool } from "./src/tools/paper-search-tool.js";
import { createPhase1LoopTool } from "./src/tools/phase1-loop-tool.js";
import { createPhase2KnowledgeLoopTool } from "./src/tools/phase2-knowledge-loop-tool.js";
import { createRagQueryTool } from "./src/tools/rag-query-tool.js";
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
    api.registerTool(createPaperSearchTool());
    api.registerTool(createKnowledgeIngestTool());
    api.registerTool(createRagQueryTool());
    api.registerTool(createContextPackTool());
    api.registerTool(createKnowledgeStoreStatusTool());
    api.registerTool(createPhase2KnowledgeLoopTool());
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
