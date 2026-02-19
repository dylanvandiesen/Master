# Agency Command Map

## Root NPM Commands
- `npm run scaffold`: ensure each project folder is scaffolded.
- `npm run list:projects`: print name/slug/engine/dist table.
- `npm run build -- --project=<slug>`: build one project.
- `npm run build:all`: build all projects.
- `npm run dev -- --project=<slug>`: watch and serve one project.
- `npm run dev:all`: watch and serve all projects.
- `npm run clean`: remove dist and dev-server manifests.

## Chat Bootstrap Commands
- `npm run chat:new`: standard bootstrap + MCP prep.
- `npm run chat:new:full`: install deps + bootstrap + MCP prep.
- `npm run chat:new:quick`: bootstrap without build.
- `npm run chat:briefing`: generate startup briefing markdown.

## Useful Flags
- `--project=<slug>`: choose active project.
- `--port=<port>`: choose preferred dev server port.

## PowerShell Compatibility
Use `cmd /c npm run ...` if execution policy blocks `npm.ps1`.
