import { Type } from "@sinclair/typebox";
import { runPhase1Loop } from "../services/research-phase1.js";
import { createJsonToolResult } from "./tool-result.js";

export function createTraceRecorderTool() {
  return {
    name: "trace_recorder",
    label: "Trace Recorder",
    description: "Produce a Think-Action Trace for the Phase 1 research loop.",
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
      const payload = runPhase1Loop(params).trace;
      return createJsonToolResult(payload);
    },
  };
}
