# Corpus Scripts

These commands rebuild the current corpus seed and replay stored workflow inputs through the existing Docker + Playwright path.

## Rebuild the Corpus Seed

```powershell
cd C:\Users\12159\learnClaw\openclaw-research-plugin
pnpm vtkjs:corpus-build -- --outputRoot "C:\Users\12159\learnClaw\openclaw-research-plugin\knowledge\vtkjs"
```

## Run One Stored Workflow

```powershell
cd C:\Users\12159\learnClaw\openclaw-research-plugin
pnpm phase5:local-workflow -- --input "C:\Users\12159\learnClaw\openclaw-research-plugin\knowledge\vtkjs\benchmark\slice\phase5-workflow-input.json"
```

## Run the Current Execution-Backed Eval Set

```powershell
cd C:\Users\12159\learnClaw\openclaw-research-plugin
pnpm vtkjs:eval-runner -- --cases slice,volume,streamline,mag_iso
```
