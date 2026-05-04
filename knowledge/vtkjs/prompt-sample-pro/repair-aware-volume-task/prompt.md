# vtk.js Repair-Aware Volume Task

- Track: `prompt-sample-pro`
- Difficulty: `advanced`
- Scene kind: `volume`
- Tags: `volume`, `repair`, `artifact-delta`

## Goal

Generate a vtk.js volume scene that is easy to repair if browser validation reports missing canvas or runtime errors

## Abstract

Emphasize failure-aware structure, explicit mapper setup, and deterministic render ordering.

## Notes

The candidate should stay close to the canonical Phase 5 repair path so Docker reruns can compare artifact deltas without changing the whole scene shape.

## Stable Command

`pnpm phase5:local-workflow -- --input "C:\Users\12159\learnClaw\openclaw-research-plugin\knowledge\vtkjs\prompt-sample-pro\repair-aware-volume-task\phase5-workflow-input.json"`
