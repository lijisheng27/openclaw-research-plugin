# Phase 3 Agent Orchestration

Use this flow when you want OpenClaw to drive the full local Docker workflow instead of manually calling tools and shell commands in separate steps.

## Standard Tool Chain

1. Call `phase3_agent_exec_recipe`.
2. Read `preferredToolCall`.
3. Call `phase3_local_workflow_plan` with the returned arguments.
4. Read `shellCommand` from the workflow plan.
5. Use OpenClaw core `exec` in `C:\Users\12159\learnClaw\openclaw-research-plugin`.
6. Summarize `docker-result.json`, `manifestPath`, `stdout.log`, `stderr.log`, and `workspace/artifacts/vtk-scene-summary.json`.

## Example Recipe Request

```json
{
  "goal": "Validate generated vtk.js scene code in a reproducible sandbox path",
  "title": "Sandboxed Evaluation of Generated Research Code",
  "abstract": "Safe execution requires isolated runtimes, captured stdout and stderr, artifact collection, and structured evaluator records.",
  "environmentProfile": "node-vtk",
  "requestedRuntime": "docker"
}
```

## Example OpenClaw Session Prompt

```text
Use phase3_agent_exec_recipe first. Then call phase3_local_workflow_plan with the returned arguments. After that, run the returned shellCommand with exec in C:\Users\12159\learnClaw\openclaw-research-plugin. Finally summarize manifest path, docker-result status, exit code, and artifact paths.
```

## Success Criteria

- `phase3_local_workflow_plan` returns `inputPath` and `shellCommand`.
- `exec` exits with code `0`.
- `docker-result.json` reports `status: passed`.
- The run directory contains `stdout.log`, `stderr.log`, and `workspace/artifacts/vtk-scene-summary.json`.

## Notes

- `node-vtk` is the default environment for vtk.js and TypeScript validation.
- `python-scientific` is the reusable environment for NumPy or Matplotlib style checks.
- If a tool is missing in OpenClaw, restart the gateway and open a fresh session so the allowlist refreshes.
