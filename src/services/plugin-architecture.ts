import type { ResearchModuleId } from "../contracts/research-contracts.js";
import { ENGINEERING_DECISIONS, RESEARCH_PLUGIN_PHASES } from "../plugin-goals.js";

export function buildResearchPluginSummary() {
  return {
    pluginId: "research-plugin",
    strategy: "plugin-first",
    currentStage: "phase-4-visualization-bridge",
    decisions: [...ENGINEERING_DECISIONS],
    registeredModules: [
      "paper_search",
      "knowledge_ingest",
      "rag_query",
      "context_pack_build",
      "knowledge_store_status",
      "sandbox_policy_decide",
      "docker_sandbox_run",
      "cloud_sandbox_plan",
      "phase3_local_workflow_plan",
      "artifact_capture",
      "task_graph_snapshot",
      "trace_replay",
      "structured_progress_updates",
      "task_graph_summary",
      "canvas_bridge",
      "task_flow_bridge",
      "vtk_scene_export",
      "paper_ingest",
      "task_orchestrator",
      "code_generator",
      "sandbox_run",
      "validator",
      "trace_recorder",
      "report_build",
      "vtkjs_validate",
    ] satisfies ResearchModuleId[],
    phases: RESEARCH_PLUGIN_PHASES.map((phase) => ({
      id: phase.id,
      title: phase.title,
    })),
    nextMilestones: [
      "Replace local paper fixtures with Arxiv, Crossref, or Scholar adapters",
      "Swap keyword retrieval for vector search plus rerank",
      "Execute Docker adapter against full project dependencies instead of contract dry-runs",
      "Wire Phase 4 payloads into real Dashboard, Canvas, and Task Flow surfaces",
    ],
  };
}
