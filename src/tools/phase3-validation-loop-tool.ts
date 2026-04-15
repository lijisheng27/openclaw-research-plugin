import { Type } from "@sinclair/typebox";
import { runPhase3ValidationLoop } from "../services/research-validation.js";
import { createJsonToolResult } from "./tool-result.js";

export function createPhase3ValidationLoopTool() {
  return {
    name: "research_phase3_validation_loop",
    label: "Research Phase 3 Validation Loop",
    description: "Run policy selection, Docker sandbox manifest generation, artifact capture, snapshot, and replay.",
    parameters: Type.Object({
      goal: Type.String(),
      title: Type.String(),
      abstract: Type.String(),
      body: Type.Optional(Type.String()),
      code: Type.Optional(Type.String()),
      codeLanguage: Type.Optional(Type.Union([Type.Literal("typescript"), Type.Literal("python")])),
      executeDocker: Type.Optional(Type.Boolean()),
      artifactRoot: Type.Optional(Type.String()),
      environmentProfile: Type.Optional(
        Type.Union([
          Type.Literal("node-vtk"),
          Type.Literal("node-typescript"),
          Type.Literal("python-scientific"),
        ]),
      ),
      requestedRuntime: Type.Optional(
        Type.Union([
          Type.Literal("docker"),
          Type.Literal("cloud"),
          Type.Literal("subagent"),
          Type.Literal("simulate"),
        ]),
      ),
    }),
    async execute(
      _invocationId: string,
      params: {
        goal: string;
        title: string;
        abstract: string;
        body?: string;
        code?: string;
        codeLanguage?: "typescript" | "python";
        executeDocker?: boolean;
        artifactRoot?: string;
        environmentProfile?: "node-vtk" | "node-typescript" | "python-scientific";
        requestedRuntime?: "docker" | "cloud" | "subagent" | "simulate";
      },
    ) {
      return createJsonToolResult(runPhase3ValidationLoop(params));
    },
  };
}
