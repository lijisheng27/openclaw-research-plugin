import { Type } from "@sinclair/typebox";
import { runPhase1Loop } from "../services/research-phase1.js";
import { createJsonToolResult } from "./tool-result.js";

export function createVtkjsValidateTool() {
  return {
    name: "vtkjs_validate",
    label: "VTK.js Validate",
    description: "Validate that Phase 1 output includes vtk.js-oriented execution artifacts.",
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
      const output = runPhase1Loop(params);
      const payload = {
        framework: output.generatedCode.framework,
        entrypoint: output.generatedCode.entrypoint,
        artifacts: output.sandboxRun.producedArtifacts,
        evaluationStatus: output.evaluation.status,
      };
      return createJsonToolResult(payload);
    },
  };
}
