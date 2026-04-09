import { Type } from "@sinclair/typebox";
import { runSandbox } from "../services/research-phase1.js";
import { createJsonToolResult } from "./tool-result.js";

export function createSandboxRunTool() {
  return {
    name: "sandbox_run",
    label: "Sandbox Run",
    description: "Run generated code through the Phase 1 sandbox adapter.",
    parameters: Type.Object({
      code: Type.String(),
      entrypoint: Type.Optional(Type.String()),
    }),
    async execute(_invocationId: string, params: { code: string; entrypoint?: string }) {
      const payload = runSandbox({
        generatedCode: {
          language: "typescript",
          framework: "vtk.js",
          entrypoint: params.entrypoint ?? "src/generated/app.ts",
          summary: "Direct sandbox run request",
          files: [{ path: params.entrypoint ?? "src/generated/app.ts", content: params.code }],
        },
      });
      return createJsonToolResult(payload);
    },
  };
}
