import { Type } from "@sinclair/typebox";
import { generateVtkjsCode } from "../services/vtkjs-codegen.js";
import { createJsonToolResult } from "./tool-result.js";

export function createVtkjsCodeGenerateTool() {
  return {
    name: "vtkjs_code_generate",
    label: "vtk.js Code Generate",
    description:
      "Generate a vtk.js starter candidate from the specialized generation brief, including browser-ready HTML and script output.",
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
      return createJsonToolResult(generateVtkjsCode(params));
    },
  };
}
