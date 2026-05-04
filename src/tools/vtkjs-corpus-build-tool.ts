import { Type } from "@sinclair/typebox";
import { buildVtkjsCorpus } from "../services/vtkjs-corpus.js";
import { createJsonToolResult } from "./tool-result.js";

export function createVtkjsCorpusBuildTool() {
  return {
    name: "vtkjs_corpus_build",
    label: "vtk.js Corpus Build",
    description:
      "Build a webSiv-style vtk.js corpus seed with prompt-sample, prompt-sample-pro, benchmark, and replayable workflow inputs.",
    parameters: Type.Object({
      outputRoot: Type.Optional(Type.String()),
      artifactRoot: Type.Optional(Type.String()),
      includePromptSample: Type.Optional(Type.Boolean()),
      includePromptSamplePro: Type.Optional(Type.Boolean()),
      includeBenchmark: Type.Optional(Type.Boolean()),
    }),
    async execute(
      _invocationId: string,
      params: {
        outputRoot?: string;
        artifactRoot?: string;
        includePromptSample?: boolean;
        includePromptSamplePro?: boolean;
        includeBenchmark?: boolean;
      },
    ) {
      return createJsonToolResult(buildVtkjsCorpus(params));
    },
  };
}
