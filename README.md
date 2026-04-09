# OpenClaw Research Plugin

这是一个独立于 `openclaw` 主仓库的本地插件仓库，用来承载你的“科研助手 / 科研工作流”二次开发。

当前阶段它已经进入 Phase 1 最小闭环骨架：

1. 保持 OpenClaw 插件工程边界，避免一开始深改 core。
2. 提供从 paper ingest 到 report build 的最小闭环 contract 和工具注册面。
3. 为后续接入真实 RAG、Docker sandbox、vtk.js 验证和可视化预留稳定接口。

## 为什么先做成独立插件仓库

- OpenClaw 官方已经把 Plugin SDK 定义成插件与 core 之间的 typed contract。
- OpenClaw 仓库内部规则明确要求插件生产代码不要直接 import core 的 `src/**`。
- 你的目标更像“外挂式科研执行系统”，并不需要第一阶段就改写 OpenClaw 自身的调度内核。

## 当前仓库结构

```text
openclaw-research-plugin/
├─ docs/
│  └─ roadmap.md
├─ src/
│  ├─ hooks/
│  ├─ services/
│  │  └─ plugin-architecture.ts
│  ├─ tools/
│  │  └─ research-status-tool.ts
│  └─ plugin-goals.ts
├─ index.ts
├─ openclaw.plugin.json
├─ package.json
└─ tsconfig.json
```

## 当前已实现内容

- 统一的数据 contract：`TaskGraph`、`ThinkActionTrace`、`SandboxRunResult`、`EvalRecord`、`GeneratedCode`
- 6 个 Phase 1 核心工具骨架：`paper_ingest`、`task_orchestrator`、`code_generator`、`sandbox_run`、`validator`、`trace_recorder`
- 2 个补充工具：`report_build`、`vtkjs_validate`
- 1 个闭环入口工具：`research_phase1_loop`
- 1 个状态说明工具：`research_plugin_status`
- 一份和你课题目标对齐的工程路线图：`docs/roadmap.md`
- 一套插件配置占位：RAG 路径、任务图存储、沙箱 profile、vtk 输出目录

## Phase 1 的边界

当前版本的 Phase 1 是“最小闭环骨架可运行”，不是“完整科研平台”。

已经具备：

- 统一 schema
- 闭环步骤拆分
- 工具注册面
- 模拟 sandbox 与基础 validator
- trace 和 report 输出

还未接入：

- 真实 Arxiv / Scholar 检索
- 真实向量数据库或 rerank
- 真实 Docker / cloud sandbox
- 真实 vtk.js 场景渲染验证
- Dashboard / Canvas / Task Flow 可视化输出

## 本地开发建议

### 方案 A：直接按发布插件方式开发

```bash
cd C:/Users/12159/learnClaw/openclaw-research-plugin
pnpm install
pnpm check
```

然后把这个插件目录作为本地路径装进 OpenClaw：

```bash
cd C:/Users/12159/learnClaw/openclaw
pnpm openclaw plugins install ../openclaw-research-plugin
```

### 方案 B：在本地联动 OpenClaw 源码做联调

如果你希望边改插件边参考本地 `openclaw` 源码，可以保留当前目录结构：

```text
learnClaw/
├─ openclaw/
└─ openclaw-research-plugin/
```

这样你能一边看官方实现，一边保持插件仓库独立。

## 下一步最值得做的事情

1. 把 simulated sandbox 替换成 Docker adapter。
2. 给 `paper_search` 和真正的 `rag_query` 建独立模块。
3. 用插件 hook 或 tool 形式接入任务图和 trace 落盘。
4. 把 vtk.js 验证从占位检查升级为真实场景验证。

## 当前假设

- 第一阶段以“外部原生 OpenClaw 插件”作为主形态。
- ACP 不作为强沙箱验证主链。
- 前端可视化先复用 OpenClaw 现有 Dashboard、Canvas、Task Flow。
