# humen-mcp-webui

<div align="center">
  <img src="src/assets/logo.svg" width="96" height="96" alt="humen-mcp-webui logo" />

  <h3>Human task workbench for <code>humen-mcp</code>.</h3>

  <p>
    A compact React + Vite UI for reviewing tasks, answering requests, and handling human-in-the-loop work.
  </p>

  <p>
    <a href="#quick-start">Quick Start</a>
    · <a href="#features">Features</a>
    · <a href="#development">Development</a>
    · <a href="#中文速览">简体中文</a>
  </p>
</div>

<p align="center">
  <a href="package.json"><img alt="React 19" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=111111" /></a>
  <a href="package.json"><img alt="Vite" src="https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white" /></a>
  <a href="package.json"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white" /></a>
  <a href="package.json"><img alt="Bun" src="https://img.shields.io/badge/Bun-ready-000000?logo=bun&logoColor=white" /></a>
</p>

`humen-mcp-webui` is the browser-facing task panel for `humen-mcp`. It shows pending requests, lets a logged-in human respond, and keeps the flow small enough to fit the same mental model as the MCP tool call that created it.

## Quick Start

```bash
bun install
bun run dev
```

The dev server binds to `127.0.0.1` by default.

## Features

- Task inbox and response workflow for human-in-the-loop execution.
- React 19 + TypeScript UI with Vite.
- Mantine component styling and Lucide icons.
- Works as the frontend companion to the Rust MCP backend.

## Development

```bash
bun run build
bun run preview
```

## Integration

This UI is meant to be used together with the main `humen-mcp` repository.

- Backend docs: <https://github.com/LIghtJUNction/humen-mcp>
- MCP endpoint: `/mcp`
- Web panel route: `/mcp/`

## 中文速览

`humen-mcp-webui` 是 `humen-mcp` 的浏览器任务面板，用于查看待办、接收人类回复、处理需要人工判断的步骤。

- 适合作为 MCP 工作流中的“人工接管界面”。
- 技术栈为 React 19、Vite、TypeScript、Mantine。
- 运行和打包都可以直接使用 `bun`。
