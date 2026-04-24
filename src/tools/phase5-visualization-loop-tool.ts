import { Type } from "@sinclair/typebox";
import { runPhase5VisualizationLoop } from "../services/phase5-visualization.js";
import { createJsonToolResult } from "./tool-result.js";

export function createPhase5VisualizationLoopTool() {
  return {
    name: "research_phase5_visualization_loop",
    label: "Research Phase 5 Visualization Loop",
    description: "Build progress, Canvas, Task Flow, and artifact-delta payloads for Phase 5 repair review.",
    parameters: Type.Object({
      goal: Type.String(),
      title: Type.Optional(Type.String()),
      abstract: Type.Optional(Type.String()),
      html: Type.Optional(Type.String()),
      script: Type.Optional(Type.String()),
      renderReport: Type.Optional(Type.String()),
      renderReportPath: Type.Optional(Type.String()),
      browserConsole: Type.Optional(Type.String()),
      browserConsolePath: Type.Optional(Type.String()),
      pageErrors: Type.Optional(Type.String()),
      pageErrorsPath: Type.Optional(Type.String()),
      comparisonRenderReport: Type.Optional(Type.String()),
      comparisonRenderReportPath: Type.Optional(Type.String()),
      comparisonBrowserConsole: Type.Optional(Type.String()),
      comparisonBrowserConsolePath: Type.Optional(Type.String()),
      comparisonPageErrors: Type.Optional(Type.String()),
      comparisonPageErrorsPath: Type.Optional(Type.String()),
      artifactRoot: Type.Optional(Type.String()),
      canvasSelector: Type.Optional(Type.String()),
      timeoutMs: Type.Optional(Type.Number()),
      maxRounds: Type.Optional(Type.Number()),
    }),
    async execute(
      _invocationId: string,
      params: {
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
      },
    ) {
      return createJsonToolResult(runPhase5VisualizationLoop(params));
    },
  };
}
