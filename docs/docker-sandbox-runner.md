# Docker Sandbox Runner

Phase 3 uses a two-step Docker workflow.

The OpenClaw plugin emits a reproducible `sandbox-manifest.json`. A separate local runner executes that manifest with Docker. This keeps plugin production code safe and installable while still allowing real local Docker execution.

## Standard Flow

1. In OpenClaw, call `research_phase3_validation_loop` or `docker_sandbox_run`.
2. Copy the returned `manifest.manifestPath`.
3. In this repository, run the manifest with the local Docker runner.
4. Inspect `docker-result.json`, `stdout.log`, `stderr.log`, and `workspace/artifacts/`.

## One-Shot OpenClaw Input

```json
{
  "goal": "Validate generated vtk.js scene code in a reproducible sandbox path",
  "title": "Sandboxed Evaluation of Generated Research Code",
  "abstract": "Safe execution requires isolated runtimes, captured stdout and stderr, artifact collection, and structured evaluator records.",
  "executeDocker": false,
  "requestedRuntime": "docker"
}
```

The returned manifest includes:

- `manifestPath`: absolute path to the manifest file
- `runnerCommand`: reusable command shape for this repo
- `environmentProfile`: selected environment template such as `node-vtk` or `python-scientific`
- `dockerBuildCommand`: image build command
- `dockerCommand`: the Docker command represented as an argument array
- `workingDirectory`: generated sandbox workspace mounted into Docker
- `artifacts`: source, log, and report artifact records

The plugin prepares environment-aware files inside the workspace. For the default Node path these include:

- `package.json`
- `.dockerignore`
- `Dockerfile`
- `generated/run-check.mjs`
- generated source files under `src/generated/`

For `python-scientific`, the workspace includes:

- `requirements.txt`
- `.dockerignore`
- `Dockerfile`
- `generated/run-check.py`
- generated source files under `src/generated/`

## Execute Locally

```powershell
cd C:\Users\12159\learnClaw\openclaw-research-plugin
pnpm docker:sandbox -- "C:\path\to\sandbox-manifest.json"
```

## Agent-Orchestrated One-Command Workflow

When an OpenClaw agent should orchestrate the whole Phase 3 path, use the workflow runner instead of manually doing manifest generation and Docker execution in separate steps.

First call `phase3_local_workflow_plan` or `research_phase3_validation_loop`, then execute the returned workflow input path:

```powershell
cd C:\Users\12159\learnClaw\openclaw-research-plugin
pnpm phase3:local-workflow -- --input "C:\path\to\workflow-input.json"
```

This command will:

1. run the Phase 3 validation service
2. create `sandbox-manifest.json` and environment-specific support files such as `package.json` or `requirements.txt`
3. build the local Docker image
4. execute the local Docker container
5. return a combined JSON result containing validation output and Docker execution result

The runner writes:

- `stdout.log`
- `stderr.log`
- `docker-result.json`
- `workspace/artifacts/vtk-scene-summary.json`

## Verification Criteria

The Docker run is healthy when `docker-result.json` contains:

```json
{
  "status": "passed",
  "exitCode": 0
}
```

The expected report artifact is:

```text
workspace/artifacts/vtk-scene-summary.json
```

## Why Docker Runs Outside The Plugin

OpenClaw blocks shell execution patterns inside plugin production code. That is desirable for safety. The plugin therefore creates a manifest and the repository runner performs the host Docker call explicitly from your terminal or an approved sandbox/sub-agent path.
