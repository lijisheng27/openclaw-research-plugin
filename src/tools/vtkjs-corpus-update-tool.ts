import { Type } from "@sinclair/typebox";
import { updateVtkjsCorpusEntry } from "../services/vtkjs-corpus.js";
import { createJsonToolResult } from "./tool-result.js";

export function createVtkjsCorpusUpdateTool() {
  return {
    name: "vtkjs_corpus_update",
    label: "vtk.js Corpus Update",
    description:
      "Write validation evidence, repair proposals, and next workflow inputs back into a stored vtk.js corpus entry.",
    parameters: Type.Object({
      corpusRoot: Type.Optional(Type.String()),
      manifestPath: Type.Optional(Type.String()),
      track: Type.Optional(
        Type.Union([
          Type.Literal("prompt-sample"),
          Type.Literal("prompt-sample-pro"),
          Type.Literal("benchmark"),
        ]),
      ),
      slug: Type.Optional(Type.String()),
      entryDirectory: Type.Optional(Type.String()),
      renderReport: Type.Optional(Type.String()),
      renderReportPath: Type.Optional(Type.String()),
      renderScreenshotPath: Type.Optional(Type.String()),
      dockerResultPath: Type.Optional(Type.String()),
      browserConsole: Type.Optional(Type.String()),
      browserConsolePath: Type.Optional(Type.String()),
      pageErrors: Type.Optional(Type.String()),
      pageErrorsPath: Type.Optional(Type.String()),
      comparisonRenderReport: Type.Optional(Type.String()),
      comparisonRenderReportPath: Type.Optional(Type.String()),
      comparisonRenderScreenshotPath: Type.Optional(Type.String()),
      comparisonBrowserConsole: Type.Optional(Type.String()),
      comparisonBrowserConsolePath: Type.Optional(Type.String()),
      comparisonPageErrors: Type.Optional(Type.String()),
      comparisonPageErrorsPath: Type.Optional(Type.String()),
      includeRepair: Type.Optional(Type.Boolean()),
      copyEvidence: Type.Optional(Type.Boolean()),
      promoteAcceptedRetry: Type.Optional(Type.Boolean()),
    }),
    async execute(
      _invocationId: string,
      params: {
        corpusRoot?: string;
        manifestPath?: string;
        track?: "prompt-sample" | "prompt-sample-pro" | "benchmark";
        slug?: string;
        entryDirectory?: string;
        renderReport?: string;
        renderReportPath?: string;
        renderScreenshotPath?: string;
        dockerResultPath?: string;
        browserConsole?: string;
        browserConsolePath?: string;
        pageErrors?: string;
        pageErrorsPath?: string;
        comparisonRenderReport?: string;
        comparisonRenderReportPath?: string;
        comparisonRenderScreenshotPath?: string;
        comparisonBrowserConsole?: string;
        comparisonBrowserConsolePath?: string;
        comparisonPageErrors?: string;
        comparisonPageErrorsPath?: string;
        includeRepair?: boolean;
        copyEvidence?: boolean;
        promoteAcceptedRetry?: boolean;
      },
    ) {
      return createJsonToolResult(updateVtkjsCorpusEntry(params));
    },
  };
}
