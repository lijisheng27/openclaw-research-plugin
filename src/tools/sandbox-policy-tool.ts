import { Type } from "@sinclair/typebox";
import { decideSandboxPolicy } from "../services/research-validation.js";
import { createJsonToolResult } from "./tool-result.js";

export function createSandboxPolicyTool() {
  return {
    name: "sandbox_policy_decide",
    label: "Sandbox Policy Decide",
    description: "Decide whether generated code needs Docker, cloud, sub-agent, or simulated execution.",
    parameters: Type.Object({
      code: Type.String(),
      requestedRuntime: Type.Optional(
        Type.Union([
          Type.Literal("docker"),
          Type.Literal("cloud"),
          Type.Literal("subagent"),
          Type.Literal("simulate"),
        ]),
      ),
    }),
    async execute(
      _invocationId: string,
      params: { code: string; requestedRuntime?: "docker" | "cloud" | "subagent" | "simulate" },
    ) {
      return createJsonToolResult(decideSandboxPolicy(params));
    },
  };
}
