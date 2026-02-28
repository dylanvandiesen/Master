# Command Surface and Runbooks

## Core Build Commands

- `cmd /c npm run scaffold`
- `cmd /c npm run list:projects`
- `cmd /c npm run build -- --project=<slug>`
- `cmd /c npm run build:all`
- `cmd /c npm run dev -- --project=<slug>`
- `cmd /c npm run dev:all`
- `cmd /c npm run clean`

## Session Bootstrap Commands

- `cmd /c npm run chat:new`
- `cmd /c npm run chat:new:quick -- --project=<slug>`
- `cmd /c npm run chat:new:full`
- `cmd /c npm run mcp:prep`
- `cmd /c npm run chat:briefing:project`
- `cmd /c npm run chat:briefing:commander`
- `cmd /c npm run chat:briefing:system`
- `cmd /c npm run chat:briefing`
- `cmd /c npm run super:context`
- `cmd /c npm run super:bootstrap -- --project=<slug>`
- `cmd /c npm run super:bootstrap:full -- --project=<slug>`

## MCP Commands

- `cmd /c npm run mcp:start:filesystem`
- `cmd /c npm run mcp:start:memory`
- `cmd /c npm run mcp:start:browser:eyes`
- `cmd /c npm run mcp:start:github:legacy`
- `cmd /c npm run mcp:start:github:modern:docker`

## Skill Commands

- `cmd /c npm run skills:list`
- `cmd /c npm run skills:validate`

## Minimal Runbooks

### Fast system preflight

1. `cmd /c npm run super:bootstrap -- --project=<slug>`
2. Validate `.agency/chat/latest-super-context.json`

### Full system rebuild check

1. `cmd /c npm run scaffold`
2. `cmd /c npm run build:all`
3. `cmd /c npm run list:projects`
4. `cmd /c npm run super:context`

### Single project runtime check (without reading project source)

1. `cmd /c npm run dev -- --project=<slug>`
2. Inspect `.agency/dev-servers/project-<slug>.json`

## Selection Rules

- Prefer `cmd /c npm run ...` in PowerShell environments.
- Prefer shortest command sequence that proves the requested system behavior.
