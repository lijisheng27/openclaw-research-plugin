# OpenClaw Research Plugin

这是一个独立于 `openclaw` 主仓库的本地插件仓库，用来承载你的“科研助手 / 科研工作流”二次开发。

当前阶段它做两件事：

1. 先把 OpenClaw 插件工程边界立住，避免一开始深改 core。
2. 给后续的科研能力模块预留稳定骨架，包括闭环编排、RAG、沙箱验证、任务图和可视化桥接。

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

## 已经放进去的内容

- 一个最小的原生 OpenClaw 插件入口：`index.ts`
- 一个可调用的示例工具：`research_plugin_status`
- 一份和你课题目标对齐的工程路线图：`docs/roadmap.md`
- 一套插件配置占位：RAG 路径、任务图存储、沙箱 profile、vtk 输出目录

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

1. 给“编排器 -> 执行器 -> 验证器 -> 判断器”定义一套稳定的状态机和事件模型。
2. 把 RAG 存储和执行 runtime 拆开，避免后面沙箱化时耦合过深。
3. 用插件 hook 或 tool 形式接入任务图和 trace 落盘。
4. 把 vtk.js 验证定义为输出适配层，而不是先做成核心调度逻辑。

## 当前假设

- 第一阶段以“外部原生 OpenClaw 插件”作为主形态。
- ACP 不作为强沙箱验证主链。
- 前端可视化先复用 OpenClaw 现有 Dashboard、Canvas、Task Flow。

