import { Type } from "@sinclair/typebox";
import { runPhase1Loop } from "../services/research-phase1.js";
import { summarizeTaskGraph } from "../services/research-visualization.js";
import { createJsonToolResult } from "./tool-result.js";

export function createTaskGraphSummaryTool() {
  return {
    name: "task_graph_summary",
    label: "Task Graph Summary",
    description: "Summarize the current task graph for Task Flow and review surfaces.",
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
      return createJsonToolResult(summarizeTaskGraph(loop.taskGraph));
    },
  };
}
