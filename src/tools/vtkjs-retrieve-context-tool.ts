import { Type } from "@sinclair/typebox";
import { retrieveVtkjsContext } from "../services/vtkjs-knowledge.js";
import { createJsonToolResult } from "./tool-result.js";

export function createVtkjsRetrieveContextTool() {
  return {
    name: "vtkjs_retrieve_context",
    label: "vtk.js Retrieve Context",
    description: "Retrieve vtk.js-specific ranked context, citations, guidance patterns, and failure-fix hints from the dedicated store.",
    parameters: Type.Object({
      query: Type.String(),
      limit: Type.Optional(Type.Number()),
      topK: Type.Optional(Type.Number()),
      storePath: Type.Optional(Type.String()),
    }),
    async execute(
      _invocationId: string,
      params: { query: string; limit?: number; topK?: number; storePath?: string },
    ) {
      return createJsonToolResult(retrieveVtkjsContext(params));
    },
  };
}
