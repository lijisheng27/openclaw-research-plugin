import { Type } from "@sinclair/typebox";
import { ingestPaper, orchestrateTaskGraph, generateCode } from "../services/research-phase1.js";
import { createJsonToolResult } from "./tool-result.js";

export function createCodeGeneratorTool() {
  return {
    name: "code_generator",
    label: "Code Generator",
    description: "Generate minimal vtk.js experiment code from a TaskGraph.",
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
      const { paperMeta } = ingestPaper(params);
      const taskGraph = orchestrateTaskGraph({ goal: params.goal, paperMeta });
      const payload = generateCode({ goal: params.goal, taskGraph });
      return createJsonToolResult(payload);
    },
  };
}
