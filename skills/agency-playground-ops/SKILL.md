---
name: agency-playground-ops
description: Operate the root-controlled agency build system for this Playground repository. Use when tasks involve scaffolding or discovering projects under `projects/`, running root workflows (`scaffold`, `list:projects`, `build`, `build:all`, `dev`, `dev:all`, `dev:project`), editing `agency.config.json` or `projects/*/project.config.json`, validating outputs in `dist/projects/*` or `.agency/dev-servers/*.json`, or resolving active project and port selection via `--project`/`PROJECT` and `--port`/`DEV_PORT`.
---

# Agency Playground Ops

Keep root as the only orchestration layer and keep projects self-contained under `projects/<name>/`.

## Workflow
1. Run scaffold and project discovery first.
2. Choose one project or all-project mode.
3. Run build.
4. Run dev/watch mode only when needed.
5. Validate dist output and dev server manifests.

Use this sequence:

```powershell
Set-Location C:\Users\SKIKK\Documents\websites\Playground
cmd /c npm run scaffold
cmd /c npm run list:projects
cmd /c npm run build -- --project=<name-or-slug>
cmd /c npm run dev -- --project=<name-or-slug> --port=<port>
```

## Root Contracts
- Build config: `agency.config.json`
- Runtime: `gulpfile.mjs`
- Projects: `projects/*`
- Build output: `dist/projects/<slug>/`
- Dev manifests: `.agency/dev-servers/*.json`
- Shared tasks: `TASKLIST.md`

## Use Resource Files
- For command-level detail, read `references/command-map.md`.
- For config-level detail, read `references/config-keys.md`.
- For deterministic execution, use `scripts/agency-project-cycle.ps1`.

## Selection And Defaults
- Active project resolution: `--project` -> `PROJECT` -> `agency.config.json.activeProject` -> first discovered project.
- Dev port resolution: `--port` -> `DEV_PORT` -> `agency.config.json.server.startPort` -> `5173`.
- JS mode may fallback to legacy when `esbuild` is unavailable.

## Validation
1. Check `dist/projects/<slug>/index.html`.
2. Check `.min.css` and `.min.js` outputs.
3. Check `dist/index.html`.
4. Check `.agency/dev-servers/*.json` after `dev` or `dev:all`.

## Fast Troubleshooting
- Use `cmd /c npm run ...` when PowerShell blocks `npm.ps1`.
- Re-run `scaffold` after adding or renaming a project folder.
- If project not found, pass explicit `--project=<slug>`.
