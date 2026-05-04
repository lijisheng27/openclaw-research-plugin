import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  AgentExecRecipe,
  CloudSandboxPlan,
  EnvironmentProfileId,
  ExecutionArtifact,
  GeneratedCode,
  LocalDockerWorkflowPlan,
  Phase3ValidationOutput,
  SandboxPolicyDecision,
  SandboxRunManifest,
  SandboxRunResult,
  TaskGraph,
  TaskGraphSnapshot,
  ThinkActionTrace,
  TraceReplay,
} from "../contracts/research-contracts.js";
import { runPhase1Loop, validateRun } from "./research-phase1.js";
import { createStableId, sanitizeDockerNameSegment } from "./research-utils.js";

function getRunRoot(customPath?: string) {
  return path.resolve(customPath?.trim() || path.join(process.cwd(), ".research-runs"));
}

function sha256(content: string | Buffer) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function writeText(filePath: string, value: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf-8");
}

function captureFileArtifact(params: {
  runDir: string;
  filePath: string;
  kind: ExecutionArtifact["kind"];
  summary: string;
}): ExecutionArtifact {
  const content = fs.readFileSync(params.filePath);
  return {
    artifactId: createStableId("artifact", params.filePath),
    kind: params.kind,
    path: path.relative(params.runDir, params.filePath).replaceAll("\\", "/"),
    summary: params.summary,
    sha256: sha256(content),
  };
}

function hasUnsafeHostRuntimeAccess(code: string) {
  return [
    /\bfs\./,
    /process\.env/,
    /fetch\(["']https?:\/\//,
    /new\s+Function/,
    /\beval\(/,
  ].some((pattern) => pattern.test(code));
}

function getDefaultEntrypoint(codeLanguage?: GeneratedCode["language"]) {
  return codeLanguage === "python" ? "src/generated/app.py" : "src/generated/app.ts";
}

function normalizeGeneratedCode(params: {
  phase1GeneratedCode: GeneratedCode;
  goal: string;
  code?: string;
  codeLanguage?: GeneratedCode["language"];
  environmentProfile?: EnvironmentProfileId;
}): GeneratedCode {
  if (!params.code) {
    return params.phase1GeneratedCode;
  }

  const language = params.codeLanguage ?? "typescript";
  const framework = params.environmentProfile === "python-scientific" ? "python-scientific" : "vtk.js";
  return {
    language,
    framework,
    entrypoint: getDefaultEntrypoint(language),
    summary: `Phase 3 direct validation for goal: ${params.goal}`,
    files: [{ path: getDefaultEntrypoint(language), content: params.code }],
  };
}

function buildEnvironmentBundle(params: {
  environmentProfile?: EnvironmentProfileId;
  image?: string;
  generatedCode: GeneratedCode;
  sourceDir: string;
  entrypoint: string;
}) {
  const environmentProfile =
    params.environmentProfile ??
    (params.generatedCode.language === "python" ? "python-scientific" : "node-vtk");
  const image =
    params.image ??
    (environmentProfile === "python-scientific" ? "python:3.11-slim" : "node:20-alpine");

  if (environmentProfile === "python-scientific") {
    const requirementsPath = path.join(params.sourceDir, "requirements.txt");
    writeText(
      requirementsPath,
      [
        "numpy==2.3.0",
        "matplotlib==3.10.7",
      ].join("\n"),
    );
    const checkScriptPath = path.join(params.sourceDir, "generated", "run-check.py");
    writeText(
      checkScriptPath,
      `from pathlib import Path
import json
import sys

source = Path(${JSON.stringify(params.entrypoint)}).read_text(encoding="utf-8")
unsafe = any(marker in source for marker in ["TODO", "FIXME", "raise RuntimeError"])
artifacts_dir = Path("artifacts")
artifacts_dir.mkdir(parents=True, exist_ok=True)
(artifacts_dir / "vtk-scene-summary.json").write_text(
    json.dumps(
        {
            "entrypoint": ${JSON.stringify(params.entrypoint)},
            "framework": "python-scientific",
            "status": "needs_revision" if unsafe else "analysis-contract-ok",
        },
        indent=2,
    )
    + "\\n",
    encoding="utf-8",
)
if unsafe:
    print("Generated source contains placeholder failure markers.", file=sys.stderr)
    raise SystemExit(1)
print("Python scientific sandbox contract check completed.")
`,
    );
    const dockerfilePath = path.join(params.sourceDir, "Dockerfile");
    writeText(
      dockerfilePath,
      `FROM ${image}
WORKDIR /workspace
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "generated/run-check.py"]
`,
    );
    return {
      environmentProfile,
      image,
      command: ["python", "generated/run-check.py"],
      supportFiles: [
        {
          path: requirementsPath,
          summary: "Sandbox Python requirements",
        },
        {
          path: checkScriptPath,
          summary: "Reproducible sandbox check script",
        },
        {
          path: dockerfilePath,
          summary: "Sandbox Dockerfile",
        },
      ],
    };
  }

  const packageJsonPath = path.join(params.sourceDir, "package.json");
  const dependencies =
    environmentProfile === "node-typescript"
      ? { typescript: "^6.0.2" }
      : { "vtk.js": "^35.7.2", typescript: "^6.0.2" };
  writeJson(packageJsonPath, {
    name: `research-sandbox-${path.basename(path.dirname(params.sourceDir))}`,
    private: true,
    type: "module",
    scripts: {
      validate: "node generated/run-check.mjs",
    },
    dependencies,
  });
  const checkScriptPath = path.join(params.sourceDir, "generated", "run-check.mjs");
  writeText(
    checkScriptPath,
    `import fs from "node:fs";
const source = fs.readFileSync(${JSON.stringify(params.entrypoint)}, "utf-8");
const unsafe = /TODO|FIXME|throw new Error/.test(source);
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/vtk-scene-summary.json", JSON.stringify({
  entrypoint: ${JSON.stringify(params.entrypoint)},
  framework: ${JSON.stringify(environmentProfile === "node-vtk" ? "vtk.js" : "node-typescript")},
  status: unsafe ? "needs_revision" : "renderable-contract-ok"
}, null, 2));
if (unsafe) {
  console.error("Generated source contains placeholder failure markers.");
  process.exit(1);
}
console.log("Node sandbox contract check completed.");
`,
  );
  const dockerfilePath = path.join(params.sourceDir, "Dockerfile");
  writeText(
    dockerfilePath,
    `FROM ${image}
WORKDIR /workspace
COPY package.json package.json
RUN npm install --no-fund --no-audit
COPY . .
CMD ["node", "generated/run-check.mjs"]
`,
  );
  return {
    environmentProfile,
    image,
    command: ["node", "generated/run-check.mjs"],
    supportFiles: [
      {
        path: packageJsonPath,
        summary: "Sandbox package manifest",
      },
      {
        path: checkScriptPath,
        summary: "Reproducible sandbox check script",
      },
      {
        path: dockerfilePath,
        summary: "Sandbox Dockerfile",
      },
    ],
  };
}

export function decideSandboxPolicy(params: {
  code: string;
  requestedRuntime?: SandboxPolicyDecision["requestedRuntime"];
}): SandboxPolicyDecision {
  const requestedRuntime = params.requestedRuntime ?? "docker";
  const requiresStrongSandbox = hasUnsafeHostRuntimeAccess(params.code);
  const blockedReasons: string[] = [];
  const guidance: string[] = [];

  if (requestedRuntime === "simulate" && requiresStrongSandbox) {
    blockedReasons.push("Code requests host-like capabilities and should not run in simulation only.");
  }
  if (requestedRuntime === "cloud") {
    guidance.push("Prepare artifact upload and run metadata for cloud execution handoff.");
  }
  if (requestedRuntime === "subagent") {
    guidance.push("Use sub-agent runtime for strong isolation; do not rely on ACP host runtime for sandboxed execution.");
  }
  if (requestedRuntime === "docker") {
    guidance.push("Use Docker adapter when available; otherwise emit a dry-run manifest for reproducibility.");
  }
  if (requiresStrongSandbox) {
    guidance.push("Network, filesystem, environment, or dynamic execution access requires a strong sandbox path.");
  }

  const selectedRuntime =
    requestedRuntime === "simulate" && requiresStrongSandbox ? "docker" : requestedRuntime;

  return {
    policyId: createStableId("policy", `${requestedRuntime}-${params.code}`),
    requestedRuntime,
    selectedRuntime,
    allowed: blockedReasons.length === 0,
    requiresStrongSandbox,
    blockedReasons,
    guidance,
  };
}

export function createCloudSandboxPlan(params: {
  generatedCode: GeneratedCode;
  provider?: CloudSandboxPlan["provider"];
}): CloudSandboxPlan {
  return {
    planId: createStableId("cloud-plan", params.generatedCode.summary),
    provider: params.provider ?? "technology-cloud",
    runtime: "cloud-sandbox-planned",
    requiredInputs: [
      params.generatedCode.entrypoint,
      "sandbox manifest",
      "dependency lockfile or runtime image digest",
    ],
    uploadArtifacts: params.generatedCode.files.map((file) => file.path),
    expectedOutputs: ["stdout log", "stderr log", "execution report", "vtk scene artifact summary"],
    handoffSteps: [
      "Upload generated files and manifest to the selected cloud workspace.",
      "Run the command from the sandbox manifest in an isolated container.",
      "Download logs and produced artifacts.",
      "Attach outputs to EvalRecord and ThinkActionTrace replay.",
    ],
  };
}

export function captureExecutionArtifact(params: {
  sourcePath: string;
  runRoot?: string;
  kind?: ExecutionArtifact["kind"];
  summary?: string;
}): ExecutionArtifact {
  const resolvedSource = path.resolve(params.sourcePath);
  if (!fs.existsSync(resolvedSource)) {
    throw new Error(`Artifact source does not exist: ${resolvedSource}`);
  }
  const runRoot = getRunRoot(params.runRoot);
  fs.mkdirSync(runRoot, { recursive: true });
  return captureFileArtifact({
    runDir: runRoot,
    filePath: resolvedSource,
    kind: params.kind ?? "report",
    summary: params.summary ?? `Captured artifact ${path.basename(resolvedSource)}`,
  });
}

export function runDockerSandbox(params: {
  generatedCode: GeneratedCode;
  artifactRoot?: string;
  image?: string;
  execute?: boolean;
  environmentProfile?: EnvironmentProfileId;
  requestedRuntime?: SandboxPolicyDecision["requestedRuntime"];
}): { sandboxRun: SandboxRunResult; manifest: SandboxRunManifest; cloudPlan?: CloudSandboxPlan } {
  const codeText = params.generatedCode.files.map((file) => file.content).join("\n");
  const policy = decideSandboxPolicy({
    code: codeText,
    requestedRuntime: params.requestedRuntime ?? "docker",
  });
  const runId = createStableId("run", `${params.generatedCode.summary}-${codeText}`);
  const runDir = path.join(getRunRoot(params.artifactRoot), runId);
  const sourceDir = path.join(runDir, "workspace");
  const manifestPath = path.join(runDir, "sandbox-manifest.json");

  fs.mkdirSync(sourceDir, { recursive: true });
  for (const file of params.generatedCode.files) {
    const filePath = path.join(sourceDir, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, "utf-8");
  }

  const dockerIgnorePath = path.join(sourceDir, ".dockerignore");
  writeText(
    dockerIgnorePath,
    [
      "node_modules",
      "artifacts",
      "*.log",
      "docker-result.json",
      "sandbox-manifest.json",
    ].join("\n"),
  );
  const environmentBundle = buildEnvironmentBundle({
    environmentProfile: params.environmentProfile,
    image: params.image,
    generatedCode: params.generatedCode,
    sourceDir,
    entrypoint: params.generatedCode.entrypoint,
  });
  const imageTag = `openclaw-research-plugin/${sanitizeDockerNameSegment(runId)}:local`;

  const artifacts: ExecutionArtifact[] = params.generatedCode.files.map((file) =>
    captureFileArtifact({
      runDir,
      filePath: path.join(sourceDir, file.path),
      kind: "source",
      summary: `Generated source file ${file.path}`,
    }),
  );
  artifacts.push(
    captureFileArtifact({
      runDir,
      filePath: dockerIgnorePath,
      kind: "source",
      summary: "Sandbox Docker ignore rules",
    }),
  );
  for (const supportFile of environmentBundle.supportFiles) {
    artifacts.push(
      captureFileArtifact({
        runDir,
        filePath: supportFile.path,
        kind: "source",
        summary: supportFile.summary,
      }),
    );
  }

  const dockerBuildCommand = ["build", "-t", imageTag, sourceDir];
  const dockerCommand = [
    "run",
    "--rm",
    "-v",
    `${sourceDir}:/workspace`,
    "-w",
    "/workspace",
    imageTag,
    ...environmentBundle.command,
  ];
  const stdout: string[] = [
    `Prepared Docker sandbox project bundle for environment profile ${environmentBundle.environmentProfile}`,
    `docker ${dockerBuildCommand.join(" ")}`,
    `docker ${dockerCommand.join(" ")}`,
  ];
  const stderr: string[] = [];
  let exitCode = 0;

  if (!policy.allowed) {
    exitCode = 1;
    stderr.push(...policy.blockedReasons);
  } else if (params.execute === true) {
    stdout.push(
      "Docker execution was requested, but plugin production code only emits manifests; run the command outside the plugin host or through a sanctioned sub-agent sandbox.",
    );
  }

  const stdoutPath = path.join(runDir, "stdout.log");
  const stderrPath = path.join(runDir, "stderr.log");
  fs.writeFileSync(stdoutPath, `${stdout.join("\n")}\n`, "utf-8");
  fs.writeFileSync(stderrPath, `${stderr.join("\n")}\n`, "utf-8");
  artifacts.push(
    captureFileArtifact({ runDir, filePath: stdoutPath, kind: "stdout", summary: "Sandbox stdout log" }),
    captureFileArtifact({ runDir, filePath: stderrPath, kind: "stderr", summary: "Sandbox stderr log" }),
  );

  const producedArtifactPath = path.join(sourceDir, "artifacts", "vtk-scene-summary.json");
  if (!fs.existsSync(producedArtifactPath)) {
    writeJson(producedArtifactPath, {
      entrypoint: params.generatedCode.entrypoint,
      framework: params.generatedCode.framework,
      status: exitCode === 0 ? "dry-run-contract-ok" : "failed",
    });
  }
  artifacts.push(
    captureFileArtifact({
      runDir,
      filePath: producedArtifactPath,
      kind: "report",
      summary: `${params.generatedCode.framework} scene artifact summary`,
    }),
  );

  const sandboxRun: SandboxRunResult = {
    runId,
    status: exitCode === 0 ? "passed" : "failed",
    runtime: "docker-adapter-dry-run",
    stdout,
    stderr,
    producedArtifacts: artifacts.map((artifact) => artifact.path),
    exitCode,
  };
  const manifest: SandboxRunManifest = {
    manifestId: createStableId("manifest", runId),
    runId,
    runtime: sandboxRun.runtime,
    environmentProfile: environmentBundle.environmentProfile,
    image: environmentBundle.image,
    imageTag,
    command: environmentBundle.command,
    dockerfilePath: environmentBundle.supportFiles[environmentBundle.supportFiles.length - 1]?.path ?? "",
    buildContextDir: sourceDir,
    dockerBuildCommand: ["docker", ...dockerBuildCommand],
    dockerCommand: ["docker", ...dockerCommand],
    manifestPath,
    runnerCommand: ["pnpm", "docker:sandbox", "--", manifestPath],
    workingDirectory: sourceDir,
    createdAt: new Date().toISOString(),
    artifacts,
    policy,
  };
  writeJson(manifestPath, manifest);

  return {
    sandboxRun,
    manifest,
    cloudPlan:
      policy.selectedRuntime === "cloud"
        ? createCloudSandboxPlan({ generatedCode: params.generatedCode })
        : undefined,
  };
}

export function captureTaskGraphSnapshot(params: {
  taskGraph: TaskGraph;
  storeRoot?: string;
}): TaskGraphSnapshot {
  const snapshotId = createStableId("snapshot", `${params.taskGraph.graphId}-${Date.now()}`);
  const storeRoot = getRunRoot(params.storeRoot);
  const snapshotPath = path.join(storeRoot, "task-graph-snapshots", `${snapshotId}.json`);
  const snapshot: TaskGraphSnapshot = {
    snapshotId,
    taskGraph: params.taskGraph,
    capturedAt: new Date().toISOString(),
    path: snapshotPath,
  };
  writeJson(snapshotPath, snapshot);
  return snapshot;
}

export function replayTrace(trace: ThinkActionTrace): TraceReplay {
  return {
    replayId: createStableId("replay", trace.traceId),
    traceId: trace.traceId,
    stepCount: trace.steps.length,
    timeline: trace.steps.map((step, index) => ({
      order: index + 1,
      phase: step.phase,
      action: step.action,
      observation: step.observation,
    })),
  };
}

export function runPhase3ValidationLoop(params: {
  goal: string;
  title: string;
  abstract: string;
  body?: string;
  code?: string;
  codeLanguage?: GeneratedCode["language"];
  executeDocker?: boolean;
  artifactRoot?: string;
  environmentProfile?: EnvironmentProfileId;
  requestedRuntime?: SandboxPolicyDecision["requestedRuntime"];
}): Phase3ValidationOutput {
  const phase1 = runPhase1Loop({
    goal: params.goal,
    title: params.title,
    abstract: params.abstract,
    body: params.body,
  });
  const generatedCode = normalizeGeneratedCode({
    phase1GeneratedCode: phase1.generatedCode,
    goal: params.goal,
    code: params.code,
    codeLanguage: params.codeLanguage,
    environmentProfile: params.environmentProfile,
  });
  const { sandboxRun, manifest, cloudPlan } = runDockerSandbox({
    generatedCode,
    artifactRoot: params.artifactRoot,
    execute: params.executeDocker,
    environmentProfile: params.environmentProfile,
    requestedRuntime: params.requestedRuntime,
  });
  const evaluation = validateRun({ generatedCode, sandboxRun });
  const taskGraphSnapshot = captureTaskGraphSnapshot({
    taskGraph: phase1.taskGraph,
    storeRoot: params.artifactRoot,
  });
  const traceReplay = replayTrace(phase1.trace);
  const localWorkflowPlan = buildLocalDockerWorkflowPlan({
    goal: params.goal,
    title: params.title,
    abstract: params.abstract,
    body: params.body,
    code: params.code,
    codeLanguage: params.codeLanguage,
    artifactRoot: params.artifactRoot,
    environmentProfile: params.environmentProfile,
    requestedRuntime: params.requestedRuntime,
  });

  return {
    policy: manifest.policy,
    sandboxRun,
    manifest,
    evaluation,
    taskGraphSnapshot,
    traceReplay,
    localWorkflowPlan,
    cloudPlan,
  };
}

export function buildLocalDockerWorkflowPlan(params: {
  goal: string;
  title: string;
  abstract: string;
  body?: string;
  code?: string;
  codeLanguage?: GeneratedCode["language"];
  artifactRoot?: string;
  environmentProfile?: EnvironmentProfileId;
  requestedRuntime?: SandboxPolicyDecision["requestedRuntime"];
}): LocalDockerWorkflowPlan {
  const workflowId = createStableId("workflow", `${params.goal}-${params.title}`);
  const runRoot = path.join(getRunRoot(params.artifactRoot), "workflow-inputs");
  fs.mkdirSync(runRoot, { recursive: true });
  const inputPath = path.join(runRoot, `${workflowId}.json`);
  writeJson(inputPath, {
    goal: params.goal,
    title: params.title,
    abstract: params.abstract,
    body: params.body,
    code: params.code,
    codeLanguage: params.codeLanguage,
    artifactRoot: params.artifactRoot,
    environmentProfile: params.environmentProfile ?? (params.codeLanguage === "python" ? "python-scientific" : "node-vtk"),
    requestedRuntime: params.requestedRuntime ?? "docker",
  });
  const command = ["pnpm", "phase3:local-workflow", "--", "--input", inputPath];
  return {
    workflowId,
    inputPath,
    environmentProfile:
      params.environmentProfile ?? (params.codeLanguage === "python" ? "python-scientific" : "node-vtk"),
    command,
    shellCommand: command.join(" "),
    expectedOutputs: [
      "sandbox-manifest.json",
      "docker-result.json",
      "stdout.log",
      "stderr.log",
      "workspace/artifacts/vtk-scene-summary.json",
    ],
  };
}

export function buildPhase3AgentExecRecipe(params: {
  goal: string;
  title: string;
  abstract: string;
  body?: string;
  code?: string;
  codeLanguage?: GeneratedCode["language"];
  artifactRoot?: string;
  environmentProfile?: EnvironmentProfileId;
  requestedRuntime?: SandboxPolicyDecision["requestedRuntime"];
}): AgentExecRecipe {
  const workflowPlan = buildLocalDockerWorkflowPlan(params);
  const environmentProfile = workflowPlan.environmentProfile;
  const requestedRuntime = params.requestedRuntime ?? "docker";
  const toolArguments = {
    goal: params.goal,
    title: params.title,
    abstract: params.abstract,
    body: params.body,
    code: params.code,
    codeLanguage: params.codeLanguage,
    artifactRoot: params.artifactRoot,
    environmentProfile,
    requestedRuntime,
  };

  return {
    recipeId: createStableId("agent-recipe", `${params.goal}-${params.title}-${environmentProfile}`),
    goal: params.goal,
    environmentProfile,
    preferredToolCall: {
      toolName: "phase3_local_workflow_plan",
      arguments: toolArguments,
    },
    expectedExec: {
      cwd: path.resolve(process.cwd()),
      command: workflowPlan.shellCommand,
    },
    successChecks: [
      "phase3_local_workflow_plan returns an inputPath and shellCommand.",
      "exec runs pnpm phase3:local-workflow with exit code 0.",
      "docker-result.json reports status passed and exitCode 0.",
      "workspace/artifacts/vtk-scene-summary.json exists in the run directory.",
    ],
    troubleshooting: [
      "If exec cannot find the command, change to the plugin repository before running the shellCommand.",
      "If Docker build fails, inspect docker-build.stderr.log in the run directory.",
      "If the tool is not visible in OpenClaw, restart the gateway and open a fresh session so the tool allowlist refreshes.",
    ],
    agentPrompt: [
      "Use phase3_local_workflow_plan first.",
      `Pass goal=${JSON.stringify(params.goal)}, title=${JSON.stringify(params.title)}, abstract=${JSON.stringify(params.abstract)}.`,
      `Keep environmentProfile=${JSON.stringify(environmentProfile)} and requestedRuntime=${JSON.stringify(requestedRuntime)}.`,
      "After the tool returns, call exec in the plugin repository and run the returned shellCommand exactly once.",
      "When exec finishes, summarize manifest path, docker-result status, exit code, and artifact paths.",
    ].join(" "),
  };
}
