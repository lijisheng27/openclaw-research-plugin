import { Type } from "@sinclair/typebox";
import { buildVtkjsRenderVerifyPlan } from "../services/vtkjs-render-verify.js";
import { createJsonToolResult } from "./tool-result.js";

export function createVtkjsRenderVerifyTool() {
  return {
    name: "vtkjs_render_verify",
    label: "vtk.js Render Verify",
    description:
      "Prepare a browser-based vtk.js render verification bundle with Playwright evidence and a Docker runner manifest.",
    parameters: Type.Object({
      goal: Type.String(),
      html: Type.Optional(Type.String()),
      script: Type.Optional(Type.String()),
      artifactRoot: Type.Optional(Type.String()),
      requestedRuntime: Type.Optional(
        Type.Union([
          Type.Literal("docker"),
          Type.Literal("cloud"),
          Type.Literal("subagent"),
          Type.Literal("simulate"),
        ]),
      ),
      canvasSelector: Type.Optional(Type.String()),
      timeoutMs: Type.Optional(Type.Number()),
      execute: Type.Optional(Type.Boolean()),
    }),
    async execute(
      _invocationId: string,
      params: {
        goal: string;
        html?: string;
        script?: string;
        artifactRoot?: string;
        requestedRuntime?: "docker" | "cloud" | "subagent" | "simulate";
        canvasSelector?: string;
        timeoutMs?: number;
        execute?: boolean;
      },
    ) {
      return createJsonToolResult(buildVtkjsRenderVerifyPlan(params));
    },
  };
}
