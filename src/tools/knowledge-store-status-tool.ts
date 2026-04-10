import { Type } from "@sinclair/typebox";
import { loadRagStore } from "../services/research-knowledge.js";
import { createJsonToolResult } from "./tool-result.js";

export function createKnowledgeStoreStatusTool() {
  return {
    name: "knowledge_store_status",
    label: "Knowledge Store Status",
    description: "Show document and chunk counts for the local Phase 2 RAG store.",
    parameters: Type.Object({
      storePath: Type.Optional(Type.String()),
    }),
    async execute(_invocationId: string, params: { storePath?: string }) {
      return createJsonToolResult(loadRagStore({ storePath: params.storePath }));
    },
  };
}

