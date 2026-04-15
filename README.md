# OpenClaw Research Plugin

This is an external OpenClaw plugin for building a research assistant workflow. The repository keeps research-specific logic outside the OpenClaw core while still using OpenClaw as the gateway, agent runtime, tool host, and control plane.

## Current Stage

The plugin is now at Phase 4 visualization bridge.

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

Not yet included:

- real Arxiv, Crossref, Scholar, or publisher search adapters
- vector database or embedding rerank
- cloud sandbox API execution
- real vtk.js rendering validation
- real Dashboard, Canvas, or Task Flow surface integration

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

## Repository Guardrails

- Keep production plugin code independent from OpenClaw core `src/**`.
- Prefer plugin tools and typed contracts before core patches.
- Use sub-agent or sandbox runtimes for strong validation paths instead of ACP host execution.
- Reuse OpenClaw Dashboard, Canvas, and Task Flow before building a custom frontend.
