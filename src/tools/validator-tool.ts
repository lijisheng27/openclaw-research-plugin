import { Type } from "@sinclair/typebox";
import { runSandbox, validateRun } from "../services/research-phase1.js";
import { createJsonToolResult } from "./tool-result.js";

export function createValidatorTool() {
  return {
    name: "validator",
    label: "Validator",
    description: "Validate generated vtk.js code against Phase 1 execution constraints.",
    parameters: Type.Object({
      code: Type.String(),
      entrypoint: Type.Optional(Type.String()),
    }),
    async execute(_invocationId: string, params: { code: string; entrypoint?: string }) {
      const generatedCode = {
        language: "typescript" as const,
        framework: "vtk.js" as const,
        entrypoint: params.entrypoint ?? "src/generated/app.ts",
        summary: "Direct validator request",
        files: [{ path: params.entrypoint ?? "src/generated/app.ts", content: params.code }],
      };
      const sandboxRun = runSandbox({ generatedCode });
      const payload = validateRun({ generatedCode, sandboxRun });
      return createJsonToolResult(payload);
    },
  };
}
