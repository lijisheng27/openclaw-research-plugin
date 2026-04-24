import fs from "node:fs";
import path from "node:path";
import type {
  ResearchVtkjsLoopOutput,
  VtkjsCorpusBuildOutput,
  VtkjsCorpusEntry,
  VtkjsCorpusUpdateOutput,
  VtkjsEvalRunnerOutput,
  VtkjsGenerationBrief,
} from "../contracts/research-contracts.js";
import { createStableId, sanitizeDockerNameSegment } from "./research-utils.js";
import { runResearchVtkjsLoop } from "./research-vtkjs-loop.js";
import { runVtkjsEvalRunner } from "./vtkjs-eval.js";
import { compareVtkjsEvidence, runPhase5RepairLoop, summarizeVtkjsEvidence } from "./vtkjs-repair.js";

type CorpusTrack = VtkjsCorpusEntry["track"];

interface CorpusPromptSpec {
  track: Exclude<CorpusTrack, "benchmark">;
  slug: string;
  title: string;
  goal: string;
  abstract: string;
  body?: string;
  tags: string[];
  difficulty: "starter" | "advanced";
}

interface BuildVtkjsCorpusParams {
  outputRoot?: string;
  artifactRoot?: string;
  includePromptSample?: boolean;
  includePromptSamplePro?: boolean;
  includeBenchmark?: boolean;
}

interface UpdateVtkjsCorpusEntryParams {
  corpusRoot?: string;
  manifestPath?: string;
  track?: VtkjsCorpusEntry["track"];
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
}

const PROMPT_SAMPLE_SPECS: CorpusPromptSpec[] = [
  {
    track: "prompt-sample",
    slug: "rendering-sphere-baseline",
    title: "vtk.js Sphere Baseline",
    goal: "Generate and validate a vtk.js sphere scene with browser evidence",
    abstract: "Keep the scene minimal, deterministic, and compatible with the canonical browser-validation workflow.",
    tags: ["generic", "baseline", "browser-validation"],
    difficulty: "starter",
  },
  {
    track: "prompt-sample",
    slug: "rendering-image-slice",
    title: "vtk.js Image Slice Baseline",
    goal: "Generate and validate a vtk.js slice scene with browser evidence",
    abstract: "Use a slice-oriented scaffold that stays easy to inspect in the browser verification contract.",
    tags: ["slice", "image-data", "browser-validation"],
    difficulty: "starter",
  },
  {
    track: "prompt-sample",
    slug: "rendering-volume-baseline",
    title: "vtk.js Volume Baseline",
    goal: "Generate and validate a vtk.js volume rendering scene with browser evidence",
    abstract: "Keep the volume task deterministic while making transfer-function intent explicit for later upgrades.",
    tags: ["volume", "transfer-function", "browser-validation"],
    difficulty: "starter",
  },
  {
    track: "prompt-sample",
    slug: "rendering-streamline-baseline",
    title: "vtk.js Streamline Baseline",
    goal: "Generate and validate a vtk.js streamline scene with browser evidence",
    abstract: "Use a stable streamline scaffold that preserves vector-field intent without sacrificing browser verifiability.",
    tags: ["streamline", "vector-field", "browser-validation"],
    difficulty: "starter",
  },
];

const PROMPT_SAMPLE_PRO_SPECS: CorpusPromptSpec[] = [
  {
    track: "prompt-sample-pro",
    slug: "rendering-mag-iso-benchmark",
    title: "vtk.js Mag-Iso Benchmark Prompt",
    goal: "Generate and validate a vtk.js mag-iso scene with browser evidence and benchmark-ready structure",
    abstract: "The task should preserve iso-surface intent, stay deterministic, and keep the artifact contract ready for benchmark comparison.",
    body: "Treat the generated candidate as a corpus seed that should later support repair-loop updates and benchmark comparison.",
    tags: ["mag-iso", "benchmark", "artifact-contract"],
    difficulty: "advanced",
  },
  {
    track: "prompt-sample-pro",
    slug: "repair-aware-volume-task",
    title: "vtk.js Repair-Aware Volume Task",
    goal: "Generate a vtk.js volume scene that is easy to repair if browser validation reports missing canvas or runtime errors",
    abstract: "Emphasize failure-aware structure, explicit mapper setup, and deterministic render ordering.",
    body: "The candidate should stay close to the canonical Phase 5 repair path so Docker reruns can compare artifact deltas without changing the whole scene shape.",
    tags: ["volume", "repair", "artifact-delta"],
    difficulty: "advanced",
  },
  {
    track: "prompt-sample-pro",
    slug: "browser-evidence-scene-review",
    title: "vtk.js Browser Evidence Review Task",
    goal: "Generate and validate a vtk.js scene whose prompt, code, and workflow input are all ready for corpus review",
    abstract: "The output should be suitable for prompt-sample-pro storage with stable prompt, retrieval context, starter code, and validation command.",
    body: "Assume the sample will be revised over time by OpenClaw through Docker-backed validation and repair updates.",
    tags: ["review", "corpus", "repair-loop"],
    difficulty: "advanced",
  },
  {
    track: "prompt-sample-pro",
    slug: "benchmark-stable-scaffold",
    title: "vtk.js Stable Benchmark Scaffold Task",
    goal: "Generate a benchmark-stable vtk.js scene that can seed later task-specific benchmark cases",
    abstract: "Favor explicit acceptance checks and repeatable workflow inputs over visual complexity.",
    body: "This prompt should help bootstrap a corpus entry that later evolves into a harder benchmark without losing reproducibility.",
    tags: ["benchmark", "reproducibility", "workflow-input"],
    difficulty: "advanced",
  },
];

const BENCHMARK_CASE_IDS = ["slice", "volume", "streamline", "mag_iso"] as const;

function getCorpusRoot(outputRoot?: string) {
  return path.resolve(outputRoot?.trim() || path.join(process.cwd(), "knowledge", "vtkjs"));
}

function getArtifactRoot(root: string, artifactRoot?: string) {
  return path.resolve(artifactRoot?.trim() || path.join(root, "_artifacts"));
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function fileExists(filePath?: string) {
  return Boolean(filePath && fs.existsSync(filePath));
}

function readText(filePath: string) {
  return fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

function writeJson(filePath: string, value: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function writeText(filePath: string, value: string) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf-8");
}

function relativeFrom(root: string, filePath: string) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function copyOptionalFile(sourcePath: string | undefined, targetPath: string) {
  if (!sourcePath?.trim()) {
    return false;
  }
  const resolvedSource = path.resolve(sourcePath);
  if (!fs.existsSync(resolvedSource)) {
    return false;
  }
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(resolvedSource, targetPath);
  return true;
}

function sceneKindLabel(sceneKind: VtkjsGenerationBrief["sceneKind"]) {
  return sceneKind.replace(/_/g, "-");
}

function buildWorkflowInputFromLoop(loop: ResearchVtkjsLoopOutput, artifactRoot: string) {
  return {
    goal: loop.selection.goal,
    title: loop.selection.templateLabel,
    abstract: loop.generationBrief?.generationPrompt ?? loop.selection.rationale.join(" "),
    html: loop.generatedCandidate?.html,
    script: loop.generatedCandidate?.script,
    artifactRoot,
    environmentProfile: loop.selection.environmentProfile,
    requestedRuntime: loop.phase5Execution.selection.requestedRuntime,
  };
}

function buildWorkflowInputFromBenchmark(
  item: VtkjsEvalRunnerOutput["cases"][number],
  artifactRoot: string,
) {
  return {
    goal: item.generation.brief.query,
    title: item.title,
    abstract: item.generation.brief.generationPrompt,
    html: item.generation.html,
    script: item.generation.script,
    artifactRoot,
    environmentProfile: "node-vtk",
    requestedRuntime: "docker" as const,
  };
}

function buildPromptMarkdown(spec: CorpusPromptSpec, loop: ResearchVtkjsLoopOutput, workflowInputPath: string) {
  return [
    `# ${spec.title}`,
    "",
    `- Track: \`${spec.track}\``,
    `- Difficulty: \`${spec.difficulty}\``,
    `- Scene kind: \`${sceneKindLabel(loop.generatedCandidate?.sceneKind ?? loop.generationBrief?.sceneKind ?? "generic")}\``,
    `- Tags: ${spec.tags.map((tag) => `\`${tag}\``).join(", ")}`,
    "",
    "## Goal",
    "",
    spec.goal,
    "",
    "## Abstract",
    "",
    spec.abstract,
    "",
    ...(spec.body ? ["## Notes", "", spec.body, ""] : []),
    "## Stable Command",
    "",
    `\`pnpm phase5:local-workflow -- --input "${workflowInputPath}"\``,
    "",
  ].join("\n");
}

function buildCorpusReadme(params: {
  promptSampleCount: number;
  promptSampleProCount: number;
  benchmarkCount: number;
}) {
  return [
    "# vtk.js Corpus Bootstrap",
    "",
    "This directory is the first corpus-oriented landing zone for the Phase 5 vtk.js workflow.",
    "It keeps prompt tasks, prompt-sample-pro tasks, benchmark seeds, and rebuilding instructions in a layout that can later evolve toward a larger webSiv-style corpus.",
    "",
    "## Layout",
    "",
    "- `prompt-sample/`: starter tasks with prompt, retrieval context, code generation output, and workflow input.",
    "- `prompt-sample-pro/`: richer tasks intended for repair-aware or benchmark-aware corpus growth.",
    "- `benchmark/`: canonical benchmark seeds aligned with the current execution-backed eval taxonomy.",
    "- `scripts/`: instructions for rebuilding the corpus and replaying Docker validation on stored workflow inputs.",
    "",
    "## Current Counts",
    "",
    `- prompt-sample: ${params.promptSampleCount}`,
    `- prompt-sample-pro: ${params.promptSampleProCount}`,
    `- benchmark: ${params.benchmarkCount}`,
    "",
    "## Rebuild",
    "",
    "```powershell",
    "cd C:\\Users\\12159\\learnClaw\\openclaw-research-plugin",
    "pnpm vtkjs:corpus-build",
    "```",
    "",
    "## Validate One Entry",
    "",
    "```powershell",
    "cd C:\\Users\\12159\\learnClaw\\openclaw-research-plugin",
    "pnpm phase5:local-workflow -- --input C:\\path\\to\\knowledge\\vtkjs\\prompt-sample\\rendering-sphere-baseline\\phase5-workflow-input.json",
    "```",
    "",
  ].join("\n");
}

function buildScriptsReadme(root: string) {
  return [
    "# Corpus Scripts",
    "",
    "These commands rebuild the current corpus seed and replay stored workflow inputs through the existing Docker + Playwright path.",
    "",
    "## Rebuild the Corpus Seed",
    "",
    "```powershell",
    "cd C:\\Users\\12159\\learnClaw\\openclaw-research-plugin",
    `pnpm vtkjs:corpus-build -- --outputRoot "${root}"`,
    "```",
    "",
    "## Run One Stored Workflow",
    "",
    "```powershell",
    "cd C:\\Users\\12159\\learnClaw\\openclaw-research-plugin",
    `pnpm phase5:local-workflow -- --input "${path.join(root, "benchmark", "slice", "phase5-workflow-input.json")}"`,
    "```",
    "",
    "## Run the Current Execution-Backed Eval Set",
    "",
    "```powershell",
    "cd C:\\Users\\12159\\learnClaw\\openclaw-research-plugin",
    "pnpm vtkjs:eval-runner -- --cases slice,volume,streamline,mag_iso",
    "```",
    "",
  ].join("\n");
}

function buildManifestSummary(entries: VtkjsCorpusEntry[]) {
  const promptSampleCount = entries.filter((entry) => entry.track === "prompt-sample").length;
  const promptSampleProCount = entries.filter((entry) => entry.track === "prompt-sample-pro").length;
  const benchmarkCount = entries.filter((entry) => entry.track === "benchmark").length;
  return {
    promptSampleCount,
    promptSampleProCount,
    benchmarkCount,
  };
}

function resolveCorpusRootForUpdate(params: UpdateVtkjsCorpusEntryParams) {
  if (params.corpusRoot?.trim()) {
    return path.resolve(params.corpusRoot);
  }
  if (params.manifestPath?.trim()) {
    return path.dirname(path.resolve(params.manifestPath));
  }
  if (params.entryDirectory?.trim()) {
    const resolvedEntry = path.resolve(params.entryDirectory);
    return path.dirname(path.dirname(resolvedEntry));
  }
  return getCorpusRoot();
}

function resolveManifestPathForUpdate(corpusRoot: string, manifestPath?: string) {
  const resolved = path.resolve(manifestPath?.trim() || path.join(corpusRoot, "corpus-manifest.json"));
  return fs.existsSync(resolved) ? resolved : undefined;
}

function resolveEntryDirectory(params: UpdateVtkjsCorpusEntryParams, corpusRoot: string) {
  if (params.entryDirectory?.trim()) {
    const resolvedEntry = path.resolve(params.entryDirectory);
    if (!fs.existsSync(resolvedEntry)) {
      throw new Error(`Corpus entry directory does not exist: ${resolvedEntry}`);
    }
    return resolvedEntry;
  }
  if (!params.track || !params.slug?.trim()) {
    throw new Error("Updating a corpus entry requires either entryDirectory or both track and slug.");
  }
  const resolvedEntry = path.join(corpusRoot, params.track, sanitizeDockerNameSegment(params.slug, 64));
  if (!fs.existsSync(resolvedEntry)) {
    throw new Error(`Corpus entry directory does not exist: ${resolvedEntry}`);
  }
  return resolvedEntry;
}

function detectTrackFromEntryDirectory(entryDirectory: string): VtkjsCorpusEntry["track"] {
  const normalized = entryDirectory.replace(/\\/g, "/");
  if (normalized.includes("/prompt-sample-pro/")) {
    return "prompt-sample-pro";
  }
  if (normalized.includes("/benchmark/")) {
    return "benchmark";
  }
  return "prompt-sample";
}

function readEntryMetadata(entryDirectory: string) {
  const taskPath = path.join(entryDirectory, "task.json");
  const benchmarkPath = path.join(entryDirectory, "benchmark-spec.json");
  if (fileExists(taskPath)) {
    return {
      metadataPath: taskPath,
      metadata: readJson<Record<string, unknown>>(taskPath),
      isBenchmark: false,
    };
  }
  if (fileExists(benchmarkPath)) {
    return {
      metadataPath: benchmarkPath,
      metadata: readJson<Record<string, unknown>>(benchmarkPath),
      isBenchmark: true,
    };
  }
  throw new Error(`No task.json or benchmark-spec.json found in corpus entry: ${entryDirectory}`);
}

function readWorkflowInput(entryDirectory: string) {
  const workflowInputPath = path.join(entryDirectory, "phase5-workflow-input.json");
  if (!fileExists(workflowInputPath)) {
    throw new Error(`No phase5-workflow-input.json found in corpus entry: ${entryDirectory}`);
  }
  return {
    workflowInputPath,
    workflowInput: readJson<Record<string, unknown>>(workflowInputPath),
  };
}

function readOptionalJson<T>(filePath: string) {
  if (!fileExists(filePath)) {
    return undefined;
  }
  return readJson<T>(filePath);
}

function sanitizeObjectRecord(input: Record<string, unknown> | undefined) {
  return input ?? {};
}

function readCandidatePayload(entryDirectory: string) {
  const generatedCandidatePath = path.join(entryDirectory, "generated-candidate.json");
  const generationPath = path.join(entryDirectory, "generation.json");
  if (fileExists(generatedCandidatePath)) {
    return readJson<Record<string, unknown>>(generatedCandidatePath);
  }
  if (fileExists(generationPath)) {
    return readJson<Record<string, unknown>>(generationPath);
  }
  return undefined;
}

function writePromptEntry(root: string, artifactRoot: string, spec: CorpusPromptSpec): VtkjsCorpusEntry {
  const entryDir = path.join(root, spec.track, sanitizeDockerNameSegment(spec.slug, 64));
  ensureDir(entryDir);

  const loop = runResearchVtkjsLoop({
    goal: spec.goal,
    title: spec.title,
    abstract: spec.abstract,
    body: spec.body,
    artifactRoot: path.join(artifactRoot, spec.track, spec.slug),
    includeRepair: false,
    includeVisualization: false,
  });

  const workflowInput = buildWorkflowInputFromLoop(loop, path.join(artifactRoot, spec.track, spec.slug));
  const promptPath = path.join(entryDir, "prompt.md");
  const metadataPath = path.join(entryDir, "task.json");
  const contextPath = path.join(entryDir, "context.json");
  const briefPath = path.join(entryDir, "generation-brief.json");
  const candidatePath = path.join(entryDir, "generated-candidate.json");
  const workflowInputPath = path.join(entryDir, "phase5-workflow-input.json");
  const recipePath = path.join(entryDir, "phase5-agent-recipe.json");

  writeText(promptPath, buildPromptMarkdown(spec, loop, workflowInputPath));
  writeJson(metadataPath, {
    entryId: createStableId("vtkjs-corpus-entry", `${spec.track}-${spec.slug}`),
    track: spec.track,
    slug: spec.slug,
    title: spec.title,
    goal: spec.goal,
    abstract: spec.abstract,
    body: spec.body,
    difficulty: spec.difficulty,
    tags: spec.tags,
    templateId: loop.selection.templateId,
    routeKind: loop.phase5Execution.routeKind,
    recommendedCommand: `pnpm phase5:local-workflow -- --input "${workflowInputPath}"`,
    nextActions: loop.nextActions,
  });
  writeJson(contextPath, loop.vtkjsContext);
  writeJson(briefPath, loop.generationBrief);
  writeJson(candidatePath, loop.generatedCandidate);
  writeJson(workflowInputPath, workflowInput);
  writeJson(recipePath, loop.phase5AgentRecipe);

  return {
    entryId: createStableId("vtkjs-corpus-entry", `${spec.track}-${spec.slug}`),
    track: spec.track,
    slug: spec.slug,
    title: spec.title,
    sceneKind: loop.generatedCandidate?.sceneKind ?? loop.generationBrief?.sceneKind ?? "generic",
    directory: entryDir,
    files: [
      promptPath,
      metadataPath,
      contextPath,
      briefPath,
      candidatePath,
      workflowInputPath,
      recipePath,
    ].map((item) => relativeFrom(root, item)),
  };
}

function writeBenchmarkEntries(root: string, artifactRoot: string) {
  const evalOutput = runVtkjsEvalRunner({
    caseIds: [...BENCHMARK_CASE_IDS],
    artifactRoot: path.join(artifactRoot, "benchmark-eval"),
  });

  const entries = evalOutput.cases.map((item) => {
    const entryDir = path.join(root, "benchmark", sanitizeDockerNameSegment(item.caseId, 64));
    ensureDir(entryDir);

    const workflowInput = buildWorkflowInputFromBenchmark(
      item,
      path.join(artifactRoot, "benchmark", item.caseId),
    );
    const metadataPath = path.join(entryDir, "benchmark-spec.json");
    const generationPath = path.join(entryDir, "generation.json");
    const workflowInputPath = path.join(entryDir, "phase5-workflow-input.json");
    const workflowPlanPath = path.join(entryDir, "workflow-plan.json");
    const checksPath = path.join(entryDir, "checks.json");

    writeJson(metadataPath, {
      caseId: item.caseId,
      title: item.title,
      sceneKind: item.sceneKind,
      score: item.score,
      status: item.status,
      summary: item.summary,
    });
    writeJson(generationPath, item.generation);
    writeJson(workflowInputPath, workflowInput);
    writeJson(workflowPlanPath, item.workflow);
    writeJson(checksPath, item.checks);

    return {
      entryId: createStableId("vtkjs-corpus-entry", `benchmark-${item.caseId}`),
      track: "benchmark" as const,
      slug: item.caseId,
      title: item.title,
      sceneKind: item.sceneKind,
      directory: entryDir,
      files: [
        metadataPath,
        generationPath,
        workflowInputPath,
        workflowPlanPath,
        checksPath,
      ].map((filePath) => relativeFrom(root, filePath)),
    };
  });

  return {
    evalOutput,
    entries,
  };
}

export function buildVtkjsCorpus(params: BuildVtkjsCorpusParams = {}): VtkjsCorpusBuildOutput {
  const corpusRoot = getCorpusRoot(params.outputRoot);
  const artifactRoot = getArtifactRoot(corpusRoot, params.artifactRoot);

  ensureDir(corpusRoot);
  ensureDir(artifactRoot);

  const includePromptSample = params.includePromptSample ?? true;
  const includePromptSamplePro = params.includePromptSamplePro ?? true;
  const includeBenchmark = params.includeBenchmark ?? true;
  const entries: VtkjsCorpusEntry[] = [];

  if (includePromptSample) {
    for (const spec of PROMPT_SAMPLE_SPECS) {
      entries.push(writePromptEntry(corpusRoot, artifactRoot, spec));
    }
  }

  if (includePromptSamplePro) {
    for (const spec of PROMPT_SAMPLE_PRO_SPECS) {
      entries.push(writePromptEntry(corpusRoot, artifactRoot, spec));
    }
  }

  let benchmarkEval: VtkjsEvalRunnerOutput | undefined;
  if (includeBenchmark) {
    const benchmarkResult = writeBenchmarkEntries(corpusRoot, artifactRoot);
    benchmarkEval = benchmarkResult.evalOutput;
    entries.push(...benchmarkResult.entries);
  }

  const summary = buildManifestSummary(entries);
  const readmePath = path.join(corpusRoot, "README.md");
  const scriptGuidePath = path.join(corpusRoot, "scripts", "README.md");
  const manifestPath = path.join(corpusRoot, "corpus-manifest.json");

  writeText(readmePath, buildCorpusReadme(summary));
  writeText(scriptGuidePath, buildScriptsReadme(corpusRoot));
  writeJson(manifestPath, {
    buildId: createStableId("vtkjs-corpus", `${corpusRoot}-${entries.length}`),
    corpusRoot,
    generatedAt: new Date().toISOString(),
    tracks: {
      promptSample: summary.promptSampleCount,
      promptSamplePro: summary.promptSampleProCount,
      benchmark: summary.benchmarkCount,
    },
    entries: entries.map((entry) => ({
      ...entry,
      directory: relativeFrom(corpusRoot, entry.directory),
    })),
    benchmarkEval,
  });

  return {
    buildId: createStableId("vtkjs-corpus", `${corpusRoot}-${entries.length}`),
    corpusRoot,
    manifestPath,
    readmePath,
    scriptGuidePath,
    promptSampleCount: summary.promptSampleCount,
    promptSampleProCount: summary.promptSampleProCount,
    benchmarkCount: summary.benchmarkCount,
    entries,
    nextActions: [
      `Run pnpm vtkjs:corpus-build -- --outputRoot "${corpusRoot}" whenever you want to refresh the seed corpus.`,
      "Use one of the stored phase5-workflow-input.json files to replay Docker validation on a specific corpus item.",
      "Promote the current prompt-sample-pro and benchmark seed entries into richer real-world tasks after the validation baseline stays green.",
    ],
  };
}

export function updateVtkjsCorpusEntry(params: UpdateVtkjsCorpusEntryParams): VtkjsCorpusUpdateOutput {
  const corpusRoot = resolveCorpusRootForUpdate(params);
  const manifestPath = resolveManifestPathForUpdate(corpusRoot, params.manifestPath);
  const entryDirectory = resolveEntryDirectory(params, corpusRoot);
  const track = params.track ?? detectTrackFromEntryDirectory(entryDirectory);
  const slug = params.slug?.trim() || path.basename(entryDirectory);
  const entryId = createStableId("vtkjs-corpus-entry", `${track}-${slug}`);
  const validationRoot = path.join(entryDirectory, "validation");
  const evidenceDir = path.join(validationRoot, "evidence");
  const comparisonDir = path.join(validationRoot, "comparison");
  const acceptedDir = path.join(validationRoot, "accepted");
  const updatedFiles: string[] = [];
  const promotedFiles: string[] = [];

  ensureDir(validationRoot);
  const { metadataPath, metadata } = readEntryMetadata(entryDirectory);
  const { workflowInputPath, workflowInput } = readWorkflowInput(entryDirectory);
  const candidatePayload = readCandidatePayload(entryDirectory);
  const stagedWorkflowInputPath = path.join(validationRoot, "next-phase5-workflow-input.json");
  const stagedWorkflowInput = readOptionalJson<Record<string, unknown>>(stagedWorkflowInputPath);
  const promotedCandidatePath = path.join(validationRoot, "stable-promotion.json");
  const dockerResult = params.dockerResultPath ? readOptionalJson<Record<string, unknown>>(path.resolve(params.dockerResultPath)) : undefined;

  const baseEvidence = {
    renderReport: params.renderReport ?? (params.renderReportPath && fileExists(params.renderReportPath) ? readText(path.resolve(params.renderReportPath)) : undefined),
    browserConsole:
      params.browserConsole ??
      (params.browserConsolePath && fileExists(params.browserConsolePath) ? readText(path.resolve(params.browserConsolePath)) : undefined),
    pageErrors:
      params.pageErrors ?? (params.pageErrorsPath && fileExists(params.pageErrorsPath) ? readText(path.resolve(params.pageErrorsPath)) : undefined),
  };
  const comparisonEvidence = {
    renderReport:
      params.comparisonRenderReport ??
      (params.comparisonRenderReportPath && fileExists(params.comparisonRenderReportPath)
        ? readText(path.resolve(params.comparisonRenderReportPath))
        : undefined),
    browserConsole:
      params.comparisonBrowserConsole ??
      (params.comparisonBrowserConsolePath && fileExists(params.comparisonBrowserConsolePath)
        ? readText(path.resolve(params.comparisonBrowserConsolePath))
        : undefined),
    pageErrors:
      params.comparisonPageErrors ??
      (params.comparisonPageErrorsPath && fileExists(params.comparisonPageErrorsPath)
        ? readText(path.resolve(params.comparisonPageErrorsPath))
        : undefined),
  };

  let stableArtifactSummaryPath: string | undefined;
  let benchmarkGroundTruthPath: string | undefined;

  const evidenceSummary = summarizeVtkjsEvidence("latest", baseEvidence);
  const comparisonSummary = summarizeVtkjsEvidence("comparison", comparisonEvidence);
  const artifactComparison =
    evidenceSummary && comparisonSummary ? compareVtkjsEvidence(evidenceSummary, comparisonSummary) : undefined;

  if (evidenceSummary) {
    const summaryPath = path.join(validationRoot, "latest-evidence-summary.json");
    writeJson(summaryPath, evidenceSummary);
    updatedFiles.push(summaryPath);
  }

  if (artifactComparison) {
    const comparisonPath = path.join(validationRoot, "artifact-comparison.json");
    writeJson(comparisonPath, artifactComparison);
    updatedFiles.push(comparisonPath);
  }

  if (params.copyEvidence ?? true) {
    if (copyOptionalFile(params.renderReportPath, path.join(evidenceDir, "render-verification.json"))) {
      updatedFiles.push(path.join(evidenceDir, "render-verification.json"));
    }
    if (copyOptionalFile(params.browserConsolePath, path.join(evidenceDir, "browser-console.json"))) {
      updatedFiles.push(path.join(evidenceDir, "browser-console.json"));
    }
    if (copyOptionalFile(params.pageErrorsPath, path.join(evidenceDir, "page-errors.json"))) {
      updatedFiles.push(path.join(evidenceDir, "page-errors.json"));
    }
    if (copyOptionalFile(params.renderScreenshotPath, path.join(evidenceDir, "render-screenshot.png"))) {
      updatedFiles.push(path.join(evidenceDir, "render-screenshot.png"));
    }
    if (copyOptionalFile(params.comparisonRenderReportPath, path.join(comparisonDir, "render-verification.json"))) {
      updatedFiles.push(path.join(comparisonDir, "render-verification.json"));
    }
    if (copyOptionalFile(params.comparisonBrowserConsolePath, path.join(comparisonDir, "browser-console.json"))) {
      updatedFiles.push(path.join(comparisonDir, "browser-console.json"));
    }
    if (copyOptionalFile(params.comparisonPageErrorsPath, path.join(comparisonDir, "page-errors.json"))) {
      updatedFiles.push(path.join(comparisonDir, "page-errors.json"));
    }
    if (copyOptionalFile(params.comparisonRenderScreenshotPath, path.join(comparisonDir, "render-screenshot.png"))) {
      updatedFiles.push(path.join(comparisonDir, "render-screenshot.png"));
    }
  }

  const shouldPromoteAcceptedRetry =
    params.promoteAcceptedRetry ??
    Boolean(
      evidenceSummary?.verdict === "accepted" &&
        stagedWorkflowInput &&
        (artifactComparison?.improved ?? true),
    );

  const goal = String(workflowInput.goal ?? metadata.goal ?? metadata.title ?? slug);
  const title = String(workflowInput.title ?? metadata.title ?? slug);
  const abstract = String(workflowInput.abstract ?? metadata.abstract ?? "Update the stored vtk.js corpus entry.");
  const html = typeof workflowInput.html === "string"
    ? workflowInput.html
    : typeof candidatePayload?.html === "string"
      ? candidatePayload.html
      : undefined;
  const script = typeof workflowInput.script === "string"
    ? workflowInput.script
    : typeof candidatePayload?.script === "string"
      ? candidatePayload.script
      : undefined;

  let promotedToStable = false;
  if (shouldPromoteAcceptedRetry && stagedWorkflowInput) {
    writeJson(workflowInputPath, stagedWorkflowInput);
    promotedFiles.push(workflowInputPath);

    if (candidatePayload) {
      const updatedCandidate = {
        ...candidatePayload,
        html:
          typeof stagedWorkflowInput.html === "string"
            ? stagedWorkflowInput.html
            : candidatePayload.html,
        script:
          typeof stagedWorkflowInput.script === "string"
            ? stagedWorkflowInput.script
            : candidatePayload.script,
        starterNotes: Array.isArray(candidatePayload.starterNotes)
          ? [
              ...candidatePayload.starterNotes,
              `Promoted accepted retry at ${new Date().toISOString()}.`,
            ]
          : [`Promoted accepted retry at ${new Date().toISOString()}.`],
      };
      const generatedCandidatePath = path.join(entryDirectory, "generated-candidate.json");
      const generationPath = path.join(entryDirectory, "generation.json");
      if (fileExists(generatedCandidatePath)) {
        writeJson(generatedCandidatePath, updatedCandidate);
        promotedFiles.push(generatedCandidatePath);
      } else if (fileExists(generationPath)) {
        writeJson(generationPath, updatedCandidate);
        promotedFiles.push(generationPath);
      }
    }

    if (params.copyEvidence ?? true) {
      if (copyOptionalFile(params.renderReportPath, path.join(acceptedDir, "render-verification.json"))) {
        promotedFiles.push(path.join(acceptedDir, "render-verification.json"));
      }
      if (copyOptionalFile(params.browserConsolePath, path.join(acceptedDir, "browser-console.json"))) {
        promotedFiles.push(path.join(acceptedDir, "browser-console.json"));
      }
      if (copyOptionalFile(params.pageErrorsPath, path.join(acceptedDir, "page-errors.json"))) {
        promotedFiles.push(path.join(acceptedDir, "page-errors.json"));
      }
      if (copyOptionalFile(params.renderScreenshotPath, path.join(acceptedDir, "render-screenshot.png"))) {
        promotedFiles.push(path.join(acceptedDir, "render-screenshot.png"));
      }
    }

    stableArtifactSummaryPath = path.join(acceptedDir, "stable-artifacts-summary.json");
    writeJson(stableArtifactSummaryPath, {
      promotedAt: new Date().toISOString(),
      verdict: evidenceSummary?.verdict ?? "unknown",
      canvasFound: evidenceSummary?.canvasFound ?? false,
      consoleErrorCount: evidenceSummary?.consoleErrorCount ?? 0,
      pageErrorCount: evidenceSummary?.pageErrorCount ?? 0,
      dockerStatus: dockerResult?.status,
      dockerExitCode: dockerResult?.exitCode,
      screenshotPath: fileExists(path.join(acceptedDir, "render-screenshot.png"))
        ? relativeFrom(entryDirectory, path.join(acceptedDir, "render-screenshot.png"))
        : undefined,
      artifactComparisonImproved: artifactComparison?.improved ?? false,
      sourceWorkflowInputPath: relativeFrom(entryDirectory, stagedWorkflowInputPath),
    });
    promotedFiles.push(stableArtifactSummaryPath);

    if (track === "benchmark") {
      benchmarkGroundTruthPath = path.join(entryDirectory, "ground-truth.json");
      writeJson(benchmarkGroundTruthPath, {
        caseId: metadata.caseId ?? slug,
        title: metadata.title ?? title,
        sceneKind: metadata.sceneKind ?? candidatePayload?.sceneKind,
        acceptedAt: new Date().toISOString(),
        verdict: evidenceSummary?.verdict ?? "unknown",
        renderSummaryPath: relativeFrom(entryDirectory, stableArtifactSummaryPath),
        screenshotPath: fileExists(path.join(acceptedDir, "render-screenshot.png"))
          ? relativeFrom(entryDirectory, path.join(acceptedDir, "render-screenshot.png"))
          : undefined,
      });
      promotedFiles.push(benchmarkGroundTruthPath);
    }

    writeJson(promotedCandidatePath, {
      promotedAt: new Date().toISOString(),
      sourceWorkflowInputPath: relativeFrom(entryDirectory, stagedWorkflowInputPath),
      verdict: evidenceSummary?.verdict ?? "unknown",
      artifactComparisonImproved: artifactComparison?.improved ?? false,
    });
    promotedFiles.push(promotedCandidatePath);
    promotedToStable = true;
  }

  const shouldRunRepair =
    params.includeRepair ??
    Boolean(
      evidenceSummary &&
        (evidenceSummary.verdict !== "accepted" ||
          !evidenceSummary.canvasFound ||
          evidenceSummary.consoleErrorCount > 0 ||
          evidenceSummary.pageErrorCount > 0),
    );

  const repair = shouldRunRepair
    ? runPhase5RepairLoop({
        goal,
        title,
        abstract,
        html,
        script,
        renderReport: baseEvidence.renderReport,
        browserConsole: baseEvidence.browserConsole,
        pageErrors: baseEvidence.pageErrors,
        comparisonRenderReport: comparisonEvidence.renderReport,
        comparisonBrowserConsole: comparisonEvidence.browserConsole,
        comparisonPageErrors: comparisonEvidence.pageErrors,
        artifactRoot:
          typeof workflowInput.artifactRoot === "string"
            ? workflowInput.artifactRoot
            : path.join(corpusRoot, "_artifacts", track, slug, "repair"),
      })
    : undefined;

  let nextWorkflowInputPath: string | undefined;
  if (repair) {
    const repairPath = path.join(validationRoot, "repair-loop.json");
    writeJson(repairPath, repair);
    updatedFiles.push(repairPath);

    const nextWorkflowInput = {
      ...workflowInput,
      goal,
      title,
      abstract,
      html: repair.repair.repairedHtml ?? html,
      script: repair.repair.repairedScript ?? script,
      artifactRoot:
        typeof workflowInput.artifactRoot === "string"
          ? workflowInput.artifactRoot
          : path.join(corpusRoot, "_artifacts", track, slug, "repair-retry"),
    };
    nextWorkflowInputPath = path.join(validationRoot, "next-phase5-workflow-input.json");
    writeJson(nextWorkflowInputPath, nextWorkflowInput);
    updatedFiles.push(nextWorkflowInputPath);
  }

  const latestValidation = {
    updatedAt: new Date().toISOString(),
    verdict: evidenceSummary?.verdict ?? "unknown",
    canvasFound: evidenceSummary?.canvasFound ?? false,
    consoleErrorCount: evidenceSummary?.consoleErrorCount ?? 0,
    pageErrorCount: evidenceSummary?.pageErrorCount ?? 0,
    artifactComparisonImproved: artifactComparison?.improved ?? false,
    repairCategory: repair?.repair.category,
    promotedToStable,
    nextWorkflowInputPath: nextWorkflowInputPath ? relativeFrom(entryDirectory, nextWorkflowInputPath) : undefined,
  };
  writeJson(metadataPath, {
    ...metadata,
    latestValidation,
    stableRevision: promotedToStable
      ? {
          promotedAt: latestValidation.updatedAt,
          verdict: latestValidation.verdict,
          source: relativeFrom(entryDirectory, stagedWorkflowInputPath),
          stableArtifactSummaryPath: stableArtifactSummaryPath
            ? relativeFrom(entryDirectory, stableArtifactSummaryPath)
            : undefined,
          benchmarkGroundTruthPath: benchmarkGroundTruthPath
            ? relativeFrom(entryDirectory, benchmarkGroundTruthPath)
            : undefined,
        }
      : metadata.stableRevision,
  });
  updatedFiles.push(metadataPath);

  if (manifestPath) {
    const manifest = readJson<Record<string, unknown>>(manifestPath);
    const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
    const updatedEntries = entries.map((entry) => {
      if (
        entry &&
        typeof entry === "object" &&
        entry.track === track &&
        entry.slug === slug
      ) {
        return {
          ...sanitizeObjectRecord(entry as Record<string, unknown>),
          lastUpdatedAt: latestValidation.updatedAt,
          latestVerdict: latestValidation.verdict,
          hasRepairProposal: Boolean(repair),
          promotedToStable,
          stableUpdatedAt: promotedToStable ? latestValidation.updatedAt : entry.stableUpdatedAt,
          hasStableArtifactSummary: promotedToStable ? Boolean(stableArtifactSummaryPath) : entry.hasStableArtifactSummary,
          hasGroundTruth: promotedToStable && track === "benchmark" ? Boolean(benchmarkGroundTruthPath) : entry.hasGroundTruth,
        };
      }
      return entry;
    });
    writeJson(manifestPath, {
      ...manifest,
      entries: updatedEntries,
      lastUpdatedAt: latestValidation.updatedAt,
    });
    updatedFiles.push(manifestPath);
  }

  return {
    updateId: createStableId("vtkjs-corpus-update", `${track}-${slug}-${Date.now()}`),
    corpusRoot,
    entryId,
    track,
    slug,
    entryDirectory,
    manifestPath,
    evidenceSummary,
    artifactComparison,
    repair,
    nextWorkflowInputPath,
    promotedToStable,
    stableArtifactSummaryPath,
    benchmarkGroundTruthPath,
    promotedFiles,
    updatedFiles,
    nextActions: [
      promotedToStable
        ? `Stable corpus files were updated for ${track}/${slug}; replay pnpm phase5:local-workflow -- --input "${workflowInputPath}" to verify the promoted baseline.`
        : nextWorkflowInputPath
        ? `Run pnpm phase5:local-workflow -- --input "${nextWorkflowInputPath}" to validate the repaired corpus candidate.`
        : `Run pnpm phase5:local-workflow -- --input "${workflowInputPath}" to replay the stored corpus workflow.`,
      "Review validation/latest-evidence-summary.json and any copied evidence files before promoting this entry.",
      promotedToStable
        ? "Review validation/stable-promotion.json and the accepted evidence snapshot before moving on to the next corpus task."
        : "If the repaired retry succeeds, write the accepted artifacts back into the corpus entry as the next stable revision.",
    ],
  };
}
