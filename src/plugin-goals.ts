export const RESEARCH_PLUGIN_PHASES = [
  {
    id: "phase-0",
    title: "Bootstrap plugin repo",
    focus: "Keep changes outside OpenClaw core and establish a stable plugin contract.",
  },
  {
    id: "phase-1",
    title: "Orchestrator loop",
    focus: "Implement planner -> executor -> verifier -> judge as plugin-owned services.",
  },
  {
    id: "phase-2",
    title: "Knowledge layer and context engine",
    focus: "Add local paper search, persisted RAG store, retrieval, and context-pack generation.",
  },
  {
    id: "phase-3",
    title: "Sandboxed validation",
    focus: "Add sandbox policy, Docker dry-run/execute adapter, cloud handoff plan, artifact capture, snapshots, and trace replay.",
  },
  {
    id: "phase-4",
    title: "Visualization bridge",
    focus: "Emit structured progress, task graph summaries, Canvas and Task Flow bridge payloads, and vtk.js scene export contracts.",
  },
  {
    id: "phase-5",
    title: "Template-driven real task routing",
    focus:
      "Add task templates, automatic environment selection, stable execution-chain routing, and a dedicated vtk.js single-entry loop for specialized workflows.",
  },
] as const;

export const ENGINEERING_DECISIONS = [
  "Prefer plugin seams over OpenClaw core patches.",
  "Use sub-agent or sandbox-native execution for strong validation instead of ACP as the main path.",
  "Reuse existing OpenClaw control surfaces before building new frontend infrastructure.",
] as const;
