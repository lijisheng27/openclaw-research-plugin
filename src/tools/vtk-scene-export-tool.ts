import { Type } from "@sinclair/typebox";
import { runPhase1Loop } from "../services/research-phase1.js";
import { buildVtkSceneExportContract } from "../services/research-visualization.js";
import { createJsonToolResult } from "./tool-result.js";

export function createVtkSceneExportTool() {
  return {
    name: "vtk_scene_export",
    label: "VTK Scene Export",
    description: "Build a vtk.js scene export contract for UI validation and scene replay.",
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
      const loop = runPhase1Loop(params);
      return createJsonToolResult(
        buildVtkSceneExportContract({
          generatedCode: loop.generatedCode,
          sandboxRun: loop.sandboxRun,
          evaluation: loop.evaluation,
        }),
      );
    },
  };
}
