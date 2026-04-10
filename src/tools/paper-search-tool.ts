import { Type } from "@sinclair/typebox";
import { searchPapers } from "../services/research-knowledge.js";
import { createJsonToolResult } from "./tool-result.js";

export function createPaperSearchTool() {
  return {
    name: "paper_search",
    label: "Paper Search",
    description: "Search the local Phase 2 paper fixture corpus for relevant research papers.",
    parameters: Type.Object({
      query: Type.String(),
      limit: Type.Optional(Type.Number()),
    }),
    async execute(_invocationId: string, params: { query: string; limit?: number }) {
      return createJsonToolResult(searchPapers(params));
    },
  };
}

