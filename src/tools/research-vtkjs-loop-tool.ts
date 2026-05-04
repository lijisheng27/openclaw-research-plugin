import { Type } from "@sinclair/typebox";
import { runResearchVtkjsLoop } from "../services/research-vtkjs-loop.js";
import { createJsonToolResult } from "./tool-result.js";

export function createResearchVtkjsLoopTool() {
  return {
    name: "research_vtkjs_loop",
    label: "Research vtk.js Loop",
    description:
      "Use the dedicated vtk.js entrypoint to plan the stable Phase 5 workflow, including structured sub-agent gates, repair, and visualization payloads.",
    parameters: Type.Object({
      goal: Type.String(),
      title: Type.Optional(Type.String()),
      abstract: Type.Optional(Type.String()),
      body: Type.Optional(Type.String()),
      code: Type.Optional(Type.String()),
      html: Type.Optional(Type.String()),
      script: Type.Optional(Type.String()),
      codeLanguage: Type.Optional(Type.Union([Type.Literal("typescript"), Type.Literal("python")])),
      artifactRoot: Type.Optional(Type.String()),
      environmentProfile: Type.Optional(
        Type.Literal("node-vtk"),
      ),
      requestedRuntime: Type.Optional(
        Type.Union([
          Type.Literal("docker"),
          Type.Literal("cloud"),
          Type.Literal("subagent"),
          Type.Literal("simulate"),
        ]),
      ),
      canvasSelector: Type.Optional(Type.String()),
      timeoutMs: Type.Optional(Type.Number()),
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
      maxRounds: Type.Optional(Type.Number()),
      knowledgeStorePath: Type.Optional(Type.String()),
      knowledgeLimit: Type.Optional(Type.Number()),
      knowledgeTopK: Type.Optional(Type.Number()),
      includeContext: Type.Optional(Type.Boolean()),
      includeGenerationBrief: Type.Optional(Type.Boolean()),
      includeGeneratedCandidate: Type.Optional(Type.Boolean()),
      includeCorpusBuild: Type.Optional(Type.Boolean()),
      corpusOutputRoot: Type.Optional(Type.String()),
      corpusArtifactRoot: Type.Optional(Type.String()),
      includeRepair: Type.Optional(Type.Boolean()),
      includeVisualization: Type.Optional(Type.Boolean()),
    }),
    async execute(
      _invocationId: string,
      params: {
        goal: string;
        title?: string;
        abstract?: string;
        body?: string;
        code?: string;
        html?: string;
        script?: string;
        codeLanguage?: "typescript" | "python";
        artifactRoot?: string;
        environmentProfile?: "node-vtk";
        requestedRuntime?: "docker" | "cloud" | "subagent" | "simulate";
        canvasSelector?: string;
        timeoutMs?: number;
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
        maxRounds?: number;
        knowledgeStorePath?: string;
        knowledgeLimit?: number;
        knowledgeTopK?: number;
        includeContext?: boolean;
        includeGenerationBrief?: boolean;
        includeGeneratedCandidate?: boolean;
        includeCorpusBuild?: boolean;
        corpusOutputRoot?: string;
        corpusArtifactRoot?: string;
        includeRepair?: boolean;
        includeVisualization?: boolean;
      },
    ) {
      return createJsonToolResult(runResearchVtkjsLoop(params));
    },
  };
}

