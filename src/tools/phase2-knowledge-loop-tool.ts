import { Type } from "@sinclair/typebox";
import { runPhase2KnowledgeLoop } from "../services/research-knowledge.js";
import { createJsonToolResult } from "./tool-result.js";

export function createPhase2KnowledgeLoopTool() {
  return {
    name: "research_phase2_knowledge_loop",
    label: "Research Phase 2 Knowledge Loop",
    description: "Run paper search, knowledge ingest, RAG query, and context-pack generation.",
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
      return createJsonToolResult(runPhase2KnowledgeLoop(params));
    },
  };
}
