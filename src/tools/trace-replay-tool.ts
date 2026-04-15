import { Type } from "@sinclair/typebox";
import type { ThinkActionTrace } from "../contracts/research-contracts.js";
import { replayTrace } from "../services/research-validation.js";
import { createJsonToolResult } from "./tool-result.js";

export function createTraceReplayTool() {
  return {
    name: "trace_replay",
    label: "Trace Replay",
    description: "Convert a Think-Action Trace into an ordered replay timeline.",
    parameters: Type.Object({
      trace: Type.Any(),
    }),
    async execute(_invocationId: string, params: { trace: ThinkActionTrace }) {
      return createJsonToolResult(replayTrace(params.trace));
    },
  };
}
