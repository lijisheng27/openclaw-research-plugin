import { Type } from "@sinclair/typebox";
import { runPhase1Loop } from "../services/research-phase1.js";
import { buildStructuredProgressUpdates } from "../services/research-visualization.js";
import { createJsonToolResult } from "./tool-result.js";

export function createStructuredProgressTool() {
  return {
    name: "structured_progress_updates",
    label: "Structured Progress Updates",
    description: "Build structured progress payloads for Dashboard-like status displays.",
    parameters: Type.Object({
      goal: Type.String(),
      title: Type.String(),
      abstract: Type.String(),
      body: Type.Optional(Type.String()),
    }),
    async execute(
      _invocationId: string,
      params: { goal: string; title: string; abstract: string; body?: string },
    ) {
      const loop = runPhase1Loop(params);
      return createJsonToolResult(buildStructuredProgressUpdates(loop));
    },
  };
}
