import { Type } from "@sinclair/typebox";
import { buildPhase3AgentExecRecipe } from "../services/research-validation.js";
import { createJsonToolResult } from "./tool-result.js";

export function createPhase3AgentExecRecipeTool() {
  return {
    name: "phase3_agent_exec_recipe",
    label: "Phase 3 Agent Exec Recipe",
    description: "Build a standard OpenClaw agent recipe for phase3_local_workflow_plan followed by exec.",
    parameters: Type.Object({
      goal: Type.String(),
      title: Type.String(),
      abstract: Type.String(),
      body: Type.Optional(Type.String()),
      code: Type.Optional(Type.String()),
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
        artifactRoot?: string;
        environmentProfile?: "node-vtk" | "node-typescript" | "python-scientific";
        requestedRuntime?: "docker" | "cloud" | "subagent" | "simulate";
      },
    ) {
      return createJsonToolResult(buildPhase3AgentExecRecipe(params));
    },
  };
}
