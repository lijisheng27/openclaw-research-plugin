import { Type } from "@sinclair/typebox";
import { runPhase5ExecutionLoop } from "../services/vtkjs-phase5.js";
import { createJsonToolResult } from "./tool-result.js";

export function createPhase5ExecutionLoopTool() {
  return {
    name: "research_phase5_execution_loop",
    label: "Research Phase 5 Execution Loop",
    description: "Run the Phase 5 template router and return the selected validation branch plus a local workflow command.",
    parameters: Type.Object({
      goal: Type.String(),
      title: Type.String(),
      abstract: Type.String(),
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
    }),
    async execute(
      _invocationId: string,
      params: {
        goal: string;
        title: string;
        abstract: string;
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
      },
    ) {
      return createJsonToolResult(runPhase5ExecutionLoop(params));
    },
  };
}

