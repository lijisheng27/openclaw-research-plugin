# OpenClaw Research Plugin

This is an external OpenClaw plugin for building a research assistant workflow. The repository keeps research-specific logic outside the OpenClaw core while still using OpenClaw as the gateway, agent runtime, tool host, and control plane.

## Current Stage

The plugin is now in the Phase 5 vtk.js single-entry loop stage.

Phase 1 delivered a runnable minimal loop:

- `paper_ingest`
- `task_orchestrator`
- `code_generator`
- `sandbox_run`
- `validator`
- `trace_recorder`
- `report_build`
- `vtkjs_validate`
- `research_phase1_loop`

Phase 2 adds a local RAG and context pipeline:

- `paper_search`: searches the local paper fixture set.
- `knowledge_ingest`: ingests search results into a persisted JSON RAG store.
- `rag_query`: retrieves relevant chunks from the local store.
- `context_pack_build`: builds a compact context pack with snippets and citations.
- `knowledge_store_status`: shows current store document and chunk counts.
- `research_phase2_knowledge_loop`: runs search, ingest, retrieval, and context-pack generation in one call.

Phase 3 adds reproducible validation and artifact records:

- `sandbox_policy_decide`: decides whether code needs Docker, cloud, sub-agent, or simulated execution.
- `docker_sandbox_run`: prepares a Docker project bundle, environment files, and sandbox manifest.
- `cloud_sandbox_plan`: creates a cloud sandbox handoff plan without running code on the host.
- `phase3_local_workflow_plan`: builds a one-command local workflow for agents to execute with `exec`.
- `phase3_agent_exec_recipe`: returns the standard OpenClaw calling recipe for `phase3_local_workflow_plan -> exec`.
- `artifact_capture`: records file path, kind, summary, and SHA-256 for execution artifacts.
- `task_graph_snapshot`: persists task graph snapshots for replay and audit.
- `trace_replay`: converts Think-Action Trace data into an ordered replay timeline.
- `research_phase3_validation_loop`: runs policy, sandbox manifest, artifact capture, snapshot, and trace replay in one call.

Phase 4 adds structured UI bridge payloads:

- `structured_progress_updates`: emits Dashboard-style progress payloads.
- `task_graph_summary`: summarizes node completion, critical path, and next action.
- `canvas_bridge`: builds a Canvas-friendly card payload.
- `task_flow_bridge`: builds a Task Flow node-and-edge payload.
- `vtk_scene_export`: emits a vtk.js scene export contract.
- `research_phase4_visualization_loop`: generates all Phase 4 visualization payloads in one call.

Phase 5 now starts with template-driven routing:

- `research_vtkjs_loop`: the dedicated vtk.js entrypoint that returns the stable execution recipe, local workflow command, and optional repair plus visualization payloads in one response.
- `vtkjs_knowledge_ingest`: ingests vtk.js-specific local fixtures into a dedicated specialized store.
- `vtkjs_retrieve_context`: returns vtk.js-specific ranked snippets, citations, recommended patterns, and failure-fix hints.
- `vtkjs_generation_brief`: turns vtk.js retrieval context into a generator-friendly prompt, starter script, and acceptance checklist.
- `vtkjs_code_generate`: turns the generation brief into a browser-ready vtk.js starter candidate with HTML, script, and TypeScript source output.
- `vtkjs_eval_runner`: scores the current generator across slice, volume, streamline, and mag-iso benchmark cases.
- `vtkjs_template_select`: selects a Phase 5 task template, chooses the environment profile, and returns a recommended execution recipe for the current goal.
- `phase5_agent_exec_recipe`: returns the stable OpenClaw execution recipe for `research_phase5_execution_loop -> exec`, and includes the repair-workflow handoff for vtk.js failures.
- `vtkjs_render_verify`: prepares a browser-based vtk.js render verification bundle with Playwright evidence, screenshots, browser logs, and a Docker runner manifest.
- `vtkjs_repair_once`: classifies vtk.js browser-validation failures and emits a repaired retry input.
- `phase5_local_workflow_plan`: emits one command that routes to the correct Phase 5 execution branch.
- `phase5_repair_workflow_plan`: emits one command for an executed multi-round repair workflow.
- `research_phase5_execution_loop`: runs the Phase 5 router and returns the selected route plus the local workflow plan.
- `research_phase5_repair_loop`: prepares a repaired retry route after a vtk.js browser validation failure, supports multiple planned rounds, and can compare before/after artifacts.
- `research_phase5_visualization_loop`: turns repair rounds, evidence summaries, and artifact deltas into Dashboard/Canvas/Task Flow friendly payloads.

## Important Boundary

Phase 3 is intentionally safe by default. It writes reproducible manifests, logs, snapshots, and artifact hashes locally. The plugin does not spawn Docker directly because OpenClaw blocks shell execution in plugin production code; the emitted manifest is the handoff contract for the repository Docker runner, a sanctioned sub-agent, or an external sandbox runner.

Already available:

- typed contracts for `TaskGraph`, `ThinkActionTrace`, `SandboxRunResult`, `EvalRecord`, `RAGStoreSnapshot`, `RAGQueryResult`, and `ContextPack`
- local paper search fixture
- persisted JSON knowledge store
- keyword-based retrieval
- context-pack output for later planner and code-generation grounding
- Docker sandbox project bundle with environment-aware support files such as `package.json` or `requirements.txt`, `.dockerignore`, `Dockerfile`, and manifest
- agent-runnable local workflow plan for one-command Docker orchestration
- cloud sandbox handoff plan
- task graph snapshot and trace replay records
- local Docker runner script for manifest execution
- structured progress payloads for UI surfaces
- task graph summary and bridge payloads for Canvas and Task Flow
- vtk.js scene export contract
- vtk.js specialized RAG fixtures for bootstrap, browser evidence, repair hints, and benchmark-oriented scene patterns

Not yet included:

- real Arxiv, Crossref, Scholar, or publisher search adapters
- vector database or embedding rerank
- cloud sandbox API execution
- real Dashboard, Canvas, or Task Flow surface integration for Phase 5 repair review

## Local Development

```bash
cd C:/Users/12159/learnClaw/openclaw-research-plugin
pnpm install
pnpm check
pnpm build
```

Install or refresh the plugin in the local OpenClaw workspace:

```bash
cd C:/Users/12159/learnClaw/openclaw
pnpm openclaw plugins install ../openclaw-research-plugin
```

If OpenClaw uses a restrictive tool profile, allow this plugin in `C:/Users/12159/.openclaw/openclaw.json`:

```json
{
  "tools": {
    "profile": "coding",
    "alsoAllow": ["research-plugin"]
  }
}
```

## Phase 2 Test Flow

In OpenClaw, call these tools in order:

1. `knowledge_store_status`
2. `paper_search` with a query such as `vtk.js sandbox validation for generated scientific code`
3. `knowledge_ingest` with the same query
4. `rag_query` with the same query
5. `context_pack_build` with the same query
6. `research_phase2_knowledge_loop` for the one-shot path

By default, the local store is written to `.research-data/rag-store.json` under the process working directory. You can override it with the `storePath` tool parameter or the `OPENCLAW_RESEARCH_RAG_STORE` environment variable.

## Phase 3 Test Flow

The fastest one-shot OpenClaw test is `research_phase3_validation_loop`:

```json
{
  "goal": "Validate generated vtk.js scene code in a reproducible sandbox path",
  "title": "Sandboxed Evaluation of Generated Research Code",
  "abstract": "Safe execution requires isolated runtimes, captured stdout and stderr, artifact collection, and structured evaluator records.",
  "executeDocker": false,
  "requestedRuntime": "docker"
}
```

You can optionally steer the generated sandbox environment:

- `environmentProfile: "node-vtk"` for the default vtk.js TypeScript path
- `environmentProfile: "node-typescript"` for generic Node or TypeScript checks
- `environmentProfile: "python-scientific"` plus `codeLanguage: "python"` for Python scientific checks

Expected result:

- `policy.allowed` is `true`
- `sandboxRun.runtime` is `docker-adapter-dry-run`
- `manifest.environmentProfile` matches the selected environment template
- `manifest.artifacts` contains source, environment, Dockerfile, stdout, stderr, and report records
- `manifest.dockerBuildCommand` and `manifest.dockerCommand` are both present
- `evaluation.status` is `accepted`
- `taskGraphSnapshot.path` points to a local JSON snapshot
- `traceReplay.timeline` contains the ordered Phase 1 trace

If you set `executeDocker` to `true`, the tool still returns a dry-run manifest and explains that execution must happen outside plugin production code. This is intentional: it keeps the plugin installable under OpenClaw's safety scanner.

By default, Phase 3 writes run data to `.research-runs/`. You can override it with `artifactRoot`.

To execute the emitted Docker manifest locally:

```powershell
cd C:\Users\12159\learnClaw\openclaw-research-plugin
pnpm docker:sandbox -- "C:\path\to\sandbox-manifest.json"
```

Use the `manifest.manifestPath` value returned by `research_phase3_validation_loop`. See `docs/docker-sandbox-runner.md` for the reusable Docker workflow.

For agent-driven orchestration, call `phase3_local_workflow_plan` or inspect `localWorkflowPlan` from `research_phase3_validation_loop`, then execute:

```powershell
cd C:\Users\12159\learnClaw\openclaw-research-plugin
pnpm phase3:local-workflow -- --input "C:\path\to\workflow-input.json"
```

This command performs the complete local workflow:

1. generate the Phase 3 validation payload
2. write the Docker project bundle, environment files, and sandbox manifest
3. build the Docker image
4. run the Docker container
5. emit a combined workflow result with `docker-result.json`

If you want OpenClaw to follow the same sequence every time, call `phase3_agent_exec_recipe` first. It returns:

- the exact `phase3_local_workflow_plan` arguments to send
- the `exec` command to run in the plugin repository
- success checks and troubleshooting notes
- a compact `agentPrompt` you can paste into a fresh OpenClaw session

For a Python-oriented validation path:

```json
{
  "goal": "Validate a Python scientific analysis script in Docker",
  "title": "Python Scientific Sandbox Validation",
  "abstract": "The workflow should materialize Python dependencies, build a container, and record reproducible logs.",
  "codeLanguage": "python",
  "environmentProfile": "python-scientific",
  "code": "import numpy as np\nprint(np.arange(3).tolist())"
}
```

## Phase 4 Test Flow

The fastest one-shot OpenClaw test is `research_phase4_visualization_loop`:

```json
{
  "goal": "Visualize the research workflow state for review surfaces",
  "title": "Task Graphs for Human-in-the-loop Agent Workflows",
  "abstract": "Task graphs and trace timelines help users inspect agent decisions, approve risky actions, and replay workflow state."
}
```

Expected result:

- `progressUpdates` contains phase-aligned structured progress records
- `taskGraphSummary` reports completion metrics and next recommended node
- `canvasBridge.cards` contains summary, progress, artifact, and decision cards
- `taskFlowBridge.nodes` and `taskFlowBridge.edges` mirror the task graph
- `vtkSceneExport` defines the scene artifact contract for replay or validation

## Phase 5 Test Flow

For the dedicated vtk.js single-entry path, call `research_vtkjs_loop`:

```json
{
  "goal": "Validate a vtk.js scene with browser evidence",
  "title": "vtk.js Single Entry Loop",
  "abstract": "Use one specialized vtk.js tool to plan the stable execution route and keep repair plus review payloads attached to the same task.",
  "script": "const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance(); const renderer = fullScreenRenderer.getRenderer(); const renderWindow = fullScreenRenderer.getRenderWindow(); const source = vtk.Filters.Sources.vtkSphereSource.newInstance(); const mapper = vtk.Rendering.Core.vtkMapper.newInstance(); mapper.setInputConnection(source.getOutputPort()); const actor = vtk.Rendering.Core.vtkActor.newInstance(); actor.setMapper(mapper); renderer.addActor(actor); renderer.resetCamera(); renderWindow.render();"
}
```

Expected result:

- `selection.templateId` resolves to `vtkjs_scene_validation`
- `vtkjsContext.contextPack` contains vtk.js-specific retrieval snippets by default
- `vtkjsContext.recommendedPatterns` highlights reusable scene or repair patterns
- `generationBrief` contains generator-friendly prompt text, a starter script, and acceptance checks
- `generatedCandidate` contains a browser-ready starter script and HTML when the request did not already provide code
- `phase5AgentRecipe.preferredToolCall.toolName` resolves to `research_phase5_execution_loop`
- `recommendedCommand` resolves to `pnpm phase5:local-workflow -- --input ...`
- `nextActions` explains whether to stop after the first run or hand off to repair
- if you also pass repair evidence paths, the same response can include `phase5Repair`, `repairWorkflowPlan`, and `phase5Visualization`

If you want to test the new specialized knowledge layer directly, call `vtkjs_retrieve_context`:

```json
{
  "query": "vtk.js volume rendering browser validation with repair hints",
  "limit": 6,
  "topK": 5
}
```

Expected result:

- `storePath` points to the dedicated vtk.js store under `.research-data/vtkjs-rag-store.json`
- `queryResult.matches` returns vtk.js-specific ranked chunks
- `contextPack.citations` and `contextPack.snippets` are ready for a later generator
- `recommendedPatterns` and `failureFixPairs` summarize reusable implementation guidance

To turn that retrieval output into a generator-facing brief, call `vtkjs_generation_brief`:

```json
{
  "goal": "Generate a vtk.js volume rendering scene that stays compatible with browser verification",
  "title": "vtk.js Generation Brief",
  "abstract": "The brief should turn retrieval context into actionable generation guidance."
}
```

Expected result:

- `generationPrompt` compresses the retrieval-backed guidance into one generator-facing instruction
- `starterScript` provides a scene-kind-specific bootstrap
- `acceptanceChecks` mirrors the browser-validation contract that later code should satisfy

To turn that brief into runnable starter code, call `vtkjs_code_generate`:

```json
{
  "goal": "Generate a vtk.js streamline scene that can be routed into browser verification",
  "title": "vtk.js Starter Code",
  "abstract": "The code generator should turn the brief into a browser-ready starter candidate."
}
```

Expected result:

- `generatedCode.files` contains TypeScript starter source
- `script` is ready for `vtkjs_render_verify`
- `html` points to `/node_modules/vtk.js/vtk.js` and a generated module entry

To measure the current generator against the primary benchmark taxonomy, call `vtkjs_eval_runner`:

```json
{
  "caseIds": ["slice", "volume", "streamline", "mag_iso"]
}
```

Expected result:

- `cases` includes one result for each requested benchmark case
- `averageScore` summarizes the current scaffold generator readiness
- each case includes `checks`, `score`, `status`, and a browser-ready `generation` payload

For real execution-backed benchmark validation, run the local eval runner:

```powershell
cd C:\Users\12159\learnClaw\openclaw-research-plugin
pnpm vtkjs:eval-runner -- --cases slice,volume,streamline,mag_iso
```

Expected result:

- each benchmark case executes through `phase5:local-workflow`
- the final JSON includes Docker exit status, render verdict, console error count, and page error count
- `vtkjs-eval-runner-result.json` is written to the plugin repository root

For the most stable OpenClaw orchestration path, call `phase5_agent_exec_recipe` first:

```json
{
  "goal": "Validate a vtk.js scene with browser evidence",
  "title": "Phase 5 Stable Agent Recipe",
  "abstract": "Always route through the canonical Phase 5 execution tool before exec so the Docker workflow stays consistent.",
  "script": "const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance(); const renderer = fullScreenRenderer.getRenderer(); const renderWindow = fullScreenRenderer.getRenderWindow(); const source = vtk.Filters.Sources.vtkSphereSource.newInstance(); const mapper = vtk.Rendering.Core.vtkMapper.newInstance(); mapper.setInputConnection(source.getOutputPort()); const actor = vtk.Rendering.Core.vtkActor.newInstance(); actor.setMapper(mapper); renderer.addActor(actor); renderer.resetCamera(); renderWindow.render();"
}
```

Expected result:

- `preferredToolCall.toolName` resolves to `research_phase5_execution_loop`
- `expectedExec.command` resolves to `pnpm phase5:local-workflow -- --input ...`
- `repairToolCall.toolName` resolves to `phase5_repair_workflow_plan` for vtk.js routes
- `agentPrompt` tells OpenClaw to reuse the same chain instead of improvising

Call `vtkjs_template_select` with a real task description:

```json
{
  "goal": "Validate a vtk.js scene generation workflow for a sphere rendering task",
  "title": "Reliable vtk.js Scene Validation",
  "abstract": "The agent should choose the right template, keep the node-vtk environment, and prepare a reproducible execution chain for later Docker and Playwright-based checks."
}
```

Expected result:

- `selection.templateId` resolves to `vtkjs_scene_validation`
- `selection.environmentProfile` resolves to `node-vtk`
- `selection.requestedRuntime` defaults to `docker`
- `agentExecRecipe.preferredToolCall.toolName` stays `phase3_local_workflow_plan`
- `agentExecRecipe.expectedExec.command` provides the exact shell command for the local workflow

For browser-based vtk.js verification, call `vtkjs_render_verify`:

```json
{
  "goal": "Verify that a vtk.js browser scene produces a canvas and no page errors",
  "script": "const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance({ background: [0.1, 0.12, 0.18] });\nconst renderer = fullScreenRenderer.getRenderer();\nconst renderWindow = fullScreenRenderer.getRenderWindow();\nconst source = vtk.Filters.Sources.vtkConeSource.newInstance({ height: 1.0, radius: 0.4, resolution: 48 });\nconst mapper = vtk.Rendering.Core.vtkMapper.newInstance();\nmapper.setInputConnection(source.getOutputPort());\nconst actor = vtk.Rendering.Core.vtkActor.newInstance();\nactor.setMapper(mapper);\nrenderer.addActor(actor);\nrenderer.resetCamera();\nrenderWindow.render();"
}
```

Expected result:

- `sandboxRun.runtime` is `docker-adapter-dry-run`
- `manifest.command` runs `node generated/render-verify.mjs`
- `expectedArtifacts` includes the render report, browser console log, page error log, and screenshot
- running `pnpm docker:sandbox -- <manifestPath>` produces browser evidence under `workspace/artifacts/`

For a one-shot Phase 5 route selection, call `research_phase5_execution_loop`:

```json
{
  "goal": "Validate a vtk.js scene with browser evidence",
  "title": "Phase 5 Routed Validation",
  "abstract": "The agent should route a vtk.js request to browser verification and also return a single local workflow command.",
  "script": "const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance(); const renderer = fullScreenRenderer.getRenderer(); const renderWindow = fullScreenRenderer.getRenderWindow(); const source = vtk.Filters.Sources.vtkSphereSource.newInstance(); const mapper = vtk.Rendering.Core.vtkMapper.newInstance(); mapper.setInputConnection(source.getOutputPort()); const actor = vtk.Rendering.Core.vtkActor.newInstance(); actor.setMapper(mapper); renderer.addActor(actor); renderer.resetCamera(); renderWindow.render();"
}
```

Expected result:

- `routeKind` resolves to `vtkjs_render_verify` for vtk.js scene tasks
- `localWorkflowPlan.shellCommand` points to `pnpm phase5:local-workflow -- --input ...`
- `renderVerify.manifest.manifestPath` is ready for the Docker runner

To execute the fully routed Phase 5 workflow locally:

```powershell
cd C:\Users\12159\learnClaw\openclaw-research-plugin
pnpm phase5:local-workflow -- --input "C:\path\to\phase5-workflow-input.json"
```

For a repaired vtk.js retry after browser failure evidence, call `research_phase5_repair_loop`:

```json
{
  "goal": "Retry a vtk.js scene after browser validation failed",
  "title": "Phase 5 Repair Retry",
  "abstract": "The system should classify the failure, generate a conservative repair, and return the next Phase 5 retry command.",
  "script": "const mapper = vtk.Rendering.Core.vtkMapper.newInstance();",
  "renderReportPath": "C:\\path\\to\\workspace\\artifacts\\render-verification.json",
  "pageErrorsPath": "C:\\path\\to\\workspace\\artifacts\\page-errors.json",
  "maxRounds": 3
}
```

Expected result:

- `repair.category` identifies a browser-facing vtk.js failure pattern
- `rounds` contains one or more planned retry rounds up to `maxRounds`
- `repair.repairedHtml` or `repair.repairedScript` contains a safer retry input
- `retryLocalWorkflowPlan.shellCommand` points to `pnpm phase5:local-workflow -- --input ...`
- `retryRenderVerify` contains a fresh manifest ready for the Docker runner

If you already have a later retry artifact set, you can also pass:

- `comparisonRenderReportPath`
- `comparisonBrowserConsolePath`
- `comparisonPageErrorsPath`

Then `artifactComparison` will summarize whether the later run improved on verdict, canvas visibility, console errors, or page errors.

To execute the repair workflow itself across multiple rounds:

```powershell
cd C:\Users\12159\learnClaw\openclaw-research-plugin
pnpm phase5:repair-workflow -- --input "C:\path\to\phase5-repair-workflow-input.json"
```

Expected result:

- each executed round re-runs the Docker manifest and re-reads `workspace/artifacts/`
- `phase5-repair-workflow-result.json` records round history, evidence summaries, and artifact comparisons
- the workflow stops early when a retry is accepted or when the latest retry no longer improves the evidence

For a review-friendly Phase 5 bridge payload, call `research_phase5_visualization_loop`:

```json
{
  "goal": "Review vtk.js repair rounds and artifact deltas",
  "script": "const mapper = vtk.Rendering.Core.vtkMapper.newInstance();",
  "renderReportPath": "C:\\path\\to\\baseline\\render-verification.json",
  "pageErrorsPath": "C:\\path\\to\\baseline\\page-errors.json",
  "comparisonRenderReportPath": "C:\\path\\to\\candidate\\render-verification.json",
  "comparisonPageErrorsPath": "C:\\path\\to\\candidate\\page-errors.json",
  "maxRounds": 3
}
```

Expected result:

- `progressUpdates` explains where the Phase 5 repair flow stands
- `canvasBridge.cards` summarizes the latest repair category, retry hints, and artifact delta
- `taskFlowBridge.nodes` shows each planned repair round as a reviewable step
- `artifactComparison` highlights whether the later artifact set actually improved

## Repository Guardrails

- Keep production plugin code independent from OpenClaw core `src/**`.
- Prefer plugin tools and typed contracts before core patches.
- Use sub-agent or sandbox runtimes for strong validation paths instead of ACP host execution.
- Reuse OpenClaw Dashboard, Canvas, and Task Flow before building a custom frontend.
