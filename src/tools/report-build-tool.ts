import { Type } from "@sinclair/typebox";
import { runPhase1Loop } from "../services/research-phase1.js";
import { createJsonToolResult } from "./tool-result.js";

export function createReportBuildTool() {
  return {
    name: "report_build",
    label: "Report Build",
    description: "Build a structured report from the Phase 1 closed loop.",
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
      const payload = runPhase1Loop(params).report;
      return createJsonToolResult(payload);
    },
  };
}
