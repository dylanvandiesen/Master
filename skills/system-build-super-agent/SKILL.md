---
name: system-build-super-agent
description: System-level orchestration for the Playground root build architecture, dynamic project pipeline, npm command surface, chat bootstrap flow, and MCP/skills operations. Use when tasks target build system behavior, config, scaffolding, manifests, command workflows, or repo-wide operational strategy. Do not use for project source implementation under `projects/*/src` or commander panel internals under `remote-console/*` unless the user explicitly confirms boundary crossing and provides focused context.
---

# System Build Super Agent

## Objective

Operate the repository as a system, not as an individual project implementation context.

Optimize for speed and reliability while preserving strict boundaries around excluded domains.

## Hard Boundaries

- Excluded by default: `projects/*/src/**` (project file implementation context).
- Excluded by default: `remote-console/**` and `.agency/remote/**` (commander internals).
- Allowed by default: root orchestration files, scripts, docs, configs, manifests, and build outputs.
- If the task touches excluded paths, ask:
  `This task touches excluded context (<projects source|commander internals>). Please confirm scope and target files so I can proceed safely.`

## System Workflow

1. Preflight:
   - `cmd /c npm run super:bootstrap -- --project=<slug>`
   - fallback manual path:
     - `cmd /c npm run chat:new:quick -- --project=<slug>`
     - `cmd /c npm run mcp:prep`
     - `cmd /c npm run chat:briefing:system`
2. Confirm command surface and config:
   - `cmd /c npm run list:projects`
   - `Get-Content agency.config.json`
3. Execute minimal command loop for the request:
   - scaffold -> build/list/dev as needed
4. Persist context artifacts:
   - `.agency/chat/latest-system-briefing.md`
   - `.agency/chat/mcp-status.json`
   - `.agency/chat/latest-super-context.json`
5. Ask for boundary context before touching project-source or commander internals.

## Core Capabilities

1. Build architecture control:
   - Understand root-driven scaffolding, build, watch, and dist contracts.
2. Dynamic project pipeline operations:
   - Control project discovery and per-project output generation.
3. Command-level optimization:
   - Select shortest reliable npm command sequence for requested outcomes.
4. MCP + skills routing:
   - Use filesystem/memory/GitHub routes intentionally and fast.
5. Boundary-safe execution:
   - Keep system context rich while requesting extra context only when crossing excluded domains.

## Read Resources As Needed

- `references/build-system-topology.md`:
  Load for architecture, pipeline stages, and config interaction.
- `references/command-surface-and-runbooks.md`:
  Load for command selection and deterministic run sequences.
- `references/mcp-skills-acceleration.md`:
  Load for MCP route selection and skill orchestration rules.
- `references/boundary-crossing-protocol.md`:
  Load whenever a request may touch excluded domains.

## Script Entry Point

- `scripts/generate-system-briefing.ps1`:
  Generate/update the system-only briefing file for current runtime context.
- `scripts/chat/export-super-agent-context.ps1`:
  Generate JSON + markdown context bundle for command surface, MCP state, skills, boundaries, and artifacts.
- `scripts/chat/super-agent-bootstrap.ps1`:
  One-command quick/full bootstrap that refreshes MCP status, briefings, and super-context outputs.
