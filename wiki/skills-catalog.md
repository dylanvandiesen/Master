# Skills Catalog

This repository now includes a local skill pack under `skills/`.

## Skills

1. `skills/agency-playground-ops`
   - Purpose: operate scaffold/build/dev workflows for the agency setup.
   - Helpers:
     - `scripts/agency-project-cycle.ps1`
     - `references/command-map.md`
     - `references/config-keys.md`

2. `skills/mcp-orchestration-ops`
   - Purpose: configure and troubleshoot MCP servers, routes, and auth.
   - Helpers:
     - `scripts/mcp-doctor.ps1`
     - `references/server-matrix.md`
     - `references/troubleshooting.md`

3. `skills/chat-instance-bootstrap`
   - Purpose: prepare fresh chat sessions and startup context.
   - Helpers:
     - `scripts/bootstrap-session.ps1`
     - `references/startup-checklist.md`

4. `skills/system-build-super-agent`
   - Purpose: system-wide build/MCP/skills orchestration with strict boundary protocol (excludes project source + commander internals by default).
   - Helpers:
     - `scripts/generate-system-briefing.ps1`
     - `references/build-system-topology.md`
     - `references/command-surface-and-runbooks.md`
     - `references/mcp-skills-acceleration.md`
     - `references/boundary-crossing-protocol.md`

## Skill Commands

- List local skills:
  - `cmd /c npm run skills:list`
- Validate local skills:
  - `cmd /c npm run skills:validate`

## Direct Script Usage Examples

1. `powershell -ExecutionPolicy Bypass -File skills/agency-playground-ops/scripts/agency-project-cycle.ps1 -Mode build -Project csscroll`
2. `powershell -ExecutionPolicy Bypass -File skills/agency-playground-ops/scripts/agency-project-cycle.ps1 -Mode dev -Project csscroll -Port 5200`
3. `powershell -ExecutionPolicy Bypass -File skills/mcp-orchestration-ops/scripts/mcp-doctor.ps1`
4. `powershell -ExecutionPolicy Bypass -File skills/chat-instance-bootstrap/scripts/bootstrap-session.ps1 -Project csscroll`
5. `powershell -ExecutionPolicy Bypass -File skills/chat-instance-bootstrap/scripts/bootstrap-session.ps1 -Project csscroll -Full`
6. `powershell -ExecutionPolicy Bypass -File skills/system-build-super-agent/scripts/generate-system-briefing.ps1 -Project csscroll`
