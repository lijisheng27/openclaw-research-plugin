import { Type } from "@sinclair/typebox";
import { buildPhase5TemplateExecRecipe } from "../services/vtkjs-phase5.js";
import { createJsonToolResult } from "./tool-result.js";

export function createVtkjsTemplateSelectTool() {
  return {
    name: "vtkjs_template_select",
    label: "vtk.js Template Select",
    description:
      "Select the best Phase 5 task template for vtk.js or scientific workflows and return a recommended execution recipe.",
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
      return createJsonToolResult(buildPhase5TemplateExecRecipe(params));
    },
  };
}
