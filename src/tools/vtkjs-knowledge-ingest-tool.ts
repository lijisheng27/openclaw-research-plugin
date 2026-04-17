import { Type } from "@sinclair/typebox";
import { ingestVtkjsKnowledge } from "../services/vtkjs-knowledge.js";
import { createJsonToolResult } from "./tool-result.js";

export function createVtkjsKnowledgeIngestTool() {
  return {
    name: "vtkjs_knowledge_ingest",
    label: "vtk.js Knowledge Ingest",
    description: "Ingest vtk.js-specific local fixtures into a dedicated RAG store for Phase 5 specialized workflows.",
    parameters: Type.Object({
      query: Type.String(),
      limit: Type.Optional(Type.Number()),
      storePath: Type.Optional(Type.String()),
    }),
    async execute(
      _invocationId: string,
      params: { query: string; limit?: number; storePath?: string },
    ) {
      return createJsonToolResult(ingestVtkjsKnowledge(params));
    },
  };
}
