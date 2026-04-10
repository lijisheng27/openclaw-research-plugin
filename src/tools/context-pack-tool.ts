import { Type } from "@sinclair/typebox";
import { buildContextPack, queryRag } from "../services/research-knowledge.js";
import { createJsonToolResult } from "./tool-result.js";

export function createContextPackTool() {
  return {
    name: "context_pack_build",
    label: "Context Pack Build",
    description: "Build a compact context pack from the local Phase 2 RAG store.",
    parameters: Type.Object({
      query: Type.String(),
      topK: Type.Optional(Type.Number()),
      storePath: Type.Optional(Type.String()),
    }),
    async execute(
      _invocationId: string,
      params: { query: string; topK?: number; storePath?: string },
    ) {
      const result = queryRag({ query: params.query, topK: params.topK, storePath: params.storePath });
      return createJsonToolResult(buildContextPack({ query: params.query, result }));
    },
  };
}

