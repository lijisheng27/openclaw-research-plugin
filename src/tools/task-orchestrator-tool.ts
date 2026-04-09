import { Type } from "@sinclair/typebox";
import { ingestPaper, orchestrateTaskGraph } from "../services/research-phase1.js";
import { createJsonToolResult } from "./tool-result.js";

export function createTaskOrchestratorTool() {
  return {
    name: "task_orchestrator",
    label: "Task Orchestrator",
    description: "Build a TaskGraph for the Phase 1 research loop.",
    parameters: Type.Object({
      goal: Type.String(),
      title: Type.String(),
      abstract: Type.String(),
      body: Type.Optional(Type.String()),
    }),
    async execute(
      _invocationId: string,
      params: { goal: string; title: string; abstract: string; body?: string },
    ) {
      const { paperMeta } = ingestPaper(params);
      const payload = orchestrateTaskGraph({ goal: params.goal, paperMeta });
      return createJsonToolResult(payload);
    },
  };
}
