import { Type } from "@sinclair/typebox";
import { repairVtkjsOnce } from "../services/vtkjs-repair.js";
import { createJsonToolResult } from "./tool-result.js";

export function createVtkjsRepairOnceTool() {
  return {
    name: "vtkjs_repair_once",
    label: "vtk.js Repair Once",
    description: "Classify vtk.js browser validation failures and return a single repaired retry input.",
    parameters: Type.Object({
      goal: Type.String(),
      title: Type.Optional(Type.String()),
      abstract: Type.Optional(Type.String()),
      html: Type.Optional(Type.String()),
      script: Type.Optional(Type.String()),
      renderReport: Type.Optional(Type.String()),
      renderReportPath: Type.Optional(Type.String()),
      browserConsole: Type.Optional(Type.String()),
      browserConsolePath: Type.Optional(Type.String()),
      pageErrors: Type.Optional(Type.String()),
      pageErrorsPath: Type.Optional(Type.String()),
      comparisonRenderReport: Type.Optional(Type.String()),
      comparisonRenderReportPath: Type.Optional(Type.String()),
      comparisonBrowserConsole: Type.Optional(Type.String()),
      comparisonBrowserConsolePath: Type.Optional(Type.String()),
      comparisonPageErrors: Type.Optional(Type.String()),
      comparisonPageErrorsPath: Type.Optional(Type.String()),
      artifactRoot: Type.Optional(Type.String()),
      canvasSelector: Type.Optional(Type.String()),
      timeoutMs: Type.Optional(Type.Number()),
      maxRounds: Type.Optional(Type.Number()),
    }),
    async execute(
      _invocationId: string,
      params: {
        goal: string;
        title?: string;
        abstract?: string;
        html?: string;
        script?: string;
        renderReport?: string;
        renderReportPath?: string;
        browserConsole?: string;
        browserConsolePath?: string;
        pageErrors?: string;
        pageErrorsPath?: string;
        comparisonRenderReport?: string;
        comparisonRenderReportPath?: string;
        comparisonBrowserConsole?: string;
        comparisonBrowserConsolePath?: string;
        comparisonPageErrors?: string;
        comparisonPageErrorsPath?: string;
        artifactRoot?: string;
        canvasSelector?: string;
        timeoutMs?: number;
        maxRounds?: number;
      },
    ) {
      return createJsonToolResult(repairVtkjsOnce(params));
    },
  };
}
