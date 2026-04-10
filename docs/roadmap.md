# Research Plugin Roadmap

## Target positioning

This repository is the external plugin home for a research-oriented OpenClaw extension. The plugin should own research workflow logic while OpenClaw remains the gateway, agent runtime, and control plane.

## Architectural stance

- Plugin first, core patches only when the SDK lacks a required seam.
- Strong validation paths should prefer sandboxed sub-agent execution.
- Visualization should reuse existing OpenClaw surfaces before introducing a new frontend.

## Phase plan

### Phase 0

Create and stabilize the external plugin repository.

Deliverables:

- native `openclaw.plugin.json`
- typed plugin entry
- initial tool and service skeleton
- local install path through `openclaw plugins install <path>`

### Phase 1

Implement the minimal research loop as plugin-owned modules.

Deliverables:

- `paper_ingest` contract
- `task_orchestrator` contract
- `code_generator` contract
- `sandbox_run` adapter
- `validator` contract
- `trace_recorder` contract
- `report_build` contract
- `vtkjs_validate` adapter
- unified `TaskGraph`, `ThinkActionTrace`, `SandboxRunResult`, and `EvalRecord` schemas

### Phase 2

Introduce the local knowledge layer and context engine.

Deliverables:

- `paper_search` local search adapter
- `knowledge_ingest` persisted JSON store
- `rag_query` keyword retrieval over stored chunks
- `context_pack_build` citation and snippet pack
- `knowledge_store_status` inspection tool
- `research_phase2_knowledge_loop` one-shot search, ingest, retrieve, and context path

Current limits:

- local fixture search instead of Arxiv, Crossref, or Scholar
- keyword scoring instead of embeddings and rerank
- JSON store instead of a vector database
- no task graph or trace replay persistence yet

### Phase 3

Add strong validation and reproducible execution.

Deliverables:

- Docker validator adapter
- cloud sandbox adapter
- execution artifact capture
- policy for sub-agent versus host execution
- task graph snapshot store
- trace persistence and replay

### Phase 4

Expose progress and validation artifacts to the UI layer.

Deliverables:

- structured progress payloads
- task graph summaries
- Canvas and Task Flow integration points
- vtk.js scene export contract

## Guardrails

- Do not import OpenClaw core `src/**` from plugin production code.
- Do not treat ACP as the main strong-sandbox path.
- Do not build a bespoke frontend until existing OpenClaw control surfaces become insufficient.
