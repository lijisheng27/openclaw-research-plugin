import { Type } from "@sinclair/typebox";
import { ingestKnowledge, searchPapers } from "../services/research-knowledge.js";
import { createJsonToolResult } from "./tool-result.js";

export function createKnowledgeIngestTool() {
  return {
    name: "knowledge_ingest",
    label: "Knowledge Ingest",
    description: "Persist paper search results into the local Phase 2 RAG store.",
    parameters: Type.Object({
      query: Type.String(),
      limit: Type.Optional(Type.Number()),
      storePath: Type.Optional(Type.String()),
    }),
    async execute(
      _invocationId: string,
      params: { query: string; limit?: number; storePath?: string },
    ) {
      const search = searchPapers({ query: params.query, limit: params.limit });
      const store = ingestKnowledge({ papers: search.papers, storePath: params.storePath });
      return createJsonToolResult({ search, store });
    },
  };
}

