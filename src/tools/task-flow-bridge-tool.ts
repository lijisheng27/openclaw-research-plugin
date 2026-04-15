import { Type } from "@sinclair/typebox";
import { runPhase1Loop } from "../services/research-phase1.js";
import { buildTaskFlowBridgePayload } from "../services/research-visualization.js";
import { createJsonToolResult } from "./tool-result.js";

export function createTaskFlowBridgeTool() {
  return {
    name: "task_flow_bridge",
    label: "Task Flow Bridge",
    description: "Build a Task Flow-friendly node and edge payload from the task graph.",
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
      const loop = runPhase1Loop(params);
      return createJsonToolResult(buildTaskFlowBridgePayload(loop.taskGraph));
    },
  };
}
