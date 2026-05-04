# OpenClaw Research Plugin

Phase 5 vtk.js research workflow plugin for OpenClaw.

This repository is now scoped to the vtk.js reliability loop:

- structure-aware vtk.js context retrieval
- deterministic candidate generation
- Docker + Playwright render verification
- evidence-driven repair planning
- corpus build/update/promotion
- benchmark evaluation for `slice`, `volume`, `streamline`, and `mag_iso`
- structured governance gates for parallel sub-agent fan-out/fan-in

## Primary Tool

Use `research_vtkjs_loop` as the single entrypoint. It returns:

- `selection`: Phase 5 vtk.js route selection
- `governance`: intent, spawn, context, candidate, verification, repair, and promotion gates
- `vtkjsContext`: retrieved patterns and failure-fix hints
- `generationBrief`: acceptance contract and starter script
- `generatedCandidate`: browser-ready HTML and script
- `phase5Execution`: local workflow and render verification plan
- `phase5AgentRecipe`: deterministic OpenClaw execution recipe
- optional repair, visualization, and corpus payloads

## Local Commands

```powershell
pnpm check
pnpm phase5:local-workflow -- --input C:\path\to\phase5-workflow-input.json
pnpm phase5:repair-workflow -- --input C:\path\to\repair-workflow-input.json
pnpm vtkjs:corpus-build
pnpm vtkjs:corpus-update -- --entryDirectory C:\path\to\knowledge\vtkjs\prompt-sample\rendering-sphere-baseline
pnpm vtkjs:eval-runner -- --cases slice,volume,streamline,mag_iso
```

## Source Layout

```text
src/
  contracts/                  Shared JSON contracts
  services/
    research-vtkjs-loop.ts     Single vtk.js loop entrypoint
    vtkjs-governance.ts        Sub-agent gate and fan-in design
    vtkjs-phase5.ts            Phase 5 workflow planning
    vtkjs-render-verify.ts     Docker + Playwright verification bundle
    vtkjs-repair.ts            Evidence classification and repair planning
    vtkjs-corpus.ts            Corpus build/update/promotion
    vtkjs-eval.ts              Benchmark evaluation
    vtkjs-knowledge.ts         vtk.js local knowledge retrieval
    vtkjs-generator.ts         Generation brief construction
    vtkjs-codegen.ts           Deterministic browser candidate generation
  tools/                       OpenClaw tool wrappers
knowledge/vtkjs/               Corpus seed and benchmark data
scripts/                       Local workflow runners
```

Generated run outputs are intentionally ignored. Stable assets should be promoted into `knowledge/vtkjs/`.
