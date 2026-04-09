import { Type } from "@sinclair/typebox";
import { runPhase1Loop } from "../services/research-phase1.js";
import { createJsonToolResult } from "./tool-result.js";

export function createPhase1LoopTool() {
  return {
    name: "research_phase1_loop",
    label: "Research Phase 1 Loop",
    description: "Run the minimal Phase 1 closed loop from paper ingest through report generation.",
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
      const payload = runPhase1Loop(params);
      return createJsonToolResult(payload);
    },
  };
}
