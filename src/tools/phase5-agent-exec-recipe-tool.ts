import { Type } from "@sinclair/typebox";
import { buildPhase5AgentExecRecipe } from "../services/vtkjs-phase5.js";
import { createJsonToolResult } from "./tool-result.js";

export function createPhase5AgentExecRecipeTool() {
  return {
    name: "phase5_agent_exec_recipe",
    label: "Phase 5 Agent Exec Recipe",
    description: "Build a stable OpenClaw execution recipe for research_phase5_execution_loop followed by exec.",
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
        environmentProfile?: "node-vtk" | "node-typescript" | "python-scientific";
        requestedRuntime?: "docker" | "cloud" | "subagent" | "simulate";
        canvasSelector?: string;
        timeoutMs?: number;
      },
    ) {
      return createJsonToolResult(buildPhase5AgentExecRecipe(params));
    },
  };
}
