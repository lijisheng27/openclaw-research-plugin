import { Type } from "@sinclair/typebox";
import { runPhase4VisualizationLoop } from "../services/research-visualization.js";
import { createJsonToolResult } from "./tool-result.js";

export function createPhase4VisualizationLoopTool() {
  return {
    name: "research_phase4_visualization_loop",
    label: "Research Phase 4 Visualization Loop",
    description: "Build progress, summary, Canvas bridge, Task Flow bridge, and vtk scene export payloads.",
    parameters: Type.Object({
      goal: Type.String(),
      title: Type.String(),
      abstract: Type.String(),
      body: Type.Optional(Type.String()),
      code: Type.Optional(Type.String()),
    }),
    async execute(
      _invocationId: string,
      params: { goal: string; title: string; abstract: string; body?: string; code?: string },
    ) {
      return createJsonToolResult(runPhase4VisualizationLoop(params));
    },
  };
}
