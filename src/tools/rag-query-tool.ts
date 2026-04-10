import { Type } from "@sinclair/typebox";
import { buildContextPack, queryRag } from "../services/research-knowledge.js";
import { createJsonToolResult } from "./tool-result.js";

export function createRagQueryTool() {
  return {
    name: "rag_query",
    label: "RAG Query",
    description: "Query the local Phase 2 RAG store and return ranked snippets with citations.",
    parameters: Type.Object({
      query: Type.String(),
      topK: Type.Optional(Type.Number()),
      storePath: Type.Optional(Type.String()),
      includeContextPack: Type.Optional(Type.Boolean()),
    }),
    async execute(
      _invocationId: string,
      params: { query: string; topK?: number; storePath?: string; includeContextPack?: boolean },
    ) {
      const result = queryRag({ query: params.query, topK: params.topK, storePath: params.storePath });
      const payload = params.includeContextPack
        ? { result, contextPack: buildContextPack({ query: params.query, result }) }
        : result;
      return createJsonToolResult(payload);
    },
  };
}

