import { Type } from "@sinclair/typebox";
import { runVtkjsEvalRunner } from "../services/vtkjs-eval.js";
import { createJsonToolResult } from "./tool-result.js";

export function createVtkjsEvalRunnerTool() {
  return {
    name: "vtkjs_eval_runner",
    label: "vtk.js Eval Runner",
    description:
      "Run the current vtk.js generator against the primary benchmark case set and summarize generation-readiness scores.",
    parameters: Type.Object({
      caseIds: Type.Optional(
        Type.Array(
          Type.Union([
            Type.Literal("slice"),
            Type.Literal("volume"),
            Type.Literal("streamline"),
            Type.Literal("mag_iso"),
          ]),
        ),
      ),
      artifactRoot: Type.Optional(Type.String()),
    }),
    async execute(
      _invocationId: string,
      params: { caseIds?: Array<"slice" | "volume" | "streamline" | "mag_iso">; artifactRoot?: string },
    ) {
      return createJsonToolResult(runVtkjsEvalRunner(params));
    },
  };
}
