import { Type } from "@sinclair/typebox";
import { buildPhase5RepairWorkflowPlan } from "../services/vtkjs-repair.js";
import { createJsonToolResult } from "./tool-result.js";

export function createPhase5RepairWorkflowPlanTool() {
  return {
    name: "phase5_repair_workflow_plan",
    label: "Phase 5 Repair Workflow Plan",
    description: "Build a one-command local workflow plan for executed multi-round vtk.js repair retries.",
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
        artifactRoot?: string;
        canvasSelector?: string;
        timeoutMs?: number;
        maxRounds?: number;
      },
    ) {
      return createJsonToolResult(buildPhase5RepairWorkflowPlan(params));
    },
  };
}
