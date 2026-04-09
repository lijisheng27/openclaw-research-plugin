import { Type } from "@sinclair/typebox";
import { ingestPaper } from "../services/research-phase1.js";
import { createJsonToolResult } from "./tool-result.js";

export function createPaperIngestTool() {
  return {
    name: "paper_ingest",
    label: "Paper Ingest",
    description: "Ingest a paper into a Phase 1 RAG-ready index structure.",
    parameters: Type.Object({
      title: Type.String(),
      abstract: Type.String(),
      body: Type.Optional(Type.String()),
      source: Type.Optional(Type.String()),
    }),
    async execute(
      _invocationId: string,
      params: { title: string; abstract: string; body?: string; source?: string },
    ) {
      const payload = ingestPaper(params);
      return createJsonToolResult(payload);
    },
  };
}
