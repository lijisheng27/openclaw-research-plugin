import { Type } from "@sinclair/typebox";
import { createCloudSandboxPlan } from "../services/research-validation.js";
import { createJsonToolResult } from "./tool-result.js";

export function createCloudSandboxPlanTool() {
  return {
    name: "cloud_sandbox_plan",
    label: "Cloud Sandbox Plan",
    description: "Create a cloud sandbox handoff plan without executing on the host runtime.",
    parameters: Type.Object({
      code: Type.String(),
      entrypoint: Type.Optional(Type.String()),
      provider: Type.Optional(Type.Union([Type.Literal("technology-cloud"), Type.Literal("generic-cloud")])),
    }),
    async execute(
      _invocationId: string,
      params: { code: string; entrypoint?: string; provider?: "technology-cloud" | "generic-cloud" },
    ) {
      return createJsonToolResult(
        createCloudSandboxPlan({
          provider: params.provider,
          generatedCode: {
            language: "typescript",
            framework: "vtk.js",
            entrypoint: params.entrypoint ?? "src/generated/app.ts",
            summary: "Direct cloud sandbox plan request",
            files: [{ path: params.entrypoint ?? "src/generated/app.ts", content: params.code }],
          },
        }),
      );
    },
  };
}
