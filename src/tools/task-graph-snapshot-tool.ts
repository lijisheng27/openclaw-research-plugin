import { Type } from "@sinclair/typebox";
import type { TaskGraph } from "../contracts/research-contracts.js";
import { captureTaskGraphSnapshot } from "../services/research-validation.js";
import { createJsonToolResult } from "./tool-result.js";

export function createTaskGraphSnapshotTool() {
  return {
    name: "task_graph_snapshot",
    label: "Task Graph Snapshot",
    description: "Persist a task graph snapshot for replay and reproducible validation records.",
    parameters: Type.Object({
      taskGraph: Type.Any(),
      storeRoot: Type.Optional(Type.String()),
    }),
    async execute(_invocationId: string, params: { taskGraph: TaskGraph; storeRoot?: string }) {
      return createJsonToolResult(captureTaskGraphSnapshot(params));
    },
  };
}
