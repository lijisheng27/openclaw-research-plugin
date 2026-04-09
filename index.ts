import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createResearchStatusTool } from "./src/tools/research-status-tool.js";

export default definePluginEntry({
  id: "research-plugin",
  name: "Research Plugin",
  description: "Plugin-first scientific workflow extension for OpenClaw",
  register(api) {
    api.registerTool(createResearchStatusTool());
  },
});

