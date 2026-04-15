import { Type } from "@sinclair/typebox";
import { runPhase1Loop } from "../services/research-phase1.js";
import {
  buildCanvasBridgePayload,
  buildStructuredProgressUpdates,
  summarizeTaskGraph,
} from "../services/research-visualization.js";
import { createJsonToolResult } from "./tool-result.js";

export function createCanvasBridgeTool() {
  return {
    name: "canvas_bridge",
    label: "Canvas Bridge",
    description: "Build a Canvas-friendly card payload from the research workflow state.",
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
      const progressUpdates = buildStructuredProgressUpdates(loop);
      const summary = summarizeTaskGraph(loop.taskGraph);
      return createJsonToolResult(
        buildCanvasBridgePayload({
          loop,
          summary,
          progressUpdates,
        }),
      );
    },
  };
}
