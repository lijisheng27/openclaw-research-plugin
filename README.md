# OpenClaw Research Plugin

This is an external OpenClaw plugin for building a research assistant workflow. The repository keeps research-specific logic outside the OpenClaw core while still using OpenClaw as the gateway, agent runtime, tool host, and control plane.

## Current Stage

The plugin is now at Phase 2 local knowledge layer.

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

## Important Boundary

Phase 2 is intentionally a local, deterministic implementation. It proves the plugin contracts and data flow before connecting external services.

Already available:

- typed contracts for `TaskGraph`, `ThinkActionTrace`, `SandboxRunResult`, `EvalRecord`, `RAGStoreSnapshot`, `RAGQueryResult`, and `ContextPack`
- local paper search fixture
- persisted JSON knowledge store
- keyword-based retrieval
- context-pack output for later planner and code-generation grounding

Not yet included:

- real Arxiv, Crossref, Scholar, or publisher search adapters
- vector database or embedding rerank
- real Docker or cloud sandbox execution
- real vtk.js rendering validation
- Dashboard, Canvas, or Task Flow visualization integration

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

## Repository Guardrails

- Keep production plugin code independent from OpenClaw core `src/**`.
- Prefer plugin tools and typed contracts before core patches.
- Use sub-agent or sandbox runtimes for strong validation paths instead of ACP host execution.
- Reuse OpenClaw Dashboard, Canvas, and Task Flow before building a custom frontend.
