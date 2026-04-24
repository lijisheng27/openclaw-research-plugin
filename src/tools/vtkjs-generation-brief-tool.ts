import { Type } from "@sinclair/typebox";
import { buildVtkjsGenerationBrief } from "../services/vtkjs-generator.js";
import { createJsonToolResult } from "./tool-result.js";

export function createVtkjsGenerationBriefTool() {
  return {
    name: "vtkjs_generation_brief",
    label: "vtk.js Generation Brief",
    description:
      "Turn vtk.js retrieval context into a generator-friendly brief with starter script, prompt guidance, and acceptance checks.",
    parameters: Type.Object({
      goal: Type.String(),
      title: Type.Optional(Type.String()),
      abstract: Type.Optional(Type.String()),
      storePath: Type.Optional(Type.String()),
      limit: Type.Optional(Type.Number()),
      topK: Type.Optional(Type.Number()),
    }),
    async execute(
      _invocationId: string,
      params: {
        goal: string;
        title?: string;
        abstract?: string;
        storePath?: string;
        limit?: number;
        topK?: number;
      },
    ) {
      return createJsonToolResult(buildVtkjsGenerationBrief(params));
    },
  };
}
