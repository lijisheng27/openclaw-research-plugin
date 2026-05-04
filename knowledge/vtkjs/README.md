# vtk.js Corpus Bootstrap

This directory is the first corpus-oriented landing zone for the Phase 5 vtk.js workflow.
It keeps prompt tasks, prompt-sample-pro tasks, benchmark seeds, and rebuilding instructions in a layout that can later evolve toward a larger webSiv-style corpus.

## Layout

- `prompt-sample/`: starter tasks with prompt, retrieval context, code generation output, and workflow input.
- `prompt-sample-pro/`: richer tasks intended for repair-aware or benchmark-aware corpus growth.
- `benchmark/`: canonical benchmark seeds aligned with the current execution-backed eval taxonomy.
- `scripts/`: instructions for rebuilding the corpus and replaying Docker validation on stored workflow inputs.

## Current Counts

- prompt-sample: 4
- prompt-sample-pro: 4
- benchmark: 4

## Rebuild

```powershell
cd C:\Users\12159\learnClaw\openclaw-research-plugin
pnpm vtkjs:corpus-build
```

## Validate One Entry

```powershell
cd C:\Users\12159\learnClaw\openclaw-research-plugin
pnpm phase5:local-workflow -- --input C:\path\to\knowledge\vtkjs\prompt-sample\rendering-sphere-baseline\phase5-workflow-input.json
```
