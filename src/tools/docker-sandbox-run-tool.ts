import { Type } from "@sinclair/typebox";
import { runDockerSandbox } from "../services/research-validation.js";
import { createJsonToolResult } from "./tool-result.js";

export function createDockerSandboxRunTool() {
  return {
    name: "docker_sandbox_run",
    label: "Docker Sandbox Run",
    description: "Prepare or execute a reproducible Docker sandbox adapter run for generated vtk.js code.",
    parameters: Type.Object({
      code: Type.String(),
      entrypoint: Type.Optional(Type.String()),
      codeLanguage: Type.Optional(Type.Union([Type.Literal("typescript"), Type.Literal("python")])),
      execute: Type.Optional(Type.Boolean()),
      artifactRoot: Type.Optional(Type.String()),
      image: Type.Optional(Type.String()),
      environmentProfile: Type.Optional(
        Type.Union([
          Type.Literal("node-vtk"),
          Type.Literal("node-typescript"),
          Type.Literal("python-scientific"),
        ]),
      ),
    }),
    async execute(
      _invocationId: string,
      params: {
        code: string;
        entrypoint?: string;
        codeLanguage?: "typescript" | "python";
        execute?: boolean;
        artifactRoot?: string;
        image?: string;
        environmentProfile?: "node-vtk" | "node-typescript" | "python-scientific";
      },
    ) {
      const language = params.codeLanguage ?? "typescript";
      const entrypoint = params.entrypoint ?? (language === "python" ? "src/generated/app.py" : "src/generated/app.ts");
      return createJsonToolResult(
        runDockerSandbox({
          generatedCode: {
            language,
            framework: language === "python" ? "python-scientific" : "vtk.js",
            entrypoint,
            summary: "Direct Docker sandbox request",
            files: [{ path: entrypoint, content: params.code }],
          },
          execute: params.execute,
          artifactRoot: params.artifactRoot,
          image: params.image,
          environmentProfile: params.environmentProfile,
        }),
      );
    },
  };
}
