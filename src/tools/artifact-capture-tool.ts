import { Type } from "@sinclair/typebox";
import { captureExecutionArtifact } from "../services/research-validation.js";
import { createJsonToolResult } from "./tool-result.js";

export function createArtifactCaptureTool() {
  return {
    name: "artifact_capture",
    label: "Artifact Capture",
    description: "Hash and describe an execution artifact for reproducible validation records.",
    parameters: Type.Object({
      sourcePath: Type.String(),
      runRoot: Type.Optional(Type.String()),
      kind: Type.Optional(
        Type.Union([
          Type.Literal("source"),
          Type.Literal("manifest"),
          Type.Literal("stdout"),
          Type.Literal("stderr"),
          Type.Literal("report"),
        ]),
      ),
      summary: Type.Optional(Type.String()),
    }),
    async execute(
      _invocationId: string,
      params: {
        sourcePath: string;
        runRoot?: string;
        kind?: "source" | "manifest" | "stdout" | "stderr" | "report";
        summary?: string;
      },
    ) {
      return createJsonToolResult(captureExecutionArtifact(params));
    },
  };
}
